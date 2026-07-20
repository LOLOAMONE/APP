import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireMarketingAccess } from "@/lib/auth";
import { withErrorHandling } from "@/lib/api";
import { canManageNetworkResource } from "@/lib/marketing";

const postInclude = {
  restaurant: { select: { id: true, name: true } },
  createdBy: { select: { id: true, username: true } },
  reviewedBy: { select: { id: true, username: true } },
};

function serializePost<T extends { platforms: string }>(post: T) {
  return { ...post, platforms: JSON.parse(post.platforms) as string[] };
}

/** Marque manuellement une publication validée comme publiée (quelqu'un l'a postée à la main). */
export const POST = withErrorHandling(async (_req: NextRequest, { params }: { params: { id: string } }) => {
  const session = await requireMarketingAccess();
  const existing = await prisma.editorialPost.findUnique({ where: { id: params.id } });
  if (!existing) return NextResponse.json({ error: "Publication introuvable" }, { status: 404 });
  if (!canManageNetworkResource(session, existing.restaurantId)) {
    return NextResponse.json({ error: "Accès interdit" }, { status: 403 });
  }
  if (existing.status !== "VALIDATED") {
    return NextResponse.json({ error: "Seule une publication validée peut être marquée comme publiée" }, { status: 409 });
  }

  const post = await prisma.editorialPost.update({
    where: { id: params.id },
    data: { status: "PUBLISHED", publishedAt: new Date() },
    include: postInclude,
  });
  return NextResponse.json(serializePost(post));
});
