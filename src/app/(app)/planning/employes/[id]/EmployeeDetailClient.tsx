"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";
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
          const slots = entries.filter((e) => e.dayOfWeek === index).map(({ startTime, endTime }) => ({ startTime, endTime }));
          return slots.length ? { enabled: true, slots } : day;
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
        .flatMap(({ dayOfWeek, slots }) => slots.map((slot) => ({ dayOfWeek, ...slot })));

      const res = await fetch(`/api/employees/${employeeId}/schedule-template`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entries }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setTemplateError(data.error === "Données invalides" ? "Vérifiez les horaires : trois services maximum par jour, sans chevauchement, avec une fin après le début." : data.error || "Enregistrement impossible.");
        return;
      }
      setTemplateSaved(true);
    } catch { setTemplateError("Connexion impossible. Réessayez.");
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

      <div className="rounded-2xl border border-gray-200 bg-white p-5">
        <div className="flex flex-wrap items-center justify-between gap-2"><h2 className="text-lg font-semibold text-gray-900">Horaires habituels</h2><Link href="/planning" className="text-sm font-medium text-brand-700 hover:underline">Retour au planning ↗</Link></div>
        <p className="mt-1 text-xs text-gray-500">
          Horaires récurrents utilisés par le bouton « Remplir avec le planning de base » dans le Planning pour créer
          les créneaux d&apos;une semaine automatiquement.
        </p>

        <div className="mt-5 space-y-3">
          {DAY_LABELS.map((label, index) => {
            const day = template[index];
            return <fieldset key={label} disabled={savingTemplate} className={`rounded-2xl border p-4 ${day.enabled ? "border-brand-100 bg-brand-50/30" : "border-gray-100 bg-gray-50"}`}>
              <label className="flex items-center gap-3 text-sm font-semibold"><input type="checkbox" checked={day.enabled} onChange={(e) => updateTemplateDay(index, { enabled: e.target.checked })} className="h-4 w-4 accent-brand-600" />{label}<span className="ml-auto text-xs font-normal text-gray-500">{day.enabled ? "Travaillé" : "Non planifié"}</span></label>
              {day.enabled && <div className="mt-4 space-y-3">{day.slots.map((slot, slotIndex) => <div key={slotIndex} className="flex items-end gap-2">
                <div className="grid min-w-0 flex-1 grid-cols-2 gap-3">{(["startTime", "endTime"] as const).map((field) => <div key={field}><label htmlFor={`template-${index}-${slotIndex}-${field}`} className="mb-1 block text-xs text-gray-500">Service {slotIndex + 1} · {field === "startTime" ? "début" : "fin"}</label><input id={`template-${index}-${slotIndex}-${field}`} type="time" value={slot[field]} onChange={(e) => updateTemplateDay(index, { slots: day.slots.map((s, i) => i === slotIndex ? { ...s, [field]: e.target.value } : s) })} className="w-full bg-white" required /></div>)}</div>
                {day.slots.length > 1 && <button type="button" aria-label={`Retirer le service ${slotIndex + 1} du ${label}`} onClick={() => updateTemplateDay(index, { slots: day.slots.filter((_, i) => i !== slotIndex) })} className="p-2.5 text-gray-400"><Trash2 className="h-4 w-4" /></button>}
              </div>)}{day.slots.length < 3 && <button type="button" onClick={() => updateTemplateDay(index, { slots: [...day.slots, { startTime: "18:00", endTime: "23:00" }] })} className="flex items-center gap-1 text-xs font-medium text-brand-700"><Plus className="h-4 w-4" />Ajouter un service</button>}</div>}
            </fieldset>;
          })}
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
