import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";

export default async function HomePage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }
  if (!user.activeRestaurantId) {
    // Cas normal pour un SUPER_ADMIN qui n'a pas encore choisi de restaurant (vue réseau).
    // Pour tout autre compte, ne devrait arriver que s'il a accès à plusieurs restaurants
    // sans en avoir choisi un — /planning affiche alors un état vide en attendant qu'il en
    // sélectionne un via le sélecteur de la barre de navigation.
    redirect(user.isSuperAdmin ? "/reseau" : "/planning");
  }
  redirect(user.isSuperAdmin || user.activeRole === "ADMIN" ? "/marges" : "/planning");
}
