import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { AppHeader } from "./AppHeader";
import { Sidebar } from "./Sidebar";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  return (
    <div className="app-shell flex min-h-screen flex-col lg:flex-row">
      <Sidebar
        userId={user.sub}
        isAdmin={user.isSuperAdmin || user.activeRole === "ADMIN"}
        activeRestaurantId={user.activeRestaurantId}
        restaurants={user.restaurants}
        username={user.username}
        canAccessMarges={user.activeCanAccessMarges}
        canAccessMercuriale={user.activeCanAccessMercuriale}
        canAccessCrm={user.activeCanAccessCrm}
        canAccessMarketing={user.activeCanAccessMarketing}
      />
      <main className="app-content min-w-0 flex-1 px-4 py-6 sm:px-7 lg:px-8 lg:py-7"><AppHeader restaurant={user.restaurants.find((r) => r.id === user.activeRestaurantId)?.name || "Mon restaurant"} username={user.username} />{children}</main>
    </div>
  );
}
