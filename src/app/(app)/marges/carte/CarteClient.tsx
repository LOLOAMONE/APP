"use client";

import { useEffect, useState } from "react";

type Product = {
  id: string;
  name: string;
  category: string;
  priceOnSite: number;
  priceTakeaway: number;
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

function PriceTag({ product }: { product: Product }) {
  if (product.priceOnSite === product.priceTakeaway) {
    return <span className="whitespace-nowrap font-semibold text-brand-700">{product.priceOnSite.toFixed(2)} €</span>;
  }
  return (
    <span className="whitespace-nowrap text-sm font-semibold text-brand-700">
      {product.priceOnSite.toFixed(2)} € <span className="font-normal text-gray-400">sur place</span>
      <span className="mx-1 text-gray-300">·</span>
      {product.priceTakeaway.toFixed(2)} € <span className="font-normal text-gray-400">à emporter</span>
    </span>
  );
}

export function CarteClient() {
  const [products, setProducts] = useState<Product[]>([]);
  const [menus, setMenus] = useState<Menu[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const [pRes, mRes] = await Promise.all([fetch("/api/products"), fetch("/api/menus")]);
      if (pRes.ok) setProducts(await pRes.json());
      if (mRes.ok) setMenus(await mRes.json());
      setLoading(false);
    }
    load();
  }, []);

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
    <div className="mx-auto max-w-2xl">
      <div className="rounded-lg border border-gold-200 bg-white px-6 py-10 shadow-sm sm:px-12">
        <div className="mb-10 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-gold-600">Amoné Nice</p>
          <h1 className="mt-2 font-serif text-3xl font-bold text-brand-700">Notre Carte</h1>
          <div className="mx-auto mt-4 h-px w-16 bg-gold-300" />
        </div>

        <div className="space-y-10">
          {orderedCategories.map((category) => (
            <div key={category}>
              <h2 className="mb-4 text-center text-sm font-semibold uppercase tracking-[0.2em] text-brand-600">
                {category}
              </h2>
              <ul className="space-y-3">
                {map.get(category)!.map((p) => (
                  <li key={p.id} className="flex items-baseline gap-3">
                    <span className="text-gray-800">{p.name}</span>
                    <span className="flex-1 border-b border-dotted border-gray-300" />
                    <PriceTag product={p} />
                  </li>
                ))}
              </ul>
            </div>
          ))}

          {menus.length > 0 && (
            <div>
              <h2 className="mb-4 text-center text-sm font-semibold uppercase tracking-[0.2em] text-brand-600">
                Formules
              </h2>
              <ul className="space-y-4">
                {menus.map((m) => (
                  <li key={m.id}>
                    <div className="flex items-baseline gap-3">
                      <span className="font-medium text-gray-800">{m.name}</span>
                      <span className="flex-1 border-b border-dotted border-gray-300" />
                      <PriceTag
                        product={{ id: m.id, name: m.name, category: "", priceOnSite: m.priceOnSite, priceTakeaway: m.priceTakeaway }}
                      />
                    </div>
                    <p className="mt-0.5 text-xs text-gray-400">
                      {m.items.map((i) => `${i.quantity}× ${i.product.name}`).join(" · ")}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {orderedCategories.length === 0 && menus.length === 0 && (
            <p className="text-center text-sm text-gray-400">Aucun produit à afficher.</p>
          )}
        </div>
      </div>
    </div>
  );
}
