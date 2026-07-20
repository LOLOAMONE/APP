import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { CampagnesClient } from "./CampagnesClient";

export default async function CampagnesPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  const hasGlobalAccess = user.isSuperAdmin || user.globalModules.includes("marketing");

  if (!hasGlobalAccess && !user.activeRestaurantId) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-6 text-sm text-gray-500">
        Sélectionne un restaurant pour voir ses campagnes.
      </div>
    );
  }

  return (
    <CampagnesClient
      hasGlobalAccess={hasGlobalAccess}
      canCreateLocal={!!user.activeRestaurantId}
      activeRestaurantId={user.activeRestaurantId}
      restaurants={user.restaurants}
    />
  );
}
