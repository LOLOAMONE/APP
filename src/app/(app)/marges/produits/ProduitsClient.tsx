"use client";

import { useEffect, useMemo, useState } from "react";
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
  priceOnSite: number;
  priceTakeaway: number;
  ingredients: ProductIngredientRow[];
  margins: { onSite: MarginBlock; takeaway: MarginBlock };
};

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

type SortKey = "name" | "onSitePercent" | "takeawayPercent";

export function ProduitsClient() {
  const [products, setProducts] = useState<Product[]>([]);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("onSitePercent");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [name, setName] = useState("");
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
    setPriceOnSite("");
    setPriceTakeaway("");
    setLines(ingredients.length ? [emptyLine(ingredients)] : []);
    setError(null);
    setShowForm(true);
  }

  function openEdit(p: Product) {
    setEditing(p);
    setName(p.name);
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

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  const rows = useMemo(() => {
    const filtered = products.filter((p) => p.name.toLowerCase().includes(search.toLowerCase()));
    const sorted = [...filtered].sort((a, b) => {
      let cmp = 0;
      if (sortKey === "name") cmp = a.name.localeCompare(b.name);
      if (sortKey === "onSitePercent") cmp = a.margins.onSite.marginPercent - b.margins.onSite.marginPercent;
      if (sortKey === "takeawayPercent") cmp = a.margins.takeaway.marginPercent - b.margins.takeaway.marginPercent;
      return sortDir === "asc" ? cmp : -cmp;
    });
    return sorted;
  }, [products, search, sortKey, sortDir]);

  const sortArrow = (key: SortKey) => (sortKey === key ? (sortDir === "asc" ? " ↑" : " ↓") : "");

  return (
    <div>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-xl font-bold text-gray-900">Produits &amp; marges</h1>
        <div className="flex gap-2">
          <input
            placeholder="Rechercher un produit..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full sm:w-56"
          />
          <button
            onClick={openCreate}
            className="whitespace-nowrap rounded-md bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
          >
            + Ajouter
          </button>
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-gray-500">Chargement...</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
          <table>
            <thead>
              <tr>
                <th className="cursor-pointer select-none" onClick={() => toggleSort("name")}>
                  Produit{sortArrow("name")}
                </th>
                <th>Coût sur place</th>
                <th>Coût à emporter</th>
                <th>Prix sur place (TTC)</th>
                <th className="cursor-pointer select-none" onClick={() => toggleSort("onSitePercent")}>
                  Marge sur place{sortArrow("onSitePercent")}
                </th>
                <th>Prix à emporter (TTC)</th>
                <th className="cursor-pointer select-none" onClick={() => toggleSort("takeawayPercent")}>
                  Marge à emporter{sortArrow("takeawayPercent")}
                </th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((p) => (
                <tr key={p.id}>
                  <td className="font-medium">{p.name}</td>
                  <td>{p.margins.onSite.cost.toFixed(2)} €</td>
                  <td>{p.margins.takeaway.cost.toFixed(2)} €</td>
                  <td>{p.priceOnSite.toFixed(2)} €</td>
                  <td className={p.margins.onSite.marginPercent < 0 ? "text-red-600" : ""}>
                    {p.margins.onSite.marginEuros.toFixed(2)} € ({p.margins.onSite.marginPercent.toFixed(0)}%)
                  </td>
                  <td>{p.priceTakeaway.toFixed(2)} €</td>
                  <td className={p.margins.takeaway.marginPercent < 0 ? "text-red-600" : ""}>
                    {p.margins.takeaway.marginEuros.toFixed(2)} € ({p.margins.takeaway.marginPercent.toFixed(0)}%)
                  </td>
                  <td>
                    <div className="flex justify-end gap-3 whitespace-nowrap text-sm">
                      <button onClick={() => openEdit(p)} className="text-brand-600 hover:text-brand-800">
                        Modifier
                      </button>
                      <button onClick={() => handleDelete(p)} className="text-red-600 hover:text-red-800">
                        Supprimer
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-6 text-center text-gray-400">
                    Aucun produit
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {showForm && (
        <Modal title={editing ? "Modifier le produit" : "Nouveau produit"} onClose={() => setShowForm(false)}>
          {ingredients.length === 0 ? (
            <p className="text-sm text-gray-500">
              Ajoutez d&apos;abord des ingrédients avant de créer un produit.
            </p>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Nom du produit</label>
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
                      <div key={index} className="flex flex-wrap items-center gap-2 rounded-md border border-gray-100 p-2">
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
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder="Qté"
                          value={line.quantity}
                          onChange={(e) => updateLine(index, { quantity: e.target.value })}
                          className="w-20"
                          required
                        />
                        <select
                          value={line.quantityUnit}
                          onChange={(e) => updateLine(index, { quantityUnit: e.target.value as RecipeQuantityUnit })}
                          className="w-24"
                        >
                          {allowedUnits.map((u) => (
                            <option key={u} value={u}>
                              {UNIT_LABELS[u]}
                            </option>
                          ))}
                        </select>
                        <select
                          value={line.channel}
                          onChange={(e) => updateLine(index, { channel: e.target.value as Channel })}
                          className="w-44"
                        >
                          {(Object.entries(CHANNEL_LABELS) as [Channel, string][]).map(([value, label]) => (
                            <option key={value} value={value}>
                              {label}
                            </option>
                          ))}
                        </select>
                        <button
                          type="button"
                          onClick={() => removeLine(index)}
                          className="text-gray-400 hover:text-red-600"
                          aria-label="Retirer"
                        >
                          ✕
                        </button>
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

              {error && <p className="text-sm text-red-600">{error}</p>}

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
