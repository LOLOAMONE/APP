"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ChevronDown, UtensilsCrossed } from "lucide-react";
import { SettingsModal } from "./SettingsModal";

type RestaurantSummary = { id: string; name: string; role: "ADMIN" | "EMPLOYEE" };

type NavProps = {
  userId: string;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  activeRestaurantId: string | null;
  restaurants: RestaurantSummary[];
  username: string;
  canAccessMarges: boolean;
  canAccessMercuriale: boolean;
  canAccessCrm: boolean;
};

export function Nav({
  userId,
  isAdmin,
  isSuperAdmin,
  activeRestaurantId,
  restaurants,
  username,
  canAccessMarges,
  canAccessMercuriale,
  canAccessCrm,
}: NavProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showRestaurantMenu, setShowRestaurantMenu] = useState(false);
  const [switching, setSwitching] = useState(false);

  const activeRestaurant = restaurants.find((r) => r.id === activeRestaurantId) ?? null;
  const networkView = isSuperAdmin && !activeRestaurantId;

  const TABS = [
    { href: "/marges", label: "Marges", visible: isAdmin || canAccessMarges },
    { href: "/mercuriale", label: "Mercuriale", visible: isAdmin || canAccessMercuriale },
    { href: "/clients", label: "Clients", visible: isAdmin || canAccessCrm },
    { href: "/planning", label: "Planning", visible: true },
  ];
  const visibleTabs = TABS.filter((tab) => tab.visible);

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  async function switchRestaurant(restaurantId: string | null) {
    setSwitching(true);
    setShowRestaurantMenu(false);
    try {
      await fetch("/api/session/switch-restaurant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ restaurantId }),
      });
      router.push(restaurantId ? "/marges" : "/reseau");
      router.refresh();
    } finally {
      setSwitching(false);
    }
  }

  return (
    <header className="border-b border-gray-200 bg-white">
      <div className="flex w-full items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
        <div className="flex items-center gap-6">
          <span className="flex items-center gap-2 text-lg font-bold text-brand-700">
            <UtensilsCrossed className="h-5 w-5" aria-hidden />
            {networkView ? "Amoné · Réseau" : "Amoné Nice"}
          </span>

          {(restaurants.length > 1 || isSuperAdmin) && (
            <div className="relative">
              <button
                onClick={() => setShowRestaurantMenu((o) => !o)}
                disabled={switching}
                className="flex items-center gap-1 rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                {networkView ? "Vue réseau" : activeRestaurant?.name ?? "Choisir un restaurant"}
                <ChevronDown className="h-4 w-4" aria-hidden />
              </button>
              {showRestaurantMenu && (
                <div className="absolute left-0 top-full z-10 mt-1 w-56 rounded-md border border-gray-200 bg-white py-1 shadow-lg">
                  {isSuperAdmin && (
                    <button
                      onClick={() => switchRestaurant(null)}
                      className={`block w-full px-3 py-2 text-left text-sm ${
                        networkView ? "bg-brand-50 text-brand-700" : "text-gray-700 hover:bg-gray-50"
                      }`}
                    >
                      Vue réseau
                    </button>
                  )}
                  {restaurants.map((r) => (
                    <button
                      key={r.id}
                      onClick={() => switchRestaurant(r.id)}
                      className={`block w-full px-3 py-2 text-left text-sm ${
                        r.id === activeRestaurantId ? "bg-brand-50 text-brand-700" : "text-gray-700 hover:bg-gray-50"
                      }`}
                    >
                      {r.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          <nav className="hidden gap-1 sm:flex">
            {networkView ? (
              <>
                <Link
                  href="/reseau"
                  className={`rounded-md px-3 py-2 text-sm font-medium transition ${
                    pathname === "/reseau" ? "bg-brand-50 text-brand-700" : "text-gray-600 hover:bg-gray-100"
                  }`}
                >
                  Restaurants
                </Link>
                <Link
                  href="/reseau/utilisateurs"
                  className={`rounded-md px-3 py-2 text-sm font-medium transition ${
                    pathname.startsWith("/reseau/utilisateurs")
                      ? "bg-brand-50 text-brand-700"
                      : "text-gray-600 hover:bg-gray-100"
                  }`}
                >
                  Utilisateurs
                </Link>
              </>
            ) : (
              visibleTabs.map((tab) => (
                <Link
                  key={tab.href}
                  href={tab.href}
                  className={`rounded-md px-3 py-2 text-sm font-medium transition ${
                    pathname.startsWith(tab.href)
                      ? "bg-brand-50 text-brand-700"
                      : "text-gray-600 hover:bg-gray-100"
                  }`}
                >
                  {tab.label}
                </Link>
              ))
            )}
          </nav>
        </div>

        <div className="hidden items-center gap-3 sm:flex">
          {isSuperAdmin && !networkView && (
            <button
              onClick={() => switchRestaurant(null)}
              className="rounded-full bg-brand-50 px-3 py-1 text-xs font-medium text-brand-700 hover:bg-brand-100"
            >
              Mode gérant — Quitter
            </button>
          )}
          <span className="text-sm text-gray-500">{username}</span>
          <button
            onClick={() => setShowSettings(true)}
            className="flex h-9 w-9 items-center justify-center rounded-md border border-gray-300 text-gray-500 hover:bg-gray-50"
            aria-label="Réglages"
            title="Réglages"
          >
            <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
              <path
                d="M8.325 2.5c.19-.844.933-1.444 1.797-1.444h.756c.864 0 1.607.6 1.797 1.444l.11.492a1.833 1.833 0 0 0 2.61 1.264l.447-.223a1.833 1.833 0 0 1 2.31.53l.378.616a1.833 1.833 0 0 1-.363 2.383l-.394.34a1.833 1.833 0 0 0 0 2.796l.394.34a1.833 1.833 0 0 1 .363 2.383l-.378.616a1.833 1.833 0 0 1-2.31.53l-.447-.223a1.833 1.833 0 0 0-2.61 1.264l-.11.492c-.19.844-.933 1.444-1.797 1.444h-.756c-.864 0-1.607-.6-1.797-1.444l-.11-.492a1.833 1.833 0 0 0-2.61-1.264l-.447.223a1.833 1.833 0 0 1-2.31-.53l-.378-.616a1.833 1.833 0 0 1 .363-2.383l.394-.34a1.833 1.833 0 0 0 0-2.796l-.394-.34a1.833 1.833 0 0 1-.363-2.383l.378-.616a1.833 1.833 0 0 1 2.31-.53l.447.223a1.833 1.833 0 0 0 2.61-1.264l.11-.492Z"
                stroke="currentColor"
                strokeWidth="1.3"
                strokeLinejoin="round"
              />
              <circle cx="10" cy="10" r="2.5" stroke="currentColor" strokeWidth="1.3" />
            </svg>
          </button>
          <button
            onClick={handleLogout}
            className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Déconnexion
          </button>
        </div>

        <button
          className="flex h-9 w-9 items-center justify-center rounded-md border border-gray-300 sm:hidden"
          onClick={() => setOpen((o) => !o)}
          aria-label="Ouvrir le menu"
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M3 5h14M3 10h14M3 15h14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      {open && (
        <div className="border-t border-gray-200 bg-white px-4 py-3 sm:hidden">
          <nav className="flex flex-col gap-1">
            {networkView ? (
              <>
                <Link
                  href="/reseau"
                  onClick={() => setOpen(false)}
                  className={`rounded-md px-3 py-2 text-sm font-medium ${
                    pathname === "/reseau" ? "bg-brand-50 text-brand-700" : "text-gray-600 hover:bg-gray-100"
                  }`}
                >
                  Restaurants
                </Link>
                <Link
                  href="/reseau/utilisateurs"
                  onClick={() => setOpen(false)}
                  className={`rounded-md px-3 py-2 text-sm font-medium ${
                    pathname.startsWith("/reseau/utilisateurs")
                      ? "bg-brand-50 text-brand-700"
                      : "text-gray-600 hover:bg-gray-100"
                  }`}
                >
                  Utilisateurs
                </Link>
              </>
            ) : (
              visibleTabs.map((tab) => (
                <Link
                  key={tab.href}
                  href={tab.href}
                  onClick={() => setOpen(false)}
                  className={`rounded-md px-3 py-2 text-sm font-medium ${
                    pathname.startsWith(tab.href)
                      ? "bg-brand-50 text-brand-700"
                      : "text-gray-600 hover:bg-gray-100"
                  }`}
                >
                  {tab.label}
                </Link>
              ))
            )}
          </nav>
          {isSuperAdmin && (
            <button
              onClick={() => {
                setOpen(false);
                switchRestaurant(networkView ? (restaurants[0]?.id ?? null) : null);
              }}
              className="mt-2 w-full rounded-md bg-brand-50 px-3 py-2 text-left text-sm font-medium text-brand-700"
            >
              {networkView ? "Entrer en mode gérant" : "Mode gérant — Quitter vers le réseau"}
            </button>
          )}
          <div className="mt-3 flex items-center justify-between border-t border-gray-100 pt-3">
            <span className="text-sm text-gray-500">{username}</span>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setOpen(false);
                  setShowSettings(true);
                }}
                className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700"
              >
                Réglages
              </button>
              <button
                onClick={handleLogout}
                className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700"
              >
                Déconnexion
              </button>
            </div>
          </div>
        </div>
      )}

      {showSettings && (
        <SettingsModal
          userId={userId}
          username={username}
          isAdmin={isAdmin}
          onClose={() => setShowSettings(false)}
        />
      )}
    </header>
  );
}
