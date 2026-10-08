"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { addDays, format } from "date-fns";
import { fr } from "date-fns/locale";
import { CalendarDays, ChevronLeft, ChevronRight, Clock3, Plus, Search, Trash2, Users } from "lucide-react";
import { Modal } from "@/components/Modal";
import { formatDayLabel, formatWeekRangeLabel, getWeekDays, getWeekStart, hoursBetween, toISODate } from "@/lib/dates";
import { ShiftEditor, type PlanningEmployee as Employee, type PlanningShift as Shift, type ShiftTarget } from "./ShiftEditor";

type Absence = { id: string; employeeId: string; startDate: string; endDate: string; type: string; status: string; note: string | null };
const ABSENCE_LABELS: Record<string, string> = { REPOS: "Jour off", CONGE_PAYE: "Congé payé", MALADIE: "Maladie", AUTRE: "Absence" };
const ABSENCE_COLORS: Record<string, string> = { REPOS: "bg-emerald-50 text-emerald-800", CONGE_PAYE: "bg-blue-50 text-blue-800", MALADIE: "bg-amber-50 text-amber-800", AUTRE: "bg-gray-100 text-gray-700" };
const employeeColors = ["border-brand-200 bg-brand-50 text-brand-800", "border-blue-200 bg-blue-50 text-blue-800", "border-emerald-200 bg-emerald-50 text-emerald-800", "border-amber-200 bg-amber-50 text-amber-800"];
const hoursLabel = (hours: number) => `${hours.toLocaleString("fr-FR", { maximumFractionDigits: 1 })} h`;

export function PlanningClient({ isAdmin, employeeId }: { isAdmin: boolean; employeeId: string | null }) {
  const [weekStart, setWeekStart] = useState(() => getWeekStart(new Date()));
  const weekDays = useMemo(() => getWeekDays(weekStart), [weekStart]);
  const weekStartISO = toISODate(weekDays[0]);
  const weekEndISO = toISODate(weekDays[6]);
  const todayISO = toISODate(new Date());
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [absences, setAbsences] = useState<Absence[]>([]);
  const [upcomingAbsences, setUpcomingAbsences] = useState<Absence[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [view, setView] = useState<"mine" | "team">(isAdmin ? "team" : "mine");
  const [search, setSearch] = useState("");
  const [selectedEmployee, setSelectedEmployee] = useState("");
  const [shiftModal, setShiftModal] = useState<ShiftTarget | null>(null);
  const [showAbsenceForm, setShowAbsenceForm] = useState(false);
  const [applyingTemplate, setApplyingTemplate] = useState(false);
  const requestId = useRef(0);

  const loadWeek = useCallback(async () => {
    const id = ++requestId.current;
    setLoading(true);
    setLoadError(null);
    try {
      const responses = await Promise.all([
        fetch("/api/employees"), fetch(`/api/shifts?start=${weekStartISO}&end=${weekEndISO}`),
        fetch(`/api/absences?start=${weekStartISO}&end=${weekEndISO}`), fetch("/api/absences?upcoming=true"),
      ]);
      if (responses.some((res) => !res.ok)) throw new Error("Impossible de charger le planning. Réessayez.");
      const [people, slots, leave, upcoming] = await Promise.all(responses.map((res) => res.json()));
      if (id !== requestId.current) return;
      setEmployees(people); setShifts(slots); setAbsences(leave); setUpcomingAbsences(upcoming);
    } catch (error) {
      if (id === requestId.current) setLoadError(error instanceof Error ? error.message : "Connexion impossible.");
    } finally { if (id === requestId.current) setLoading(false); }
  }, [weekStartISO, weekEndISO]);

  useEffect(() => { void loadWeek(); return () => { requestId.current++; }; }, [loadWeek]);
  function absenceFor(empId: string, date: string) { return absences.find((a) => a.employeeId === empId && a.status === "APPROVED" && a.startDate <= date && date <= a.endDate); }
  function shiftsFor(empId: string, date: string) { return shifts.filter((s) => s.employeeId === empId && s.date === date).sort((a, b) => a.startTime.localeCompare(b.startTime)); }
  function weeklyHours(empId: string) { return shifts.filter((s) => s.employeeId === empId).reduce((sum, s) => sum + hoursBetween(s.startTime, s.endTime), 0); }
  function colorFor(empId: string) { return employeeColors[Math.max(0, employees.findIndex((emp) => emp.id === empId)) % employeeColors.length]; }
  function changeWeek(offset: number) { setMessage(null); setWeekStart((d) => addDays(d, offset)); }
  async function onSaved(text: string) { setMessage(text); await loadWeek(); }

  async function applyTemplate() {
    if (!confirm(`Ajouter les horaires habituels du ${formatWeekRangeLabel(weekStart)} ? Les jours déjà planifiés et les absences validées seront conservés.`)) return;
    setApplyingTemplate(true); setMessage(null);
    try {
      const res = await fetch("/api/shifts/apply-template", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ weekStart: weekStartISO }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Application impossible.");
      await onSaved(data.created ? `${data.created} créneau(x) ajouté(s).${data.skippedAbsences ? ` ${data.skippedAbsences} service(s) ignoré(s) pendant une absence.` : ""}` : "Aucun créneau ajouté : vérifiez les horaires habituels de l’équipe ou les jours déjà planifiés.");
    } catch (error) { setLoadError(error instanceof Error ? error.message : "Connexion impossible."); }
    finally { setApplyingTemplate(false); }
  }

  const filteredEmployees = employees.filter((emp) => `${emp.name} ${emp.position}`.toLocaleLowerCase("fr").includes(search.toLocaleLowerCase("fr")));
  const displayedEmployee = view === "mine" ? employees.find((emp) => emp.id === employeeId) : filteredEmployees.find((emp) => emp.id === selectedEmployee) ?? filteredEmployees[0];
  const myShifts = shifts.filter((s) => s.employeeId === employeeId);
  const summaryShifts = view === "mine" ? myShifts : shifts;
  const totalHours = summaryShifts.reduce((sum, s) => sum + hoursBetween(s.startTime, s.endTime), 0);
  const totalWeeklyCost = employees.reduce((sum, emp) => sum + weeklyHours(emp.id) * (emp.hourlyRate ?? 0), 0);

  function slotContent(emp: Employee, date: string, large = false) {
    const absence = absenceFor(emp.id, date); const dayShifts = shiftsFor(emp.id, date);
    const rest = emp.restDays?.includes((new Date(`${date}T12:00:00Z`).getUTCDay() + 6) % 7);
    return <div className="space-y-2">
      {rest && !absence && <p className="rounded-xl bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-800">Jour off habituel{dayShifts.length ? " · Horaires à vérifier" : ""}</p>}
      {absence && <p className={`rounded-xl px-3 py-2 text-xs font-medium ${ABSENCE_COLORS[absence.type] ?? ABSENCE_COLORS.AUTRE}`}>{isAdmin || emp.id === employeeId ? ABSENCE_LABELS[absence.type] ?? "Absence" : "Absent"}</p>}
      {dayShifts.map((shift) => {
        const content = <><span className={`block whitespace-nowrap font-semibold tabular-nums ${large ? "text-lg" : "text-xs"}`}>{shift.startTime}{large ? " – " : "–"}{shift.endTime}</span><span className="mt-1 block text-xs opacity-75">{hoursLabel(hoursBetween(shift.startTime, shift.endTime))}{absence ? " · À vérifier : absence" : ""}</span></>;
        return isAdmin ? <button key={shift.id} onClick={() => setShiftModal({ shift, employeeId: emp.id, date })} title={`Modifier les horaires de ${emp.name} le ${date}`} className={`w-full rounded-xl border px-2 py-2.5 text-left transition hover:shadow-sm ${colorFor(emp.id)}`}>{content}</button> : <div key={shift.id} className={`rounded-xl border px-3 py-3 ${colorFor(emp.id)}`}>{content}</div>;
      })}
      {!absence && !rest && !dayShifts.length && <p className="py-2 text-sm text-gray-400">{isAdmin ? "Non planifié" : "Aucun horaire prévu"}</p>}
      {isAdmin && !absence && !rest && <button aria-label={`Ajouter des horaires pour ${emp.name} le ${date}`} onClick={() => setShiftModal({ shift: null, employeeId: emp.id, date })} className="flex w-full items-center justify-center gap-1 rounded-xl border border-dashed border-gray-200 px-2 py-2 text-xs font-medium text-gray-500 hover:border-brand-400 hover:bg-brand-50 hover:text-brand-700"><Plus className="h-3.5 w-3.5" />Ajouter</button>}
    </div>;
  }

  return <div className="space-y-6">
    <header className="flex flex-wrap items-start justify-between gap-4">
      <div><p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-brand-600">L’équipe au quotidien</p><h1 className="text-3xl font-semibold tracking-tight text-gray-900">{isAdmin ? "Planning de l’équipe" : "Mon planning"}<span className="text-brand-600">.</span></h1><p className="mt-2 text-sm text-gray-500">{isAdmin ? "Préparez la semaine et ajustez les horaires en quelques clics." : "Vos horaires et vos demandes de congés, toujours à portée de main."}</p></div>
      {isAdmin && <button disabled={loading || !employees.length} onClick={() => setShiftModal({ shift: null, employeeId: displayedEmployee?.id ?? employees[0].id, date: weekDays.some((d) => toISODate(d) === todayISO) ? todayISO : weekStartISO })} className="flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-3 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50"><Plus className="h-4 w-4" />Ajouter des horaires</button>}
    </header>
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-gray-200/60 bg-white p-3 shadow-sm">
      <div className="flex items-center gap-2"><button aria-label="Semaine précédente" onClick={() => changeWeek(-7)} className="rounded-xl p-2 hover:bg-gray-100"><ChevronLeft className="h-5 w-5" /></button><span className="text-sm font-semibold tabular-nums">{formatWeekRangeLabel(weekStart)}</span><button aria-label="Semaine suivante" onClick={() => changeWeek(7)} className="rounded-xl p-2 hover:bg-gray-100"><ChevronRight className="h-5 w-5" /></button></div>
      <div className="flex flex-wrap items-center gap-2"><button onClick={() => { setMessage(null); setWeekStart(getWeekStart(new Date())); }} className="rounded-xl border border-gray-200 px-3 py-2 text-xs font-medium">Cette semaine</button><label className="flex items-center gap-2 text-xs text-gray-500"><CalendarDays className="h-4 w-4" /><span className="sr-only">Choisir une semaine</span><input aria-label="Choisir une semaine" type="date" value={weekStartISO} onChange={(e) => { if (e.target.value) { setMessage(null); setWeekStart(getWeekStart(new Date(`${e.target.value}T12:00:00`))); } }} className="max-w-[155px] border-0 bg-gray-50 text-xs" /></label></div>
    </div>
    {isAdmin && <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-brand-100 bg-brand-50/60 px-5 py-4"><div><p className="text-sm font-semibold text-brand-900">Un rythme qui se répète ?</p><p className="mt-1 text-xs text-brand-700">Ajoutez les horaires habituels, puis modifiez uniquement ce qui change.</p></div><div className="flex flex-wrap gap-2"><Link href="/planning/employes" className="rounded-xl border border-brand-200 bg-white px-3 py-2 text-xs font-medium text-brand-800">Équipe & horaires habituels</Link><button onClick={applyTemplate} disabled={applyingTemplate || loading || !employees.length} className="rounded-xl bg-brand-600 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50">{applyingTemplate ? "Application…" : "Remplir avec le planning de base"}</button></div></div>}
    {message && <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{message}</p>}
    {loadError && <div role="alert" className="flex items-center justify-between gap-3 rounded-xl bg-brand-50 p-4 text-sm text-brand-800"><p>{loadError}</p><button onClick={() => void loadWeek()} className="font-semibold underline">Réessayer</button></div>}
    {!loading && !loadError && <div className={`grid grid-cols-2 gap-3 ${view === "mine" ? "sm:grid-cols-2" : "sm:grid-cols-3"}`}><Stat icon={<Clock3 className="h-4 w-4" />} label={view === "mine" ? "Mes heures" : "Heures planifiées"} value={hoursLabel(totalHours)} /><Stat icon={<CalendarDays className="h-4 w-4" />} label={view === "mine" ? "Jours travaillés" : "Services prévus"} value={String(view === "mine" ? new Set(myShifts.map((s) => s.date)).size : shifts.length)} />{view === "team" && <Stat icon={<Users className="h-4 w-4" />} label={isAdmin ? "Coût estimé de l’équipe" : "Employés planifiés"} value={isAdmin ? `${totalWeeklyCost.toLocaleString("fr-FR", { maximumFractionDigits: 0 })} €` : String(new Set(shifts.map((s) => s.employeeId)).size)} />}</div>}
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {isAdmin && <div className="flex gap-1 rounded-xl border border-gray-200 bg-white p-1" aria-label="Vue du planning">{employeeId && !isAdmin && <button aria-pressed={view === "mine"} onClick={() => setView("mine")} className={`rounded-lg px-4 py-2 text-sm font-medium ${view === "mine" ? "bg-brand-600 text-white" : "text-gray-500"}`}>Mes horaires</button>}<button aria-pressed={view === "team"} onClick={() => setView("team")} className={`rounded-lg px-4 py-2 text-sm font-medium ${view === "team" ? "bg-brand-600 text-white" : "text-gray-500"}`}>Toute l’équipe</button></div>}
        {view === "team" && <label className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3"><Search className="h-4 w-4 text-gray-400" /><input aria-label="Rechercher un employé ou un poste" placeholder="Rechercher un employé…" value={search} onChange={(e) => setSearch(e.target.value)} className="w-full max-w-[230px] border-0 bg-transparent focus:ring-0" /></label>}
      </div>
      {loading ? <div role="status" className="rounded-2xl border border-gray-200 bg-white p-8 text-sm text-gray-500">Chargement du planning…</div> : loadError ? null : !employees.length ? <div className="rounded-2xl bg-white p-8 text-sm text-gray-500">Aucun employé pour l’instant. {isAdmin && <Link href="/planning/employes" className="font-medium text-brand-700 underline">Ajouter l’équipe</Link>}</div> : <>
        {view === "team" && <div className="hidden overflow-x-auto rounded-2xl border border-gray-200/70 bg-white shadow-sm md:block"><table className="min-w-[900px] table-fixed"><colgroup><col className="w-[140px]" />{weekDays.map((day) => <col key={toISODate(day)} />)}<col className="w-16" /></colgroup><thead><tr><th className="sticky left-0 z-20 min-w-[140px] bg-white py-4">Employé</th>{weekDays.map((day) => { const iso = toISODate(day); return <th key={iso} className={`min-w-[100px] border-l border-gray-100 text-center ${iso === todayISO ? "bg-brand-50 text-brand-700" : ""}`}><span className="block capitalize">{format(day, "EEE", { locale: fr })}</span><span className={`mt-1 inline-flex h-8 w-8 items-center justify-center rounded-full text-base ${iso === todayISO ? "bg-brand-600 text-white" : "text-gray-900"}`}>{format(day, "d")}</span></th>; })}<th className="min-w-[64px] text-right">Total</th></tr></thead><tbody>{filteredEmployees.map((emp) => <tr key={emp.id}><td className="sticky left-0 z-10 bg-white py-5 align-top"><div className="flex items-center gap-2"><span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-xs font-semibold ${colorFor(emp.id)}`}>{emp.name.slice(0, 1)}</span><div><span className="block text-sm font-semibold">{emp.name}</span><span className="text-xs text-gray-500">{emp.position}</span></div></div>{isAdmin && <Link href={`/planning/employes/${emp.id}`} className="mt-3 block text-xs text-brand-700 hover:underline">Modifier la fiche ↗</Link>}</td>{weekDays.map((day) => { const iso = toISODate(day); return <td key={iso} className={`border-l border-gray-100 px-2 py-4 align-top ${iso === todayISO ? "bg-brand-50/30" : ""}`}>{slotContent(emp, iso)}</td>; })}<td className="whitespace-nowrap py-5 text-right align-top"><span className="text-sm font-semibold">{hoursLabel(weeklyHours(emp.id))}</span>{isAdmin && emp.weeklyHours != null && <span className={`mt-1 block text-xs ${weeklyHours(emp.id) > emp.weeklyHours ? "text-amber-700" : "text-gray-400"}`}>/ {hoursLabel(emp.weeklyHours)} prévues</span>}{isAdmin && emp.hourlyRate !== null && <span className="mt-1 block text-xs text-gray-400">{(weeklyHours(emp.id) * emp.hourlyRate).toFixed(0)} €</span>}</td></tr>)}</tbody></table>{!filteredEmployees.length && <p className="p-6 text-sm text-gray-500">Aucun employé ne correspond à la recherche.</p>}</div>}
        <div className={view === "team" ? "md:hidden" : ""}>
          {view === "team" && <div className="mb-4"><label htmlFor="planning-person" className="mb-2 block text-sm font-medium">Planning de</label><select id="planning-person" value={displayedEmployee?.id ?? ""} onChange={(e) => setSelectedEmployee(e.target.value)} className="w-full bg-white">{filteredEmployees.map((emp) => <option key={emp.id} value={emp.id}>{emp.name} · {emp.position}</option>)}</select></div>}
          {isAdmin && displayedEmployee && <Link href={`/planning/employes/${displayedEmployee.id}`} className="mb-4 block text-sm font-medium text-brand-700">Modifier la fiche de {displayedEmployee.name} ↗</Link>}
          {displayedEmployee ? <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{weekDays.map((day) => { const iso = toISODate(day); const dayHours = shiftsFor(displayedEmployee.id, iso).reduce((sum, s) => sum + hoursBetween(s.startTime, s.endTime), 0); return <article key={iso} className={`rounded-2xl border bg-white p-5 shadow-sm ${iso === todayISO ? "border-brand-300 ring-1 ring-brand-100" : "border-gray-200/70"}`}><div className="mb-4 flex items-center justify-between gap-2"><h2 className="text-sm font-semibold capitalize">{formatDayLabel(day)}</h2>{iso === todayISO ? <span className="rounded-full bg-brand-50 px-2 py-1 text-[10px] font-semibold text-brand-700">Aujourd’hui</span> : dayHours > 0 ? <span className="text-xs text-gray-500">{hoursLabel(dayHours)}</span> : null}</div>{slotContent(displayedEmployee, iso, true)}</article>; })}</div> : <p className="rounded-2xl bg-white p-6 text-sm text-gray-500">{view === "mine" ? "Votre compte n’est pas rattaché à un employé de ce restaurant. Contactez votre gérant." : "Aucun employé ne correspond à la recherche."}</p>}
        </div>
      </>}
    </section>
    {!loading && <AbsencesSection isAdmin={isAdmin} employeeId={employeeId} employees={employees} upcomingAbsences={upcomingAbsences} onChanged={loadWeek} showForm={showAbsenceForm} setShowForm={setShowAbsenceForm} />}
    {shiftModal && isAdmin && <ShiftEditor target={shiftModal} employees={employees} weekDays={weekDays} onClose={() => setShiftModal(null)} onSaved={onSaved} />}
  </div>;
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return <div className="rounded-2xl border border-gray-200/60 bg-white px-4 py-4"><div className="mb-2 flex items-center gap-2 text-xs text-gray-500">{icon}{label}</div><p className="text-2xl font-semibold tracking-tight text-gray-900">{value}</p></div>;
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
      await onChanged();
    } catch { setError("Connexion impossible. Réessayez.");
    } finally {
      setSaving(false);
    }
  }

  async function mutateAbsence(absence: Absence, method: "PUT" | "DELETE", status?: string) {
    setSaving(true); setError(null);
    try {
      const res = await fetch(`/api/absences/${absence.id}`, {
        method, headers: { "Content-Type": "application/json" }, ...(status ? { body: JSON.stringify({ status }) } : {}),
      });
      if (!res.ok) { const data = await res.json(); setError(data.error || "Modification impossible."); return; }
      await onChanged();
    } catch { setError("Connexion impossible. Réessayez."); }
    finally { setSaving(false); }
  }
  async function updateStatus(absence: Absence, status: "APPROVED" | "REJECTED") { await mutateAbsence(absence, "PUT", status); }
  async function handleDelete(absence: Absence) {
    if (confirm("Supprimer ce congé/absence ?")) await mutateAbsence(absence, "DELETE");
  }

  const employeeName = (id: string) => employees.find((e) => e.id === id)?.name ?? "?";

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-gray-900">{isAdmin ? "Repos, congés & absences à venir" : "Mes demandes de congés"}</h2>
        <button
          onClick={() => { setError(null); setShowForm(true); }}
          disabled={!isAdmin && !employeeId}
          className="rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
        >
          {isAdmin ? "+ Ajouter un repos / une absence" : "+ Demander un congé"}
        </button>
      </div>

      {error && !showForm && <p role="alert" className="mb-3 text-sm text-brand-700">{error}</p>}
      {upcomingAbsences.length === 0 ? (
        <p className="text-sm text-gray-500">Aucun congé ou absence à venir.</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {upcomingAbsences.map((a) => (
            <article key={a.id} className="rounded-2xl border border-gray-200/60 bg-white p-5">
              <div className="flex items-start justify-between gap-3">
                <div><h3 className="text-sm font-semibold">{isAdmin ? employeeName(a.employeeId) : ABSENCE_LABELS[a.type] ?? a.type}</h3>{isAdmin && <p className="mt-1 text-xs text-gray-500">{ABSENCE_LABELS[a.type] ?? a.type}</p>}</div>
                <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${a.status === "APPROVED" ? "bg-emerald-50 text-emerald-800" : a.status === "PENDING" ? "bg-amber-50 text-amber-800" : "bg-brand-50 text-brand-800"}`}>{a.status === "APPROVED" ? "Validé" : a.status === "PENDING" ? "En attente" : "Refusé"}</span>
              </div>
              <p className="mt-4 text-sm text-gray-600">Du {a.startDate.split("-").reverse().join("/")} au {a.endDate.split("-").reverse().join("/")}</p>
              {a.note && <p className="mt-2 break-words text-xs text-gray-500">{a.note}</p>}
              {isAdmin && <div className="mt-4 flex items-center justify-end gap-3 border-t border-gray-100 pt-3 text-sm">
                {a.status === "PENDING" && <><button disabled={saving} onClick={() => updateStatus(a, "APPROVED")} className="rounded-lg bg-emerald-50 px-3 py-2 font-medium text-emerald-800">Valider</button><button disabled={saving} onClick={() => updateStatus(a, "REJECTED")} className="text-brand-700">Refuser</button></>}
                <button disabled={saving} onClick={() => handleDelete(a)} aria-label={`Supprimer l’absence de ${employeeName(a.employeeId)}`} className="p-2 text-gray-400 hover:text-brand-600"><Trash2 className="h-4 w-4" aria-hidden /></button>
              </div>}
            </article>
          ))}
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
                <option value="REPOS">Jour off / repos</option>
                <option value="CONGE_PAYE">Congé payé</option>
                <option value="MALADIE">Maladie</option>
                <option value="AUTRE">Autre</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Note (optionnel)</label>
              <input value={note} onChange={(e) => setNote(e.target.value)} className="w-full" />
            </div>

            {error && <p className="text-sm text-brand-600">{error}</p>}

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
