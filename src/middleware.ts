import { NextRequest, NextResponse } from "next/server";
import { COOKIE_NAME, verifySessionToken } from "@/lib/session";

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|login).*)"],
};

const MARGES_PATHS = ["/marges", "/api/ingredients", "/api/products", "/api/menus", "/api/measure-units"];
const MERCURIALE_PATHS = ["/mercuriale", "/api/suppliers", "/api/supplier-items", "/api/packaging-units"];
const CRM_PATHS = ["/clients", "/api/crm"];
const USERS_PATHS = ["/api/users"];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Les routes de connexion/déconnexion doivent rester accessibles sans session.
  if (pathname.startsWith("/api/auth")) {
    return NextResponse.next();
  }

  const token = req.cookies.get(COOKIE_NAME)?.value;
  const session = token ? await verifySessionToken(token) : null;
  const isApi = pathname.startsWith("/api");

  if (!session) {
    if (isApi) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }
    return NextResponse.redirect(new URL("/login", req.url));
  }

  const isAdmin = session.role === "ADMIN";
  const deny = () =>
    isApi
      ? NextResponse.json({ error: "Accès interdit" }, { status: 403 })
      : NextResponse.redirect(new URL("/planning", req.url));

  if (USERS_PATHS.some((p) => pathname.startsWith(p)) && !isAdmin) {
    return deny();
  }

  if (MARGES_PATHS.some((p) => pathname.startsWith(p)) && !isAdmin && !session.canAccessMarges) {
    return deny();
  }

  if (MERCURIALE_PATHS.some((p) => pathname.startsWith(p)) && !isAdmin && !session.canAccessMercuriale) {
    return deny();
  }

  if (CRM_PATHS.some((p) => pathname.startsWith(p)) && !isAdmin && !session.canAccessCrm) {
    return deny();
  }

  return NextResponse.next();
}
