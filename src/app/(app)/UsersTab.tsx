"use client";

import { useEffect, useState } from "react";
import { Modal } from "@/components/Modal";

type UserRow = {
  id: string;
  username: string;
  role: "ADMIN" | "EMPLOYEE";
  canAccessMarges: boolean;
  canAccessMercuriale: boolean;
  employee: { id: string; name: string; position: string } | null;
};

const emptyForm = {
  username: "",
  password: "",
  role: "EMPLOYEE" as "ADMIN" | "EMPLOYEE",
  canAccessMarges: false,
  canAccessMercuriale: false,
};

export function UsersTab({ currentUserId }: { currentUserId: string }) {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    const res = await fetch("/api/users");
    if (res.ok) setUsers(await res.json());
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function updateUser(user: UserRow, patch: Partial<Pick<UserRow, "role" | "canAccessMarges" | "canAccessMercuriale">>) {
    setError(null);
    const next = { ...user, ...patch };
    setUsers((prev) => prev.map((u) => (u.id === user.id ? next : u)));
    setSavingId(user.id);
    try {
      const res = await fetch(`/api/users/${user.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role: next.role,
          canAccessMarges: next.canAccessMarges,
          canAccessMercuriale: next.canAccessMercuriale,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Erreur lors de l'enregistrement");
        await load();
        return;
      }
    } finally {
      setSavingId(null);
    }
  }

  function openCreate() {
    setForm(emptyForm);
    setFormError(null);
    setShowForm(true);
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setFormError(null);
    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setFormError(data.error || "Erreur lors de la création");
        return;
      }
      setShowForm(false);
      await load();
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <p className="text-sm text-gray-500">Chargement...</p>;
  }

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm text-gray-500">
          La direction a toujours accès à tout. Pour un employé, coche les pages supplémentaires auxquelles il peut
          accéder en plus du Planning.
        </p>
        <button
          onClick={openCreate}
          className="ml-3 whitespace-nowrap rounded-md bg-brand-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-brand-700"
        >
          + Ajouter
        </button>
      </div>

      {error && <p className="mb-3 text-sm text-red-600">{error}</p>}

      <div className="overflow-x-auto rounded-lg border border-gray-200">
        <table>
          <thead>
            <tr>
              <th>Utilisateur</th>
              <th>Rôle</th>
              <th>Marges</th>
              <th>Mercuriale</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td>
                  <div className="font-medium">{u.username}</div>
                  {u.employee && <div className="text-xs text-gray-400">{u.employee.name} — {u.employee.position}</div>}
                </td>
                <td>
                  <select
                    value={u.role}
                    onChange={(e) => updateUser(u, { role: e.target.value as "ADMIN" | "EMPLOYEE" })}
                    disabled={savingId === u.id || u.id === currentUserId}
                    className="text-sm"
                  >
                    <option value="ADMIN">Direction</option>
                    <option value="EMPLOYEE">Employé</option>
                  </select>
                </td>
                <td>
                  <input
                    type="checkbox"
                    checked={u.role === "ADMIN" ? true : u.canAccessMarges}
                    disabled={u.role === "ADMIN" || savingId === u.id}
                    onChange={(e) => updateUser(u, { canAccessMarges: e.target.checked })}
                    className="h-4 w-4"
                  />
                </td>
                <td>
                  <input
                    type="checkbox"
                    checked={u.role === "ADMIN" ? true : u.canAccessMercuriale}
                    disabled={u.role === "ADMIN" || savingId === u.id}
                    onChange={(e) => updateUser(u, { canAccessMercuriale: e.target.checked })}
                    className="h-4 w-4"
                  />
                </td>
              </tr>
            ))}
            {users.length === 0 && (
              <tr>
                <td colSpan={4} className="py-6 text-center text-gray-400">
                  Aucun utilisateur
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {showForm && (
        <Modal title="Nouvel utilisateur" onClose={() => setShowForm(false)}>
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Identifiant</label>
              <input
                value={form.username}
                onChange={(e) => setForm({ ...form, username: e.target.value })}
                className="w-full"
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Mot de passe</label>
              <input
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                className="w-full"
                minLength={6}
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Rôle</label>
              <select
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value as "ADMIN" | "EMPLOYEE" })}
                className="w-full"
              >
                <option value="EMPLOYEE">Employé</option>
                <option value="ADMIN">Direction</option>
              </select>
            </div>

            {form.role === "EMPLOYEE" && (
              <div className="flex gap-4 border-t border-gray-100 pt-3">
                <label className="flex items-center gap-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={form.canAccessMarges}
                    onChange={(e) => setForm({ ...form, canAccessMarges: e.target.checked })}
                    className="h-4 w-4"
                  />
                  Accès Marges
                </label>
                <label className="flex items-center gap-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={form.canAccessMercuriale}
                    onChange={(e) => setForm({ ...form, canAccessMercuriale: e.target.checked })}
                    className="h-4 w-4"
                  />
                  Accès Mercuriale
                </label>
              </div>
            )}

            <p className="text-xs text-gray-400">
              Ce compte n&apos;est pas lié à une fiche employé (pas d&apos;horaires de planning). Pour créer un
              compte employé avec planning, utilise plutôt &laquo; Gérer les employés &raquo;.
            </p>

            {formError && <p className="text-sm text-red-600">{formError}</p>}

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
