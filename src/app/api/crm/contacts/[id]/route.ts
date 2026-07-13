import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireCrmAccess } from "@/lib/auth";
import { withErrorHandling } from "@/lib/api";

const contactSchema = z.object({
  companyId: z.string().optional().nullable(),
  name: z.string().min(1),
  role: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  email: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export const PUT = withErrorHandling(
  async (req: NextRequest, { params }: { params: { id: string } }) => {
    await requireCrmAccess();
    const data = contactSchema.parse(await req.json());
    const contact = await prisma.crmContact.update({ where: { id: params.id }, data, include: { company: true } });
    return NextResponse.json(contact);
  }
);

export const DELETE = withErrorHandling(
  async (_req: NextRequest, { params }: { params: { id: string } }) => {
    await requireCrmAccess();
    await prisma.crmContact.delete({ where: { id: params.id } });
    return NextResponse.json({ ok: true });
  }
);
