"use client";
import { usePathname } from "next/navigation";
import { Building2 } from "lucide-react";
export function AppHeader({ restaurant, username }: { restaurant: string; username: string }) {
  const path = usePathname();
  const pages: Record<string,string> = {dashboard:"Vue d’ensemble",marges:"Marges",mercuriale:"Mercuriale",clients:"Clients & prospects",planning:"Planning",canaux:"Canaux",notes:"Notes & tâches",marketing:"Marketing"};
  return <header className="app-topbar mb-8 flex flex-wrap items-center justify-between gap-3"><div className="flex items-center gap-2 rounded-full bg-white p-1.5 shadow-sm"><span className="rounded-full bg-[#242520] px-4 py-2 text-sm font-medium text-white">{pages[path.split('/')[1]] || 'Mon restaurant'}</span><span className="hidden px-3 text-sm text-slate-500 sm:block">La maison, au quotidien</span></div><div className="flex items-center gap-4"><span className="flex items-center gap-2 text-xs text-slate-500"><Building2 className="h-4 w-4" />{restaurant}</span><div className="flex items-center gap-2.5 rounded-full bg-white py-1.5 pl-1.5 pr-4 shadow-sm"><span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-50 text-xs font-semibold text-brand-700">{username.slice(0,1).toUpperCase()}</span><span className="text-sm font-medium text-slate-700">{username}</span></div></div></header>;
}
