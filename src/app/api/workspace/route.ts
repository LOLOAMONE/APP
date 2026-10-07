import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { withErrorHandling } from "@/lib/api";
import { workspaceAccess, workspaceSchema } from "@/lib/workspace";
import { z } from "zod";

export const GET = withErrorHandling(async (req: NextRequest) => {
  const area = z.enum(["NOTES", "MARKETING"]).parse(req.nextUrl.searchParams.get("area") ?? "NOTES");
  const session = await workspaceAccess(area);
  const items = await prisma.workspaceItem.findMany({
    where: { restaurantId: session.activeRestaurantId!, area },
    orderBy: [{ pinned: "desc" }, { updatedAt: "desc" }],
  });
  return NextResponse.json(items);
});
export const POST = withErrorHandling(async (req: NextRequest) => {
  const data = workspaceSchema.parse(await req.json());
  const session = await workspaceAccess(data.area);
  const item = await prisma.workspaceItem.create({ data: { ...data, restaurantId: session.activeRestaurantId! } });
  return NextResponse.json(item, { status: 201 });
});
