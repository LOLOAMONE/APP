"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Calendar,
  Check,
  ClipboardList,
  ExternalLink,
  Mail,
  Package,
  Pencil,
  Phone,
  RotateCcw,
  StickyNote,
  Tag,
  Trash2,
  X,
} from "lucide-react";
import { Modal } from "@/components/Modal";

type SupplierItem = {
  id: string;
  supplierId: string;
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
const CATEGORY_FALLBACK = "Sans catégorie";

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

export function MercurialeClient() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [units, setUnits] = useState<PackagingUnitRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [editingCategoryTab, setEditingCategoryTab] = useState<string | null>(null);
  const [editingCategoryLabel, setEditingCategoryLabel] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [sortKey, setSortKey] = useState<ItemSortKey>("custom");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [draggingId, setDraggingId] = useState<string | null>(null);

  const [showSupplierForm, setShowSupplierForm] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [supplierForm, setSupplierForm] = useState(emptySupplierForm);

  const [showItemForm, setShowItemForm] = useState(false);
  const [editingItem, setEditingItem] = useState<SupplierItem | null>(null);
  const [itemFormSupplierId, setItemFormSupplierId] = useState<string | null>(null);
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
      const hasReal = data.some((s) => s.category);
      if (hasReal) {
        const cats = Array.from(new Set(data.map((s) => s.category || SUPPLIER_CATEGORY_FALLBACK)));
        setSelectedCategory((prev) => (prev && cats.includes(prev) ? prev : data.find((s) => s.category)?.category ?? cats[0]));
      }
    }
    if (unitRes.ok) setUnits(await unitRes.json());
    setLoading(false);
  }

  useEffect(() => {
    loadAll();
  }, []);

  const selected = suppliers.find((s) => s.id === selectedId) ?? null;
  const categoryMode = suppliers.some((s) => s.category);

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

  const activeSuppliers = categoryMode
    ? groupedSuppliers.find((g) => g.category === selectedCategory)?.suppliers ?? []
    : selected
    ? [selected]
    : [];

  const supplierCategorySuggestions = useMemo(
    () => Array.from(new Set(suppliers.map((s) => s.category).filter((c): c is string => !!c))),
    [suppliers]
  );

  const toOrderCount = useMemo(
    () => suppliers.reduce((sum, s) => sum + s.items.filter((i) => i.orderQuantity > 0 && !i.orderedAt).length, 0),
    [suppliers]
  );

  const dragEnabled = sortKey === "custom" && search === "" && statusFilter === "ALL";

  function getDisplayedItems(supplier: Supplier): SupplierItem[] {
    const q = search.toLowerCase();
    const filtered = supplier.items.filter(
      (i) => (i.designation.toLowerCase().includes(q) || (i.reference ?? "").toLowerCase().includes(q)) && (statusFilter === "ALL" || (statusFilter === "PENDING" && !!i.orderedAt && !i.receivedAt) || (statusFilter === "TO_ORDER" && i.orderQuantity > 0 && !i.orderedAt))
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
  }

  function getGroupedItems(supplier: Supplier) {
    const displayed = getDisplayedItems(supplier);
    const map = new Map<string, SupplierItem[]>();
    for (const item of displayed) {
      const cat = item.category || CATEGORY_FALLBACK;
      if (!map.has(cat)) map.set(cat, []);
      map.get(cat)!.push(item);
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
  }

  function categorySuggestionsFor(supplier: Supplier | null): string[] {
    return Array.from(new Set((supplier?.items ?? []).map((i) => i.category).filter((c): c is string => !!c)));
  }

  function openCreateSupplier() {
    setEditingSupplier(null);
    setSupplierForm({
      ...emptySupplierForm,
      category: categoryMode && selectedCategory && selectedCategory !== SUPPLIER_CATEGORY_FALLBACK ? selectedCategory : "",
    });
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
      if (!editingSupplier) {
        setSelectedId(saved.id);
        setSelectedCategory(saved.category || SUPPLIER_CATEGORY_FALLBACK);
      }
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

  function startEditCategoryTab(category: string) {
    setEditingCategoryTab(category);
    setEditingCategoryLabel(category);
  }

  async function saveEditCategoryTab(oldName: string) {
    const newName = editingCategoryLabel.trim();
    if (!newName || newName === oldName) {
      setEditingCategoryTab(null);
      return;
    }
    const group = groupedSuppliers.find((g) => g.category === oldName);
    if (!group) {
      setEditingCategoryTab(null);
      return;
    }
    await Promise.all(
      group.suppliers.map((s) =>
        fetch(`/api/suppliers/${s.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: s.name,
            category: newName,
            orderSchedule: s.orderSchedule,
            minimumOrder: s.minimumOrder,
            email: s.email,
            phone: s.phone,
            clientCode: s.clientCode,
            notes: s.notes,
          }),
        })
      )
    );
    setEditingCategoryTab(null);
    if (selectedCategory === oldName) setSelectedCategory(newName);
    await loadAll();
  }

  async function handleItemDrop(supplier: Supplier, category: string | null, targetId: string) {
    if (!draggingId || draggingId === targetId) {
      setDraggingId(null);
      return;
    }
    const grouped = getGroupedItems(supplier);
    const group = grouped.find((g) => g.category === category);
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
    supplier.items.forEach((it, idx) => {
      if (matches(it)) indices.push(idx);
    });
    const newItems = [...supplier.items];
    indices.forEach((idx, i) => {
      newItems[idx] = reordered[i];
    });
    setSuppliers((prev) => prev.map((s) => (s.id === supplier.id ? { ...s, items: newItems } : s)));
    setDraggingId(null);
    await fetch(`/api/suppliers/${supplier.id}/items/reorder`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: reordered.map((i) => i.id) }),
    });
  }

  function openCreateItem(supplierId: string) {
    setItemFormSupplierId(supplierId);
    setEditingItem(null);
    setItemForm(emptyItemForm);
    setError(null);
    setShowItemForm(true);
  }

  function openEditItem(i: SupplierItem) {
    setItemFormSupplierId(i.supplierId);
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
    if (!itemFormSupplierId) return;
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
    const url = editingItem ? `/api/supplier-items/${editingItem.id}` : `/api/suppliers/${itemFormSupplierId}/items`;
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

  async function updateItem(item: SupplierItem, patch: Partial<SupplierItem>) {
    setError(null);
    try {
      const res = await fetch(`/api/supplier-items/${item.id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(patch),
      });
      if (!res.ok) throw new Error("L’article n’a pas pu être enregistré.");
      const updated = await res.json();
      setSuppliers((prev) => prev.map((supplier) => ({ ...supplier, items: supplier.items.map((i) => i.id === item.id ? updated : i) })));
    } catch (e) { setError(e instanceof Error ? e.message : "Connexion indisponible."); await loadAll(); }
  }

  async function handleDateChange(i: SupplierItem, field: "orderedAt" | "receivedAt", value: string) {
    await updateItem(i, { [field]: value || null });
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

  function renderSupplierPanel(supplier: Supplier, standalone: boolean) {
    const grouped = getGroupedItems(supplier);
    const displayed = getDisplayedItems(supplier);
    const pending = pendingCount(supplier);

    return (
      <div key={supplier.id} className={standalone ? "" : "mb-10"}>
        {!standalone && (
          <div
            draggable
            onDragStart={() => setDraggingId(supplier.id)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => handleSupplierDrop(supplier.category || SUPPLIER_CATEGORY_FALLBACK, supplier.id)}
            onDragEnd={() => setDraggingId(null)}
            title="Glisser pour réordonner"
            className={`mb-2 flex cursor-grab select-none items-center gap-2 active:cursor-grabbing ${
              draggingId === supplier.id ? "opacity-40" : ""
            }`}
          >
            <h2 className="text-lg font-bold text-gray-900">{supplier.name}</h2>
            {pending > 0 && (
              <span
                title={`${pending} article(s) commandé(s) en attente de réception`}
                className="rounded-full bg-orange-100 px-1.5 py-0.5 text-xs font-semibold text-orange-700"
              >
                <Package className="mr-0.5 inline h-3 w-3" aria-hidden />
                {pending}
              </span>
            )}
          </div>
        )}

        <div className="mb-4 flex flex-col justify-between gap-3 rounded-lg border border-gray-200 bg-white p-4 sm:flex-row sm:items-start">
          <div className="grid gap-x-6 gap-y-1.5 text-sm text-gray-600 sm:grid-cols-2">
            {supplier.orderSchedule && (
              <p className="flex items-start gap-2">
                <Calendar className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" aria-hidden />
                <span>{supplier.orderSchedule}</span>
              </p>
            )}
            {supplier.minimumOrder && (
              <p className="flex items-start gap-2">
                <Package className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" aria-hidden />
                <span>Franco : {supplier.minimumOrder}</span>
              </p>
            )}
            {supplier.email && (
              <p className="flex items-start gap-2">
                <Mail className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" aria-hidden />
                <span>{supplier.email}</span>
              </p>
            )}
            {supplier.phone && (
              <p className="flex items-start gap-2">
                <Phone className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" aria-hidden />
                <span>{supplier.phone}</span>
              </p>
            )}
            {supplier.clientCode && (
              <p className="flex items-start gap-2">
                <Tag className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" aria-hidden />
                <span>Code client : {supplier.clientCode}</span>
              </p>
            )}
            {supplier.notes && (
              <p className="flex items-start gap-2 sm:col-span-2">
                <StickyNote className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" aria-hidden />
                <span className="whitespace-pre-line">{supplier.notes}</span>
              </p>
            )}
            {!supplier.orderSchedule &&
              !supplier.minimumOrder &&
              !supplier.email &&
              !supplier.phone &&
              !supplier.clientCode &&
              !supplier.notes && <p className="text-gray-400">Aucune information renseignée.</p>}
          </div>
          <div className="flex shrink-0 gap-3 text-sm">
            <button onClick={() => openEditSupplier(supplier)} title="Modifier" aria-label="Modifier" className="text-brand-600 hover:text-brand-800">
              <Pencil className="h-4 w-4" aria-hidden />
            </button>
            <button onClick={() => handleDeleteSupplier(supplier)} title="Supprimer" aria-label="Supprimer" className="text-brand-600 hover:text-brand-800">
              <Trash2 className="h-4 w-4" aria-hidden />
            </button>
          </div>
        </div>

        {standalone ? (
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
                  className="inline-flex items-center gap-1 whitespace-nowrap text-sm text-gray-500 hover:text-gray-700"
                >
                  <RotateCcw className="h-3.5 w-3.5" aria-hidden />
                  Ordre personnalisé
                </button>
              )}
              <button
                onClick={() => openCreateItem(supplier.id)}
                className="whitespace-nowrap rounded-md bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
              >
                + Article
              </button>
            </div>
          </div>
        ) : (
          <div className="mb-2 flex justify-end">
            <button
              onClick={() => openCreateItem(supplier.id)}
              className="whitespace-nowrap rounded-md bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
            >
              + Article
            </button>
          </div>
        )}

        {standalone && !dragEnabled && (
          <p className="mb-2 text-xs text-gray-400">
            {search
              ? "Le glisser-déposer est désactivé pendant une recherche."
              : "Clique sur « Ordre personnalisé » pour réactiver le glisser-déposer."}
          </p>
        )}

        <div className="space-y-6">
          {grouped.map(({ category, items }) => (
            <div key={category ?? "__flat__"}>
              {category !== null && (
                <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-gray-500">{category}</h3>
              )}
              <div className="grid gap-3 lg:grid-cols-2">
                {items.map((i) => <article key={i.id}
                  draggable={dragEnabled}
                  onDragStart={() => dragEnabled && setDraggingId(i.id)}
                  onDragOver={(e) => dragEnabled && e.preventDefault()}
                  onDrop={() => dragEnabled && handleItemDrop(supplier, category, i.id)}
                  onDragEnd={() => setDraggingId(null)}
                  className={`rounded-2xl border bg-white p-4 ${i.orderedAt && !i.receivedAt ? "border-orange-200" : "border-gray-200"} ${draggingId === i.id ? "opacity-40" : ""}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0"><h4 className="whitespace-pre-line text-sm font-semibold text-gray-900">{i.designation}</h4><p className="mt-1 text-xs leading-5 text-gray-400">{i.packaging || "Conditionnement à préciser"}{i.reference && !isUrl(i.reference) ? ` · Réf. ${i.reference}` : ""}</p></div>
                    <div className="flex shrink-0 gap-1"><button className="rounded-lg p-2 text-gray-400 hover:bg-brand-50 hover:text-brand-600" onClick={() => openEditItem(i)} aria-label={`Modifier ${i.designation}`}><Pencil className="h-4 w-4" /></button><button className="rounded-lg p-2 text-gray-400 hover:bg-red-50 hover:text-red-600" onClick={() => handleDeleteItem(i)} aria-label={`Supprimer ${i.designation}`}><Trash2 className="h-4 w-4" /></button></div>
                  </div>
                  <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-2"><div><span className="block text-[10px] uppercase tracking-wide text-gray-400">Unité HT</span><span className="text-sm font-semibold">{i.unitPriceHT != null ? `${i.unitPriceHT.toFixed(2)} €` : "—"}</span></div><div><span className="block text-[10px] uppercase tracking-wide text-gray-400">Colis HT</span><span className="text-sm font-semibold">{i.casePriceHT != null ? `${i.casePriceHT.toFixed(2)} €` : "—"}</span></div>{isUrl(i.reference) && <a href={i.reference} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-brand-600"><ExternalLink className="h-3 w-3" />Voir l’article</a>}</div>
                  <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 pt-3"><label className="flex items-center gap-2 text-xs text-gray-500">À commander<input aria-label={`Quantité à commander : ${i.designation}`} type="number" step="any" min="0" disabled={!!i.orderedAt && !i.receivedAt} defaultValue={i.orderQuantity} key={`${i.id}-${i.orderQuantity}`} onBlur={(e) => { const n = Number(e.target.value); if (Number.isFinite(n) && n >= 0 && n !== i.orderQuantity) updateItem(i, { orderQuantity: n, ...(i.receivedAt ? { orderedAt: null, receivedAt: null } : {}) }); }} className="w-20 !text-sm" /></label><span className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${i.receivedAt ? "bg-green-50 text-green-700" : i.orderedAt ? "bg-orange-50 text-orange-700" : i.orderQuantity > 0 ? "bg-brand-50 text-brand-700" : "bg-gray-50 text-gray-400"}`}>{i.receivedAt ? "Reçu" : i.orderedAt ? "En attente de réception" : i.orderQuantity > 0 ? "À commander" : "Au catalogue"}</span></div>
                  {(i.orderedAt || i.receivedAt) && <div className="mt-3 grid gap-3 sm:grid-cols-2"><label className="text-[10px] text-gray-400">Commandé le<input type="date" aria-label={`Date de commande : ${i.designation}`} value={toDateInputValue(i.orderedAt)} onChange={(e) => handleDateChange(i, "orderedAt", e.target.value)} className="mt-1 w-full !text-xs" /></label><label className="text-[10px] text-gray-400">Reçu le<input type="date" aria-label={`Date de réception : ${i.designation}`} value={toDateInputValue(i.receivedAt)} onChange={(e) => handleDateChange(i, "receivedAt", e.target.value)} className="mt-1 w-full !text-xs" /></label>{i.orderedAt && !i.receivedAt && <button className="rounded-lg bg-green-50 px-3 py-2 text-xs font-medium text-green-700 sm:col-span-2" onClick={() => handleDateChange(i, "receivedAt", todayISO())}>Marquer comme reçu</button>}</div>}
                </article>)}
              </div>
            </div>
          ))}
          {displayed.length === 0 && <p className="py-6 text-center text-gray-400">Aucun article</p>}
        </div>
      </div>
    );
  }

  const itemFormSupplier = suppliers.find((s) => s.id === itemFormSupplierId) ?? null;

  return (
    <div>
      <div className="mb-7 flex flex-wrap items-start justify-between gap-4">
        <div><p className="mb-2 text-xs font-semibold uppercase tracking-widest text-brand-600">Vos achats, plus simplement</p><h1 className="text-3xl font-semibold tracking-tight text-gray-900">Mercuriale</h1><p className="mt-2 text-sm text-gray-500">Votre catalogue, vos prix et les livraisons à réceptionner.</p></div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/mercuriale/a-commander"
            className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-md border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            <ClipboardList className="h-4 w-4" aria-hidden />
            Préparer une commande
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

      {error && !showSupplierForm && !showItemForm && <p role="alert" className="mb-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      <div className="mb-6 flex flex-wrap gap-2 rounded-2xl border border-gray-200 bg-white p-3">{[{ key: "ALL", label: `Catalogue · ${suppliers.reduce((n, s) => n + s.items.length, 0)}` }, { key: "TO_ORDER", label: `À commander · ${toOrderCount}` }, { key: "PENDING", label: `À réceptionner · ${suppliers.reduce((n, s) => n + pendingCount(s), 0)}` }].map((f) => <button key={f.key} onClick={() => setStatusFilter(f.key)} className={`rounded-xl px-4 py-2 text-sm font-medium ${statusFilter === f.key ? "bg-brand-50 text-brand-700" : "text-gray-500 hover:bg-gray-50"}`}>{f.label}</button>)}<select aria-label="Trier les articles" value={sortKey} onChange={(e) => { setSortKey(e.target.value as ItemSortKey); setSortDir("asc"); }} className="ml-auto !text-sm"><option value="custom">Ordre personnalisé</option><option value="designation">Nom A → Z</option><option value="unitPriceHT">Prix unitaire croissant</option><option value="casePriceHT">Prix colis croissant</option></select></div>

      {categoryMode ? (
        <>
          <div className="mb-6 flex flex-wrap items-center gap-2 border-b border-gray-200 pb-4">
            {groupedSuppliers.map(({ category }) => {
              const isRenamable = category !== null && category !== SUPPLIER_CATEGORY_FALLBACK;
              if (editingCategoryTab === category && category !== null) {
                return (
                  <span key={category} className="inline-flex items-center gap-1">
                    <input
                      autoFocus
                      value={editingCategoryLabel}
                      onChange={(e) => setEditingCategoryLabel(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && saveEditCategoryTab(category)}
                      className="w-32 text-sm"
                    />
                    <button onClick={() => saveEditCategoryTab(category)} title="Enregistrer" aria-label="Enregistrer" className="text-green-600 hover:text-green-800">
                      <Check className="h-4 w-4" aria-hidden />
                    </button>
                    <button onClick={() => setEditingCategoryTab(null)} title="Annuler" aria-label="Annuler" className="text-gray-400 hover:text-gray-600">
                      <X className="h-4 w-4" aria-hidden />
                    </button>
                  </span>
                );
              }
              return (
                <span key={category} className="inline-flex items-center">
                  <button
                    onClick={() => setSelectedCategory(category)}
                    className={`rounded-md px-3 py-1.5 text-sm font-medium ${
                      selectedCategory === category ? "bg-brand-50 text-brand-700" : "text-gray-600 hover:bg-gray-100"
                    }`}
                  >
                    {category}
                  </button>
                  {isRenamable && (
                    <button
                      onClick={() => startEditCategoryTab(category)}
                      title="Renommer la catégorie"
                      aria-label="Renommer la catégorie"
                      className="ml-0.5 text-gray-300 hover:text-brand-600"
                    >
                      <Pencil className="h-3.5 w-3.5" aria-hidden />
                    </button>
                  )}
                </span>
              );
            })}
          </div>

          {activeSuppliers.length > 0 && (
            <>
              <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <input
                  placeholder="Rechercher un article..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full sm:w-64"
                />
                {sortKey !== "custom" && (
                  <button
                    onClick={() => setSortKey("custom")}
                    className="inline-flex items-center gap-1 whitespace-nowrap text-sm text-gray-500 hover:text-gray-700"
                  >
                    <RotateCcw className="h-3.5 w-3.5" aria-hidden />
                    Ordre personnalisé
                  </button>
                )}
              </div>
              {!dragEnabled && (
                <p className="mb-4 text-xs text-gray-400">
                  {search
                    ? "Le glisser-déposer est désactivé pendant une recherche."
                    : "Clique sur « Ordre personnalisé » pour réactiver le glisser-déposer."}
                </p>
              )}
              {activeSuppliers.map((s) => renderSupplierPanel(s, false))}
            </>
          )}
        </>
      ) : (
        <>
          <div className="mb-6 flex flex-wrap gap-2 border-b border-gray-200 pb-4">
            {suppliers.map((s) => {
              const pending = pendingCount(s);
              return (
                <button
                  key={s.id}
                  draggable
                  onDragStart={() => setDraggingId(s.id)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => handleSupplierDrop(null, s.id)}
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
                      className="ml-1.5 inline-flex items-center gap-0.5 rounded-full bg-orange-100 px-1.5 py-0.5 text-xs font-semibold text-orange-700"
                    >
                      <Package className="h-3 w-3" aria-hidden />
                      {pending}
                    </span>
                  )}
                </button>
              );
            })}
            {suppliers.length === 0 && (
              <p className="text-sm text-gray-400">Aucun fournisseur. Ajoutez-en un pour commencer.</p>
            )}
          </div>

          {selected && renderSupplierPanel(selected, true)}
        </>
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
              <label className="mb-1 flex items-center gap-1.5 text-sm font-medium text-gray-700">
                <Calendar className="h-4 w-4 text-gray-400" aria-hidden />
                Commande &amp; livraison
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
                <label className="mb-1 flex items-center gap-1.5 text-sm font-medium text-gray-700">
                  <Package className="h-4 w-4 text-gray-400" aria-hidden />
                  Franco / minimum
                </label>
                <input
                  placeholder="ex : 400€ HT ou 10 Bibs"
                  value={supplierForm.minimumOrder}
                  onChange={(e) => setSupplierForm({ ...supplierForm, minimumOrder: e.target.value })}
                  className="w-full"
                />
              </div>
              <div>
                <label className="mb-1 flex items-center gap-1.5 text-sm font-medium text-gray-700">
                  <Tag className="h-4 w-4 text-gray-400" aria-hidden />
                  Code client
                </label>
                <input
                  value={supplierForm.clientCode}
                  onChange={(e) => setSupplierForm({ ...supplierForm, clientCode: e.target.value })}
                  className="w-full"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 flex items-center gap-1.5 text-sm font-medium text-gray-700">
                  <Mail className="h-4 w-4 text-gray-400" aria-hidden />
                  Email
                </label>
                <input
                  value={supplierForm.email}
                  onChange={(e) => setSupplierForm({ ...supplierForm, email: e.target.value })}
                  className="w-full"
                />
              </div>
              <div>
                <label className="mb-1 flex items-center gap-1.5 text-sm font-medium text-gray-700">
                  <Phone className="h-4 w-4 text-gray-400" aria-hidden />
                  Téléphone
                </label>
                <input
                  value={supplierForm.phone}
                  onChange={(e) => setSupplierForm({ ...supplierForm, phone: e.target.value })}
                  className="w-full"
                />
              </div>
            </div>
            <div>
              <label className="mb-1 flex items-center gap-1.5 text-sm font-medium text-gray-700">
                <StickyNote className="h-4 w-4 text-gray-400" aria-hidden />
                Notes (optionnel)
              </label>
              <textarea
                value={supplierForm.notes}
                onChange={(e) => setSupplierForm({ ...supplierForm, notes: e.target.value })}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                rows={2}
              />
            </div>

            {error && <p className="text-sm text-brand-600">{error}</p>}

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

      {showItemForm && itemFormSupplier && (
        <Modal title={editingItem ? "Modifier l'article" : `Nouvel article — ${itemFormSupplier.name}`} onClose={() => setShowItemForm(false)}>
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
                  {categorySuggestionsFor(itemFormSupplier).map((c) => (
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

            {error && <p className="text-sm text-brand-600">{error}</p>}

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
                  <button onClick={() => handleDeleteUnit(u.id)} title="Supprimer" aria-label="Supprimer" className="text-brand-600 hover:text-brand-800">
                    <Trash2 className="h-4 w-4" aria-hidden />
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
