"use client";
import { useEffect, useRef } from "react";
import { X } from "lucide-react";
export function ClientPanel({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  const panel = useRef<HTMLDivElement>(null);
  const close = useRef(onClose);
  close.current = onClose;
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    panel.current?.focus();
    function keydown(e: KeyboardEvent) {
      if (e.key === "Escape") { e.preventDefault(); close.current(); }
      if (e.key !== "Tab") return;
      const nodes = Array.from(panel.current?.querySelectorAll<HTMLElement>('button:not(:disabled), a[href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), summary, [tabindex="0"]') ?? []).filter((node) => node.getClientRects().length > 0);
      const first = nodes[0], last = nodes[nodes.length - 1];
      if (!first) { e.preventDefault(); return; }
      if (e.shiftKey && (document.activeElement === first || document.activeElement === panel.current)) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && (document.activeElement === last || document.activeElement === panel.current)) { e.preventDefault(); first.focus(); }
    }
    document.addEventListener("keydown", keydown);
    return () => { document.body.style.overflow = overflow; document.removeEventListener("keydown", keydown); previous?.focus(); };
  }, []);
  return <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6"><button aria-label="Fermer la fiche client" onClick={onClose} className="absolute inset-0 bg-slate-900/20 backdrop-blur-[1px]" tabIndex={-1} /><div ref={panel} role="dialog" aria-modal="true" aria-label={title} tabIndex={-1} className="relative flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl outline-none"><header className="flex shrink-0 items-center justify-between gap-4 border-b border-slate-200 px-6 py-5"><div className="min-w-0"><p className="mb-1 text-[10px] font-semibold uppercase tracking-widest text-slate-400">Clients / Carnet</p><h2 className="truncate text-lg font-semibold text-slate-900">{title}</h2></div><button aria-label="Fermer" onClick={onClose} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"><X className="h-5 w-5" /></button></header><div className="min-h-0 flex-1 overflow-y-auto p-6">{children}</div></div></div>;
}
