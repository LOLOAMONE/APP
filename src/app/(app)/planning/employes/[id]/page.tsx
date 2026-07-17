import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { EmployeeDetailClient } from "./EmployeeDetailClient";

export default async function EmployeeDetailPage({ params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user || !(user.isSuperAdmin || user.activeRole === "ADMIN")) {
    redirect("/planning");
  }
  return <EmployeeDetailClient employeeId={params.id} />;
}
