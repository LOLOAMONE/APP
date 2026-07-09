import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { EmployeesClient } from "./EmployeesClient";

export default async function EmployesPage() {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") {
    redirect("/planning");
  }
  return <EmployeesClient />;
}
