import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { verifyPassword } from "@/lib/auth";
import { createSessionToken, COOKIE_NAME, SESSION_DURATION_SECONDS } from "@/lib/session";
import { withErrorHandling } from "@/lib/api";

const loginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

export const POST = withErrorHandling(async (req: NextRequest) => {
  const body = loginSchema.parse(await req.json());

  const user = await prisma.user.findUnique({
    where: { username: body.username },
    include: { employee: true },
  });

  if (!user || !(await verifyPassword(body.password, user.passwordHash))) {
    return NextResponse.json(
      { error: "Identifiant ou mot de passe incorrect" },
      { status: 401 }
    );
  }

  const token = await createSessionToken({
    sub: user.id,
    username: user.username,
    role: user.role as "ADMIN" | "EMPLOYEE",
    employeeId: user.employee?.id ?? null,
    canAccessMarges: user.canAccessMarges,
    canAccessMercuriale: user.canAccessMercuriale,
  });

  const res = NextResponse.json({
    username: user.username,
    role: user.role,
    employeeName: user.employee?.name ?? null,
  });

  // Le cookie "Secure" exige HTTPS : on se base sur la requête réelle (via le reverse proxy)
  // plutôt que sur NODE_ENV, sinon la connexion échoue silencieusement tant que le site n'a pas de certificat SSL.
  const forwardedProto = req.headers.get("x-forwarded-proto");
  const isHttps = forwardedProto ? forwardedProto === "https" : req.nextUrl.protocol === "https:";

  res.cookies.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: isHttps,
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_DURATION_SECONDS,
  });

  return res;
});
