'use client'

import { useRef, useState } from 'react'
import { hasOverlap } from '@/lib/availability-utils'

// ── Types ────────────────────────────────────────────────────────────────────────────
export interface FranjaOcupada {
  hora_inicio: string  // 'HH:MM'
  hora_fin: string     // 'HH:MM'
  titulo?: string
}

interface Props {
  franjas: FranjaOcupada[]
  horaInicio?: string          // currently selected start ('HH:MM' or '')
  horaFin?: string             // currently selected end   ('HH:MM' or '')
  loading?: boolean
  /** Called when the user selects a window via click-and-drag */
  onSelectWindow: (inicio: string, fin: string) => void
  duracionPreset?: number | 'libre' | 'dia'
}

// ── Constants ────────────────────────────────────────────────────────────────
const APERTURA = '00:00'
const CIERRE   = '23:59'

// Hour ticks shown below the timeline (every 4 h across the full 24-h day)
const TICK_HOURS = [0, 4, 8, 12, 16, 20]

// ── Helpers ──────────────────────────────────────────────────────────────────
function parseMin(hms: string): number {
  const [h, m] = hms.split(':').map(Number)
  return h * 60 + (m || 0)
}

function toPercent(time: string): number {
  const t = parseMin(time)
  const a = parseMin(APERTURA)
  const c = parseMin(CIERRE)
  return Math.max(0, Math.min(100, ((t - a) / (c - a)) * 100))
}

function fromPercent(pct: number): string {
  const a = parseMin(APERTURA)  // 0
  const c = parseMin(CIERRE)    // 1439
  const totalMin = Math.round((pct / 100) * (c - a) + a)
  const clamped = Math.max(0, Math.min(1439, totalMin))
  
  // Redondear a intervalos de 15 minutos
  const snapped = Math.round(clamped / 15) * 15
  const h = Math.floor(snapped / 60)
  const m = snapped % 60
  
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

// Función auxiliar para sumar horas (puedes reemplazarla por la de tus helpers)
function addHoras(hora: string, horas: number): string {
  const min = parseMin(hora) + horas * 60
  const clamped = Math.max(0, Math.min(1439, min))
  const h = Math.floor(clamped / 60)
  const m = clamped % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

function calcFreeWindows(
  franjas: FranjaOcupada[],
): { inicio: string; fin: string }[] {
  const sorted = franjas.toSorted((a, b) => a.hora_inicio.localeCompare(b.hora_inicio))
  const windows: { inicio: string; fin: string }[] = []
  let cursor = APERTURA

  for (const f of sorted) {
    if (f.hora_inicio > cursor) windows.push({ inicio: cursor, fin: f.hora_inicio })
    if (f.hora_fin > cursor) cursor = f.hora_fin
  }
  if (cursor < CIERRE) windows.push({ inicio: cursor, fin: CIERRE })

  // Only show windows with at least 30 minutes
  return windows.filter(w => parseMin(w.fin) - parseMin(w.inicio) >= 30)
}

// ════════════════════════════════════════════════════════════════════════════
// COMPONENT
// ════════════════════════════════════════════════════════════════════════════
export function AvailabilityTimeline({
  franjas,
  horaInicio,
  horaFin,
  loading,
  onSelectWindow,
  duracionPreset
}: Props) {
  const freeWindows   = calcFreeWindows(franjas)
  const selValid      = !!(horaInicio && horaFin && horaFin > horaInicio)
  const isConflict    = selValid && hasOverlap(horaInicio!, horaFin!, franjas)
  const allDay        = franjas.length === 0

  // ── Drag & Drop States ───────────────────────────────────────────
  const barRef = useRef<HTMLDivElement>(null)
  const [dragging, setDragging] = useState(false)
  const [dragStart, setDragStart] = useState<string | null>(null)

  function getPctFromEvent(e: React.MouseEvent | React.TouchEvent): number {
    const bar = barRef.current
    if (!bar) return 0
    const rect = bar.getBoundingClientRect()
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX
    const pct = ((clientX - rect.left) / rect.width) * 100
    return Math.max(0, Math.min(100, pct))
  }

  function handleMouseDown(e: React.MouseEvent) {
    const hora = fromPercent(getPctFromEvent(e))
    setDragging(true)
    setDragStart(hora)
    
    // Si hay duracionPreset numérico, calcular fin automáticamente
    if (typeof duracionPreset === 'number') {
      const fin = addHoras(hora, duracionPreset)
      onSelectWindow(hora, fin)
    }
  }

  function handleMouseMove(e: React.MouseEvent) {
    if (!dragging || !dragStart) return
    const horaActual = fromPercent(getPctFromEvent(e))
    
    // Solo permitimos arrastrar hacia la derecha (futuro)
    if (horaActual > dragStart) {
      onSelectWindow(dragStart, horaActual)
    }
  }

  function handleMouseUp(e: React.MouseEvent) {
    if (!dragging || !dragStart) return
    const horaFinal = fromPercent(getPctFromEvent(e))
    
    // Si fue un simple click sin arrastre
    if (horaFinal <= dragStart) {
      const durMin = typeof duracionPreset === 'number' ? duracionPreset : 1
      onSelectWindow(dragStart, addHoras(dragStart, durMin))
    }
    
    setDragging(false)
    setDragStart(null)
  }

  // ── Skeleton ─────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="rounded-xl border border-outline-variant/20 bg-surface-container-lowest p-4 space-y-3 animate-pulse">
        <div className="flex items-center gap-2">
          <div className="size-4 rounded bg-surface-container-high" />
          <div className="h-3 w-32 rounded bg-surface-container-high" />
        </div>
        <div className="h-5 rounded-full bg-surface-container-high" />
        <div className="flex gap-2">
          <div className="h-7 w-28 rounded-lg bg-surface-container-high" />
          <div className="h-7 w-24 rounded-lg bg-surface-container-high" />
        </div>
      </div>
    )
  }

  // ── Main render ───────────────────────────────────────────────────
  return (
    <div className="rounded-xl border border-outline-variant/20 bg-surface-container-lowest p-4 space-y-3">

      {/* Header row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-[16px] text-primary">schedule</span>
          <span className="font-label text-xs font-semibold text-on-surface uppercase tracking-widest">
            Disponibilidad del día
          </span>
        </div>
        {allDay ? (
          <span className="text-[10px] font-label font-bold text-green-700 bg-green-50 border border-green-200 rounded-full px-2.5 py-0.5">
            Libre todo el día
          </span>
        ) : (
          <span className="text-[10px] font-label text-on-surface-variant">
            {franjas.length} reserva{franjas.length !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      {/* ── Visual timeline ─────────────────────────────────────── */}
      <div>
        <p className="text-[10px] font-label text-on-surface-variant uppercase tracking-widest mb-3">
          Haz clic y arrastra sobre la barra para seleccionar un horario:
        </p>

        {/* Hour ticks */}
        <div className="relative h-4 mb-1 select-none pointer-events-none">
          {TICK_HOURS.map(h => (
            <span
              key={h}
              className="absolute text-[9px] font-mono text-on-surface-variant/55 -translate-x-1/2"
              style={{ left: `${toPercent(`${String(h).padStart(2, '0')}:00`)}%` }}
            >
              {String(h).padStart(2, '0')}h
            </span>
          ))}
        </div>

        {/* Interactive Bar */}
        <div 
          ref={barRef}
          className="relative h-5 rounded-full overflow-hidden bg-emerald-100/70 border border-emerald-200/60 cursor-crosshair select-none"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={() => { 
            if (dragging) { 
              setDragging(false)
              setDragStart(null) 
            } 
          }}
        >

          {/* Booked blocks */}
          {franjas.map((f, i) => {
            const left  = toPercent(f.hora_inicio)
            const right = toPercent(f.hora_fin)
            return (
              <div
                key={i}
                className="absolute top-0 bottom-0 bg-red-300/80 border-x border-red-400/40 pointer-events-none"
                style={{ left: `${left}%`, width: `${right - left}%` }}
                title={f.titulo ? `Reservado: ${f.titulo}` : 'Reservado'}
              />
            )
          })}

          {/* Selected range overlay */}
          {selValid && horaInicio && horaFin && (
            <div
              className={`absolute top-0 bottom-0 border-x-2 transition-all pointer-events-none ${
                isConflict
                  ? 'bg-red-500/35 border-red-500'
                  : 'bg-primary/30 border-primary'
              }`}
              style={{
                left:  `${toPercent(horaInicio)}%`,
                width: `${toPercent(horaFin) - toPercent(horaInicio)}%`,
              }}
            />
          )}
        </div>

        {/* Legend */}
        <div className="flex items-center gap-3 mt-2 flex-wrap">
          <div className="flex items-center gap-1">
            <div className="size-2.5 rounded-sm bg-emerald-300/80" />
            <span className="text-[9px] font-label text-on-surface-variant">Libre</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="size-2.5 rounded-sm bg-red-300/80" />
            <span className="text-[9px] font-label text-on-surface-variant">Ocupado</span>
          </div>
          {selValid && (
            <div className="flex items-center gap-1">
              <div className={`size-2.5 rounded-sm ${isConflict ? 'bg-red-500/50' : 'bg-primary/40'}`} />
              <span className={`text-[9px] font-label ${isConflict ? 'text-red-600' : 'text-primary'}`}>
                Tu selección
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Conflict alert */}
      {isConflict && (
        <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mt-2">
          <span className="material-symbols-outlined text-[16px] text-red-500 shrink-0 mt-0.5">warning</span>
          <span className="text-xs font-label text-red-700 leading-snug">
            El horario seleccionado se solapa con una reserva existente. Elige un rango disponible.
          </span>
        </div>
      )}

      {/* No windows available alert */}
      {freeWindows.length === 0 && franjas.length > 0 && (
        <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mt-2">
          <span className="material-symbols-outlined text-[15px] text-amber-500">block</span>
          <span className="text-xs font-label text-amber-700">
            No hay franjas libres de al menos 30 min en este día.
          </span>
        </div>
      )}
    </div>
  )
}