import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { withErrorHandling } from "@/lib/api";

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
