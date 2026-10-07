"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Modal } from "@/components/Modal";
import { formatDayLabel, hoursBetween, toISODate } from "@/lib/dates";

export type PlanningEmployee = { id: string; name: string; position: string; hourlyRate: number | null; restDays: number[]; weeklyHours: number | null };
export type PlanningShift = { id: string; employeeId: string; date: string; startTime: string; endTime: string };
export type ShiftTarget = { shift: PlanningShift | null; employeeId: string; date: string };

export function ShiftEditor({ target, employees, weekDays, onClose, onSaved }: {
  target: ShiftTarget;
  employees: PlanningEmployee[];
  weekDays: Date[];
  onClose: () => void;
  onSaved: (message: string) => Promise<void>;
}) {
  const [empId, setEmpId] = useState(target.employeeId);
  const [dates, setDates] = useState([target.date]);
  const [slots, setSlots] = useState([{ startTime: target.shift?.startTime ?? "09:00", endTime: target.shift?.endTime ?? "17:00" }]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const editing = !!target.shift;
  const duration = slots.reduce((sum, slot) => sum + Math.max(0, hoursBetween(slot.startTime, slot.endTime)), 0);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!dates.length) { setError("Sélectionnez au moins un jour."); return; }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(editing ? `/api/shifts/${target.shift!.id}` : "/api/shifts/batch", {
        method: editing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editing ? { employeeId: empId, date: dates[0], ...slots[0] } : { employeeId: empId, dates, slots }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error === "Données invalides" ? "Vérifiez les jours et les horaires : la fin doit suivre le début et les services ne doivent pas se chevaucher." : data.error || "Enregistrement impossible.");
        return;
      }
      await onSaved(editing ? "Créneau modifié." : `${data.created} créneau${data.created > 1 ? "x" : ""} ajouté${data.created > 1 ? "s" : ""}.`);
      onClose();
    } catch { setError("Connexion impossible. Réessayez."); }
    finally { setSaving(false); }
  }

  async function remove() {
    if (!target.shift || !confirm("Supprimer ce créneau ?")) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/shifts/${target.shift.id}`, { method: "DELETE" });
      if (!res.ok) { setError("Suppression impossible."); return; }
      await onSaved("Créneau supprimé.");
      onClose();
    } catch { setError("Connexion impossible. Réessayez."); }
    finally { setSaving(false); }
  }

  return <Modal title={editing ? "Modifier le créneau" : "Ajouter des horaires"} onClose={() => !saving && onClose()} wide>
    <form onSubmit={submit} className="space-y-5">
      <fieldset disabled={saving} className="space-y-5 disabled:opacity-60">
        <div><label htmlFor="shift-employee" className="mb-2 block text-sm font-medium">Employé</label>
          <select id="shift-employee" value={empId} onChange={(e) => setEmpId(e.target.value)} className="w-full" required>
            {employees.map((emp) => <option key={emp.id} value={emp.id}>{emp.name} · {emp.position}</option>)}
          </select>
        </div>
        {editing ? <div><label htmlFor="shift-date" className="mb-2 block text-sm font-medium">Jour</label><input id="shift-date" type="date" required value={dates[0]} onChange={(e) => setDates([e.target.value])} className="w-full" /></div> :
          <fieldset><legend className="mb-2 text-sm font-medium">Jours à planifier</legend>
            <div className="flex flex-wrap gap-2">{weekDays.map((day) => {
              const iso = toISODate(day); const selected = dates.includes(iso);
              return <button type="button" key={iso} aria-pressed={selected} onClick={() => setDates((prev) => selected ? prev.filter((d) => d !== iso) : [...prev, iso].sort())} className={`rounded-xl border px-3 py-2 text-sm capitalize ${selected ? "border-brand-600 bg-brand-600 text-white" : "border-gray-200 bg-white text-gray-600"}`}>{formatDayLabel(day)}</button>;
            })}</div>
            <p className="mt-2 text-xs text-gray-500">Les mêmes horaires seront ajoutés à chaque jour sélectionné.</p>
          </fieldset>}
        <div className="space-y-3">{slots.map((slot, index) => <div key={index} className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
          <div className="mb-3 flex items-center justify-between"><span className="text-sm font-semibold">Service {index + 1}</span>{index > 0 && <button type="button" aria-label={`Retirer le service ${index + 1}`} onClick={() => setSlots((prev) => prev.filter((_, i) => i !== index))}><Trash2 className="h-4 w-4 text-gray-500" /></button>}</div>
          <div className="grid grid-cols-2 gap-3">{(["startTime", "endTime"] as const).map((field) => <div key={field}>
            <label htmlFor={`${field}-${index}`} className="mb-1 block text-sm text-gray-600">{field === "startTime" ? "Début" : "Fin"}</label>
            <input id={`${field}-${index}`} type="time" value={slot[field]} onChange={(e) => setSlots((prev) => prev.map((s, i) => i === index ? { ...s, [field]: e.target.value } : s))} className="w-full bg-white" required />
          </div>)}</div>
        </div>)}</div>
        {!editing && slots.length < 3 && <button type="button" onClick={() => setSlots((prev) => [...prev, { startTime: "18:00", endTime: "23:00" }])} className="flex items-center gap-2 text-sm font-medium text-brand-700"><Plus className="h-4 w-4" />Ajouter un service (coupure)</button>}
      </fieldset>
      <p className="rounded-xl bg-brand-50 px-4 py-3 text-sm text-brand-800">{duration.toLocaleString("fr-FR")} h par jour · {dates.length} jour{dates.length > 1 ? "s" : ""} · {(duration * dates.length).toLocaleString("fr-FR")} h au total</p>
      {error && <p role="alert" className="text-sm text-brand-700">{error}</p>}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 pt-4">
        {editing ? <button type="button" disabled={saving} onClick={remove} className="text-sm text-brand-700">Supprimer</button> : <span />}
        <div className="flex gap-2"><button type="button" disabled={saving} onClick={onClose} className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm">Annuler</button><button disabled={saving || !dates.length} className="rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{saving ? "Enregistrement…" : editing ? "Enregistrer" : "Ajouter les horaires"}</button></div>
      </div>
    </form>
  </Modal>;
}
