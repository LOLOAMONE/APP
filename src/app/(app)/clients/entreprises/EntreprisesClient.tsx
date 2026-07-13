"use client";

import { useEffect, useState } from "react";
import { Modal } from "@/components/Modal";

type Company = {
  id: string;
  name: string;
  sector: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  notes: string | null;
  contacts: { id: string }[];
  opportunities: { id: string }[];
};

const emptyForm = { name: "", sector: "", address: "", phone: "", email: "", notes: "" };

export function EntreprisesClient() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Company | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    const res = await fetch("/api/crm/companies");
    if (res.ok) setCompanies(await res.json());
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

  function openEdit(c: Company) {
    setEditing(c);
    setForm({
      name: c.name,
      sector: c.sector ?? "",
      address: c.address ?? "",
      phone: c.phone ?? "",
      email: c.email ?? "",
      notes: c.notes ?? "",
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
      sector: form.sector || null,
      address: form.address || null,
      phone: form.phone || null,
      email: form.email || null,
      notes: form.notes || null,
    };
    const url = editing ? `/api/crm/companies/${editing.id}` : "/api/crm/companies";
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

  async function handleDelete(c: Company) {
    if (!confirm(`Supprimer l'entreprise "${c.name}" ?`)) return;
    const res = await fetch(`/api/crm/companies/${c.id}`, { method: "DELETE" });
    if (res.ok) await load();
  }

  const filtered = companies.filter((c) => c.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-xl font-bold text-gray-900">Entreprises</h1>
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
                <th>Entreprise</th>
                <th>Secteur</th>
                <th>Téléphone</th>
                <th>Email</th>
                <th>Contacts</th>
                <th>Événements</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <tr key={c.id}>
                  <td className="font-medium">{c.name}</td>
                  <td className="text-gray-500">{c.sector || "—"}</td>
                  <td className="text-gray-500">{c.phone || "—"}</td>
                  <td className="text-gray-500">{c.email || "—"}</td>
                  <td>{c.contacts.length}</td>
                  <td>{c.opportunities.length}</td>
                  <td>
                    <div className="flex justify-end gap-3 whitespace-nowrap text-sm">
                      <button onClick={() => openEdit(c)} title="Modifier" aria-label="Modifier" className="text-brand-600 hover:text-brand-800">
                        ✏️
                      </button>
                      <button onClick={() => handleDelete(c)} title="Supprimer" aria-label="Supprimer" className="text-red-600 hover:text-red-800">
                        🗑️
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-6 text-center text-gray-400">
                    Aucune entreprise
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {showForm && (
        <Modal title={editing ? "Modifier l'entreprise" : "Nouvelle entreprise"} onClose={() => setShowForm(false)}>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Nom de l&apos;entreprise</label>
                <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full" required />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Secteur (optionnel)</label>
                <input value={form.sector} onChange={(e) => setForm({ ...form, sector: e.target.value })} className="w-full" />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Adresse</label>
              <input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} className="w-full" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Téléphone</label>
                <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="w-full" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Email</label>
                <input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="w-full" />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Notes (optionnel)</label>
              <textarea
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                rows={2}
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
    </div>
  );
}
