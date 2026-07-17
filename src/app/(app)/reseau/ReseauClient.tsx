"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/Modal";

type Restaurant = {
  id: string;
  name: string;
  slug: string;
  status: string;
  userCount: number;
  employeeCount: number;
};

export function ReseauClient() {
  const router = useRouter();
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(true);
  const [switchingId, setSwitchingId] = useState<string | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    const res = await fetch("/api/restaurants");
    if (res.ok) setRestaurants(await res.json());
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/restaurants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Erreur lors de la création");
        return;
      }
      setShowForm(false);
      setName("");
      await load();
    } finally {
      setSaving(false);
    }
  }

  async function enterManagerView(restaurantId: string) {
    setSwitchingId(restaurantId);
    try {
      await fetch("/api/session/switch-restaurant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ restaurantId }),
      });
      router.push("/marges");
      router.refresh();
    } finally {
      setSwitchingId(null);
    }
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Restaurants</h1>
          <p className="mt-1 text-sm text-gray-500">Tous les restaurants du réseau Amoné.</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="whitespace-nowrap rounded-md bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
        >
          + Nouveau restaurant
        </button>
      </div>

      {loading ? (
        <p className="text-sm text-gray-500">Chargement...</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
          <table>
            <thead>
              <tr>
                <th>Nom</th>
                <th>Statut</th>
                <th>Utilisateurs</th>
                <th>Employés</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {restaurants.map((r) => (
                <tr key={r.id}>
                  <td className="font-medium">{r.name}</td>
                  <td className="text-gray-500">{r.status}</td>
                  <td>{r.userCount}</td>
                  <td>{r.employeeCount}</td>
                  <td>
                    <div className="flex justify-end">
                      <button
                        onClick={() => enterManagerView(r.id)}
                        disabled={switchingId === r.id}
                        className="whitespace-nowrap rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                      >
                        {switchingId === r.id ? "..." : "Entrer en mode gérant"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {restaurants.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-6 text-center text-gray-400">
                    Aucun restaurant
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {showForm && (
        <Modal title="Nouveau restaurant" onClose={() => setShowForm(false)}>
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Nom</label>
              <input value={name} onChange={(e) => setName(e.target.value)} className="w-full" required />
            </div>
            <p className="text-xs text-gray-400">
              Une liste de base d&apos;unités et de conditionnements est créée automatiquement pour ce restaurant,
              modifiable librement ensuite. Pour lui attribuer un gérant, passe par Réseau → Utilisateurs une fois le
              restaurant créé.
            </p>

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
                {saving ? "Création..." : "Créer"}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
