import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireMarketingAccess } from "@/lib/auth";
import { withErrorHandling } from "@/lib/api";

const postInclude = {
  restaurant: { select: { id: true, name: true } },
  createdBy: { select: { id: true, username: true } },
  reviewedBy: { select: { id: true, username: true } },
};

function serializePost<T extends { platforms: string }>(post: T) {
  return { ...post, platforms: JSON.parse(post.platforms) as string[] };
}

const reviewSchema = z.object({
  decision: z.enum(["VALIDATE", "REJECT"]),
  comment: z.string().trim().max(1000).optional().nullable(),
  caption: z.string().trim().min(1).max(5000).optional(),
});

/** Réservé à la maison mère : valide ou rejette une publication en attente, peut retoucher le texte. */
export const POST = withErrorHandling(async (req: NextRequest, { params }: { params: { id: string } }) => {
  const session = await requireMarketingAccess();
  if (!session.marketingScope.global) {
    return NextResponse.json({ error: "Accès interdit" }, { status: 403 });
  }
  const data = reviewSchema.parse(await req.json());

  const existing = await prisma.editorialPost.findUnique({ where: { id: params.id } });
  if (!existing) return NextResponse.json({ error: "Publication introuvable" }, { status: 404 });
  if (existing.status !== "PENDING_VALIDATION") {
    return NextResponse.json({ error: "Cette publication n'est pas en attente de validation" }, { status: 409 });
  }

  const post = await prisma.editorialPost.update({
    where: { id: params.id },
    data: {
      status: data.decision === "VALIDATE" ? "VALIDATED" : "REJECTED",
      reviewedByUserId: session.sub,
      reviewComment: data.comment || null,
      ...(data.caption !== undefined ? { caption: data.caption } : {}),
    },
    include: postInclude,
  });
  return NextResponse.json(serializePost(post));
});
