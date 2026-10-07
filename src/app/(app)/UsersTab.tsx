"use client";

import { useEffect, useState } from "react";
import { Modal } from "@/components/Modal";

type UserRow = {
  id: string;
  username: string;
  role: "ADMIN" | "EMPLOYEE";
  canAccessMarges: boolean;
  canAccessMercuriale: boolean;
  canAccessCrm: boolean;
  canAccessMarketing: boolean;
  employee: { id: string; name: string; position: string } | null;
};

const emptyForm = {
  username: "",
  password: "",
  role: "EMPLOYEE" as "ADMIN" | "EMPLOYEE",
  canAccessMarges: false,
  canAccessMercuriale: false,
  canAccessCrm: false,
  canAccessMarketing: false,
};

export function UsersTab({ currentUserId }: { currentUserId: string }) {
  const [editing, setEditing] = useState<UserRow | null>(null);
  const [account, setAccount] = useState({ username: "", name: "", password: "" });
  const [accountError, setAccountError] = useState<string | null>(null);
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

  async function updateUser(
    user: UserRow,
    patch: Partial<Pick<UserRow, "role" | "canAccessMarges" | "canAccessMercuriale" | "canAccessCrm" | "canAccessMarketing">>
  ) {
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
          canAccessCrm: next.canAccessCrm,
          canAccessMarketing: next.canAccessMarketing,
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
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
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

      {error && <p className="mb-3 text-sm text-brand-600">{error}</p>}

      {editing && <form className="mb-4 space-y-3 rounded-xl border border-brand-200 bg-brand-50/30 p-4" onSubmit={async (e) => {
        e.preventDefault(); setSaving(true); setAccountError(null);
        try { const res = await fetch(`/api/users/${editing.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: account.username, ...(editing.employee ? { name: account.name } : {}), ...(account.password ? { password: account.password } : {}) }) });
          const data = await res.json(); if (!res.ok) { setAccountError(data.error || 'Enregistrement impossible.'); return; } setEditing(null); setAccount({ username: '', name: '', password: '' }); await load();
        } catch { setAccountError('Connexion impossible. Réessayez.'); } finally { setSaving(false); }
      }}>
        <h3 className="font-semibold">Modifier {editing.username}</h3>
        {editing.employee && <label className="block text-sm">Nom de l’employé<input aria-label="Nom de l’employé" required value={account.name} onChange={(e) => setAccount({ ...account, name: e.target.value })} className="mt-1 w-full" /></label>}
        <label className="block text-sm">Identifiant<input aria-label="Identifiant du compte" required minLength={3} disabled={editing.id === currentUserId} value={account.username} onChange={(e) => setAccount({ ...account, username: e.target.value })} className="mt-1 w-full" /></label>
        {editing.id === currentUserId ? <p className="text-xs text-gray-500">Votre identifiant et votre mot de passe se modifient dans Mon profil.</p> : <label className="block text-sm">Nouveau mot de passe<input aria-label="Nouveau mot de passe du compte" type="password" autoComplete="new-password" minLength={6} value={account.password} onChange={(e) => setAccount({ ...account, password: e.target.value })} className="mt-1 w-full" /><span className="text-xs text-gray-500">Laisser vide pour conserver le mot de passe actuel.</span></label>}
        {editing.employee && <a href={`/planning/employes/${editing.employee.id}`} className="block text-sm text-brand-700 underline">Poste, taux horaire et jours off ↗</a>}
        {accountError && <p role="alert" className="text-sm text-brand-700">{accountError}</p>}
        <div className="flex justify-end gap-3"><button type="button" disabled={saving} onClick={() => setEditing(null)}>Annuler</button><button disabled={saving} className="rounded-lg bg-brand-600 px-3 py-2 text-sm font-semibold text-white">{saving ? 'Enregistrement…' : 'Enregistrer'}</button></div>
      </form>}

      <div className="space-y-3">
        {users.map((u) => <article key={u.id} className="rounded-xl border border-gray-200 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3"><div className="min-w-0"><p className="break-words font-semibold">{u.employee?.name ?? u.username}</p><p className="break-words text-xs text-gray-500">{u.username}{u.employee ? ` · ${u.employee.position}` : ""}</p></div><button disabled={savingId !== null} onClick={() => { setEditing(u); setAccount({ username: u.username, name: u.employee?.name ?? "", password: "" }); setAccountError(null); }} className="rounded-lg border border-brand-200 px-3 py-2 text-sm font-medium text-brand-700">Modifier</button></div>
          <label className="mt-3 block text-xs text-gray-500">Rôle<select aria-label={`Rôle de ${u.username}`} value={u.role} onChange={(e) => updateUser(u, { role: e.target.value as "ADMIN" | "EMPLOYEE" })} disabled={savingId !== null || u.id === currentUserId} className="mt-1 w-full"><option value="ADMIN">Direction</option><option value="EMPLOYEE">Employé</option></select></label>
          <div className="mt-3 grid grid-cols-2 gap-3">{([['canAccessMarges', 'Marges'], ['canAccessMercuriale', 'Mercuriale'], ['canAccessCrm', 'Clients'], ['canAccessMarketing', 'Marketing']] as const).map(([key, label]) => <label key={key} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={u.role === 'ADMIN' || u[key]} disabled={u.role === 'ADMIN' || savingId !== null} onChange={(e) => updateUser(u, { [key]: e.target.checked })} />{label}</label>)}</div>
        </article>)}
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
              <div className="flex flex-wrap gap-4 border-t border-gray-100 pt-3">
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
                <label className="flex items-center gap-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={form.canAccessCrm}
                    onChange={(e) => setForm({ ...form, canAccessCrm: e.target.checked })}
                    className="h-4 w-4"
                  />
                  Accès Clients
                </label>
                <label className="flex items-center gap-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={form.canAccessMarketing}
                    onChange={(e) => setForm({ ...form, canAccessMarketing: e.target.checked })}
                    className="h-4 w-4"
                  />
                  Accès Marketing
                </label>
              </div>
            )}

            <p className="text-xs text-gray-400">
              Ce compte n&apos;est pas lié à une fiche employé (pas d&apos;horaires de planning). Pour créer un
              compte employé avec planning, utilise plutôt &laquo; Gérer les employés &raquo;.
            </p>

            {formError && <p className="text-sm text-brand-600">{formError}</p>}

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
