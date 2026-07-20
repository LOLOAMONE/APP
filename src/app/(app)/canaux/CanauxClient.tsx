"use client";

import { useEffect, useState } from "react";
import { Hash, Plus, Send } from "lucide-react";
import { Modal } from "@/components/Modal";
import { usePolling } from "@/hooks/usePolling";

type Channel = {
  id: string;
  name: string;
  isDefault: boolean;
  createdAt: string;
  _count: { messages: number };
};

type ChannelMessage = {
  id: string;
  content: string;
  createdAt: string;
  sender: { id: string; username: string } | null;
};

type ChannelDetail = Channel & { messages: ChannelMessage[] };

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" });
}

export function CanauxClient() {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selected, setSelected] = useState<ChannelDetail | null>(null);

  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  async function loadChannels(selectIfNone = false) {
    const res = await fetch("/api/channels");
    if (res.ok) {
      const data: Channel[] = await res.json();
      setChannels(data);
      if (selectIfNone && !selectedId && data.length > 0) {
        setSelectedId(data.find((c) => c.isDefault)?.id ?? data[0].id);
      }
    }
    setLoadingList(false);
  }

  async function loadSelected(id: string) {
    const res = await fetch(`/api/channels/${id}`);
    if (res.ok) setSelected(await res.json());
  }

  useEffect(() => {
    loadChannels(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (selectedId) loadSelected(selectedId);
    else setSelected(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);

  usePolling(() => loadChannels(false), 15000, true);
  usePolling(() => selectedId && loadSelected(selectedId), 6000, !!selectedId);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    setCreateError(null);
    try {
      const res = await fetch("/api/channels", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setCreateError(data.error || "Erreur lors de la création");
        return;
      }
      const created = await res.json();
      setShowCreate(false);
      setName("");
      await loadChannels(false);
      setSelectedId(created.id);
    } finally {
      setCreating(false);
    }
  }

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedId || !message.trim()) return;
    setSending(true);
    try {
      const res = await fetch(`/api/channels/${selectedId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: message }),
      });
      if (res.ok) {
        setMessage("");
        await loadSelected(selectedId);
      }
    } finally {
      setSending(false);
    }
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Canaux</h1>
          <p className="mt-1 text-sm text-gray-500">Communication interne de l&apos;équipe.</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-1.5 whitespace-nowrap rounded-md bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
        >
          <Plus className="h-4 w-4" aria-hidden />
          Nouveau canal
        </button>
      </div>

      <div className="flex flex-col gap-4 md:flex-row">
        <div className="w-full shrink-0 overflow-hidden rounded-lg border border-gray-200 bg-white md:w-64">
          {loadingList ? (
            <p className="p-4 text-sm text-gray-500">Chargement...</p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {channels.map((c) => (
                <li key={c.id}>
                  <button
                    onClick={() => setSelectedId(c.id)}
                    className={`flex w-full items-center gap-1.5 px-4 py-2.5 text-left text-sm hover:bg-gray-50 ${
                      selectedId === c.id ? "bg-brand-50 font-medium text-brand-700" : "text-gray-700"
                    }`}
                  >
                    <Hash className="h-3.5 w-3.5 shrink-0 text-gray-400" aria-hidden />
                    <span className="truncate">{c.name}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="min-w-0 flex-1 rounded-lg border border-gray-200 bg-white">
          {!selected ? (
            <p className="p-6 text-sm text-gray-400">Sélectionne un canal.</p>
          ) : (
            <div className="flex h-full flex-col">
              <div className="border-b border-gray-100 px-4 py-3">
                <h2 className="flex items-center gap-1.5 text-base font-semibold text-gray-900">
                  <Hash className="h-4 w-4 text-gray-400" aria-hidden />
                  {selected.name}
                </h2>
              </div>

              <div className="flex-1 space-y-3 overflow-y-auto p-4">
                {selected.messages.length === 0 && (
                  <p className="text-sm text-gray-400">Aucun message pour l&apos;instant.</p>
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

              <form onSubmit={handleSend} className="flex items-center gap-2 border-t border-gray-100 p-3">
                <input
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder={`Message dans #${selected.name}`}
                  className="flex-1"
                />
                <button
                  type="submit"
                  disabled={sending || !message.trim()}
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
        <Modal title="Nouveau canal" onClose={() => setShowCreate(false)}>
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Nom</label>
              <input value={name} onChange={(e) => setName(e.target.value)} className="w-full" required />
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
