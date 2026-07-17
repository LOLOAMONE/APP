import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { UtilisateursReseauClient } from "./UtilisateursReseauClient";

export default async function UtilisateursReseauPage() {
  const user = await getCurrentUser();
  if (!user || !user.isSuperAdmin) {
    redirect("/planning");
  }
  return <UtilisateursReseauClient currentUserId={user.sub} />;
}
