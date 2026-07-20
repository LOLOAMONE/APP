import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { CalendrierClient } from "./CalendrierClient";

export default async function CalendrierPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  const hasGlobalAccess = user.isSuperAdmin || user.globalModules.includes("marketing");

  if (!hasGlobalAccess && !user.activeRestaurantId) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-6 text-sm text-gray-500">
        Sélectionne un restaurant pour voir son calendrier éditorial.
      </div>
    );
  }

  return (
    <CalendrierClient
      hasGlobalAccess={hasGlobalAccess}
      canCreateLocal={!!user.activeRestaurantId}
      activeRestaurantId={user.activeRestaurantId}
    />
  );
}
