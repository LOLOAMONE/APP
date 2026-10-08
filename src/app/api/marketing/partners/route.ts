import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireMarketingAccess } from "@/lib/auth";
import { withErrorHandling } from "@/lib/api";
export const GET = withErrorHandling(async () => {
 const session = await requireMarketingAccess();
 const items = await prisma.marketingPartner.findMany({where:{restaurantId:session.activeRestaurantId!},orderBy:{name:"asc"}});
 return NextResponse.json(items.map(item=>({...item,profile:JSON.parse(item.profile)})));
});
