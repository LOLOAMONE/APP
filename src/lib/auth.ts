import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import { COOKIE_NAME, SessionPayload, verifySessionToken } from "./session";

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

export async function requireAdmin(): Promise<SessionPayload> {
  const user = await requireUser();
  if (user.role !== "ADMIN") {
    throw new Error("FORBIDDEN");
  }
  return user;
}

/** Accès à l'onglet Marges : la direction, ou un employé à qui cet accès a été accordé. */
export async function requireMargesAccess(): Promise<SessionPayload> {
  const user = await requireUser();
  if (user.role !== "ADMIN" && !user.canAccessMarges) {
    throw new Error("FORBIDDEN");
  }
  return user;
}

/** Accès à l'onglet Mercuriale : la direction, ou un employé à qui cet accès a été accordé. */
export async function requireMercurialeAccess(): Promise<SessionPayload> {
  const user = await requireUser();
  if (user.role !== "ADMIN" && !user.canAccessMercuriale) {
    throw new Error("FORBIDDEN");
  }
  return user;
}

/** Accès à l'onglet Clients (CRM) : la direction, ou un employé à qui cet accès a été accordé. */
export async function requireCrmAccess(): Promise<SessionPayload> {
  const user = await requireUser();
  if (user.role !== "ADMIN" && !user.canAccessCrm) {
    throw new Error("FORBIDDEN");
  }
  return user;
}
