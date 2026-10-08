import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireMarketingAccess } from "@/lib/auth";
import { withErrorHandling } from "@/lib/api";
import { planningDateSchema } from "@/lib/shiftValidation";
const schema=z.object({name:z.string().trim().min(1).max(200),type:z.enum(["UGC","Créateur / influenceur"]),profile:z.record(z.string().max(10000)).refine(v=>Object.keys(v).length<=50),status:z.enum(["À contacter","Contacté","À relancer","En discussion","Partenariat validé","Sans suite"]),lastContactDate:planningDateSchema.nullable(),nextContactDate:planningDateSchema.nullable(),optOut:z.boolean(),notes:z.string().max(10000)});
export const PUT=withErrorHandling(async(req:NextRequest,{params}:{params:{id:string}})=>{
 const session=await requireMarketingAccess();const data=schema.parse(await req.json());
 const item=await prisma.marketingPartner.findFirst({where:{id:params.id,restaurantId:session.activeRestaurantId!}});
 if(!item)return NextResponse.json({error:"Profil introuvable"},{status:404});
 const old=JSON.parse(item.profile);const profile={...old,...data.profile,ID:item.sourceId};
 const updated=await prisma.marketingPartner.update({where:{id:item.id},data:{...data,profile:JSON.stringify(profile)}});
 return NextResponse.json({...updated,profile});
});
