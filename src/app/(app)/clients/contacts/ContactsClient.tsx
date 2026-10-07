"use client";

import { useEffect, useRef, useState } from "react";
import { Mail, MessageCircle, MapPin, Search, Plus, Pencil, X, Users, ChevronRight, CalendarClock } from "lucide-react";


const emptyForm = {
  name: "", firstName: "", lastName: "", role: "", companyId: "", companyName: "", phone: "", email: "", notes: "",
  addressLine1: "", addressLine2: "", postalCode: "", city: "", country: "", preferredChannel: "", tags: "",
  lastContactDate: "", nextContactDate: "", birthdayDay: "", birthdayMonth: "",
  consentEmail: false, consentWhatsapp: false, consentPost: false,
};
type Form = typeof emptyForm;
type Contact = Omit<Form, "birthdayDay" | "birthdayMonth"> & { id: string; birthdayDay: number | null; birthdayMonth: number | null; company: { id: string; name: string } | null };
type TextKey = { [K in keyof Form]: Form[K] extends string ? K : never }[keyof Form];
const channelNames: Record<string, string> = { EMAIL: "Mail", WHATSAPP: "WhatsApp", POST: "Courrier" };
const displayDate = (date: string) => date.split("-").reverse().join("/");
function postalAddress(c: Contact) { return [c.name, c.companyName || c.company?.name, c.addressLine1, c.addressLine2, [c.postalCode, c.city].filter(Boolean).join(" "), c.country].filter(Boolean).join("\n"); }
function whatsappNumber(phone: string) { const digits = phone.replace(/[^0-9]/g, ""); return digits.startsWith("00") ? digits.slice(2) : /^0[1-9]\d{8}$/.test(digits) ? `33${digits.slice(1)}` : digits; }

export function ContactsClient() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [companies, setCompanies] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("NAME");
  const [filter, setFilter] = useState("ALL");
  const [selected, setSelected] = useState<Contact | null>(null);
  const [editing, setEditing] = useState<Contact | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [initialForm, setInitialForm] = useState<Form>(emptyForm);
  const [form, setForm] = useState<Form>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [message, setMessage] = useState("");
  const today = new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Paris" }).format(new Date());

  async function load() {
    setLoading(true); setError("");
    try {
      const [res, companyRes] = await Promise.all([fetch("/api/crm/contacts"), fetch("/api/crm/companies")]);
      if (!res.ok || !companyRes.ok) throw new Error("Impossible de charger les clients.");
      setContacts(await res.json()); setCompanies(await companyRes.json());
    } catch { setError("Impossible de charger les clients. Réessayez."); }
    finally { setLoading(false); }
  }
  useEffect(() => { void load(); }, []);
  function openForm(c: Contact | null) {
    setEditing(c); setSelected(null); setFormError(""); setMessage("");
    const next = { ...emptyForm };
    if (c) for (const key of Object.keys(emptyForm) as (keyof Form)[]) {
      if (key === "consentEmail" || key === "consentWhatsapp" || key === "consentPost") next[key] = c[key] ?? false;
      else next[key] = c[key] != null ? String(c[key]) : "";
    }
    if (c?.company) next.companyId = c.company.id;
    setForm(next); setInitialForm(next); setShowForm(true);
  }
  function closeForm() {
    if (saving) return;
    if (JSON.stringify(form) !== JSON.stringify(initialForm) && !confirm("Fermer cette fiche sans enregistrer les modifications ?")) return;
    setShowForm(false);
  }
  async function submit(e: React.FormEvent) {
    e.preventDefault(); setSaving(true); setFormError("");
    try {
      const name = [form.firstName.trim(), form.lastName.trim()].filter(Boolean).join(" ") || form.name.trim();
      const payload = { ...Object.fromEntries(Object.entries(form).map(([k, v]) => [k, typeof v === "string" ? v.trim() || null : v])), name, birthdayDay: form.birthdayDay ? Number(form.birthdayDay) : null, birthdayMonth: form.birthdayMonth ? Number(form.birthdayMonth) : null };
      const res = await fetch(editing ? `/api/crm/contacts/${editing.id}` : "/api/crm/contacts", { method: editing ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error === "Données invalides" ? "Vérifiez le nom, l’email, les dates et l’anniversaire." : data.error || "Enregistrement impossible.");
      setShowForm(false); await load(); setSelected(data); setMessage("Fiche enregistrée.");
    } catch (e) { setFormError(e instanceof Error ? e.message : "Connexion impossible."); }
    finally { setSaving(false); }
  }
  function field(key: TextKey, label: string, type = "text", required = false) {
    return <label key={key} className="block min-w-0 text-sm font-medium text-gray-700">{label}<input aria-label={label} type={type} required={required} value={form[key]} onChange={(e) => setForm({ ...form, [key]: e.target.value })} className="mt-1 w-full bg-white" {...(type === "number" ? { min: 1, max: key === "birthdayMonth" ? 12 : 31 } : {})} /></label>;
  }
  const filtered = contacts.filter((c) => [c.name, c.companyName, c.company?.name, c.email, c.phone, c.tags, c.city].filter(Boolean).join(" ").toLocaleLowerCase("fr").includes(search.toLocaleLowerCase("fr")) && (filter === "ALL" || (filter === "DUE" ? !!c.nextContactDate && c.nextContactDate <= today : c.preferredChannel === filter)));
  const sorted = [...filtered].sort((a, b) => sort === "FOLLOWUP" ? (a.nextContactDate || "9999").localeCompare(b.nextContactDate || "9999") : sort === "COMPANY" ? (a.companyName || a.company?.name || "").localeCompare(b.companyName || b.company?.name || "", "fr") : a.name.localeCompare(b.name, "fr"));
  const due = contacts.filter((c) => c.nextContactDate && c.nextContactDate <= today).length;
  const actionClass = "inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm hover:border-emerald-300 hover:bg-emerald-50";

  return <div className="space-y-5 text-slate-800">
    <header className="flex flex-wrap items-center justify-between gap-4"><div><div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-xl border border-emerald-100 bg-emerald-50 text-emerald-800"><Users className="h-5 w-5" /></div><h1 className="text-2xl font-semibold tracking-tight">Clients</h1><span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-500">{contacts.length}</span></div><p className="mt-2 text-sm text-slate-500">Votre carnet de contacts et vos prochaines relances.</p></div><button onClick={() => openForm(null)} className="flex items-center gap-2 rounded-lg bg-emerald-800 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-900"><Plus className="h-4 w-4" />Nouveau client</button></header>
    <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex gap-6 border-b border-slate-200 px-5" aria-label="Vue des clients">{[["ALL", "Tous les clients", contacts.length], ["DUE", "À recontacter", due]].map(([key, label, count]) => <button key={key} onClick={() => setFilter(String(key))} aria-pressed={filter === key || key === "ALL" && filter !== "DUE"} className={`flex items-center gap-2 border-b-2 py-4 text-sm font-medium ${filter === key || key === "ALL" && filter !== "DUE" ? "border-emerald-700 text-emerald-800" : "border-transparent text-slate-500 hover:text-slate-800"}`}>{label}<span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-xs text-slate-500">{count}</span></button>)}</div>
      <div className="flex flex-wrap items-center gap-3 p-4"><label className="flex min-w-[180px] flex-1 items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3"><Search className="h-4 w-4 shrink-0 text-slate-400" /><input aria-label="Rechercher un client" placeholder="Rechercher un client, un email, une étiquette…" value={search} onChange={(e) => setSearch(e.target.value)} className="w-full min-w-0 border-0 bg-transparent text-sm focus:ring-0" />{search && <button aria-label="Effacer la recherche" onClick={() => setSearch("")}><X className="h-4 w-4 text-slate-400" /></button>}</label><select aria-label="Filtrer par canal" value={filter === "DUE" ? "ALL" : filter} onChange={(e) => setFilter(e.target.value)} className="max-w-full border-slate-200 text-sm"><option value="ALL">Tous les canaux</option>{Object.entries(channelNames).map(([key, name]) => <option key={key} value={key}>{name}</option>)}</select><select aria-label="Trier les clients" value={sort} onChange={(e) => setSort(e.target.value)} className="max-w-full border-slate-200 text-sm"><option value="NAME">Nom : A → Z</option><option value="COMPANY">Entreprise : A → Z</option><option value="FOLLOWUP">Prochaine relance</option></select></div>
      {error && <div role="alert" className="mx-4 mb-4 rounded-lg bg-red-50 p-4 text-sm text-red-800">{error} <button onClick={() => void load()} className="underline">Réessayer</button></div>}
      <div className="hidden grid-cols-[minmax(0,1.4fr)_minmax(0,1.4fr)_minmax(0,1fr)_110px_24px] gap-3 border-y border-slate-200 bg-slate-50 px-5 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500 lg:grid"><span>Client / entreprise</span><span>Coordonnées</span><span>Étiquettes</span><span>Relance</span><span /></div>
      {loading ? <p className="p-8 text-sm text-slate-500">Chargement des clients…</p> : !error && <div>{sorted.map((c) => <button key={c.id} onClick={() => { setSelected(c); setMessage(""); }} className={`grid w-full grid-cols-[minmax(0,1fr)_24px] items-center gap-3 border-b border-slate-100 px-5 py-4 text-left last:border-0 hover:bg-emerald-50/40 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1.4fr)_minmax(0,1fr)_110px_24px] ${selected?.id === c.id ? "bg-emerald-50/60" : ""}`}>
        <div className="flex min-w-0 items-center gap-3"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-xs font-semibold text-slate-600">{c.name.split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase()}</span><div className="min-w-0"><p className="truncate text-sm font-semibold">{c.name}</p><p className="mt-0.5 truncate text-xs text-slate-500">{c.companyName || c.company?.name || c.city || "Particulier"}</p></div></div>
        <div className="col-start-1 min-w-0 pl-12 lg:col-auto lg:pl-0"><p className="truncate text-sm text-slate-600">{c.email || c.phone || "—"}</p><p className="mt-0.5 text-xs text-slate-400">{channelNames[c.preferredChannel] || (c.email && c.phone ? c.phone : "Canal à préciser")}</p></div>
        <div className="col-start-1 flex min-w-0 flex-wrap gap-1 pl-12 lg:col-auto lg:pl-0">{c.tags ? c.tags.split(",").filter((tag) => tag.trim()).slice(0, 2).map((tag, i) => <span key={i} className="max-w-[130px] truncate rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] text-slate-600">{tag.trim()}</span>) : <span className="hidden text-xs text-slate-400 lg:block">—</span>}</div>
        <div className="col-start-1 pl-12 lg:col-auto lg:pl-0">{c.nextContactDate ? <span className={`inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs ${c.nextContactDate <= today ? "bg-amber-50 text-amber-800" : "text-slate-500"}`}><CalendarClock className="h-3 w-3" />{displayDate(c.nextContactDate)}</span> : <span className="hidden text-xs text-slate-400 lg:block">—</span>}</div><ChevronRight className="col-start-2 row-start-1 h-4 w-4 text-slate-400 lg:col-auto lg:row-auto" />
      </button>)}{!sorted.length && <div className="p-12 text-center"><div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-slate-50 text-slate-400"><Users className="h-6 w-6" /></div><h2 className="text-sm font-semibold">{contacts.length ? "Aucun client trouvé" : "Ajoutez votre premier client"}</h2><p className="mt-2 text-sm text-slate-500">{contacts.length ? "Modifiez la recherche ou les filtres." : "Les coordonnées, les préférences et les relances seront réunies ici."}</p>{!contacts.length && <button onClick={() => openForm(null)} className="mt-5 text-sm font-semibold text-emerald-800">Créer une fiche →</button>}</div>}</div>}
      {!loading && !error && <footer className="border-t border-slate-100 bg-slate-50/50 px-5 py-3 text-xs text-slate-500">{sorted.length} client{sorted.length > 1 ? "s" : ""} affiché{sorted.length > 1 ? "s" : ""} sur {contacts.length}</footer>}
    </section>
    {selected && <ClientPanel title={selected.name} onClose={() => setSelected(null)}><div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3"><p className="text-sm text-gray-500">{[selected.companyName || selected.company?.name, selected.role].filter(Boolean).join(" · ") || "Fiche client"}</p><button onClick={() => openForm(selected)} className={actionClass}><Pencil className="h-4 w-4" />Modifier</button></div>
      <div className="flex flex-wrap gap-2">{selected.email && <a href={`mailto:${selected.email}`} className={actionClass}><Mail className="h-4 w-4" />Mail</a>}{selected.phone && whatsappNumber(selected.phone).length >= 8 && <a href={`https://wa.me/${whatsappNumber(selected.phone)}`} target="_blank" rel="noopener noreferrer" className={actionClass}><MessageCircle className="h-4 w-4" />WhatsApp</a>}{selected.addressLine1 && <button onClick={async () => { try { await navigator.clipboard.writeText(postalAddress(selected)); setMessage("Adresse copiée."); } catch { setMessage("Copie impossible. Sélectionnez l’adresse ci-dessous."); } }} className={actionClass}><MapPin className="h-4 w-4" />Copier l’adresse</button>}</div>
      {message && <p role="status" className="text-sm text-emerald-700">{message}</p>}
      <div className="grid gap-4"><div className="rounded-lg border border-slate-200 bg-slate-50/60 p-4"><h3 className="text-xs font-semibold uppercase text-gray-500">Coordonnées</h3><p className="mt-2 break-words text-sm">{selected.email || "Email non renseigné"}</p><p className="mt-1 text-sm">{selected.phone || "Téléphone non renseigné"}</p>{selected.addressLine1 && <p className="mt-3 whitespace-pre-line break-words text-sm">{postalAddress(selected)}</p>}</div><div className="rounded-lg border border-slate-200 bg-slate-50/60 p-4"><h3 className="text-xs font-semibold uppercase text-gray-500">Garder le contact</h3><p className="mt-2 text-sm">Canal préféré : {channelNames[selected.preferredChannel] || "Non renseigné"}</p><p className="mt-2 text-sm">Dernier contact : {selected.lastContactDate ? displayDate(selected.lastContactDate) : "Non renseigné"}</p><p className="mt-2 text-sm">Prochaine relance : {selected.nextContactDate ? displayDate(selected.nextContactDate) : "Non renseignée"}</p>{selected.birthdayDay && selected.birthdayMonth && <p className="mt-2 text-sm">Anniversaire : {String(selected.birthdayDay).padStart(2, "0")}/{String(selected.birthdayMonth).padStart(2, "0")}</p>}</div></div>
      <div><h3 className="text-sm font-semibold">Communications acceptées</h3><div className="mt-2 flex flex-wrap gap-2">{([["Mail", selected.consentEmail], ["WhatsApp", selected.consentWhatsapp], ["Courrier", selected.consentPost]] as const).map(([name, ok]) => <span key={name} className={`rounded-full px-3 py-1 text-xs ${ok ? "bg-emerald-50 text-emerald-800" : "bg-gray-100 text-gray-500"}`}>{name} : {ok ? "accord renseigné" : "accord non renseigné"}</span>)}</div></div>
      {selected.tags && <p className="break-words text-sm text-emerald-800">Étiquettes : {selected.tags}</p>}<div><h3 className="text-sm font-semibold">Notes & petites attentions</h3><p className="mt-2 whitespace-pre-wrap break-words text-sm text-gray-600">{selected.notes || "Aucune note pour l’instant."}</p></div>
    </div></ClientPanel>}
    {showForm && <ClientPanel title={editing ? "Modifier la fiche client" : "Nouveau client"} onClose={closeForm}><form onSubmit={submit} className="space-y-5"><fieldset disabled={saving} className="space-y-5">
      <section className="space-y-3"><h3 className="font-semibold">L’essentiel</h3><div className="grid gap-3 sm:grid-cols-2">{field("firstName", "Prénom")}{field("lastName", "Nom")}</div>{!form.firstName && !form.lastName && field("name", editing ? "Nom complet existant" : "Nom complet ou nom de l’entreprise", "text", true)}<div className="grid gap-3 sm:grid-cols-2">{field("companyName", "Entreprise (facultatif)")}{field("role", "Fonction (facultatif)")}{field("email", "Email", "email")}{field("phone", "Téléphone / WhatsApp")}</div><p className="text-xs text-gray-500">Pour un numéro étranger, indiquez l’indicatif international (+32, +41…).</p>{companies.length > 0 && <label className="block text-sm">Entreprise déjà enregistrée<select aria-label="Entreprise déjà enregistrée" value={form.companyId} onChange={(e) => setForm({ ...form, companyId: e.target.value })} className="mt-1 w-full"><option value="">Aucune</option>{companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>}</section>
      <details className="rounded-lg border border-slate-200 p-4" open={!!form.addressLine1}><summary className="cursor-pointer text-sm font-semibold">Adresse postale</summary><div className="mt-4 space-y-3">{field("addressLine1", "Adresse")}{field("addressLine2", "Complément d’adresse")}<div className="grid gap-3 sm:grid-cols-2">{field("postalCode", "Code postal")}{field("city", "Ville")}</div>{field("country", "Pays")}</div></details>
      <details className="rounded-lg border border-slate-200 p-4" open={!!form.nextContactDate || !!form.preferredChannel}><summary className="cursor-pointer text-sm font-semibold">Préférences & suivi</summary><div className="mt-4 space-y-4"><label className="block text-sm">Canal préféré<select aria-label="Canal préféré" value={form.preferredChannel} onChange={(e) => setForm({ ...form, preferredChannel: e.target.value })} className="mt-1 w-full"><option value="">Non renseigné</option>{Object.entries(channelNames).map(([key, name]) => <option key={key} value={key}>{name}</option>)}</select></label>{field("tags", "Étiquettes (séparées par une virgule)")}<div className="grid gap-3 sm:grid-cols-2">{field("lastContactDate", "Dernier contact", "date")}{field("nextContactDate", "Prochaine relance", "date")}{field("birthdayDay", "Anniversaire : jour", "number")}{field("birthdayMonth", "Anniversaire : mois", "number")}</div><p className="text-xs text-gray-500">L’anniversaire est facultatif, sans année de naissance.</p><div className="space-y-2"><p className="text-sm font-medium">Accord pour recevoir vos communications</p>{([["consentEmail", "Par mail"], ["consentWhatsapp", "Par WhatsApp"], ["consentPost", "Par courrier"]] as const).map(([key, label]) => <label key={key} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form[key]} onChange={(e) => setForm({ ...form, [key]: e.target.checked })} />{label}</label>)}</div></div></details>
      <label className="block text-sm font-medium">Notes & petites attentions<textarea aria-label="Notes & petites attentions" rows={4} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Préférences, rencontre, idée de carte à envoyer…" className="mt-1 w-full rounded-xl border border-gray-300 p-3 text-sm" /></label>
    </fieldset>{formError && <p role="alert" className="text-sm text-emerald-800">{formError}</p>}<div className="sticky bottom-0 -mx-6 -mb-6 flex justify-end gap-3 border-t border-slate-200 bg-white px-6 py-4"><button type="button" disabled={saving} onClick={closeForm} className="rounded-lg border border-slate-200 px-4 py-2">Annuler</button><button disabled={saving} className="rounded-lg bg-emerald-800 px-4 py-2 font-semibold text-white disabled:opacity-50">{saving ? "Enregistrement…" : "Enregistrer"}</button></div></form></ClientPanel>}
  </div>;
}

function ClientPanel({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
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
  return <div className="fixed inset-0 z-50 flex justify-end"><button aria-label="Fermer la fiche client" onClick={onClose} className="absolute inset-0 bg-slate-900/20 backdrop-blur-[1px]" tabIndex={-1} /><div ref={panel} role="dialog" aria-modal="true" aria-label={title} tabIndex={-1} className="relative flex h-full w-full max-w-xl flex-col bg-white shadow-2xl outline-none"><header className="flex shrink-0 items-center justify-between gap-4 border-b border-slate-200 px-6 py-5"><div className="min-w-0"><p className="mb-1 text-[10px] font-semibold uppercase tracking-widest text-slate-400">Clients / Fiche de contact</p><h2 className="truncate text-lg font-semibold text-slate-900">{title}</h2></div><button aria-label="Fermer" onClick={onClose} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"><X className="h-5 w-5" /></button></header><div className="min-h-0 flex-1 overflow-y-auto p-6">{children}</div></div></div>;
}
