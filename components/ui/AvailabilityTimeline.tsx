'use client'

// ── Types ────────────────────────────────────────────────────────────────────
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
  /** Called when the user clicks a free-window chip */
  onSelectWindow: (inicio: string, fin: string) => void
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

function durLabel(inicio: string, fin: string): string {
  const min = parseMin(fin) - parseMin(inicio)
  const h   = Math.floor(min / 60)
  const m   = min % 60
  if (h === 0) return `${m} min`
  if (m === 0) return `${h} h`
  return `${h} h ${m} min`
}

function calcFreeWindows(
  franjas: FranjaOcupada[],
): { inicio: string; fin: string }[] {
  const sorted = [...franjas].sort((a, b) => a.hora_inicio.localeCompare(b.hora_inicio))
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

function hasOverlap(
  inicio: string,
  fin: string,
  franjas: FranjaOcupada[],
): boolean {
  return franjas.some(f => inicio < f.hora_fin && fin > f.hora_inicio)
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
}: Props) {
  const freeWindows   = calcFreeWindows(franjas)
  const selValid      = !!(horaInicio && horaFin && horaFin > horaInicio)
  const isConflict    = selValid && hasOverlap(horaInicio!, horaFin!, franjas)
  const allDay        = franjas.length === 0

  // ── Skeleton ─────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="rounded-xl border border-outline-variant/20 bg-surface-container-lowest p-4 space-y-3 animate-pulse">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-surface-container-high" />
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
        {/* Hour ticks */}
        <div className="relative h-4 mb-1 select-none">
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

        {/* Bar */}
        <div className="relative h-5 rounded-full overflow-hidden bg-emerald-100/70 border border-emerald-200/60">

          {/* Booked blocks */}
          {franjas.map((f, i) => {
            const left  = toPercent(f.hora_inicio)
            const right = toPercent(f.hora_fin)
            return (
              <div
                key={i}
                className="absolute top-0 bottom-0 bg-red-300/80 border-x border-red-400/40"
                style={{ left: `${left}%`, width: `${right - left}%` }}
                title={f.titulo ? `Reservado: ${f.titulo}` : 'Reservado'}
              />
            )
          })}

          {/* Selected range overlay */}
          {selValid && horaInicio && horaFin && (
            <div
              className={`absolute top-0 bottom-0 border-x-2 transition-all ${
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
        <div className="flex items-center gap-3 mt-1.5 flex-wrap">
          <div className="flex items-center gap-1">
            <div className="w-2.5 h-2.5 rounded-sm bg-emerald-300/80" />
            <span className="text-[9px] font-label text-on-surface-variant">Libre</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2.5 h-2.5 rounded-sm bg-red-300/80" />
            <span className="text-[9px] font-label text-on-surface-variant">Ocupado</span>
          </div>
          {selValid && (
            <div className="flex items-center gap-1">
              <div className={`w-2.5 h-2.5 rounded-sm ${isConflict ? 'bg-red-500/50' : 'bg-primary/40'}`} />
              <span className={`text-[9px] font-label ${isConflict ? 'text-red-600' : 'text-primary'}`}>
                Tu selección
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Conflict alert */}
      {isConflict && (
        <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          <span className="material-symbols-outlined text-[16px] text-red-500 shrink-0 mt-0.5">warning</span>
          <span className="text-xs font-label text-red-700 leading-snug">
            El horario seleccionado se solapa con una reserva existente. Elige un rango disponible.
          </span>
        </div>
      )}

      {/* ── Free-window chips ───────────────────────────────────── */}
      {freeWindows.length > 0 && (
        <div>
          <p className="text-[10px] font-label text-on-surface-variant uppercase tracking-widest mb-2">
            Haz clic para usar un horario disponible:
          </p>
          <div className="flex flex-wrap gap-1.5">
            {freeWindows.map((w, i) => (
              <button
                key={i}
                type="button"
                onClick={() => onSelectWindow(w.inicio, w.fin)}
                className="group flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-label font-semibold border border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 hover:border-emerald-400 active:scale-[0.97] transition-all"
              >
                <span className="material-symbols-outlined text-[12px] group-hover:translate-x-0.5 transition-transform">
                  play_arrow
                </span>
                {w.inicio} – {w.fin}
                <span className="font-normal opacity-60">· {durLabel(w.inicio, w.fin)}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* No windows available */}
      {freeWindows.length === 0 && franjas.length > 0 && (
        <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          <span className="material-symbols-outlined text-[15px] text-amber-500">block</span>
          <span className="text-xs font-label text-amber-700">
            No hay franjas libres de al menos 30 min en este día.
          </span>
        </div>
      )}
    </div>
  )
}

// Re-export helper so the page can use it without duplicating logic
export { hasOverlap }
