"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  LayoutDashboard,
  TrendingUp,
  Package,
  Users,
  CalendarDays,
  Hash,
  NotebookPen,
  Megaphone,
  Settings,
  LogOut,
  Menu,
  X,
} from "lucide-react";
import { Brand } from "@/components/Brand";
import { SettingsModal } from "./SettingsModal";
import { RestaurantSwitcher } from "./RestaurantSwitcher";
import { SidebarNavItem } from "./SidebarNavItem";

type RestaurantSummary = { id: string; name: string; role: "ADMIN" | "EMPLOYEE" };

type SidebarProps = {
  userId: string;
  isAdmin: boolean;
  activeRestaurantId: string | null;
  restaurants: RestaurantSummary[];
  username: string;
  canAccessMarges: boolean;
  canAccessMercuriale: boolean;
  canAccessCrm: boolean;
  canAccessMarketing: boolean;
};

export function Sidebar({
  userId,
  isAdmin,
  activeRestaurantId,
  restaurants,
  username,
  canAccessMarges,
  canAccessMercuriale,
  canAccessCrm,
  canAccessMarketing,
}: SidebarProps) {
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [switching, setSwitching] = useState(false);


  const TABS = [
    { href: "/dashboard", label: "Tableau de bord", icon: LayoutDashboard, visible: true },
    { href: "/marges", label: "Marges", icon: TrendingUp, visible: isAdmin || canAccessMarges },
    { href: "/mercuriale", label: "Mercuriale", icon: Package, visible: isAdmin || canAccessMercuriale },
    { href: "/clients", label: "Clients", icon: Users, visible: isAdmin || canAccessCrm },
    { href: "/planning", label: "Planning", icon: CalendarDays, visible: true },
    { href: "/canaux", label: "Canaux", icon: Hash, visible: true },
    { href: "/notes", label: "Notes & tâches", icon: NotebookPen, visible: true },
    { href: "/marketing", label: "Marketing", icon: Megaphone, visible: isAdmin || canAccessMarketing },
  ];
  const visibleTabs = TABS.filter((tab) => tab.visible);

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  async function switchRestaurant(restaurantId: string) {
    setSwitching(true);
    try {
      await fetch("/api/session/switch-restaurant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ restaurantId }),
      });
      router.push("/dashboard");
      router.refresh();
    } finally {
      setSwitching(false);
    }
  }

  function renderContent(onNavigate?: () => void) {
    return (
      <div className="flex h-full w-full flex-col">
        <div className="flex items-center gap-3 px-5 pb-6 pt-7">
          <div className="text-slate-900"><Brand /></div>
        </div>

        {restaurants.length > 1 && (
          <div className="px-4 pb-4">
            <RestaurantSwitcher
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
          <p className="px-3 pb-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">Votre espace</p>
          {visibleTabs.map((tab) => (
            <SidebarNavItem key={tab.href} href={tab.href} label={tab.label} icon={tab.icon} onClick={onNavigate} />
          ))}
        </nav>

        <div className="mt-auto space-y-2 border-t border-slate-100 px-3 py-5">
          <div className="flex items-center justify-between gap-2 px-1 pt-1">
            <div className="flex min-w-0 items-center gap-2.5"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-sm font-semibold text-slate-700">{username.slice(0, 1).toUpperCase()}</span><div className="min-w-0"><span className="block truncate text-sm font-medium text-slate-700">{username}</span><span className="text-xs text-slate-400">Mon compte</span></div></div>
            <div className="flex shrink-0 items-center gap-1">
              <button
                onClick={() => setShowSettings(true)}
                className="flex h-8 w-8 items-center justify-center rounded-bento-sm text-slate-400 hover:bg-slate-100 hover:text-slate-900"
                aria-label="Réglages"
                title="Réglages"
              >
                <Settings className="h-4 w-4" aria-hidden />
              </button>
              <button
                onClick={handleLogout}
                className="flex h-8 w-8 items-center justify-center rounded-bento-sm text-slate-400 hover:bg-slate-100 hover:text-slate-900"
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
      <aside className="app-sidebar sticky top-6 m-4 mr-0 hidden h-[calc(100vh-3rem)] w-52 shrink-0 rounded-[24px] lg:flex">
        {renderContent()}
      </aside>

      <div className="flex items-center justify-between border-b border-gray-200 bg-white px-4 py-3 lg:hidden">
        <span className="flex items-center gap-2 text-lg font-bold text-brand-700">
          <Brand compact />
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
