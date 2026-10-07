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
        activeRestaurantId={user.activeRestaurantId}
        restaurants={user.restaurants}
        username={user.username}
        canAccessMarges={user.activeCanAccessMarges}
        canAccessMercuriale={user.activeCanAccessMercuriale}
        canAccessCrm={user.activeCanAccessCrm}
        canAccessMarketing={user.activeCanAccessMarketing}
      />
      <main className="app-content min-w-0 flex-1 px-4 py-6 sm:px-7 lg:px-10 lg:py-10">{children}</main>
    </div>
  );
}
