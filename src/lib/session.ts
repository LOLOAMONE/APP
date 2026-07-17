import { SignJWT, jwtVerify } from "jose";

export type RestaurantMembershipSummary = {
  id: string;
  name: string;
  role: "ADMIN" | "EMPLOYEE";
};

export type SessionPayload = {
  sub: string; // userId
  username: string;
  isSuperAdmin: boolean;
  employeeId: string | null; // Employee de l'utilisateur sur activeRestaurantId, si applicable

  // Contexte "restaurant actif" — pilote quelles données sont affichées/modifiées.
  activeRestaurantId: string | null;
  activeRole: "ADMIN" | "EMPLOYEE" | null; // rôle local sur activeRestaurantId (null si aucun restaurant actif)
  activeCanAccessMarges: boolean;
  activeCanAccessMercuriale: boolean;
  activeCanAccessCrm: boolean;

  // Modules accordés à portée globale (tous les restaurants), ex: ["marketing"].
  globalModules: string[];

  // Restaurants accessibles à cet utilisateur, pour le sélecteur de contexte.
  restaurants: RestaurantMembershipSummary[];
};

const COOKIE_NAME = "session";
const SESSION_DURATION_SECONDS = 60 * 60 * 24 * 7; // 7 jours

function getSecretKey() {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error("SESSION_SECRET n'est pas défini");
  }
  return new TextEncoder().encode(secret);
}

export async function createSessionToken(payload: SessionPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DURATION_SECONDS}s`)
    .sign(getSecretKey());
}

function isValidSessionPayload(payload: unknown): payload is SessionPayload {
  if (!payload || typeof payload !== "object") return false;
  const p = payload as Record<string, unknown>;
  return Array.isArray(p.globalModules) && Array.isArray(p.restaurants);
}

export async function verifySessionToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecretKey());
    // Un cookie émis avant la migration multi-restaurants n'a pas ce format
    // (ex: ancien User.role/canAccessXxx) — on force une reconnexion plutôt que de planter.
    if (!isValidSessionPayload(payload)) return null;
    return payload;
  } catch {
    return null;
  }
}

export { COOKIE_NAME, SESSION_DURATION_SECONDS };
