"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const SUB_TABS = [
  { href: "/marketing/campagnes", label: "Campagnes" },
  { href: "/marketing/calendrier", label: "Calendrier éditorial" },
];

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div>
      <div className="mb-6 flex gap-2">
        {SUB_TABS.map((tab) => (
          <Link
            key={tab.href}
            href={tab.href}
            className={`rounded-md px-3 py-1.5 text-sm font-medium ${
              pathname.startsWith(tab.href) ? "bg-brand-50 text-brand-700" : "text-gray-600 hover:bg-gray-100"
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
