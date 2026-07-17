import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { EmployeesClient } from "./EmployeesClient";

export default async function EmployesPage() {
  const user = await getCurrentUser();
  if (!user || !(user.isSuperAdmin || user.activeRole === "ADMIN")) {
    redirect("/planning");
  }
  return <EmployeesClient />;
}
