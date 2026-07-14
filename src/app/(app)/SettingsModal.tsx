"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/Modal";
import { UsersTab } from "./UsersTab";

export function SettingsModal({
  userId,
  username,
  isAdmin,
  onClose,
}: {
  userId: string;
  username: string;
  isAdmin: boolean;
  onClose: () => void;
}) {
  const [tab, setTab] = useState<"profile" | "users">("profile");

  return (
    <Modal title="Réglages" onClose={onClose}>
      {isAdmin && (
        <div className="mb-4 flex gap-2 border-b border-gray-100 pb-3">
          <button
            onClick={() => setTab("profile")}
            className={`rounded-md px-3 py-1.5 text-sm font-medium ${
              tab === "profile" ? "bg-brand-50 text-brand-700" : "text-gray-600 hover:bg-gray-100"
            }`}
          >
            Mon profil
          </button>
          <button
            onClick={() => setTab("users")}
            className={`rounded-md px-3 py-1.5 text-sm font-medium ${
              tab === "users" ? "bg-brand-50 text-brand-700" : "text-gray-600 hover:bg-gray-100"
            }`}
          >
            Utilisateurs
          </button>
        </div>
      )}

      {tab === "profile" ? <ProfileTab username={username} /> : <UsersTab currentUserId={userId} />}
    </Modal>
  );
}

function ProfileTab({ username }: { username: string }) {
  const router = useRouter();
  const [newUsername, setNewUsername] = useState(username);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (newPassword && newPassword !== confirmPassword) {
      setError("Les deux mots de passe ne correspondent pas");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/account", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: newUsername,
          currentPassword,
          newPassword: newPassword || undefined,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Erreur lors de l'enregistrement");
        return;
      }
      setSuccess(true);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">Identifiant</label>
        <input value={newUsername} onChange={(e) => setNewUsername(e.target.value)} className="w-full" required />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">Mot de passe actuel</label>
        <input
          type="password"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          className="w-full"
          required
        />
      </div>

      <div className="border-t border-gray-100 pt-3">
        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-400">
          Changer de mot de passe (laisser vide pour ne pas changer)
        </p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Nouveau mot de passe</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full"
              minLength={6}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Confirmer</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full"
              minLength={6}
            />
          </div>
        </div>
      </div>

      {error && <p className="text-sm text-brand-600">{error}</p>}
      {success && !error && <p className="text-sm text-green-600">Profil mis à jour.</p>}

      <div className="flex justify-end gap-2 pt-2">
        <button
          type="submit"
          disabled={saving}
          className="rounded-md bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
        >
          {saving ? "Enregistrement..." : "Enregistrer"}
        </button>
      </div>
    </form>
  );
}
