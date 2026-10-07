import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
async function main() {
  const posts = await prisma.editorialPost.findMany({ where: { restaurantId: { not: null } } });
  let imported = 0;
  for (const post of posts) {
    const id = `editorial_${post.id}`;
    if (await prisma.workspaceItem.findUnique({ where: { id } })) continue;
    const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Paris", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(post.scheduledAt);
    const part = (name: string) => parts.find((p) => p.type === name)?.value;
    await prisma.workspaceItem.create({ data: { id, restaurantId: post.restaurantId!, area: "MARKETING", kind: "POST", title: post.title, body: [post.caption, `Plateformes : ${(JSON.parse(post.platforms) as string[]).map((p) => ({ INSTAGRAM: "Instagram", FACEBOOK: "Facebook", GOOGLE: "Google" }[p] ?? p)).join(", ")}`, post.mediaUrl].filter(Boolean).join("\n\n"), scheduledDate: `${part("year")}-${part("month")}-${part("day")}`, completed: post.status === "PUBLISHED", createdAt: post.createdAt, updatedAt: post.updatedAt } });
    imported++;
  }
  console.log(`Calendrier marketing : ${imported} publication(s) reprise(s).`);
}
main().catch((e) => { console.error(e); process.exitCode = 1; }).finally(() => prisma.$disconnect());
