"use client";

import { useEffect, useState } from "react";
import { Check, X } from "lucide-react";

type ProductIngredientRow = {
  quantity: number;
  quantityUnit: string;
  channel: string;
  ingredient: { id: string };
};

type Product = {
  id: string;
  name: string;
  category: string;
  priceOnSite: number;
  priceTakeaway: number;
  ingredients: ProductIngredientRow[];
};

type MenuItemRow = { quantity: number; product: { id: string; name: string } };

type Menu = {
  id: string;
  name: string;
  priceOnSite: number;
  priceTakeaway: number;
  items: MenuItemRow[];
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

type EditTarget = { kind: "product" | "menu"; id: string };

function PriceEditForm({
  priceOnSite,
  priceTakeaway,
  saving,
  onCancel,
  onSave,
}: {
  priceOnSite: number;
  priceTakeaway: number;
  saving: boolean;
  onCancel: () => void;
  onSave: (onSite: number, takeaway: number) => void;
}) {
  const [onSite, setOnSite] = useState(String(priceOnSite));
  const [takeaway, setTakeaway] = useState(String(priceTakeaway));

  return (
    <span className="inline-flex items-center gap-1 whitespace-nowrap">
      <input
        type="number"
        step="0.01"
        min="0"
        value={onSite}
        onChange={(e) => setOnSite(e.target.value)}
        className="w-16 px-1 py-0.5 text-right text-sm"
        title="Prix sur place"
      />
      <input
        type="number"
        step="0.01"
        min="0"
        value={takeaway}
        onChange={(e) => setTakeaway(e.target.value)}
        className="w-16 px-1 py-0.5 text-right text-sm"
        title="Prix à emporter"
      />
      <button
        onClick={() => onSave(parseFloat(onSite) || 0, parseFloat(takeaway) || 0)}
        disabled={saving}
        title="Enregistrer"
        aria-label="Enregistrer"
        className="text-green-600 hover:text-green-800"
      >
        <Check className="h-4 w-4" aria-hidden />
      </button>
      <button onClick={onCancel} title="Annuler" aria-label="Annuler" className="text-gray-400 hover:text-gray-600">
        <X className="h-4 w-4" aria-hidden />
      </button>
    </span>
  );
}

function PriceDisplay({ priceOnSite, priceTakeaway }: { priceOnSite: number; priceTakeaway: number }) {
  if (priceOnSite === priceTakeaway) {
    return <span className="whitespace-nowrap font-semibold text-gray-900">{priceOnSite.toFixed(2)} €</span>;
  }
  return (
    <span className="whitespace-nowrap text-sm font-semibold text-gray-900">
      {priceOnSite.toFixed(2)} € <span className="font-normal text-gray-400">sur place</span>
      <span className="mx-1 text-gray-300">·</span>
      {priceTakeaway.toFixed(2)} € <span className="font-normal text-gray-400">à emporter</span>
    </span>
  );
}

export function CarteClient() {
  const [products, setProducts] = useState<Product[]>([]);
  const [menus, setMenus] = useState<Menu[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<EditTarget | null>(null);
  const [saving, setSaving] = useState(false);

  async function loadAll() {
    setLoading(true);
    const [pRes, mRes] = await Promise.all([fetch("/api/products"), fetch("/api/menus")]);
    if (pRes.ok) setProducts(await pRes.json());
    if (mRes.ok) setMenus(await mRes.json());
    setLoading(false);
  }

  useEffect(() => {
    loadAll();
  }, []);

  async function saveProductPrice(p: Product, priceOnSite: number, priceTakeaway: number) {
    setSaving(true);
    try {
      const res = await fetch(`/api/products/${p.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: p.name,
          category: p.category,
          priceOnSite,
          priceTakeaway,
          ingredients: p.ingredients.map((i) => ({
            ingredientId: i.ingredient.id,
            quantity: i.quantity,
            quantityUnit: i.quantityUnit,
            channel: i.channel,
          })),
        }),
      });
      if (res.ok) {
        setEditing(null);
        await loadAll();
      }
    } finally {
      setSaving(false);
    }
  }

  async function saveMenuPrice(m: Menu, priceOnSite: number, priceTakeaway: number) {
    setSaving(true);
    try {
      const res = await fetch(`/api/menus/${m.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: m.name,
          priceOnSite,
          priceTakeaway,
          items: m.items.map((i) => ({ productId: i.product.id, quantity: i.quantity })),
        }),
      });
      if (res.ok) {
        setEditing(null);
        await loadAll();
      }
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <p className="text-sm text-gray-500">Chargement...</p>;
  }

  const map = new Map<string, Product[]>();
  for (const p of products) {
    if (!map.has(p.category)) map.set(p.category, []);
    map.get(p.category)!.push(p);
  }
  const orderedCategories = [
    ...KNOWN_CATEGORIES.filter((c) => map.has(c)),
    ...Array.from(map.keys()).filter((c) => !KNOWN_CATEGORIES.includes(c)).sort(),
  ];

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="mb-6 text-xl font-bold text-gray-900">Carte</h1>

      <div className="columns-1 gap-x-12 md:columns-2">
        {orderedCategories.map((category) => (
          <div key={category} className="mb-8 break-inside-avoid">
            <h2 className="mb-3 border-b border-gray-200 pb-1 text-sm font-semibold uppercase tracking-wide text-gray-500">
              {category}
            </h2>
            <ul className="space-y-2">
              {map.get(category)!.map((p) => {
                const isEditing = editing?.kind === "product" && editing.id === p.id;
                return (
                  <li key={p.id} className="flex items-baseline gap-3">
                    <span className="text-gray-800">{p.name}</span>
                    <span className="flex-1 border-b border-dotted border-gray-300" />
                    {isEditing ? (
                      <PriceEditForm
                        priceOnSite={p.priceOnSite}
                        priceTakeaway={p.priceTakeaway}
                        saving={saving}
                        onCancel={() => setEditing(null)}
                        onSave={(onSite, takeaway) => saveProductPrice(p, onSite, takeaway)}
                      />
                    ) : (
                      <button
                        onClick={() => setEditing({ kind: "product", id: p.id })}
                        title="Modifier le prix"
                        className="hover:opacity-70"
                      >
                        <PriceDisplay priceOnSite={p.priceOnSite} priceTakeaway={p.priceTakeaway} />
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        ))}

        {menus.length > 0 && (
          <div className="mb-8 break-inside-avoid">
            <h2 className="mb-3 border-b border-gray-200 pb-1 text-sm font-semibold uppercase tracking-wide text-gray-500">
              Formules
            </h2>
            <ul className="space-y-3">
              {menus.map((m) => {
                const isEditing = editing?.kind === "menu" && editing.id === m.id;
                return (
                  <li key={m.id}>
                    <div className="flex items-baseline gap-3">
                      <span className="font-medium text-gray-800">{m.name}</span>
                      <span className="flex-1 border-b border-dotted border-gray-300" />
                      {isEditing ? (
                        <PriceEditForm
                          priceOnSite={m.priceOnSite}
                          priceTakeaway={m.priceTakeaway}
                          saving={saving}
                          onCancel={() => setEditing(null)}
                          onSave={(onSite, takeaway) => saveMenuPrice(m, onSite, takeaway)}
                        />
                      ) : (
                        <button
                          onClick={() => setEditing({ kind: "menu", id: m.id })}
                          title="Modifier le prix"
                          className="hover:opacity-70"
                        >
                          <PriceDisplay priceOnSite={m.priceOnSite} priceTakeaway={m.priceTakeaway} />
                        </button>
                      )}
                    </div>
                    <p className="mt-0.5 text-xs text-gray-400">
                      {m.items.map((i) => `${i.quantity}× ${i.product.name}`).join(" · ")}
                    </p>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        {orderedCategories.length === 0 && menus.length === 0 && (
          <p className="text-sm text-gray-400">Aucun produit à afficher.</p>
        )}
      </div>
    </div>
  );
}
