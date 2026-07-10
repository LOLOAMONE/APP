"use client";

import { useEffect, useState } from "react";

type UserRow = {
  id: string;
  username: string;
  role: "ADMIN" | "EMPLOYEE";
  canAccessMarges: boolean;
  canAccessMercuriale: boolean;
  employee: { id: string; name: string; position: string } | null;
};

export function UsersTab({ currentUserId }: { currentUserId: string }) {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);

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

  if (loading) {
    return <p className="text-sm text-gray-500">Chargement...</p>;
  }

  return (
    <div>
      <p className="mb-3 text-sm text-gray-500">
        La direction a toujours accès à tout. Pour un employé, coche les pages supplémentaires auxquelles il peut
        accéder en plus du Planning.
      </p>

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
    </div>
  );
}
