import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { Sidebar } from "./Sidebar";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  return (
    <div className="flex min-h-screen flex-col lg:flex-row">
      <Sidebar
        userId={user.sub}
        isAdmin={user.isSuperAdmin || user.activeRole === "ADMIN"}
        isSuperAdmin={user.isSuperAdmin}
        activeRestaurantId={user.activeRestaurantId}
        restaurants={user.restaurants}
        username={user.username}
        canAccessMarges={user.activeCanAccessMarges}
        canAccessMercuriale={user.activeCanAccessMercuriale}
        canAccessCrm={user.activeCanAccessCrm}
        hasGlobalTicketAccess={user.isSuperAdmin || user.globalModules.includes("ticketing")}
      />
      <main className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-8">{children}</main>
    </div>
  );
}
