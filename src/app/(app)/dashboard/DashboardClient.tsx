"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { GripVertical, Settings2, TrendingUp, Package, Users, Megaphone, CalendarDays, Hash, NotebookPen } from "lucide-react";

type Widget = { type: string; label: string; order: number; visible: boolean };

type Summary = {
  today: {
    date: string;
    shifts: { employeeName: string; startTime: string; endTime: string }[];
    absencesPending: number;
  };
  keyNumbers: { tasksOpen: number; itemsToOrder: number; marketingUpcoming: number };
};

type Shortcuts = { marges: boolean; mercuriale: boolean; crm: boolean; marketing: boolean };

function moveByType<T extends { type: string }>(list: T[], fromType: string, toType: string): T[] {
  const fromIndex = list.findIndex((x) => x.type === fromType);
  const toIndex = list.findIndex((x) => x.type === toType);
  if (fromIndex === -1 || toIndex === -1 || fromIndex === toIndex) return list;
  const copy = [...list];
  const [moved] = copy.splice(fromIndex, 1);
  copy.splice(toIndex, 0, moved);
  return copy;
}

const SHORTCUT_LINKS = [
  { href: "/marges", label: "Marges", icon: TrendingUp, key: "marges" as const },
  { href: "/mercuriale", label: "Mercuriale", icon: Package, key: "mercuriale" as const },
  { href: "/clients", label: "Clients", icon: Users, key: "crm" as const },
  { href: "/marketing", label: "Marketing", icon: Megaphone, key: "marketing" as const },
  { href: "/planning", label: "Planning", icon: CalendarDays, key: null },
  { href: "/canaux", label: "Canaux", icon: Hash, key: null },
  { href: "/notes", label: "Notes & tâches", icon: NotebookPen, key: null },
];

export function DashboardClient({ username, shortcuts }: { username: string; shortcuts: Shortcuts }) {
  const [widgets, setWidgets] = useState<Widget[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [customizing, setCustomizing] = useState(false);
  const [draggingType, setDraggingType] = useState<string | null>(null);

  async function loadWidgets() {
    const res = await fetch("/api/dashboard/widgets");
    if (res.ok) setWidgets(await res.json());
  }

  useEffect(() => {
    Promise.all([loadWidgets(), fetch("/api/dashboard/summary").then((r) => (r.ok ? r.json() : null))]).then(
      ([, summaryData]) => {
        setSummary(summaryData);
        setLoading(false);
      }
    );
  }, []);

  async function handleDrop(targetType: string) {
    if (!draggingType || draggingType === targetType) {
      setDraggingType(null);
      return;
    }
    const reordered = moveByType(widgets, draggingType, targetType);
    setDraggingType(null);
    if (reordered === widgets) return;
    setWidgets(reordered);
    await fetch("/api/dashboard/widgets/reorder", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ types: reordered.map((w) => w.type) }),
    });
  }

  async function toggleVisible(type: string, visible: boolean) {
    setWidgets((prev) => prev.map((w) => (w.type === type ? { ...w, visible } : w)));
    await fetch(`/api/dashboard/widgets/${type}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ visible }),
    });
  }

  const visibleWidgets = widgets.filter((w) => w.visible);

  return (
    <div>
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-brand-600">Votre restaurant, en un regard</p>
          <h1 className="text-3xl font-semibold tracking-tight text-gray-900 sm:text-4xl">Bonjour {username}<span className="text-brand-600">.</span></h1>
          <p className="mt-1 text-sm text-gray-500">Retrouvez les priorités du jour et les outils de votre équipe.</p>
        </div>
        <button
          onClick={() => setCustomizing((c) => !c)}
          className={`flex items-center gap-1.5 whitespace-nowrap rounded-bento-sm px-3 py-2 text-sm font-medium ${
            customizing ? "bg-brand-50 text-brand-700" : "border border-gray-300 text-gray-700 hover:bg-gray-50"
          }`}
        >
          <Settings2 className="h-4 w-4" aria-hidden />
          Personnaliser
        </button>
      </div>

      {customizing && (
        <div className="mb-5 rounded-bento border border-gray-100 bg-white p-4 shadow-bento">
          <p className="mb-3 text-xs font-medium uppercase tracking-wide text-gray-500">Widgets affichés</p>
          <div className="flex flex-wrap gap-2">
            {widgets.map((w) => (
              <label
                key={w.type}
                className="flex items-center gap-2 rounded-bento-sm border border-gray-200 px-3 py-1.5 text-sm text-gray-700"
              >
                <input
                  type="checkbox"
                  checked={w.visible}
                  onChange={(e) => toggleVisible(w.type, e.target.checked)}
                  className="h-4 w-4"
                />
                {w.label}
              </label>
            ))}
          </div>
          <p className="mt-2 text-xs text-gray-400">Glisse les cartes ci-dessous pour réordonner.</p>
        </div>
      )}

      {loading ? (
        <p className="text-sm text-gray-500">Chargement...</p>
      ) : (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          {visibleWidgets.map((w) => (
            <div
              key={w.type}
              draggable={customizing}
              onDragStart={() => customizing && setDraggingType(w.type)}
              onDragOver={(e) => customizing && e.preventDefault()}
              onDrop={() => customizing && handleDrop(w.type)}
              className={`rounded-bento border border-gray-200/60 bg-white p-6 shadow-bento ${customizing ? "cursor-move" : ""}`}
            >
              <div className="mb-5 flex items-center gap-2">
                {customizing && <GripVertical className="h-4 w-4 text-gray-300" aria-hidden />}
                <h2 className="text-base font-semibold text-gray-900">{w.label}</h2>
              </div>

              {w.type === "TODAY_SUMMARY" && summary && <TodaySummaryWidget summary={summary} />}
              {w.type === "KEY_NUMBERS" && summary && <KeyNumbersWidget summary={summary} />}
              {w.type === "SHORTCUTS" && <ShortcutsWidget shortcuts={shortcuts} />}
            </div>
          ))}
          {visibleWidgets.length === 0 && (
            <p className="text-sm text-gray-400">
              Tous les widgets sont masqués — clique sur &laquo; Personnaliser &raquo; pour en réafficher.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function TodaySummaryWidget({ summary }: { summary: Summary }) {
  const { shifts, absencesPending } = summary.today;
  return (
    <div>
      {shifts.length === 0 ? (
        <p className="text-sm text-gray-400">Aucun créneau aujourd&apos;hui.</p>
      ) : (
        <ul className="space-y-1.5">
          {shifts.map((s, i) => (
            <li key={i} className="flex items-center justify-between text-sm text-gray-700">
              <span>{s.employeeName}</span>
              <span className="text-gray-500">
                {s.startTime} – {s.endTime}
              </span>
            </li>
          ))}
        </ul>
      )}
      {absencesPending > 0 && (
        <Link href="/planning" className="mt-3 block text-sm text-brand-600 hover:underline">
          {absencesPending} demande{absencesPending > 1 ? "s" : ""} d&apos;absence en attente
        </Link>
      )}
    </div>
  );
}

function KeyNumbersWidget({ summary }: { summary: Summary }) {
  const { tasksOpen, itemsToOrder, marketingUpcoming } = summary.keyNumbers;
  const tiles = [
    { label: "Tâches à faire", value: tasksOpen, href: "/notes" },
    { label: "Articles à commander", value: itemsToOrder, href: "/mercuriale/a-commander" },
    { label: "Marketing à venir", value: marketingUpcoming, href: "/marketing" },
  ];
  return (
    <div className="grid grid-cols-3 gap-3">
      {tiles.map((t) => (
        <Link
          key={t.label}
          href={t.href}
          className="rounded-bento-sm border border-brand-100/60 bg-brand-50/50 px-2 py-5 text-center transition hover:bg-brand-50 hover:shadow-bento"
        >
          <div className="text-3xl font-semibold tracking-tight text-brand-800">{t.value}</div>
          <div className="mt-0.5 text-xs text-gray-500">{t.label}</div>
        </Link>
      ))}
    </div>
  );
}

function ShortcutsWidget({ shortcuts }: { shortcuts: Shortcuts }) {
  const visible = SHORTCUT_LINKS.filter((l) => l.key === null || shortcuts[l.key]);
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
      {visible.map((l) => (
        <Link
          key={l.href}
          href={l.href}
          className="flex items-center gap-3 rounded-bento-sm border border-gray-100 bg-white px-3 py-4 text-sm font-medium text-gray-700 transition hover:border-brand-200 hover:bg-brand-50"
        >
          <l.icon className="h-5 w-5 text-brand-600" aria-hidden />
          {l.label}
        </Link>
      ))}
    </div>
  );
}
