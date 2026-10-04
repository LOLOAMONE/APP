"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  UtensilsCrossed,
  LayoutDashboard,
  TrendingUp,
  Package,
  Users,
  CalendarDays,
  Hash,
  LifeBuoy,
  Megaphone,
  Store,
  UserCog,
  Settings,
  LogOut,
  Menu,
  X,
} from "lucide-react";
import { SettingsModal } from "./SettingsModal";
import { RestaurantSwitcher } from "./RestaurantSwitcher";
import { SidebarNavItem } from "./SidebarNavItem";

type RestaurantSummary = { id: string; name: string; role: "ADMIN" | "EMPLOYEE" };

type SidebarProps = {
  userId: string;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  activeRestaurantId: string | null;
  restaurants: RestaurantSummary[];
  username: string;
  canAccessMarges: boolean;
  canAccessMercuriale: boolean;
  canAccessCrm: boolean;
  canAccessMarketing: boolean;
  hasGlobalTicketAccess: boolean;
  hasGlobalMarketingAccess: boolean;
};

export function Sidebar({
  userId,
  isAdmin,
  isSuperAdmin,
  activeRestaurantId,
  restaurants,
  username,
  canAccessMarges,
  canAccessMercuriale,
  canAccessCrm,
  canAccessMarketing,
  hasGlobalTicketAccess,
  hasGlobalMarketingAccess,
}: SidebarProps) {
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [switching, setSwitching] = useState(false);

  const networkView = isSuperAdmin && !activeRestaurantId;

  const TABS = [
    { href: "/dashboard", label: "Tableau de bord", icon: LayoutDashboard, visible: true },
    { href: "/marges", label: "Marges", icon: TrendingUp, visible: isAdmin || canAccessMarges },
    { href: "/mercuriale", label: "Mercuriale", icon: Package, visible: isAdmin || canAccessMercuriale },
    { href: "/clients", label: "Clients", icon: Users, visible: isAdmin || canAccessCrm },
    { href: "/planning", label: "Planning", icon: CalendarDays, visible: true },
    { href: "/canaux", label: "Canaux", icon: Hash, visible: true },
    { href: "/tickets", label: "Tickets", icon: LifeBuoy, visible: true },
    { href: "/marketing", label: "Marketing", icon: Megaphone, visible: isAdmin || canAccessMarketing },
  ];
  const visibleTabs = TABS.filter((tab) => tab.visible);

  const NETWORK_TABS = [
    { href: "/reseau", label: "Restaurants", icon: Store, visible: true },
    { href: "/reseau/utilisateurs", label: "Utilisateurs", icon: UserCog, visible: true },
    { href: "/tickets", label: "Tickets", icon: LifeBuoy, visible: hasGlobalTicketAccess },
    { href: "/marketing", label: "Marketing", icon: Megaphone, visible: hasGlobalMarketingAccess },
  ];
  const visibleNetworkTabs = NETWORK_TABS.filter((tab) => tab.visible);

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  async function switchRestaurant(restaurantId: string | null) {
    setSwitching(true);
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

  function renderContent(onNavigate?: () => void) {
    return (
      <div className="flex h-full w-full flex-col">
        <div className="flex items-center gap-3 px-5 pb-6 pt-7">
          <UtensilsCrossed className="h-10 w-10 shrink-0 rounded-2xl bg-white/10 p-2.5 text-white" aria-hidden />
          <span className="truncate text-xl font-semibold tracking-tight text-white">
            {networkView ? "Amoné · Réseau" : "Amoné"}
          </span>
        </div>

        {(restaurants.length > 1 || isSuperAdmin) && (
          <div className="px-4 pb-4">
            <RestaurantSwitcher
              isSuperAdmin={isSuperAdmin}
              activeRestaurantId={activeRestaurantId}
              restaurants={restaurants}
              switching={switching}
              onSwitch={(id) => {
                switchRestaurant(id);
                onNavigate?.();
              }}
            />
          </div>
        )}

        <nav aria-label="Navigation principale" className="flex-1 space-y-1.5 overflow-y-auto px-3">
          <p className="px-3 pb-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-white/45">{networkView ? "Gestion du réseau" : "Votre espace"}</p>
          {(networkView ? visibleNetworkTabs : visibleTabs).map((tab) => (
            <SidebarNavItem key={tab.href} href={tab.href} label={tab.label} icon={tab.icon} onClick={onNavigate} />
          ))}
        </nav>

        <div className="mt-auto space-y-2 border-t border-white/10 px-3 py-5">
          {isSuperAdmin && !networkView && (
            <button
              onClick={() => {
                switchRestaurant(null);
                onNavigate?.();
              }}
              className="w-full rounded-bento-sm bg-brand-50 px-3 py-2 text-left text-xs font-medium text-brand-700 hover:shadow-bento"
            >
              Mode gérant — Quitter
            </button>
          )}
          {networkView && restaurants.length > 0 && (
            <button
              onClick={() => {
                switchRestaurant(restaurants[0].id);
                onNavigate?.();
              }}
              className="w-full rounded-bento-sm bg-brand-50 px-3 py-2 text-left text-xs font-medium text-brand-700 hover:shadow-bento"
            >
              Entrer en mode gérant
            </button>
          )}
          <div className="flex items-center justify-between gap-2 px-1 pt-1">
            <div className="flex min-w-0 items-center gap-2.5"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/10 text-sm font-semibold text-white">{username.slice(0, 1).toUpperCase()}</span><div className="min-w-0"><span className="block truncate text-sm font-medium text-white">{username}</span><span className="text-xs text-white/45">Mon compte</span></div></div>
            <div className="flex shrink-0 items-center gap-1">
              <button
                onClick={() => setShowSettings(true)}
                className="flex h-8 w-8 items-center justify-center rounded-bento-sm text-white/60 hover:bg-white/10 hover:text-white"
                aria-label="Réglages"
                title="Réglages"
              >
                <Settings className="h-4 w-4" aria-hidden />
              </button>
              <button
                onClick={handleLogout}
                className="flex h-8 w-8 items-center justify-center rounded-bento-sm text-white/60 hover:bg-white/10 hover:text-white"
                aria-label="Déconnexion"
                title="Déconnexion"
              >
                <LogOut className="h-4 w-4" aria-hidden />
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <aside className="app-sidebar sticky top-0 hidden h-screen w-64 shrink-0 lg:flex">
        {renderContent()}
      </aside>

      <div className="flex items-center justify-between border-b border-gray-200 bg-white px-4 py-3 lg:hidden">
        <span className="flex items-center gap-2 text-lg font-bold text-brand-700">
          <UtensilsCrossed className="h-5 w-5" aria-hidden />
          {networkView ? "Amoné · Réseau" : "Amoné"}
        </span>
        <button
          onClick={() => setMobileOpen(true)}
          className="flex h-9 w-9 items-center justify-center rounded-md border border-gray-300"
          aria-label="Ouvrir le menu"
        >
          <Menu className="h-5 w-5" aria-hidden />
        </button>
      </div>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div className="fixed inset-0 bg-black/40" onClick={() => setMobileOpen(false)} />
          <div className="app-sidebar relative flex h-full w-72 max-w-[85vw] flex-col shadow-xl">
            <button
              onClick={() => setMobileOpen(false)}
              className="absolute right-3 top-4 flex h-8 w-8 items-center justify-center rounded-md text-gray-400 hover:text-gray-600"
              aria-label="Fermer le menu"
            >
              <X className="h-5 w-5" aria-hidden />
            </button>
            {renderContent(() => setMobileOpen(false))}
          </div>
        </div>
      )}

      {showSettings && (
        <SettingsModal userId={userId} username={username} isAdmin={isAdmin} onClose={() => setShowSettings(false)} />
      )}
    </>
  );
}
