"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { DAY_LABELS, emptyTemplate, TemplateDay } from "@/lib/scheduleTemplate";

type Employee = {
  id: string;
  name: string;
  position: string;
  hourlyRate: number | null;
};

export function EmployeeDetailClient({ employeeId }: { employeeId: string }) {
  const router = useRouter();
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [form, setForm] = useState({ name: "", position: "", hourlyRate: "", username: "", password: "" });
  const [infoError, setInfoError] = useState<string | null>(null);
  const [savingInfo, setSavingInfo] = useState(false);
  const [infoSaved, setInfoSaved] = useState(false);

  const [template, setTemplate] = useState<TemplateDay[]>(emptyTemplate());
  const [templateError, setTemplateError] = useState<string | null>(null);
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [templateSaved, setTemplateSaved] = useState(false);

  async function load() {
    setLoading(true);
    const [empRes, templateRes] = await Promise.all([
      fetch(`/api/employees/${employeeId}`),
      fetch(`/api/employees/${employeeId}/schedule-template`),
    ]);

    if (empRes.status === 404) {
      setNotFound(true);
      setLoading(false);
      return;
    }

    if (empRes.ok) {
      const emp: Employee = await empRes.json();
      setEmployee(emp);
      setForm({
        name: emp.name,
        position: emp.position,
        hourlyRate: emp.hourlyRate != null ? String(emp.hourlyRate) : "",
        username: "",
        password: "",
      });
    }

    if (templateRes.ok) {
      const entries: { dayOfWeek: number; startTime: string; endTime: string }[] = await templateRes.json();
      setTemplate(
        emptyTemplate().map((day, index) => {
          const entry = entries.find((e) => e.dayOfWeek === index);
          return entry ? { enabled: true, startTime: entry.startTime, endTime: entry.endTime } : day;
        })
      );
    }

    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [employeeId]);

  function updateTemplateDay(index: number, patch: Partial<TemplateDay>) {
    setTemplate((prev) => prev.map((day, i) => (i === index ? { ...day, ...patch } : day)));
    setTemplateSaved(false);
  }

  async function handleSaveInfo(e: React.FormEvent) {
    e.preventDefault();
    setSavingInfo(true);
    setInfoError(null);
    setInfoSaved(false);
    try {
      const res = await fetch(`/api/employees/${employeeId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          position: form.position,
          hourlyRate: form.hourlyRate ? parseFloat(form.hourlyRate) : null,
          ...(form.username ? { username: form.username } : {}),
          ...(form.password ? { password: form.password } : {}),
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setInfoError(data.error || "Erreur lors de l'enregistrement");
        return;
      }
      setForm((f) => ({ ...f, username: "", password: "" }));
      setInfoSaved(true);
      await load();
    } finally {
      setSavingInfo(false);
    }
  }

  async function handleSaveTemplate() {
    setSavingTemplate(true);
    setTemplateError(null);
    setTemplateSaved(false);
    try {
      const entries = template
        .map((day, index) => ({ ...day, dayOfWeek: index }))
        .filter((day) => day.enabled)
        .map(({ dayOfWeek, startTime, endTime }) => ({ dayOfWeek, startTime, endTime }));

      const res = await fetch(`/api/employees/${employeeId}/schedule-template`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entries }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setTemplateError(data.error || "Erreur lors de l'enregistrement du planning de base");
        return;
      }
      setTemplateSaved(true);
    } finally {
      setSavingTemplate(false);
    }
  }

  async function handleDelete() {
    if (!employee) return;
    if (!confirm(`Supprimer l'employé "${employee.name}" ? Son compte et son planning seront aussi supprimés.`)) return;
    const res = await fetch(`/api/employees/${employeeId}`, { method: "DELETE" });
    if (res.ok) router.push("/planning/employes");
  }

  if (loading) {
    return <p className="text-sm text-gray-500">Chargement...</p>;
  }

  if (notFound || !employee) {
    return (
      <div>
        <Link href="/planning/employes" className="text-sm text-brand-600 hover:text-brand-800">
          ← Retour aux employés
        </Link>
        <p className="mt-4 text-sm text-gray-500">Employé introuvable.</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <Link href="/planning/employes" className="text-sm text-brand-600 hover:text-brand-800">
            ← Retour aux employés
          </Link>
          <h1 className="mt-1 text-xl font-bold text-gray-900">{employee.name}</h1>
          <p className="text-sm text-gray-500">{employee.position}</p>
        </div>
        <button
          onClick={handleDelete}
          title="Supprimer l'employé"
          aria-label="Supprimer l'employé"
          className="text-brand-600 hover:text-brand-800"
        >
          <Trash2 className="h-5 w-5" aria-hidden />
        </button>
      </div>

      <form onSubmit={handleSaveInfo} className="mb-6 space-y-4 rounded-lg border border-gray-200 bg-white p-4">
        <h2 className="text-sm font-semibold text-gray-900">Informations</h2>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Nom</label>
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full" required />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Poste</label>
            <input
              value={form.position}
              onChange={(e) => setForm({ ...form, position: e.target.value })}
              className="w-full"
              required
            />
          </div>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Taux horaire (€/h)</label>
          <input
            type="number"
            step="0.01"
            min="0"
            value={form.hourlyRate}
            onChange={(e) => setForm({ ...form, hourlyRate: e.target.value })}
            className="w-full sm:w-48"
          />
        </div>

        <div className="border-t border-gray-100 pt-3">
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-400">
            Accès à l&apos;application (laisser vide pour ne pas changer)
          </p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Identifiant</label>
              <input value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} className="w-full" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Mot de passe</label>
              <input
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                className="w-full"
                minLength={6}
              />
            </div>
          </div>
        </div>

        {infoError && <p className="text-sm text-brand-600">{infoError}</p>}

        <div className="flex items-center justify-end gap-3 pt-1">
          {infoSaved && <span className="text-sm text-green-600">Enregistré</span>}
          <button
            type="submit"
            disabled={savingInfo}
            className="rounded-md bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
          >
            {savingInfo ? "Enregistrement..." : "Enregistrer"}
          </button>
        </div>
      </form>

      <div className="rounded-lg border border-gray-200 bg-white p-4">
        <h2 className="text-sm font-semibold text-gray-900">Planning de base</h2>
        <p className="mt-1 text-xs text-gray-500">
          Horaires récurrents utilisés par le bouton « Appliquer le planning de base » dans le Planning pour créer
          les créneaux d&apos;une semaine automatiquement.
        </p>

        <div className="mt-4 overflow-x-auto">
          <table>
            <thead>
              <tr>
                <th>Jour</th>
                <th>Actif</th>
                <th>Début</th>
                <th>Fin</th>
              </tr>
            </thead>
            <tbody>
              {DAY_LABELS.map((label, index) => {
                const day = template[index];
                return (
                  <tr key={label}>
                    <td className="font-medium">{label}</td>
                    <td>
                      <input
                        type="checkbox"
                        checked={day.enabled}
                        onChange={(e) => updateTemplateDay(index, { enabled: e.target.checked })}
                        className="h-4 w-4"
                        aria-label={`${label} actif`}
                      />
                    </td>
                    <td>
                      <input
                        type="time"
                        value={day.startTime}
                        onChange={(e) => updateTemplateDay(index, { startTime: e.target.value })}
                        disabled={!day.enabled}
                        className="disabled:opacity-40"
                      />
                    </td>
                    <td>
                      <input
                        type="time"
                        value={day.endTime}
                        onChange={(e) => updateTemplateDay(index, { endTime: e.target.value })}
                        disabled={!day.enabled}
                        className="disabled:opacity-40"
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {templateError && <p className="mt-3 text-sm text-brand-600">{templateError}</p>}

        <div className="mt-4 flex items-center justify-end gap-3">
          {templateSaved && <span className="text-sm text-green-600">Enregistré</span>}
          <button
            onClick={handleSaveTemplate}
            disabled={savingTemplate}
            className="rounded-md bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
          >
            {savingTemplate ? "Enregistrement..." : "Enregistrer le planning de base"}
          </button>
        </div>
      </div>
    </div>
  );
}
