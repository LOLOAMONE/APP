import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireMarketingAccess } from "@/lib/auth";
import { withErrorHandling } from "@/lib/api";
import { CAMPAIGN_SCOPES, EDITORIAL_PLATFORMS, EDITORIAL_POST_STATUSES } from "@/lib/marketing";

const createPostSchema = z.object({
  scope: z.enum(CAMPAIGN_SCOPES),
  title: z.string().trim().min(1).max(200),
  caption: z.string().trim().min(1).max(5000),
  mediaUrl: z.string().trim().url().max(2000).optional().nullable(),
  platforms: z.array(z.enum(EDITORIAL_PLATFORMS)).min(1),
  scheduledAt: z.string().datetime(),
});

const postInclude = {
  restaurant: { select: { id: true, name: true } },
  createdBy: { select: { id: true, username: true } },
  reviewedBy: { select: { id: true, username: true } },
};

function serializePost<T extends { platforms: string }>(post: T) {
  return { ...post, platforms: JSON.parse(post.platforms) as string[] };
}

export const GET = withErrorHandling(async (req: NextRequest) => {
  const session = await requireMarketingAccess();
  const searchParams = req.nextUrl.searchParams;
  const statusParam = searchParams.get("status");
  const status =
    statusParam && (EDITORIAL_POST_STATUSES as readonly string[]).includes(statusParam) ? statusParam : undefined;

  let where: Prisma.EditorialPostWhereInput;
  if (session.marketingScope.global) {
    const restaurantId = searchParams.get("restaurantId");
    where = { ...(status ? { status } : {}), ...(restaurantId ? { restaurantId } : {}) };
  } else {
    where = {
      ...(status ? { status } : {}),
      OR: [{ restaurantId: session.marketingScope.restaurantId }, { restaurantId: null }],
    };
  }

  const posts = await prisma.editorialPost.findMany({ where, orderBy: { scheduledAt: "asc" }, include: postInclude });
  return NextResponse.json(posts.map(serializePost));
});

export const POST = withErrorHandling(async (req: NextRequest) => {
  const session = await requireMarketingAccess();
  const data = createPostSchema.parse(await req.json());

  if (data.scope === "NATIONAL" && !session.marketingScope.global) {
    return NextResponse.json({ error: "Seule la maison mère peut créer une publication nationale" }, { status: 403 });
  }

  let restaurantId: string | null = null;
  if (data.scope === "LOCAL") {
    restaurantId = session.marketingScope.global ? session.activeRestaurantId : session.marketingScope.restaurantId;
    if (!restaurantId) {
      return NextResponse.json({ error: "Sélectionnez un restaurant pour créer une publication locale" }, { status: 409 });
    }
  }

  const post = await prisma.editorialPost.create({
    data: {
      restaurantId,
      title: data.title,
      caption: data.caption,
      mediaUrl: data.mediaUrl || null,
      platforms: JSON.stringify(data.platforms),
      scheduledAt: new Date(data.scheduledAt),
      createdByUserId: session.sub,
    },
    include: postInclude,
  });

  return NextResponse.json(serializePost(post), { status: 201 });
});
