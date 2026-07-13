"use client";

import { useEffect, useState } from "react";
import { Modal } from "@/components/Modal";

type Company = { id: string; name: string };
type Contact = { id: string; name: string; company: Company | null };

type Opportunity = {
  id: string;
  title: string;
  stage: string;
  order: number;
  eventDate: string | null;
  guestCount: number | null;
  amount: number | null;
  notes: string | null;
  company: Company | null;
  contact: Contact | null;
};

const STAGES = [
  { key: "PROSPECT", label: "Prospect", color: "bg-gray-100 text-gray-700" },
  { key: "DEVIS_ENVOYE", label: "Devis envoyé", color: "bg-blue-100 text-blue-700" },
  { key: "CONFIRME", label: "Confirmé", color: "bg-amber-100 text-amber-700" },
  { key: "REALISE", label: "Réalisé", color: "bg-green-100 text-green-700" },
  { key: "PERDU", label: "Perdu", color: "bg-red-100 text-red-700" },
] as const;

type Stage = (typeof STAGES)[number]["key"];

const emptyForm = {
  title: "",
  companyId: "",
  contactId: "",
  stage: "PROSPECT" as Stage,
  eventDate: "",
  guestCount: "",
  amount: "",
  notes: "",
};

function formatDate(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleDateString("fr-FR");
}

export function EvenementsClient() {
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [draggingId, setDraggingId] = useState<string | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Opportunity | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    const [oppRes, companyRes, contactRes] = await Promise.all([
      fetch("/api/crm/opportunities"),
      fetch("/api/crm/companies"),
      fetch("/api/crm/contacts"),
    ]);
    if (oppRes.ok) setOpportunities(await oppRes.json());
    if (companyRes.ok) setCompanies(await companyRes.json());
    if (contactRes.ok) setContacts(await contactRes.json());
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  function openCreate(stage: Stage) {
    setEditing(null);
    setForm({ ...emptyForm, stage });
    setError(null);
    setShowForm(true);
  }

  function openEdit(o: Opportunity) {
    setEditing(o);
    setForm({
      title: o.title,
      companyId: o.company?.id ?? "",
      contactId: o.contact?.id ?? "",
      stage: o.stage as Stage,
      eventDate: o.eventDate ? o.eventDate.slice(0, 10) : "",
      guestCount: o.guestCount != null ? String(o.guestCount) : "",
      amount: o.amount != null ? String(o.amount) : "",
      notes: o.notes ?? "",
    });
    setError(null);
    setShowForm(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const payload = {
      title: form.title,
      companyId: form.companyId || null,
      contactId: form.contactId || null,
      stage: form.stage,
      eventDate: form.eventDate || null,
      guestCount: form.guestCount ? parseInt(form.guestCount, 10) : null,
      amount: form.amount ? parseFloat(form.amount) : null,
      notes: form.notes || null,
    };
    const url = editing ? `/api/crm/opportunities/${editing.id}` : "/api/crm/opportunities";
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

  async function handleDelete(o: Opportunity) {
    if (!confirm(`Supprimer l'événement "${o.title}" ?`)) return;
    const res = await fetch(`/api/crm/opportunities/${o.id}`, { method: "DELETE" });
    if (res.ok) await load();
  }

  async function handleDrop(targetStage: Stage, targetId: string | null) {
    if (!draggingId) return;
    const draggedId = draggingId;
    setDraggingId(null);
    const dragged = opportunities.find((o) => o.id === draggedId);
    if (!dragged) return;

    const targetItems = opportunities
      .filter((o) => o.stage === targetStage && o.id !== draggedId)
      .sort((a, b) => a.order - b.order);
    let insertIndex = targetItems.length;
    if (targetId) {
      const idx = targetItems.findIndex((o) => o.id === targetId);
      if (idx !== -1) insertIndex = idx;
    }
    const reorderedIds = targetItems.map((o) => o.id);
    reorderedIds.splice(insertIndex, 0, draggedId);

    setOpportunities((prev) =>
      prev.map((o) => {
        if (o.id === draggedId) return { ...o, stage: targetStage, order: insertIndex };
        if (o.stage === targetStage) {
          const idx = reorderedIds.indexOf(o.id);
          if (idx !== -1) return { ...o, order: idx };
        }
        return o;
      })
    );

    await fetch("/api/crm/opportunities/reorder", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stage: targetStage, ids: reorderedIds }),
    });
  }

  if (loading) {
    return <p className="text-sm text-gray-500">Chargement...</p>;
  }

  return (
    <div>
      <h1 className="mb-4 text-xl font-bold text-gray-900">Événements</h1>

      <div className="flex gap-4 overflow-x-auto pb-4">
        {STAGES.map(({ key, label, color }) => {
          const items = opportunities
            .filter((o) => o.stage === key)
            .sort((a, b) => a.order - b.order);
          return (
            <div
              key={key}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => handleDrop(key, null)}
              className="w-72 shrink-0"
            >
              <div className="mb-2 flex items-center justify-between">
                <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${color}`}>
                  {label} · {items.length}
                </span>
                <button
                  onClick={() => openCreate(key)}
                  title="Ajouter un événement"
                  aria-label="Ajouter un événement"
                  className="text-gray-400 hover:text-brand-600"
                >
                  ➕
                </button>
              </div>
              <div className="min-h-[100px] space-y-2 rounded-lg bg-gray-50 p-2">
                {items.map((o) => (
                  <div
                    key={o.id}
                    draggable
                    onDragStart={() => setDraggingId(o.id)}
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                    }}
                    onDrop={(e) => {
                      e.stopPropagation();
                      handleDrop(key, o.id);
                    }}
                    onDragEnd={() => setDraggingId(null)}
                    onClick={() => openEdit(o)}
                    className={`cursor-grab rounded-md border border-gray-200 bg-white p-3 text-sm shadow-sm hover:border-brand-300 active:cursor-grabbing ${
                      draggingId === o.id ? "opacity-40" : ""
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-medium text-gray-900">{o.title}</p>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(o);
                        }}
                        title="Supprimer"
                        aria-label="Supprimer"
                        className="shrink-0 text-red-400 hover:text-red-600"
                      >
                        🗑️
                      </button>
                    </div>
                    {o.company && <p className="mt-1 text-xs text-gray-500">🏢 {o.company.name}</p>}
                    {o.eventDate && <p className="text-xs text-gray-500">📅 {formatDate(o.eventDate)}</p>}
                    {o.guestCount != null && <p className="text-xs text-gray-500">👥 {o.guestCount} pers.</p>}
                    {o.amount != null && <p className="text-xs font-medium text-gray-700">💶 {o.amount.toFixed(2)} €</p>}
                  </div>
                ))}
                {items.length === 0 && <p className="py-4 text-center text-xs text-gray-400">Aucun événement</p>}
              </div>
            </div>
          );
        })}
      </div>

      {showForm && (
        <Modal title={editing ? "Modifier l'événement" : "Nouvel événement"} onClose={() => setShowForm(false)}>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Titre</label>
              <input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="ex : Séminaire annuel Société X"
                className="w-full"
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Entreprise (optionnel)</label>
                <select value={form.companyId} onChange={(e) => setForm({ ...form, companyId: e.target.value })} className="w-full">
                  <option value="">— Aucune —</option>
                  {companies.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Contact (optionnel)</label>
                <select value={form.contactId} onChange={(e) => setForm({ ...form, contactId: e.target.value })} className="w-full">
                  <option value="">— Aucun —</option>
                  {contacts.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Statut</label>
              <select value={form.stage} onChange={(e) => setForm({ ...form, stage: e.target.value as Stage })} className="w-full">
                {STAGES.map((s) => (
                  <option key={s.key} value={s.key}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Date événement</label>
                <input
                  type="date"
                  value={form.eventDate}
                  onChange={(e) => setForm({ ...form, eventDate: e.target.value })}
                  className="w-full"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Nb. personnes</label>
                <input
                  type="number"
                  step="1"
                  min="0"
                  value={form.guestCount}
                  onChange={(e) => setForm({ ...form, guestCount: e.target.value })}
                  className="w-full"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Montant (€)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.amount}
                  onChange={(e) => setForm({ ...form, amount: e.target.value })}
                  className="w-full"
                />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Notes (optionnel)</label>
              <textarea
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                rows={3}
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
