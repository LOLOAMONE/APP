"use client";

import { useEffect, useState } from "react";
import { Modal } from "@/components/Modal";
import { INGREDIENT_UNITS, IngredientUnit } from "@/lib/margins";

type Ingredient = {
  id: string;
  name: string;
  unit: string;
  price: number;
  supplier: string | null;
};

type PriceEntry = { id: string; price: number; recordedAt: string };

const UNIT_LABELS: Record<string, string> = { kg: "kg", L: "L", piece: "pièce" };

const emptyForm = { name: "", unit: "kg" as IngredientUnit, price: "", supplier: "" };

type SortKey = "name" | "unit" | "price" | "supplier";

export function IngredientsClient() {
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [editing, setEditing] = useState<Ingredient | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [historyFor, setHistoryFor] = useState<Ingredient | null>(null);
  const [history, setHistory] = useState<PriceEntry[]>([]);

  async function load() {
    setLoading(true);
    const res = await fetch("/api/ingredients");
    if (res.ok) setIngredients(await res.json());
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

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
      await load();
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
    await load();
  }

  async function openHistory(ing: Ingredient) {
    setHistoryFor(ing);
    const res = await fetch(`/api/ingredients/${ing.id}/history`);
    if (res.ok) setHistory(await res.json());
  }

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  const sortArrow = (key: SortKey) => (sortKey === key ? (sortDir === "asc" ? " ↑" : " ↓") : "");

  const filtered = ingredients
    .filter((i) => i.name.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      if (!sortKey) return 0;
      let cmp = 0;
      if (sortKey === "name") cmp = a.name.localeCompare(b.name);
      if (sortKey === "unit") cmp = a.unit.localeCompare(b.unit);
      if (sortKey === "price") cmp = a.price - b.price;
      if (sortKey === "supplier") cmp = (a.supplier ?? "").localeCompare(b.supplier ?? "");
      return sortDir === "asc" ? cmp : -cmp;
    });

  return (
    <div>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-xl font-bold text-gray-900">Ingrédients</h1>
        <div className="flex gap-2">
          <input
            placeholder="Rechercher..."
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
              {filtered.map((ing) => (
                <tr key={ing.id}>
                  <td className="font-medium">{ing.name}</td>
                  <td>{UNIT_LABELS[ing.unit] ?? ing.unit}</td>
                  <td>{ing.price.toFixed(2)} € / {UNIT_LABELS[ing.unit] ?? ing.unit}</td>
                  <td>{ing.supplier || "—"}</td>
                  <td>
                    <div className="flex justify-end gap-3 whitespace-nowrap text-sm">
                      <button onClick={() => openHistory(ing)} className="text-gray-500 hover:text-gray-700">
                        Historique
                      </button>
                      <button onClick={() => openEdit(ing)} className="text-brand-600 hover:text-brand-800">
                        Modifier
                      </button>
                      <button onClick={() => handleDelete(ing)} className="text-red-600 hover:text-red-800">
                        Supprimer
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-6 text-center text-gray-400">
                    Aucun ingrédient
                  </td>
                </tr>
              )}
            </tbody>
          </table>
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
                  {INGREDIENT_UNITS.map((u) => (
                    <option key={u} value={u}>
                      {UNIT_LABELS[u]}
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

            {error && <p className="text-sm text-red-600">{error}</p>}

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
    </div>
  );
}
