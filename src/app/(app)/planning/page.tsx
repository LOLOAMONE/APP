import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { PlanningClient } from "./PlanningClient";

export default async function PlanningPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return <PlanningClient role={user.role} employeeId={user.employeeId} />;
}
