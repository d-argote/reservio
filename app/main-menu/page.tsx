'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'

// ── Types ─────────────────────────────────────────────────────────

interface UserProfile {
  nombre: string
  rol: string
}

interface Sala {
  id: string
  nombre: string
  descripcion: string | null
  capacidad: number
  ubicacion: string | null
  imagen_url: string | null
  estado: 'disponible' | 'ocupada' | 'mantenimiento'
}

interface Reserva {
  id: string
  titulo: string
  fecha: string       // 'YYYY-MM-DD'
  hora_inicio: string // 'HH:MM:SS'
  hora_fin: string    // 'HH:MM:SS'
  estado: 'pendiente' | 'confirmada' | 'cancelada'
  salas: Pick<Sala, 'id' | 'nombre' | 'capacidad' | 'ubicacion'> | null
}

type ActiveTab = 'reservations' | 'rooms' | 'profile'

interface ReservaForm {
  titulo: string
  sala_id: string
  fecha: string
  hora_inicio: string
  hora_fin: string
}

const EMPTY_FORM: ReservaForm = {
  titulo: '',
  sala_id: '',
  fecha: '',
  hora_inicio: '',
  hora_fin: '',
}

// ── Helpers ────────────────────────────────────────────────────────

function formatFecha(fechaStr: string): string {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today)
  tomorrow.setDate(today.getDate() + 1)
  // Parse as local date to avoid timezone shifts
  const [y, m, d] = fechaStr.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  if (date.getTime() === today.getTime()) return 'Hoy'
  if (date.getTime() === tomorrow.getTime()) return 'Mañana'
  return date.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' })
}

function formatHora(hora: string): string {
  return hora.slice(0, 5)
}

const CARD_STYLES = [
  { bg: 'bg-primary-container',   text: 'text-on-primary',                icon: 'groups'     },
  { bg: 'bg-secondary-container', text: 'text-on-secondary-container',    icon: 'videocam'   },
  { bg: 'bg-tertiary-fixed',      text: 'text-on-tertiary-fixed',         icon: 'laptop_mac' },
]

// ── Skeleton Components ────────────────────────────────────────────

function SkeletonSummaryCard() {
  return (
    <div className="bg-surface-container-lowest rounded-xl p-5 border border-outline-variant/20 shadow-sm flex items-start gap-4 animate-pulse">
      <div className="w-11 h-11 rounded-lg bg-surface-container shrink-0" />
      <div className="flex-1 space-y-2 pt-1">
        <div className="h-3 bg-surface-container rounded w-2/5" />
        <div className="h-4 bg-surface-container rounded w-3/4" />
        <div className="h-3 bg-surface-container rounded w-1/2" />
      </div>
    </div>
  )
}

function SkeletonReservationCard() {
  return (
    <div className="bg-surface-container-lowest rounded-lg p-5 border border-outline-variant/15 shadow-sm animate-pulse">
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-lg bg-surface-container shrink-0" />
        <div className="flex-1 space-y-2 pt-1">
          <div className="h-4 bg-surface-container rounded w-3/4" />
          <div className="h-3 bg-surface-container rounded w-1/2" />
        </div>
        <div className="hidden sm:flex flex-col items-end gap-2">
          <div className="h-6 bg-surface-container rounded w-32" />
        </div>
      </div>
    </div>
  )
}

function SkeletonRoomCard() {
  return (
    <div className="bg-surface-container-lowest rounded-lg p-4 border border-outline-variant/15 shadow-sm animate-pulse">
      <div className="flex justify-between mb-3">
        <div className="space-y-1.5">
          <div className="h-4 bg-surface-container rounded w-32" />
          <div className="h-3 bg-surface-container rounded w-20" />
        </div>
        <div className="w-2.5 h-2.5 rounded-full bg-surface-container mt-1" />
      </div>
      <div className="h-8 bg-surface-container rounded" />
    </div>
  )
}

export default function MainMenuPage() {
  const router = useRouter()

  // ── Auth state ────────────────────────────────────────────────────
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // ── Data state ────────────────────────────────────────────────────
  const [reservas, setReservas] = useState<Reserva[]>([])
  const [salas, setSalas] = useState<Sala[]>([])
  const [loadingReservas, setLoadingReservas] = useState(true)
  const [loadingSalas, setLoadingSalas] = useState(true)

  // ── UI state ──────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<ActiveTab>('reservations')
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  // ── Modal state ───────────────────────────────────────────────────
  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState<ReservaForm>(EMPTY_FORM)
  const [submitting, setSubmitting] = useState(false)
  const [modalError, setModalError] = useState<string | null>(null)
  const [modalSuccess, setModalSuccess] = useState(false)

  useEffect(() => {
    const fetchReservas = async (userId: string) => {
      const todayStr = new Date().toISOString().split('T')[0]
      const { data } = await supabase
        .from('reservas')
        .select('id, titulo, fecha, hora_inicio, hora_fin, estado, salas(id, nombre, capacidad, ubicacion)')
        .eq('usuario_id', userId)
        .gte('fecha', todayStr)
        .in('estado', ['pendiente', 'confirmada'])
        .order('fecha',       { ascending: true })
        .order('hora_inicio', { ascending: true })
        .limit(3)
      if (data) setReservas(data as unknown as Reserva[])
      setLoadingReservas(false)
    }

    const init = async () => {
      // 1. Verificar sesión activa
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/login'); return }

      // 2. Cargar perfil y rol
      const nombre =
        session.user.user_metadata?.nombre ??
        session.user.email?.split('@')[0] ??
        'Usuario'

      let rol: string = session.user.user_metadata?.rol ?? 'usuario'

      const { data: userRecord } = await supabase
        .from('usuarios')
        .select('rol')
        .eq('id', session.user.id)
        .single()

      if (userRecord?.rol) rol = userRecord.rol as string

      setProfile({ nombre, rol })
      setIsLoading(false) // muestra el layout sin esperar los datos

      // 3. Fetch de datos en paralelo
      const userId = session.user.id

      const [, salasResult] = await Promise.allSettled([
        fetchReservas(userId),

        supabase
          .from('salas')
          .select('id, nombre, descripcion, capacidad, ubicacion, imagen_url, estado')
          .order('nombre'),
      ])

      if (salasResult.status === 'fulfilled' && salasResult.value.data) {
        setSalas(salasResult.value.data as Sala[])
      }
      setLoadingSalas(false)
    }

    init()
  }, [router])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const openModal = (salaId?: string) => {
    const todayStr = new Date().toISOString().split('T')[0]
    setForm({ ...EMPTY_FORM, fecha: todayStr, sala_id: salaId ?? '' })
    setModalError(null)
    setModalSuccess(false)
    setModalOpen(true)
  }

  const handleNuevaReserva = () => openModal()

  const handleReservarRapido = (salaId: string) => openModal(salaId)

  const handleSubmitReserva = async (e: React.FormEvent) => {
    e.preventDefault()
    setModalError(null)

    if (!form.titulo.trim())   { setModalError('El título es obligatorio.'); return }
    if (!form.sala_id)         { setModalError('Selecciona una sala.'); return }
    if (!form.fecha)           { setModalError('Selecciona una fecha.'); return }
    if (!form.hora_inicio)     { setModalError('Indica la hora de inicio.'); return }
    if (!form.hora_fin)        { setModalError('Indica la hora de fin.'); return }
    if (form.hora_fin <= form.hora_inicio) {
      setModalError('La hora de fin debe ser posterior a la de inicio.')
      return
    }

    setSubmitting(true)
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { router.push('/login'); return }

    const { error } = await supabase.from('reservas').insert({
      usuario_id:  session.user.id,
      sala_id:     form.sala_id,
      titulo:      form.titulo.trim(),
      fecha:       form.fecha,
      hora_inicio: form.hora_inicio,
      hora_fin:    form.hora_fin,
      estado:      'confirmada',
    })

    setSubmitting(false)

    if (error) {
      setModalError('No se pudo crear la reserva. Verifica los datos e inténtalo de nuevo.')
      return
    }

    setModalSuccess(true)
    // Refrescar lista de reservas
    const todayStr = new Date().toISOString().split('T')[0]
    const { data } = await supabase
      .from('reservas')
      .select('id, titulo, fecha, hora_inicio, hora_fin, estado, salas(id, nombre, capacidad, ubicacion)')
      .eq('usuario_id', session.user.id)
      .gte('fecha', todayStr)
      .in('estado', ['pendiente', 'confirmada'])
      .order('fecha',       { ascending: true })
      .order('hora_inicio', { ascending: true })
      .limit(3)
    if (data) setReservas(data as unknown as Reserva[])

    setTimeout(() => {
      setModalOpen(false)
      setModalSuccess(false)
    }, 1200)
  }

  if (isLoading) {
    return (
      <div className="bg-surface flex h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="font-body text-on-surface-variant text-sm">Cargando tu espacio…</p>
        </div>
      </div>
    )
  }

  const isAdmin =
    profile?.rol === 'admin' ||
    profile?.rol === 'administrador' ||
    profile?.rol === 'administrator'

  // Datos derivados para las tarjetas de resumen
  const proximaReserva = reservas[0] ?? null
  const salasCount     = salas.length

  const navItems = [
    { id: 'reservations' as ActiveTab, label: 'Reservas', icon: 'event_available' },
    { id: 'rooms' as ActiveTab, label: 'Salas', icon: 'meeting_room' },
    { id: 'profile' as ActiveTab, label: 'Perfil', icon: 'account_circle' },
  ]

  return (
    <div className="bg-surface text-on-surface flex h-screen overflow-hidden">
      {/* ── Sidebar (desktop) ─────────────────────────────────── */}
      <nav className="bg-surface text-primary font-body hidden h-screen w-72 flex-col border-r border-outline-variant/20 fixed left-0 top-0 z-50 md:flex">
        {/* Brand */}
        <div className="px-8 py-8">
          <h1 className="font-headline text-2xl font-black text-primary mb-1">Reservio</h1>
          <p className="font-body text-secondary text-sm">Resource Management</p>
        </div>

        {/* Nav items */}
        <div className="flex flex-col gap-y-1 flex-grow overflow-y-auto pb-4 px-2">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium w-full text-left transition-all duration-200
                ${
                  activeTab === item.id
                    ? 'bg-surface-container-lowest text-primary font-bold shadow-sm scale-[1.01]'
                    : 'text-secondary hover:bg-surface-container-low hover:scale-[1.02] active:scale-[0.98]'
                }`}
            >
              <span
                className="material-symbols-outlined"
                style={
                  activeTab === item.id
                    ? { fontVariationSettings: "'FILL' 1" }
                    : undefined
                }
              >
                {item.icon}
              </span>
              <span>{item.label}</span>
            </button>
          ))}

          {/* Admin section */}
          {isAdmin && (
            <>
              <div className="h-px bg-outline-variant/30 my-3 mx-4" />
              <p className="font-label text-[10px] uppercase tracking-widest text-on-surface-variant px-4 mb-1">
                Administración
              </p>
              {[
                { label: 'Panel de Control', icon: 'admin_panel_settings' },
                { label: 'Gestionar Salas', icon: 'door_front' },
                { label: 'Equipos', icon: 'devices' },
                { label: 'Usuarios', icon: 'manage_accounts' },
                { label: 'Reportes', icon: 'bar_chart' },
              ].map((item) => (
                <button
                  key={item.label}
                  className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium w-full text-left text-secondary hover:bg-surface-container-low hover:scale-[1.02] active:scale-[0.98] transition-all duration-200"
                >
                  <span className="material-symbols-outlined text-[20px]">{item.icon}</span>
                  <span>{item.label}</span>
                </button>
              ))}
            </>
          )}
        </div>

        {/* Sign out */}
        <div className="p-6 mt-auto">
          <button
            onClick={handleSignOut}
            className="w-full flex items-center justify-center gap-2 bg-surface-container text-on-surface py-3 rounded-lg hover:bg-surface-container-high transition-colors text-sm font-medium font-label"
          >
            <span className="material-symbols-outlined text-lg">logout</span>
            Cerrar Sesión
          </button>
        </div>
      </nav>

      {/* ── Top app bar (mobile) ───────────────────────────────── */}
      <header className="md:hidden bg-surface-container-low fixed top-0 left-0 right-0 z-40 flex items-center justify-between px-6 h-16 shadow-sm">
        <span className="font-headline text-xl font-black text-primary tracking-wide">Reservio</span>
        <div className="flex items-center gap-2">
          <button className="p-2 rounded-full hover:bg-surface-container transition-colors">
            <span className="material-symbols-outlined text-on-surface-variant">notifications</span>
          </button>
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-full hover:bg-surface-container transition-colors"
          >
            <span className="material-symbols-outlined text-on-surface-variant">
              {mobileMenuOpen ? 'close' : 'menu'}
            </span>
          </button>
        </div>
      </header>

      {/* Mobile slide-over menu */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-50">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="absolute left-0 top-0 bottom-0 w-72 bg-surface flex flex-col shadow-xl">
            <div className="px-8 py-8 pt-20">
              <h1 className="font-headline text-2xl font-black text-primary mb-1">Reservio</h1>
              <p className="font-body text-secondary text-sm">Resource Management</p>
            </div>
            <div className="flex flex-col gap-y-1 flex-grow overflow-y-auto pb-4 px-2">
              {navItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => { setActiveTab(item.id); setMobileMenuOpen(false) }}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium w-full text-left transition-all duration-200
                    ${activeTab === item.id
                      ? 'bg-surface-container-lowest text-primary font-bold shadow-sm'
                      : 'text-secondary hover:bg-surface-container-low'
                    }`}
                >
                  <span
                    className="material-symbols-outlined"
                    style={activeTab === item.id ? { fontVariationSettings: "'FILL' 1" } : undefined}
                  >
                    {item.icon}
                  </span>
                  <span>{item.label}</span>
                </button>
              ))}
              {isAdmin && (
                <>
                  <div className="h-px bg-outline-variant/30 my-3 mx-4" />
                  <p className="font-label text-[10px] uppercase tracking-widest text-on-surface-variant px-4 mb-1">
                    Administración
                  </p>
                  {[
                    { label: 'Panel de Control', icon: 'admin_panel_settings' },
                    { label: 'Gestionar Salas', icon: 'door_front' },
                    { label: 'Equipos', icon: 'devices' },
                    { label: 'Usuarios', icon: 'manage_accounts' },
                    { label: 'Reportes', icon: 'bar_chart' },
                  ].map((item) => (
                    <button
                      key={item.label}
                      className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium w-full text-left text-secondary hover:bg-surface-container-low transition-all duration-200"
                    >
                      <span className="material-symbols-outlined text-[20px]">{item.icon}</span>
                      <span>{item.label}</span>
                    </button>
                  ))}
                </>
              )}
            </div>
            <div className="p-6">
              <button
                onClick={handleSignOut}
                className="w-full flex items-center justify-center gap-2 bg-surface-container text-on-surface py-3 rounded-lg hover:bg-surface-container-high transition-colors text-sm font-medium font-label"
              >
                <span className="material-symbols-outlined text-lg">logout</span>
                Cerrar Sesión
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Main content ─────────────────────────────────────────── */}
      <main className="flex-1 ml-0 md:ml-72 pt-16 md:pt-0 bg-surface h-full overflow-y-auto">
        <div className="max-w-7xl mx-auto p-6 md:p-8 xl:p-12">

          {/* Welcome header — siempre visible */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
            <div>
              <h2 className="font-headline text-3xl md:text-4xl font-bold text-on-surface tracking-tight mb-2">
                {activeTab === 'reservations' && <>Hola, {profile?.nombre} 👋</>}
                {activeTab === 'rooms'        && 'Salas disponibles'}
                {activeTab === 'profile'      && 'Mi Perfil'}
              </h2>
              <p className="font-body text-lg text-secondary">
                {activeTab === 'reservations' && '¿Qué espacio necesitas hoy?'}
                {activeTab === 'rooms'        && 'Consulta disponibilidad y reserva en tiempo real.'}
                {activeTab === 'profile'      && 'Gestiona tus datos personales y preferencias.'}
              </p>
            </div>
            {activeTab === 'reservations' && (
              <button
                onClick={handleNuevaReserva}
                className="inline-flex items-center gap-2 bg-primary text-on-primary px-6 py-3 rounded-lg font-label font-medium text-sm shadow-md hover:bg-primary-container hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200"
              >
                <span className="material-symbols-outlined text-[20px]">add</span>
                Nueva Reserva
              </button>
            )}
            {activeTab === 'rooms' && (
              <button
                onClick={handleNuevaReserva}
                className="inline-flex items-center gap-2 bg-primary text-on-primary px-6 py-3 rounded-lg font-label font-medium text-sm shadow-md hover:bg-primary-container hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200"
              >
                <span className="material-symbols-outlined text-[20px]">add</span>
                Nueva Reserva
              </button>
            )}
          </div>

          {/* ══ TAB: RESERVATIONS ══════════════════════════════════ */}
          {activeTab === 'reservations' && (
            <>
          {/* Summary cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-10">

            {/* Card: próxima reserva */}
            {loadingReservas ? (
              <SkeletonSummaryCard />
            ) : (
              <div className="bg-surface-container-lowest rounded-xl p-5 border border-outline-variant/20 shadow-sm flex items-start gap-4">
                <div className="bg-primary-container text-on-primary w-11 h-11 rounded-lg flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>
                    event_available
                  </span>
                </div>
                <div>
                  <p className="font-label text-xs uppercase tracking-widest text-on-surface-variant mb-1">
                    Próxima Reserva
                  </p>
                  {proximaReserva ? (
                    <>
                      <p className="font-body font-semibold text-on-surface text-sm leading-snug">
                        {proximaReserva.salas?.nombre} — {formatFecha(proximaReserva.fecha)}, {formatHora(proximaReserva.hora_inicio)}
                      </p>
                      <p className="font-body text-xs text-secondary mt-0.5">{proximaReserva.titulo}</p>
                    </>
                  ) : (
                    <p className="font-body font-semibold text-on-surface-variant text-sm">Sin reservas próximas</p>
                  )}
                </div>
              </div>
            )}

            {/* Card: salas disponibles */}
            {loadingSalas ? (
              <SkeletonSummaryCard />
            ) : (
              <div className="bg-surface-container-lowest rounded-xl p-5 border border-outline-variant/20 shadow-sm flex items-start gap-4">
                <div className="bg-secondary-container text-on-secondary-container w-11 h-11 rounded-lg flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>
                    meeting_room
                  </span>
                </div>
                <div>
                  <p className="font-label text-xs uppercase tracking-widest text-on-surface-variant mb-1">
                    Salas Disponibles
                  </p>
                  <p className="font-body font-semibold text-on-surface text-sm leading-snug">
                    {salasCount} {salasCount === 1 ? 'sala libre' : 'salas libres'} ahora
                  </p>
                  <p className="font-body text-xs text-secondary mt-0.5">
                    {salas.slice(0, 2).map((s) => s.nombre).join(', ')}
                    {salas.length > 2 ? ` +${salas.length - 2} más` : ''}
                  </p>
                </div>
              </div>
            )}

            {/* Card: rol */}
            <div className="bg-surface-container-lowest rounded-xl p-5 border border-outline-variant/20 shadow-sm flex items-start gap-4">
              <div className="bg-tertiary-fixed text-on-tertiary-fixed w-11 h-11 rounded-lg flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>
                  {isAdmin ? 'shield_person' : 'account_circle'}
                </span>
              </div>
              <div>
                <p className="font-label text-xs uppercase tracking-widest text-on-surface-variant mb-1">
                  Tu Rol
                </p>
                <p className="font-body font-semibold text-on-surface text-sm leading-snug capitalize">
                  {isAdmin ? 'Administrador' : 'Usuario'}
                </p>
                <p className="font-body text-xs text-secondary mt-0.5">
                  {isAdmin ? 'Acceso total al sistema' : 'Acceso estándar'}
                </p>
              </div>
            </div>
          </div>

          {/* Bento grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

            {/* Mis próximas reservas (2 cols) */}
            <div className="lg:col-span-2 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-headline text-xl font-bold text-primary">Mis próximas reservas</h3>
                <a href="#" className="font-label text-sm font-medium text-secondary hover:text-primary transition-colors">
                  Ver todas
                </a>
              </div>

              <div className="bg-surface-container-low rounded-xl p-6 space-y-4">
                {loadingReservas ? (
                  <>
                    <SkeletonReservationCard />
                    <SkeletonReservationCard />
                  </>
                ) : reservas.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10 text-center gap-3">
                    <div className="w-14 h-14 rounded-full bg-surface-container flex items-center justify-center">
                      <span className="material-symbols-outlined text-on-surface-variant text-3xl">event_busy</span>
                    </div>
                    <div>
                      <p className="font-body font-semibold text-on-surface text-sm">Sin reservas próximas</p>
                      <p className="font-body text-xs text-secondary mt-1">Crea una nueva reserva para comenzar</p>
                    </div>
                    <button
                      onClick={handleNuevaReserva}
                      className="font-label text-sm font-medium text-primary hover:underline"
                    >
                      + Nueva Reserva
                    </button>
                  </div>
                ) : (
                  reservas.map((reserva, idx) => {
                    const style = CARD_STYLES[idx % CARD_STYLES.length]
                    return (
                      <div
                        key={reserva.id}
                        className="bg-surface-container-lowest rounded-lg p-5 border border-outline-variant/15 flex flex-col sm:flex-row sm:items-center justify-between gap-4 group hover:bg-surface-bright transition-colors shadow-sm"
                      >
                        <div className="flex items-start gap-4">
                          <div className={`${style.bg} ${style.text} w-12 h-12 rounded-lg flex items-center justify-center shrink-0`}>
                            <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>
                              {style.icon}
                            </span>
                          </div>
                          <div>
                            <h4 className="font-headline font-bold text-on-surface text-base">{reserva.titulo}</h4>
                            <p className="font-body text-sm text-secondary flex items-center gap-1 mt-1">
                              <span className="material-symbols-outlined text-[16px]">schedule</span>
                              {formatFecha(reserva.fecha)}, {formatHora(reserva.hora_inicio)} — {formatHora(reserva.hora_fin)}
                            </p>
                          </div>
                        </div>
                        <div className="flex flex-col sm:items-end gap-2">
                          <span className="bg-surface-container px-3 py-1 rounded text-xs font-label font-bold uppercase tracking-wider text-on-surface-variant">
                            {reserva.salas?.nombre ?? 'Sala desconocida'}
                          </span>
                          <button className="font-label text-sm text-primary font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                            Editar
                          </button>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            </div>

            {/* Salas disponibles (1 col) */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-headline text-xl font-bold text-primary">Salas disponibles</h3>
                <span className="bg-tertiary-container text-on-tertiary-container text-[10px] font-label font-bold px-2 py-1 rounded uppercase tracking-wider">
                  AHORA
                </span>
              </div>

              <div className="bg-surface-container-low rounded-xl p-6 space-y-4">
                {loadingSalas ? (
                  <>
                    <SkeletonRoomCard />
                    <SkeletonRoomCard />
                  </>
                ) : salas.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-center gap-2">
                    <span className="material-symbols-outlined text-on-surface-variant text-3xl">meeting_room</span>
                    <p className="font-body text-sm text-on-surface-variant">No hay salas disponibles ahora</p>
                  </div>
                ) : (
                  <>
                    {salas.slice(0, 3).map((sala) => (
                      <div key={sala.id} className="bg-surface-container-lowest rounded-lg p-4 border border-outline-variant/15 shadow-sm">
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <h4 className="font-body font-bold text-on-surface text-sm">{sala.nombre}</h4>
                            <p className="font-body text-xs text-secondary mt-0.5">Capacidad: {sala.capacidad} personas</p>
                          </div>
                          <div className="w-2.5 h-2.5 rounded-full bg-[#10b981] shadow-[0_0_8px_rgba(16,185,129,0.5)] mt-1" />
                        </div>
                        <button
                          onClick={() => handleReservarRapido(sala.id)}
                          className="w-full bg-surface-container text-on-surface font-label text-xs font-medium py-2 rounded hover:bg-surface-container-high transition-colors"
                        >
                          Reservar Rápido
                        </button>
                      </div>
                    ))}
                    <div className="pt-1 text-center">
                      <button className="font-label text-sm font-medium text-primary hover:text-primary-container transition-colors flex items-center justify-center gap-1 w-full">
                        Ver mapa de planta
                        <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
            </>
          )}

          {/* ══ TAB: ROOMS ═════════════════════════════════════════ */}
          {activeTab === 'rooms' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {loadingSalas ? (
                [0,1,2,3].map((i) => <SkeletonRoomCard key={i} />)
              ) : salas.length === 0 ? (
                <div className="col-span-full flex flex-col items-center justify-center py-20 text-center gap-3">
                  <span className="material-symbols-outlined text-on-surface-variant text-4xl">meeting_room</span>
                  <p className="font-body font-semibold text-on-surface">No hay salas disponibles en este momento</p>
                </div>
              ) : (
                salas.map((sala) => (
                  <div key={sala.id} className="bg-surface-container-lowest rounded-xl p-5 border border-outline-variant/20 shadow-sm flex flex-col gap-4">
                    <div className="flex justify-between items-start">
                      <div className="bg-secondary-container text-on-secondary-container w-12 h-12 rounded-lg flex items-center justify-center shrink-0">
                        <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>meeting_room</span>
                      </div>
                      <span className={`inline-flex items-center gap-1 text-xs font-label font-bold px-2 py-1 rounded uppercase tracking-wider ${
                        sala.estado === 'disponible'    ? 'bg-green-100 text-green-700'  :
                        sala.estado === 'ocupada'       ? 'bg-red-100 text-red-700'      :
                        'bg-yellow-100 text-yellow-700'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${
                          sala.estado === 'disponible' ? 'bg-green-500' :
                          sala.estado === 'ocupada'    ? 'bg-red-500'   : 'bg-yellow-500'
                        }`} />
                        {sala.estado === 'disponible'    ? 'Disponible'    :
                         sala.estado === 'ocupada'       ? 'Ocupada'       : 'Mantenimiento'}
                      </span>
                    </div>
                    <div>
                      <h4 className="font-headline font-bold text-on-surface text-base">{sala.nombre}</h4>
                      {sala.descripcion && (
                        <p className="font-body text-xs text-on-surface-variant mt-1 leading-relaxed">{sala.descripcion}</p>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-3 text-xs font-label text-secondary">
                      <span className="flex items-center gap-1">
                        <span className="material-symbols-outlined text-[14px]">group</span>
                        {sala.capacidad} personas
                      </span>
                      {sala.ubicacion && (
                        <span className="flex items-center gap-1">
                          <span className="material-symbols-outlined text-[14px]">location_on</span>
                          {sala.ubicacion}
                        </span>
                      )}
                    </div>
                    <button
                      onClick={() => handleReservarRapido(sala.id)}
                      disabled={sala.estado !== 'disponible'}
                      className="mt-auto w-full bg-primary text-on-primary font-label text-sm font-medium py-2.5 rounded-lg hover:bg-primary-container transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      {sala.estado === 'disponible' ? 'Reservar Rápido' : 'No disponible'}
                    </button>
                  </div>
                ))
              )}
            </div>
          )}

          {/* ══ TAB: PROFILE ═══════════════════════════════════════ */}
          {activeTab === 'profile' && (
            <div className="max-w-lg space-y-6">
              {/* Avatar + nombre */}
              <div className="bg-surface-container-lowest rounded-xl p-6 border border-outline-variant/20 shadow-sm flex items-center gap-5">
                <div className="w-16 h-16 rounded-full bg-primary-container text-on-primary flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-3xl" style={{ fontVariationSettings: "'FILL' 1" }}>account_circle</span>
                </div>
                <div>
                  <h3 className="font-headline text-xl font-bold text-on-surface">{profile?.nombre}</h3>
                  <span className={`inline-block mt-1 text-xs font-label font-bold px-2 py-0.5 rounded uppercase tracking-wider ${
                    isAdmin ? 'bg-primary-fixed text-on-primary-fixed' : 'bg-surface-container text-on-surface-variant'
                  }`}>
                    {isAdmin ? 'Administrador' : 'Usuario'}
                  </span>
                </div>
              </div>

              {/* Datos de cuenta */}
              <div className="bg-surface-container-lowest rounded-xl border border-outline-variant/20 shadow-sm divide-y divide-outline-variant/15">
                <div className="px-6 py-4">
                  <p className="font-label text-[10px] uppercase tracking-widest text-on-surface-variant mb-1">Nombre</p>
                  <p className="font-body text-on-surface font-medium">{profile?.nombre}</p>
                </div>
                <div className="px-6 py-4">
                  <p className="font-label text-[10px] uppercase tracking-widest text-on-surface-variant mb-1">Rol del sistema</p>
                  <p className="font-body text-on-surface font-medium capitalize">{profile?.rol}</p>
                </div>
                <div className="px-6 py-4">
                  <p className="font-label text-[10px] uppercase tracking-widest text-on-surface-variant mb-1">Reservas activas</p>
                  <p className="font-body text-on-surface font-medium">{reservas.length} próxima{reservas.length !== 1 ? 's' : ''}</p>
                </div>
              </div>

              {/* Cerrar sesión desde perfil */}
              <button
                onClick={handleSignOut}
                className="w-full flex items-center justify-center gap-2 bg-error-container text-on-error-container py-3 rounded-lg hover:opacity-90 transition-opacity text-sm font-label font-medium"
              >
                <span className="material-symbols-outlined text-lg">logout</span>
                Cerrar Sesión
              </button>
            </div>
          )}

        </div>
      </main>

      {/* ── Bottom nav (mobile) ────────────────────────────────── */}
      <nav className="md:hidden fixed bottom-0 left-0 w-full bg-surface-container-lowest border-t border-outline-variant/15 shadow-[0_-4px_16px_rgba(23,28,31,0.06)] z-40 flex justify-around items-center h-16 px-2">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={`flex flex-col items-center justify-center w-full h-full gap-0.5 transition-colors
              ${activeTab === item.id ? 'text-primary' : 'text-secondary hover:text-primary'}`}
          >
            <span
              className="material-symbols-outlined text-[22px]"
              style={activeTab === item.id ? { fontVariationSettings: "'FILL' 1" } : undefined}
            >
              {item.icon}
            </span>
            <span className="font-label text-[10px] font-medium">{item.label}</span>
          </button>
        ))}
      </nav>

      {/* ══ MODAL: NUEVA RESERVA ══════════════════════════════════ */}
      {modalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => !submitting && setModalOpen(false)}
          />

          {/* Panel */}
          <div className="relative w-full max-w-md bg-surface rounded-2xl shadow-2xl border border-outline-variant/20 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-outline-variant/15">
              <div className="flex items-center gap-3">
                <div className="bg-primary-container text-on-primary w-9 h-9 rounded-lg flex items-center justify-center">
                  <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                    event_available
                  </span>
                </div>
                <h2 className="font-headline text-lg font-bold text-on-surface">Nueva Reserva</h2>
              </div>
              <button
                onClick={() => !submitting && setModalOpen(false)}
                className="p-1.5 rounded-lg hover:bg-surface-container transition-colors text-on-surface-variant"
                aria-label="Cerrar"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmitReserva} className="px-6 py-5 space-y-4">
              {/* Título */}
              <div>
                <label className="font-label text-xs uppercase tracking-widest text-on-surface-variant block mb-1.5">
                  Título *
                </label>
                <input
                  type="text"
                  value={form.titulo}
                  onChange={(e) => setForm({ ...form, titulo: e.target.value })}
                  placeholder="Ej: Reunión de equipo Q3"
                  className="w-full bg-surface-container-low border border-outline-variant/30 rounded-lg px-4 py-2.5 text-sm font-body text-on-surface placeholder:text-on-surface-variant/60 focus:outline-none focus:ring-2 focus:ring-primary/40 transition"
                  disabled={submitting}
                />
              </div>

              {/* Sala */}
              <div>
                <label className="font-label text-xs uppercase tracking-widest text-on-surface-variant block mb-1.5">
                  Sala *
                </label>
                <select
                  value={form.sala_id}
                  onChange={(e) => setForm({ ...form, sala_id: e.target.value })}
                  className="w-full bg-surface-container-low border border-outline-variant/30 rounded-lg px-4 py-2.5 text-sm font-body text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/40 transition appearance-none"
                  disabled={submitting || loadingSalas}
                >
                  <option value="">Selecciona una sala…</option>
                  {salas.map((s) => (
                    <option
                      key={s.id}
                      value={s.id}
                      disabled={s.estado !== 'disponible'}
                    >
                      {s.nombre} — cap. {s.capacidad}
                      {s.estado !== 'disponible' ? ` (${s.estado})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Fecha */}
              <div>
                <label className="font-label text-xs uppercase tracking-widest text-on-surface-variant block mb-1.5">
                  Fecha *
                </label>
                <input
                  type="date"
                  value={form.fecha}
                  min={new Date().toISOString().split('T')[0]}
                  onChange={(e) => setForm({ ...form, fecha: e.target.value })}
                  className="w-full bg-surface-container-low border border-outline-variant/30 rounded-lg px-4 py-2.5 text-sm font-body text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/40 transition"
                  disabled={submitting}
                />
              </div>

              {/* Horas */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-label text-xs uppercase tracking-widest text-on-surface-variant block mb-1.5">
                    Hora inicio *
                  </label>
                  <input
                    type="time"
                    value={form.hora_inicio}
                    onChange={(e) => setForm({ ...form, hora_inicio: e.target.value })}
                    className="w-full bg-surface-container-low border border-outline-variant/30 rounded-lg px-4 py-2.5 text-sm font-body text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/40 transition"
                    disabled={submitting}
                  />
                </div>
                <div>
                  <label className="font-label text-xs uppercase tracking-widest text-on-surface-variant block mb-1.5">
                    Hora fin *
                  </label>
                  <input
                    type="time"
                    value={form.hora_fin}
                    onChange={(e) => setForm({ ...form, hora_fin: e.target.value })}
                    className="w-full bg-surface-container-low border border-outline-variant/30 rounded-lg px-4 py-2.5 text-sm font-body text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/40 transition"
                    disabled={submitting}
                  />
                </div>
              </div>

              {/* Error */}
              {modalError && (
                <div className="flex items-start gap-2 bg-error-container text-on-error-container rounded-lg px-4 py-3 text-sm font-body">
                  <span className="material-symbols-outlined text-[18px] shrink-0 mt-0.5">error</span>
                  {modalError}
                </div>
              )}

              {/* Success */}
              {modalSuccess && (
                <div className="flex items-center gap-2 bg-green-50 text-green-700 rounded-lg px-4 py-3 text-sm font-body">
                  <span className="material-symbols-outlined text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                  ¡Reserva creada con éxito!
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => !submitting && setModalOpen(false)}
                  disabled={submitting}
                  className="flex-1 py-2.5 rounded-lg border border-outline-variant/40 text-on-surface font-label text-sm font-medium hover:bg-surface-container transition-colors disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting || modalSuccess}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg bg-primary text-on-primary font-label text-sm font-medium hover:bg-primary-container transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {submitting ? (
                    <>
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-on-primary border-t-transparent" />
                      Guardando…
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-[18px]">add</span>
                      Confirmar
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
