import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireCrmAccess } from "@/lib/auth";
import { withErrorHandling } from "@/lib/api";
import { STAGES } from "@/lib/crm";

const reorderSchema = z.object({
  stage: z.enum(STAGES),
  ids: z.array(z.string().min(1)).min(1),
});

// Réordonne les cartes d'une colonne (et met à jour leur stage si une carte vient d'être
// déposée dans une nouvelle colonne).
export const PUT = withErrorHandling(async (req: NextRequest) => {
  await requireCrmAccess();
  const { stage, ids } = reorderSchema.parse(await req.json());

  await prisma.$transaction(
    ids.map((id, index) => prisma.crmOpportunity.update({ where: { id }, data: { order: index, stage } }))
  );

  return NextResponse.json({ ok: true });
});
