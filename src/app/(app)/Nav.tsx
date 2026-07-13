"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { SettingsModal } from "./SettingsModal";

type NavProps = {
  userId: string;
  role: string;
  username: string;
  canAccessMarges: boolean;
  canAccessMercuriale: boolean;
  canAccessCrm: boolean;
};

export function Nav({ userId, role, username, canAccessMarges, canAccessMercuriale, canAccessCrm }: NavProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  const isAdmin = role === "ADMIN";
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

  return (
    <header className="border-b border-gray-200 bg-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <div className="flex items-center gap-6">
          <span className="text-lg font-bold text-brand-700">🍽️ Amoné Nice</span>

          <nav className="hidden gap-1 sm:flex">
            {visibleTabs.map((tab) => (
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
            ))}
          </nav>
        </div>

        <div className="hidden items-center gap-3 sm:flex">
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
            {visibleTabs.map((tab) => (
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
            ))}
          </nav>
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
