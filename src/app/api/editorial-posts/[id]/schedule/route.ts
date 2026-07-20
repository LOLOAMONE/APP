import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
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

const scheduleSchema = z.object({ requestValidation: z.boolean() });

/** Programme un brouillon : soit directement (auto-service, pas de validation demandée), soit en attente de validation par la maison mère. */
export const POST = withErrorHandling(async (req: NextRequest, { params }: { params: { id: string } }) => {
  const session = await requireMarketingAccess();
  const data = scheduleSchema.parse(await req.json());
  const existing = await prisma.editorialPost.findUnique({ where: { id: params.id } });
  if (!existing) return NextResponse.json({ error: "Publication introuvable" }, { status: 404 });
  if (!canManageNetworkResource(session, existing.restaurantId)) {
    return NextResponse.json({ error: "Accès interdit" }, { status: 403 });
  }
  if (!["DRAFT", "REJECTED"].includes(existing.status)) {
    return NextResponse.json(
      { error: "Cette publication ne peut pas être programmée depuis son statut actuel" },
      { status: 409 }
    );
  }

  const post = await prisma.editorialPost.update({
    where: { id: params.id },
    data: {
      status: data.requestValidation ? "PENDING_VALIDATION" : "VALIDATED",
      validationRequested: data.requestValidation,
      reviewComment: null,
    },
    include: postInclude,
  });
  return NextResponse.json(serializePost(post));
});
