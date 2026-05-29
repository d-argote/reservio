'use client'

import { useState, useCallback, useEffect, useMemo, useRef } from 'react'
import Image from 'next/image'
import { supabase } from '@/lib/supabase/client'
import { getEquipos } from '@/features/admin/actions'
import {
  getMisPrestamos,
  createPrestamoEquipo,
  devolverEquipo,
  updatePrestamoReserva,
  getEquiposRetornos,
  recalcularEstadosEquiposDB,
  type PrestamoEquipo,
  type CondicionEquipo,
  type CondicionDevolucion,
  type TipoNovedad,
} from '@/features/reservas/actions'
import type { Equipo } from '@/features/admin/types'
import { TIPO_EQUIPO_LABELS } from '@/lib/equipo-catalogo'
import {
  getBogotaNow,
  uploadFotoDevolucion,
  CONDICION_LABEL,
  CONDICION_COLOR,
  CONDICION_ICON,
  NOVEDAD_LABEL,
  CONDICIONES_ENTREGA,
  CONDICIONES_DEVOLUCION,
  TIPOS_NOVEDAD,
  SkeletonRoomCard,
} from './helpers'
import type { Reserva } from './types'

interface TechTabProps {
  userId: string
  /** Callback to open the reservation modal pre-loaded with an equipment ID */
  onOpenReservationWithEquipo: (equipoId: string) => void
  /** Attach a refresh callback so the parent's realtime hook can trigger silent updates */
  refreshRef: React.MutableRefObject<(() => void) | null>
}

export function TechTab({ userId, onOpenReservationWithEquipo, refreshRef }: TechTabProps) {
  // ── Equipment state ────────────────────────────────────────────────
  const [equipos, setEquipos] = useState<Equipo[]>([])
  const [equiposRetornos, setEquiposRetornos] = useState<Map<string, string>>(new Map())
  const [loadingEquipos, setLoadingEquipos] = useState(false)

  // ── Mis Préstamos state ────────────────────────────────────────────
  const [misPrestamos, setMisPrestamos] = useState<PrestamoEquipo[]>([])
  const [loadingPrestamos, setLoadingPrestamos] = useState(false)

  // ── Reservas (for loan dropdown) ───────────────────────────────────
  const [reservas, setReservas] = useState<Reserva[]>([])

  // ── Filter state ───────────────────────────────────────────────────
  const [techSearch, setTechSearch] = useState('')
  const [techFilter, setTechFilter] = useState('')

  // ── Edit loan state ────────────────────────────────────────────────
  const [editandoPrestamoId, setEditandoPrestamoId] = useState<string | null>(null)
  const [editPrestamoReservaId, setEditPrestamoReservaId] = useState('')
  const [savingEditPrestamo, setSavingEditPrestamo] = useState(false)
  const [editPrestamoError, setEditPrestamoError] = useState<string | null>(null)

  // ── Loan modal state ───────────────────────────────────────────────
  const [loanModalOpen, setLoanModalOpen] = useState(false)
  const [loanEquipo, setLoanEquipo] = useState<Equipo | null>(null)
  const [loanForm, setLoanForm] = useState({ fecha: '', hora_devolucion: '', sala_id: '', notas: '', reserva_id: '', condicion_entrega: 'bueno' as CondicionEquipo })
  const [loanSubmitting, setLoanSubmitting] = useState(false)
  const [loanError, setLoanError] = useState<string | null>(null)
  const [loanSuccess, setLoanSuccess] = useState(false)
  const [loanActa, setLoanActa] = useState<string | null>(null)

  // ── Return modal state ─────────────────────────────────────────────
  const [returnModalOpen, setReturnModalOpen] = useState(false)
  const [returnPrestamo, setReturnPrestamo] = useState<PrestamoEquipo | null>(null)
  const [returnStep, setReturnStep] = useState<1 | 2 | 3>(1)
  const [returnCondicion, setReturnCondicion] = useState<CondicionDevolucion>('bueno')
  const [returnObservaciones, setReturnObservaciones] = useState('')
  const [returnFotoFile, setReturnFotoFile] = useState<File | null>(null)
  const [returnFotoPreview, setReturnFotoPreview] = useState<string | null>(null)
  const [returnNovedad, setReturnNovedad] = useState(false)
  const [returnTipoNovedad, setReturnTipoNovedad] = useState<TipoNovedad>('dano_fisico')
  const [returnDescNovedad, setReturnDescNovedad] = useState('')
  const [returnConfirmed, setReturnConfirmed] = useState(false)
  const [returnSubmitting, setReturnSubmitting] = useState(false)
  const [returnError, setReturnError] = useState<string | null>(null)
  const [returnSuccess, setReturnSuccess] = useState<{ numActa: string } | null>(null)

  // ── Fetch functions ────────────────────────────────────────────────
  const loadEquipos = useCallback(async () => {
    setLoadingEquipos(true)
    recalcularEstadosEquiposDB().catch(() => {})
    const [result, retornos] = await Promise.all([getEquipos(), getEquiposRetornos()])
    if (result.data) setEquipos(result.data)
    if (retornos.data) setEquiposRetornos(new Map(retornos.data.map(r => [r.equipo_id, r.fecha_fin_esperada])))
    setLoadingEquipos(false)
  }, [])

  const loadMisPrestamos = useCallback(async () => {
    setLoadingPrestamos(true)
    const result = await getMisPrestamos()
    if (result.data) setMisPrestamos(result.data)
    setLoadingPrestamos(false)
  }, [])

  const fetchReservasForLoan = useCallback(async () => {
    const { dateStr: todayStr } = getBogotaNow()
    const { data } = await supabase
      .from('reservas')
      .select('id, titulo, fecha, hora_inicio, hora_fin, estado, salas(id, nombre, capacidad, ubicacion)')
      .eq('usuario_id', userId)
      .gte('fecha', todayStr)
      .in('estado', ['pendiente', 'confirmada'])
      .order('fecha', { ascending: true })
      .order('hora_inicio', { ascending: true })
      .limit(10)
    if (data) setReservas(data as unknown as Reserva[])
  }, [userId])

  // Register silent refresh callback
  useEffect(() => {
    refreshRef.current = async () => {
      const [result, retornos] = await Promise.all([getEquipos(), getEquiposRetornos()])
      if (result.data) setEquipos(result.data)
      if (retornos.data) setEquiposRetornos(new Map(retornos.data.map(r => [r.equipo_id, r.fecha_fin_esperada])))
    }
    return () => { refreshRef.current = null }
  }, [refreshRef])

  // Fetch on mount
  useEffect(() => {
    loadEquipos()
    loadMisPrestamos()
    fetchReservasForLoan()
  }, [loadEquipos, loadMisPrestamos, fetchReservasForLoan])

  // ── Filtered equipment ─────────────────────────────────────────────
  const filteredTech = useMemo(() => equipos.filter(eq => {
    const matchesSearch = techSearch.trim() === '' ||
      eq.nombre.toLowerCase().includes(techSearch.toLowerCase()) ||
      eq.marca.toLowerCase().includes(techSearch.toLowerCase()) ||
      eq.tipo_equipo.toLowerCase().includes(techSearch.toLowerCase())
    const matchesFilter = techFilter === '' || eq.categoria === techFilter || eq.tipo_equipo === techFilter
    return matchesSearch && matchesFilter
  }), [equipos, techSearch, techFilter])

  // ── Handlers ───────────────────────────────────────────────────────
  const handleSolicitarEquipo = (equipo: Equipo) => {
    const { dateStr } = getBogotaNow()
    setLoanEquipo(equipo)
    setLoanForm({ fecha: dateStr, hora_devolucion: '', sala_id: '', notas: '', reserva_id: '', condicion_entrega: 'bueno' })
    setLoanError(null)
    setLoanSuccess(false)
    setLoanActa(null)
    setLoanModalOpen(true)
  }

  const handleSubmitLoan = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!loanEquipo || !loanForm.reserva_id || !loanForm.fecha || !loanForm.hora_devolucion) {
      setLoanError('Debes seleccionar una reserva activa y completar todos los campos obligatorios.')
      return
    }
    if (!loanEquipo.imagen_url) {
      setLoanError('El equipo no tiene imagen registrada. Contacta al administrador antes de proceder.')
      return
    }
    setLoanSubmitting(true)
    setLoanError(null)

    const { dateStr: todayStr, timeStr: nowTimeStr } = getBogotaNow()
    if (loanForm.fecha < todayStr) {
      setLoanError('La fecha de devolución no puede ser una fecha pasada.')
      setLoanSubmitting(false)
      return
    }
    if (loanForm.fecha === todayStr && loanForm.hora_devolucion <= nowTimeStr) {
      setLoanError('La hora de devolución debe ser posterior a la hora actual.')
      setLoanSubmitting(false)
      return
    }

    const fechaFin = `${loanForm.fecha}T${loanForm.hora_devolucion}:00`
    const result = await createPrestamoEquipo(loanEquipo.id, loanForm.reserva_id, fechaFin, loanForm.notas || null, loanForm.condicion_entrega)

    if (result.error) {
      setLoanError(result.error)
      setLoanSubmitting(false)
      return
    }

    setLoanActa(result.data?.num_acta ?? null)
    setLoanSuccess(true)
    setEquipos(prev => prev.map(e => e.id === loanEquipo.id ? { ...e, estado: 'reservado' as const } : e))
    await loadMisPrestamos().catch(console.error)
    setLoanSubmitting(false)
    setTimeout(() => {
      setLoanModalOpen(false)
      setLoanSuccess(false)
      setLoanEquipo(null)
    }, 1800)
  }

  const handleAbrirDevolucion = (prestamo: PrestamoEquipo) => {
    setReturnPrestamo(prestamo)
    setReturnStep(1)
    setReturnCondicion('bueno')
    setReturnObservaciones('')
    setReturnFotoFile(null)
    setReturnFotoPreview(null)
    setReturnNovedad(false)
    setReturnTipoNovedad('dano_fisico')
    setReturnDescNovedad('')
    setReturnConfirmed(false)
    setReturnError(null)
    setReturnSuccess(null)
    setReturnModalOpen(true)
  }

  const handleSubmitDevolucion = async () => {
    if (!returnPrestamo || !returnConfirmed) return
    if (!returnFotoFile) { setReturnError('La fotografía del equipo es obligatoria.'); return }
    if (returnNovedad && !returnDescNovedad.trim()) { setReturnError('Debes describir la novedad reportada.'); return }
    setReturnSubmitting(true)
    setReturnError(null)

    let fotoUrl: string | null = null
    if (returnFotoFile) fotoUrl = await uploadFotoDevolucion(returnFotoFile)

    const result = await devolverEquipo(
      returnPrestamo.id, returnCondicion, returnObservaciones || null, fotoUrl,
      returnNovedad, returnNovedad ? returnTipoNovedad : null,
      returnNovedad && returnDescNovedad ? returnDescNovedad : null,
    )

    if (result.error) { setReturnError(result.error); setReturnSubmitting(false); return }
    setMisPrestamos(prev => prev.filter(p => p.id !== returnPrestamo.id))
    if (result.equipoId) setEquipos(prev => prev.map(e => e.id === result.equipoId ? { ...e, estado: 'disponible' as const } : e))
    setReturnSuccess({ numActa: result.numActa ?? returnPrestamo.num_acta ?? '' })
    setReturnSubmitting(false)
  }

  const handleEditarPrestamo = async () => {
    if (!editandoPrestamoId || !editPrestamoReservaId) return
    setSavingEditPrestamo(true)
    setEditPrestamoError(null)
    const result = await updatePrestamoReserva(editandoPrestamoId, editPrestamoReservaId)
    if (result.error) {
      setEditPrestamoError(result.error)
    } else {
      await loadMisPrestamos().catch(console.error)
      setEditandoPrestamoId(null)
      setEditPrestamoReservaId('')
    }
    setSavingEditPrestamo(false)
  }

  return (
    <div className="space-y-6">
      {/* ── Mis Préstamos Activos ──────────────────────────────────── */}
      {(loadingPrestamos || misPrestamos.length > 0) && (
        <div className="bg-surface-container-lowest rounded-xl border border-outline-variant/20 shadow-sm overflow-hidden">
          <div className="flex items-center gap-2 px-5 py-3.5 border-b border-outline-variant/15 bg-surface-container">
            <span className="material-symbols-outlined text-primary text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>inventory_2</span>
            <h3 className="font-label text-sm font-semibold text-on-surface">Mis Préstamos</h3>
            {misPrestamos.length > 0 && (
              <span className="ml-auto inline-flex items-center justify-center size-5 rounded-full bg-primary text-on-primary text-[10px] font-semibold">{misPrestamos.length}</span>
            )}
          </div>
          {loadingPrestamos ? (
            <div className="flex items-center justify-center gap-2 py-6 text-sm font-body text-on-surface-variant">
              <span className="size-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              Cargando préstamos…
            </div>
          ) : (
            <div className="divide-y divide-outline-variant/10">
              {misPrestamos.map(p => {
                const finDate = new Date(p.fecha_fin_esperada)
                const isOverdue = finDate < new Date(getBogotaNow().dateStr) && p.estado === 'activo'
                const isPendienteRevision = p.estado === 'pendiente_revision'
                const condicion = p.condicion_entrega ?? 'bueno'
                return (
                  <div key={p.id} className="divide-y divide-outline-variant/10">
                    <div className={`flex items-start gap-3 px-5 py-4 ${isOverdue ? 'bg-red-50/30' : isPendienteRevision ? 'bg-orange-50/20' : ''}`}>
                      <div className="shrink-0">
                        {p.equipos?.imagen_url ? (
                          <Image src={p.equipos.imagen_url} alt={p.equipos.nombre} width={44} height={44} className="rounded-lg object-cover border border-outline-variant/15" unoptimized />
                        ) : (
                          <div className="size-11 rounded-lg bg-surface-container flex items-center justify-center">
                            <span className="material-symbols-outlined text-on-surface-variant text-[22px]">devices</span>
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <p className="font-body text-sm font-semibold text-on-surface truncate">{p.equipos?.nombre ?? 'N/A'}</p>
                          {p.num_acta && (
                            <span className="font-mono text-[10px] bg-surface-container text-on-surface-variant px-1.5 py-0.5 rounded border border-outline-variant/20">{p.num_acta}</span>
                          )}
                          <span className={`inline-flex items-center gap-0.5 text-[10px] font-label font-semibold px-1.5 py-0.5 rounded border ${CONDICION_COLOR[condicion]}`}>
                            <span className="material-symbols-outlined text-[11px]" style={{ fontVariationSettings: "'FILL' 1" }}>{CONDICION_ICON[condicion]}</span>
                            Entregado: {CONDICION_LABEL[condicion]}
                          </span>
                          {isOverdue && (
                            <span className="inline-flex items-center gap-0.5 text-[10px] font-label font-semibold px-1.5 py-0.5 rounded bg-red-100 text-red-700 border border-red-200">
                              <span className="material-symbols-outlined text-[11px]">warning</span>Vencido
                            </span>
                          )}
                          {isPendienteRevision && (
                            <span className="inline-flex items-center gap-0.5 text-[10px] font-label font-semibold px-1.5 py-0.5 rounded bg-orange-100 text-orange-700 border border-orange-200">
                              <span className="material-symbols-outlined text-[11px]" style={{ fontVariationSettings: "'FILL' 1" }}>manage_search</span>En revisión
                            </span>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5">
                          {isPendienteRevision ? (
                            <span className="flex items-center gap-1 font-body text-xs text-orange-600">
                              <span className="material-symbols-outlined text-[12px]">info</span>
                              Equipo entregado · pendiente de revisión por el administrador
                            </span>
                          ) : (
                            <span className={`flex items-center gap-1 font-body text-xs ${isOverdue ? 'text-red-500 font-semibold' : 'text-on-surface-variant'}`}>
                              <span className="material-symbols-outlined text-[12px]">{isOverdue ? 'event_busy' : 'schedule'}</span>
                              {isOverdue ? 'Venció el ' : 'Devolver antes de: '}
                              {finDate.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'America/Bogota' })} · {finDate.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Bogota' })}
                            </span>
                          )}
                          {p.salas && (
                            <span className="flex items-center gap-1 font-body text-xs text-on-surface-variant">
                              <span className="material-symbols-outlined text-[12px]">meeting_room</span>{p.salas.nombre}
                            </span>
                          )}
                          {p.equipos?.marca && (
                            <span className="font-body text-xs text-on-surface-variant">{p.equipos.marca} · {p.equipos.tipo_equipo}</span>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-col sm:flex-row items-end sm:items-center gap-2 shrink-0">
                        {!isPendienteRevision && (
                          <>
                            <button type="button"
                              onClick={() => {
                                if (editandoPrestamoId === p.id) {
                                  setEditandoPrestamoId(null); setEditPrestamoError(null)
                                } else {
                                  setEditandoPrestamoId(p.id); setEditPrestamoReservaId(p.reserva_id ?? ''); setEditPrestamoError(null)
                                }
                              }}
                              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-label font-semibold border transition-colors ${editandoPrestamoId === p.id ? 'bg-primary/10 text-primary border-primary/30' : 'bg-surface-container text-on-surface-variant border-outline-variant/20 hover:bg-blue-50 hover:text-blue-700'}`}
                            >
                              <span className="material-symbols-outlined text-[14px]">edit</span>Editar
                            </button>
                            <button type="button"
                              onClick={() => handleAbrirDevolucion(p)}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-on-primary text-xs font-label font-semibold hover:opacity-90 border border-primary/30 transition-all shadow-sm"
                            >
                              <span className="material-symbols-outlined text-[14px]">assignment_return</span>Devolver equipo
                            </button>
                          </>
                        )}
                        {isPendienteRevision && (
                          <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-orange-50 text-orange-700 border border-orange-200 text-xs font-label font-semibold">
                            <span className="material-symbols-outlined text-[14px]" style={{ fontVariationSettings: "'FILL' 1" }}>manage_search</span>En revisión
                          </span>
                        )}
                      </div>
                    </div>
                    {editandoPrestamoId === p.id && (
                      <div className="px-5 py-3 bg-surface-container/40 space-y-2.5">
                        <p className="font-label text-xs text-on-surface-variant uppercase tracking-widest">Cambiar reserva vinculada</p>
                        <select
                          value={editPrestamoReservaId}
                          onChange={e => setEditPrestamoReservaId(e.target.value)}
                          disabled={savingEditPrestamo}
                          className="w-full rounded-lg border border-outline-variant/40 bg-surface-container-lowest px-3 py-2 text-sm font-body text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition appearance-none"
                        >
                          <option value="">Selecciona una reserva</option>
                          {reservas.filter(r => r.estado !== 'cancelada').map(r => (
                            <option key={r.id} value={r.id}>{r.titulo} · {r.salas?.nombre ?? 'Sin sala'} · {r.fecha} {r.hora_inicio.slice(0,5)}–{r.hora_fin.slice(0,5)}</option>
                          ))}
                        </select>
                        {editPrestamoError && (
                          <p className="text-xs font-body text-error flex items-center gap-1">
                            <span className="material-symbols-outlined text-[13px]">error</span>{editPrestamoError}
                          </p>
                        )}
                        <div className="flex gap-2">
                          <button type="button" onClick={handleEditarPrestamo} disabled={!editPrestamoReservaId || savingEditPrestamo} className="flex-1 py-2 rounded-lg bg-primary text-on-primary text-xs font-label font-semibold hover:opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed">
                            {savingEditPrestamo ? 'Guardando…' : 'Guardar cambio'}
                          </button>
                          <button type="button" onClick={() => { setEditandoPrestamoId(null); setEditPrestamoError(null) }} className="px-4 py-2 rounded-lg border border-outline-variant/30 text-xs font-label text-on-surface-variant hover:bg-surface-container transition">
                            Cancelar
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* Search + filter bar */}
      <div className="bg-surface-container-lowest rounded-xl border border-outline-variant/20 p-4 shadow-sm flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-[18px]">search</span>
          <input aria-label="Buscar equipos"
            type="text" value={techSearch} onChange={e => setTechSearch(e.target.value)}
            placeholder="Buscar por modelo, marca, tipo…"
            className="w-full pl-9 pr-3 py-2 bg-surface-container-low border border-outline-variant/30 rounded-lg text-sm font-body text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/40"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {[
            { value: '', label: 'Todos' },
            { value: 'ordenador', label: 'Ordenadores' },
            { value: 'movil', label: 'Móviles' },
            { value: 'periferico', label: 'Periféricos' },
            { value: 'mobiliario', label: 'Mobiliario' },
            { value: 'climatizacion', label: 'Climatización' },
          ].map(f => (
            <button type="button" key={f.value} onClick={() => setTechFilter(f.value)}
              className={`px-3 py-1.5 rounded-lg text-xs font-label font-semibold border transition-colors ${techFilter === f.value ? 'bg-primary text-on-primary border-primary' : 'bg-surface border-outline-variant/30 text-on-surface-variant hover:bg-surface-container'}`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Equipment grid */}
      {loadingEquipos ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[0,1,2,3,4,5].map(i => <SkeletonRoomCard key={i} />)}
        </div>
      ) : filteredTech.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
          <span className="material-symbols-outlined text-on-surface-variant text-4xl">devices_off</span>
          <p className="font-body font-semibold text-on-surface text-sm">
            {techSearch || techFilter ? 'Sin resultados para tu búsqueda' : 'No hay equipos disponibles'}
          </p>
          {(techSearch || techFilter) && (
            <button type="button" onClick={() => { setTechSearch(''); setTechFilter('') }} className="font-label text-sm text-primary hover:underline">
              Limpiar filtros
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTech.map((item) => (
            <div key={item.id} className="bg-surface-container-lowest rounded-2xl overflow-hidden border border-outline-variant/15 card-lift group flex flex-col" data-anim>
              <div className="relative h-48 overflow-hidden bg-surface-container">
                {item.imagen_url ? (
                  <Image
                    fill
                    unoptimized
                    src={item.imagen_url}
                    alt={item.nombre}
                    sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                    className="object-cover group-hover:scale-[1.02] transition-transform duration-300"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-surface-container-high">
                    <span className="material-symbols-outlined text-on-surface-variant text-6xl">devices</span>
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-80" />
                <div className="absolute bottom-4 left-4 right-4 flex justify-between items-end">
                  {(() => {
                    const retorno = equiposRetornos.get(item.id)
                    const estaEnUsoAhora = item.estado === 'reservado' && !!retorno
                    const estaReservadoFuturo = item.estado === 'reservado' && !retorno
                    return (
                      <span className={`inline-flex items-center gap-1.5 text-xs font-label font-bold px-2.5 py-1 rounded-md uppercase tracking-wider backdrop-blur-md ${
                        item.estado === 'disponible'  ? 'bg-green-500/20 text-green-50 border border-green-500/30'  :
                        estaEnUsoAhora               ? 'bg-blue-500/20 text-blue-50 border border-blue-500/30'     :
                        estaReservadoFuturo          ? 'bg-sky-500/20 text-sky-100 border border-sky-400/30'       :
                        'bg-orange-500/20 text-orange-50 border border-orange-500/30'
                      }`}>
                        <span className={`size-1.5 rounded-full ${item.estado === 'disponible' ? 'bg-green-400 shadow-[0_0_8px_rgba(74,222,128,0.8)]' : estaEnUsoAhora ? 'bg-blue-400' : estaReservadoFuturo ? 'bg-sky-300' : 'bg-orange-400'}`} />
                        {item.estado === 'disponible' ? 'Disponible' : estaEnUsoAhora ? 'En uso' : estaReservadoFuturo ? 'Reservado' : 'Mantenimiento'}
                      </span>
                    )
                  })()}
                </div>
              </div>
              <div className="p-4 flex-1 flex flex-col">
                <div>
                  <h4 className="font-headline font-semibold text-on-surface text-lg">{item.nombre}</h4>
                  <p className="font-label text-xs uppercase tracking-wider text-primary mt-1">{TIPO_EQUIPO_LABELS[item.tipo_equipo] ?? item.tipo_equipo} · {item.marca}</p>
                </div>
                <div className="flex flex-wrap gap-2 mt-3">
                  <span className="inline-flex items-center gap-1 bg-surface-container px-2 py-0.5 rounded text-xs font-label text-on-surface-variant capitalize">
                    <span className="material-symbols-outlined text-[14px]">computer</span>{item.sistema_operativo}
                  </span>
                  <span className="inline-flex items-center gap-1 bg-surface-container px-2 py-0.5 rounded text-xs font-label text-on-surface-variant capitalize">
                    <span className="material-symbols-outlined text-[14px]">category</span>{item.categoria}
                  </span>
                  {item.numero_serie && (
                    <span className="inline-flex items-center gap-1 bg-surface-container px-2 py-0.5 rounded text-xs font-mono text-primary">
                      <span className="material-symbols-outlined text-[12px]">tag</span>{item.numero_serie}
                    </span>
                  )}
                </div>
                {item.estado === 'reservado' && (() => {
                  const retorno = equiposRetornos.get(item.id)
                  if (retorno) {
                    const retornoDate = new Date(retorno)
                    return (
                      <div className="mt-2 flex items-center gap-1.5 text-xs font-body text-blue-600 bg-blue-50 border border-blue-100 rounded-lg px-2.5 py-1.5">
                        <span className="material-symbols-outlined text-[13px]" style={{ fontVariationSettings: "'FILL' 1" }}>schedule</span>
                        Disponible aprox. {retornoDate.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', timeZone: 'America/Bogota' })} {retornoDate.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Bogota' })}
                      </div>
                    )
                  }
                  return (
                    <div className="mt-2 flex items-center gap-1.5 text-xs font-body text-sky-600 bg-sky-50 border border-sky-100 rounded-lg px-2.5 py-1.5">
                      <span className="material-symbols-outlined text-[13px]" style={{ fontVariationSettings: "'FILL' 1" }}>event_upcoming</span>
                      Reservado para una fecha futura
                    </div>
                  )
                })()}
                <div className="mt-6 pt-4 border-t border-outline-variant/15 mt-auto">
                  <button type="button"
                    onClick={() => handleSolicitarEquipo(item)}
                    disabled={item.estado !== 'disponible'}
                    className="w-full bg-surface-container-high text-on-surface font-label text-sm font-semibold py-3 rounded-xl hover:bg-secondary hover:text-on-secondary hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 disabled:opacity-40 disabled:hover:translate-y-0 disabled:shadow-none disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {item.estado === 'disponible' ? (
                      <><span className="material-symbols-outlined text-[18px]">add_shopping_cart</span>Solicitar Equipo</>
                    ) : item.estado === 'reservado' ? (
                      <><span className="material-symbols-outlined text-[18px]">block</span>{equiposRetornos.has(item.id) ? 'En uso, no disponible' : 'Reservado, no disponible'}</>
                    ) : 'En Mantenimiento'}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ══ MODAL: SOLICITAR PRÉSTAMO ══════════════════════════════ */}
      {loanModalOpen && loanEquipo && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" onClick={() => { if (!loanSubmitting) { setLoanModalOpen(false); setLoanEquipo(null) } }} />
          <div className="relative w-full max-w-4xl bg-surface rounded-2xl shadow-2xl border border-outline-variant/20 flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between px-6 py-4 border-b border-outline-variant/15">
              <div className="flex items-center gap-3">
                <div className="bg-primary-container text-on-primary size-9 rounded-lg flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>add_shopping_cart</span>
                </div>
                <h2 className="font-headline text-lg font-semibold text-on-surface">Solicitar Equipo</h2>
              </div>
              <button type="button" onClick={() => { if (!loanSubmitting) { setLoanModalOpen(false); setLoanEquipo(null) } }} className="p-1.5 rounded-lg hover:bg-surface-container transition-colors text-on-surface-variant" aria-label="Cerrar">
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>
            <div className="px-6 pt-4">
              <div className="flex items-center gap-3 bg-surface-container rounded-xl p-3 border border-outline-variant/15">
                {loanEquipo.imagen_url ? (
                  <Image src={loanEquipo.imagen_url} alt={loanEquipo.nombre} width={56} height={56} className="rounded-lg object-cover shrink-0 border border-outline-variant/15" unoptimized />
                ) : (
                  <div className="size-14 rounded-lg bg-surface-container-high flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-on-surface-variant text-[28px]">devices</span>
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-headline font-semibold text-on-surface text-base truncate">{loanEquipo.nombre}</p>
                  <p className="font-label text-xs text-primary uppercase tracking-wide mt-0.5">{TIPO_EQUIPO_LABELS[loanEquipo.tipo_equipo] ?? loanEquipo.tipo_equipo} · {loanEquipo.marca}</p>
                  {loanEquipo.numero_serie && <code className="text-[10px] font-mono text-on-surface-variant mt-0.5 block">{loanEquipo.numero_serie}</code>}
                </div>
                <span className="inline-flex items-center gap-1 text-[10px] font-label font-semibold px-2 py-0.5 rounded bg-green-100 text-green-700 shrink-0">
                  <span className="size-1.5 rounded-full bg-green-500" />Disponible
                </span>
              </div>
            </div>
            <form onSubmit={handleSubmitLoan} className="px-6 py-4 space-y-4 overflow-y-auto flex-1">
              <p className="font-label text-xs uppercase tracking-widest text-on-surface-variant">Detalles del préstamo</p>
              <div>
                <label htmlFor="tech-loan-reserva" className="font-label text-xs text-on-surface-variant block mb-1.5">
                  Vincular a una reserva activa <span className="text-error">*</span>
                </label>
                {reservas.filter(r => r.estado !== 'cancelada').length === 0 ? (
                  <div className="space-y-2">
                    <div className="flex items-start gap-2 bg-surface-container rounded-lg p-3 text-sm font-body text-on-surface-variant">
                      <span className="material-symbols-outlined text-[18px] text-error shrink-0 mt-0.5">event_busy</span>
                      <span>No tienes reservas activas. Para solicitar un equipo debes tener una sala reservada.</span>
                    </div>
                    <button type="button"
                      onClick={() => { setLoanModalOpen(false); onOpenReservationWithEquipo(loanEquipo.id) }}
                      className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg border border-primary text-primary text-sm font-label font-semibold hover:bg-primary/5 transition"
                    >
                      <span className="material-symbols-outlined text-[18px]">add_circle</span>Crear reserva con este equipo
                    </button>
                  </div>
                ) : (
                  <>
                    <select
                      id="tech-loan-reserva"
                      value={loanForm.reserva_id}
                      onChange={e => {
                        const rid = e.target.value
                        const r = reservas.find(x => x.id === rid)
                        if (r) {
                          setLoanForm(f => ({ ...f, reserva_id: rid, sala_id: r.salas?.id ?? '', fecha: r.fecha, hora_devolucion: r.hora_fin.slice(0, 5) }))
                        } else {
                          setLoanForm(f => ({ ...f, reserva_id: '', sala_id: '', fecha: '', hora_devolucion: '' }))
                        }
                      }}
                      disabled={loanSubmitting} required
                      className="w-full rounded-lg border border-outline-variant/40 bg-surface-container-lowest px-3 py-2.5 text-sm font-body text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition appearance-none"
                    >
                      <option value="">Selecciona una reserva</option>
                      {reservas.filter(r => r.estado !== 'cancelada').map(r => (
                        <option key={r.id} value={r.id}>{r.titulo} · {r.salas?.nombre ?? 'Sin sala'} · {r.fecha} {r.hora_inicio.slice(0,5)}–{r.hora_fin.slice(0,5)}</option>
                      ))}
                    </select>
                    {loanForm.reserva_id && (
                      <p className="mt-1.5 text-[11px] font-body text-primary flex items-center gap-1">
                        <span className="material-symbols-outlined text-[14px]">link</span>Sala y horario de devolución pre-llenados desde la reserva.
                      </p>
                    )}
                  </>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="tech-loan-fecha" className="font-label text-xs text-on-surface-variant block mb-1.5">Fecha de devolución</label>
                  <input id="tech-loan-fecha" aria-label="Fecha de devolución" type="date" value={loanForm.fecha} readOnly disabled={loanSubmitting} className="w-full rounded-lg border border-outline-variant/40 bg-surface-container px-3 py-2.5 text-sm font-body text-on-surface-variant cursor-not-allowed" required />
                </div>
                <div>
                  <label htmlFor="tech-loan-hora" className="font-label text-xs text-on-surface-variant block mb-1.5">Hora de devolución <span className="text-error">*</span></label>
                  <input id="tech-loan-hora" aria-label="Hora de devolución" type="time" value={loanForm.hora_devolucion} readOnly disabled={loanSubmitting} className="w-full rounded-lg border border-outline-variant/40 bg-surface-container px-3 py-2.5 text-sm font-body text-on-surface-variant cursor-not-allowed" required />
                </div>
              </div>
              <div>
                <label htmlFor="tech-loan-notas" className="font-label text-xs text-on-surface-variant block mb-1.5">Notas <span className="ml-1 text-on-surface-variant/50">(opcional)</span></label>
                <textarea id="tech-loan-notas" aria-label="Notas del préstamo" value={loanForm.notas} onChange={e => setLoanForm(f => ({ ...f, notas: e.target.value }))} disabled={loanSubmitting} placeholder="Ej: Para presentación del proyecto final…" rows={2} maxLength={300} className="w-full rounded-lg border border-outline-variant/40 bg-surface-container-lowest px-3 py-2.5 text-sm font-body text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition resize-none" />
              </div>
              <div>
                <p className="font-label text-xs text-on-surface-variant block mb-1.5 uppercase tracking-widest">Condición del equipo al recibirlo *</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {CONDICIONES_ENTREGA.map(c => (
                    <button key={c} type="button" onClick={() => setLoanForm(f => ({ ...f, condicion_entrega: c }))}
                      className={`flex items-center gap-1.5 px-3 py-2 rounded-lg border text-xs font-label font-semibold transition-all ${loanForm.condicion_entrega === c ? `${CONDICION_COLOR[c]} ring-2 ring-offset-1 ring-current` : 'border-outline-variant/30 text-on-surface-variant hover:bg-surface-container'}`}
                    >
                      <span className="material-symbols-outlined text-[14px]" style={{ fontVariationSettings: "'FILL' 1" }}>{CONDICION_ICON[c]}</span>
                      {CONDICION_LABEL[c]}
                    </button>
                  ))}
                </div>
                <p className="font-body text-[11px] text-on-surface-variant mt-1.5">Esta condición queda registrada en el acta del préstamo.</p>
              </div>
              <div className="flex items-start gap-2 bg-surface-container rounded-lg px-3 py-2.5 text-xs font-body text-on-surface-variant">
                <span className="material-symbols-outlined text-[16px] text-primary shrink-0 mt-0.5">info</span>
                <span>El equipo quedará como <strong>reservado</strong>. Al devolverlo deberás documentar su condición y tomar una foto. Se generará un acta electrónica automáticamente.</span>
              </div>
              {loanError && (
                <div className="flex items-start gap-2 bg-error-container text-on-error-container rounded-lg px-4 py-3 text-sm font-body">
                  <span className="material-symbols-outlined text-[18px] shrink-0 mt-0.5">error</span>{loanError}
                </div>
              )}
              {loanSuccess && (
                <div className="flex items-start gap-3 bg-green-50 border border-green-200 rounded-xl px-4 py-3">
                  <span className="material-symbols-outlined text-[22px] text-green-500 shrink-0 mt-0.5" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                  <div>
                    <p className="font-label text-sm font-semibold text-green-800">¡Préstamo registrado!</p>
                    {loanActa && <p className="font-mono text-xs text-green-600 mt-0.5">Acta: {loanActa}</p>}
                    <p className="font-body text-xs text-green-700 mt-0.5">Se ha enviado confirmación a tu correo. Recuerda devolver el equipo en las mismas condiciones.</p>
                  </div>
                </div>
              )}
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => { if (!loanSubmitting) { setLoanModalOpen(false); setLoanEquipo(null) } }} disabled={loanSubmitting} className="flex-1 py-2.5 rounded-lg border border-outline-variant/40 text-on-surface font-label text-sm font-medium hover:bg-surface-container transition-colors disabled:opacity-50">
                  Cancelar
                </button>
                <button type="submit" disabled={loanSubmitting || loanSuccess || !loanForm.reserva_id || !loanForm.fecha || !loanForm.hora_devolucion}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg bg-primary text-on-primary font-label text-sm font-medium hover:brightness-105 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loanSubmitting ? (
                    <><span className="size-4 animate-spin rounded-full border-2 border-on-primary border-t-transparent" />Procesando…</>
                  ) : (
                    <><span className="material-symbols-outlined text-[18px]">add_shopping_cart</span>Confirmar préstamo</>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ══ MODAL: DEVOLUCIÓN DE EQUIPO ══════════════════════════ */}
      {returnModalOpen && returnPrestamo && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" onClick={() => { if (!returnSubmitting) setReturnModalOpen(false) }} />
          <div className="relative w-full max-w-lg bg-surface rounded-2xl shadow-2xl border border-outline-variant/20 flex flex-col max-h-[92vh]">
            <div className="flex items-center justify-between px-6 py-5 border-b border-outline-variant/15">
              <div className="flex items-center gap-3">
                <div className="bg-primary/10 text-primary size-9 rounded-lg flex items-center justify-center">
                  <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>assignment_return</span>
                </div>
                <div>
                  <h2 className="font-headline text-base font-semibold text-on-surface">Devolver equipo</h2>
                  {returnPrestamo.num_acta && <p className="font-mono text-[11px] text-on-surface-variant">{returnPrestamo.num_acta}</p>}
                </div>
              </div>
              <button type="button" onClick={() => { if (!returnSubmitting) setReturnModalOpen(false) }} className="p-1.5 rounded-lg hover:bg-surface-container transition-colors text-on-surface-variant">
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>
            {!returnSuccess && (
              <div className="flex items-center gap-1 px-6 py-3 border-b border-outline-variant/10 bg-surface-container/30">
                {([1, 2, 3] as const).map(s => (
                  <div key={s} className="flex items-center gap-1">
                    <div className={`size-6 rounded-full flex items-center justify-center text-[11px] font-label font-bold transition-colors ${returnStep >= s ? 'bg-primary text-on-primary' : 'bg-surface-container text-on-surface-variant'}`}>{s}</div>
                    <span className={`text-[11px] font-label hidden sm:block ${returnStep >= s ? 'text-primary font-semibold' : 'text-on-surface-variant'}`}>{s === 1 ? 'Condición' : s === 2 ? 'Documentación' : 'Confirmar'}</span>
                    {s < 3 && <div className={`w-8 h-px mx-1 ${returnStep > s ? 'bg-primary' : 'bg-outline-variant/30'}`} />}
                  </div>
                ))}
              </div>
            )}
            <div className="overflow-y-auto flex-1 px-6 py-5">
              <div className="flex items-center gap-3 mb-5 p-3 bg-surface-container rounded-xl">
                {returnPrestamo.equipos?.imagen_url ? (
                  <Image src={returnPrestamo.equipos.imagen_url} alt="" width={48} height={48} className="rounded-lg object-cover border border-outline-variant/15 shrink-0" unoptimized />
                ) : (
                  <div className="size-12 rounded-lg bg-surface-container-high flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-on-surface-variant text-[24px]">devices</span>
                  </div>
                )}
                <div>
                  <p className="font-body font-semibold text-sm text-on-surface">{returnPrestamo.equipos?.nombre}</p>
                  <p className="font-body text-xs text-on-surface-variant">{returnPrestamo.equipos?.marca} · {returnPrestamo.equipos?.tipo_equipo}</p>
                  <div className="flex items-center gap-1.5 mt-1">
                    <span className={`inline-flex items-center gap-0.5 text-[10px] font-label font-semibold px-1.5 py-0.5 rounded border ${CONDICION_COLOR[returnPrestamo.condicion_entrega ?? 'bueno']}`}>
                      <span className="material-symbols-outlined text-[10px]" style={{ fontVariationSettings: "'FILL' 1" }}>{CONDICION_ICON[returnPrestamo.condicion_entrega ?? 'bueno']}</span>
                      Al prestar: {CONDICION_LABEL[returnPrestamo.condicion_entrega ?? 'bueno']}
                    </span>
                  </div>
                </div>
              </div>
              {returnStep === 1 && !returnSuccess && (
                <div className="space-y-4">
                  <div>
                    <p className="font-label text-xs font-semibold text-on-surface uppercase tracking-widest mb-3">¿En qué condición devuelves el equipo?</p>
                    <div className="grid grid-cols-2 gap-2">
                      {CONDICIONES_DEVOLUCION.map(c => (
                        <button type="button" key={c}
                          onClick={() => { setReturnCondicion(c); if (['dano_leve','dano_grave','perdido'].includes(c)) setReturnNovedad(true); else setReturnNovedad(false) }}
                          className={`flex items-center gap-2 px-3 py-3 rounded-xl border text-sm font-label font-semibold transition-all text-left ${returnCondicion === c ? `${CONDICION_COLOR[c]} ring-2 ring-offset-1 ring-current` : 'border-outline-variant/30 text-on-surface-variant hover:bg-surface-container'}`}
                        >
                          <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>{CONDICION_ICON[c]}</span>
                          <span>{CONDICION_LABEL[c]}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                  {['dano_leve','dano_grave','perdido'].includes(returnCondicion) && (
                    <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2.5 text-xs font-body text-amber-800">
                      <span className="material-symbols-outlined text-[15px] text-amber-500 shrink-0 mt-0.5">warning</span>
                      Se registrará automáticamente una <strong>novedad</strong> y se notificará al equipo de TI.
                    </div>
                  )}
                  <button type="button" onClick={() => setReturnStep(2)} className="w-full py-2.5 rounded-xl bg-primary text-on-primary font-label font-semibold text-sm hover:opacity-90 transition">Continuar →</button>
                </div>
              )}
              {returnStep === 2 && !returnSuccess && (
                <div className="space-y-4">
                  <div>
                    <label className="font-label text-xs font-semibold text-on-surface uppercase tracking-widest block mb-2">
                      Foto del equipo{['dano_leve','dano_grave'].includes(returnCondicion) && <span className="ml-1 text-red-500">*</span>}
                    </label>
                    {returnFotoPreview ? (
                      <div className="relative h-40">
                        <Image unoptimized fill src={returnFotoPreview} alt="preview" sizes="100vw" className="object-cover rounded-xl border border-outline-variant/20" />
                        <button type="button" onClick={() => { setReturnFotoFile(null); setReturnFotoPreview(null) }} className="absolute top-2 right-2 bg-black/50 text-white p-1 rounded-full hover:bg-black/70 transition">
                          <span className="material-symbols-outlined text-[16px]">close</span>
                        </button>
                      </div>
                    ) : (
                      <label htmlFor="field-return-foto" className="flex flex-col items-center gap-2 py-8 border-2 border-dashed border-outline-variant/40 rounded-xl cursor-pointer hover:border-primary/50 hover:bg-surface-container/30 transition">
                        <span className="material-symbols-outlined text-on-surface-variant text-4xl">add_a_photo</span>
                        <span className="font-body text-sm text-on-surface-variant">Toca para adjuntar foto</span>
                        <span className="font-body text-xs text-on-surface-variant/60">JPG, PNG, WEBP · máx 10 MB</span>
                        <input id="field-return-foto" type="file" accept="image/*" capture="environment" className="hidden"
                          onChange={e => { const f = e.target.files?.[0]; if (f) { setReturnFotoFile(f); setReturnFotoPreview(URL.createObjectURL(f)) } }}
                        />
                      </label>
                    )}
                    <p className="font-body text-[11px] text-on-surface-variant mt-1">Obligatoria. Toma la foto ahora mostrando el estado visible completo del equipo.</p>
                  </div>
                  <div>
                    <label htmlFor="field-return-obs" className="font-label text-xs font-semibold text-on-surface uppercase tracking-widest block mb-1.5">Observaciones <span className="text-on-surface-variant font-normal">(opcional)</span></label>
                    <textarea aria-label="Observaciones de la devolución" id="field-return-obs" value={returnObservaciones} onChange={e => setReturnObservaciones(e.target.value)} rows={3} maxLength={500} placeholder="Describe cualquier detalle relevante sobre el estado del equipo al momento de la devolución…" className="w-full rounded-lg border border-outline-variant/40 bg-surface-container-lowest px-3 py-2.5 text-sm font-body text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition resize-none" />
                  </div>
                  <div className="border border-outline-variant/20 rounded-xl overflow-hidden">
                    <button type="button" onClick={() => setReturnNovedad(v => !v)} className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-label font-semibold transition-colors ${returnNovedad ? 'bg-amber-50 text-amber-800' : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-low'}`}>
                      <span className="material-symbols-outlined text-[18px]" style={{ fontVariationSettings: `'FILL' ${returnNovedad ? 1 : 0}` }}>warning</span>
                      Reportar novedad o incidencia
                      <span className="ml-auto material-symbols-outlined text-[18px]">{returnNovedad ? 'expand_less' : 'expand_more'}</span>
                    </button>
                    {returnNovedad && (
                      <div className="px-4 py-3 bg-amber-50/50 space-y-3">
                        <div>
                          <label htmlFor="field-return-tipo" className="font-label text-xs text-on-surface-variant block mb-1">Tipo de novedad</label>
                          <select id="field-return-tipo" value={returnTipoNovedad} onChange={e => setReturnTipoNovedad(e.target.value as TipoNovedad)} className="w-full rounded-lg border border-outline-variant/40 bg-white px-3 py-2 text-sm font-body focus:outline-none focus:ring-2 focus:ring-amber-400/40 appearance-none">
                            {TIPOS_NOVEDAD.map(t => <option key={t} value={t}>{NOVEDAD_LABEL[t]}</option>)}
                          </select>
                        </div>
                        <div>
                          <label htmlFor="field-return-desc" className="font-label text-xs text-on-surface-variant block mb-1">Descripción detallada <span className="text-red-500">*</span></label>
                          <textarea aria-label="Descripción de la novedad" id="field-return-desc" value={returnDescNovedad} onChange={e => setReturnDescNovedad(e.target.value)} rows={2} maxLength={300} placeholder="Describe qué ocurrió con el equipo…" className={`w-full rounded-lg border px-3 py-2.5 text-sm font-body focus:outline-none focus:ring-2 focus:ring-amber-400/40 transition resize-none bg-white ${!returnDescNovedad.trim() ? 'border-red-300' : 'border-outline-variant/40'}`} />
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => setReturnStep(1)} className="px-4 py-2.5 rounded-xl border border-outline-variant/30 text-sm font-label text-on-surface-variant hover:bg-surface-container transition">← Atrás</button>
                    <button type="button" onClick={() => setReturnStep(3)} disabled={!returnFotoFile || (returnNovedad && !returnDescNovedad.trim())} className="flex-1 py-2.5 rounded-xl bg-primary text-on-primary font-label font-semibold text-sm hover:opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed" title={!returnFotoFile ? 'La foto es obligatoria' : (returnNovedad && !returnDescNovedad.trim()) ? 'Describe la novedad' : undefined}>
                      Continuar → Revisar
                    </button>
                  </div>
                </div>
              )}
              {returnStep === 3 && !returnSuccess && (
                <div className="space-y-4">
                  <p className="font-label text-xs font-semibold text-on-surface uppercase tracking-widest">Resumen del acta de devolución</p>
                  <div className="bg-surface-container rounded-xl p-4 space-y-2.5 text-sm font-body">
                    <div className="flex justify-between">
                      <span className="text-on-surface-variant">Condición de entrega</span>
                      <span className={`font-semibold px-2 py-0.5 rounded text-xs border ${CONDICION_COLOR[returnPrestamo.condicion_entrega ?? 'bueno']}`}>{CONDICION_LABEL[returnPrestamo.condicion_entrega ?? 'bueno']}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-on-surface-variant">Condición de devolución</span>
                      <span className={`font-semibold px-2 py-0.5 rounded text-xs border ${CONDICION_COLOR[returnCondicion]}`}>{CONDICION_LABEL[returnCondicion]}</span>
                    </div>
                    {returnObservaciones && <div><span className="text-on-surface-variant text-xs">Observaciones: </span><span className="text-on-surface text-xs">{returnObservaciones}</span></div>}
                    {returnFotoFile && <div className="flex items-center gap-1.5 text-xs text-green-700"><span className="material-symbols-outlined text-[14px]">check_circle</span> Foto adjunta: {returnFotoFile.name}</div>}
                    {returnNovedad && (
                      <div className="flex items-center gap-1.5 text-xs text-amber-700 bg-amber-50 rounded-lg px-2 py-1.5">
                        <span className="material-symbols-outlined text-[14px]">warning</span>
                        Novedad: {NOVEDAD_LABEL[returnTipoNovedad]} {returnDescNovedad ? `· ${returnDescNovedad.slice(0,60)}…` : ''}
                      </div>
                    )}
                  </div>
                  <label htmlFor="field-return-confirm" className="flex items-start gap-3 cursor-pointer p-3 rounded-xl border border-outline-variant/20 hover:bg-surface-container/30 transition">
                    <input aria-label="Confirmar devolución" id="field-return-confirm" type="checkbox" checked={returnConfirmed} onChange={e => setReturnConfirmed(e.target.checked)} className="mt-0.5 size-4 accent-primary" />
                    <span className="font-body text-xs text-on-surface leading-relaxed">
                      Confirmo que la información registrada es correcta y que entrego el equipo al área de TI en las condiciones indicadas. Comprendo que cualquier diferencia con la condición de entrega puede generar responsabilidad a mi nombre.
                    </span>
                  </label>
                  {returnError && (
                    <div className="flex items-start gap-2 bg-error-container text-on-error-container rounded-lg px-4 py-3 text-sm font-body">
                      <span className="material-symbols-outlined text-[18px] shrink-0 mt-0.5">error</span>{returnError}
                    </div>
                  )}
                  <div className="flex gap-2">
                    <button type="button" onClick={() => setReturnStep(2)} disabled={returnSubmitting} className="px-4 py-2.5 rounded-xl border border-outline-variant/30 text-sm font-label text-on-surface-variant hover:bg-surface-container transition disabled:opacity-50">← Atrás</button>
                    <button type="button" onClick={handleSubmitDevolucion} disabled={!returnConfirmed || returnSubmitting}
                      className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl font-label font-semibold text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed ${returnNovedad ? 'bg-amber-600 text-white hover:bg-amber-700' : 'bg-primary text-on-primary hover:opacity-90'}`}
                    >
                      {returnSubmitting ? (
                        <><span className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent" />Procesando…</>
                      ) : (
                        <><span className="material-symbols-outlined text-[18px]">send</span>{returnNovedad ? 'Devolver y reportar novedad' : 'Confirmar devolución'}</>
                      )}
                    </button>
                  </div>
                </div>
              )}
              {returnSuccess && (
                <div className="flex flex-col items-center gap-4 py-4 text-center">
                  <div className={`size-16 rounded-full flex items-center justify-center ${returnNovedad ? 'bg-amber-100' : 'bg-green-100'}`}>
                    <span className={`material-symbols-outlined text-4xl ${returnNovedad ? 'text-amber-600' : 'text-green-600'}`} style={{ fontVariationSettings: "'FILL' 1" }}>
                      {returnNovedad ? 'report' : 'check_circle'}
                    </span>
                  </div>
                  <div>
                    <p className="font-headline text-base font-semibold text-on-surface">{returnNovedad ? 'Devolución registrada con novedad' : '¡Devolución registrada!'}</p>
                    {returnSuccess.numActa && <p className="font-mono text-xs text-on-surface-variant mt-1">Acta: {returnSuccess.numActa}</p>}
                    <p className="font-body text-sm text-on-surface-variant mt-2">
                      {returnNovedad ? 'El equipo de TI ha sido notificado y revisará la novedad reportada. Recibirás un correo de confirmación.' : 'Hemos enviado la confirmación a tu correo. ¡Gracias por devolver el equipo correctamente!'}
                    </p>
                  </div>
                  <button type="button" onClick={() => setReturnModalOpen(false)} className="px-6 py-2.5 rounded-xl bg-primary text-on-primary font-label font-semibold text-sm hover:opacity-90 transition">Cerrar</button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
