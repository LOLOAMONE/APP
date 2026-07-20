"use client";

import { useEffect, useState } from "react";
import { Plus, Send } from "lucide-react";
import { Modal } from "@/components/Modal";
import { usePolling } from "@/hooks/usePolling";

type RestaurantSummary = { id: string; name: string; role: "ADMIN" | "EMPLOYEE" };

type Ticket = {
  id: string;
  subject: string;
  description: string;
  status: (typeof STATUSES)[number]["key"];
  category: string | null;
  createdAt: string;
  updatedAt: string;
  restaurant: { id: string; name: string };
  createdBy: { id: string; username: string } | null;
  _count: { messages: number };
};

type TicketMessage = {
  id: string;
  content: string;
  createdAt: string;
  sender: { id: string; username: string } | null;
};

type TicketDetail = Ticket & { messages: TicketMessage[] };

const STATUSES = [
  { key: "OPEN", label: "Ouvert", color: "bg-blue-100 text-blue-700" },
  { key: "IN_PROGRESS", label: "En cours", color: "bg-amber-100 text-amber-700" },
  { key: "RESOLVED", label: "Résolu", color: "bg-green-100 text-green-700" },
  { key: "CLOSED", label: "Fermé", color: "bg-gray-100 text-gray-700" },
] as const;

function statusMeta(status: string) {
  return STATUSES.find((s) => s.key === status) ?? STATUSES[0];
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" });
}

export function TicketsClient({
  hasGlobalAccess,
  restaurants,
  canCreate,
}: {
  hasGlobalAccess: boolean;
  restaurants: RestaurantSummary[];
  canCreate: boolean;
}) {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");
  const [restaurantFilter, setRestaurantFilter] = useState("");

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selected, setSelected] = useState<TicketDetail | null>(null);

  const [showCreate, setShowCreate] = useState(false);
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);
  const [changingStatus, setChangingStatus] = useState(false);

  async function loadList() {
    const params = new URLSearchParams();
    if (statusFilter) params.set("status", statusFilter);
    if (hasGlobalAccess && restaurantFilter) params.set("restaurantId", restaurantFilter);
    const res = await fetch(`/api/tickets?${params.toString()}`);
    if (res.ok) {
      const data = await res.json();
      setTickets(data.tickets);
    }
    setLoadingList(false);
  }

  async function loadSelected(id: string) {
    const res = await fetch(`/api/tickets/${id}`);
    if (res.ok) setSelected(await res.json());
  }

  useEffect(() => {
    setLoadingList(true);
    loadList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, restaurantFilter]);

  useEffect(() => {
    if (selectedId) loadSelected(selectedId);
    else setSelected(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);

  usePolling(loadList, 10000, true);
  usePolling(() => selectedId && loadSelected(selectedId), 6000, !!selectedId);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    setCreateError(null);
    try {
      const res = await fetch("/api/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject, description, category: category || undefined }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setCreateError(data.error || "Erreur lors de la création");
        return;
      }
      const created = await res.json();
      setShowCreate(false);
      setSubject("");
      setDescription("");
      setCategory("");
      await loadList();
      setSelectedId(created.id);
    } finally {
      setCreating(false);
    }
  }

  async function handleReply(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedId || !reply.trim()) return;
    setSending(true);
    try {
      const res = await fetch(`/api/tickets/${selectedId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: reply }),
      });
      if (res.ok) {
        setReply("");
        await loadSelected(selectedId);
        await loadList();
      }
    } finally {
      setSending(false);
    }
  }

  async function handleStatusChange(status: string) {
    if (!selectedId) return;
    setChangingStatus(true);
    try {
      const res = await fetch(`/api/tickets/${selectedId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        await loadSelected(selectedId);
        await loadList();
      }
    } finally {
      setChangingStatus(false);
    }
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Tickets</h1>
          <p className="mt-1 text-sm text-gray-500">
            {hasGlobalAccess ? "Demandes de tous les restaurants du réseau." : "Vos demandes vers la maison mère."}
          </p>
        </div>
        {canCreate && (
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-1.5 whitespace-nowrap rounded-md bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
          >
            <Plus className="h-4 w-4" aria-hidden />
            Nouveau ticket
          </button>
        )}
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="w-auto text-sm">
          <option value="">Tous les statuts</option>
          {STATUSES.map((s) => (
            <option key={s.key} value={s.key}>
              {s.label}
            </option>
          ))}
        </select>
        {hasGlobalAccess && (
          <select
            value={restaurantFilter}
            onChange={(e) => setRestaurantFilter(e.target.value)}
            className="w-auto text-sm"
          >
            <option value="">Tous les restaurants</option>
            {restaurants.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
        )}
      </div>

      <div className="flex flex-col gap-4 md:flex-row">
        <div className="w-full shrink-0 overflow-hidden rounded-lg border border-gray-200 bg-white md:w-96">
          {loadingList ? (
            <p className="p-4 text-sm text-gray-500">Chargement...</p>
          ) : tickets.length === 0 ? (
            <p className="p-4 text-sm text-gray-400">Aucun ticket</p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {tickets.map((t) => {
                const meta = statusMeta(t.status);
                return (
                  <li key={t.id}>
                    <button
                      onClick={() => setSelectedId(t.id)}
                      className={`block w-full px-4 py-3 text-left hover:bg-gray-50 ${
                        selectedId === t.id ? "bg-brand-50" : ""
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate text-sm font-medium text-gray-900">{t.subject}</span>
                        <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${meta.color}`}>
                          {meta.label}
                        </span>
                      </div>
                      <div className="mt-1 flex items-center justify-between text-xs text-gray-500">
                        <span>{hasGlobalAccess ? t.restaurant.name : t.createdBy?.username ?? "—"}</span>
                        <span>{formatDateTime(t.updatedAt)}</span>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="min-w-0 flex-1 rounded-lg border border-gray-200 bg-white">
          {!selected ? (
            <p className="p-6 text-sm text-gray-400">Sélectionne un ticket pour voir la discussion.</p>
          ) : (
            <div className="flex h-full flex-col">
              <div className="border-b border-gray-100 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-base font-semibold text-gray-900">{selected.subject}</h2>
                    <p className="mt-0.5 text-xs text-gray-500">
                      {selected.restaurant.name} · {selected.createdBy?.username ?? "auteur supprimé"} ·{" "}
                      {formatDateTime(selected.createdAt)}
                      {selected.category ? ` · ${selected.category}` : ""}
                    </p>
                  </div>
                  {hasGlobalAccess ? (
                    <select
                      value={selected.status}
                      disabled={changingStatus}
                      onChange={(e) => handleStatusChange(e.target.value)}
                      className="w-auto text-sm disabled:opacity-50"
                    >
                      {STATUSES.map((s) => (
                        <option key={s.key} value={s.key}>
                          {s.label}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusMeta(selected.status).color}`}>
                      {statusMeta(selected.status).label}
                    </span>
                  )}
                </div>
                <p className="mt-3 whitespace-pre-wrap text-sm text-gray-700">{selected.description}</p>
              </div>

              <div className="flex-1 space-y-3 overflow-y-auto p-4">
                {selected.messages.length === 0 && (
                  <p className="text-sm text-gray-400">Aucune réponse pour l&apos;instant.</p>
                )}
                {selected.messages.map((m) => (
                  <div key={m.id} className="rounded-md bg-gray-50 p-3">
                    <div className="mb-1 flex items-center justify-between text-xs text-gray-500">
                      <span className="font-medium text-gray-700">{m.sender?.username ?? "Utilisateur supprimé"}</span>
                      <span>{formatDateTime(m.createdAt)}</span>
                    </div>
                    <p className="whitespace-pre-wrap text-sm text-gray-800">{m.content}</p>
                  </div>
                ))}
              </div>

              <form onSubmit={handleReply} className="flex items-center gap-2 border-t border-gray-100 p-3">
                <input
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  placeholder="Répondre..."
                  className="flex-1"
                />
                <button
                  type="submit"
                  disabled={sending || !reply.trim()}
                  className="flex h-9 w-9 items-center justify-center rounded-md bg-brand-600 text-white hover:bg-brand-700 disabled:opacity-50"
                  aria-label="Envoyer"
                >
                  <Send className="h-4 w-4" aria-hidden />
                </button>
              </form>
            </div>
          )}
        </div>
      </div>

      {showCreate && (
        <Modal title="Nouveau ticket" onClose={() => setShowCreate(false)}>
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Sujet</label>
              <input value={subject} onChange={(e) => setSubject(e.target.value)} className="w-full" required />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full"
                rows={4}
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Catégorie (optionnel)</label>
              <input value={category} onChange={(e) => setCategory(e.target.value)} className="w-full" />
            </div>

            {createError && <p className="text-sm text-red-600">{createError}</p>}

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowCreate(false)}
                className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={creating}
                className="rounded-md bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
              >
                {creating ? "Création..." : "Créer"}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
