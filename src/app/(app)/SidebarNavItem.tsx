"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { LucideIcon } from "lucide-react";

export function SidebarNavItem({
  href,
  label,
  icon: Icon,
  onClick,
}: {
  href: string;
  label: string;
  icon: LucideIcon;
  onClick?: () => void;
}) {
  const pathname = usePathname();
  const active = href === "/reseau" ? pathname === href : pathname.startsWith(href);

  return (
    <Link
      href={href}
      onClick={onClick}
      className={`flex items-center gap-3 rounded-bento-sm px-3 py-2.5 text-sm font-medium transition ${
        active ? "bg-brand-50 text-brand-700 shadow-bento" : "text-gray-600 hover:bg-gray-50 hover:shadow-bento"
      }`}
    >
      <Icon className="h-4 w-4 shrink-0" aria-hidden />
      <span className="truncate">{label}</span>
    </Link>
  );
}
