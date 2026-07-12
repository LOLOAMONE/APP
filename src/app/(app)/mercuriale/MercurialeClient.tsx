"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Modal } from "@/components/Modal";

type SupplierItem = {
  id: string;
  reference: string | null;
  designation: string;
  category: string | null;
  packaging: string | null;
  orderQuantity: number;
  unitPriceHT: number | null;
  casePriceHT: number | null;
  orderedAt: string | null;
  receivedAt: string | null;
};

type Supplier = {
  id: string;
  name: string;
  category: string | null;
  orderSchedule: string | null;
  minimumOrder: string | null;
  email: string | null;
  phone: string | null;
  clientCode: string | null;
  notes: string | null;
  items: SupplierItem[];
};

type PackagingUnitRow = { id: string; label: string };

const emptySupplierForm = {
  name: "",
  category: "",
  orderSchedule: "",
  minimumOrder: "",
  email: "",
  phone: "",
  clientCode: "",
  notes: "",
};

const SUPPLIER_CATEGORY_FALLBACK = "Sans catégorie";

function pendingCount(s: Supplier): number {
  return s.items.filter((i) => i.orderedAt && !i.receivedAt).length;
}

function isUrl(value: string | null): value is string {
  return !!value && /^https?:\/\//i.test(value);
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

const emptyItemForm = {
  reference: "",
  designation: "",
  category: "",
  packaging: "",
  orderQuantity: "0",
  unitPriceHT: "",
  casePriceHT: "",
};

type ItemSortKey =
  | "custom"
  | "reference"
  | "designation"
  | "packaging"
  | "orderQuantity"
  | "unitPriceHT"
  | "casePriceHT"
  | "orderedAt"
  | "receivedAt";

function toDateInputValue(iso: string | null): string {
  return iso ? iso.slice(0, 10) : "";
}

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

const CATEGORY_FALLBACK = "Sans catégorie";

export function MercurialeClient() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [units, setUnits] = useState<PackagingUnitRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<ItemSortKey>("custom");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [draggingId, setDraggingId] = useState<string | null>(null);

  const [showSupplierForm, setShowSupplierForm] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [supplierForm, setSupplierForm] = useState(emptySupplierForm);

  const [showItemForm, setShowItemForm] = useState(false);
  const [editingItem, setEditingItem] = useState<SupplierItem | null>(null);
  const [itemForm, setItemForm] = useState(emptyItemForm);

  const [showUnitsModal, setShowUnitsModal] = useState(false);
  const [newUnitLabel, setNewUnitLabel] = useState("");

  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function loadAll() {
    setLoading(true);
    const [supRes, unitRes] = await Promise.all([fetch("/api/suppliers"), fetch("/api/packaging-units")]);
    if (supRes.ok) {
      const data: Supplier[] = await supRes.json();
      setSuppliers(data);
      setSelectedId((prev) => (prev && data.some((s) => s.id === prev) ? prev : data[0]?.id ?? null));
    }
    if (unitRes.ok) setUnits(await unitRes.json());
    setLoading(false);
  }

  useEffect(() => {
    loadAll();
  }, []);

  const selected = suppliers.find((s) => s.id === selectedId) ?? null;

  const displayedItems = useMemo(() => {
    if (!selected) return [];
    const q = search.toLowerCase();
    const filtered = selected.items.filter(
      (i) => i.designation.toLowerCase().includes(q) || (i.reference ?? "").toLowerCase().includes(q)
    );
    if (sortKey === "custom") return filtered;
    const sorted = [...filtered].sort((a, b) => {
      let cmp = 0;
      if (sortKey === "reference") cmp = (a.reference ?? "").localeCompare(b.reference ?? "");
      if (sortKey === "designation") cmp = a.designation.localeCompare(b.designation);
      if (sortKey === "packaging") cmp = (a.packaging ?? "").localeCompare(b.packaging ?? "");
      if (sortKey === "orderQuantity") cmp = a.orderQuantity - b.orderQuantity;
      if (sortKey === "unitPriceHT") cmp = (a.unitPriceHT ?? 0) - (b.unitPriceHT ?? 0);
      if (sortKey === "casePriceHT") cmp = (a.casePriceHT ?? 0) - (b.casePriceHT ?? 0);
      if (sortKey === "orderedAt") cmp = (a.orderedAt ?? "").localeCompare(b.orderedAt ?? "");
      if (sortKey === "receivedAt") cmp = (a.receivedAt ?? "").localeCompare(b.receivedAt ?? "");
      return sortDir === "asc" ? cmp : -cmp;
    });
    return sorted;
  }, [selected, search, sortKey, sortDir]);

  const groupedItems = useMemo(() => {
    const map = new Map<string, SupplierItem[]>();
    for (const item of displayedItems) {
      const cat = item.category || CATEGORY_FALLBACK;
      if (!map.has(cat)) map.set(cat, []);
      map.get(cat)!.push(item);
    }
    const categories = Array.from(map.keys());
    const hasRealCategory = categories.some((c) => c !== CATEGORY_FALLBACK);
    if (!hasRealCategory) {
      return [{ category: null as string | null, items: displayedItems }];
    }
    const ordered = [
      ...categories.filter((c) => c !== CATEGORY_FALLBACK),
      ...(map.has(CATEGORY_FALLBACK) ? [CATEGORY_FALLBACK] : []),
    ];
    return ordered.map((cat) => ({ category: cat as string | null, items: map.get(cat)! }));
  }, [displayedItems]);

  const categorySuggestions = useMemo(
    () => Array.from(new Set((selected?.items ?? []).map((i) => i.category).filter((c): c is string => !!c))),
    [selected]
  );

  const groupedSuppliers = useMemo(() => {
    const map = new Map<string, Supplier[]>();
    for (const s of suppliers) {
      const cat = s.category || SUPPLIER_CATEGORY_FALLBACK;
      if (!map.has(cat)) map.set(cat, []);
      map.get(cat)!.push(s);
    }
    const categories = Array.from(map.keys());
    const hasRealCategory = categories.some((c) => c !== SUPPLIER_CATEGORY_FALLBACK);
    if (!hasRealCategory) {
      return [{ category: null as string | null, suppliers }];
    }
    const ordered = [
      ...categories.filter((c) => c !== SUPPLIER_CATEGORY_FALLBACK),
      ...(map.has(SUPPLIER_CATEGORY_FALLBACK) ? [SUPPLIER_CATEGORY_FALLBACK] : []),
    ];
    return ordered.map((cat) => ({ category: cat as string | null, suppliers: map.get(cat)! }));
  }, [suppliers]);

  const supplierCategorySuggestions = useMemo(
    () => Array.from(new Set(suppliers.map((s) => s.category).filter((c): c is string => !!c))),
    [suppliers]
  );

  const toOrderCount = useMemo(
    () => suppliers.reduce((sum, s) => sum + s.items.filter((i) => i.orderQuantity > 0 && !i.orderedAt).length, 0),
    [suppliers]
  );

  const dragEnabled = sortKey === "custom" && search === "";

  function toggleSort(key: Exclude<ItemSortKey, "custom">) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  const sortArrow = (key: ItemSortKey) => (sortKey === key ? (sortDir === "asc" ? " ↑" : " ↓") : "");

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
      category: s.category ?? "",
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
      category: supplierForm.category || null,
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

  async function handleSupplierDrop(category: string | null, targetId: string) {
    if (!draggingId || draggingId === targetId) {
      setDraggingId(null);
      return;
    }
    const group = groupedSuppliers.find((g) => g.category === category);
    if (!group) {
      setDraggingId(null);
      return;
    }
    const reordered = moveById(group.suppliers, draggingId, targetId);
    if (reordered === group.suppliers) {
      setDraggingId(null);
      return;
    }
    const matches = (s: Supplier) => category === null || (s.category || SUPPLIER_CATEGORY_FALLBACK) === category;
    const indices: number[] = [];
    suppliers.forEach((s, idx) => {
      if (matches(s)) indices.push(idx);
    });
    const newSuppliers = [...suppliers];
    indices.forEach((idx, i) => {
      newSuppliers[idx] = reordered[i];
    });
    setSuppliers(newSuppliers);
    setDraggingId(null);
    await fetch("/api/suppliers/reorder", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: reordered.map((s) => s.id) }),
    });
  }

  async function handleItemDrop(category: string | null, targetId: string) {
    if (!draggingId || draggingId === targetId || !selected) {
      setDraggingId(null);
      return;
    }
    const group = groupedItems.find((g) => g.category === category);
    if (!group) {
      setDraggingId(null);
      return;
    }
    const reordered = moveById(group.items, draggingId, targetId);
    if (reordered === group.items) {
      setDraggingId(null);
      return;
    }
    const matches = (item: SupplierItem) => category === null || (item.category || CATEGORY_FALLBACK) === category;
    const indices: number[] = [];
    selected.items.forEach((it, idx) => {
      if (matches(it)) indices.push(idx);
    });
    const newItems = [...selected.items];
    indices.forEach((idx, i) => {
      newItems[idx] = reordered[i];
    });
    setSuppliers((prev) => prev.map((s) => (s.id === selected.id ? { ...s, items: newItems } : s)));
    setDraggingId(null);
    await fetch(`/api/suppliers/${selected.id}/items/reorder`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: reordered.map((i) => i.id) }),
    });
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
      category: i.category ?? "",
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
      category: itemForm.category || null,
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
      if (itemForm.packaging && !units.some((u) => u.label === itemForm.packaging)) {
        await fetch("/api/packaging-units", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ label: itemForm.packaging }),
        });
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
        orderedAt: i.orderedAt,
        receivedAt: i.receivedAt,
      }),
    });
  }

  async function handleDateChange(i: SupplierItem, field: "orderedAt" | "receivedAt", value: string) {
    const dateValue = value || null;
    setSuppliers((prev) =>
      prev.map((s) =>
        s.id !== selectedId
          ? s
          : { ...s, items: s.items.map((it) => (it.id === i.id ? { ...it, [field]: dateValue } : it)) }
      )
    );
    await fetch(`/api/supplier-items/${i.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        reference: i.reference,
        designation: i.designation,
        packaging: i.packaging,
        orderQuantity: i.orderQuantity,
        unitPriceHT: i.unitPriceHT,
        casePriceHT: i.casePriceHT,
        orderedAt: field === "orderedAt" ? dateValue : i.orderedAt,
        receivedAt: field === "receivedAt" ? dateValue : i.receivedAt,
      }),
    });
  }

  async function handleAddUnit(e: React.FormEvent) {
    e.preventDefault();
    if (!newUnitLabel.trim()) return;
    const res = await fetch("/api/packaging-units", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ label: newUnitLabel.trim() }),
    });
    if (res.ok) {
      setNewUnitLabel("");
      const unitRes = await fetch("/api/packaging-units");
      if (unitRes.ok) setUnits(await unitRes.json());
    }
  }

  async function handleDeleteUnit(id: string) {
    const res = await fetch(`/api/packaging-units/${id}`, { method: "DELETE" });
    if (res.ok) setUnits((prev) => prev.filter((u) => u.id !== id));
  }

  if (loading) {
    return <p className="text-sm text-gray-500">Chargement...</p>;
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">Mercuriale</h1>
        <div className="flex gap-2">
          <Link
            href="/mercuriale/a-commander"
            className="whitespace-nowrap rounded-md border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            📋 À commander
            {toOrderCount > 0 && (
              <span className="ml-1.5 rounded-full bg-orange-100 px-1.5 py-0.5 text-xs font-semibold text-orange-700">
                {toOrderCount}
              </span>
            )}
          </Link>
          <button
            onClick={() => setShowUnitsModal(true)}
            className="whitespace-nowrap rounded-md border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Unités
          </button>
          <button
            onClick={openCreateSupplier}
            className="whitespace-nowrap rounded-md border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            + Fournisseur
          </button>
        </div>
      </div>

      <div className="mb-6 space-y-2 border-b border-gray-200 pb-4">
        {groupedSuppliers.map(({ category, suppliers: group }) => (
          <div key={category ?? "__flat__"} className="flex flex-wrap items-center gap-2">
            {category !== null && (
              <span className="mr-1 text-xs font-semibold uppercase tracking-wide text-gray-400">{category}</span>
            )}
            {group.map((s) => {
              const pending = pendingCount(s);
              return (
                <button
                  key={s.id}
                  draggable
                  onDragStart={() => setDraggingId(s.id)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => handleSupplierDrop(category, s.id)}
                  onDragEnd={() => setDraggingId(null)}
                  onClick={() => setSelectedId(s.id)}
                  title="Glisser pour réordonner"
                  className={`cursor-grab select-none rounded-md px-3 py-1.5 text-sm font-medium active:cursor-grabbing ${
                    selectedId === s.id ? "bg-brand-50 text-brand-700" : "text-gray-600 hover:bg-gray-100"
                  } ${draggingId === s.id ? "opacity-40" : ""}`}
                >
                  {s.name}
                  {pending > 0 && (
                    <span
                      title={`${pending} article(s) commandé(s) en attente de réception`}
                      className="ml-1.5 rounded-full bg-orange-100 px-1.5 py-0.5 text-xs font-semibold text-orange-700"
                    >
                      📦{pending}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
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
              <button onClick={() => openEditSupplier(selected)} title="Modifier" aria-label="Modifier" className="text-brand-600 hover:text-brand-800">
                ✏️
              </button>
              <button onClick={() => handleDeleteSupplier(selected)} title="Supprimer" aria-label="Supprimer" className="text-red-600 hover:text-red-800">
                🗑️
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
            <div className="flex items-center gap-3">
              {sortKey !== "custom" && (
                <button
                  onClick={() => setSortKey("custom")}
                  className="whitespace-nowrap text-sm text-gray-500 hover:text-gray-700"
                >
                  ↺ Ordre personnalisé
                </button>
              )}
              <button
                onClick={openCreateItem}
                className="whitespace-nowrap rounded-md bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
              >
                + Article
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

          <div className="space-y-6">
            {groupedItems.map(({ category, items }) => (
              <div key={category ?? "__flat__"}>
                {category !== null && (
                  <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-gray-500">{category}</h2>
                )}
                <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
                  <table>
                    <thead>
                      <tr>
                        <th className="cursor-pointer select-none" onClick={() => toggleSort("reference")}>
                          Référence{sortArrow("reference")}
                        </th>
                        <th>Lien</th>
                        <th className="cursor-pointer select-none" onClick={() => toggleSort("designation")}>
                          Désignation{sortArrow("designation")}
                        </th>
                        <th className="cursor-pointer select-none" onClick={() => toggleSort("packaging")}>
                          Conditionnement{sortArrow("packaging")}
                        </th>
                        <th className="cursor-pointer select-none" onClick={() => toggleSort("orderQuantity")}>
                          Commande{sortArrow("orderQuantity")}
                        </th>
                        <th className="cursor-pointer select-none" onClick={() => toggleSort("unitPriceHT")}>
                          Prix U. HT{sortArrow("unitPriceHT")}
                        </th>
                        <th className="cursor-pointer select-none" onClick={() => toggleSort("casePriceHT")}>
                          Prix carton/colis HT{sortArrow("casePriceHT")}
                        </th>
                        <th className="cursor-pointer select-none" onClick={() => toggleSort("orderedAt")}>
                          📦 Commandé le{sortArrow("orderedAt")}
                        </th>
                        <th className="cursor-pointer select-none" onClick={() => toggleSort("receivedAt")}>
                          ✅ Reçu le{sortArrow("receivedAt")}
                        </th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((i) => (
                        <tr
                          key={i.id}
                          draggable={dragEnabled}
                          onDragStart={() => dragEnabled && setDraggingId(i.id)}
                          onDragOver={(e) => dragEnabled && e.preventDefault()}
                          onDrop={() => dragEnabled && handleItemDrop(category, i.id)}
                          onDragEnd={() => setDraggingId(null)}
                          className={`${dragEnabled ? "cursor-grab active:cursor-grabbing" : ""} ${
                            draggingId === i.id ? "opacity-40" : ""
                          }`}
                        >
                          <td className="text-gray-500">{isUrl(i.reference) ? "—" : i.reference || "—"}</td>
                          <td>
                            {isUrl(i.reference) && (
                              <a
                                href={i.reference}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 whitespace-nowrap rounded-md border border-gray-300 px-2 py-1 text-xs font-medium text-brand-600 hover:bg-brand-50"
                              >
                                🔗 Voir
                              </a>
                            )}
                          </td>
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
                          <td>{i.unitPriceHT != null ? `${i.unitPriceHT.toFixed(2)} €` : "—"}</td>
                          <td>{i.casePriceHT != null ? `${i.casePriceHT.toFixed(2)} €` : "—"}</td>
                          <td>
                            <div className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                checked={!!i.orderedAt}
                                onChange={(e) => handleDateChange(i, "orderedAt", e.target.checked ? todayISO() : "")}
                                title="Commandé"
                                aria-label="Commandé"
                                className="h-4 w-4"
                              />
                              <input
                                type="date"
                                value={toDateInputValue(i.orderedAt)}
                                onChange={(e) => handleDateChange(i, "orderedAt", e.target.value)}
                                className={`w-36 text-sm ${i.orderedAt ? "text-orange-600" : "text-gray-400"}`}
                              />
                            </div>
                          </td>
                          <td>
                            <div className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                checked={!!i.receivedAt}
                                onChange={(e) => handleDateChange(i, "receivedAt", e.target.checked ? todayISO() : "")}
                                title="Reçu"
                                aria-label="Reçu"
                                className="h-4 w-4"
                              />
                              <input
                                type="date"
                                value={toDateInputValue(i.receivedAt)}
                                onChange={(e) => handleDateChange(i, "receivedAt", e.target.value)}
                                className={`w-36 text-sm ${i.receivedAt ? "text-green-600" : "text-gray-400"}`}
                              />
                            </div>
                          </td>
                          <td>
                            <div className="flex justify-end gap-3 whitespace-nowrap text-sm">
                              <button onClick={() => openEditItem(i)} title="Modifier" aria-label="Modifier" className="text-brand-600 hover:text-brand-800">
                                ✏️
                              </button>
                              <button onClick={() => handleDeleteItem(i)} title="Supprimer" aria-label="Supprimer" className="text-red-600 hover:text-red-800">
                                🗑️
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
            {displayedItems.length === 0 && (
              <p className="py-6 text-center text-gray-400">Aucun article</p>
            )}
          </div>
        </div>
      )}

      {showSupplierForm && (
        <Modal
          title={editingSupplier ? "Modifier le fournisseur" : "Nouveau fournisseur"}
          onClose={() => setShowSupplierForm(false)}
        >
          <form onSubmit={handleSupplierSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
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
                <label className="mb-1 block text-sm font-medium text-gray-700">Catégorie (optionnel)</label>
                <input
                  list="supplier-category-suggestions"
                  placeholder="ex : Boissons"
                  value={supplierForm.category}
                  onChange={(e) => setSupplierForm({ ...supplierForm, category: e.target.value })}
                  className="w-full"
                />
                <datalist id="supplier-category-suggestions">
                  {supplierCategorySuggestions.map((c) => (
                    <option key={c} value={c} />
                  ))}
                </datalist>
              </div>
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
                <label className="mb-1 block text-sm font-medium text-gray-700">Catégorie (optionnel)</label>
                <input
                  list="category-suggestions"
                  placeholder="ex : Boissons"
                  value={itemForm.category}
                  onChange={(e) => setItemForm({ ...itemForm, category: e.target.value })}
                  className="w-full"
                />
                <datalist id="category-suggestions">
                  {categorySuggestions.map((c) => (
                    <option key={c} value={c} />
                  ))}
                </datalist>
              </div>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Conditionnement</label>
              <input
                list="packaging-units-list"
                value={itemForm.packaging}
                onChange={(e) => setItemForm({ ...itemForm, packaging: e.target.value })}
                className="w-full"
              />
              <datalist id="packaging-units-list">
                {units.map((u) => (
                  <option key={u.id} value={u.label} />
                ))}
              </datalist>
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
                  step="0.01"
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

      {showUnitsModal && (
        <Modal title="Unités / conditionnements" onClose={() => setShowUnitsModal(false)}>
          <form onSubmit={handleAddUnit} className="mb-4 flex gap-2">
            <input
              placeholder="ex : Carton de 24"
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
                <li key={u.id} className="flex items-center justify-between border-b border-gray-100 px-3 py-2 text-sm last:border-0">
                  {u.label}
                  <button onClick={() => handleDeleteUnit(u.id)} title="Supprimer" aria-label="Supprimer" className="text-red-600 hover:text-red-800">
                    🗑️
                  </button>
                </li>
              ))}
              {units.length === 0 && <li className="px-3 py-4 text-center text-sm text-gray-400">Aucune unité enregistrée</li>}
            </ul>
          </div>
        </Modal>
      )}
    </div>
  );
}
