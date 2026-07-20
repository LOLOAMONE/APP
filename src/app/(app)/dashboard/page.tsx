import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { DashboardClient } from "./DashboardClient";

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  if (!user.activeRestaurantId) {
    return (
      <div className="rounded-bento border border-gray-100 bg-white p-6 text-sm text-gray-500 shadow-bento">
        Sélectionne un restaurant pour voir son tableau de bord.
      </div>
    );
  }

  const isAdmin = user.isSuperAdmin || user.activeRole === "ADMIN";

  return (
    <DashboardClient
      username={user.username}
      shortcuts={{
        marges: isAdmin || user.activeCanAccessMarges,
        mercuriale: isAdmin || user.activeCanAccessMercuriale,
        crm: isAdmin || user.activeCanAccessCrm,
        marketing: isAdmin || user.activeCanAccessMarketing,
      }}
    />
  );
}
