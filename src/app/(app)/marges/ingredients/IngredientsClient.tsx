"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, History, Pencil, Trash2, X } from "lucide-react";
import { Modal } from "@/components/Modal";
import { INGREDIENT_UNITS, IngredientUnit } from "@/lib/margins";

type Ingredient = {
  id: string;
  name: string;
  unit: string;
  price: number;
  supplier: string | null;
  category: string | null;
};

type PriceEntry = { id: string; price: number; recordedAt: string };

type MeasureUnitRow = { id: string; label: string };

const UNIT_LABELS: Record<string, string> = { kg: "kg", L: "L", piece: "pièce" };

const emptyForm = { name: "", unit: "kg" as IngredientUnit, price: "", supplier: "", category: "" };

const CATEGORY_FALLBACK = "Sans catégorie";

function moveById<T extends { id: string }>(list: T[], fromId: string, toId: string): T[] {
  const fromIndex = list.findIndex((x) => x.id === fromId);
  const toIndex = list.findIndex((x) => x.id === toId);
  if (fromIndex === -1 || toIndex === -1 || fromIndex === toIndex) return list;
  const copy = [...list];
  const [moved] = copy.splice(fromIndex, 1);
  copy.splice(toIndex, 0, moved);
  return copy;
}

type SortKey = "custom" | "name" | "unit" | "price" | "supplier";

export function IngredientsClient() {
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [units, setUnits] = useState<MeasureUnitRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("custom");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [editing, setEditing] = useState<Ingredient | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [historyFor, setHistoryFor] = useState<Ingredient | null>(null);
  const [history, setHistory] = useState<PriceEntry[]>([]);
  const [showUnitsModal, setShowUnitsModal] = useState(false);
  const [newUnitLabel, setNewUnitLabel] = useState("");
  const [editingUnitId, setEditingUnitId] = useState<string | null>(null);
  const [editingUnitLabel, setEditingUnitLabel] = useState("");

  async function loadAll() {
    setLoading(true);
    const [iRes, uRes] = await Promise.all([fetch("/api/ingredients"), fetch("/api/measure-units")]);
    if (iRes.ok) setIngredients(await iRes.json());
    if (uRes.ok) setUnits(await uRes.json());
    setLoading(false);
  }

  useEffect(() => {
    loadAll();
  }, []);

  const unitOptions = [...INGREDIENT_UNITS, ...units.map((u) => u.label).filter((l) => !INGREDIENT_UNITS.includes(l as (typeof INGREDIENT_UNITS)[number]))];

  const categorySuggestions = useMemo(
    () => Array.from(new Set(ingredients.map((i) => i.category).filter((c): c is string => !!c))),
    [ingredients]
  );

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setError(null);
    setShowForm(true);
  }

  function openEdit(ing: Ingredient) {
    setEditing(ing);
    setForm({
      name: ing.name,
      unit: ing.unit as IngredientUnit,
      price: String(ing.price),
      supplier: ing.supplier ?? "",
      category: ing.category ?? "",
    });
    setError(null);
    setShowForm(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const payload = {
      name: form.name,
      unit: form.unit,
      price: parseFloat(form.price),
      supplier: form.supplier || null,
      category: form.category || null,
    };

    const url = editing ? `/api/ingredients/${editing.id}` : "/api/ingredients";
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

  async function handleDelete(ing: Ingredient) {
    if (!confirm(`Supprimer l'ingrédient "${ing.name}" ?`)) return;
    const res = await fetch(`/api/ingredients/${ing.id}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      alert(data.error || "Suppression impossible");
      return;
    }
    await loadAll();
  }

  async function openHistory(ing: Ingredient) {
    setHistoryFor(ing);
    const res = await fetch(`/api/ingredients/${ing.id}/history`);
    if (res.ok) setHistory(await res.json());
  }

  function toggleSort(key: Exclude<SortKey, "custom">) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  const sortArrow = (key: SortKey) => (sortKey === key ? (sortDir === "asc" ? " ↑" : " ↓") : "");

  const displayed = useMemo(() => {
    const filtered = ingredients.filter((i) => i.name.toLowerCase().includes(search.toLowerCase()));
    if (sortKey === "custom") return filtered;
    return [...filtered].sort((a, b) => {
      let cmp = 0;
      if (sortKey === "name") cmp = a.name.localeCompare(b.name);
      if (sortKey === "unit") cmp = a.unit.localeCompare(b.unit);
      if (sortKey === "price") cmp = a.price - b.price;
      if (sortKey === "supplier") cmp = (a.supplier ?? "").localeCompare(b.supplier ?? "");
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [ingredients, search, sortKey, sortDir]);

  const groupedIngredients = useMemo(() => {
    const map = new Map<string, Ingredient[]>();
    for (const ing of displayed) {
      const cat = ing.category || CATEGORY_FALLBACK;
      if (!map.has(cat)) map.set(cat, []);
      map.get(cat)!.push(ing);
    }
    const categories = Array.from(map.keys());
    const hasRealCategory = categories.some((c) => c !== CATEGORY_FALLBACK);
    if (!hasRealCategory) {
      return [{ category: null as string | null, items: displayed }];
    }
    const ordered = [
      ...categories.filter((c) => c !== CATEGORY_FALLBACK),
      ...(map.has(CATEGORY_FALLBACK) ? [CATEGORY_FALLBACK] : []),
    ];
    return ordered.map((cat) => ({ category: cat as string | null, items: map.get(cat)! }));
  }, [displayed]);

  const dragEnabled = sortKey === "custom" && search === "";

  async function handleDrop(category: string | null, targetId: string) {
    if (!draggingId || draggingId === targetId) {
      setDraggingId(null);
      return;
    }
    const group = groupedIngredients.find((g) => g.category === category);
    if (!group) {
      setDraggingId(null);
      return;
    }
    const reordered = moveById(group.items, draggingId, targetId);
    if (reordered === group.items) {
      setDraggingId(null);
      return;
    }
    const matches = (ing: Ingredient) => category === null || (ing.category || CATEGORY_FALLBACK) === category;
    const indices: number[] = [];
    ingredients.forEach((ing, idx) => {
      if (matches(ing)) indices.push(idx);
    });
    const newIngredients = [...ingredients];
    indices.forEach((idx, i) => {
      newIngredients[idx] = reordered[i];
    });
    setIngredients(newIngredients);
    setDraggingId(null);
    await fetch("/api/ingredients/reorder", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: reordered.map((i) => i.id) }),
    });
  }

  async function handleAddUnit(e: React.FormEvent) {
    e.preventDefault();
    if (!newUnitLabel.trim()) return;
    const res = await fetch("/api/measure-units", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ label: newUnitLabel.trim() }),
    });
    if (res.ok) {
      setNewUnitLabel("");
      const unitRes = await fetch("/api/measure-units");
      if (unitRes.ok) setUnits(await unitRes.json());
    }
  }

  async function handleDeleteUnit(id: string) {
    const res = await fetch(`/api/measure-units/${id}`, { method: "DELETE" });
    if (res.ok) setUnits((prev) => prev.filter((u) => u.id !== id));
  }

  function startEditUnit(u: MeasureUnitRow) {
    setEditingUnitId(u.id);
    setEditingUnitLabel(u.label);
  }

  async function saveEditUnit(id: string) {
    const label = editingUnitLabel.trim();
    if (!label) return;
    const res = await fetch(`/api/measure-units/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ label }),
    });
    if (res.ok) {
      setEditingUnitId(null);
      const unitRes = await fetch("/api/measure-units");
      if (unitRes.ok) setUnits(await unitRes.json());
    }
  }

  return (
    <div>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-xl font-bold text-gray-900">Ingrédients</h1>
        <div className="flex flex-wrap gap-2">
          <input
            placeholder="Rechercher..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full sm:w-56"
          />
          <button
            onClick={() => setShowUnitsModal(true)}
            className="whitespace-nowrap rounded-md border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Unités
          </button>
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
        <div>
          {sortKey !== "custom" && (
            <div className="mb-2 flex justify-end">
              <button
                onClick={() => setSortKey("custom")}
                className="whitespace-nowrap text-sm text-gray-500 hover:text-gray-700"
              >
                ↺ Ordre personnalisé
              </button>
            </div>
          )}
          {!dragEnabled && (
            <p className="mb-2 text-xs text-gray-400">
              {search
                ? "Le glisser-déposer est désactivé pendant une recherche."
                : "Clique sur « ↺ Ordre personnalisé » pour réactiver le glisser-déposer."}
            </p>
          )}
          <div className="space-y-6">
            {groupedIngredients.map(({ category, items }) => (
              <div key={category ?? "__flat__"}>
                {category !== null && (
                  <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-gray-500">{category}</h2>
                )}
                <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
                  <table>
                    <thead>
                      <tr>
                        <th className="cursor-pointer select-none" onClick={() => toggleSort("name")}>
                          Nom{sortArrow("name")}
                        </th>
                        <th className="cursor-pointer select-none" onClick={() => toggleSort("unit")}>
                          Unité{sortArrow("unit")}
                        </th>
                        <th className="cursor-pointer select-none" onClick={() => toggleSort("price")}>
                          Prix d&apos;achat{sortArrow("price")}
                        </th>
                        <th className="cursor-pointer select-none" onClick={() => toggleSort("supplier")}>
                          Fournisseur{sortArrow("supplier")}
                        </th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((ing) => (
                        <tr
                          key={ing.id}
                          draggable={dragEnabled}
                          onDragStart={() => dragEnabled && setDraggingId(ing.id)}
                          onDragOver={(e) => dragEnabled && e.preventDefault()}
                          onDrop={() => dragEnabled && handleDrop(category, ing.id)}
                          onDragEnd={() => setDraggingId(null)}
                          className={`${dragEnabled ? "cursor-grab active:cursor-grabbing" : ""} ${
                            draggingId === ing.id ? "opacity-40" : ""
                          }`}
                        >
                          <td className="font-medium">{ing.name}</td>
                          <td>{UNIT_LABELS[ing.unit] ?? ing.unit}</td>
                          <td>{ing.price.toFixed(2)} € / {UNIT_LABELS[ing.unit] ?? ing.unit}</td>
                          <td>{ing.supplier || "—"}</td>
                          <td>
                            <div className="flex justify-end gap-3 whitespace-nowrap text-sm">
                              <button onClick={() => openHistory(ing)} title="Historique" aria-label="Historique" className="text-gray-500 hover:text-gray-700">
                                <History className="h-4 w-4" aria-hidden />
                              </button>
                              <button onClick={() => openEdit(ing)} title="Modifier" aria-label="Modifier" className="text-brand-600 hover:text-brand-800">
                                <Pencil className="h-4 w-4" aria-hidden />
                              </button>
                              <button onClick={() => handleDelete(ing)} title="Supprimer" aria-label="Supprimer" className="text-brand-600 hover:text-brand-800">
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
            {displayed.length === 0 && (
              <p className="py-6 text-center text-gray-400">Aucun ingrédient</p>
            )}
          </div>
        </div>
      )}

      {showForm && (
        <Modal title={editing ? "Modifier l'ingrédient" : "Nouvel ingrédient"} onClose={() => setShowForm(false)}>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Nom</label>
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full"
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Unité</label>
                <select
                  value={form.unit}
                  onChange={(e) => setForm({ ...form, unit: e.target.value as IngredientUnit })}
                  className="w-full"
                >
                  {unitOptions.map((u) => (
                    <option key={u} value={u}>
                      {UNIT_LABELS[u] ?? u}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Prix d&apos;achat (€)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.price}
                  onChange={(e) => setForm({ ...form, price: e.target.value })}
                  className="w-full"
                  required
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Fournisseur (optionnel)
                </label>
                <input
                  value={form.supplier}
                  onChange={(e) => setForm({ ...form, supplier: e.target.value })}
                  className="w-full"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Catégorie (optionnel)</label>
                <input
                  list="ingredient-category-suggestions"
                  placeholder="ex : Viandes"
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  className="w-full"
                />
                <datalist id="ingredient-category-suggestions">
                  {categorySuggestions.map((c) => (
                    <option key={c} value={c} />
                  ))}
                </datalist>
              </div>
            </div>

            {error && <p className="text-sm text-brand-600">{error}</p>}

            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setShowForm(false)} className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700">
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

      {historyFor && (
        <Modal title={`Historique des prix — ${historyFor.name}`} onClose={() => setHistoryFor(null)}>
          {history.length === 0 ? (
            <p className="text-sm text-gray-500">Aucun historique.</p>
          ) : (
            <ul className="space-y-2">
              {history.map((h) => (
                <li key={h.id} className="flex justify-between border-b border-gray-100 pb-2 text-sm">
                  <span>{new Date(h.recordedAt).toLocaleDateString("fr-FR")}</span>
                  <span className="font-medium">{h.price.toFixed(2)} €</span>
                </li>
              ))}
            </ul>
          )}
        </Modal>
      )}

      {showUnitsModal && (
        <Modal title="Unités personnalisées" onClose={() => setShowUnitsModal(false)}>
          <p className="mb-3 text-xs text-gray-500">
            En plus de kg / L / pièce, ajoute ici des unités libres (ex : &laquo; carton &raquo;, &laquo; sachet &raquo;,
            &laquo; portion &raquo;) utilisables comme unité d&apos;achat d&apos;un ingrédient et comme unité de
            quantité dans les recettes.
          </p>
          <form onSubmit={handleAddUnit} className="mb-4 flex gap-2">
            <input
              placeholder="ex : Sachet"
              value={newUnitLabel}
              onChange={(e) => setNewUnitLabel(e.target.value)}
              className="flex-1"
            />
            <button
              type="submit"
              className="whitespace-nowrap rounded-md bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
            >
              + Ajouter
            </button>
          </form>
          <div className="max-h-80 overflow-y-auto rounded-lg border border-gray-200">
            <ul>
              {units.map((u) => (
                <li key={u.id} className="flex items-center justify-between gap-2 border-b border-gray-100 px-3 py-2 text-sm last:border-0">
                  {editingUnitId === u.id ? (
                    <>
                      <input
                        autoFocus
                        value={editingUnitLabel}
                        onChange={(e) => setEditingUnitLabel(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && saveEditUnit(u.id)}
                        className="flex-1"
                      />
                      <div className="flex shrink-0 gap-2">
                        <button onClick={() => saveEditUnit(u.id)} title="Enregistrer" aria-label="Enregistrer" className="text-green-600 hover:text-green-800">
                          <Check className="h-4 w-4" aria-hidden />
                        </button>
                        <button onClick={() => setEditingUnitId(null)} title="Annuler" aria-label="Annuler" className="text-gray-400 hover:text-gray-600">
                          <X className="h-4 w-4" aria-hidden />
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      <span className="flex-1">{u.label}</span>
                      <div className="flex shrink-0 gap-2">
                        <button onClick={() => startEditUnit(u)} title="Modifier" aria-label="Modifier" className="text-brand-600 hover:text-brand-800">
                          <Pencil className="h-4 w-4" aria-hidden />
                        </button>
                        <button onClick={() => handleDeleteUnit(u.id)} title="Supprimer" aria-label="Supprimer" className="text-brand-600 hover:text-brand-800">
                          <Trash2 className="h-4 w-4" aria-hidden />
                        </button>
                      </div>
                    </>
                  )}
                </li>
              ))}
              {units.length === 0 && <li className="px-3 py-4 text-center text-sm text-gray-400">Aucune unité personnalisée</li>}
            </ul>
          </div>
        </Modal>
      )}
    </div>
  );
}
