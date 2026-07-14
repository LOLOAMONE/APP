"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Pencil, Trash2 } from "lucide-react";
import { Modal } from "@/components/Modal";

type Employee = {
  id: string;
  name: string;
  position: string;
  hourlyRate: number | null;
};

const emptyForm = { name: "", position: "", hourlyRate: "", username: "", password: "" };

type SortKey = "name" | "position" | "hourlyRate";

const DAY_LABELS = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];

type TemplateDay = { enabled: boolean; startTime: string; endTime: string };

function emptyTemplate(): TemplateDay[] {
  return DAY_LABELS.map(() => ({ enabled: false, startTime: "09:00", endTime: "17:00" }));
}

export function EmployeesClient() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Employee | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [template, setTemplate] = useState<TemplateDay[]>(emptyTemplate());
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    const res = await fetch("/api/employees");
    if (res.ok) setEmployees(await res.json());
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setTemplate(emptyTemplate());
    setError(null);
    setShowForm(true);
  }

  async function openEdit(emp: Employee) {
    setEditing(emp);
    setForm({
      name: emp.name,
      position: emp.position,
      hourlyRate: emp.hourlyRate != null ? String(emp.hourlyRate) : "",
      username: "",
      password: "",
    });
    setError(null);
    setTemplate(emptyTemplate());
    setShowForm(true);

    const res = await fetch(`/api/employees/${emp.id}/schedule-template`);
    if (res.ok) {
      const entries: { dayOfWeek: number; startTime: string; endTime: string }[] = await res.json();
      setTemplate((prev) =>
        prev.map((day, index) => {
          const entry = entries.find((e) => e.dayOfWeek === index);
          return entry ? { enabled: true, startTime: entry.startTime, endTime: entry.endTime } : day;
        })
      );
    }
  }

  function updateTemplateDay(index: number, patch: Partial<TemplateDay>) {
    setTemplate((prev) => prev.map((day, i) => (i === index ? { ...day, ...patch } : day)));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const basePayload = {
      name: form.name,
      position: form.position,
      hourlyRate: form.hourlyRate ? parseFloat(form.hourlyRate) : null,
    };

    const payload = editing
      ? {
          ...basePayload,
          ...(form.username ? { username: form.username } : {}),
          ...(form.password ? { password: form.password } : {}),
        }
      : { ...basePayload, username: form.username, password: form.password };

    const url = editing ? `/api/employees/${editing.id}` : "/api/employees";
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

      const savedEmployee = editing ?? (await res.json());
      const employeeId = editing ? editing.id : savedEmployee.id;

      const templateEntries = template
        .map((day, index) => ({ ...day, dayOfWeek: index }))
        .filter((day) => day.enabled)
        .map(({ dayOfWeek, startTime, endTime }) => ({ dayOfWeek, startTime, endTime }));

      const templateRes = await fetch(`/api/employees/${employeeId}/schedule-template`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entries: templateEntries }),
      });
      if (!templateRes.ok) {
        const data = await templateRes.json().catch(() => ({}));
        setError(data.error || "Employé enregistré, mais le planning de base n'a pas pu être sauvegardé");
        return;
      }

      setShowForm(false);
      await load();
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(emp: Employee) {
    if (!confirm(`Supprimer l'employé "${emp.name}" ? Son compte et son planning seront aussi supprimés.`)) return;
    const res = await fetch(`/api/employees/${emp.id}`, { method: "DELETE" });
    if (res.ok) await load();
  }

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  const sortArrow = (key: SortKey) => (sortKey === key ? (sortDir === "asc" ? " ↑" : " ↓") : "");

  const sortedEmployees = [...employees].sort((a, b) => {
    if (!sortKey) return 0;
    let cmp = 0;
    if (sortKey === "name") cmp = a.name.localeCompare(b.name);
    if (sortKey === "position") cmp = a.position.localeCompare(b.position);
    if (sortKey === "hourlyRate") cmp = (a.hourlyRate ?? 0) - (b.hourlyRate ?? 0);
    return sortDir === "asc" ? cmp : -cmp;
  });

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <Link href="/planning" className="text-sm text-brand-600 hover:text-brand-800">
            ← Retour au planning
          </Link>
          <h1 className="mt-1 text-xl font-bold text-gray-900">Employés</h1>
        </div>
        <button
          onClick={openCreate}
          className="whitespace-nowrap rounded-md bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
        >
          + Ajouter
        </button>
      </div>

      {loading ? (
        <p className="text-sm text-gray-500">Chargement...</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
          <table>
            <thead>
              <tr>
                <th className="cursor-pointer select-none" onClick={() => toggleSort("name")}>
                  Nom{sortArrow("name")}
                </th>
                <th className="cursor-pointer select-none" onClick={() => toggleSort("position")}>
                  Poste{sortArrow("position")}
                </th>
                <th className="cursor-pointer select-none" onClick={() => toggleSort("hourlyRate")}>
                  Taux horaire{sortArrow("hourlyRate")}
                </th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {sortedEmployees.map((emp) => (
                <tr key={emp.id}>
                  <td className="font-medium">{emp.name}</td>
                  <td>{emp.position}</td>
                  <td>{emp.hourlyRate != null ? `${emp.hourlyRate.toFixed(2)} €/h` : "—"}</td>
                  <td>
                    <div className="flex justify-end gap-3 whitespace-nowrap text-sm">
                      <button onClick={() => openEdit(emp)} title="Modifier" aria-label="Modifier" className="text-brand-600 hover:text-brand-800">
                        <Pencil className="h-4 w-4" aria-hidden />
                      </button>
                      <button onClick={() => handleDelete(emp)} title="Supprimer" aria-label="Supprimer" className="text-red-600 hover:text-red-800">
                        <Trash2 className="h-4 w-4" aria-hidden />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {employees.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-6 text-center text-gray-400">
                    Aucun employé
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {showForm && (
        <Modal title={editing ? "Modifier l'employé" : "Nouvel employé"} onClose={() => setShowForm(false)}>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Nom</label>
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full" required />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Poste</label>
                <input
                  value={form.position}
                  onChange={(e) => setForm({ ...form, position: e.target.value })}
                  className="w-full"
                  required
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Taux horaire (€/h)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.hourlyRate}
                  onChange={(e) => setForm({ ...form, hourlyRate: e.target.value })}
                  className="w-full"
                />
              </div>
            </div>

            <div className="border-t border-gray-100 pt-3">
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-400">
                Accès à l&apos;application {editing && "(laisser vide pour ne pas changer)"}
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Identifiant</label>
                  <input
                    value={form.username}
                    onChange={(e) => setForm({ ...form, username: e.target.value })}
                    className="w-full"
                    required={!editing}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Mot de passe</label>
                  <input
                    type="password"
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    className="w-full"
                    required={!editing}
                    minLength={6}
                  />
                </div>
              </div>
            </div>

            <div className="border-t border-gray-100 pt-3">
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-400">
                Planning de base (horaires récurrents)
              </p>
              <div className="space-y-2">
                {DAY_LABELS.map((label, index) => {
                  const day = template[index];
                  return (
                    <div key={label} className="flex items-center gap-2">
                      <label className="flex w-28 shrink-0 items-center gap-2 text-sm text-gray-700">
                        <input
                          type="checkbox"
                          checked={day.enabled}
                          onChange={(e) => updateTemplateDay(index, { enabled: e.target.checked })}
                          className="h-4 w-4"
                        />
                        {label}
                      </label>
                      <input
                        type="time"
                        value={day.startTime}
                        onChange={(e) => updateTemplateDay(index, { startTime: e.target.value })}
                        disabled={!day.enabled}
                        className="w-full disabled:opacity-40"
                      />
                      <span className="text-gray-400">à</span>
                      <input
                        type="time"
                        value={day.endTime}
                        onChange={(e) => updateTemplateDay(index, { endTime: e.target.value })}
                        disabled={!day.enabled}
                        className="w-full disabled:opacity-40"
                      />
                    </div>
                  );
                })}
              </div>
              <p className="mt-2 text-xs text-gray-400">
                Utilisé par le bouton « Appliquer le planning de base » dans le Planning pour créer les créneaux
                d&apos;une semaine automatiquement.
              </p>
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
