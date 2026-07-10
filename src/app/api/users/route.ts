import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAdmin, hashPassword } from "@/lib/auth";
import { withErrorHandling } from "@/lib/api";

const createUserSchema = z.object({
  username: z.string().min(3),
  password: z.string().min(6),
  role: z.enum(["ADMIN", "EMPLOYEE"]),
  canAccessMarges: z.boolean().default(false),
  canAccessMercuriale: z.boolean().default(false),
});

export const GET = withErrorHandling(async () => {
  await requireAdmin();
  const users = await prisma.user.findMany({
    orderBy: { username: "asc" },
    select: {
      id: true,
      username: true,
      role: true,
      canAccessMarges: true,
      canAccessMercuriale: true,
      employee: { select: { id: true, name: true, position: true } },
    },
  });
  return NextResponse.json(users);
});

export const POST = withErrorHandling(async (req: NextRequest) => {
  await requireAdmin();
  const data = createUserSchema.parse(await req.json());

  const existing = await prisma.user.findUnique({ where: { username: data.username } });
  if (existing) {
    return NextResponse.json({ error: "Cet identifiant est déjà utilisé" }, { status: 409 });
  }

  const passwordHash = await hashPassword(data.password);
  const user = await prisma.user.create({
    data: {
      username: data.username,
      passwordHash,
      role: data.role,
      canAccessMarges: data.canAccessMarges,
      canAccessMercuriale: data.canAccessMercuriale,
    },
    select: {
      id: true,
      username: true,
      role: true,
      canAccessMarges: true,
      canAccessMercuriale: true,
      employee: { select: { id: true, name: true, position: true } },
    },
  });

  return NextResponse.json(user, { status: 201 });
});
