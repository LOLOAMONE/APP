import { NextRequest, NextResponse } from "next/server";
import { COOKIE_NAME, verifySessionToken } from "@/lib/session";

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|login).*)"],
};

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

  const isMargesRoute =
    pathname.startsWith("/marges") ||
    pathname.startsWith("/api/ingredients") ||
    pathname.startsWith("/api/products") ||
    pathname.startsWith("/api/menus");

  if (isMargesRoute && session.role !== "ADMIN") {
    if (isApi) {
      return NextResponse.json({ error: "Accès interdit" }, { status: 403 });
    }
    return NextResponse.redirect(new URL("/planning", req.url));
  }

  return NextResponse.next();
}
