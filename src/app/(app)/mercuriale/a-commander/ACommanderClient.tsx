"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Check, Copy, Mail, Search, ShoppingBag } from "lucide-react";

type Item = { id: string; designation: string; reference: string | null; packaging: string | null; orderQuantity: number; unitPriceHT: number | null; casePriceHT: number | null; orderedAt: string | null; receivedAt: string | null };
type Supplier = { id: string; name: string; email: string | null; clientCode: string | null; orderSchedule: string | null; minimumOrder: string | null; items: Item[] };
const button = "inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-40";

export function ACommanderClient() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [quantities, setQuantities] = useState<Record<string, string>>({});
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [supplierId, setSupplierId] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [delivery, setDelivery] = useState("");
  const [comment, setComment] = useState("");
  const [restaurantName, setRestaurantName] = useState("Mon restaurant");
  const [mailSupplierId, setMailSupplierId] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/suppliers");
        if (!res.ok) throw new Error("Impossible de charger les articles.");
        const data: Supplier[] = await res.json(); setSuppliers(data);
        const pending = data.flatMap((s) => s.items.filter((i) => i.orderQuantity > 0 && !i.orderedAt));
        setSelected(new Set(pending.map((i) => i.id)));
        setQuantities(Object.fromEntries(data.flatMap((s) => s.items.map((i) => [i.id, String(i.orderQuantity > 0 && !i.orderedAt ? i.orderQuantity : 1)]))));
        const me = await fetch("/api/auth/me"); if (me.ok) { const u = await me.json(); setRestaurantName(u.restaurants?.find((r: { id: string }) => r.id === u.activeRestaurantId)?.name ?? "Mon restaurant"); }
      } catch (e) { setError(e instanceof Error ? e.message : "Connexion indisponible."); }
      finally { setLoading(false); }
    })();
  }, []);
  const rows = useMemo(() => suppliers.flatMap((supplier) => supplier.items.map((item) => ({ supplier, item }))), [suppliers]);
  const chosen = rows.filter(({ item }) => selected.has(item.id));
  const groups = suppliers.map((s) => ({ supplier: s, rows: chosen.filter((r) => r.supplier.id === s.id) })).filter((g) => g.rows.length);
  const mailGroup = groups.find((g) => g.supplier.id === mailSupplierId) ?? groups[0];
  const visible = rows.filter(({ supplier, item }) => (!supplierId || supplier.id === supplierId) && `${item.designation} ${item.reference ?? ""} ${supplier.name}`.toLowerCase().includes(search.toLowerCase()));
  const clearIds = rows.filter(({ item }) => item.orderQuantity > 0 && !item.orderedAt && !selected.has(item.id)).map(({ item }) => item.id);
  const valid = (chosen.length > 0 || clearIds.length > 0) && chosen.every(({ item }) => Number.isFinite(Number(quantities[item.id])) && Number(quantities[item.id]) > 0);
  const mailValid = !!mailGroup && mailGroup.rows.every(({ item }) => Number.isFinite(Number(quantities[item.id])) && Number(quantities[item.id]) > 0);
  const body = mailGroup ? ["Bonjour,", "", `Voici notre commande pour ${restaurantName}${mailGroup.supplier.clientCode ? ` (code client : ${mailGroup.supplier.clientCode})` : ""}.`, delivery ? `Livraison souhaitée : ${new Date(`${delivery}T12:00:00`).toLocaleDateString("fr-FR")}.` : "", "", ...mailGroup.rows.map(({ item }) => `• ${quantities[item.id] || "?"} × ${item.designation}${item.packaging ? ` — ${item.packaging}` : ""}${item.reference && !/^https?:\/\//i.test(item.reference) ? ` (réf. ${item.reference})` : ""}`), "", comment, "Merci de nous confirmer la disponibilité et la livraison.", "", "Bonne journée,", restaurantName].filter((v, i, a) => v !== "" || a[i - 1] !== "").join("\n") : "";
  const subject = `Commande ${restaurantName}${delivery ? ` — ${delivery}` : ""}`;
  function toggle(id: string) { setSelected((prev) => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next; }); setNotice(""); }
  async function copy() {
    try { await navigator.clipboard.writeText(`Objet : ${subject}\n\n${body}`); setNotice("Texte copié. Collez-le dans votre mail."); }
    catch { setError("Le navigateur n’a pas autorisé la copie. Sélectionnez le texte du mail ci-dessous et copiez-le."); }
  }
  async function save(action: "PREPARE" | "ORDERED", onlySupplier = false) {
    const list = onlySupplier ? mailGroup?.rows ?? [] : chosen;
    if (!list.length && (action !== "PREPARE" || !clearIds.length)) return;
    if (action === "ORDERED" && !confirm(`La commande de ${mailGroup?.supplier.name} a bien été envoyée ? Les ${list.length} articles passeront en attente de réception.`)) return;
    setBusy(true); setError("");
    try {
      const res = await fetch("/api/supplier-orders", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, clearIds: action === "PREPARE" ? clearIds : [], items: list.map(({ item }) => ({ id: item.id, quantity: Number(quantities[item.id]) })) }) });
      if (!res.ok) { const d = await res.json().catch(() => ({})); throw new Error(d.error ?? "Enregistrement impossible."); }
      const changed = new Map(list.map(({ item }) => [item.id, Number(quantities[item.id])]));
      setSuppliers((prev) => prev.map((supplier) => ({ ...supplier, items: supplier.items.map((item) => changed.has(item.id) ? { ...item, orderQuantity: changed.get(item.id)!, orderedAt: action === "ORDERED" ? new Date().toISOString() : null, receivedAt: null } : clearIds.includes(item.id) && action === "PREPARE" ? { ...item, orderQuantity: 0 } : item) })));
      if (action === "ORDERED") { const ids = new Set(list.map(({ item }) => item.id)); setSelected((prev) => new Set([...prev].filter((id) => !ids.has(id)))); }
      setNotice(action === "ORDERED" ? "Commande enregistrée. Retrouvez ces articles dans le suivi des réceptions." : "Sélection enregistrée dans les articles à commander.");
    } catch (e) { setError(e instanceof Error ? e.message : "Connexion indisponible."); }
    finally { setBusy(false); }
  }
  return <div>
    <Link href="/mercuriale" className="text-sm text-brand-600">← Retour au catalogue</Link>
    <div className="mb-7 mt-4 flex flex-wrap items-start justify-between gap-4"><div><p className="mb-2 text-xs font-semibold uppercase tracking-widest text-brand-600">Du catalogue au mail</p><h1 className="text-3xl font-semibold tracking-tight">Préparer une commande</h1><p className="mt-2 text-sm text-gray-500">Choisissez vos articles, ajustez les quantités, puis copiez le mail de chaque fournisseur.</p></div><button onClick={() => save("PREPARE")} disabled={!valid || busy} className="rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-40">{busy ? "Enregistrement…" : "Enregistrer la sélection"}</button></div>
    {error && <p role="alert" className="mb-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}{notice && <p role="status" className="mb-4 rounded-xl bg-green-50 p-3 text-sm text-green-800">{notice}</p>}
    <div className="mb-5 grid gap-3 sm:grid-cols-3">{[{ label: "Articles sélectionnés", value: chosen.length }, { label: "Fournisseurs", value: groups.length }, { label: "Étapes", value: "Choisir · Copier · Envoyer" }].map((v) => <div key={v.label} className="rounded-2xl border border-gray-200 bg-white p-4"><p className="text-xs text-gray-400">{v.label}</p><p className="mt-2 text-lg font-semibold text-brand-800">{v.value}</p></div>)}</div>
    <div className="grid items-start gap-5 xl:grid-cols-[1fr_400px]"><section className="min-w-0 rounded-2xl border border-gray-200 bg-white p-4 sm:p-5"><div className="mb-4 flex flex-wrap gap-3"><label className="flex min-w-0 flex-1 items-center gap-2"><Search className="h-4 w-4 text-gray-400" /><input aria-label="Rechercher un article" placeholder="Article, référence…" value={search} onChange={(e) => setSearch(e.target.value)} className="w-full" /></label><select aria-label="Fournisseur" value={supplierId} onChange={(e) => setSupplierId(e.target.value)}><option value="">Tous les fournisseurs</option>{suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></div><div className="mb-4 flex flex-wrap gap-3 text-xs"><button className="text-brand-600" onClick={() => setSelected((prev) => new Set([...prev, ...visible.filter(({ item }) => !item.orderedAt || !!item.receivedAt).map(({ item }) => item.id)]))}>Sélectionner les articles affichés</button><button className="text-gray-400" onClick={() => setSelected(new Set())}>Vider la sélection</button></div>
      {loading ? <p className="p-8 text-sm text-gray-400">Chargement…</p> : <div className="space-y-2">{visible.map(({ supplier, item }) => <div key={item.id} className={`flex items-start gap-3 rounded-xl border p-3 ${selected.has(item.id) ? "border-brand-200 bg-brand-50/40" : "border-gray-100"}`}><input aria-label={`Sélectionner ${item.designation}`} type="checkbox" checked={selected.has(item.id)} disabled={!!item.orderedAt && !item.receivedAt} onChange={() => toggle(item.id)} className="mt-1 h-5 w-5 shrink-0" /><div className="min-w-0 flex-1"><button disabled={!!item.orderedAt && !item.receivedAt} onClick={() => toggle(item.id)} className="text-left text-sm font-semibold">{item.designation}</button><p className="mt-1 text-xs leading-5 text-gray-400">{supplier.name} · {item.packaging || "Conditionnement non renseigné"}</p>{item.orderedAt && !item.receivedAt && <p className="mt-1 text-xs text-orange-600">Une commande est déjà en attente de réception</p>}</div><label className="text-[10px] text-gray-400">Quantité<input aria-label={`Quantité ${item.designation}`} type="number" min="0.01" step="any" value={quantities[item.id] ?? "1"} disabled={!selected.has(item.id)} onChange={(e) => setQuantities((q) => ({ ...q, [item.id]: e.target.value }))} className="mt-1 block w-20 !text-sm" /></label></div>)}{visible.length === 0 && <p className="p-8 text-center text-sm text-gray-400">Aucun article trouvé.</p>}</div>}
    </section><aside className="min-w-0 rounded-2xl border border-gray-200 bg-white p-5 xl:sticky xl:top-6"><div className="mb-4 flex items-center gap-2"><Mail className="h-5 w-5 text-brand-600" /><h2 className="font-semibold">Votre mail de commande</h2></div>{!mailGroup ? <div className="py-12 text-center"><ShoppingBag className="mx-auto mb-3 h-8 w-8 text-brand-200" /><p className="text-sm text-gray-400">Sélectionnez des articles pour préparer le mail.</p></div> : <><select aria-label="Fournisseur du mail" className="mb-4 w-full" value={mailGroup.supplier.id} onChange={(e) => setMailSupplierId(e.target.value)}>{groups.map((g) => <option key={g.supplier.id} value={g.supplier.id}>{g.supplier.name} · {g.rows.length} articles</option>)}</select><div className="mb-4 space-y-1 text-xs leading-5 text-gray-500">{mailGroup.supplier.email && <p>À : {mailGroup.supplier.email}</p>}{mailGroup.supplier.orderSchedule && <p>{mailGroup.supplier.orderSchedule}</p>}{mailGroup.supplier.minimumOrder && <p>Minimum / franco : {mailGroup.supplier.minimumOrder}</p>}</div><label className="mb-4 block text-xs font-medium text-gray-500">Livraison souhaitée<input type="date" value={delivery} onChange={(e) => setDelivery(e.target.value)} className="mt-2 w-full" /></label><label className="mb-4 block text-xs font-medium text-gray-500">Message complémentaire<textarea value={comment} onChange={(e) => setComment(e.target.value)} rows={2} className="mt-2 w-full" placeholder="Instructions de livraison…" /></label><p className="mb-2 break-words text-xs font-semibold">Objet : {subject}</p><textarea aria-label="Texte du mail à copier" value={body} readOnly rows={12} className="w-full !bg-gray-50 !text-xs !leading-6" /><div className="mt-4 flex flex-wrap gap-2"><button className={button} disabled={!mailValid} onClick={copy}><Copy className="h-4 w-4" />Copier le mail</button>{mailGroup.supplier.email && mailValid && <a className={button} href={`mailto:${encodeURIComponent(mailGroup.supplier.email)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`}><Mail className="h-4 w-4" />Ouvrir un mail</a>}</div><div className="mt-5 border-t border-gray-100 pt-4"><button className={`${button} w-full`} disabled={!mailValid || busy} onClick={() => save("ORDERED", true)}><Check className="h-4 w-4" />Commande envoyée</button><p className="mt-2 text-xs leading-5 text-gray-400">La copie prépare le texte. Marquez la commande comme envoyée après l’avoir passée.</p></div></>}</aside></div>
  </div>;
}
