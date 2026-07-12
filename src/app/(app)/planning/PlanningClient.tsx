"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { addDays } from "date-fns";
import { Modal } from "@/components/Modal";
import {
  formatDayLabel,
  formatWeekRangeLabel,
  getWeekDays,
  getWeekStart,
  hoursBetween,
  toISODate,
} from "@/lib/dates";

type Employee = { id: string; name: string; position: string; hourlyRate: number | null };
type Shift = { id: string; employeeId: string; date: string; startTime: string; endTime: string };
type Absence = {
  id: string;
  employeeId: string;
  startDate: string;
  endDate: string;
  type: string;
  status: string;
  note: string | null;
};

const ABSENCE_LABELS: Record<string, string> = {
  CONGE_PAYE: "Congé payé",
  MALADIE: "Maladie",
  AUTRE: "Autre",
};

const ABSENCE_COLORS: Record<string, string> = {
  CONGE_PAYE: "bg-blue-100 text-blue-800",
  MALADIE: "bg-amber-100 text-amber-800",
  AUTRE: "bg-gray-200 text-gray-700",
};

export function PlanningClient({
  role,
  employeeId,
}: {
  role: "ADMIN" | "EMPLOYEE";
  employeeId: string | null;
}) {
  const isAdmin = role === "ADMIN";

  const [weekStart, setWeekStart] = useState(() => getWeekStart(new Date()));
  const weekDays = useMemo(() => getWeekDays(weekStart), [weekStart]);
  const weekStartISO = toISODate(weekDays[0]);
  const weekEndISO = toISODate(weekDays[6]);

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [absences, setAbsences] = useState<Absence[]>([]);
  const [upcomingAbsences, setUpcomingAbsences] = useState<Absence[]>([]);
  const [loading, setLoading] = useState(true);

  const [shiftModal, setShiftModal] = useState<{
    shift: Shift | null;
    employeeId: string;
    date: string;
  } | null>(null);
  const [showAbsenceForm, setShowAbsenceForm] = useState(false);

  async function loadWeek() {
    setLoading(true);
    const [empRes, shiftRes, absRes, upcomingRes] = await Promise.all([
      fetch("/api/employees"),
      fetch(`/api/shifts?start=${weekStartISO}&end=${weekEndISO}`),
      fetch(`/api/absences?start=${weekStartISO}&end=${weekEndISO}`),
      fetch(`/api/absences?upcoming=true`),
    ]);
    if (empRes.ok) setEmployees(await empRes.json());
    if (shiftRes.ok) setShifts(await shiftRes.json());
    if (absRes.ok) setAbsences(await absRes.json());
    if (upcomingRes.ok) setUpcomingAbsences(await upcomingRes.json());
    setLoading(false);
  }

  useEffect(() => {
    loadWeek();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weekStartISO]);

  function absenceFor(empId: string, dateISO: string) {
    return absences.find(
      (a) => a.employeeId === empId && a.status === "APPROVED" && a.startDate <= dateISO && dateISO <= a.endDate
    );
  }

  function shiftsFor(empId: string, dateISO: string) {
    return shifts.filter((s) => s.employeeId === empId && s.date === dateISO);
  }

  function weeklyHours(empId: string) {
    return shifts
      .filter((s) => s.employeeId === empId)
      .reduce((sum, s) => sum + hoursBetween(s.startTime, s.endTime), 0);
  }

  const totalWeeklyCost = employees.reduce((sum, e) => {
    const hours = weeklyHours(e.id);
    return sum + (e.hourlyRate ? hours * e.hourlyRate : 0);
  }, 0);

  async function handleDeleteShift(shift: Shift) {
    if (!confirm("Supprimer ce créneau ?")) return;
    const res = await fetch(`/api/shifts/${shift.id}`, { method: "DELETE" });
    if (res.ok) await loadWeek();
  }

  const [applyingTemplate, setApplyingTemplate] = useState(false);

  async function handleApplyTemplate() {
    if (!confirm(`Appliquer le planning de base à la semaine du ${weekStartISO} ?`)) return;
    setApplyingTemplate(true);
    try {
      const res = await fetch("/api/shifts/apply-template", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ weekStart: weekStartISO }),
      });
      if (res.ok) {
        const data = await res.json();
        await loadWeek();
        alert(`${data.created} créneau(x) créé(s) à partir du planning de base.`);
      }
    } finally {
      setApplyingTemplate(false);
    }
  }

  const visibleEmployees = isAdmin ? employees : employees;

  return (
    <div className="space-y-8">
      <div>
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Planning</h1>
            <p className="text-sm text-gray-500">{formatWeekRangeLabel(weekStart)}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {isAdmin && (
              <Link
                href="/planning/employes"
                className="whitespace-nowrap rounded-md border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Gérer les employés
              </Link>
            )}
            {isAdmin && (
              <button
                onClick={handleApplyTemplate}
                disabled={applyingTemplate}
                className="whitespace-nowrap rounded-md border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                {applyingTemplate ? "Application..." : "Appliquer le planning de base"}
              </button>
            )}
            <button
              onClick={() => setWeekStart((d) => addDays(d, -7))}
              className="rounded-md border border-gray-300 px-3 py-2 text-sm hover:bg-gray-50"
            >
              ← Précédente
            </button>
            <button
              onClick={() => setWeekStart(getWeekStart(new Date()))}
              className="rounded-md border border-gray-300 px-3 py-2 text-sm hover:bg-gray-50"
            >
              Aujourd&apos;hui
            </button>
            <button
              onClick={() => setWeekStart((d) => addDays(d, 7))}
              className="rounded-md border border-gray-300 px-3 py-2 text-sm hover:bg-gray-50"
            >
              Suivante →
            </button>
          </div>
        </div>

        {loading ? (
          <p className="text-sm text-gray-500">Chargement...</p>
        ) : employees.length === 0 ? (
          <p className="text-sm text-gray-500">
            Aucun employé pour l&apos;instant.{" "}
            {isAdmin && (
              <Link href="/planning/employes" className="text-brand-600 hover:underline">
                Ajoutez votre équipe
              </Link>
            )}
          </p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
            <table>
              <thead>
                <tr>
                  <th className="sticky left-0 bg-white">Employé</th>
                  {weekDays.map((d) => (
                    <th key={d.toISOString()} className="min-w-[120px] capitalize">
                      {formatDayLabel(d)}
                    </th>
                  ))}
                  <th className="min-w-[90px]">Total</th>
                </tr>
              </thead>
              <tbody>
                {visibleEmployees.map((emp) => (
                  <tr key={emp.id}>
                    <td className="sticky left-0 bg-white font-medium">
                      {emp.name}
                      <div className="text-xs font-normal text-gray-400">{emp.position}</div>
                    </td>
                    {weekDays.map((d) => {
                      const dateISO = toISODate(d);
                      const absence = absenceFor(emp.id, dateISO);
                      const dayShifts = shiftsFor(emp.id, dateISO);
                      return (
                        <td key={dateISO} className="align-top">
                          {absence ? (
                            <span
                              className={`inline-block rounded px-2 py-1 text-xs font-medium ${ABSENCE_COLORS[absence.type]}`}
                            >
                              {ABSENCE_LABELS[absence.type] ?? absence.type}
                            </span>
                          ) : (
                            <div className="flex flex-col gap-1">
                              {dayShifts.map((s) => (
                                <button
                                  key={s.id}
                                  onClick={() =>
                                    isAdmin && setShiftModal({ shift: s, employeeId: emp.id, date: dateISO })
                                  }
                                  className={`rounded bg-brand-50 px-2 py-1 text-left text-xs font-medium text-brand-700 ${
                                    isAdmin ? "hover:bg-brand-100" : "cursor-default"
                                  }`}
                                >
                                  {s.startTime}–{s.endTime}
                                </button>
                              ))}
                              {isAdmin && (
                                <button
                                  onClick={() => setShiftModal({ shift: null, employeeId: emp.id, date: dateISO })}
                                  className="rounded border border-dashed border-gray-300 px-2 py-1 text-xs text-gray-400 hover:border-brand-400 hover:text-brand-600"
                                >
                                  + créneau
                                </button>
                              )}
                            </div>
                          )}
                        </td>
                      );
                    })}
                    <td className="whitespace-nowrap font-medium">
                      {weeklyHours(emp.id).toFixed(1)} h
                      {emp.hourlyRate ? (
                        <div className="text-xs font-normal text-gray-400">
                          {(weeklyHours(emp.id) * emp.hourlyRate).toFixed(0)} €
                        </div>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {isAdmin && totalWeeklyCost > 0 && (
          <p className="mt-3 text-sm text-gray-600">
            Coût salarial total de la semaine : <strong>{totalWeeklyCost.toFixed(0)} €</strong>
          </p>
        )}
      </div>

      <AbsencesSection
        isAdmin={isAdmin}
        employeeId={employeeId}
        employees={employees}
        upcomingAbsences={upcomingAbsences}
        onChanged={loadWeek}
        showForm={showAbsenceForm}
        setShowForm={setShowAbsenceForm}
      />

      {shiftModal && (
        <ShiftModal
          shift={shiftModal.shift}
          employeeId={shiftModal.employeeId}
          date={shiftModal.date}
          employees={employees}
          onClose={() => setShiftModal(null)}
          onSaved={loadWeek}
          onDelete={shiftModal.shift ? () => handleDeleteShift(shiftModal.shift!) : undefined}
        />
      )}
    </div>
  );
}

function ShiftModal({
  shift,
  employeeId,
  date,
  employees,
  onClose,
  onSaved,
  onDelete,
}: {
  shift: Shift | null;
  employeeId: string;
  date: string;
  employees: Employee[];
  onClose: () => void;
  onSaved: () => void;
  onDelete?: () => void;
}) {
  const [empId, setEmpId] = useState(employeeId);
  const [startTime, setStartTime] = useState(shift?.startTime ?? "09:00");
  const [endTime, setEndTime] = useState(shift?.endTime ?? "17:00");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const employee = employees.find((e) => e.id === empId);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const url = shift ? `/api/shifts/${shift.id}` : "/api/shifts";
    const method = shift ? "PUT" : "POST";

    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ employeeId: empId, date, startTime, endTime }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Erreur lors de l'enregistrement");
        return;
      }
      onClose();
      onSaved();
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title={shift ? "Modifier le créneau" : "Nouveau créneau"} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <p className="text-sm text-gray-500">
          {employee?.name} — {date}
        </p>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Employé</label>
          <select value={empId} onChange={(e) => setEmpId(e.target.value)} className="w-full">
            {employees.map((e) => (
              <option key={e.id} value={e.id}>
                {e.name}
              </option>
            ))}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Début</label>
            <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} className="w-full" required />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Fin</label>
            <input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} className="w-full" required />
          </div>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex items-center justify-between pt-2">
          {onDelete ? (
            <button type="button" onClick={onDelete} className="text-sm text-red-600 hover:text-red-800">
              Supprimer
            </button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <button type="button" onClick={onClose} className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700">
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
        </div>
      </form>
    </Modal>
  );
}

function AbsencesSection({
  isAdmin,
  employeeId,
  employees,
  upcomingAbsences,
  onChanged,
  showForm,
  setShowForm,
}: {
  isAdmin: boolean;
  employeeId: string | null;
  employees: Employee[];
  upcomingAbsences: Absence[];
  onChanged: () => void;
  showForm: boolean;
  setShowForm: (v: boolean) => void;
}) {
  const [empId, setEmpId] = useState(employeeId ?? employees[0]?.id ?? "");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [type, setType] = useState("CONGE_PAYE");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isAdmin && employeeId) setEmpId(employeeId);
    if (isAdmin && !empId && employees[0]) setEmpId(employees[0].id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [employees, employeeId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/absences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ employeeId: empId, startDate, endDate, type, note: note || null }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Erreur lors de l'enregistrement");
        return;
      }
      setShowForm(false);
      setStartDate("");
      setEndDate("");
      setNote("");
      onChanged();
    } finally {
      setSaving(false);
    }
  }

  async function updateStatus(absence: Absence, status: "APPROVED" | "REJECTED") {
    await fetch(`/api/absences/${absence.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    onChanged();
  }

  async function handleDelete(absence: Absence) {
    if (!confirm("Supprimer ce congé/absence ?")) return;
    await fetch(`/api/absences/${absence.id}`, { method: "DELETE" });
    onChanged();
  }

  const employeeName = (id: string) => employees.find((e) => e.id === id)?.name ?? "?";

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-bold text-gray-900">Congés &amp; absences à venir</h2>
        <button
          onClick={() => setShowForm(true)}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          {isAdmin ? "+ Déclarer une absence" : "+ Demander un congé"}
        </button>
      </div>

      {upcomingAbsences.length === 0 ? (
        <p className="text-sm text-gray-500">Aucun congé ou absence à venir.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
          <table>
            <thead>
              <tr>
                <th>Employé</th>
                <th>Type</th>
                <th>Du</th>
                <th>Au</th>
                <th>Statut</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {upcomingAbsences.map((a) => (
                <tr key={a.id}>
                  <td className="font-medium">{employeeName(a.employeeId)}</td>
                  <td>{ABSENCE_LABELS[a.type] ?? a.type}</td>
                  <td>{a.startDate}</td>
                  <td>{a.endDate}</td>
                  <td>
                    <span
                      className={`rounded px-2 py-0.5 text-xs font-medium ${
                        a.status === "APPROVED"
                          ? "bg-green-100 text-green-800"
                          : a.status === "PENDING"
                          ? "bg-yellow-100 text-yellow-800"
                          : "bg-red-100 text-red-800"
                      }`}
                    >
                      {a.status === "APPROVED" ? "Validé" : a.status === "PENDING" ? "En attente" : "Refusé"}
                    </span>
                  </td>
                  <td>
                    <div className="flex justify-end gap-3 whitespace-nowrap text-sm">
                      {isAdmin && a.status === "PENDING" && (
                        <>
                          <button onClick={() => updateStatus(a, "APPROVED")} className="text-green-700 hover:underline">
                            Valider
                          </button>
                          <button onClick={() => updateStatus(a, "REJECTED")} className="text-red-600 hover:underline">
                            Refuser
                          </button>
                        </>
                      )}
                      {isAdmin && (
                        <button onClick={() => handleDelete(a)} title="Supprimer" aria-label="Supprimer" className="text-gray-400 hover:text-red-600">
                          🗑️
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showForm && (
        <Modal title={isAdmin ? "Déclarer une absence" : "Demander un congé"} onClose={() => setShowForm(false)}>
          <form onSubmit={handleSubmit} className="space-y-4">
            {isAdmin && (
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Employé</label>
                <select value={empId} onChange={(e) => setEmpId(e.target.value)} className="w-full">
                  {employees.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Du</label>
                <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full" required />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Au</label>
                <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-full" required />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Type</label>
              <select value={type} onChange={(e) => setType(e.target.value)} className="w-full">
                <option value="CONGE_PAYE">Congé payé</option>
                <option value="MALADIE">Maladie</option>
                <option value="AUTRE">Autre</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Note (optionnel)</label>
              <input value={note} onChange={(e) => setNote(e.target.value)} className="w-full" />
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
