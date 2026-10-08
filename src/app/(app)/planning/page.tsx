import { requirePlanningSession } from "@/lib/auth";
import { PlanningClient } from "./PlanningClient";

export default async function PlanningPage() {
  const user = await requirePlanningSession();
  

  return (
    <PlanningClient
      isAdmin={user.isSuperAdmin || user.activeRole === "ADMIN"}
      employeeId={user.employeeId}
    />
  );
}
