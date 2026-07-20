import type { SessionPayload } from "./session";
import type { MarketingScope } from "./auth";

export const CAMPAIGN_STATUSES = ["DRAFT", "ACTIVE", "PAUSED", "ENDED"] as const;
export const CAMPAIGN_SCOPES = ["NATIONAL", "LOCAL"] as const;
export const COUPON_DISCOUNT_TYPES = ["PERCENT", "FIXED_AMOUNT", "FREE_ITEM"] as const;
export const EDITORIAL_POST_STATUSES = ["DRAFT", "PENDING_VALIDATION", "VALIDATED", "PUBLISHED", "REJECTED"] as const;
export const EDITORIAL_PLATFORMS = ["INSTAGRAM", "FACEBOOK", "GOOGLE"] as const;

/**
 * Une ressource réseau (Campaign, EditorialPost) rattachée à un restaurant précis ou nationale
 * (restaurantId null) : seule la portée globale gère le national ; le local doit correspondre
 * au restaurant actif (ou au restaurant de la portée locale).
 */
export function canManageNetworkResource(
  session: SessionPayload & { marketingScope: MarketingScope },
  restaurantId: string | null
): boolean {
  if (restaurantId === null) return session.marketingScope.global;
  if (session.marketingScope.global) return session.activeRestaurantId === restaurantId;
  return session.marketingScope.restaurantId === restaurantId;
}
