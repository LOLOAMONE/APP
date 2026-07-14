import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { Nav } from "./Nav";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  return (
    <div className="min-h-screen">
      <Nav
        userId={user.sub}
        role={user.role}
        username={user.username}
        canAccessMarges={user.canAccessMarges}
        canAccessMercuriale={user.canAccessMercuriale}
        canAccessCrm={user.canAccessCrm}
      />
      <main className="w-full px-4 py-6 sm:px-6 lg:px-8">{children}</main>
    </div>
  );
}
