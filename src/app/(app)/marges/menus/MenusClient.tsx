"use client";

import { useEffect, useMemo, useState } from "react";
import { Pencil, Trash2, X } from "lucide-react";
import { Modal } from "@/components/Modal";
import { computeCostOfGoods, computeMargin, TVA_SUR_PLACE, TVA_A_EMPORTER } from "@/lib/margins";

type ProductForMenu = {
  id: string;
  name: string;
  category: string;
  ingredients: { quantity: number; quantityUnit: string; channel: string; ingredient: { unit: string; price: number } }[];
};

type MarginBlock = {
  priceTTC: number;
  priceHT: number;
  cost: number;
  marginEuros: number;
  marginPercent: number;
};

type MenuItemRow = { quantity: number; product: { id: string; name: string } };

type Menu = {
  id: string;
  name: string;
  priceOnSite: number;
  priceTakeaway: number;
  items: MenuItemRow[];
  margins: { onSite: MarginBlock; takeaway: MarginBlock };
};

type FormItem = { productId: string; quantity: string };

function emptyItem(products: ProductForMenu[]): FormItem {
  return { productId: products[0]?.id ?? "", quantity: "1" };
}

function moveById<T extends { id: string }>(list: T[], fromId: string, toId: string): T[] {
  const fromIndex = list.findIndex((x) => x.id === fromId);
  const toIndex = list.findIndex((x) => x.id === toId);
  if (fromIndex === -1 || toIndex === -1 || fromIndex === toIndex) return list;
  const copy = [...list];
  const [moved] = copy.splice(fromIndex, 1);
  copy.splice(toIndex, 0, moved);
  return copy;
}

function marginColorClass(percent: number): string {
  if (percent >= 60) return "text-green-600";
  if (percent >= 40) return "text-orange-500";
  return "text-brand-600";
}

type SortKey =
  | "custom"
  | "name"
  | "costOnSite"
  | "costTakeaway"
  | "priceOnSite"
  | "onSiteMarginEuros"
  | "onSitePercent"
  | "priceTakeaway"
  | "takeawayMarginEuros"
  | "takeawayPercent";

export function MenusClient() {
  const [menus, setMenus] = useState<Menu[]>([]);
  const [products, setProducts] = useState<ProductForMenu[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("custom");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [draggingId, setDraggingId] = useState<string | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Menu | null>(null);
  const [name, setName] = useState("");
  const [priceOnSite, setPriceOnSite] = useState("");
  const [priceTakeaway, setPriceTakeaway] = useState("");
  const [items, setItems] = useState<FormItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function loadAll() {
    setLoading(true);
    const [mRes, pRes] = await Promise.all([fetch("/api/menus"), fetch("/api/products")]);
    if (mRes.ok) setMenus(await mRes.json());
    if (pRes.ok) setProducts(await pRes.json());
    setLoading(false);
  }

  useEffect(() => {
    loadAll();
  }, []);

  function openCreate() {
    setEditing(null);
    setName("");
    setPriceOnSite("");
    setPriceTakeaway("");
    setItems(products.length ? [emptyItem(products)] : []);
    setError(null);
    setShowForm(true);
  }

  function openEdit(m: Menu) {
    setEditing(m);
    setName(m.name);
    setPriceOnSite(String(m.priceOnSite));
    setPriceTakeaway(String(m.priceTakeaway));
    setItems(m.items.map((i) => ({ productId: i.product.id, quantity: String(i.quantity) })));
    setError(null);
    setShowForm(true);
  }

  function updateItem(index: number, patch: Partial<FormItem>) {
    setItems((prev) => prev.map((it, i) => (i === index ? { ...it, ...patch } : it)));
  }

  function addItem() {
    setItems((prev) => [...prev, emptyItem(products)]);
  }

  function removeItem(index: number) {
    setItems((prev) => prev.filter((_, i) => i !== index));
  }

  const livePreview = useMemo(() => {
    try {
      const validItems = items
        .filter((i) => i.productId && parseInt(i.quantity, 10) > 0)
        .map((i) => {
          const product = products.find((p) => p.id === i.productId)!;
          return { quantity: parseInt(i.quantity, 10), product };
        });
      if (validItems.length === 0) return null;
      const costOnSite = validItems.reduce(
        (sum, i) => sum + i.quantity * computeCostOfGoods(i.product.ingredients, "SUR_PLACE"),
        0
      );
      const costTakeaway = validItems.reduce(
        (sum, i) => sum + i.quantity * computeCostOfGoods(i.product.ingredients, "EMPORTER"),
        0
      );
      const onSite = computeMargin(parseFloat(priceOnSite) || 0, TVA_SUR_PLACE, costOnSite);
      const takeaway = computeMargin(parseFloat(priceTakeaway) || 0, TVA_A_EMPORTER, costTakeaway);
      return { onSite, takeaway };
    } catch {
      return null;
    }
  }, [items, products, priceOnSite, priceTakeaway]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const payload = {
      name,
      priceOnSite: parseFloat(priceOnSite),
      priceTakeaway: parseFloat(priceTakeaway),
      items: items
        .filter((i) => i.productId && i.quantity)
        .map((i) => ({ productId: i.productId, quantity: parseInt(i.quantity, 10) })),
    };

    const url = editing ? `/api/menus/${editing.id}` : "/api/menus";
    const method = editing ? "PUT" : "POST";

    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Erreur lors de l'enregistrement");
        return;
      }
      setShowForm(false);
      await loadAll();
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(m: Menu) {
    if (!confirm(`Supprimer le menu "${m.name}" ?`)) return;
    const res = await fetch(`/api/menus/${m.id}`, { method: "DELETE" });
    if (res.ok) await loadAll();
  }

  function toggleSort(key: Exclude<SortKey, "custom">) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  const rows = useMemo(() => {
    const filtered = menus.filter((m) => m.name.toLowerCase().includes(search.toLowerCase()));
    if (sortKey === "custom") return filtered;
    const sorted = [...filtered].sort((a, b) => {
      let cmp = 0;
      if (sortKey === "name") cmp = a.name.localeCompare(b.name);
      if (sortKey === "costOnSite") cmp = a.margins.onSite.cost - b.margins.onSite.cost;
      if (sortKey === "costTakeaway") cmp = a.margins.takeaway.cost - b.margins.takeaway.cost;
      if (sortKey === "priceOnSite") cmp = a.priceOnSite - b.priceOnSite;
      if (sortKey === "onSiteMarginEuros") cmp = a.margins.onSite.marginEuros - b.margins.onSite.marginEuros;
      if (sortKey === "onSitePercent") cmp = a.margins.onSite.marginPercent - b.margins.onSite.marginPercent;
      if (sortKey === "priceTakeaway") cmp = a.priceTakeaway - b.priceTakeaway;
      if (sortKey === "takeawayMarginEuros") cmp = a.margins.takeaway.marginEuros - b.margins.takeaway.marginEuros;
      if (sortKey === "takeawayPercent") cmp = a.margins.takeaway.marginPercent - b.margins.takeaway.marginPercent;
      return sortDir === "asc" ? cmp : -cmp;
    });
    return sorted;
  }, [menus, search, sortKey, sortDir]);

  const sortArrow = (key: SortKey) => (sortKey === key ? (sortDir === "asc" ? " ↑" : " ↓") : "");

  const dragEnabled = sortKey === "custom" && search === "";

  async function handleDrop(targetId: string) {
    if (!draggingId || draggingId === targetId) {
      setDraggingId(null);
      return;
    }
    const reordered = moveById(menus, draggingId, targetId);
    setMenus(reordered);
    setDraggingId(null);
    await fetch("/api/menus/reorder", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: reordered.map((m) => m.id) }),
    });
  }

  return (
    <div>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-xl font-bold text-gray-900">Menus</h1>
        <div className="flex flex-wrap gap-2">
          <input
            placeholder="Rechercher un menu..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full sm:w-56"
          />
          {sortKey !== "custom" && (
            <button
              onClick={() => setSortKey("custom")}
              className="whitespace-nowrap text-sm text-gray-500 hover:text-gray-700"
            >
              ↺ Ordre personnalisé
            </button>
          )}
          <button
            onClick={openCreate}
            className="whitespace-nowrap rounded-md bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
            disabled={products.length === 0}
          >
            + Ajouter
          </button>
        </div>
      </div>

      {!dragEnabled && (
        <p className="mb-2 text-xs text-gray-400">
          {search
            ? "Le glisser-déposer est désactivé pendant une recherche."
            : "Clique sur « ↺ Ordre personnalisé » pour réactiver le glisser-déposer."}
        </p>
      )}

      {loading ? (
        <p className="text-sm text-gray-500">Chargement...</p>
      ) : products.length === 0 ? (
        <p className="text-sm text-gray-500">Créez d&apos;abord des produits avant de composer un menu.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
          <table>
            <thead>
              <tr>
                <th className="cursor-pointer select-none" onClick={() => toggleSort("name")}>
                  Menu{sortArrow("name")}
                </th>
                <th>Composition</th>
                <th className="cursor-pointer select-none" onClick={() => toggleSort("costOnSite")}>
                  Coût sur place{sortArrow("costOnSite")}
                </th>
                <th className="cursor-pointer select-none" onClick={() => toggleSort("costTakeaway")}>
                  Coût à emporter{sortArrow("costTakeaway")}
                </th>
                <th className="cursor-pointer select-none" onClick={() => toggleSort("priceOnSite")}>
                  Prix sur place (TTC){sortArrow("priceOnSite")}
                </th>
                <th className="cursor-pointer select-none" onClick={() => toggleSort("onSiteMarginEuros")}>
                  Marge sur place (€){sortArrow("onSiteMarginEuros")}
                </th>
                <th className="cursor-pointer select-none" onClick={() => toggleSort("onSitePercent")}>
                  % sur place{sortArrow("onSitePercent")}
                </th>
                <th className="cursor-pointer select-none" onClick={() => toggleSort("priceTakeaway")}>
                  Prix à emporter (TTC){sortArrow("priceTakeaway")}
                </th>
                <th className="cursor-pointer select-none" onClick={() => toggleSort("takeawayMarginEuros")}>
                  Marge à emporter (€){sortArrow("takeawayMarginEuros")}
                </th>
                <th className="cursor-pointer select-none" onClick={() => toggleSort("takeawayPercent")}>
                  % à emporter{sortArrow("takeawayPercent")}
                </th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((m) => (
                <tr
                  key={m.id}
                  draggable={dragEnabled}
                  onDragStart={() => dragEnabled && setDraggingId(m.id)}
                  onDragOver={(e) => dragEnabled && e.preventDefault()}
                  onDrop={() => dragEnabled && handleDrop(m.id)}
                  onDragEnd={() => setDraggingId(null)}
                  className={`${dragEnabled ? "cursor-grab active:cursor-grabbing" : ""} ${
                    draggingId === m.id ? "opacity-40" : ""
                  }`}
                >
                  <td className="font-medium">{m.name}</td>
                  <td className="text-gray-500">
                    {m.items.map((i) => `${i.quantity}× ${i.product.name}`).join(", ")}
                  </td>
                  <td>{m.margins.onSite.cost.toFixed(2)} €</td>
                  <td>{m.margins.takeaway.cost.toFixed(2)} €</td>
                  <td>{m.priceOnSite.toFixed(2)} €</td>
                  <td>{m.margins.onSite.marginEuros.toFixed(2)} €</td>
                  <td className={`font-semibold ${marginColorClass(m.margins.onSite.marginPercent)}`}>
                    {m.margins.onSite.marginPercent.toFixed(0)}%
                  </td>
                  <td>{m.priceTakeaway.toFixed(2)} €</td>
                  <td>{m.margins.takeaway.marginEuros.toFixed(2)} €</td>
                  <td className={`font-semibold ${marginColorClass(m.margins.takeaway.marginPercent)}`}>
                    {m.margins.takeaway.marginPercent.toFixed(0)}%
                  </td>
                  <td>
                    <div className="flex justify-end gap-3 whitespace-nowrap text-sm">
                      <button onClick={() => openEdit(m)} title="Modifier" aria-label="Modifier" className="text-brand-600 hover:text-brand-800">
                        <Pencil className="h-4 w-4" aria-hidden />
                      </button>
                      <button onClick={() => handleDelete(m)} title="Supprimer" aria-label="Supprimer" className="text-brand-600 hover:text-brand-800">
                        <Trash2 className="h-4 w-4" aria-hidden />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={11} className="py-6 text-center text-gray-400">
                    Aucun menu
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {showForm && (
        <Modal title={editing ? "Modifier le menu" : "Nouveau menu"} onClose={() => setShowForm(false)}>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Nom du menu</label>
              <input value={name} onChange={(e) => setName(e.target.value)} className="w-full" required />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Prix sur place TTC (€)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={priceOnSite}
                  onChange={(e) => setPriceOnSite(e.target.value)}
                  className="w-full"
                  required
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Prix à emporter TTC (€)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={priceTakeaway}
                  onChange={(e) => setPriceTakeaway(e.target.value)}
                  className="w-full"
                  required
                />
              </div>
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between">
                <label className="text-sm font-medium text-gray-700">Produits inclus</label>
                <button type="button" onClick={addItem} className="text-sm text-brand-600 hover:text-brand-800">
                  + Produit
                </button>
              </div>
              <div className="space-y-2">
                {items.map((item, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <select
                      value={item.productId}
                      onChange={(e) => updateItem(index, { productId: e.target.value })}
                      className="flex-1"
                    >
                      {products.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} ({p.category})
                        </option>
                      ))}
                    </select>
                    <input
                      type="number"
                      step="1"
                      min="1"
                      placeholder="Qté"
                      value={item.quantity}
                      onChange={(e) => updateItem(index, { quantity: e.target.value })}
                      className="w-20"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => removeItem(index)}
                      className="text-gray-400 hover:text-brand-600"
                      aria-label="Retirer"
                    >
                      <X className="h-4 w-4" aria-hidden />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {livePreview && (
              <div className="rounded-md bg-gray-50 p-3 text-sm text-gray-700">
                <p>
                  Coût de revient sur place : <strong>{livePreview.onSite.cost.toFixed(2)} €</strong> — marge{" "}
                  <strong>{livePreview.onSite.marginEuros.toFixed(2)} €</strong> (
                  {livePreview.onSite.marginPercent.toFixed(0)}%)
                </p>
                <p>
                  Coût de revient à emporter : <strong>{livePreview.takeaway.cost.toFixed(2)} €</strong> — marge{" "}
                  <strong>{livePreview.takeaway.marginEuros.toFixed(2)} €</strong> (
                  {livePreview.takeaway.marginPercent.toFixed(0)}%)
                </p>
              </div>
            )}

            {error && <p className="text-sm text-brand-600">{error}</p>}

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={saving}
                className="rounded-md bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
              >
                {saving ? "Enregistrement..." : "Enregistrer"}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
