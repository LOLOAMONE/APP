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

export const GET = withErrorHandling(async () => {
  await requireCrmAccess();
  const contacts = await prisma.crmContact.findMany({
    orderBy: { name: "asc" },
    include: { company: true },
  });
  return NextResponse.json(contacts);
});

export const POST = withErrorHandling(async (req: NextRequest) => {
  await requireCrmAccess();
  const data = contactSchema.parse(await req.json());
  const contact = await prisma.crmContact.create({ data, include: { company: true } });
  return NextResponse.json(contact, { status: 201 });
});
