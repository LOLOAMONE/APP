import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { buildSessionPayload, requireUser } from "@/lib/auth";
import { createSessionToken, COOKIE_NAME, SESSION_DURATION_SECONDS } from "@/lib/session";
import { withErrorHandling } from "@/lib/api";

const switchSchema = z.object({
  // null = quitter vers la vue réseau (réservé aux SUPER_ADMIN).
  restaurantId: z.string().min(1).nullable(),
});

/** Change le restaurant actif de la session sans reconnexion (sélecteur / bascule vue gérant). */
export const POST = withErrorHandling(async (req: NextRequest) => {
  const session = await requireUser();
  const { restaurantId } = switchSchema.parse(await req.json());

  if (restaurantId === null) {
    if (!session.isSuperAdmin) {
      return NextResponse.json({ error: "Accès interdit" }, { status: 403 });
    }
  } else if (!session.restaurants.some((r) => r.id === restaurantId)) {
    return NextResponse.json({ error: "Restaurant inaccessible" }, { status: 403 });
  }

  const payload = await buildSessionPayload(session.sub, restaurantId);
  const token = await createSessionToken(payload);

  const res = NextResponse.json({
    activeRestaurantId: payload.activeRestaurantId,
    activeRole: payload.activeRole,
  });
  res.cookies.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: req.nextUrl.protocol === "https:" || req.headers.get("x-forwarded-proto") === "https",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_DURATION_SECONDS,
  });

  return res;
});
