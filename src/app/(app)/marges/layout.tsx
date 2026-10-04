"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const SUB_TABS = [
  { href: "/marges/carte", label: "Carte" },
  { href: "/marges/produits", label: "Produits & marges" },
  { href: "/marges/menus", label: "Menus" },
  { href: "/marges/ingredients", label: "Ingrédients" },
];

export default function MargesLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div>
      <div className="mb-8 flex flex-wrap gap-1 rounded-2xl border border-gray-200/60 bg-white p-1.5 shadow-sm">
        {SUB_TABS.map((tab) => (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={pathname.startsWith(tab.href) ? "page" : undefined}
            className={`rounded-xl px-4 py-2.5 text-sm font-medium ${
              pathname.startsWith(tab.href)
                ? "bg-brand-600 text-white shadow-sm"
                : "text-gray-600 hover:bg-gray-100"
            }`}
          >
            {tab.label}
          </Link>
        ))}
      </div>
      {children}
    </div>
  );
}
