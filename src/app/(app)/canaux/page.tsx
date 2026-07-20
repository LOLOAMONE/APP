import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { CanauxClient } from "./CanauxClient";

export default async function CanauxPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  if (!user.activeRestaurantId) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-6 text-sm text-gray-500">
        Sélectionne un restaurant pour voir ses canaux.
      </div>
    );
  }

  return <CanauxClient />;
}
