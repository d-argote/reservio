'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { getSalasConDisponibilidadFecha } from '@/features/reservas/actions'
import { getBogotaNow, getRoomImage, SkeletonRoomCard } from './helpers'
import type { Sala } from './types'

interface RoomsTabProps {
  onPreviewSala: (sala: Sala) => void
  /** Attach a refresh callback so the parent's realtime hook can trigger silent updates */
  refreshRef: React.MutableRefObject<(() => void) | null>
}

export function RoomsTab({ onPreviewSala, refreshRef }: RoomsTabProps) {
  const [salas, setSalas] = useState<Sala[]>([])
  const [loadingSalas, setLoadingSalas] = useState(true)

  const fetchSalas = useCallback(async () => {
    setLoadingSalas(true)
    const { dateStr } = getBogotaNow()
    const result = await getSalasConDisponibilidadFecha(dateStr)
    if (result.data) setSalas(result.data as Sala[])
    setLoadingSalas(false)
  }, [])

  // Register silent refresh callback (no loading spinner)
  useEffect(() => {
    refreshRef.current = async () => {
      const { dateStr } = getBogotaNow()
      const result = await getSalasConDisponibilidadFecha(dateStr)
      if (result.data) setSalas(result.data as Sala[])
    }
    return () => { refreshRef.current = null }
  }, [refreshRef])

  // Fetch on mount
  useEffect(() => { fetchSalas() }, [fetchSalas])

  const HORA_APERTURA_MIN = 0
  const HORA_CIERRE_MIN = 24 * 60
  const jornada = HORA_CIERRE_MIN - HORA_APERTURA_MIN

  const toMin = (t: string) => {
    const [h, m] = t.split(':').map(Number)
    return h * 60 + m
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {loadingSalas ? (
        [0, 1, 2, 3].map((i) => <SkeletonRoomCard key={i} />)
      ) : salas.length === 0 ? (
        <div className="col-span-full flex flex-col items-center justify-center py-20 text-center gap-3">
          <span className="material-symbols-outlined text-on-surface-variant text-4xl">meeting_room</span>
          <p className="font-body font-semibold text-on-surface">No hay salas disponibles en este momento</p>
        </div>
      ) : (
        salas.map((sala, idx) => {
          const disp = sala.disponibilidad ?? (sala.estado === 'mantenimiento' ? 'mantenimiento' : 'libre')
          const badgeConfig = {
            libre:         { bg: 'bg-green-500/20',  text: 'text-green-50',  border: 'border-green-500/30',  dot: 'bg-green-400 shadow-[0_0_8px_rgba(74,222,128,0.8)]',  label: 'Disponible' },
            parcial:       { bg: 'bg-amber-500/20',  text: 'text-amber-50',  border: 'border-amber-500/30',  dot: 'bg-amber-400',                                          label: 'Parc. ocupada' },
            ocupada_total: { bg: 'bg-red-500/20',    text: 'text-red-50',    border: 'border-red-500/30',    dot: 'bg-red-400',                                            label: 'Ocupada' },
            mantenimiento: { bg: 'bg-yellow-500/20', text: 'text-yellow-50', border: 'border-yellow-500/30', dot: 'bg-yellow-400',                                         label: 'Mantenimiento' },
          }[disp] ?? { bg: 'bg-surface/20', text: 'text-on-surface', border: 'border-outline/30', dot: 'bg-outline', label: sala.estado }

          return (
            <div key={sala.id} className="bg-surface-container-lowest rounded-2xl overflow-hidden border border-outline-variant/15 card-lift group flex flex-col" data-anim>
              <div className="relative h-48 overflow-hidden bg-surface-container">
                <img
                  src={sala.imagen_url || getRoomImage(idx)}
                  alt={sala.nombre}
                  className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-300"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-80" />
                <div className="absolute bottom-4 left-4 right-4 flex justify-between items-end">
                  <span className={`inline-flex items-center gap-1.5 text-xs font-label font-bold px-2.5 py-1 rounded-md uppercase tracking-wider backdrop-blur-md ${badgeConfig.bg} ${badgeConfig.text} border ${badgeConfig.border}`}>
                    <span className={`size-1.5 rounded-full ${badgeConfig.dot}`} />
                    {badgeConfig.label}
                  </span>
                </div>
              </div>

              <div className="p-4 flex-1 flex flex-col">
                <div>
                  <h4 className="font-headline font-semibold text-on-surface text-lg">{sala.nombre}</h4>
                  {sala.descripcion && (
                    <p className="font-body text-sm text-on-surface-variant mt-1.5 leading-relaxed line-clamp-2">{sala.descripcion}</p>
                  )}
                </div>

                <div className="flex flex-wrap gap-4 mt-4 text-sm font-label text-secondary">
                  <span className="flex items-center gap-1.5 bg-surface-container px-2 py-1 rounded-md">
                    <span className="material-symbols-outlined text-[16px]">group</span>
                    {sala.capacidad} cap.
                  </span>
                  {sala.ubicacion && (
                    <span className="flex items-center gap-1.5 bg-surface-container px-2 py-1 rounded-md">
                      <span className="material-symbols-outlined text-[16px]">location_on</span>
                      {sala.ubicacion}
                    </span>
                  )}
                </div>

                {/* Availability bar */}
                {disp !== 'mantenimiento' && (() => {
                  const { timeStr: nowTime } = getBogotaNow()
                  const nowMin = toMin(nowTime)
                  const nowPct = Math.max(0, Math.min(100, ((nowMin - HORA_APERTURA_MIN) / jornada) * 100))
                  const showNow = nowMin >= HORA_APERTURA_MIN && nowMin <= HORA_CIERRE_MIN
                  return (
                    <div className="mt-4">
                      <div className="relative h-3 mb-0.5">
                        {[0, 6, 12, 18].map(h => {
                          const pct = ((h * 60 - HORA_APERTURA_MIN) / jornada) * 100
                          return (
                            <span key={h} className="absolute text-[9px] font-mono text-on-surface-variant/55 -translate-x-1/2" style={{ left: `${pct}%` }}>
                              {String(h).padStart(2, '0')}h
                            </span>
                          )
                        })}
                      </div>
                      <div className="relative h-2.5 rounded-full bg-surface-container overflow-visible">
                        <div className="absolute inset-0 rounded-full bg-green-500/30 overflow-hidden" />
                        {(sala.franjas_reservadas ?? []).map((f, fi) => {
                          const startMin = Math.max(toMin(f.hora_inicio), HORA_APERTURA_MIN)
                          const endMin = Math.min(toMin(f.hora_fin), HORA_CIERRE_MIN)
                          if (endMin <= startMin) return null
                          const left = ((startMin - HORA_APERTURA_MIN) / jornada) * 100
                          const width = ((endMin - startMin) / jornada) * 100
                          return (
                            <div key={fi} title={`${f.hora_inicio}–${f.hora_fin}${f.titulo ? ': ' + f.titulo : ''}`} className="absolute top-0 h-full rounded-sm bg-red-400/75" style={{ left: `${left}%`, width: `${width}%` }} />
                          )
                        })}
                        {showNow && (
                          <div className="absolute top-1/2 -translate-y-1/2 w-0.5 h-4 bg-primary rounded-full shadow-sm z-10" style={{ left: `${nowPct}%` }} title={`Ahora: ${nowTime}`} />
                        )}
                      </div>
                      {disp === 'parcial' && sala.proxima_libre && (
                        <p className="text-[11px] font-label text-on-surface-variant mt-1">Próxima libre: <span className="font-semibold text-green-600 dark:text-green-400">{sala.proxima_libre}</span></p>
                      )}
                      {disp === 'ocupada_total' && (
                        <p className="text-[11px] font-label text-red-500 mt-1">Sin disponibilidad hoy</p>
                      )}
                      {disp === 'libre' && (
                        <p className="text-[11px] font-label text-green-600 dark:text-green-400 mt-1">Libre todo el día</p>
                      )}
                    </div>
                  )
                })()}

                <div className="mt-4 pt-4 border-t border-outline-variant/15 mt-auto">
                  <button
                    type="button"
                    onClick={() => onPreviewSala(sala)}
                    disabled={disp === 'mantenimiento'}
                    className="w-full border border-primary/40 text-primary font-label text-sm font-semibold py-3 rounded-xl hover:bg-primary hover:text-on-primary transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    <span className="material-symbols-outlined text-[18px]">calendar_add_on</span>
                    {disp === 'mantenimiento' ? 'En mantenimiento' : disp === 'libre' ? 'Reservar Sala' : 'Ver horarios / Reservar'}
                  </button>
                </div>
              </div>
            </div>
          )
        })
      )}
    </div>
  )
}
