import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { TicketsClient } from "./TicketsClient";

export default async function TicketsPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  return (
    <TicketsClient
      hasGlobalAccess={user.isSuperAdmin || user.globalModules.includes("ticketing")}
      restaurants={user.restaurants}
      canCreate={!!user.activeRestaurantId}
    />
  );
}
