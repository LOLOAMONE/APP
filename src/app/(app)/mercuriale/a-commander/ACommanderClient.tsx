"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ExternalLink } from "lucide-react";

type SupplierItem = {
  id: string;
  reference: string | null;
  designation: string;
  packaging: string | null;
  orderQuantity: number;
  unitPriceHT: number | null;
  orderedAt: string | null;
  receivedAt: string | null;
};

type Supplier = {
  id: string;
  name: string;
  items: SupplierItem[];
};

function isUrl(value: string | null): value is string {
  return !!value && /^https?:\/\//i.test(value);
}

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

export function ACommanderClient() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const res = await fetch("/api/suppliers");
    if (res.ok) setSuppliers(await res.json());
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  const rows = useMemo(() => {
    const list: { supplier: Supplier; item: SupplierItem }[] = [];
    for (const supplier of suppliers) {
      for (const item of supplier.items) {
        if (item.orderQuantity > 0 && !item.orderedAt) {
          list.push({ supplier, item });
        }
      }
    }
    return list.sort(
      (a, b) => a.supplier.name.localeCompare(b.supplier.name) || a.item.designation.localeCompare(b.item.designation)
    );
  }, [suppliers]);

  async function markOrdered(item: SupplierItem) {
    setSavingId(item.id);
    setSuppliers((prev) =>
      prev.map((s) => ({ ...s, items: s.items.map((i) => (i.id === item.id ? { ...i, orderedAt: todayISO() } : i)) }))
    );
    await fetch(`/api/supplier-items/${item.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        reference: item.reference,
        designation: item.designation,
        packaging: item.packaging,
        orderQuantity: item.orderQuantity,
        unitPriceHT: item.unitPriceHT,
        orderedAt: todayISO(),
        receivedAt: item.receivedAt,
      }),
    });
    setSavingId(null);
    await load();
  }

  return (
    <div>
      <div className="mb-4">
        <Link href="/mercuriale" className="text-sm text-brand-600 hover:text-brand-800">
          ← Retour à la Mercuriale
        </Link>
        <h1 className="mt-1 text-xl font-bold text-gray-900">Commande à faire</h1>
        <p className="mt-1 text-sm text-gray-500">
          Tous les articles avec une quantité à commander, tous fournisseurs confondus. Coche « Commandé » une fois
          la commande passée — la date est enregistrée automatiquement et l&apos;article rejoint le suivi de
          réception dans la Mercuriale.
        </p>
      </div>

      {loading ? (
        <p className="text-sm text-gray-500">Chargement...</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
          <table>
            <thead>
              <tr>
                <th>Commandé</th>
                <th>Fournisseur</th>
                <th>Lien</th>
                <th>Désignation</th>
                <th>Conditionnement</th>
                <th>Quantité</th>
                <th>Prix U. HT</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ supplier, item }) => (
                <tr key={item.id}>
                  <td>
                    <input
                      type="checkbox"
                      checked={false}
                      disabled={savingId === item.id}
                      onChange={() => markOrdered(item)}
                      className="h-4 w-4"
                      aria-label="Marquer comme commandé"
                    />
                  </td>
                  <td className="text-gray-500">{supplier.name}</td>
                  <td>
                    {isUrl(item.reference) && (
                      <a
                        href={item.reference}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 whitespace-nowrap rounded-md border border-gray-300 px-2 py-1 text-xs font-medium text-brand-600 hover:bg-brand-50"
                      >
                        <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                        Voir
                      </a>
                    )}
                  </td>
                  <td className="max-w-xs whitespace-pre-line font-medium">{item.designation}</td>
                  <td className="text-gray-500">{item.packaging || "—"}</td>
                  <td>{item.orderQuantity}</td>
                  <td>{item.unitPriceHT != null ? `${item.unitPriceHT.toFixed(2)} €` : "—"}</td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-6 text-center text-gray-400">
                    Rien à commander pour l&apos;instant.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
