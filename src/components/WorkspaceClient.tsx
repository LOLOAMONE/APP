"use client";

import { useEffect, useRef, useState } from "react";
import { Archive, Check, ChevronLeft, ChevronRight, FileText, Lightbulb, Pin, Plus, Search } from "lucide-react";
import { Modal } from "./Modal";

type Item = { id: string; area: "NOTES" | "MARKETING"; kind: "NOTE" | "TASK" | "IDEA" | "POST"; title: string; body: string; scheduledDate: string | null; completed: boolean; pinned: boolean; archived: boolean; updatedAt: string };
type Draft = Omit<Item, "id" | "updatedAt">;
const LABELS = { NOTE: "Page", TASK: "Tâche", IDEA: "Idée", POST: "Publication" };
const button = "inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-40";
const primary = "inline-flex items-center justify-center gap-2 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-40";
function localDate(d = new Date()) { return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; }
function dateLabel(v: string) { return new Date(`${v}T12:00:00`).toLocaleDateString("fr-FR", { day: "numeric", month: "short" }); }

function NotePreview({ body }: { body: string }) {
  return <div className="space-y-2 text-sm leading-7 text-gray-700">{body.split("\n").map((line, i) => {
    if (line.startsWith("# ")) return <h2 key={i} className="pt-4 text-2xl font-semibold text-gray-900">{line.slice(2)}</h2>;
    if (line.startsWith("## ")) return <h3 key={i} className="pt-3 text-lg font-semibold text-gray-900">{line.slice(3)}</h3>;
    if (/^- \[[ x]\] /.test(line)) return <div key={i} className="flex items-start gap-2"><span className="mt-1 text-brand-600">{line[3] === "x" ? "☑" : "☐"}</span><span>{line.slice(6)}</span></div>;
    if (line.startsWith("- ")) return <div key={i} className="flex gap-3"><span>•</span><span>{line.slice(2)}</span></div>;
    return <p key={i} className="min-h-3 whitespace-pre-wrap break-words">{line}</p>;
  })}</div>;
}

export function WorkspaceClient({ area }: { area: "NOTES" | "MARKETING" }) {
  const marketing = area === "MARKETING";
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState(marketing ? "CALENDAR" : "NOTE");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [modal, setModal] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [preview, setPreview] = useState(false);
  const [month, setMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const textarea = useRef<HTMLTextAreaElement>(null);
  const today = localDate();

  async function load() {
    try {
      const res = await fetch(`/api/workspace?area=${area}`);
      if (!res.ok) throw new Error("Impossible de charger cet espace.");
      setItems(await res.json());
    } catch (e) { setError(e instanceof Error ? e.message : "Connexion indisponible."); }
    finally { setLoading(false); }
  }
  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [area]);
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ""; };
    const checkLink = (event: MouseEvent) => {
      const link = (event.target as Element)?.closest?.("a[href]");
      if (link && !window.confirm("Des modifications ne sont pas enregistrées. Quitter sans les enregistrer ?")) {
        event.preventDefault(); event.stopImmediatePropagation();
      }
    };
    window.addEventListener("beforeunload", warn);
    document.addEventListener("click", checkLink, true);
    return () => { window.removeEventListener("beforeunload", warn); document.removeEventListener("click", checkLink, true); };
  }, [dirty]);
  const active = items.filter((i) => !i.archived);
  const filtered = items.filter((i) => (tab === "ARCHIVE" ? i.archived : !i.archived) && `${i.title} ${i.body}`.toLocaleLowerCase().includes(search.toLocaleLowerCase()));
  const notes = filtered.filter((i) => i.kind === "NOTE");
  const tasks = filtered.filter((i) => i.kind === "TASK").sort((a, b) => Number(a.completed) - Number(b.completed) || (a.scheduledDate ?? "9999").localeCompare(b.scheduledDate ?? "9999"));
  const selected = items.find((i) => i.id === selectedId);
  const taskCount = active.filter((i) => i.kind === "TASK" && !i.completed).length;
  const overdue = active.filter((i) => i.kind === "TASK" && !i.completed && i.scheduledDate && i.scheduledDate < today).length;

  function mayLeave() { if (saving) return false; return !dirty || window.confirm("Des modifications ne sont pas enregistrées. Quitter cette page sans les enregistrer ?"); }
  function edit(item: Item) {
    if (!mayLeave()) return;
    setDraft({ area: item.area, kind: item.kind, title: item.title, body: item.body, scheduledDate: item.scheduledDate, completed: item.completed, pinned: item.pinned, archived: item.archived });
    setEditingId(item.id); setSelectedId(item.id); setDirty(false); setPreview(false); setError("");
    setModal(marketing || item.kind !== "NOTE" || tab === "ARCHIVE");
  }
  function create(kind: Item["kind"], date: string | null = null) {
    if (!mayLeave()) return;
    setDraft({ area, kind, title: "", body: "", scheduledDate: date, completed: false, pinned: false, archived: false });
    setEditingId(null); setSelectedId(null); setDirty(false); setPreview(false); setError("");
    if (!marketing) setTab(kind);
    setModal(marketing || kind !== "NOTE");
  }
  function change(patch: Partial<Draft>) { setDraft((d) => d ? { ...d, ...patch } : d); setDirty(true); }
  async function persist(data: Draft, id: string | null) {
    const res = await fetch(id ? `/api/workspace/${id}` : "/api/workspace", { method: id ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
    if (!res.ok) { const body = await res.json().catch(() => ({})); throw new Error(body.error ?? "Enregistrement impossible."); }
    const saved: Item = await res.json();
    setItems((prev) => [saved, ...prev.filter((i) => i.id !== saved.id)].sort((a, b) => Number(b.pinned) - Number(a.pinned)));
    return saved;
  }
  async function save(e?: React.FormEvent) {
    e?.preventDefault(); if (!draft || saving) return;
    setSaving(true); setError("");
    try { const saved = await persist(draft, editingId); setEditingId(saved.id); setSelectedId(saved.id); setDirty(false); setModal(false); setNotice("Enregistré"); }
    catch (e) { setError(e instanceof Error ? e.message : "Enregistrement impossible."); }
    finally { setSaving(false); }
  }
  async function update(item: Item, patch: Partial<Draft>) {
    if (saving) return;
    if (item.id === editingId && !mayLeave()) return;
    setSaving(true); setError("");
    try {
      const saved = await persist({ ...item, ...patch }, item.id);
      if (item.id === editingId) { setDraft(saved.archived ? null : saved); if (saved.archived) setSelectedId(null); setDirty(false); }
      setNotice(patch.archived ? "Archivé — disponible dans les archives" : "Enregistré");
    } catch (e) { setError(e instanceof Error ? e.message : "Enregistrement impossible."); }
    finally { setSaving(false); }
  }
  function switchTab(next: string) { if (mayLeave()) { setTab(next); setDraft(null); setSelectedId(null); setDirty(false); } }
  function insert(prefix: string) {
    if (!draft) return;
    const pos = textarea.current?.selectionStart ?? draft.body.length;
    change({ body: draft.body.slice(0, pos) + (pos && draft.body[pos - 1] !== "\n" ? "\n" : "") + prefix + draft.body.slice(pos) });
    textarea.current?.focus();
  }
  const editor = draft && <form onSubmit={save} className="space-y-5">
    <div className="flex flex-wrap items-center justify-between gap-3"><span className="text-xs font-semibold uppercase tracking-widest text-brand-600">{LABELS[draft.kind]}</span><span className="text-xs text-gray-400">{dirty ? "Modifications à enregistrer" : editingId ? "Enregistré" : "Nouveau"}</span></div>
    <input aria-label="Titre" placeholder={draft.kind === "NOTE" ? "Une nouvelle page…" : "Donnez-lui un titre…"} value={draft.title} maxLength={200} onChange={(e) => change({ title: e.target.value })} required className="w-full !border-0 !bg-transparent !px-0 !text-2xl !font-semibold !shadow-none" />
    {(marketing || draft.kind === "TASK") && <div className="grid gap-4 sm:grid-cols-2">{marketing && <label className="text-sm font-medium">Type<select value={draft.kind} onChange={(e) => change({ kind: e.target.value as Item["kind"] })} className="mt-2 w-full"><option value="IDEA">Idée à explorer</option><option value="TASK">Tâche à faire</option><option value="POST">Publication à préparer</option></select></label>}<label className="text-sm font-medium">{marketing ? "Date prévue (optionnelle)" : "Échéance (optionnelle)"}<input type="date" value={draft.scheduledDate ?? ""} onChange={(e) => change({ scheduledDate: e.target.value || null })} className="mt-2 w-full" /></label></div>}
    {draft.kind === "NOTE" && <div className="flex flex-wrap gap-2 border-b border-gray-100 pb-3"><button type="button" className={button} onClick={() => insert("# ")}>Titre</button><button type="button" className={button} onClick={() => insert("- ")}>Liste</button><button type="button" className={button} onClick={() => insert("- [ ] ")}>Checklist</button><button type="button" className={button} onClick={() => setPreview(!preview)}>{preview ? "Écrire" : "Aperçu"}</button></div>}
    {preview ? <NotePreview body={draft.body} /> : <textarea ref={textarea} aria-label="Contenu" placeholder={marketing ? "L’idée, les étapes, le texte à préparer, un lien vers les photos…" : "Posez vos idées, vos procédures ou vos listes ici…"} value={draft.body} maxLength={50000} onChange={(e) => change({ body: e.target.value })} rows={draft.kind === "NOTE" ? 14 : 6} className="w-full resize-y !border-0 !bg-transparent !px-0 !shadow-none !leading-7" />}
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 pt-4"><label className="flex items-center gap-2 text-sm text-gray-600"><input type="checkbox" checked={draft.pinned} onChange={(e) => change({ pinned: e.target.checked })} />Favori</label><button type="submit" className={primary} disabled={saving || !draft.title.trim()}><Check className="h-4 w-4" />{saving ? "Enregistrement…" : "Enregistrer"}</button></div>
  </form>;
  function card(item: Item) {
    return <div key={item.id} className="group flex items-start gap-3 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
      {item.kind === "TASK" ? <input aria-label={`Terminer : ${item.title}`} type="checkbox" className="mt-1 h-5 w-5 shrink-0" checked={item.completed} disabled={saving} onChange={() => update(item, { completed: !item.completed })} /> : <span className="mt-1 text-brand-600">{item.kind === "IDEA" ? <Lightbulb className="h-5 w-5" /> : <FileText className="h-5 w-5" />}</span>}
      <button onClick={() => edit(item)} className="min-w-0 flex-1 text-left"><p className={`break-words text-sm font-semibold ${item.completed ? "text-gray-400 line-through" : "text-gray-900"}`}>{item.title}</p>{item.body && <p className="mt-1 line-clamp-2 text-xs leading-5 text-gray-500">{item.body}</p>}<div className="mt-2 flex flex-wrap gap-2 text-xs text-gray-400"><span>{LABELS[item.kind]}</span>{item.pinned && <span>· Favori</span>}{item.scheduledDate && <span className={!item.completed && item.scheduledDate < today ? "text-orange-700" : ""}>· {dateLabel(item.scheduledDate)}</span>}</div></button>
      <button aria-label={item.archived ? `Restaurer ${item.title}` : `Archiver ${item.title}`} title={item.archived ? "Restaurer" : "Archiver"} disabled={saving} onClick={() => update(item, { archived: !item.archived })} className="rounded-lg p-1 text-gray-400 hover:bg-gray-100"><Archive className="h-4 w-4" /></button>
    </div>;
  }
  const monthStart = new Date(month.getFullYear(), month.getMonth(), 1);
  const offset = (monthStart.getDay() + 6) % 7;
  const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const cells = Array.from({ length: Math.ceil((offset + daysInMonth) / 7) * 7 }, (_, n) => { const d = new Date(month.getFullYear(), month.getMonth(), n - offset + 1); return { date: localDate(d), day: d.getDate(), current: d.getMonth() === month.getMonth() }; });

  return <div>
    <div className="mb-7 flex flex-wrap items-start justify-between gap-4"><div><p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-brand-600">{marketing ? "Faire vivre le restaurant" : "Votre espace de travail"}</p><h1 className="text-3xl font-semibold tracking-tight text-gray-900">{marketing ? "Le calendrier marketing" : "Notes & tâches"}</h1><p className="mt-2 text-sm text-gray-500">{marketing ? "Des idées, une date, puis une action. Tout simplement." : "Vos idées au même endroit. Vos prochaines actions à portée de main."}</p></div><div className="flex flex-wrap gap-2">{!marketing && <button className={button} onClick={() => create("TASK")}><Plus className="h-4 w-4" />Tâche</button>}<button className={primary} onClick={() => create(marketing ? "IDEA" : "NOTE")}><Plus className="h-4 w-4" />{marketing ? "Ajouter une idée" : "Nouvelle page"}</button></div></div>
    <div className="mb-6 grid gap-3 sm:grid-cols-3">{(marketing ? [{ label: "Idées à explorer", value: active.filter((i) => i.kind === "IDEA" && !i.completed).length }, { label: "Actions à faire", value: taskCount }, { label: "Au calendrier", value: active.filter((i) => i.scheduledDate && !i.completed).length }] : [{ label: "Pages", value: active.filter((i) => i.kind === "NOTE").length }, { label: "Tâches à faire", value: taskCount }, { label: "Échéances dépassées", value: overdue }]).map((s) => <div key={s.label} className="rounded-2xl border border-gray-200 bg-white px-5 py-4"><span className="text-2xl font-semibold text-brand-800">{s.value}</span><span className="ml-3 text-sm text-gray-500">{s.label}</span></div>)}</div>
    <div className="mb-5 flex flex-wrap items-center justify-between gap-3"><div className="flex flex-wrap gap-1 rounded-xl bg-gray-100 p-1">{(marketing ? [["CALENDAR", "Calendrier"], ["IDEAS", "Idées & actions"], ["ARCHIVE", "Archives"]] : [["NOTE", "Pages"], ["TASK", "À faire"], ["ARCHIVE", "Archives"]]).map(([key, label]) => <button key={key} onClick={() => switchTab(key)} className={`rounded-lg px-4 py-2 text-sm font-medium ${tab === key ? "bg-white text-brand-700 shadow-sm" : "text-gray-500"}`}>{label}</button>)}</div><label className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3"><Search className="h-4 w-4 text-gray-400" /><input aria-label="Rechercher dans cet espace" placeholder="Rechercher…" value={search} onChange={(e) => setSearch(e.target.value)} className="w-44 !border-0 !shadow-none" /></label></div>
    {error && <p role="alert" className="mb-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}{notice && <p role="status" className="mb-3 text-xs text-gray-500">{notice}</p>}
    {loading ? <p className="py-12 text-center text-sm text-gray-400">Chargement de votre espace…</p> : <>
      {!marketing && tab === "NOTE" && <div className="grid items-start gap-5 lg:grid-cols-[280px_1fr]"><div className="space-y-2">{notes.length === 0 && <div className="rounded-2xl border border-dashed border-gray-300 p-6 text-sm text-gray-500">Votre première page vous attend. Notez une recette à tester, une procédure ou une idée.</div>}{notes.map((n) => <button key={n.id} onClick={() => edit(n)} className={`flex w-full items-start gap-3 rounded-xl border p-4 text-left ${selectedId === n.id ? "border-brand-200 bg-brand-50" : "border-gray-200 bg-white hover:border-brand-200"}`}><FileText className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" /><span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold">{n.title}</span><span className="mt-1 block text-xs text-gray-400">Modifiée le {new Date(n.updatedAt).toLocaleDateString("fr-FR")}</span></span>{n.pinned && <Pin className="h-3 w-3 text-brand-500" />}</button>)}</div><div className="min-w-0 rounded-2xl border border-gray-200 bg-white p-6 sm:p-8">{draft?.kind === "NOTE" && !modal ? <>{editor}{selected && <button className="mt-5 text-xs text-gray-400 hover:text-brand-600" disabled={saving} onClick={() => { if (mayLeave()) { update(selected, { archived: true }); setDraft(null); setSelectedId(null); setDirty(false); } }}>Archiver cette page</button>}</> : <div className="py-16 text-center"><FileText className="mx-auto mb-4 h-9 w-9 text-brand-200" /><h2 className="font-semibold text-gray-700">Un peu de place pour vos idées.</h2><p className="mt-2 text-sm text-gray-400">Ouvrez une page ou créez-en une nouvelle.</p></div>}</div></div>}
      {!marketing && tab === "TASK" && <div className="space-y-3">{tasks.length ? tasks.map(card) : <div className="rounded-2xl border border-dashed border-gray-300 p-12 text-center text-sm text-gray-500">Rien à faire pour l’instant. Ajoutez une tâche et une échéance si besoin.</div>}</div>}
      {tab === "ARCHIVE" && <div className="grid gap-3 md:grid-cols-2">{filtered.length ? filtered.map(card) : <p className="py-10 text-sm text-gray-400">Aucune archive.</p>}</div>}
      {marketing && tab === "IDEAS" && <div className="grid items-start gap-5 lg:grid-cols-3">{(["IDEA", "TASK", "POST"] as const).map((kind) => <section key={kind} className="rounded-2xl bg-gray-100/70 p-4"><div className="mb-4 flex items-center justify-between"><h2 className="text-sm font-semibold">{kind === "IDEA" ? "À explorer" : kind === "TASK" ? "À faire" : "Publications"}</h2><button aria-label={`Ajouter : ${LABELS[kind]}`} onClick={() => create(kind)} className="rounded-lg bg-white p-2 text-brand-600"><Plus className="h-4 w-4" /></button></div><div className="space-y-3">{filtered.filter((i) => i.kind === kind).map(card)}{!filtered.some((i) => i.kind === kind) && <p className="p-3 text-xs leading-5 text-gray-400">{kind === "IDEA" ? "Une photo des coulisses, un produit de saison, une collaboration locale…" : "Ajoutez une action et choisissez sa date pour la retrouver au calendrier."}</p>}</div></section>)}</div>}
      {marketing && tab === "CALENDAR" && <div className="grid items-start gap-5 xl:grid-cols-[1fr_270px]"><section className="min-w-0 overflow-hidden rounded-2xl border border-gray-200 bg-white"><div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 p-5"><h2 className="text-lg font-semibold capitalize">{month.toLocaleDateString("fr-FR", { month: "long", year: "numeric" })}</h2><div className="flex gap-2"><button aria-label="Mois précédent" className={button} onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}><ChevronLeft className="h-4 w-4" /></button><button className={button} onClick={() => setMonth(new Date(new Date().getFullYear(), new Date().getMonth(), 1))}>Aujourd’hui</button><button aria-label="Mois suivant" className={button} onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}><ChevronRight className="h-4 w-4" /></button></div></div><div className="grid grid-cols-7 bg-gray-50">{["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"].map((d) => <div key={d} className="py-3 text-center text-xs font-semibold text-gray-400">{d}</div>)}</div><div className="hidden grid-cols-7 md:grid">{cells.map((d) => <div key={d.date} className={`min-h-28 border-r border-t border-gray-100 p-2 ${d.current ? "" : "bg-gray-50/70"}`}><button aria-label={`Ajouter le ${dateLabel(d.date)}`} onClick={() => create("TASK", d.date)} className={`mb-2 flex h-7 w-7 items-center justify-center rounded-full text-xs ${d.date === today ? "bg-brand-600 font-semibold text-white" : d.current ? "text-gray-600 hover:bg-brand-50" : "text-gray-300"}`}>{d.day}</button><div className="space-y-1">{filtered.filter((i) => i.scheduledDate === d.date).map((i) => <button key={i.id} onClick={() => edit(i)} className={`block w-full break-words rounded-md px-2 py-1.5 text-left text-[11px] leading-4 ${i.completed ? "bg-gray-100 text-gray-400 line-through" : i.kind === "POST" ? "bg-brand-50 text-brand-700" : "bg-amber-50 text-amber-800"}`}>{i.title}</button>)}</div></div>)}</div><div className="space-y-4 p-4 md:hidden">{cells.filter((d) => d.current && filtered.some((i) => i.scheduledDate === d.date)).map((d) => <div key={d.date}><h3 className="mb-2 text-xs font-semibold text-gray-500">{dateLabel(d.date)}</h3><div className="space-y-2">{filtered.filter((i) => i.scheduledDate === d.date).map(card)}</div></div>)}{!filtered.some((i) => i.scheduledDate?.startsWith(localDate(month).slice(0, 7))) && <p className="py-6 text-sm text-gray-400">Ce mois est encore libre.</p>}<button className={primary} onClick={() => create("TASK", today)}><Plus className="h-4 w-4" />Ajouter une action</button></div></section><section className="rounded-2xl border border-gray-200 bg-white p-4"><h2 className="mb-1 font-semibold">Sans date, sans pression.</h2><p className="mb-4 text-xs leading-5 text-gray-400">Vos idées et actions à planifier.</p><div className="space-y-3">{filtered.filter((i) => !i.scheduledDate && !i.completed).map(card)}{!filtered.some((i) => !i.scheduledDate && !i.completed) && <p className="text-sm text-gray-400">Ajoutez une idée pour plus tard.</p>}</div></section></div>}
    </>}
    {modal && draft && <Modal wide title={editingId ? "Modifier" : "Nouvel élément"} onClose={() => { if (mayLeave()) { setModal(false); setDirty(false); setDraft(null); } }}>{editor}{error && <p role="alert" className="mt-3 text-sm text-red-600">{error}</p>}{editingId && <div className="mt-4 flex gap-3 border-t pt-4"><button className={button} disabled={saving} onClick={async () => { if (!mayLeave()) return; const item = items.find((i) => i.id === editingId); if (item) { await update(item, { completed: !item.completed }); } }}>{draft.completed ? "Réouvrir" : draft.kind === "POST" ? "Marquer comme publié" : "Marquer comme terminé"}</button></div>}</Modal>}
  </div>;
}
