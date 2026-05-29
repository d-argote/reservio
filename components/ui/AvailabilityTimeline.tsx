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
  /** Called when the user selects a window via click-and-drag or resize */
  onSelectWindow: (inicio: string, fin: string) => void
  duracionPreset?: number | 'libre' | 'dia'
}

// ── Constants ────────────────────────────────────────────────────────────────
const APERTURA = '00:00'
const CIERRE   = '23:59'

// Generamos marcas cada 2 horas (para los ticks visuales)
const ALL_TICKS = Array.from({ length: 13 }, (_, i) => i * 2) // [0, 2, 4, ... 24]

// ── Helpers ──────────────────────────────────────────────────────────────────
function parseMin(hms: string): number {
  const [h, m] = hms.split(':').map(Number)
  return h * 60 + (m || 0)
}

function toPercent(time: string): number {
  if (time === '24:00') return 100
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
  
  // Redondear a intervalos de 15 minutos para que el snap sea predecible
  const snapped = Math.round(clamped / 15) * 15
  const h = Math.floor(snapped / 60)
  const m = snapped % 60
  
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

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

  // ── Drag, Drop & Resize States ───────────────────────────────────
  const barRef = useRef<HTMLDivElement>(null)
  const [dragging, setDragging] = useState(false)
  const [dragStart, setDragStart] = useState<string | null>(null)
  
  // Nuevo estado para saber si estamos estirando la selección
  const [resizing, setResizing] = useState<'inicio' | 'fin' | null>(null)

  function getPctFromEvent(e: React.MouseEvent | React.TouchEvent): number {
    const bar = barRef.current
    if (!bar) return 0
    const rect = bar.getBoundingClientRect()
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX
    const pct = ((clientX - rect.left) / rect.width) * 100
    return Math.max(0, Math.min(100, pct))
  }

  // Iniciar selección nueva en la barra
  function handleInteractionStart(e: React.MouseEvent | React.TouchEvent) {
    if (resizing) return // Si estamos haciendo resize, no iniciar nuevo drag

    const hora = fromPercent(getPctFromEvent(e))
    setDragging(true)
    setDragStart(hora)
    
    if (typeof duracionPreset === 'number') {
      const fin = addHoras(hora, duracionPreset)
      onSelectWindow(hora, fin)
    } else {
      onSelectWindow(hora, hora)
    }
  }

  // Iniciar ajuste desde los tiradores (Handles)
  function handleResizeStart(e: React.MouseEvent | React.TouchEvent, type: 'inicio' | 'fin') {
    e.stopPropagation() // Evitar que se active el drag de la barra principal
    setResizing(type)
  }

  function handleInteractionMove(e: React.MouseEvent | React.TouchEvent) {
    const horaActual = fromPercent(getPctFromEvent(e))

    // Lógica para estirar/encoger (Resize)
    if (resizing === 'inicio' && horaFin) {
      if (horaActual < horaFin) onSelectWindow(horaActual, horaFin)
      return
    }
    if (resizing === 'fin' && horaInicio) {
      if (horaActual > horaInicio) onSelectWindow(horaInicio, horaActual)
      return
    }

    // Lógica para crear nueva selección (Drag)
    if (!dragging || !dragStart) return
    
    if (horaActual > dragStart) {
      onSelectWindow(dragStart, horaActual)
    } else if (horaActual < dragStart) {
      onSelectWindow(horaActual, dragStart)
    }
  }

  function handleInteractionEnd() {
    // Limpiar estados al soltar el clic
    if (resizing) {
      setResizing(null)
      return
    }

    if (!dragging || !dragStart) return
    
    const hasDragged = horaInicio !== horaFin;
    if (!hasDragged && typeof duracionPreset !== 'number') {
      onSelectWindow(dragStart, addHoras(dragStart, 1)) // Default 1 hr
    }
    
    setDragging(false)
    setDragStart(null)
  }

  function handleMouseLeave() {
    if (dragging) { 
      setDragging(false)
      setDragStart(null) 
    }
    if (resizing) {
      setResizing(null)
    }
  }

  // ── Skeleton ─────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="rounded-xl border border-outline-variant/20 bg-surface-container-lowest p-5 space-y-4 animate-pulse">
        <div className="flex items-center gap-2">
          <div className="size-5 rounded bg-surface-container-high" />
          <div className="h-4 w-40 rounded bg-surface-container-high" />
        </div>
        <div className="h-10 rounded-full bg-surface-container-high" />
        <div className="flex gap-2">
          <div className="h-8 w-32 rounded-lg bg-surface-container-high" />
          <div className="h-8 w-28 rounded-lg bg-surface-container-high" />
        </div>
      </div>
    )
  }

  // ── Main render ───────────────────────────────────────────────────
  return (
    <div className="rounded-xl border border-outline-variant/20 bg-white p-5 space-y-4 max-w-4xl mx-auto shadow-sm">

      {/* Header row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-xl text-slate-800">schedule</span>
          <span className="font-label text-sm font-semibold text-slate-900 uppercase tracking-widest">
            Disponibilidad del día
          </span>
        </div>
        {allDay ? (
          <span className="text-xs font-label font-bold text-green-800 bg-green-100 border border-green-200 rounded-full px-4 py-1.5">
            Libre todo el día
          </span>
        ) : (
          <span className="text-xs font-label text-slate-600 font-medium">
            {franjas.length} reserva{franjas.length !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      {/* ── Visual timeline ─────────────────────────────────────── */}
      <div 
        className="pt-4 pb-2"
        onMouseLeave={handleMouseLeave}
        onMouseUp={handleInteractionEnd}
        onTouchEnd={handleInteractionEnd}
      >
        <p className="text-[11px] font-label text-slate-600 uppercase tracking-wider mb-6">
          Haz clic y arrastra sobre la barra para seleccionar un horario:
        </p>

        {/* Ticks y Textos de Horas Centrados */}
        <div className="relative h-8 mb-1 select-none pointer-events-none">
          {ALL_TICKS.map(h => {
            const timeStr = `${String(h).padStart(2, '0')}:00`
            const pct = toPercent(timeStr)
            const showText = h % 4 === 0 // Mostramos texto cada 4 horas
            
            // Ajustamos el alineamiento: el 00:00 empieza justo al borde, los demás se centran
            const transformStyle = h === 0 ? 'translateX(0%)' : h === 24 ? 'translateX(-100%)' : 'translateX(-50%)'

            return (
              <div
                key={h}
                className="absolute flex flex-col items-center justify-end h-full"
                style={{ left: `${pct}%`, transform: transformStyle }}
              >
                {showText && (
                  <span className="text-xs font-bold text-slate-900 mb-1.5">
                    {timeStr}
                  </span>
                )}
                {/* La pequeña línea (tick) */}
                <div className="h-1.5 w-[1px] bg-slate-300" />
              </div>
            )
          })}
        </div>

        {/* Interactive Bar */}
        <div 
          ref={barRef}
          className="relative h-12 rounded-full overflow-hidden bg-green-100/50 border border-green-200/80 cursor-crosshair select-none touch-none"
          onMouseDown={handleInteractionStart}
          onMouseMove={handleInteractionMove}
          onTouchStart={handleInteractionStart}
          onTouchMove={handleInteractionMove}
        >

          {/* Booked blocks */}
          {franjas.map((f, i) => {
            const left  = toPercent(f.hora_inicio)
            const right = toPercent(f.hora_fin)
            return (
              <div
                key={i}
                className="absolute top-0 bottom-0 bg-red-200/80 pointer-events-none"
                style={{ left: `${left}%`, width: `${right - left}%` }}
                title={f.titulo ? `Reservado: ${f.titulo}` : 'Reservado'}
              />
            )
          })}

          {/* Selected range overlay con Tiradores (Handles) */}
          {selValid && horaInicio && horaFin && (
            <div
              className={`absolute top-0 bottom-0 border-x-[2px] transition-all duration-75 pointer-events-auto ${
                isConflict
                  ? 'bg-red-500/50 border-red-600'
                  : 'bg-slate-500 border-slate-700' // Color oscuro de la imagen
              }`}
              style={{
                left:  `${toPercent(horaInicio)}%`,
                width: `${toPercent(horaFin) - toPercent(horaInicio)}%`,
              }}
            >
              {/* Tirador Izquierdo */}
              <div 
                className="absolute top-0 bottom-0 left-0 w-6 -ml-3 cursor-col-resize flex items-center justify-center group"
                onMouseDown={(e) => handleResizeStart(e, 'inicio')}
                onTouchStart={(e) => handleResizeStart(e, 'inicio')}
              >
                <div className={`w-1 h-5 rounded-full transition-colors ${resizing === 'inicio' ? 'bg-white' : 'bg-white/70 group-hover:bg-white'}`} />
              </div>

              {/* Tirador Derecho */}
              <div 
                className="absolute top-0 bottom-0 right-0 w-6 -mr-3 cursor-col-resize flex items-center justify-center group"
                onMouseDown={(e) => handleResizeStart(e, 'fin')}
                onTouchStart={(e) => handleResizeStart(e, 'fin')}
              >
                <div className={`w-1 h-5 rounded-full transition-colors ${resizing === 'fin' ? 'bg-white' : 'bg-white/70 group-hover:bg-white'}`} />
              </div>
            </div>
          )}
        </div>

        {/* Legend */}
        <div className="flex items-center gap-5 mt-6 flex-wrap">
          <div className="flex items-center gap-2">
            <div className="size-3.5 rounded bg-green-200 shadow-sm" />
            <span className="text-sm font-medium text-slate-700">Libre</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="size-3.5 rounded bg-red-200 shadow-sm" />
            <span className="text-sm font-medium text-slate-700">Ocupado</span>
          </div>
          {selValid && (
            <div className="flex items-center gap-2 ml-2">
              <div className={`size-3.5 rounded shadow-sm ${isConflict ? 'bg-red-500/80' : 'bg-slate-500'}`} />
              <span className={`text-sm font-bold ${isConflict ? 'text-red-600' : 'text-slate-900'}`}>
                Tu selección ({horaInicio} - {horaFin})
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Conflict alert */}
      {isConflict && (
        <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-lg px-4 py-3 mt-4">
          <span className="material-symbols-outlined text-xl text-red-500 shrink-0 mt-0.5">warning</span>
          <span className="text-sm font-medium text-red-800 leading-relaxed">
            El horario seleccionado se solapa con una reserva existente. Utiliza los bordes de tu selección para ajustarla a un rango disponible.
          </span>
        </div>
      )}

      {/* No windows available alert */}
      {freeWindows.length === 0 && franjas.length > 0 && (
        <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 mt-4">
          <span className="material-symbols-outlined text-xl text-amber-500 shrink-0">block</span>
          <span className="text-sm font-medium text-amber-800">
            No hay franjas libres de al menos 30 min en este día.
          </span>
        </div>
      )}
    </div>
  )
}