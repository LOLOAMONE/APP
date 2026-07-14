"use client";

import { useEffect, useMemo, useState } from "react";
import { Pencil, Trash2, X } from "lucide-react";
import { Modal } from "@/components/Modal";
import {
  Channel,
  IngredientUnit,
  RecipeQuantityUnit,
  allowedQuantityUnitsFor,
  computeCostOfGoods,
  computeMargin,
  TVA_SUR_PLACE,
  TVA_A_EMPORTER,
} from "@/lib/margins";

type Ingredient = { id: string; name: string; unit: string; price: number };

type ProductIngredientRow = {
  quantity: number;
  quantityUnit: string;
  channel: string;
  ingredient: Ingredient;
};

type MarginBlock = {
  priceTTC: number;
  priceHT: number;
  cost: number;
  marginEuros: number;
  marginPercent: number;
};

type Product = {
  id: string;
  name: string;
  category: string;
  priceOnSite: number;
  priceTakeaway: number;
  ingredients: ProductIngredientRow[];
  margins: { onSite: MarginBlock; takeaway: MarginBlock };
};

const KNOWN_CATEGORIES = [
  "Cordon Bleu",
  "Extras",
  "Sauces",
  "Dessert",
  "Boissons",
  "Boissons chaudes",
  "Alcool",
  "Menu",
  "Autre",
];

type FormLine = {
  ingredientId: string;
  quantity: string;
  quantityUnit: RecipeQuantityUnit;
  channel: Channel;
};

const UNIT_LABELS: Record<string, string> = {
  kg: "kg",
  g: "g",
  L: "L",
  mL: "mL",
  piece: "pièce",
};

const CHANNEL_LABELS: Record<Channel, string> = {
  BOTH: "Les deux",
  SUR_PLACE: "Sur place uniquement",
  EMPORTER: "À emporter uniquement",
};

function emptyLine(ingredients: Ingredient[]): FormLine {
  const first = ingredients[0];
  return {
    ingredientId: first?.id ?? "",
    quantity: "",
    quantityUnit: first ? allowedQuantityUnitsFor(first.unit as IngredientUnit)[0] : "piece",
    channel: "BOTH",
  };
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

export function ProduitsClient() {
  const [products, setProducts] = useState<Product[]>([]);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("custom");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [draggingId, setDraggingId] = useState<string | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [name, setName] = useState("");
  const [category, setCategory] = useState(KNOWN_CATEGORIES[0]);
  const [priceOnSite, setPriceOnSite] = useState("");
  const [priceTakeaway, setPriceTakeaway] = useState("");
  const [lines, setLines] = useState<FormLine[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function loadAll() {
    setLoading(true);
    const [pRes, iRes] = await Promise.all([fetch("/api/products"), fetch("/api/ingredients")]);
    if (pRes.ok) setProducts(await pRes.json());
    if (iRes.ok) setIngredients(await iRes.json());
    setLoading(false);
  }

  useEffect(() => {
    loadAll();
  }, []);

  function openCreate() {
    setEditing(null);
    setName("");
    setCategory(KNOWN_CATEGORIES[0]);
    setPriceOnSite("");
    setPriceTakeaway("");
    setLines(ingredients.length ? [emptyLine(ingredients)] : []);
    setError(null);
    setShowForm(true);
  }

  function openEdit(p: Product) {
    setEditing(p);
    setName(p.name);
    setCategory(p.category);
    setPriceOnSite(String(p.priceOnSite));
    setPriceTakeaway(String(p.priceTakeaway));
    setLines(
      p.ingredients.map((line) => ({
        ingredientId: line.ingredient.id,
        quantity: String(line.quantity),
        quantityUnit: line.quantityUnit as RecipeQuantityUnit,
        channel: (line.channel as Channel) ?? "BOTH",
      }))
    );
    setError(null);
    setShowForm(true);
  }

  function updateLine(index: number, patch: Partial<FormLine>) {
    setLines((prev) => prev.map((l, i) => (i === index ? { ...l, ...patch } : l)));
  }

  function setLineIngredient(index: number, ingredientId: string) {
    const ing = ingredients.find((i) => i.id === ingredientId);
    const allowed = ing ? allowedQuantityUnitsFor(ing.unit as IngredientUnit) : [];
    updateLine(index, { ingredientId, quantityUnit: allowed[0] ?? "piece" });
  }

  function addLine() {
    setLines((prev) => [...prev, emptyLine(ingredients)]);
  }

  function removeLine(index: number) {
    setLines((prev) => prev.filter((_, i) => i !== index));
  }

  const livePreview = useMemo(() => {
    try {
      const validLines = lines
        .filter((l) => l.ingredientId && parseFloat(l.quantity) > 0)
        .map((l) => {
          const ing = ingredients.find((i) => i.id === l.ingredientId)!;
          return { quantity: parseFloat(l.quantity), quantityUnit: l.quantityUnit, channel: l.channel, ingredient: ing };
        });
      if (validLines.length === 0) return null;
      const costOnSite = computeCostOfGoods(validLines, "SUR_PLACE");
      const costTakeaway = computeCostOfGoods(validLines, "EMPORTER");
      const onSite = computeMargin(parseFloat(priceOnSite) || 0, TVA_SUR_PLACE, costOnSite);
      const takeaway = computeMargin(parseFloat(priceTakeaway) || 0, TVA_A_EMPORTER, costTakeaway);
      return { onSite, takeaway };
    } catch {
      return null;
    }
  }, [lines, ingredients, priceOnSite, priceTakeaway]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const payload = {
      name,
      category,
      priceOnSite: parseFloat(priceOnSite),
      priceTakeaway: parseFloat(priceTakeaway),
      ingredients: lines
        .filter((l) => l.ingredientId && l.quantity)
        .map((l) => ({
          ingredientId: l.ingredientId,
          quantity: parseFloat(l.quantity),
          quantityUnit: l.quantityUnit,
          channel: l.channel,
        })),
    };

    const url = editing ? `/api/products/${editing.id}` : "/api/products";
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

  async function handleDelete(p: Product) {
    if (!confirm(`Supprimer le produit "${p.name}" ?`)) return;
    const res = await fetch(`/api/products/${p.id}`, { method: "DELETE" });
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
    const filtered = products.filter((p) => p.name.toLowerCase().includes(search.toLowerCase()));
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
  }, [products, search, sortKey, sortDir]);

  const groupedRows = useMemo(() => {
    const map = new Map<string, Product[]>();
    for (const p of rows) {
      if (!map.has(p.category)) map.set(p.category, []);
      map.get(p.category)!.push(p);
    }
    const orderedCategories = [
      ...KNOWN_CATEGORIES.filter((c) => map.has(c)),
      ...Array.from(map.keys()).filter((c) => !KNOWN_CATEGORIES.includes(c)).sort(),
    ];
    return orderedCategories.map((cat) => ({ category: cat, items: map.get(cat)! }));
  }, [rows]);

  const sortArrow = (key: SortKey) => (sortKey === key ? (sortDir === "asc" ? " ↑" : " ↓") : "");

  const dragEnabled = sortKey === "custom" && search === "";

  async function handleDrop(category: string, targetId: string) {
    if (!draggingId || draggingId === targetId) {
      setDraggingId(null);
      return;
    }
    const categoryItems = groupedRows.find((g) => g.category === category)?.items ?? [];
    const reordered = moveById(categoryItems, draggingId, targetId);
    if (reordered === categoryItems) {
      setDraggingId(null);
      return;
    }
    const indices: number[] = [];
    products.forEach((p, idx) => {
      if (p.category === category) indices.push(idx);
    });
    const newProducts = [...products];
    indices.forEach((idx, i) => {
      newProducts[idx] = reordered[i];
    });
    setProducts(newProducts);
    setDraggingId(null);
    await fetch("/api/products/reorder", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: reordered.map((p) => p.id) }),
    });
  }

  return (
    <div>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-xl font-bold text-gray-900">Produits &amp; marges</h1>
        <div className="flex flex-wrap gap-2">
          <input
            placeholder="Rechercher un produit..."
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
      ) : rows.length === 0 ? (
        <p className="py-6 text-center text-gray-400">Aucun produit</p>
      ) : (
        <div className="space-y-8">
          {groupedRows.map(({ category, items }) => (
            <div key={category}>
              <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-gray-500">{category}</h2>
              <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
                <table>
                  <thead>
                    <tr>
                      <th className="cursor-pointer select-none" onClick={() => toggleSort("name")}>
                        Produit{sortArrow("name")}
                      </th>
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
                    {items.map((p) => (
                      <tr
                        key={p.id}
                        draggable={dragEnabled}
                        onDragStart={() => dragEnabled && setDraggingId(p.id)}
                        onDragOver={(e) => dragEnabled && e.preventDefault()}
                        onDrop={() => dragEnabled && handleDrop(category, p.id)}
                        onDragEnd={() => setDraggingId(null)}
                        className={`${dragEnabled ? "cursor-grab active:cursor-grabbing" : ""} ${
                          draggingId === p.id ? "opacity-40" : ""
                        }`}
                      >
                        <td className="font-medium">{p.name}</td>
                        <td>{p.margins.onSite.cost.toFixed(2)} €</td>
                        <td>{p.margins.takeaway.cost.toFixed(2)} €</td>
                        <td>{p.priceOnSite.toFixed(2)} €</td>
                        <td>{p.margins.onSite.marginEuros.toFixed(2)} €</td>
                        <td className={`font-semibold ${marginColorClass(p.margins.onSite.marginPercent)}`}>
                          {p.margins.onSite.marginPercent.toFixed(0)}%
                        </td>
                        <td>{p.priceTakeaway.toFixed(2)} €</td>
                        <td>{p.margins.takeaway.marginEuros.toFixed(2)} €</td>
                        <td className={`font-semibold ${marginColorClass(p.margins.takeaway.marginPercent)}`}>
                          {p.margins.takeaway.marginPercent.toFixed(0)}%
                        </td>
                        <td>
                          <div className="flex justify-end gap-3 whitespace-nowrap text-sm">
                            <button onClick={() => openEdit(p)} title="Modifier" aria-label="Modifier" className="text-brand-600 hover:text-brand-800">
                              <Pencil className="h-4 w-4" aria-hidden />
                            </button>
                            <button onClick={() => handleDelete(p)} title="Supprimer" aria-label="Supprimer" className="text-brand-600 hover:text-brand-800">
                              <Trash2 className="h-4 w-4" aria-hidden />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <Modal title={editing ? "Modifier le produit" : "Nouveau produit"} onClose={() => setShowForm(false)} wide>
          {ingredients.length === 0 ? (
            <p className="text-sm text-gray-500">
              Ajoutez d&apos;abord des ingrédients avant de créer un produit.
            </p>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Nom du produit</label>
                  <input value={name} onChange={(e) => setName(e.target.value)} className="w-full" required />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Catégorie</label>
                  <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full">
                    {KNOWN_CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
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
                  <label className="text-sm font-medium text-gray-700">Composition (recette)</label>
                  <button type="button" onClick={addLine} className="text-sm text-brand-600 hover:text-brand-800">
                    + Ingrédient
                  </button>
                </div>
                <div className="space-y-2">
                  {lines.map((line, index) => {
                    const ing = ingredients.find((i) => i.id === line.ingredientId);
                    const allowedUnits = ing ? allowedQuantityUnitsFor(ing.unit as IngredientUnit) : [];
                    return (
                      <div key={index} className="rounded-lg border border-gray-200 p-3">
                        <div className="mb-3 flex items-center gap-2">
                          <select
                            value={line.ingredientId}
                            onChange={(e) => setLineIngredient(index, e.target.value)}
                            className="flex-1"
                          >
                            {ingredients.map((i) => (
                              <option key={i.id} value={i.id}>
                                {i.name}
                              </option>
                            ))}
                          </select>
                          <button
                            type="button"
                            onClick={() => removeLine(index)}
                            className="shrink-0 text-gray-400 hover:text-brand-600"
                            aria-label="Retirer"
                            title="Retirer"
                          >
                            <X className="h-4 w-4" aria-hidden />
                          </button>
                        </div>
                        <div className="grid grid-cols-3 gap-3">
                          <div>
                            <label className="mb-1 block text-xs text-gray-500">Quantité</label>
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              value={line.quantity}
                              onChange={(e) => updateLine(index, { quantity: e.target.value })}
                              className="w-full"
                              required
                            />
                          </div>
                          <div>
                            <label className="mb-1 block text-xs text-gray-500">Unité</label>
                            <select
                              value={line.quantityUnit}
                              onChange={(e) => updateLine(index, { quantityUnit: e.target.value as RecipeQuantityUnit })}
                              className="w-full"
                            >
                              {allowedUnits.map((u) => (
                                <option key={u} value={u}>
                                  {UNIT_LABELS[u] ?? u}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="mb-1 block text-xs text-gray-500">Canal</label>
                            <select
                              value={line.channel}
                              onChange={(e) => updateLine(index, { channel: e.target.value as Channel })}
                              className="w-full"
                            >
                              {(Object.entries(CHANNEL_LABELS) as [Channel, string][]).map(([value, label]) => (
                                <option key={value} value={value}>
                                  {label}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>
                      </div>
                    );
                  })}
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
          )}
        </Modal>
      )}
    </div>
  );
}
