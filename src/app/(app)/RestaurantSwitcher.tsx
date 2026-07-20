"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";

type RestaurantSummary = { id: string; name: string; role: "ADMIN" | "EMPLOYEE" };

export function RestaurantSwitcher({
  isSuperAdmin,
  activeRestaurantId,
  restaurants,
  switching,
  onSwitch,
}: {
  isSuperAdmin: boolean;
  activeRestaurantId: string | null;
  restaurants: RestaurantSummary[];
  switching: boolean;
  onSwitch: (restaurantId: string | null) => void;
}) {
  const [open, setOpen] = useState(false);

  if (restaurants.length <= 1 && !isSuperAdmin) return null;

  const activeRestaurant = restaurants.find((r) => r.id === activeRestaurantId) ?? null;
  const networkView = isSuperAdmin && !activeRestaurantId;

  function handleSelect(id: string | null) {
    setOpen(false);
    onSwitch(id);
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        disabled={switching}
        className="flex w-full items-center justify-between gap-1 rounded-bento-sm border border-gray-200 bg-gray-50 px-3 py-2 text-sm font-medium text-gray-700 hover:shadow-bento disabled:opacity-50"
      >
        <span className="truncate">{networkView ? "Vue réseau" : activeRestaurant?.name ?? "Choisir un restaurant"}</span>
        <ChevronDown className="h-4 w-4 shrink-0" aria-hidden />
      </button>
      {open && (
        <div className="absolute left-0 top-full z-20 mt-1 w-full min-w-[14rem] rounded-bento-sm border border-gray-100 bg-white py-1 shadow-bento-hover">
          {isSuperAdmin && (
            <button
              onClick={() => handleSelect(null)}
              className={`mx-1 block w-[calc(100%-0.5rem)] rounded-bento-sm px-3 py-2 text-left text-sm ${
                networkView ? "bg-brand-50 text-brand-700" : "text-gray-700 hover:bg-gray-50"
              }`}
            >
              Vue réseau
            </button>
          )}
          {restaurants.map((r) => (
            <button
              key={r.id}
              onClick={() => handleSelect(r.id)}
              className={`mx-1 block w-[calc(100%-0.5rem)] rounded-bento-sm px-3 py-2 text-left text-sm ${
                r.id === activeRestaurantId ? "bg-brand-50 text-brand-700" : "text-gray-700 hover:bg-gray-50"
              }`}
            >
              {r.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
