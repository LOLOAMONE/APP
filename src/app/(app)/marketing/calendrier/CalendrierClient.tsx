"use client";

import { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { Modal } from "@/components/Modal";

type EditorialPost = {
  id: string;
  restaurantId: string | null;
  title: string;
  caption: string;
  mediaUrl: string | null;
  platforms: string[];
  scheduledAt: string;
  status: (typeof STATUSES)[number]["key"];
  validationRequested: boolean;
  reviewComment: string | null;
  publishedAt: string | null;
  restaurant: { id: string; name: string } | null;
  createdBy: { id: string; username: string } | null;
  reviewedBy: { id: string; username: string } | null;
};

const STATUSES = [
  { key: "DRAFT", label: "Brouillon", color: "bg-gray-100 text-gray-700" },
  { key: "PENDING_VALIDATION", label: "En attente de validation", color: "bg-amber-100 text-amber-700" },
  { key: "VALIDATED", label: "Programmé", color: "bg-blue-100 text-blue-700" },
  { key: "PUBLISHED", label: "Publié", color: "bg-green-100 text-green-700" },
  { key: "REJECTED", label: "Rejeté", color: "bg-brand-100 text-brand-700" },
] as const;

const PLATFORM_LABELS: Record<string, string> = {
  INSTAGRAM: "Instagram",
  FACEBOOK: "Facebook",
  GOOGLE: "Google",
};

function statusMeta(status: string) {
  return STATUSES.find((s) => s.key === status) ?? STATUSES[0];
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" });
}

function toDatetimeLocal(iso: string) {
  const d = new Date(iso);
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
}

function canManage(hasGlobalAccess: boolean, activeRestaurantId: string | null, post: EditorialPost): boolean {
  if (post.restaurantId === null) return hasGlobalAccess;
  if (hasGlobalAccess) return activeRestaurantId === post.restaurantId;
  return true;
}

const emptyForm = { title: "", caption: "", mediaUrl: "", platforms: [] as string[], scheduledAt: "" };

export function CalendrierClient({
  hasGlobalAccess,
  canCreateLocal,
  activeRestaurantId,
}: {
  hasGlobalAccess: boolean;
  canCreateLocal: boolean;
  activeRestaurantId: string | null;
}) {
  const [posts, setPosts] = useState<EditorialPost[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = posts.find((p) => p.id === selectedId) ?? null;

  const [showModal, setShowModal] = useState<"create" | "edit" | null>(null);
  const [scope, setScope] = useState<"LOCAL" | "NATIONAL">(canCreateLocal ? "LOCAL" : "NATIONAL");
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [reviewComment, setReviewComment] = useState("");
  const [busy, setBusy] = useState(false);

  async function loadList() {
    const res = await fetch("/api/editorial-posts");
    if (res.ok) setPosts(await res.json());
    setLoadingList(false);
  }

  useEffect(() => {
    loadList();
  }, []);

  function openCreate() {
    setForm(emptyForm);
    setScope(canCreateLocal ? "LOCAL" : "NATIONAL");
    setFormError(null);
    setShowModal("create");
  }

  function openEdit(post: EditorialPost) {
    setForm({
      title: post.title,
      caption: post.caption,
      mediaUrl: post.mediaUrl || "",
      platforms: post.platforms,
      scheduledAt: toDatetimeLocal(post.scheduledAt),
    });
    setFormError(null);
    setShowModal("edit");
  }

  function togglePlatform(p: string) {
    setForm((prev) => ({
      ...prev,
      platforms: prev.platforms.includes(p) ? prev.platforms.filter((x) => x !== p) : [...prev.platforms, p],
    }));
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setFormError(null);
    try {
      const res = await fetch("/api/editorial-posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scope,
          title: form.title,
          caption: form.caption,
          mediaUrl: form.mediaUrl || undefined,
          platforms: form.platforms,
          scheduledAt: new Date(form.scheduledAt).toISOString(),
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setFormError(data.error || "Erreur lors de la création");
        return;
      }
      const created = await res.json();
      setShowModal(null);
      await loadList();
      setSelectedId(created.id);
    } finally {
      setSaving(false);
    }
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedId) return;
    setSaving(true);
    setFormError(null);
    try {
      const res = await fetch(`/api/editorial-posts/${selectedId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title,
          caption: form.caption,
          mediaUrl: form.mediaUrl || null,
          platforms: form.platforms,
          scheduledAt: new Date(form.scheduledAt).toISOString(),
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setFormError(data.error || "Erreur lors de la modification");
        return;
      }
      setShowModal(null);
      await loadList();
    } finally {
      setSaving(false);
    }
  }

  async function handleSchedule(requestValidation: boolean) {
    if (!selectedId) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/editorial-posts/${selectedId}/schedule`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestValidation }),
      });
      if (res.ok) await loadList();
    } finally {
      setBusy(false);
    }
  }

  async function handleReview(decision: "VALIDATE" | "REJECT") {
    if (!selectedId) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/editorial-posts/${selectedId}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision, comment: reviewComment || undefined }),
      });
      if (res.ok) {
        setReviewComment("");
        await loadList();
      }
    } finally {
      setBusy(false);
    }
  }

  async function handlePublish() {
    if (!selectedId) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/editorial-posts/${selectedId}/publish`, { method: "POST" });
      if (res.ok) await loadList();
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete() {
    if (!selectedId) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/editorial-posts/${selectedId}`, { method: "DELETE" });
      if (res.ok) {
        setSelectedId(null);
        await loadList();
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Calendrier éditorial</h1>
          <p className="mt-1 text-sm text-gray-500">
            Pense-bête partagé des publications à venir — aucune publication automatique, personne ne poste à votre place.
          </p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-1.5 whitespace-nowrap rounded-md bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
        >
          <Plus className="h-4 w-4" aria-hidden />
          Nouvelle publication
        </button>
      </div>

      <div className="flex flex-col gap-4 md:flex-row">
        <div className="w-full shrink-0 overflow-hidden rounded-lg border border-gray-200 bg-white md:w-96">
          {loadingList ? (
            <p className="p-4 text-sm text-gray-500">Chargement...</p>
          ) : posts.length === 0 ? (
            <p className="p-4 text-sm text-gray-400">Aucune publication</p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {posts.map((p) => {
                const meta = statusMeta(p.status);
                return (
                  <li key={p.id}>
                    <button
                      onClick={() => setSelectedId(p.id)}
                      className={`block w-full px-4 py-3 text-left hover:bg-gray-50 ${selectedId === p.id ? "bg-brand-50" : ""}`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate text-sm font-medium text-gray-900">{p.title}</span>
                        <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${meta.color}`}>
                          {meta.label}
                        </span>
                      </div>
                      <div className="mt-1 flex items-center justify-between text-xs text-gray-500">
                        <span>{p.restaurantId === null ? "National" : p.restaurant?.name ?? "—"}</span>
                        <span>{formatDateTime(p.scheduledAt)}</span>
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
            <p className="p-6 text-sm text-gray-400">Sélectionne une publication.</p>
          ) : (
            <div className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-base font-semibold text-gray-900">{selected.title}</h2>
                  <p className="mt-0.5 text-xs text-gray-500">
                    {selected.restaurantId === null ? "National" : selected.restaurant?.name}
                    {selected.createdBy ? ` · ${selected.createdBy.username}` : ""} · {formatDateTime(selected.scheduledAt)}
                  </p>
                </div>
                <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${statusMeta(selected.status).color}`}>
                  {statusMeta(selected.status).label}
                </span>
              </div>

              <p className="mt-3 whitespace-pre-wrap text-sm text-gray-700">{selected.caption}</p>

              <div className="mt-3 flex flex-wrap items-center gap-2">
                {selected.platforms.map((p) => (
                  <span key={p} className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
                    {PLATFORM_LABELS[p] ?? p}
                  </span>
                ))}
              </div>

              {selected.mediaUrl && (
                <p className="mt-3 text-sm">
                  <a href={selected.mediaUrl} target="_blank" rel="noreferrer" className="text-brand-600 hover:underline">
                    Voir le média (lien externe)
                  </a>
                </p>
              )}

              {selected.status === "REJECTED" && selected.reviewComment && (
                <div className="mt-3 rounded-md bg-brand-50 p-3 text-sm text-brand-700">
                  <span className="font-medium">Motif du rejet : </span>
                  {selected.reviewComment}
                </div>
              )}
              {selected.status === "PUBLISHED" && selected.publishedAt && (
                <p className="mt-3 text-xs text-gray-500">Marqué comme publié le {formatDateTime(selected.publishedAt)}</p>
              )}

              <div className="mt-4 flex flex-wrap gap-2 border-t border-gray-100 pt-4">
                {canManage(hasGlobalAccess, activeRestaurantId, selected) && ["DRAFT", "REJECTED"].includes(selected.status) && (
                  <>
                    <button
                      onClick={() => openEdit(selected)}
                      className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
                    >
                      Modifier
                    </button>
                    <button
                      onClick={() => handleSchedule(false)}
                      disabled={busy}
                      className="rounded-md bg-brand-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
                    >
                      Programmer sans validation
                    </button>
                    <button
                      onClick={() => handleSchedule(true)}
                      disabled={busy}
                      className="rounded-md border border-brand-300 px-3 py-1.5 text-sm font-medium text-brand-700 hover:bg-brand-50 disabled:opacity-50"
                    >
                      Soumettre pour validation
                    </button>
                    <button
                      onClick={handleDelete}
                      disabled={busy}
                      className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                    >
                      Supprimer
                    </button>
                  </>
                )}

                {canManage(hasGlobalAccess, activeRestaurantId, selected) && selected.status === "VALIDATED" && (
                  <button
                    onClick={handlePublish}
                    disabled={busy}
                    className="rounded-md bg-brand-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
                  >
                    Marquer comme publié
                  </button>
                )}
              </div>

              {hasGlobalAccess && selected.status === "PENDING_VALIDATION" && (
                <div className="mt-4 space-y-2 border-t border-gray-100 pt-4">
                  <label className="block text-sm font-medium text-gray-700">Commentaire (optionnel)</label>
                  <textarea
                    value={reviewComment}
                    onChange={(e) => setReviewComment(e.target.value)}
                    className="w-full"
                    rows={2}
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleReview("VALIDATE")}
                      disabled={busy}
                      className="rounded-md bg-brand-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
                    >
                      Valider
                    </button>
                    <button
                      onClick={() => handleReview("REJECT")}
                      disabled={busy}
                      className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                    >
                      Rejeter
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {showModal && (
        <Modal title={showModal === "create" ? "Nouvelle publication" : "Modifier la publication"} onClose={() => setShowModal(null)}>
          <form onSubmit={showModal === "create" ? handleCreate : handleEdit} className="space-y-4">
            {showModal === "create" && hasGlobalAccess && (
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Portée</label>
                <select value={scope} onChange={(e) => setScope(e.target.value as "LOCAL" | "NATIONAL")} className="w-full">
                  {canCreateLocal && <option value="LOCAL">Locale (restaurant actif)</option>}
                  <option value="NATIONAL">Nationale</option>
                </select>
              </div>
            )}
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Titre</label>
              <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="w-full" required />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Légende</label>
              <textarea
                value={form.caption}
                onChange={(e) => setForm({ ...form, caption: e.target.value })}
                className="w-full"
                rows={4}
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Lien vers le média (Drive, OneDrive...)</label>
              <input
                type="url"
                value={form.mediaUrl}
                onChange={(e) => setForm({ ...form, mediaUrl: e.target.value })}
                className="w-full"
                placeholder="https://..."
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Plateformes visées</label>
              <div className="flex gap-4">
                {Object.entries(PLATFORM_LABELS).map(([key, label]) => (
                  <label key={key} className="flex items-center gap-2 text-sm text-gray-700">
                    <input
                      type="checkbox"
                      checked={form.platforms.includes(key)}
                      onChange={() => togglePlatform(key)}
                      className="h-4 w-4"
                    />
                    {label}
                  </label>
                ))}
              </div>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Date et heure prévues</label>
              <input
                type="datetime-local"
                value={form.scheduledAt}
                onChange={(e) => setForm({ ...form, scheduledAt: e.target.value })}
                className="w-full"
                required
              />
            </div>

            {formError && <p className="text-sm text-red-600">{formError}</p>}

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowModal(null)}
                className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={saving || form.platforms.length === 0}
                className="rounded-md bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
              >
                {saving ? "Enregistrement..." : showModal === "create" ? "Créer" : "Enregistrer"}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
