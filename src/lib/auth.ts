import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import { prisma } from "./db";
import { COOKIE_NAME, RestaurantMembershipSummary, SessionPayload, verifySessionToken } from "./session";

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/** À utiliser dans les Server Components et Route Handlers (lit le cookie déjà posé). */
export async function getCurrentUser(): Promise<SessionPayload | null> {
  const token = cookies().get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifySessionToken(token);
}

export async function requireUser(): Promise<SessionPayload> {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error("UNAUTHENTICATED");
  }
  return user;
}

/** Rôle global maison mère : outrepasse tout, sans rattachement à un restaurant. */
export async function requireSuperAdmin(): Promise<SessionPayload> {
  const user = await requireUser();
  if (!user.isSuperAdmin) {
    throw new Error("FORBIDDEN");
  }
  return user;
}

/** ADMIN sur le restaurant actif de la session (ou SUPER_ADMIN, qui a toujours ce niveau d'accès). */
export async function requireAdmin(): Promise<SessionPayload & { activeRestaurantId: string }> {
  const user = await requireUser();
  if (!user.activeRestaurantId) {
    throw new Error("NO_ACTIVE_RESTAURANT");
  }
  if (!user.isSuperAdmin && user.activeRole !== "ADMIN") {
    throw new Error("FORBIDDEN");
  }
  return user as SessionPayload & { activeRestaurantId: string };
}

/** Garantit qu'un restaurant est actif dans la session ; nécessaire pour toute route scopée par restaurant. */
export async function requireActiveRestaurant(): Promise<SessionPayload & { activeRestaurantId: string }> {
  const user = await requireUser();
  if (!user.activeRestaurantId) {
    throw new Error("NO_ACTIVE_RESTAURANT");
  }
  return user as SessionPayload & { activeRestaurantId: string };
}

type SessionWithActiveRestaurant = SessionPayload & { activeRestaurantId: string };

/**
 * Accès à un module (marges/mercuriale/crm, ou futur module transverse) : SUPER_ADMIN,
 * ADMIN local du restaurant actif, permission de module à portée globale, ou permission
 * de module locale au restaurant actif. Ces modules opèrent toujours sur les données d'UN
 * restaurant, donc un restaurant actif est requis même pour un accès global/SUPER_ADMIN.
 */
async function requireModuleAccess(module: "marges" | "mercuriale" | "crm"): Promise<SessionWithActiveRestaurant> {
  const user = await requireUser();
  if (!user.activeRestaurantId) {
    throw new Error("NO_ACTIVE_RESTAURANT");
  }
  if (user.isSuperAdmin || user.activeRole === "ADMIN" || user.globalModules.includes(module)) {
    return user as SessionWithActiveRestaurant;
  }

  const localAccess =
    module === "marges"
      ? user.activeCanAccessMarges
      : module === "mercuriale"
      ? user.activeCanAccessMercuriale
      : user.activeCanAccessCrm;

  if (!localAccess) {
    throw new Error("FORBIDDEN");
  }
  return user as SessionWithActiveRestaurant;
}

/** Accès à l'onglet Marges. */
export async function requireMargesAccess(): Promise<SessionWithActiveRestaurant> {
  return requireModuleAccess("marges");
}

/** Accès à l'onglet Mercuriale. */
export async function requireMercurialeAccess(): Promise<SessionWithActiveRestaurant> {
  return requireModuleAccess("mercuriale");
}

/** Accès à l'onglet Clients (CRM). */
export async function requireCrmAccess(): Promise<SessionWithActiveRestaurant> {
  return requireModuleAccess("crm");
}

/**
 * Construit le payload de session complet pour un utilisateur : calcule le restaurant actif
 * (préféré s'il est valide, sinon auto-sélectionné si un seul restaurant accessible, sinon
 * aucun), son rôle/ses permissions locales sur ce restaurant, et ses modules à portée globale.
 * Utilisé au login, au changement de restaurant actif, et après modification du profil.
 */
export async function buildSessionPayload(userId: string, preferredRestaurantId?: string | null): Promise<SessionPayload> {
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    include: {
      memberships: { include: { restaurant: true } },
      modulePermissions: true,
      employee: true,
    },
  });

  const globalModules = user.modulePermissions.filter((p) => p.restaurantId === null).map((p) => p.module);
  const hasNetworkWideAccess = user.isSuperAdmin || globalModules.length > 0;

  let restaurants: RestaurantMembershipSummary[];
  if (hasNetworkWideAccess) {
    const all = await prisma.restaurant.findMany({ orderBy: { name: "asc" } });
    const roleByRestaurantId = new Map(user.memberships.map((m) => [m.restaurantId, m.role as "ADMIN" | "EMPLOYEE"]));
    restaurants = all.map((r) => ({
      id: r.id,
      name: r.name,
      role: roleByRestaurantId.get(r.id) ?? "ADMIN",
    }));
  } else {
    restaurants = user.memberships.map((m) => ({
      id: m.restaurantId,
      name: m.restaurant.name,
      role: m.role as "ADMIN" | "EMPLOYEE",
    }));
  }

  // undefined = non spécifié (login) -> auto-sélection si un seul restaurant accessible.
  // null explicite = demande volontaire de vue réseau (SUPER_ADMIN) -> pas d'auto-sélection.
  // string = restaurant demandé -> utilisé s'il est accessible, sinon aucun restaurant actif.
  let activeRestaurantId: string | null = null;
  if (preferredRestaurantId !== undefined) {
    activeRestaurantId =
      preferredRestaurantId && restaurants.some((r) => r.id === preferredRestaurantId) ? preferredRestaurantId : null;
  } else if (restaurants.length === 1) {
    activeRestaurantId = restaurants[0].id;
  }

  const activeMembership = user.memberships.find((m) => m.restaurantId === activeRestaurantId);
  const activeRole: "ADMIN" | "EMPLOYEE" | null = user.isSuperAdmin && activeRestaurantId
    ? "ADMIN"
    : (activeMembership?.role as "ADMIN" | "EMPLOYEE" | undefined) ?? null;

  const activeModulePermissions = activeRestaurantId
    ? new Set(user.modulePermissions.filter((p) => p.restaurantId === activeRestaurantId).map((p) => p.module))
    : new Set<string>();

  const isLocalAdmin = activeRole === "ADMIN";

  return {
    sub: user.id,
    username: user.username,
    isSuperAdmin: user.isSuperAdmin,
    employeeId: user.employee && user.employee.restaurantId === activeRestaurantId ? user.employee.id : null,
    activeRestaurantId,
    activeRole,
    activeCanAccessMarges: isLocalAdmin || activeModulePermissions.has("marges") || globalModules.includes("marges"),
    activeCanAccessMercuriale:
      isLocalAdmin || activeModulePermissions.has("mercuriale") || globalModules.includes("mercuriale"),
    activeCanAccessCrm: isLocalAdmin || activeModulePermissions.has("crm") || globalModules.includes("crm"),
    globalModules,
    restaurants,
  };
}
