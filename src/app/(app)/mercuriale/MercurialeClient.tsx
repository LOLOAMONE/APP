"use client";

import { useEffect, useMemo, useState } from "react";
import { Modal } from "@/components/Modal";

type SupplierItem = {
  id: string;
  reference: string | null;
  designation: string;
  packaging: string | null;
  orderQuantity: number;
  unitPriceHT: number | null;
  casePriceHT: number | null;
};

type Supplier = {
  id: string;
  name: string;
  orderSchedule: string | null;
  minimumOrder: string | null;
  email: string | null;
  phone: string | null;
  clientCode: string | null;
  notes: string | null;
  items: SupplierItem[];
};

const emptySupplierForm = {
  name: "",
  orderSchedule: "",
  minimumOrder: "",
  email: "",
  phone: "",
  clientCode: "",
  notes: "",
};

const emptyItemForm = {
  reference: "",
  designation: "",
  packaging: "",
  orderQuantity: "0",
  unitPriceHT: "",
  casePriceHT: "",
};

export function MercurialeClient() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const [showSupplierForm, setShowSupplierForm] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [supplierForm, setSupplierForm] = useState(emptySupplierForm);

  const [showItemForm, setShowItemForm] = useState(false);
  const [editingItem, setEditingItem] = useState<SupplierItem | null>(null);
  const [itemForm, setItemForm] = useState(emptyItemForm);

  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function loadAll() {
    setLoading(true);
    const res = await fetch("/api/suppliers");
    if (res.ok) {
      const data: Supplier[] = await res.json();
      setSuppliers(data);
      setSelectedId((prev) => prev && data.some((s) => s.id === prev) ? prev : data[0]?.id ?? null);
    }
    setLoading(false);
  }

  useEffect(() => {
    loadAll();
  }, []);

  const selected = suppliers.find((s) => s.id === selectedId) ?? null;

  const filteredItems = useMemo(() => {
    if (!selected) return [];
    const q = search.toLowerCase();
    return selected.items.filter(
      (i) =>
        i.designation.toLowerCase().includes(q) ||
        (i.reference ?? "").toLowerCase().includes(q)
    );
  }, [selected, search]);

  function openCreateSupplier() {
    setEditingSupplier(null);
    setSupplierForm(emptySupplierForm);
    setError(null);
    setShowSupplierForm(true);
  }

  function openEditSupplier(s: Supplier) {
    setEditingSupplier(s);
    setSupplierForm({
      name: s.name,
      orderSchedule: s.orderSchedule ?? "",
      minimumOrder: s.minimumOrder ?? "",
      email: s.email ?? "",
      phone: s.phone ?? "",
      clientCode: s.clientCode ?? "",
      notes: s.notes ?? "",
    });
    setError(null);
    setShowSupplierForm(true);
  }

  async function handleSupplierSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const payload = {
      name: supplierForm.name,
      orderSchedule: supplierForm.orderSchedule || null,
      minimumOrder: supplierForm.minimumOrder || null,
      email: supplierForm.email || null,
      phone: supplierForm.phone || null,
      clientCode: supplierForm.clientCode || null,
      notes: supplierForm.notes || null,
    };
    const url = editingSupplier ? `/api/suppliers/${editingSupplier.id}` : "/api/suppliers";
    const method = editingSupplier ? "PUT" : "POST";
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
      const saved = await res.json();
      setShowSupplierForm(false);
      await loadAll();
      if (!editingSupplier) setSelectedId(saved.id);
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteSupplier(s: Supplier) {
    if (!confirm(`Supprimer le fournisseur "${s.name}" et ses ${s.items.length} article(s) ?`)) return;
    const res = await fetch(`/api/suppliers/${s.id}`, { method: "DELETE" });
    if (res.ok) await loadAll();
  }

  function openCreateItem() {
    setEditingItem(null);
    setItemForm(emptyItemForm);
    setError(null);
    setShowItemForm(true);
  }

  function openEditItem(i: SupplierItem) {
    setEditingItem(i);
    setItemForm({
      reference: i.reference ?? "",
      designation: i.designation,
      packaging: i.packaging ?? "",
      orderQuantity: String(i.orderQuantity),
      unitPriceHT: i.unitPriceHT != null ? String(i.unitPriceHT) : "",
      casePriceHT: i.casePriceHT != null ? String(i.casePriceHT) : "",
    });
    setError(null);
    setShowItemForm(true);
  }

  async function handleItemSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selected) return;
    setSaving(true);
    setError(null);
    const payload = {
      reference: itemForm.reference || null,
      designation: itemForm.designation,
      packaging: itemForm.packaging || null,
      orderQuantity: parseFloat(itemForm.orderQuantity) || 0,
      unitPriceHT: itemForm.unitPriceHT ? parseFloat(itemForm.unitPriceHT) : null,
      casePriceHT: itemForm.casePriceHT ? parseFloat(itemForm.casePriceHT) : null,
    };
    const url = editingItem ? `/api/supplier-items/${editingItem.id}` : `/api/suppliers/${selected.id}/items`;
    const method = editingItem ? "PUT" : "POST";
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
      setShowItemForm(false);
      await loadAll();
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteItem(i: SupplierItem) {
    if (!confirm(`Supprimer l'article "${i.designation}" ?`)) return;
    const res = await fetch(`/api/supplier-items/${i.id}`, { method: "DELETE" });
    if (res.ok) await loadAll();
  }

  async function handleQuantityChange(i: SupplierItem, value: string) {
    const orderQuantity = parseFloat(value) || 0;
    setSuppliers((prev) =>
      prev.map((s) =>
        s.id !== selectedId
          ? s
          : { ...s, items: s.items.map((it) => (it.id === i.id ? { ...it, orderQuantity } : it)) }
      )
    );
    await fetch(`/api/supplier-items/${i.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        reference: i.reference,
        designation: i.designation,
        packaging: i.packaging,
        orderQuantity,
        unitPriceHT: i.unitPriceHT,
        casePriceHT: i.casePriceHT,
      }),
    });
  }

  if (loading) {
    return <p className="text-sm text-gray-500">Chargement...</p>;
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">Mercuriale</h1>
        <button
          onClick={openCreateSupplier}
          className="whitespace-nowrap rounded-md border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          + Fournisseur
        </button>
      </div>

      <div className="mb-6 flex flex-wrap gap-2 border-b border-gray-200 pb-4">
        {suppliers.map((s) => (
          <button
            key={s.id}
            onClick={() => setSelectedId(s.id)}
            className={`rounded-md px-3 py-1.5 text-sm font-medium ${
              selectedId === s.id ? "bg-brand-50 text-brand-700" : "text-gray-600 hover:bg-gray-100"
            }`}
          >
            {s.name}
          </button>
        ))}
        {suppliers.length === 0 && (
          <p className="text-sm text-gray-400">Aucun fournisseur. Ajoutez-en un pour commencer.</p>
        )}
      </div>

      {selected && (
        <div>
          <div className="mb-4 flex flex-col justify-between gap-3 rounded-lg border border-gray-200 bg-white p-4 sm:flex-row sm:items-start">
            <div className="grid gap-x-6 gap-y-1.5 text-sm text-gray-600 sm:grid-cols-2">
              {selected.orderSchedule && (
                <p className="flex items-start gap-2">
                  <span>📅</span>
                  <span>{selected.orderSchedule}</span>
                </p>
              )}
              {selected.minimumOrder && (
                <p className="flex items-start gap-2">
                  <span>📦</span>
                  <span>Franco : {selected.minimumOrder}</span>
                </p>
              )}
              {selected.email && (
                <p className="flex items-start gap-2">
                  <span>📧</span>
                  <span>{selected.email}</span>
                </p>
              )}
              {selected.phone && (
                <p className="flex items-start gap-2">
                  <span>☎️</span>
                  <span>{selected.phone}</span>
                </p>
              )}
              {selected.clientCode && (
                <p className="flex items-start gap-2">
                  <span>🔖</span>
                  <span>Code client : {selected.clientCode}</span>
                </p>
              )}
              {selected.notes && (
                <p className="flex items-start gap-2 sm:col-span-2">
                  <span>📝</span>
                  <span className="whitespace-pre-line">{selected.notes}</span>
                </p>
              )}
              {!selected.orderSchedule &&
                !selected.minimumOrder &&
                !selected.email &&
                !selected.phone &&
                !selected.clientCode &&
                !selected.notes && <p className="text-gray-400">Aucune information renseignée.</p>}
            </div>
            <div className="flex shrink-0 gap-3 text-sm">
              <button onClick={() => openEditSupplier(selected)} className="text-brand-600 hover:text-brand-800">
                Modifier
              </button>
              <button onClick={() => handleDeleteSupplier(selected)} className="text-red-600 hover:text-red-800">
                Supprimer
              </button>
            </div>
          </div>

          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <input
              placeholder="Rechercher un article..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full sm:w-64"
            />
            <button
              onClick={openCreateItem}
              className="whitespace-nowrap rounded-md bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
            >
              + Article
            </button>
          </div>

          <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
            <table>
              <thead>
                <tr>
                  <th>Référence</th>
                  <th>Désignation</th>
                  <th>Conditionnement</th>
                  <th>Commande</th>
                  <th>Prix U. HT</th>
                  <th>Prix carton/colis HT</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.map((i) => (
                  <tr key={i.id}>
                    <td className="text-gray-500">{i.reference || "—"}</td>
                    <td className="max-w-xs whitespace-pre-line font-medium">{i.designation}</td>
                    <td className="text-gray-500">{i.packaging || "—"}</td>
                    <td>
                      <input
                        type="number"
                        step="1"
                        min="0"
                        value={i.orderQuantity}
                        onChange={(e) => handleQuantityChange(i, e.target.value)}
                        className="w-16"
                      />
                    </td>
                    <td>{i.unitPriceHT != null ? `${i.unitPriceHT.toFixed(4)} €` : "—"}</td>
                    <td>{i.casePriceHT != null ? `${i.casePriceHT.toFixed(2)} €` : "—"}</td>
                    <td>
                      <div className="flex justify-end gap-3 whitespace-nowrap text-sm">
                        <button onClick={() => openEditItem(i)} className="text-brand-600 hover:text-brand-800">
                          Modifier
                        </button>
                        <button onClick={() => handleDeleteItem(i)} className="text-red-600 hover:text-red-800">
                          Supprimer
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredItems.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-6 text-center text-gray-400">
                      Aucun article
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showSupplierForm && (
        <Modal
          title={editingSupplier ? "Modifier le fournisseur" : "Nouveau fournisseur"}
          onClose={() => setShowSupplierForm(false)}
        >
          <form onSubmit={handleSupplierSubmit} className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Nom du fournisseur</label>
              <input
                value={supplierForm.name}
                onChange={(e) => setSupplierForm({ ...supplierForm, name: e.target.value })}
                className="w-full"
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                📅 Commande &amp; livraison
              </label>
              <input
                placeholder="ex : Lundi avant 10h pour livraison mercredi"
                value={supplierForm.orderSchedule}
                onChange={(e) => setSupplierForm({ ...supplierForm, orderSchedule: e.target.value })}
                className="w-full"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">📦 Franco / minimum</label>
                <input
                  placeholder="ex : 400€ HT ou 10 Bibs"
                  value={supplierForm.minimumOrder}
                  onChange={(e) => setSupplierForm({ ...supplierForm, minimumOrder: e.target.value })}
                  className="w-full"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">🔖 Code client</label>
                <input
                  value={supplierForm.clientCode}
                  onChange={(e) => setSupplierForm({ ...supplierForm, clientCode: e.target.value })}
                  className="w-full"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">📧 Email</label>
                <input
                  value={supplierForm.email}
                  onChange={(e) => setSupplierForm({ ...supplierForm, email: e.target.value })}
                  className="w-full"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">☎️ Téléphone</label>
                <input
                  value={supplierForm.phone}
                  onChange={(e) => setSupplierForm({ ...supplierForm, phone: e.target.value })}
                  className="w-full"
                />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">📝 Notes (optionnel)</label>
              <textarea
                value={supplierForm.notes}
                onChange={(e) => setSupplierForm({ ...supplierForm, notes: e.target.value })}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                rows={2}
              />
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowSupplierForm(false)}
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

      {showItemForm && selected && (
        <Modal title={editingItem ? "Modifier l'article" : `Nouvel article — ${selected.name}`} onClose={() => setShowItemForm(false)}>
          <form onSubmit={handleItemSubmit} className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Désignation</label>
              <input
                value={itemForm.designation}
                onChange={(e) => setItemForm({ ...itemForm, designation: e.target.value })}
                className="w-full"
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Référence</label>
                <input
                  value={itemForm.reference}
                  onChange={(e) => setItemForm({ ...itemForm, reference: e.target.value })}
                  className="w-full"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Conditionnement</label>
                <input
                  value={itemForm.packaging}
                  onChange={(e) => setItemForm({ ...itemForm, packaging: e.target.value })}
                  className="w-full"
                />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Commande</label>
                <input
                  type="number"
                  step="1"
                  min="0"
                  value={itemForm.orderQuantity}
                  onChange={(e) => setItemForm({ ...itemForm, orderQuantity: e.target.value })}
                  className="w-full"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Prix U. HT (€)</label>
                <input
                  type="number"
                  step="0.0001"
                  min="0"
                  value={itemForm.unitPriceHT}
                  onChange={(e) => setItemForm({ ...itemForm, unitPriceHT: e.target.value })}
                  className="w-full"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Prix carton/colis HT (€)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={itemForm.casePriceHT}
                  onChange={(e) => setItemForm({ ...itemForm, casePriceHT: e.target.value })}
                  className="w-full"
                />
              </div>
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowItemForm(false)}
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
