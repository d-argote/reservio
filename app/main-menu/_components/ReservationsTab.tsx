'use client'

import { useState, useCallback, useEffect, useMemo, useRef } from 'react'
import Image from 'next/image'
import { supabase } from '@/lib/supabase/client'
import {
  getSalasConDisponibilidadFecha,
  getDisponibilidadSala,
  createReserva,
  updateReserva,
  cancelarReserva,
  deleteReserva,
  getMisReservasHistorial,
  type FranjaOcupada,
  type ReservaHistorial,
} from '@/features/reservas/actions'
import { ReservasCalendar } from '@/components/ui/ReservasCalendar'
import { AvailabilityTimeline } from '@/components/ui/AvailabilityTimeline'
import { hasOverlap } from '@/lib/availability-utils'
import { FEATURES } from '@/config/features'
import {
  getBogotaNow, formatFecha, formatHora, addHoras, diffHoras, formatDuracion,
  CARD_STYLES, getRoomImage,
  SkeletonSummaryCard, SkeletonReservationCard, SkeletonRoomCard,
} from './helpers'
import type { Sala, Reserva, ReservaForm } from './types'

const EMPTY_FORM: ReservaForm = { titulo: '', sala_id: '', fecha: '', hora_inicio: '', hora_fin: '' }
const HISTORIAL_PAGE_SIZE = 8

interface ReservationsTabProps {
  userId: string
  profileNombre: string
  isAdmin: boolean
  onShowComingSoon: () => void
  onShowGlobalError: (msg: string) => void
  onPreviewSala: (sala: Sala) => void
  salasRefreshRef: React.MutableRefObject<(() => void) | null>
  /** Open modal immediately with this sala pre-selected (from cross-tab navigation) */
  initialSalaId?: string
  /** Open modal with this equipoId (from TechTab "Crear reserva con este equipo") */
  initialEquipoId?: string
  onInitialNavHandled?: () => void
}

export function ReservationsTab({
  userId, profileNombre, isAdmin, onShowComingSoon, onShowGlobalError, onPreviewSala,
  salasRefreshRef, initialSalaId, initialEquipoId, onInitialNavHandled,
}: ReservationsTabProps) {

  // ── Data state ───────────────────────────────────────────────────
  const [reservas, setReservas] = useState<Reserva[]>([])
  const [salas, setSalas] = useState<Sala[]>([])
  const [calendarReservas, setCalendarReservas] = useState<Reserva[]>([])
  const [reservasHistorial, setReservasHistorial] = useState<ReservaHistorial[]>([])

  // ── Loading state ───────────────────────────────────────────────
  const [loadingReservas, setLoadingReservas] = useState(true)
  const [loadingSalas, setLoadingSalas] = useState(true)
  const [loadingCalendar, setLoadingCalendar] = useState(false)
  const [loadingHistorialReservas, setLoadingHistorialReservas] = useState(false)
  const [historialReservasLoaded, setHistorialReservasLoaded] = useState(false)

  // ── View state ──────────────────────────────────────────────────
  const [reservaView, setReservaView] = useState<'list' | 'calendar'>('calendar')
  const [reservaView2, setReservaView2] = useState<'upcoming' | 'history'>('upcoming')

  // ── Historial filter state ──────────────────────────────────────
  const [historialSearch, setHistorialSearch] = useState('')
  const [historialEstadoFilter, setHistorialEstadoFilter] = useState<'todos' | 'confirmada' | 'pendiente' | 'cancelada'>('todos')
  const [historialPage, setHistorialPage] = useState(1)

  // ── Operation state ─────────────────────────────────────────────
  const [editingReservaId, setEditingReservaId] = useState<string | null>(null)
  const [cancelingReservaId, setCancelingReservaId] = useState<string | null>(null)
  const [deletingReservaId, setDeletingReservaId] = useState<string | null>(null)

  // ── Modal state ─────────────────────────────────────────────────
  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState<ReservaForm>(EMPTY_FORM)
  const [submitting, setSubmitting] = useState(false)
  const [modalError, setModalError] = useState<string | null>(null)
  const [modalSuccess, setModalSuccess] = useState(false)
  const [duracionPreset, setDuracionPreset] = useState<number | 'libre' | 'dia'>('libre')

  // ── Availability timeline state ─────────────────────────────────
  const [modalFranjas, setModalFranjas] = useState<FranjaOcupada[]>([])
  const [loadingFranjas, setLoadingFranjas] = useState(false)
  const refreshModalFranjasRef = useRef<(() => void) | null>(null)

  // ── Fetch functions ─────────────────────────────────────────────
  const fetchReservas = useCallback(async () => {
    setLoadingReservas(true)
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
    setLoadingReservas(false)
  }, [userId])

  const fetchCalendarReservas = useCallback(async () => {
    setLoadingCalendar(true)
    const now = new Date()
    const start = new Date(now.getFullYear(), now.getMonth() - 2, 1)
    const end = new Date(now.getFullYear(), now.getMonth() + 5, 0)
    const p = (n: number) => String(n).padStart(2, '0')
    const startStr = `${start.getFullYear()}-${p(start.getMonth() + 1)}-01`
    const endStr = `${end.getFullYear()}-${p(end.getMonth() + 1)}-${p(end.getDate())}`
    const { data } = await supabase
      .from('reservas')
      .select('id, titulo, fecha, hora_inicio, hora_fin, estado, salas(id, nombre, capacidad, ubicacion)')
      .eq('usuario_id', userId)
      .gte('fecha', startStr)
      .lte('fecha', endStr)
      .order('fecha', { ascending: true })
      .order('hora_inicio', { ascending: true })
    if (data) setCalendarReservas(data as unknown as Reserva[])
    setLoadingCalendar(false)
  }, [userId])

  const fetchSalas = useCallback(async () => {
    setLoadingSalas(true)
    const { dateStr } = getBogotaNow()
    const result = await getSalasConDisponibilidadFecha(dateStr)
    if (result.data) setSalas(result.data as Sala[])
    setLoadingSalas(false)
  }, [])

  const loadHistorialReservas = useCallback(async () => {
    if (historialReservasLoaded) return
    setLoadingHistorialReservas(true)
    const result = await getMisReservasHistorial()
    if (result.data) setReservasHistorial(result.data)
    setLoadingHistorialReservas(false)
    setHistorialReservasLoaded(true)
  }, [historialReservasLoaded])

  // Register silent salas refresh callback for realtime hook
  useEffect(() => {
    salasRefreshRef.current = async () => {
      const { dateStr } = getBogotaNow()
      const result = await getSalasConDisponibilidadFecha(dateStr)
      if (result.data) {
        setSalas(result.data as Sala[])
        refreshModalFranjasRef.current?.()
      }
    }
    return () => { salasRefreshRef.current = null }
  }, [salasRefreshRef])

  // Initial fetch on mount
  useEffect(() => {
    fetchReservas()
    fetchSalas()
    fetchCalendarReservas()
  }, [fetchReservas, fetchSalas, fetchCalendarReservas])

  // Re-fetch timeline when sala/date changes in modal
  useEffect(() => {
    if (!modalOpen || !form.sala_id || !form.fecha) {
      setModalFranjas([])
      return
    }
    let cancelled = false
    const doFetch = () => {
      if (cancelled) return
      setLoadingFranjas(true)
      getDisponibilidadSala(form.sala_id, form.fecha, editingReservaId ?? undefined).then((result) => {
        if (!cancelled) {
          setModalFranjas(result.franjas ?? [])
          setLoadingFranjas(false)
        }
      })
    }
    refreshModalFranjasRef.current = doFetch
    doFetch()
    return () => {
      cancelled = true
      refreshModalFranjasRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modalOpen, form.sala_id, form.fecha])

  // Handle cross-tab initial navigation (from RoomsTab or TechTab)
  useEffect(() => {
    if (initialSalaId) { openModal(initialSalaId); onInitialNavHandled?.() }
    else if (initialEquipoId) { openModal(undefined, undefined, initialEquipoId); onInitialNavHandled?.() }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialSalaId, initialEquipoId])

  // ── Derived data ─────────────────────────────────────────────────
  const proximaReserva = useMemo(() => reservas[0] ?? null, [reservas])
  const salasCount = salas.length

  // ── Handlers ─────────────────────────────────────────────────────
  const openModal = async (salaId?: string, fecha?: string, _equipoId?: string) => {
    const { dateStr: todayStr } = getBogotaNow()
    setForm({ ...EMPTY_FORM, fecha: fecha ?? todayStr, sala_id: salaId ?? '' })
    setModalError(null)
    setModalSuccess(false)
    setDuracionPreset('libre')
    setModalFranjas([])
    setModalOpen(true)
  }

  const handleNuevaReserva = () => {
    if (!FEATURES.reservations) { onShowComingSoon(); return }
    openModal()
  }

  const handleSubmitReserva = async (e: React.FormEvent) => {
    e.preventDefault()
    setModalError(null)

    if (!form.titulo.trim()) { setModalError('El título es obligatorio.'); return }
    if (form.titulo.trim().length < 3) { setModalError('El título debe tener al menos 3 caracteres.'); return }
    if (!form.sala_id) { setModalError('Selecciona una sala.'); return }
    if (!form.fecha) { setModalError('Selecciona una fecha.'); return }
    const { dateStr: _localToday } = getBogotaNow()
    if (form.fecha < _localToday) { setModalError('No puedes reservar en una fecha pasada.'); return }
    if (!form.hora_inicio) { setModalError('Indica la hora de inicio.'); return }
    if (!form.hora_fin) { setModalError('Indica la hora de fin.'); return }
    if (form.hora_fin <= form.hora_inicio) { setModalError('La hora de fin debe ser posterior a la hora de inicio.'); return }
    const durMin = diffHoras(form.hora_inicio, form.hora_fin) * 60
    if (durMin < 30) { setModalError('La reserva debe durar al menos 30 minutos.'); return }
    if (durMin > 24 * 60) { setModalError('La reserva no puede durar más de 24 horas.'); return }

    if (form.fecha === _localToday) {
      const [h, m] = form.hora_inicio.split(':').map(Number)
      const selectedMinutes = h * 60 + m
      const { totalMinutes: currentTotalMinutes } = getBogotaNow()
      if (selectedMinutes < currentTotalMinutes) {
        setModalError('La hora de inicio ya pasó. Por favor, selecciona una hora válida.')
        return
      }
    }

    if (modalFranjas.length > 0 && hasOverlap(form.hora_inicio, form.hora_fin, modalFranjas)) {
      setModalError('El horario seleccionado se solapa con una reserva existente. Elige un rango disponible.')
      return
    }

    setSubmitting(true)

    if (editingReservaId) {
      const result = await updateReserva(editingReservaId, {
        titulo: form.titulo.trim(), sala_id: form.sala_id,
        fecha: form.fecha, hora_inicio: form.hora_inicio, hora_fin: form.hora_fin,
      })
      if (result.error) { setModalError(result.error); setSubmitting(false); return }
    } else {
      const result = await createReserva({
        titulo: form.titulo.trim(), sala_id: form.sala_id,
        fecha: form.fecha, hora_inicio: form.hora_inicio, hora_fin: form.hora_fin,
      }, [])
      if (result.error) { setModalError(result.error); setSubmitting(false); return }
      if (result.prestamosError) {
        setModalError(`Reserva creada, pero no se pudieron registrar los préstamos de equipo: ${result.prestamosError}.`)
        setSubmitting(false)
        fetchReservas(); fetchCalendarReservas()
        return
      }
    }

    setSubmitting(false)
    setModalSuccess(true)
    fetchReservas(); fetchCalendarReservas(); fetchSalas()

    setTimeout(() => {
      setModalOpen(false); setModalSuccess(false); setEditingReservaId(null)
    }, 1500)
  }

  const handleEditReserva = (reserva: Reserva) => {
    setEditingReservaId(reserva.id)
    setForm({ titulo: reserva.titulo, sala_id: reserva.salas?.id ?? '', fecha: reserva.fecha, hora_inicio: reserva.hora_inicio.slice(0, 5), hora_fin: reserva.hora_fin.slice(0, 5) })
    setModalError(null); setModalSuccess(false); setDuracionPreset('libre'); setModalFranjas([])
    setModalOpen(true)
  }

  const handleCancelReserva = async (reservaId: string) => {
    setCancelingReservaId(reservaId)
    const result = await cancelarReserva(reservaId)
    if (!result.error) {
      setReservas(prev => prev.filter(r => r.id !== reservaId))
      setCalendarReservas(prev => prev.map(r => r.id === reservaId ? { ...r, estado: 'cancelada' as const } : r))
      fetchSalas()
    }
    setCancelingReservaId(null)
  }

  const handleDeleteReserva = async (reservaId: string) => {
    setDeletingReservaId(reservaId)
    const result = await deleteReserva(reservaId)
    if (!result.error) {
      setReservas(prev => prev.filter(r => r.id !== reservaId))
      setCalendarReservas(prev => prev.filter(r => r.id !== reservaId))
      fetchSalas()
    }
    setDeletingReservaId(null)
  }

  return (
    <>
      {reservaView2 === 'upcoming' && (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-10">
            {loadingReservas ? <SkeletonSummaryCard /> : (
              <div className="bg-surface-container-lowest rounded-xl p-5 border border-outline-variant/25 card-lift flex items-start gap-4" data-anim>
                <div className="bg-primary/10 text-primary size-10 rounded-lg flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>event_available</span>
                </div>
                <div>
                  <p className="font-label text-xs uppercase tracking-widest text-on-surface-variant mb-1">Próxima Reserva</p>
                  {proximaReserva ? (
                    <>
                      <p className="font-body font-semibold text-on-surface text-sm leading-snug">
                        {proximaReserva.salas?.nombre}, {formatFecha(proximaReserva.fecha)}, {formatHora(proximaReserva.hora_inicio)}
                      </p>
                      <p className="font-body text-xs text-secondary mt-0.5">{proximaReserva.titulo}</p>
                    </>
                  ) : <p className="font-body font-semibold text-on-surface-variant text-sm">Sin reservas próximas</p>}
                </div>
              </div>
            )}
            {loadingSalas ? <SkeletonSummaryCard /> : (
              <div className="bg-surface-container-lowest rounded-xl p-5 border border-outline-variant/25 card-lift flex items-start gap-4" data-anim>
                <div className="bg-primary/10 text-primary size-10 rounded-lg flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>meeting_room</span>
                </div>
                <div>
                  <p className="font-label text-xs uppercase tracking-widest text-on-surface-variant mb-1">Salas Disponibles</p>
                  <p className="font-body font-semibold text-on-surface text-sm leading-snug">{salasCount} {salasCount === 1 ? 'sala libre' : 'salas libres'} ahora</p>
                  <p className="font-body text-xs text-secondary mt-0.5">{salas.slice(0, 2).map(s => s.nombre).join(', ')}{salas.length > 2 ? ` +${salas.length - 2} más` : ''}</p>
                </div>
              </div>
            )}
            <div className="bg-surface-container-lowest rounded-xl p-5 border border-outline-variant/25 card-lift flex items-start gap-4" data-anim>
              <div className="bg-primary/10 text-primary size-10 rounded-lg flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>{isAdmin ? 'shield_person' : 'account_circle'}</span>
              </div>
              <div>
                <p className="font-label text-xs uppercase tracking-widest text-on-surface-variant mb-1">Tu Rol</p>
                <p className="font-body font-semibold text-on-surface text-sm leading-snug capitalize">{isAdmin ? 'Administrador' : 'Usuario'}</p>
                <p className="font-body text-xs text-secondary mt-0.5">{isAdmin ? 'Acceso total al sistema' : 'Acceso estándar'}</p>
              </div>
            </div>
          </div>

          {/* Header toolbar */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6">
            <div />
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-0.5 bg-surface-container rounded-xl p-1 border border-outline-variant/20">
                <button type="button" onClick={() => setReservaView2('upcoming')} title="Próximas reservas"
                  className={`flex items-center gap-1.5 px-3 h-8 rounded-lg transition-all font-label text-xs font-medium ${reservaView2 === 'upcoming' ? 'bg-primary text-on-primary shadow-sm' : 'text-on-surface-variant hover:bg-surface-container-high'}`}>
                  <span className="material-symbols-outlined text-[16px]">upcoming</span>Próximas
                </button>
                <button type="button" onClick={() => { setReservaView2('history'); loadHistorialReservas() }} title="Historial de reservas"
                  className={`flex items-center gap-1.5 px-3 h-8 rounded-lg transition-all font-label text-xs font-medium ${reservaView2 === 'history' ? 'bg-primary text-on-primary shadow-sm' : 'text-on-surface-variant hover:bg-surface-container-high'}`}>
                  <span className="material-symbols-outlined text-[16px]">history</span>Historial
                </button>
              </div>
              {reservaView2 === 'upcoming' && (
                <div className="flex items-center gap-0.5 bg-surface-container rounded-xl p-1 border border-outline-variant/20">
                  <button type="button" onClick={() => setReservaView('list')} title="Vista lista"
                    className={`size-8 rounded-lg flex items-center justify-center transition-all ${reservaView === 'list' ? 'bg-primary text-on-primary shadow-sm' : 'text-on-surface-variant hover:bg-surface-container-high'}`}>
                    <span className="material-symbols-outlined text-[18px]">view_list</span>
                  </button>
                  <button type="button" onClick={() => setReservaView('calendar')} title="Vista calendario"
                    className={`size-8 rounded-lg flex items-center justify-center transition-all ${reservaView === 'calendar' ? 'bg-primary text-on-primary shadow-sm' : 'text-on-surface-variant hover:bg-surface-container-high'}`}>
                    <span className="material-symbols-outlined text-[18px]">calendar_month</span>
                  </button>
                </div>
              )}
              <button type="button" onClick={handleNuevaReserva}
                className="btn-press inline-flex items-center gap-2 bg-primary text-on-primary px-5 py-2.5 rounded-lg font-label font-medium text-sm shadow-sm hover:shadow-md hover:brightness-105 transition-all duration-200">
                <span className="material-symbols-outlined text-[20px]">add</span>Nueva Reserva
              </button>
            </div>
          </div>

          {/* Calendar view */}
          {reservaView === 'calendar' && (
            <ReservasCalendar
              reservas={calendarReservas} loading={loadingCalendar}
              onNewReserva={(fecha) => { if (!FEATURES.reservations) { onShowComingSoon(); return }; openModal(undefined, fecha) }}
              onEditReserva={handleEditReserva} onCancelReserva={handleCancelReserva} onDeleteReserva={handleDeleteReserva}
              cancelingId={cancelingReservaId} deletingId={deletingReservaId}
            />
          )}

          {/* List view */}
          {reservaView === 'list' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-headline text-xl font-semibold text-on-surface">Mis próximas reservas</h3>
                  <button type="button" onClick={() => {}} className="font-label text-sm font-medium text-secondary hover:text-primary transition-colors">Ver todas</button>
                </div>
                <div className="bg-surface-container-low rounded-xl p-6 space-y-4">
                  {loadingReservas ? (
                    <><SkeletonReservationCard /><SkeletonReservationCard /></>
                  ) : reservas.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-10 text-center gap-3">
                      <div className="size-14 rounded-full bg-surface-container flex items-center justify-center">
                        <span className="material-symbols-outlined text-on-surface-variant text-3xl">event_busy</span>
                      </div>
                      <div>
                        <p className="font-body font-semibold text-on-surface text-sm">Sin reservas próximas</p>
                        <p className="font-body text-xs text-secondary mt-1">Crea una nueva reserva para comenzar</p>
                      </div>
                      <button type="button" onClick={handleNuevaReserva} className="font-label text-sm font-medium text-primary hover:underline">+ Nueva Reserva</button>
                    </div>
                  ) : (
                    reservas.map((reserva, idx) => {
                      const style = CARD_STYLES[idx % CARD_STYLES.length]
                      return (
                        <div key={reserva.id} className="bg-surface-container-lowest rounded-xl border border-outline-variant/20 p-4 hover:border-outline-variant/40 hover:shadow-sm transition-all duration-150 flex flex-col sm:flex-row sm:items-center justify-between gap-4 group">
                          <div className="flex items-start gap-4">
                            <div className={`${style.bg} ${style.text} size-12 rounded-lg flex items-center justify-center shrink-0`}>
                              <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>{style.icon}</span>
                            </div>
                            <div>
                              <h4 className="font-headline font-semibold text-on-surface text-base">{reserva.titulo}</h4>
                              <p className="font-mono text-xs text-on-surface-variant flex items-center gap-1 mt-1">
                                <span className="material-symbols-outlined text-[16px]">schedule</span>
                                {formatFecha(reserva.fecha)}, {formatHora(reserva.hora_inicio)}&ndash;{formatHora(reserva.hora_fin)}
                              </p>
                            </div>
                          </div>
                          <div className="flex flex-col sm:items-end gap-2">
                            <span className="bg-surface-container px-3 py-1 rounded-full text-xs font-label font-semibold uppercase tracking-wider text-on-surface-variant">{reserva.salas?.nombre ?? 'Sala desconocida'}</span>
                            <span className={`px-2.5 py-0.5 rounded-full text-xs font-label font-bold ${reserva.estado === 'confirmada' ? 'bg-emerald-100 text-emerald-700' : reserva.estado === 'cancelada' ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-700'}`}>{reserva.estado}</span>
                            <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button type="button" onClick={() => handleEditReserva(reserva)} className="font-label text-xs text-primary font-medium hover:underline">Editar</button>
                              <span className="text-outline-variant/50">·</span>
                              <button type="button" onClick={() => handleCancelReserva(reserva.id)} disabled={cancelingReservaId === reserva.id} className="font-label text-xs text-error font-medium hover:underline disabled:opacity-50">{cancelingReservaId === reserva.id ? '…' : 'Cancelar'}</button>
                              <span className="text-outline-variant/50">·</span>
                              <button type="button" onClick={() => handleDeleteReserva(reserva.id)} disabled={deletingReservaId === reserva.id} className="font-label text-xs text-on-surface-variant font-medium hover:underline disabled:opacity-50">{deletingReservaId === reserva.id ? '…' : 'Eliminar'}</button>
                            </div>
                          </div>
                        </div>
                      )
                    })
                  )}
                </div>
              </div>

              {/* Salas disponibles mini-list */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-headline text-xl font-semibold text-on-surface">Salas disponibles</h3>
                  <span className="bg-tertiary-container text-on-tertiary-container text-[10px] font-label font-semibold px-2 py-1 rounded uppercase tracking-wider">AHORA</span>
                </div>
                <div className="bg-surface-container-low rounded-xl p-6 space-y-4">
                  {loadingSalas ? (
                    <><SkeletonRoomCard /><SkeletonRoomCard /></>
                  ) : salas.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 text-center gap-2">
                      <span className="material-symbols-outlined text-on-surface-variant text-3xl">meeting_room</span>
                      <p className="font-body text-sm text-on-surface-variant">No hay salas disponibles ahora</p>
                    </div>
                  ) : (
                    <>
                      {salas.slice(0, 3).map((sala, idx) => (
                        <div key={sala.id} className="bg-surface-container-lowest rounded-xl overflow-hidden border border-outline-variant/15 shadow-sm hover:shadow-md transition-all group cursor-pointer flex items-center gap-4 pr-4">
                          <Image src={sala.imagen_url || getRoomImage(idx)} alt={sala.nombre} width={80} height={96} className="object-cover" unoptimized />
                          <div className="flex-1 py-3">
                            <div className="flex justify-between items-start mb-1">
                              <h4 className="font-headline font-semibold text-on-surface text-sm">{sala.nombre}</h4>
                              <div className={`size-2.5 rounded-full ${sala.estado === 'disponible' ? 'bg-[#10b981] shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-red-500'}`} />
                            </div>
                            <p className="font-body text-xs text-secondary mb-2 flex items-center gap-1"><span className="material-symbols-outlined text-[14px]">group</span> {sala.capacidad} pers.</p>
                            <button type="button" onClick={() => onPreviewSala(sala)} className="font-label text-xs font-semibold text-primary hover:underline">Reservar Rápido</button>
                          </div>
                        </div>
                      ))}
                      <div className="pt-1 text-center">
                        <button type="button" className="font-label text-sm font-medium text-primary hover:text-primary-container transition-colors flex items-center justify-center gap-1 w-full">
                          Ver mapa de planta<span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* ── Historial de reservas ────────────────────────────────── */}
      {reservaView2 === 'history' && (
        <div className="space-y-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="flex items-center gap-0.5 bg-surface-container rounded-xl p-1 border border-outline-variant/20">
              <button type="button" onClick={() => setReservaView2('upcoming')}
                className="flex items-center gap-1.5 px-3 h-8 rounded-lg transition-all font-label text-xs font-medium text-on-surface-variant hover:bg-surface-container-high">
                <span className="material-symbols-outlined text-[16px]">upcoming</span>Próximas
              </button>
              <button type="button" onClick={() => { setReservaView2('history'); loadHistorialReservas() }}
                className="flex items-center gap-1.5 px-3 h-8 rounded-lg transition-all font-label text-xs font-medium bg-primary text-on-primary shadow-sm">
                <span className="material-symbols-outlined text-[16px]">history</span>Historial
              </button>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-[18px] pointer-events-none">search</span>
              <input aria-label="Buscar reservas" type="text" placeholder="Buscar por título o sala…" value={historialSearch}
                onChange={e => { setHistorialSearch(e.target.value); setHistorialPage(1) }}
                className="w-full pl-9 pr-4 py-2 rounded-lg border border-outline-variant/40 bg-surface-container-lowest font-body text-sm text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/40"
              />
            </div>
            <div className="flex gap-1 bg-surface-container rounded-xl p-1 border border-outline-variant/20 shrink-0">
              {(['todos', 'confirmada', 'pendiente', 'cancelada'] as const).map(est => (
                <button type="button" key={est} onClick={() => { setHistorialEstadoFilter(est); setHistorialPage(1) }}
                  className={`px-3 py-1.5 rounded-lg font-label text-xs font-medium capitalize transition-all ${historialEstadoFilter === est ? 'bg-primary text-on-primary shadow-sm' : 'text-on-surface-variant hover:bg-surface-container-high'}`}>
                  {est === 'todos' ? 'Todos' : est}
                </button>
              ))}
            </div>
          </div>
          {loadingHistorialReservas ? (
            <div className="space-y-3">{[0,1,2,3].map(i => <div key={i} className="h-20 bg-surface-container rounded-xl animate-pulse" />)}</div>
          ) : (() => {
            const q = historialSearch.toLowerCase()
            const filtered = reservasHistorial.filter(r => {
              const matchSearch = !q || r.titulo.toLowerCase().includes(q) || (r.sala_nombre ?? '').toLowerCase().includes(q)
              const matchEstado = historialEstadoFilter === 'todos' || r.estado === historialEstadoFilter
              return matchSearch && matchEstado
            })
            const total = filtered.length
            const pages = Math.ceil(total / HISTORIAL_PAGE_SIZE)
            const page = filtered.slice((historialPage - 1) * HISTORIAL_PAGE_SIZE, historialPage * HISTORIAL_PAGE_SIZE)
            if (filtered.length === 0) return (
              <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
                <div className="size-14 rounded-full bg-surface-container flex items-center justify-center">
                  <span className="material-symbols-outlined text-on-surface-variant text-3xl">history</span>
                </div>
                <p className="font-body font-semibold text-on-surface text-sm">{reservasHistorial.length === 0 ? 'No tienes reservas aún' : 'Sin resultados para esta búsqueda'}</p>
                <p className="font-body text-xs text-on-surface-variant">{reservasHistorial.length === 0 ? 'Tus reservas pasadas y activas aparecerán aquí' : 'Prueba con otro término o filtro'}</p>
              </div>
            )
            return (
              <div className="space-y-3">
                {page.map(r => {
                  const { dateStr: todayStr } = getBogotaNow()
                  const isPast = r.fecha < todayStr
                  return (
                    <div key={r.id} className="bg-surface-container-lowest rounded-xl border border-outline-variant/20 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-outline-variant/40 hover:shadow-sm transition-all">
                      <div className="flex items-start gap-4">
                        <div className={`size-10 rounded-lg flex items-center justify-center shrink-0 ${r.estado === 'cancelada' ? 'bg-red-100 text-red-500' : isPast ? 'bg-surface-container text-on-surface-variant' : 'bg-primary/10 text-primary'}`}>
                          <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>{r.estado === 'cancelada' ? 'event_busy' : isPast ? 'event_available' : 'pending_actions'}</span>
                        </div>
                        <div className="min-w-0">
                          <h4 className="font-headline font-semibold text-on-surface text-sm leading-snug truncate">{r.titulo}</h4>
                          {r.sala_nombre && (
                            <p className="font-body text-xs text-on-surface-variant mt-0.5">
                              <span className="material-symbols-outlined text-[13px] align-middle mr-0.5">meeting_room</span>
                              {r.sala_nombre}{r.sala_ubicacion ? ` · ${r.sala_ubicacion}` : ''}
                            </p>
                          )}
                          <p className="font-mono text-[11px] text-on-surface-variant mt-0.5">{formatFecha(r.fecha)} · {formatHora(r.hora_inicio)}–{formatHora(r.hora_fin)}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <span className={`px-2.5 py-1 rounded-full text-[11px] font-label font-bold uppercase tracking-wide ${r.estado === 'confirmada' ? 'bg-emerald-100 text-emerald-700' : r.estado === 'cancelada' ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-700'}`}>{r.estado}</span>
                        {isPast && r.estado !== 'cancelada' && <span className="bg-surface-container text-on-surface-variant text-[10px] font-label font-medium px-2 py-0.5 rounded-full uppercase tracking-wide">Pasada</span>}
                      </div>
                    </div>
                  )
                })}
                {pages > 1 && (
                  <div className="flex items-center justify-between pt-2">
                    <span className="font-body text-xs text-on-surface-variant">{total} reservas · página {historialPage} de {pages}</span>
                    <div className="flex gap-2">
                      <button type="button" onClick={() => setHistorialPage(p => Math.max(1, p - 1))} disabled={historialPage === 1} className="px-3 py-1.5 rounded-lg border border-outline-variant/40 font-label text-xs text-on-surface hover:bg-surface-container disabled:opacity-40 transition-all">Anterior</button>
                      <button type="button" onClick={() => setHistorialPage(p => Math.min(pages, p + 1))} disabled={historialPage === pages} className="px-3 py-1.5 rounded-lg border border-outline-variant/40 font-label text-xs text-on-surface hover:bg-surface-container disabled:opacity-40 transition-all">Siguiente</button>
                    </div>
                  </div>
                )}
              </div>
            )
          })()}
        </div>
      )}

      {/* ══ MODAL: NUEVA RESERVA ══════════════════════════════════ */}
      {modalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" onClick={() => { if (!submitting) { setModalOpen(false); setEditingReservaId(null) } }} />
          <div className="relative w-full max-w-xl bg-surface rounded-2xl shadow-2xl border border-outline-variant/20 flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between px-6 py-5 border-b border-outline-variant/15">
              <div className="flex items-center gap-3">
                <div className="bg-primary-container text-on-primary size-9 rounded-lg flex items-center justify-center">
                  <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>event_available</span>
                </div>
                <h2 className="font-headline text-lg font-semibold text-on-surface">{editingReservaId ? 'Editar Reserva' : 'Nueva Reserva'}</h2>
              </div>
              <button type="button" onClick={() => { if (!submitting) { setModalOpen(false); setEditingReservaId(null) } }} className="p-1.5 rounded-lg hover:bg-surface-container transition-colors text-on-surface-variant" aria-label="Cerrar">
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>
            <form onSubmit={handleSubmitReserva} className="px-6 py-5 space-y-4 overflow-y-auto flex-1">
              <div>
                <label className="font-label text-xs uppercase tracking-widest text-on-surface-variant block mb-1.5">Título *</label>
                <input aria-label="Título de la reserva" type="text" value={form.titulo} onChange={e => setForm({ ...form, titulo: e.target.value })} placeholder="Ej: Reunión de equipo Q3" className="w-full rounded-lg border border-outline-variant/40 bg-surface-container-lowest px-3 py-2.5 text-sm font-body text-on-surface placeholder:text-on-surface-variant/60 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition" disabled={submitting} />
              </div>
              <div>
                <label className="font-label text-xs uppercase tracking-widest text-on-surface-variant block mb-1.5">Sala *</label>
                <select value={form.sala_id} onChange={e => setForm({ ...form, sala_id: e.target.value })} className="w-full rounded-lg border border-outline-variant/40 bg-surface-container-lowest px-3 py-2.5 text-sm font-body text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition appearance-none" disabled={submitting || loadingSalas}>
                  <option value="">Selecciona una sala…</option>
                  {salas.map(s => (
                    <option key={s.id} value={s.id} disabled={s.estado === 'mantenimiento'}>
                      {s.nombre} (cap. {s.capacidad}){s.estado === 'mantenimiento' ? ' (mantenimiento)' : s.disponibilidad === 'ocupada_total' ? ' (sin disponibilidad hoy)' : s.disponibilidad === 'parcial' ? ' (parcialmente ocupada hoy)' : ''}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="font-label text-xs uppercase tracking-widest text-on-surface-variant block mb-1.5">Fecha *</label>
                <input aria-label="Fecha de la reserva" type="date" value={form.fecha} min={getBogotaNow().dateStr}
                  onChange={e => {
                    const newFecha = e.target.value
                    const { dateStr: localToday } = getBogotaNow()
                    if (newFecha === localToday) setForm(f => ({ ...f, fecha: newFecha, hora_inicio: '', hora_fin: '' }))
                    else setForm(f => ({ ...f, fecha: newFecha }))
                    setDuracionPreset('libre')
                  }}
                  className="w-full rounded-lg border border-outline-variant/40 bg-surface-container-lowest px-3 py-2.5 text-sm font-body text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition" disabled={submitting}
                />
              </div>
              {form.fecha && (
                form.sala_id ? (
                  <AvailabilityTimeline
                    franjas={modalFranjas} horaInicio={form.hora_inicio || undefined} horaFin={form.hora_fin || undefined} loading={loadingFranjas}
                    onSelectWindow={(inicio, fin) => {
                      setForm(f => {
                        const next = { ...f, hora_inicio: inicio }
                        if (duracionPreset !== 'libre' && duracionPreset !== 'dia' && typeof duracionPreset === 'number') {
                          const calculated = addHoras(inicio, duracionPreset)
                          next.hora_fin = calculated <= fin ? calculated : fin
                        } else { next.hora_fin = fin }
                        return next
                      })
                    }}
                  />
                ) : (
                  <div className="rounded-xl border border-outline-variant/20 bg-surface-container-lowest px-4 py-3 flex items-center gap-3 text-sm font-body text-on-surface-variant">
                    <span className="material-symbols-outlined text-[20px] text-outline shrink-0">schedule</span>
                    <span>Selecciona una sala para ver su disponibilidad</span>
                  </div>
                )
              )}
              <div>
                <label className="font-label text-xs uppercase tracking-widest text-on-surface-variant block mb-1.5">Duración</label>
                <div className="flex flex-wrap gap-2">
                  {([0.5, 1, 2, 4, 6, 8] as const).map(h => (
                    <button key={h} type="button" disabled={submitting}
                      onClick={() => { setDuracionPreset(h); if (form.hora_inicio) setForm(f => ({ ...f, hora_fin: addHoras(f.hora_inicio, h) })) }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-label font-medium border transition-colors ${duracionPreset === h ? 'bg-primary text-on-primary border-primary' : 'border-outline-variant/40 text-on-surface hover:bg-surface-container'}`}>
                      {h === 0.5 ? '30 min' : h === 1 ? '1 h' : `${h} h`}
                    </button>
                  ))}
                  <button type="button" disabled={submitting} onClick={() => { setDuracionPreset('dia'); setForm(f => ({ ...f, hora_inicio: '00:00', hora_fin: '23:59' })) }} className={`px-3 py-1.5 rounded-lg text-xs font-label font-medium border transition-colors ${duracionPreset === 'dia' ? 'bg-primary text-on-primary border-primary' : 'border-outline-variant/40 text-on-surface hover:bg-surface-container'}`}>Día completo</button>
                  <button type="button" disabled={submitting} onClick={() => setDuracionPreset('libre')} className={`px-3 py-1.5 rounded-lg text-xs font-label font-medium border transition-colors ${duracionPreset === 'libre' ? 'bg-primary text-on-primary border-primary' : 'border-outline-variant/40 text-on-surface hover:bg-surface-container'}`}>Libre</button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-label text-xs uppercase tracking-widest text-on-surface-variant block mb-1.5">Hora inicio *</label>
                  <input aria-label="Hora de inicio" type="time" value={form.hora_inicio}
                    min={(() => { const { dateStr: localToday, timeStr } = getBogotaNow(); return form.fecha === localToday ? timeStr : undefined })()}
                    onChange={e => {
                      const inicio = e.target.value
                      setForm(f => {
                        const next = { ...f, hora_inicio: inicio }
                        if (duracionPreset !== 'libre' && duracionPreset !== 'dia' && inicio) next.hora_fin = addHoras(inicio, duracionPreset as number)
                        else if (duracionPreset === 'dia') { next.hora_inicio = '00:00'; next.hora_fin = '23:59' }
                        return next
                      })
                    }}
                    className="w-full rounded-lg border border-outline-variant/40 bg-surface-container-lowest px-3 py-2.5 text-sm font-body text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition" disabled={submitting}
                  />
                </div>
                <div>
                  <label className="font-label text-xs uppercase tracking-widest text-on-surface-variant block mb-1.5">Hora fin *</label>
                  <input aria-label="Hora de fin" type="time" value={form.hora_fin}
                    onChange={e => {
                      const fin = e.target.value
                      setForm(f => {
                        if (f.hora_inicio && fin > f.hora_inicio) {
                          const diff = diffHoras(f.hora_inicio, fin)
                          const isFullDay = f.hora_inicio === '00:00' && fin === '23:59'
                          if (isFullDay) setDuracionPreset('dia')
                          else { const match = ([0.5, 1, 2, 4, 6, 8] as number[]).find(h => Math.abs(h - diff) < 0.1); setDuracionPreset(match ?? 'libre') }
                        } else { setDuracionPreset('libre') }
                        return { ...f, hora_fin: fin }
                      })
                    }}
                    className={`w-full rounded-lg border bg-surface-container-lowest px-3 py-2.5 text-sm font-body text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition ${form.hora_fin && form.hora_inicio && form.hora_fin <= form.hora_inicio ? 'border-red-400 bg-red-50/40' : 'border-outline-variant/40'}`}
                    disabled={submitting}
                  />
                </div>
              </div>
              {form.hora_inicio && form.hora_fin && form.hora_fin > form.hora_inicio && (
                <div className="flex items-center gap-2 text-xs font-body text-on-surface-variant bg-surface-container rounded-lg px-3 py-2">
                  <span className="material-symbols-outlined text-[15px] text-primary">schedule</span>
                  <span>Duración: <strong className="text-on-surface">{formatDuracion(diffHoras(form.hora_inicio, form.hora_fin))}</strong></span>
                  <span className="mx-1 text-outline-variant">·</span>
                  <span>{form.hora_inicio} → {form.hora_fin}</span>
                </div>
              )}
              {form.hora_fin && form.hora_inicio && form.hora_fin <= form.hora_inicio && (
                <p className="text-xs text-red-500 font-body flex items-center gap-1"><span className="material-symbols-outlined text-[14px]">error</span>La hora de fin debe ser posterior a la de inicio.</p>
              )}
              {modalError && (
                <div className="flex items-start gap-2 bg-error-container text-on-error-container rounded-lg px-4 py-3 text-sm font-body">
                  <span className="material-symbols-outlined text-[18px] shrink-0 mt-0.5">error</span>{modalError}
                </div>
              )}
              {modalSuccess && (
                <div className="flex items-start gap-3 bg-green-50 border border-green-200 rounded-xl px-4 py-3">
                  <span className="material-symbols-outlined text-[22px] text-green-500 shrink-0 mt-0.5" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                  <div>
                    <p className="font-label text-sm font-semibold text-green-800">¡Reserva {editingReservaId ? 'actualizada' : 'creada'} con éxito!</p>
                    <p className="font-body text-xs text-green-700 mt-0.5">Tu reserva ha sido confirmada correctamente.</p>
                  </div>
                </div>
              )}
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => { if (!submitting) { setModalOpen(false); setEditingReservaId(null) } }} disabled={submitting} className="flex-1 py-2.5 rounded-lg border border-outline-variant/40 text-on-surface font-label text-sm font-medium hover:bg-surface-container transition-colors disabled:opacity-50">Cancelar</button>
                <button type="submit" disabled={submitting || modalSuccess} className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg bg-primary text-on-primary font-label text-sm font-medium hover:brightness-105 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed">
                  {submitting ? (
                    <><span className="size-4 animate-spin rounded-full border-2 border-on-primary border-t-transparent" />Guardando…</>
                  ) : (
                    <><span className="material-symbols-outlined text-[18px]">{editingReservaId ? 'save' : 'add'}</span>{editingReservaId ? 'Guardar Cambios' : 'Confirmar'}</>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
