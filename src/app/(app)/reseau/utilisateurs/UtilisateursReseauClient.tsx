"use client";

import { useEffect, useState } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { Modal } from "@/components/Modal";

type Role = "ADMIN" | "EMPLOYEE";
type Membership = { restaurantId: string; restaurantName: string; role: Role };
type UserRow = {
  id: string;
  username: string;
  isSuperAdmin: boolean;
  memberships: Membership[];
  globalModules: string[];
  employee: { id: string; name: string; restaurantId: string } | null;
};
type Restaurant = { id: string; name: string };

type FormMembership = { restaurantId: string; included: boolean; role: Role };

const emptyForm = {
  username: "",
  password: "",
  isSuperAdmin: false,
};

export function UtilisateursReseauClient({ currentUserId }: { currentUserId: string }) {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(true);

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<UserRow | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [memberships, setMemberships] = useState<FormMembership[]>([]);
  const [globalModules, setGlobalModules] = useState<string[]>([]);
  const [newModule, setNewModule] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    const [usersRes, restaurantsRes] = await Promise.all([
      fetch("/api/super-admin/users"),
      fetch("/api/restaurants"),
    ]);
    if (usersRes.ok) setUsers(await usersRes.json());
    if (restaurantsRes.ok) setRestaurants(await restaurantsRes.json());
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  function membershipsFor(restaurantsList: Restaurant[], existing: Membership[]): FormMembership[] {
    return restaurantsList.map((r) => {
      const found = existing.find((m) => m.restaurantId === r.id);
      return { restaurantId: r.id, included: !!found, role: found?.role ?? "EMPLOYEE" };
    });
  }

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setMemberships(membershipsFor(restaurants, []));
    setGlobalModules([]);
    setNewModule("");
    setError(null);
    setShowForm(true);
  }

  function openEdit(user: UserRow) {
    setEditing(user);
    setForm({ username: user.username, password: "", isSuperAdmin: user.isSuperAdmin });
    setMemberships(membershipsFor(restaurants, user.memberships));
    setGlobalModules(user.globalModules);
    setNewModule("");
    setError(null);
    setShowForm(true);
  }

  function toggleMembership(restaurantId: string, included: boolean) {
    setMemberships((prev) => prev.map((m) => (m.restaurantId === restaurantId ? { ...m, included } : m)));
  }

  function setMembershipRole(restaurantId: string, role: Role) {
    setMemberships((prev) => prev.map((m) => (m.restaurantId === restaurantId ? { ...m, role } : m)));
  }

  function addModule() {
    const value = newModule.trim();
    if (value && !globalModules.includes(value)) {
      setGlobalModules((prev) => [...prev, value]);
    }
    setNewModule("");
  }

  function removeModule(module: string) {
    setGlobalModules((prev) => prev.filter((m) => m !== module));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const payloadMemberships = memberships.filter((m) => m.included).map(({ restaurantId, role }) => ({ restaurantId, role }));

      if (editing) {
        const res = await fetch(`/api/super-admin/users/${editing.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ isSuperAdmin: form.isSuperAdmin, memberships: payloadMemberships, globalModules }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          setError(data.error || "Erreur lors de l'enregistrement");
          return;
        }
      } else {
        const res = await fetch("/api/super-admin/users", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            username: form.username,
            password: form.password,
            isSuperAdmin: form.isSuperAdmin,
            memberships: payloadMemberships,
            globalModules,
          }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          setError(data.error || "Erreur lors de la création");
          return;
        }
      }

      setShowForm(false);
      await load();
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(user: UserRow) {
    if (!confirm(`Supprimer l'utilisateur "${user.username}" ? Ses accès sur tous les restaurants seront retirés.`)) return;
    const res = await fetch(`/api/super-admin/users/${user.id}`, { method: "DELETE" });
    if (res.ok) await load();
  }

  if (loading) {
    return <p className="text-sm text-gray-500">Chargement...</p>;
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Utilisateurs</h1>
          <p className="mt-1 text-sm text-gray-500">Tous les comptes du réseau, tous restaurants confondus.</p>
        </div>
        <button
          onClick={openCreate}
          className="whitespace-nowrap rounded-md bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
        >
          + Ajouter
        </button>
      </div>

      <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
        <table>
          <thead>
            <tr>
              <th>Utilisateur</th>
              <th>Super admin</th>
              <th>Restaurants</th>
              <th>Modules globaux</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td>
                  <div className="font-medium">{u.username}</div>
                  {u.employee && <div className="text-xs text-gray-400">{u.employee.name}</div>}
                </td>
                <td>{u.isSuperAdmin ? "Oui" : "—"}</td>
                <td>
                  <div className="flex flex-wrap gap-1">
                    {u.memberships.map((m) => (
                      <span
                        key={m.restaurantId}
                        className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700"
                      >
                        {m.restaurantName} · {m.role === "ADMIN" ? "Gérant" : "Employé"}
                      </span>
                    ))}
                    {u.memberships.length === 0 && <span className="text-xs text-gray-400">Aucun</span>}
                  </div>
                </td>
                <td>
                  <div className="flex flex-wrap gap-1">
                    {u.globalModules.map((m) => (
                      <span key={m} className="rounded-full bg-brand-50 px-2 py-0.5 text-xs font-medium text-brand-700">
                        {m}
                      </span>
                    ))}
                    {u.globalModules.length === 0 && <span className="text-xs text-gray-400">Aucun</span>}
                  </div>
                </td>
                <td>
                  <div className="flex justify-end gap-3 whitespace-nowrap text-sm">
                    <button onClick={() => openEdit(u)} title="Modifier" aria-label="Modifier" className="text-brand-600 hover:text-brand-800">
                      <Pencil className="h-4 w-4" aria-hidden />
                    </button>
                    {u.id !== currentUserId && (
                      <button
                        onClick={() => handleDelete(u)}
                        title="Supprimer"
                        aria-label="Supprimer"
                        className="text-brand-600 hover:text-brand-800"
                      >
                        <Trash2 className="h-4 w-4" aria-hidden />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {users.length === 0 && (
              <tr>
                <td colSpan={5} className="py-6 text-center text-gray-400">
                  Aucun utilisateur
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {showForm && (
        <Modal title={editing ? "Modifier l'utilisateur" : "Nouvel utilisateur"} onClose={() => setShowForm(false)} wide>
          <form onSubmit={handleSubmit} className="space-y-4">
            {!editing && (
              <div className="grid grid-cols-2 gap-3">
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
              </div>
            )}

            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={form.isSuperAdmin}
                disabled={editing?.id === currentUserId}
                onChange={(e) => setForm({ ...form, isSuperAdmin: e.target.checked })}
                className="h-4 w-4"
              />
              Super admin (accès total à tous les restaurants)
            </label>

            <div className="border-t border-gray-100 pt-3">
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-400">Restaurants</p>
              <div className="max-h-48 space-y-2 overflow-y-auto">
                {memberships.map((m) => {
                  const restaurant = restaurants.find((r) => r.id === m.restaurantId);
                  return (
                    <div key={m.restaurantId} className="flex items-center gap-3">
                      <label className="flex flex-1 items-center gap-2 text-sm text-gray-700">
                        <input
                          type="checkbox"
                          checked={m.included}
                          onChange={(e) => toggleMembership(m.restaurantId, e.target.checked)}
                          className="h-4 w-4"
                        />
                        {restaurant?.name ?? m.restaurantId}
                      </label>
                      <select
                        value={m.role}
                        disabled={!m.included}
                        onChange={(e) => setMembershipRole(m.restaurantId, e.target.value as Role)}
                        className="text-sm disabled:opacity-40"
                      >
                        <option value="EMPLOYEE">Employé</option>
                        <option value="ADMIN">Gérant</option>
                      </select>
                    </div>
                  );
                })}
                {memberships.length === 0 && <p className="text-sm text-gray-400">Aucun restaurant créé pour l&apos;instant.</p>}
              </div>
            </div>

            <div className="border-t border-gray-100 pt-3">
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-400">
                Modules à portée globale (tous restaurants)
              </p>
              <div className="mb-2 flex flex-wrap gap-1">
                {globalModules.map((m) => (
                  <span
                    key={m}
                    className="inline-flex items-center gap-1 rounded-full bg-brand-50 px-2 py-0.5 text-xs font-medium text-brand-700"
                  >
                    {m}
                    <button type="button" onClick={() => removeModule(m)} className="text-brand-400 hover:text-brand-700">
                      ×
                    </button>
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  value={newModule}
                  onChange={(e) => setNewModule(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addModule();
                    }
                  }}
                  placeholder="ex : marketing"
                  className="flex-1"
                />
                <button
                  type="button"
                  onClick={addModule}
                  className="whitespace-nowrap rounded-md border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Ajouter
                </button>
              </div>
              <p className="mt-1 text-xs text-gray-400">
                Aucun module transverse n&apos;existe encore (marketing, ticketing...) — ce champ prépare le terrain
                pour en accorder l&apos;accès dès qu&apos;ils seront développés.
              </p>
            </div>

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
                {saving ? "Enregistrement..." : "Enregistrer"}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
