import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { ReseauClient } from "./ReseauClient";

export default async function ReseauPage() {
  const user = await getCurrentUser();
  if (!user || !user.isSuperAdmin) {
    redirect("/planning");
  }
  return <ReseauClient />;
}
