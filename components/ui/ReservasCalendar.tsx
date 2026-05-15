'use client'

import { useState, useMemo } from 'react'

// ── Types ──────────────────────────────────────────────────────────────
export interface CalReserva {
  id: string
  titulo: string
  fecha: string        // 'YYYY-MM-DD'
  hora_inicio: string  // 'HH:MM' or 'HH:MM:SS'
  hora_fin: string
  estado: 'pendiente' | 'confirmada' | 'cancelada'
  salas: { id: string; nombre: string; capacidad: number; ubicacion: string | null } | null
}

interface Props {
  reservas: CalReserva[]
  loading?: boolean
  onNewReserva: (fecha?: string) => void
  onEditReserva: (reserva: CalReserva) => void
  onCancelReserva: (id: string) => void
  onDeleteReserva: (id: string) => void
  cancelingId?: string | null
  deletingId?: string | null
}

type CalView = 'month' | 'week' | 'day'

// ── Constants ──────────────────────────────────────────────────────────
const DIAS_SHORT = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
const DIAS_FULL  = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']
const MESES      = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']

const HOUR_START = 7
const HOUR_END   = 22
const SLOT_H     = 64   // px per hour
const HOURS      = Array.from({ length: HOUR_END - HOUR_START }, (_, i) => HOUR_START + i)

// ── Helpers ────────────────────────────────────────────────────────────
function pad2(n: number) { return String(n).padStart(2, '0') }

function toLocal(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`
}

function parseMin(hms: string): number {
  const [h, m] = hms.split(':').map(Number)
  return h * 60 + (m || 0)
}

// ── Event style by status ──────────────────────────────────────────────
const EV: Record<string, { bg: string; text: string; dot: string; border: string; pill: string; bar: string }> = {
  confirmada: {
    bg:     'bg-primary/[0.10]',
    text:   'text-primary',
    dot:    'bg-primary',
    border: 'border-primary/25',
    pill:   'bg-primary/15 text-primary',
    bar:    'bg-primary',
  },
  pendiente: {
    bg:     'bg-amber-50',
    text:   'text-amber-700',
    dot:    'bg-amber-400',
    border: 'border-amber-200',
    pill:   'bg-amber-100 text-amber-700',
    bar:    'bg-amber-400',
  },
  cancelada: {
    bg:     'bg-surface-container-high',
    text:   'text-on-surface-variant',
    dot:    'bg-outline-variant',
    border: 'border-outline-variant/20',
    pill:   'bg-surface-container-high text-on-surface-variant',
    bar:    'bg-outline-variant',
  },
}

// ── Detail row helper ──────────────────────────────────────────────────
function Row({ icon, children }: { icon: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2.5">
      <span className="material-symbols-outlined text-[16px] text-primary mt-0.5 shrink-0">{icon}</span>
      <span className="text-sm font-body text-on-surface-variant leading-snug">{children}</span>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ══════════════════════════════════════════════════════════════════════
export function ReservasCalendar({
  reservas,
  loading,
  onNewReserva,
  onEditReserva,
  onCancelReserva,
  onDeleteReserva,
  cancelingId,
  deletingId,
}: Props) {
  // ── Today reference ──────────────────────────────────────────────
  const todayDate = useMemo(() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d }, [])
  const todayStr  = useMemo(() => toLocal(todayDate), [todayDate])

  // ── Local state ───────────────────────────────────────────────────
  const [view,     setView]     = useState<CalView>('month')
  const [current,  setCurrent]  = useState<Date>(() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d })
  const [selected, setSelected] = useState<CalReserva | null>(null)

  // ── Build date → reservas index ───────────────────────────────────
  const byDate = useMemo(() => {
    const m = new Map<string, CalReserva[]>()
    for (const r of reservas) {
      const arr = m.get(r.fecha) ?? []
      arr.push(r)
      m.set(r.fecha, arr)
    }
    return m
  }, [reservas])

  // ── Navigation ────────────────────────────────────────────────────
  function nav(dir: -1 | 1) {
    setCurrent(prev => {
      const d = new Date(prev)
      if      (view === 'month') d.setMonth(d.getMonth() + dir)
      else if (view === 'week')  d.setDate(d.getDate() + dir * 7)
      else                       d.setDate(d.getDate() + dir)
      return d
    })
  }

  function goToday() {
    const d = new Date(); d.setHours(0, 0, 0, 0); setCurrent(d)
  }

  // ── Period label ──────────────────────────────────────────────────
  function label(): string {
    if (view === 'month') return `${MESES[current.getMonth()]} ${current.getFullYear()}`
    if (view === 'day') {
      const ds = toLocal(current)
      if (ds === todayStr) return 'Hoy'
      return `${DIAS_FULL[current.getDay()]}, ${current.getDate()} de ${MESES[current.getMonth()]} ${current.getFullYear()}`
    }
    // week
    const dow = current.getDay()
    const sun = new Date(current); sun.setDate(current.getDate() - dow)
    const sat = new Date(sun);     sat.setDate(sun.getDate() + 6)
    if (sun.getMonth() === sat.getMonth()) {
      return `${sun.getDate()} – ${sat.getDate()} de ${MESES[sun.getMonth()]} ${sun.getFullYear()}`
    }
    return `${sun.getDate()} ${MESES[sun.getMonth()]} – ${sat.getDate()} ${MESES[sat.getMonth()]} ${sun.getFullYear()}`
  }

  // ── Month grid ────────────────────────────────────────────────────
  const monthRows = useMemo(() => {
    if (view !== 'month') return []
    const y = current.getFullYear()
    const mo = current.getMonth()
    const first = new Date(y, mo, 1)
    const cells: (Date | null)[] = Array(first.getDay()).fill(null)
    const daysInMonth = new Date(y, mo + 1, 0).getDate()
    for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(y, mo, d))
    while (cells.length % 7) cells.push(null)
    const rows: (Date | null)[][] = []
    for (let i = 0; i < cells.length; i += 7) rows.push(cells.slice(i, i + 7))
    return rows
  }, [view, current])

  // ── Week days (Sun–Sat) ───────────────────────────────────────────
  const weekDays = useMemo(() => {
    if (view !== 'week') return []
    const dow = current.getDay()
    const sun = new Date(current); sun.setDate(current.getDate() - dow)
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(sun); d.setDate(sun.getDate() + i); return d
    })
  }, [view, current])

  // ── Inline sub-components ─────────────────────────────────────────

  /** Month view chip */
  function Chip({ r }: { r: CalReserva }) {
    const st = EV[r.estado]
    return (
      <button
        onClick={ev => { ev.stopPropagation(); setSelected(r) }}
        className={`w-full text-left flex items-center gap-1 rounded-md px-1.5 py-[3px] text-[10px] font-label font-semibold leading-tight border overflow-hidden ${st.bg} ${st.text} ${st.border} hover:brightness-95 transition-all`}
      >
        <span className={`shrink-0 w-1.5 h-1.5 rounded-full ${st.dot}`} />
        <span className="truncate">{r.titulo}</span>
      </button>
    )
  }

  /** Week/day time-grid event block */
  function EventBlock({ r, style }: { r: CalReserva; style: React.CSSProperties }) {
    const st = EV[r.estado]
    return (
      <button
        onClick={ev => { ev.stopPropagation(); setSelected(r) }}
        className={`absolute left-0.5 right-0.5 rounded-lg border overflow-hidden text-left hover:brightness-95 hover:shadow-md transition-all z-10 flex flex-col ${st.bg} ${st.border}`}
        style={style}
      >
        <div className={`h-1 w-full shrink-0 ${st.bar}`} />
        <div className="px-2 py-0.5 flex-1 min-h-0">
          <p className={`text-[11px] font-label font-bold ${st.text} leading-tight truncate`}>{r.titulo}</p>
          <p className={`text-[10px] font-body ${st.text} opacity-75`}>{r.hora_inicio.slice(0, 5)}–{r.hora_fin.slice(0, 5)}</p>
          {r.salas && <p className={`text-[9px] font-body ${st.text} opacity-55 truncate`}>{r.salas.nombre}</p>}
        </div>
      </button>
    )
  }

  // ── Render ────────────────────────────────────────────────────────
  return (
    <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/25 overflow-hidden shadow-sm">

      {/* ── TOOLBAR ──────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 border-b border-outline-variant/20 bg-surface-container-low/60">
        {/* Navigation */}
        <div className="flex items-center gap-2">
          <button
            onClick={goToday}
            className="font-label text-xs font-semibold border border-outline-variant rounded-lg px-3 py-1.5 text-on-surface hover:bg-surface-container transition-colors"
          >
            Hoy
          </button>
          <div className="flex rounded-lg overflow-hidden border border-outline-variant">
            <button
              onClick={() => nav(-1)}
              className="w-8 h-[34px] flex items-center justify-center text-on-surface hover:bg-surface-container transition-colors border-r border-outline-variant"
            >
              <span className="material-symbols-outlined text-[18px]">chevron_left</span>
            </button>
            <button
              onClick={() => nav(1)}
              className="w-8 h-[34px] flex items-center justify-center text-on-surface hover:bg-surface-container transition-colors"
            >
              <span className="material-symbols-outlined text-[18px]">chevron_right</span>
            </button>
          </div>
          <h2 className="font-headline font-bold text-on-surface text-base min-w-[180px] capitalize">{label()}</h2>
          {loading && (
            <span className="material-symbols-outlined text-[16px] text-on-surface-variant animate-spin">progress_activity</span>
          )}
        </div>

        {/* View selector */}
        <div className="flex items-center gap-0.5 bg-surface-container rounded-xl p-1">
          {(['day', 'week', 'month'] as CalView[]).map(v => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`font-label text-xs font-semibold px-3 py-1.5 rounded-lg transition-all ${
                view === v
                  ? 'bg-primary text-on-primary shadow-sm'
                  : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high'
              }`}
            >
              {v === 'day' ? 'Día' : v === 'week' ? 'Semana' : 'Mes'}
            </button>
          ))}
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════ */}
      {/* MONTH VIEW                                                */}
      {/* ══════════════════════════════════════════════════════════ */}
      {view === 'month' && (
        <div>
          {/* Weekday headers */}
          <div className="grid grid-cols-7 border-b border-outline-variant/20 bg-surface-container-low/30">
            {DIAS_SHORT.map(d => (
              <div key={d} className="py-2.5 text-center text-[10px] font-label font-bold uppercase tracking-widest text-on-surface-variant">
                {d}
              </div>
            ))}
          </div>

          {/* Day grid */}
          {monthRows.map((row, ri) => (
            <div
              key={ri}
              className={`grid grid-cols-7 ${ri < monthRows.length - 1 ? 'border-b border-outline-variant/15' : ''}`}
            >
              {row.map((day, ci) => {
                if (!day) {
                  return <div key={ci} className="min-h-[110px] bg-surface-container-lowest/40 border-r border-outline-variant/10 last:border-r-0" />
                }
                const ds           = toLocal(day)
                const events       = byDate.get(ds) ?? []
                const isToday      = ds === todayStr
                const isThisMonth  = day.getMonth() === current.getMonth()
                const MAX          = 3
                const visible      = events.slice(0, MAX)
                const extra        = events.length - MAX

                return (
                  <div
                    key={ci}
                    onClick={() => { setCurrent(day); setView('day') }}
                    className={`min-h-[110px] p-1.5 border-r border-outline-variant/10 last:border-r-0 cursor-pointer hover:bg-surface-container/40 transition-colors flex flex-col gap-0.5 group ${!isThisMonth ? 'opacity-35' : ''}`}
                  >
                    {/* Day number */}
                    <div className="flex items-center justify-between mb-0.5">
                      <span className={`w-7 h-7 flex items-center justify-center rounded-full text-xs font-label font-bold transition-colors ${
                        isToday
                          ? 'bg-primary text-on-primary'
                          : 'text-on-surface group-hover:bg-surface-container'
                      }`}>
                        {day.getDate()}
                      </span>
                      {/* Add button on hover */}
                      <button
                        onClick={e => { e.stopPropagation(); onNewReserva(ds) }}
                        className="opacity-0 group-hover:opacity-100 w-5 h-5 rounded-full bg-primary/15 text-primary flex items-center justify-center hover:bg-primary/25 transition-all"
                        title="Nueva reserva"
                      >
                        <span className="material-symbols-outlined text-[12px]">add</span>
                      </button>
                    </div>

                    {/* Event chips */}
                    <div className="flex-1 space-y-0.5 overflow-hidden">
                      {visible.map(r => <Chip key={r.id} r={r} />)}
                      {extra > 0 && (
                        <p className="text-[9px] font-label text-secondary/70 pl-1.5">+{extra} más</p>
                      )}
                    </div>

                    {/* Empty hint */}
                    {events.length === 0 && (
                      <button
                        onClick={e => { e.stopPropagation(); onNewReserva(ds) }}
                        className="opacity-0 group-hover:opacity-100 text-[9px] font-label text-on-surface-variant/50 text-center pb-1 hover:text-primary transition-all"
                      >
                        + reservar
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          ))}

          {/* Legend */}
          <div className="px-5 py-3 border-t border-outline-variant/15 bg-surface-container-low/30 flex items-center gap-5 flex-wrap">
            {(['confirmada', 'pendiente', 'cancelada'] as const).map(s => (
              <div key={s} className="flex items-center gap-1.5">
                <span className={`w-2.5 h-2.5 rounded-full ${EV[s].dot}`} />
                <span className="text-[10px] font-label text-on-surface-variant capitalize">{s}</span>
              </div>
            ))}
            <span className="text-[10px] font-label text-on-surface-variant/60 ml-auto hidden sm:block">
              Haz clic en un día para ver detalles
            </span>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════ */}
      {/* WEEK VIEW                                                 */}
      {/* ══════════════════════════════════════════════════════════ */}
      {view === 'week' && (
        <div className="overflow-auto" style={{ maxHeight: 660 }}>
          {/* Sticky header */}
          <div
            className="grid sticky top-0 z-20 bg-surface-container-low/95 backdrop-blur-sm border-b border-outline-variant/20"
            style={{ gridTemplateColumns: '52px repeat(7, 1fr)' }}
          >
            <div className="py-2" />
            {weekDays.map(day => {
              const ds   = toLocal(day)
              const isTd = ds === todayStr
              return (
                <div key={ds} className="py-2 text-center border-l border-outline-variant/10">
                  <p className="text-[10px] font-label uppercase tracking-wide text-on-surface-variant">{DIAS_SHORT[day.getDay()]}</p>
                  <button
                    onClick={() => { setCurrent(day); setView('day') }}
                    className={`mt-0.5 w-8 h-8 rounded-full mx-auto flex items-center justify-center text-sm font-label font-bold transition-colors ${
                      isTd ? 'bg-primary text-on-primary' : 'text-on-surface hover:bg-surface-container'
                    }`}
                  >
                    {day.getDate()}
                  </button>
                </div>
              )
            })}
          </div>

          {/* Time grid */}
          <div className="grid" style={{ gridTemplateColumns: '52px repeat(7, 1fr)' }}>
            {/* Hour labels */}
            <div className="border-r border-outline-variant/10">
              {HOURS.map(h => (
                <div key={h} style={{ height: SLOT_H }} className="flex items-start justify-end pr-2 pt-1.5 border-t border-outline-variant/10">
                  <span className="text-[10px] font-mono text-on-surface-variant/70">{pad2(h)}:00</span>
                </div>
              ))}
            </div>

            {/* Day columns */}
            {weekDays.map(day => {
              const ds     = toLocal(day)
              const isTd   = ds === todayStr
              const events = byDate.get(ds) ?? []
              return (
                <div
                  key={ds}
                  className={`relative border-l border-outline-variant/10 cursor-pointer ${isTd ? 'bg-primary/[0.025]' : 'hover:bg-surface-container/20'}`}
                  style={{ height: HOURS.length * SLOT_H }}
                  onClick={() => onNewReserva(ds)}
                >
                  {/* Hour lines */}
                  {HOURS.map(h => (
                    <div
                      key={h}
                      className="absolute left-0 right-0 border-t border-outline-variant/10"
                      style={{ top: (h - HOUR_START) * SLOT_H }}
                    />
                  ))}
                  {/* Half-hour lines */}
                  {HOURS.map(h => (
                    <div
                      key={`h${h}`}
                      className="absolute left-0 right-0 border-t border-outline-variant/[0.05]"
                      style={{ top: (h - HOUR_START) * SLOT_H + SLOT_H / 2 }}
                    />
                  ))}
                  {/* Events */}
                  {events.map(r => {
                    const startM = parseMin(r.hora_inicio) - HOUR_START * 60
                    const endM   = parseMin(r.hora_fin)   - HOUR_START * 60
                    if (endM < 0 || startM > (HOUR_END - HOUR_START) * 60) return null
                    const top    = (Math.max(0, startM) / 60) * SLOT_H
                    const height = Math.max(((Math.min(endM, (HOUR_END - HOUR_START) * 60) - Math.max(0, startM)) / 60) * SLOT_H, 26)
                    return <EventBlock key={r.id} r={r} style={{ top, height }} />
                  })}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════ */}
      {/* DAY VIEW                                                  */}
      {/* ══════════════════════════════════════════════════════════ */}
      {view === 'day' && (
        <div className="overflow-auto" style={{ maxHeight: 660 }}>
          {/* Sticky header */}
          <div
            className="grid sticky top-0 z-20 bg-surface-container-low/95 backdrop-blur-sm border-b border-outline-variant/20"
            style={{ gridTemplateColumns: '52px 1fr' }}
          >
            <div className="py-2" />
            <div className="py-3 text-center border-l border-outline-variant/10">
              <p className="text-[10px] font-label uppercase tracking-wide text-on-surface-variant">{DIAS_FULL[current.getDay()]}</p>
              <span className={`mt-1 w-11 h-11 rounded-full mx-auto flex items-center justify-center text-xl font-headline font-bold ${
                toLocal(current) === todayStr ? 'bg-primary text-on-primary' : 'text-on-surface'
              }`}>
                {current.getDate()}
              </span>
            </div>
          </div>

          {/* Time grid */}
          <div className="grid" style={{ gridTemplateColumns: '52px 1fr' }}>
            {/* Hour labels */}
            <div className="border-r border-outline-variant/10">
              {HOURS.map(h => (
                <div key={h} style={{ height: SLOT_H }} className="flex items-start justify-end pr-2 pt-1.5 border-t border-outline-variant/10">
                  <span className="text-[10px] font-mono text-on-surface-variant/70">{pad2(h)}:00</span>
                </div>
              ))}
            </div>

            {/* Single day column */}
            <div
              className="relative border-l border-outline-variant/10 cursor-pointer hover:bg-surface-container/10"
              style={{ height: HOURS.length * SLOT_H }}
              onClick={() => onNewReserva(toLocal(current))}
            >
              {HOURS.map(h => (
                <div key={h} className="absolute left-0 right-0 border-t border-outline-variant/10" style={{ top: (h - HOUR_START) * SLOT_H }} />
              ))}
              {HOURS.map(h => (
                <div key={`h${h}`} className="absolute left-0 right-0 border-t border-outline-variant/[0.05]" style={{ top: (h - HOUR_START) * SLOT_H + SLOT_H / 2 }} />
              ))}
              {(byDate.get(toLocal(current)) ?? []).map(r => {
                const startM = parseMin(r.hora_inicio) - HOUR_START * 60
                const endM   = parseMin(r.hora_fin)   - HOUR_START * 60
                if (endM < 0 || startM > (HOUR_END - HOUR_START) * 60) return null
                const top    = (Math.max(0, startM) / 60) * SLOT_H
                const height = Math.max(((Math.min(endM, (HOUR_END - HOUR_START) * 60) - Math.max(0, startM)) / 60) * SLOT_H, 30)
                return <EventBlock key={r.id} r={r} style={{ top, height }} />
              })}

              {/* Empty state for day */}
              {(byDate.get(toLocal(current)) ?? []).length === 0 && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 pointer-events-none">
                  <div className="w-12 h-12 rounded-full bg-surface-container flex items-center justify-center">
                    <span className="material-symbols-outlined text-on-surface-variant text-2xl">event_available</span>
                  </div>
                  <p className="font-body text-sm text-on-surface-variant text-center">Sin reservas este día</p>
                  <p className="font-body text-xs text-secondary/60 text-center">Haz clic para crear una reserva</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════ */}
      {/* EVENT DETAIL MODAL                                        */}
      {/* ══════════════════════════════════════════════════════════ */}
      {selected && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.32)', backdropFilter: 'blur(4px)' }}
          onClick={() => setSelected(null)}
        >
          <div
            className="bg-surface-container-lowest rounded-2xl shadow-2xl border border-outline-variant/25 w-full max-w-sm overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            {/* Color bar */}
            <div className={`h-1.5 w-full ${EV[selected.estado].bar}`} />

            <div className="p-6">
              {/* Header */}
              <div className="flex items-start justify-between mb-1">
                <span className={`px-3 py-1 rounded-full text-xs font-label font-bold capitalize ${EV[selected.estado].pill}`}>
                  {selected.estado}
                </span>
                <button
                  onClick={() => setSelected(null)}
                  className="text-on-surface-variant hover:text-on-surface transition-colors ml-2"
                >
                  <span className="material-symbols-outlined text-[22px]">close</span>
                </button>
              </div>

              <h3 className="font-headline font-bold text-on-surface text-xl leading-snug mt-3 mb-4">
                {selected.titulo}
              </h3>

              {/* Details */}
              <div className="space-y-3 mb-6">
                <Row icon="calendar_month">
                  <span className="capitalize">
                    {new Date(selected.fecha + 'T00:00:00').toLocaleDateString('es-ES', {
                      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
                    })}
                  </span>
                </Row>
                <Row icon="schedule">
                  {selected.hora_inicio.slice(0, 5)} – {selected.hora_fin.slice(0, 5)}
                </Row>
                {selected.salas && (
                  <>
                    <Row icon="meeting_room">{selected.salas.nombre}</Row>
                    {selected.salas.ubicacion && <Row icon="location_on">{selected.salas.ubicacion}</Row>}
                    <Row icon="group">{selected.salas.capacidad} personas</Row>
                  </>
                )}
              </div>

              {/* Actions */}
              {selected.estado !== 'cancelada' ? (
                <div className="flex gap-2">
                  <button
                    onClick={() => { onEditReserva(selected); setSelected(null) }}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 bg-primary text-on-primary rounded-xl py-2.5 text-sm font-label font-semibold hover:brightness-110 transition-all"
                  >
                    <span className="material-symbols-outlined text-[16px]">edit</span>
                    Editar
                  </button>
                  <button
                    onClick={() => { onCancelReserva(selected.id); setSelected(null) }}
                    disabled={cancelingId === selected.id}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 border border-error/40 text-error rounded-xl py-2.5 text-sm font-label font-semibold hover:bg-error/5 transition-all disabled:opacity-50"
                  >
                    <span className="material-symbols-outlined text-[16px]">event_busy</span>
                    {cancelingId === selected.id ? '…' : 'Cancelar'}
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => { onDeleteReserva(selected.id); setSelected(null) }}
                  disabled={deletingId === selected.id}
                  className="w-full inline-flex items-center justify-center gap-1.5 border border-outline-variant rounded-xl py-2.5 text-sm font-label font-semibold text-on-surface-variant hover:bg-surface-container transition-all disabled:opacity-50"
                >
                  <span className="material-symbols-outlined text-[16px]">delete</span>
                  {deletingId === selected.id ? '…' : 'Eliminar reserva'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
