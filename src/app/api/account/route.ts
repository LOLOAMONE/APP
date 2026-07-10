import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireUser, hashPassword, verifyPassword } from "@/lib/auth";
import { createSessionToken, COOKIE_NAME, SESSION_DURATION_SECONDS } from "@/lib/session";
import { withErrorHandling } from "@/lib/api";

const accountSchema = z.object({
  username: z.string().min(3),
  currentPassword: z.string().min(1),
  newPassword: z.string().min(6).optional().or(z.literal("")),
});

export const PUT = withErrorHandling(async (req: NextRequest) => {
  const session = await requireUser();
  const data = accountSchema.parse(await req.json());

  const user = await prisma.user.findUnique({ where: { id: session.sub }, include: { employee: true } });
  if (!user || !(await verifyPassword(data.currentPassword, user.passwordHash))) {
    return NextResponse.json({ error: "Mot de passe actuel incorrect" }, { status: 401 });
  }

  if (data.username !== user.username) {
    const conflict = await prisma.user.findFirst({ where: { username: data.username, NOT: { id: user.id } } });
    if (conflict) {
      return NextResponse.json({ error: "Cet identifiant est déjà utilisé" }, { status: 409 });
    }
  }

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: {
      username: data.username,
      ...(data.newPassword ? { passwordHash: await hashPassword(data.newPassword) } : {}),
    },
  });

  const token = await createSessionToken({
    sub: updated.id,
    username: updated.username,
    role: updated.role as "ADMIN" | "EMPLOYEE",
    employeeId: user.employee?.id ?? null,
  });

  const res = NextResponse.json({ username: updated.username });
  res.cookies.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: req.nextUrl.protocol === "https:" || req.headers.get("x-forwarded-proto") === "https",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_DURATION_SECONDS,
  });

  return res;
});
