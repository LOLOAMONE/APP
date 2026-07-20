import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireMarketingAccess } from "@/lib/auth";
import { withErrorHandling } from "@/lib/api";
import { EDITORIAL_PLATFORMS, canManageNetworkResource } from "@/lib/marketing";

const postInclude = {
  restaurant: { select: { id: true, name: true } },
  createdBy: { select: { id: true, username: true } },
  reviewedBy: { select: { id: true, username: true } },
};

function serializePost<T extends { platforms: string }>(post: T) {
  return { ...post, platforms: JSON.parse(post.platforms) as string[] };
}

function visibleTo(
  session: Awaited<ReturnType<typeof requireMarketingAccess>>,
  post: { restaurantId: string | null }
): boolean {
  if (session.marketingScope.global) return true;
  return post.restaurantId === session.marketingScope.restaurantId || post.restaurantId === null;
}

export const GET = withErrorHandling(async (_req: NextRequest, { params }: { params: { id: string } }) => {
  const session = await requireMarketingAccess();
  const post = await prisma.editorialPost.findUnique({ where: { id: params.id }, include: postInclude });
  if (!post || !visibleTo(session, post)) {
    return NextResponse.json({ error: "Publication introuvable" }, { status: 404 });
  }
  return NextResponse.json(serializePost(post));
});

const updatePostSchema = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  caption: z.string().trim().min(1).max(5000).optional(),
  mediaUrl: z.string().trim().url().max(2000).optional().nullable(),
  platforms: z.array(z.enum(EDITORIAL_PLATFORMS)).min(1).optional(),
  scheduledAt: z.string().datetime().optional(),
});

export const PUT = withErrorHandling(async (req: NextRequest, { params }: { params: { id: string } }) => {
  const session = await requireMarketingAccess();
  const data = updatePostSchema.parse(await req.json());
  const existing = await prisma.editorialPost.findUnique({ where: { id: params.id } });
  if (!existing) return NextResponse.json({ error: "Publication introuvable" }, { status: 404 });
  if (!canManageNetworkResource(session, existing.restaurantId)) {
    return NextResponse.json({ error: "Accès interdit" }, { status: 403 });
  }
  if (!["DRAFT", "REJECTED"].includes(existing.status)) {
    return NextResponse.json(
      { error: "Seule une publication en brouillon ou rejetée peut être modifiée" },
      { status: 409 }
    );
  }

  const post = await prisma.editorialPost.update({
    where: { id: params.id },
    data: {
      ...(data.title !== undefined ? { title: data.title } : {}),
      ...(data.caption !== undefined ? { caption: data.caption } : {}),
      ...(data.mediaUrl !== undefined ? { mediaUrl: data.mediaUrl || null } : {}),
      ...(data.platforms !== undefined ? { platforms: JSON.stringify(data.platforms) } : {}),
      ...(data.scheduledAt !== undefined ? { scheduledAt: new Date(data.scheduledAt) } : {}),
      ...(existing.status === "REJECTED" ? { status: "DRAFT", reviewComment: null } : {}),
    },
    include: postInclude,
  });
  return NextResponse.json(serializePost(post));
});

export const DELETE = withErrorHandling(async (_req: NextRequest, { params }: { params: { id: string } }) => {
  const session = await requireMarketingAccess();
  const existing = await prisma.editorialPost.findUnique({ where: { id: params.id } });
  if (!existing) return NextResponse.json({ error: "Publication introuvable" }, { status: 404 });
  if (!canManageNetworkResource(session, existing.restaurantId)) {
    return NextResponse.json({ error: "Accès interdit" }, { status: 403 });
  }
  await prisma.editorialPost.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
});
