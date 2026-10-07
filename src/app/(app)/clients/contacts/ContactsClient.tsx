"use client";

import { useEffect, useState } from "react";
import { Mail, MessageCircle, MapPin, Search, Plus, Pencil, ArrowUpRight } from "lucide-react";
import { Modal } from "@/components/Modal";

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
  const due = contacts.filter((c) => c.nextContactDate && c.nextContactDate <= today).length;
  const actionClass = "inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm font-medium text-brand-700 hover:bg-brand-50";

  return <div className="space-y-5">
    <header className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-600">Les liens qui comptent</p><h1 className="mt-2 text-3xl font-semibold tracking-tight">Vos clients<span className="text-brand-600">.</span></h1><p className="mt-2 text-sm text-gray-500">Une fiche, quelques attentions et le bon moyen de garder le contact.</p></div><button onClick={() => openForm(null)} className="flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-3 text-sm font-semibold text-white"><Plus className="h-4 w-4" />Ajouter un client</button></header>
    <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-gray-200 bg-white p-3"><label className="flex min-w-0 flex-1 items-center gap-2"><Search className="h-4 w-4 shrink-0 text-gray-400" /><input aria-label="Rechercher un client" placeholder="Nom, entreprise, email, étiquette…" value={search} onChange={(e) => setSearch(e.target.value)} className="w-full min-w-0 border-0 focus:ring-0" /></label><select aria-label="Filtrer les clients" value={filter} onChange={(e) => setFilter(e.target.value)} className="max-w-full"><option value="ALL">Tous les clients ({contacts.length})</option><option value="DUE">À recontacter ({due})</option>{Object.entries(channelNames).map(([key, name]) => <option key={key} value={key}>Préfèrent : {name}</option>)}</select></div>
    {error && <div role="alert" className="rounded-xl bg-brand-50 p-4 text-sm text-brand-800">{error} <button onClick={() => void load()} className="underline">Réessayer</button></div>}
    {loading ? <p className="text-sm text-gray-500">Chargement…</p> : !error && <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">{filtered.map((c) => <button key={c.id} onClick={() => { setSelected(c); setMessage(""); }} className="flex w-full flex-wrap items-center justify-between gap-3 border-b border-gray-100 p-5 text-left last:border-0 hover:bg-brand-50/40"><div className="min-w-0"><h2 className="break-words font-semibold">{c.name}</h2><p className="mt-1 break-words text-sm text-gray-500">{[c.companyName || c.company?.name, c.email || c.phone || c.city].filter(Boolean).join(" · ") || "Ouvrir la fiche"}</p>{c.tags && <p className="mt-2 break-words text-xs text-brand-700">{c.tags}</p>}</div><div className="flex shrink-0 items-center gap-3 text-xs text-gray-500">{c.nextContactDate && <span className={c.nextContactDate <= today ? "rounded-full bg-amber-50 px-2 py-1 text-amber-800" : ""}>Relance {displayDate(c.nextContactDate)}</span>}{c.preferredChannel && <span>{channelNames[c.preferredChannel]}</span>}<ArrowUpRight className="h-4 w-4" /></div></button>)}{!filtered.length && <div className="p-10 text-center"><h2 className="font-semibold">{contacts.length ? "Aucun résultat" : "Votre carnet de clients commence ici"}</h2><p className="mt-2 text-sm text-gray-500">{contacts.length ? "Essayez un autre nom ou filtre." : "Ajoutez un habitué, un voisin ou un contact d’entreprise."}</p></div>}</div>}
    {selected && <Modal wide title={selected.name} onClose={() => setSelected(null)}><div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3"><p className="text-sm text-gray-500">{[selected.companyName || selected.company?.name, selected.role].filter(Boolean).join(" · ") || "Fiche client"}</p><button onClick={() => openForm(selected)} className={actionClass}><Pencil className="h-4 w-4" />Modifier</button></div>
      <div className="flex flex-wrap gap-2">{selected.email && <a href={`mailto:${selected.email}`} className={actionClass}><Mail className="h-4 w-4" />Mail</a>}{selected.phone && whatsappNumber(selected.phone).length >= 8 && <a href={`https://wa.me/${whatsappNumber(selected.phone)}`} target="_blank" rel="noopener noreferrer" className={actionClass}><MessageCircle className="h-4 w-4" />WhatsApp</a>}{selected.addressLine1 && <button onClick={async () => { try { await navigator.clipboard.writeText(postalAddress(selected)); setMessage("Adresse copiée."); } catch { setMessage("Copie impossible. Sélectionnez l’adresse ci-dessous."); } }} className={actionClass}><MapPin className="h-4 w-4" />Copier l’adresse</button>}</div>
      {message && <p role="status" className="text-sm text-emerald-700">{message}</p>}
      <div className="grid gap-4 sm:grid-cols-2"><div className="rounded-xl bg-gray-50 p-4"><h3 className="text-xs font-semibold uppercase text-gray-500">Coordonnées</h3><p className="mt-2 break-words text-sm">{selected.email || "Email non renseigné"}</p><p className="mt-1 text-sm">{selected.phone || "Téléphone non renseigné"}</p>{selected.addressLine1 && <p className="mt-3 whitespace-pre-line break-words text-sm">{postalAddress(selected)}</p>}</div><div className="rounded-xl bg-gray-50 p-4"><h3 className="text-xs font-semibold uppercase text-gray-500">Garder le contact</h3><p className="mt-2 text-sm">Canal préféré : {channelNames[selected.preferredChannel] || "Non renseigné"}</p><p className="mt-2 text-sm">Dernier contact : {selected.lastContactDate ? displayDate(selected.lastContactDate) : "Non renseigné"}</p><p className="mt-2 text-sm">Prochaine relance : {selected.nextContactDate ? displayDate(selected.nextContactDate) : "Non renseignée"}</p>{selected.birthdayDay && selected.birthdayMonth && <p className="mt-2 text-sm">Anniversaire : {String(selected.birthdayDay).padStart(2, "0")}/{String(selected.birthdayMonth).padStart(2, "0")}</p>}</div></div>
      <div><h3 className="text-sm font-semibold">Communications acceptées</h3><div className="mt-2 flex flex-wrap gap-2">{([["Mail", selected.consentEmail], ["WhatsApp", selected.consentWhatsapp], ["Courrier", selected.consentPost]] as const).map(([name, ok]) => <span key={name} className={`rounded-full px-3 py-1 text-xs ${ok ? "bg-emerald-50 text-emerald-800" : "bg-gray-100 text-gray-500"}`}>{name} : {ok ? "accord renseigné" : "accord non renseigné"}</span>)}</div></div>
      {selected.tags && <p className="break-words text-sm text-brand-700">Étiquettes : {selected.tags}</p>}<div><h3 className="text-sm font-semibold">Notes & petites attentions</h3><p className="mt-2 whitespace-pre-wrap break-words text-sm text-gray-600">{selected.notes || "Aucune note pour l’instant."}</p></div>
    </div></Modal>}
    {showForm && <Modal wide title={editing ? "Modifier la fiche client" : "Nouveau client"} onClose={closeForm}><form onSubmit={submit} className="space-y-5"><fieldset disabled={saving} className="space-y-5">
      <section className="space-y-3"><h3 className="font-semibold">L’essentiel</h3><div className="grid gap-3 sm:grid-cols-2">{field("firstName", "Prénom")}{field("lastName", "Nom")}</div>{!form.firstName && !form.lastName && field("name", editing ? "Nom complet existant" : "Nom complet ou nom de l’entreprise", "text", true)}<div className="grid gap-3 sm:grid-cols-2">{field("companyName", "Entreprise (facultatif)")}{field("role", "Fonction (facultatif)")}{field("email", "Email", "email")}{field("phone", "Téléphone / WhatsApp")}</div><p className="text-xs text-gray-500">Pour un numéro étranger, indiquez l’indicatif international (+32, +41…).</p>{companies.length > 0 && <label className="block text-sm">Entreprise déjà enregistrée<select aria-label="Entreprise déjà enregistrée" value={form.companyId} onChange={(e) => setForm({ ...form, companyId: e.target.value })} className="mt-1 w-full"><option value="">Aucune</option>{companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>}</section>
      <details className="rounded-xl border border-gray-200 p-4" open={!!form.addressLine1}><summary className="cursor-pointer text-sm font-semibold">Adresse postale</summary><div className="mt-4 space-y-3">{field("addressLine1", "Adresse")}{field("addressLine2", "Complément d’adresse")}<div className="grid gap-3 sm:grid-cols-2">{field("postalCode", "Code postal")}{field("city", "Ville")}</div>{field("country", "Pays")}</div></details>
      <details className="rounded-xl border border-gray-200 p-4" open={!!form.nextContactDate || !!form.preferredChannel}><summary className="cursor-pointer text-sm font-semibold">Préférences & suivi</summary><div className="mt-4 space-y-4"><label className="block text-sm">Canal préféré<select aria-label="Canal préféré" value={form.preferredChannel} onChange={(e) => setForm({ ...form, preferredChannel: e.target.value })} className="mt-1 w-full"><option value="">Non renseigné</option>{Object.entries(channelNames).map(([key, name]) => <option key={key} value={key}>{name}</option>)}</select></label>{field("tags", "Étiquettes (séparées par une virgule)")}<div className="grid gap-3 sm:grid-cols-2">{field("lastContactDate", "Dernier contact", "date")}{field("nextContactDate", "Prochaine relance", "date")}{field("birthdayDay", "Anniversaire : jour", "number")}{field("birthdayMonth", "Anniversaire : mois", "number")}</div><p className="text-xs text-gray-500">L’anniversaire est facultatif, sans année de naissance.</p><div className="space-y-2"><p className="text-sm font-medium">Accord pour recevoir vos communications</p>{([["consentEmail", "Par mail"], ["consentWhatsapp", "Par WhatsApp"], ["consentPost", "Par courrier"]] as const).map(([key, label]) => <label key={key} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form[key]} onChange={(e) => setForm({ ...form, [key]: e.target.checked })} />{label}</label>)}</div></div></details>
      <label className="block text-sm font-medium">Notes & petites attentions<textarea aria-label="Notes & petites attentions" rows={4} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Préférences, rencontre, idée de carte à envoyer…" className="mt-1 w-full rounded-xl border border-gray-300 p-3 text-sm" /></label>
    </fieldset>{formError && <p role="alert" className="text-sm text-brand-700">{formError}</p>}<div className="flex justify-end gap-3 border-t border-gray-100 pt-4"><button type="button" disabled={saving} onClick={closeForm} className="rounded-xl border border-gray-200 px-4 py-2">Annuler</button><button disabled={saving} className="rounded-xl bg-brand-600 px-4 py-2 font-semibold text-white disabled:opacity-50">{saving ? "Enregistrement…" : "Enregistrer"}</button></div></form></Modal>}
  </div>;
}
