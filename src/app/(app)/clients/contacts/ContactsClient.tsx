"use client";

import { useEffect, useState } from "react";
import { Mail, MessageCircle, MapPin, Search, Plus, Pencil, X, Users, ChevronRight, CalendarClock, SlidersHorizontal } from "lucide-react";


import { ClientPanel } from "./ClientPanel";
import { StructuresBrowser, type Company } from "./StructuresBrowser";
import { readableContactNotes, preserveImportedNotes } from "@/lib/companyProfile";
import { BUILTIN_FIELDS, type ClientField } from "@/lib/clientFields";

const emptyForm = {
  name: "", firstName: "", lastName: "", role: "", companyId: "", companyName: "", phone: "", email: "", notes: "",
  addressLine1: "", addressLine2: "", postalCode: "", city: "", country: "", preferredChannel: "", tags: "",
  lastContactDate: "", nextContactDate: "", birthdayDay: "", birthdayMonth: "",
  consentEmail: false, consentWhatsapp: false, consentPost: false,
};
type Form = typeof emptyForm;
export type Contact = { customValues: Record<string, string> } & Omit<Form, "birthdayDay" | "birthdayMonth"> & { id: string; birthdayDay: number | null; birthdayMonth: number | null; company: { id: string; name: string } | null };
type TextKey = { [K in keyof Form]: Form[K] extends string ? K : never }[keyof Form];
const channelNames: Record<string, string> = { EMAIL: "Mail", WHATSAPP: "WhatsApp", POST: "Courrier" };
const displayDate = (date: string) => date.split("-").reverse().join("/");
function postalAddress(c: Contact) { return [c.name, c.companyName || c.company?.name, c.addressLine1, c.addressLine2, [c.postalCode, c.city].filter(Boolean).join(" "), c.country].filter(Boolean).join("\n"); }
function whatsappNumber(phone: string) { const digits = phone.replace(/[^0-9]/g, ""); return digits.startsWith("00") ? digits.slice(2) : /^0[1-9]\d{8}$/.test(digits) ? `33${digits.slice(1)}` : digits; }

export function ContactsClient() {
  const [fields, setFields] = useState<ClientField[]>(BUILTIN_FIELDS.map((f) => ({ ...f, type: "TEXT", enabled: true, custom: false })));
  const [showFields, setShowFields] = useState(false);
  const [customValues, setCustomValues] = useState<Record<string, string>>({});
  const [initialCustom, setInitialCustom] = useState<Record<string, string>>({});
  const visible = (id: string) => fields.find((f) => f.id === id)?.enabled ?? true;
  const customFields = fields.filter((f) => f.custom && f.enabled);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<Contact | null>(null);
  const [editing, setEditing] = useState<Contact | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [initialForm, setInitialForm] = useState<Form>(emptyForm);
  const [form, setForm] = useState<Form>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [message, setMessage] = useState("");

  async function load() {
    setLoading(true); setError("");
    try {
      const [res, companyRes, fieldsRes] = await Promise.all([fetch("/api/crm/contacts"), fetch("/api/crm/companies"), fetch("/api/crm/fields")]);
      if (!res.ok || !companyRes.ok || !fieldsRes.ok) throw new Error("Impossible de charger les clients.");
      setContacts(await res.json()); setCompanies(await companyRes.json()); setFields(await fieldsRes.json());
    } catch { setError("Impossible de charger les clients. Réessayez."); }
    finally { setLoading(false); }
  }
  useEffect(() => { void load(); }, []);
  function openForm(c: Contact | null, companyId?: string) {
    setCustomValues(c?.customValues ?? {}); setInitialCustom(c?.customValues ?? {});
    setEditing(c); setSelected(null); setFormError(""); setMessage("");
    const next = { ...emptyForm };
    if (c) for (const key of Object.keys(emptyForm) as (keyof Form)[]) {
      if (key === "consentEmail" || key === "consentWhatsapp" || key === "consentPost") next[key] = c[key] ?? false;
      else next[key] = c[key] != null ? String(c[key]) : "";
    }
    if (c?.company) next.companyId = c.company.id;
    if (c) next.notes = readableContactNotes(c.notes);
    if (companyId) { next.companyId = companyId; next.companyName = companies.find((item) => item.id === companyId)?.name || ""; }
    setForm(next); setInitialForm(next); setShowForm(true);
  }
  function closeForm() {
    if (saving) return;
    if ((JSON.stringify(form) !== JSON.stringify(initialForm) || JSON.stringify(customValues) !== JSON.stringify(initialCustom)) && !confirm("Fermer cette fiche sans enregistrer les modifications ?")) return;
    setShowForm(false);
  }
  async function submit(e: React.FormEvent) {
    e.preventDefault(); setSaving(true); setFormError("");
    try {
      const name = [form.firstName.trim(), form.lastName.trim()].filter(Boolean).join(" ") || form.name.trim();
      const payload = { customValues, ...Object.fromEntries(Object.entries(form).map(([k, v]) => [k, typeof v === "string" ? v.trim() || null : v])), name, notes: preserveImportedNotes(form.notes, editing?.notes), birthdayDay: form.birthdayDay ? Number(form.birthdayDay) : null, birthdayMonth: form.birthdayMonth ? Number(form.birthdayMonth) : null };
      const res = await fetch(editing ? `/api/crm/contacts/${editing.id}` : "/api/crm/contacts", { method: editing ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error === "Données invalides" ? "Vérifiez le nom, l’email, les dates et l’anniversaire." : data.error || "Enregistrement impossible.");
      setShowForm(false); await load(); setSelected(data); setMessage("Fiche enregistrée.");
    } catch (e) { setFormError(e instanceof Error ? e.message : "Connexion impossible."); }
    finally { setSaving(false); }
  }
  function field(key: TextKey, label: string, type = "text", required = false) {
    const group = key === "companyName" ? "company" : ["addressLine1", "addressLine2", "postalCode", "city", "country"].includes(key) ? "address" : key.startsWith("birthday") ? "birthday" : key;
    if (!visible(group)) return null;
    return <label key={key} className="block min-w-0 text-sm font-medium text-gray-700">{label}<input aria-label={label} type={type} required={required} value={form[key]} onChange={(e) => setForm({ ...form, [key]: e.target.value })} className="mt-1 w-full bg-white" {...(type === "number" ? { min: 1, max: key === "birthdayMonth" ? 12 : 31 } : {})} /></label>;
  }
  const actionClass = "inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm hover:border-brand-300 hover:bg-brand-50";

  return <div className="space-y-5 text-slate-800">
    <StructuresBrowser contacts={contacts} companies={companies} fields={fields} loading={loading} error={error} onReload={load} onFields={() => setShowFields(true)} onContact={openForm} />
    {selected && <ClientPanel title={selected.name} onClose={() => setSelected(null)}><div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3"><p className="text-sm text-gray-500">{[visible("company") ? selected.companyName || selected.company?.name : null, visible("role") ? selected.role : null].filter(Boolean).join(" · ") || "Fiche client"}</p><button onClick={() => openForm(selected)} className={actionClass}><Pencil className="h-4 w-4" />Modifier</button></div>
      <div className="flex flex-wrap gap-2">{visible("email") && selected.email && <a href={`mailto:${selected.email}`} className={actionClass}><Mail className="h-4 w-4" />Mail</a>}{visible("phone") && selected.phone && whatsappNumber(selected.phone).length >= 8 && <a href={`https://wa.me/${whatsappNumber(selected.phone)}`} target="_blank" rel="noopener noreferrer" className={actionClass}><MessageCircle className="h-4 w-4" />WhatsApp</a>}{visible("address") && selected.addressLine1 && <button onClick={async () => { try { await navigator.clipboard.writeText(postalAddress(selected)); setMessage("Adresse copiée."); } catch { setMessage("Copie impossible. Sélectionnez l’adresse ci-dessous."); } }} className={actionClass}><MapPin className="h-4 w-4" />Copier l’adresse</button>}</div>
      {message && <p role="status" className="text-sm text-brand-700">{message}</p>}
      {(visible("email") || visible("phone") || visible("address")) && <section className="rounded-lg border border-slate-200 bg-slate-50/60 p-4"><h3 className="text-xs font-semibold uppercase text-gray-500">Coordonnées</h3>{visible("email") && <p className="mt-2 break-words text-sm">{selected.email || "Email non renseigné"}</p>}{visible("phone") && <p className="mt-1 text-sm">{selected.phone || "Téléphone non renseigné"}</p>}{visible("address") && selected.addressLine1 && <p className="mt-3 whitespace-pre-line break-words text-sm">{postalAddress(selected)}</p>}</section>}
      {["preferredChannel", "lastContactDate", "nextContactDate", "birthday"].some(visible) && <section className="rounded-lg border border-slate-200 bg-slate-50/60 p-4"><h3 className="text-xs font-semibold uppercase text-gray-500">Garder le contact</h3>{visible("preferredChannel") && <p className="mt-2 text-sm">Canal préféré : {channelNames[selected.preferredChannel] || "Non renseigné"}</p>}{visible("lastContactDate") && <p className="mt-2 text-sm">Dernier contact : {selected.lastContactDate ? displayDate(selected.lastContactDate) : "Non renseigné"}</p>}{visible("nextContactDate") && <p className="mt-2 text-sm">Prochaine relance : {selected.nextContactDate ? displayDate(selected.nextContactDate) : "Non renseignée"}</p>}{visible("birthday") && selected.birthdayDay && selected.birthdayMonth && <p className="mt-2 text-sm">Anniversaire : {String(selected.birthdayDay).padStart(2, "0")}/{String(selected.birthdayMonth).padStart(2, "0")}</p>}</section>}
      {visible("consents") && <div><h3 className="text-sm font-semibold">Communications acceptées</h3><div className="mt-2 flex flex-wrap gap-2">{([["Mail", selected.consentEmail], ["WhatsApp", selected.consentWhatsapp], ["Courrier", selected.consentPost]] as const).map(([name, ok]) => <span key={name} className={`rounded-full px-3 py-1 text-xs ${ok ? "bg-brand-50 text-brand-800" : "bg-gray-100 text-gray-500"}`}>{name} : {ok ? "accord renseigné" : "accord non renseigné"}</span>)}</div></div>}
      {visible("tags") && selected.tags && <p className="break-words text-sm text-brand-800">Étiquettes : {selected.tags}</p>}{visible("notes") && <div><h3 className="text-sm font-semibold">Notes & petites attentions</h3><p className="mt-2 whitespace-pre-wrap break-words text-sm text-gray-600">{readableContactNotes(selected.notes) || "Aucune note pour l’instant."}</p></div>}
      {customFields.length > 0 && <details className="space-y-3 border-t border-slate-200 pt-4"><summary className="cursor-pointer text-sm font-semibold">Sources & informations détaillées</summary><dl className="grid gap-4 sm:grid-cols-2">{customFields.map((f) => <div key={f.id}><dt className="text-xs text-slate-500">{f.label}</dt><dd className="mt-1 break-words text-sm">{f.type === "CHECKBOX" ? selected.customValues?.[f.id] === "true" ? "Oui" : "Non" : f.type === "DATE" && selected.customValues?.[f.id] ? displayDate(selected.customValues[f.id]) : selected.customValues?.[f.id] || "—"}</dd></div>)}</dl></details>}
    </div></ClientPanel>}
    {showForm && <ClientPanel title={editing ? "Modifier la fiche client" : "Nouveau client"} onClose={closeForm}><form onSubmit={submit} className="space-y-5"><fieldset disabled={saving} className="space-y-5">
      <section className="space-y-3"><h3 className="font-semibold">L’essentiel</h3><div className="grid gap-3 sm:grid-cols-2">{field("firstName", "Prénom")}{field("lastName", "Nom")}</div>{!form.firstName && !form.lastName && field("name", editing ? "Nom complet existant" : "Nom complet ou nom de l’entreprise", "text", true)}<div className="grid gap-3 sm:grid-cols-2">{field("companyName", "Entreprise (facultatif)")}{field("role", "Fonction (facultatif)")}{field("email", "Email", "email")}{field("phone", "Téléphone / WhatsApp")}</div><p className="text-xs text-gray-500">Pour un numéro étranger, indiquez l’indicatif international (+32, +41…).</p>{visible("company") && companies.length > 0 && <label className="block text-sm">Entreprise déjà enregistrée<select aria-label="Entreprise déjà enregistrée" value={form.companyId} onChange={(e) => setForm({ ...form, companyId: e.target.value })} className="mt-1 w-full"><option value="">Aucune</option>{companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>}</section>
      {visible("address") && <details className="rounded-lg border border-slate-200 p-4" open={!!form.addressLine1}><summary className="cursor-pointer text-sm font-semibold">Adresse postale</summary><div className="mt-4 space-y-3">{field("addressLine1", "Adresse")}{field("addressLine2", "Complément d’adresse")}<div className="grid gap-3 sm:grid-cols-2">{field("postalCode", "Code postal")}{field("city", "Ville")}</div>{field("country", "Pays")}</div></details>}
      <details className="rounded-lg border border-slate-200 p-4" open={!!form.nextContactDate || !!form.preferredChannel}><summary className="cursor-pointer text-sm font-semibold">Préférences & suivi</summary><div className="mt-4 space-y-4">{visible("preferredChannel") && <label className="block text-sm">Canal préféré<select aria-label="Canal préféré" value={form.preferredChannel} onChange={(e) => setForm({ ...form, preferredChannel: e.target.value })} className="mt-1 w-full"><option value="">Non renseigné</option>{Object.entries(channelNames).map(([key, name]) => <option key={key} value={key}>{name}</option>)}</select></label>}{field("tags", "Étiquettes (séparées par une virgule)")}<div className="grid gap-3 sm:grid-cols-2">{field("lastContactDate", "Dernier contact", "date")}{field("nextContactDate", "Prochaine relance", "date")}{field("birthdayDay", "Anniversaire : jour", "number")}{field("birthdayMonth", "Anniversaire : mois", "number")}</div><p className="text-xs text-gray-500">L’anniversaire est facultatif, sans année de naissance.</p>{visible("consents") && <div className="space-y-2"><p className="text-sm font-medium">Accord pour recevoir vos communications</p>{([["consentEmail", "Par mail"], ["consentWhatsapp", "Par WhatsApp"], ["consentPost", "Par courrier"]] as const).map(([key, label]) => <label key={key} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form[key]} onChange={(e) => setForm({ ...form, [key]: e.target.checked })} />{label}</label>)}</div>}</div></details>
      {visible("notes") && <label className="block text-sm font-medium">Notes & petites attentions<textarea aria-label="Notes & petites attentions" rows={4} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Préférences, rencontre, idée de carte à envoyer…" className="mt-1 w-full rounded-xl border border-gray-300 p-3 text-sm" /></label>}
      {customFields.length > 0 && <details className="space-y-3 rounded-lg border border-slate-200 p-4"><summary className="cursor-pointer text-sm font-semibold">Champs personnalisés & détails</summary><div className="grid gap-3 sm:grid-cols-2">{customFields.map((f) => f.type === "CHECKBOX" ? <label key={f.id} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={customValues[f.id] === "true"} onChange={(e) => setCustomValues({ ...customValues, [f.id]: String(e.target.checked) })} />{f.label}</label> : <label key={f.id} className="block text-sm font-medium">{f.label}<input aria-label={f.label} type={f.type === "DATE" ? "date" : f.type === "NUMBER" ? "number" : "text"} step={f.type === "NUMBER" ? "any" : undefined} value={customValues[f.id] ?? ""} onChange={(e) => setCustomValues({ ...customValues, [f.id]: e.target.value })} className="mt-1 w-full" /></label>)}</div></details>}
    </fieldset>{formError && <p role="alert" className="text-sm text-brand-800">{formError}</p>}<div className="sticky bottom-0 -mx-6 -mb-6 flex justify-end gap-3 border-t border-slate-200 bg-white px-6 py-4"><button type="button" disabled={saving} onClick={closeForm} className="rounded-lg border border-slate-200 px-4 py-2">Annuler</button><button disabled={saving} className="rounded-lg bg-brand-800 px-4 py-2 font-semibold text-white disabled:opacity-50">{saving ? "Enregistrement…" : "Enregistrer"}</button></div></form></ClientPanel>}
    {showFields && <FieldsEditor fields={fields} onClose={() => setShowFields(false)} onSaved={(next) => { setFields(next); setShowFields(false); }} />}
  </div>;
}


function FieldsEditor({ fields, onClose, onSaved }: { fields: ClientField[]; onClose: () => void; onSaved: (fields: ClientField[]) => void }) {
  const [draft, setDraft] = useState(fields.map((f) => ({ ...f })));
  const [label, setLabel] = useState("");
  const [type, setType] = useState<ClientField["type"]>("TEXT");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  function close() {
    if (saving) return;
    if (JSON.stringify(draft) !== JSON.stringify(fields) && !confirm("Fermer sans enregistrer les champs ?")) return;
    onClose();
  }
  async function save(e: React.FormEvent) {
    e.preventDefault(); setSaving(true); setError("");
    try {
      const res = await fetch("/api/crm/fields", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(draft) });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Enregistrement impossible.");
      onSaved(result);
    } catch (e) { setError(e instanceof Error ? e.message : "Connexion impossible."); }
    finally { setSaving(false); }
  }
  return <ClientPanel title="Personnaliser les champs" onClose={close}><form onSubmit={save} className="space-y-5"><p className="text-sm text-slate-500">Choisissez les informations utiles pour votre restaurant. Les champs masqués conservent leurs données. Le nom du client reste obligatoire.</p><fieldset disabled={saving} className="space-y-5"><div className="grid gap-3 sm:grid-cols-2">{draft.map((f, index) => <div key={f.id} className="flex items-center gap-3 rounded-lg border border-slate-200 p-3"><input aria-label={`Afficher ${f.label}`} type="checkbox" checked={f.enabled} onChange={(e) => setDraft(draft.map((item, i) => i === index ? { ...item, enabled: e.target.checked } : item))} />{f.custom ? <div className="min-w-0 flex-1"><input aria-label={`Nom du champ ${f.label}`} required maxLength={80} value={f.label} onChange={(e) => setDraft(draft.map((item, i) => i === index ? { ...item, label: e.target.value } : item))} className="w-full text-sm" /><p className="mt-1 text-xs text-slate-400">{{ TEXT: "Texte", DATE: "Date", NUMBER: "Nombre", CHECKBOX: "Case à cocher" }[f.type]}</p></div> : <span className="text-sm">{f.label}</span>}</div>)}</div><section className="space-y-3 rounded-lg bg-slate-50 p-4"><h3 className="text-sm font-semibold">Ajouter un champ</h3><div className="flex flex-wrap gap-2"><input aria-label="Nom du nouveau champ" maxLength={80} placeholder="Ex. Plat préféré, date de rencontre…" value={label} onChange={(e) => setLabel(e.target.value)} className="min-w-[180px] flex-1 text-sm" /><select aria-label="Type du nouveau champ" value={type} onChange={(e) => setType(e.target.value as ClientField["type"])} className="text-sm"><option value="TEXT">Texte</option><option value="DATE">Date</option><option value="NUMBER">Nombre</option><option value="CHECKBOX">Case à cocher</option></select><button type="button" disabled={!label.trim() || draft.length >= 50} onClick={() => { setDraft([...draft, { id: `custom_${crypto.randomUUID()}`, label: label.trim(), type, enabled: true, custom: true }]); setLabel(""); }} className="rounded-lg bg-brand-800 px-3 py-2 text-sm font-semibold text-white disabled:opacity-40">Ajouter</button></div></section></fieldset>{error && <p role="alert" className="text-sm text-red-700">{error}</p>}<div className="flex justify-end gap-3 border-t border-slate-200 pt-4"><button type="button" disabled={saving} onClick={close} className="rounded-lg border border-slate-200 px-4 py-2">Annuler</button><button disabled={saving} className="rounded-lg bg-brand-800 px-4 py-2 font-semibold text-white disabled:opacity-50">{saving ? "Enregistrement…" : "Enregistrer"}</button></div></form></ClientPanel>;
}
