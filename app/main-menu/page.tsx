'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { useRealtimeSync } from '@/hooks/useRealtimeSync'

// Sub-components
import { ReservationsTab } from './_components/ReservationsTab'
import { RoomsTab } from './_components/RoomsTab'
import { TechTab } from './_components/TechTab'
import { AdminTab } from './_components/AdminTab'

// Types
import type { UserProfile, ActiveTab } from './_components/types'

// Helpers
import { formatFecha, formatHora } from './_components/helpers'

function ComingSoonToast({ visible }: { visible: boolean }) {
  if (!visible) return null;
  return (
    <div className="fixed bottom-20 left-1/2 -translate-x-1/2 bg-surface-container-high text-on-surface text-sm font-label px-5 py-3 rounded-full shadow-lg border border-outline-variant/20 z-50 animate-fade-in flex items-center gap-2">
      <span className="material-symbols-outlined text-[18px]">build</span>
      En desarrollo...
    </div>
  )
}

function GlobalErrorToast({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <div className="fixed bottom-20 left-1/2 -translate-x-1/2 bg-error text-on-error text-sm font-label px-5 py-3 rounded-xl shadow-xl z-[100] animate-fade-in flex items-center gap-2">
      <span className="material-symbols-outlined text-[20px]">error</span>
      {message}
    </div>
  )
}

export default function MainMenuPage() {
  const router = useRouter()

  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const [activeTab, setActiveTab] = useState<ActiveTab>('reservations')
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  
  // Sidebar state with localStorage persistence
  const [sidebarOpen, setSidebarOpen] = useState(() => {
    if (typeof window === 'undefined') return true
    const saved = localStorage.getItem('reservio_sidebar_open')
    return saved !== null ? saved === 'true' : true
  })

  const toggleSidebar = () => {
    setSidebarOpen(prev => {
      const next = !prev
      localStorage.setItem('reservio_sidebar_open', String(next))
      return next
    })
  }

  const [comingSoon, setComingSoon] = useState(false)
  const showComingSoon = useCallback(() => {
    setComingSoon(true)
    setTimeout(() => setComingSoon(false), 2800)
  }, [])

  const [globalError, setGlobalError] = useState<string | null>(null)
  const showGlobalError = useCallback((msg: string) => {
    setGlobalError(msg)
    setTimeout(() => setGlobalError(null), 4500)
  }, [])

  // Refs for realtime refresh
  const salasRefreshRef = useRef<(() => void) | null>(null)
  const equiposRefreshRef = useRef<(() => void) | null>(null)

  // Navigation from cross-tabs -> ReservationsTab with initial ids
  const [initialEquipoId, setInitialEquipoId] = useState<string | undefined>(undefined)
  const [initialSalaId, setInitialSalaId] = useState<string | undefined>(undefined)

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/login'); return }

      const nombre =
        session.user.user_metadata?.nombre ??
        session.user.email?.split('@')[0] ??
        'Usuario'

      let rol: string = session.user.user_metadata?.rol ?? 'usuario'

      const { data: userRecord } = await supabase
        .from('usuarios')
        .select('rol, correo, activo, created_at')
        .eq('id', session.user.id)
        .single()

      if (userRecord?.rol) rol = userRecord.rol as string

      const correo: string = userRecord?.correo ?? session.user.email ?? ''
      const activo: boolean = userRecord?.activo ?? true
      const createdAt: string = userRecord?.created_at ?? session.user.created_at ?? ''

      setProfile({ nombre, rol, correo, activo, createdAt })
      setCurrentUserId(session.user.id)
      setIsLoading(false)
    }
    init()
  }, [router])

  useRealtimeSync({
    onSalasChange: () => salasRefreshRef.current?.(),
    onEquiposChange: () => equiposRefreshRef.current?.(),
  })

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  // Cross-tab navigation
  const handleOpenReservationWithEquipo = (equipoId: string) => {
    setInitialEquipoId(equipoId)
    setActiveTab('reservations')
  }
  
  const handleOpenReservationWithSala = (salaId: string) => {
    setInitialSalaId(salaId)
    setActiveTab('reservations')
  }

  const navItems = [
    { id: 'reservations', icon: 'calendar_month', label: 'Reservas' },
    { id: 'rooms', icon: 'meeting_room', label: 'Salas' },
    { id: 'tech', icon: 'devices', label: 'Equipos' },
    ...(profile?.rol === 'admin' ? [{ id: 'admin', icon: 'admin_panel_settings', label: 'Admin' }] : []),
    { id: 'profile', icon: 'person', label: 'Perfil' }
  ]

  if (isLoading) {
    return (
      <div className="flex h-screen bg-surface items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="size-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-on-surface-variant font-label text-sm animate-pulse">Cargando...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-surface overflow-hidden relative selection:bg-primary/20 selection:text-primary">
      {/* ── Sidebar (desktop) ──────────────────────────────────── */}
      <aside className={`hidden md:flex flex-col h-full bg-surface text-primary font-body border-r border-outline-variant/20 flex-shrink-0 z-20 transition-all duration-300 ease-in-out overflow-hidden ${sidebarOpen ? 'w-72' : 'w-16'}`}>
        {/* Brand */}
        <div className={`p-8 flex items-center gap-3 border-b border-outline-variant/20 mb-2 overflow-hidden ${!sidebarOpen ? 'justify-center px-4 py-5' : ''}`}>
          <img src="/logo.png" alt="Reservio Logo" className="size-10 object-contain drop-shadow-sm shrink-0" />
          {sidebarOpen && (
            <div className="transition-opacity duration-200">
              <h1 className="font-headline text-2xl font-black text-primary mb-0 leading-none">Reservio</h1>
              <p className="font-body text-secondary text-[11px] font-semibold tracking-wider uppercase mt-1">Workspace</p>
            </div>
          )}
        </div>
        
        {/* Toggle Button */}
        <button
          type="button"
          onClick={toggleSidebar}
          className="mx-auto mb-2 p-2 rounded-lg hover:bg-surface-container-low transition-colors text-on-surface-variant"
          title={sidebarOpen ? 'Colapsar menú' : 'Expandir menú'}
        >
          <span className="material-symbols-outlined text-[22px]">
            {sidebarOpen ? 'menu_open' : 'menu'}
          </span>
        </button>

        {/* Nav items */}
        <div className="flex flex-col gap-y-1 flex-grow overflow-y-auto pb-4 px-2">
          {navItems.map((item) => {
            if (item.id === 'admin' && profile?.rol !== 'admin') return null
            const isActive = activeTab === item.id
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveTab(item.id as ActiveTab)}
                title={!sidebarOpen ? item.label : undefined}
                className={`
                  flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium w-full text-left 
                  transition-all duration-200
                  ${!sidebarOpen ? 'justify-center px-2' : ''}
                  ${isActive
                    ? 'border-l-[3px] border-primary bg-surface-container-lowest text-primary font-semibold'
                    : 'text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface'
                  }
                `}
              >
                <span
                  className="material-symbols-outlined shrink-0"
                  style={isActive ? { fontVariationSettings: "'FILL' 1" } : undefined}>
                  {item.icon}
                </span>
                {sidebarOpen && (
                  <span className="truncate transition-opacity duration-200">{item.label}</span>
                )}
              </button>
            )
          })}
        </div>

        {/* Sign out */}
        <div className={`p-6 mt-auto ${!sidebarOpen ? 'px-2' : ''}`}>
          <button
            type="button"
            onClick={handleSignOut}
            title={!sidebarOpen ? 'Cerrar Sesión' : undefined}
            className={`
              w-full flex items-center justify-center gap-2 border border-outline-variant/30 
              text-on-surface-variant py-3 rounded-lg hover:border-error/40 hover:text-error 
              hover:bg-error/5 transition-colors text-sm font-medium font-label
            `}
          >
            <span className="material-symbols-outlined text-lg shrink-0">logout</span>
            {sidebarOpen && 'Cerrar Sesión'}
          </button>
        </div>
      </aside>

      {/* ── Main Content Area ──────────────────────────────────── */}
      <main className="flex-1 flex flex-col h-full overflow-y-auto overflow-x-hidden md:pl-2 relative scroll-smooth bg-surface-container-lowest">
        {/* Mobile Header */}
        <header className="md:hidden bg-surface/95 backdrop-blur-sm sticky top-0 z-30 flex items-center justify-between px-6 h-16 border-b border-outline-variant/20 shadow-sm">
          <div className="flex items-center gap-2">
            <Image src="/logo.png" alt="Logo" width={28} height={28} className="size-7 object-contain" />
            <span className="font-headline text-xl font-black text-primary tracking-wide">Reservio</span>
          </div>
          <button type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-full hover:bg-surface-container transition-colors"
          >
            <span className="material-symbols-outlined text-on-surface-variant">
              {mobileMenuOpen ? 'close' : 'menu'}
            </span>
          </button>
        </header>

        {/* Mobile menu modal */}
        {mobileMenuOpen && (
          <div className="md:hidden fixed inset-0 z-50">
            <div className="absolute inset-0 bg-black/40" onClick={() => setMobileMenuOpen(false)} />
            <div className="absolute left-0 top-0 bottom-0 w-72 bg-surface flex flex-col shadow-2xl">
              <div className="p-8 pt-16 flex items-center gap-3">
                <Image src="/logo.png" alt="Reservio Logo" width={40} height={40} className="size-10 object-contain drop-shadow-sm" />
                <div>
                  <h1 className="font-headline text-2xl font-black text-primary mb-0 leading-none">Reservio</h1>
                  <p className="font-body text-secondary text-[11px] font-semibold tracking-wider uppercase mt-1">Workspace</p>
                </div>
              </div>
              <div className="flex flex-col gap-y-1 flex-grow overflow-y-auto pb-4 px-2">
                {navItems.map((item) => {
                  if (item.id === 'admin' && profile?.rol !== 'admin') return null
                  const isActive = activeTab === item.id
                  return (
                    <button type="button"
                      key={item.id}
                      onClick={() => {
                        setActiveTab(item.id as ActiveTab)
                        setMobileMenuOpen(false)
                      }}
                      className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium w-full text-left transition-all duration-200
                        ${isActive
                          ? 'bg-surface-container-lowest text-primary font-semibold'
                          : 'text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface'
                        }`}
                    >
                      <span className="material-symbols-outlined"
                        style={isActive ? { fontVariationSettings: "'FILL' 1" } : undefined}>
                        {item.icon}
                      </span>
                      <span>{item.label}</span>
                    </button>
                  )
                })}
              </div>
              <div className="p-6">
                <button type="button" onClick={handleSignOut}
                  className="w-full flex items-center justify-center gap-2 border border-outline-variant/30 text-on-surface-variant py-3 rounded-lg hover:border-error/40 hover:text-error hover:bg-error/5 transition-colors text-sm font-medium font-label"
                >
                  <span className="material-symbols-outlined text-lg">logout</span>
                  Cerrar Sesión
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Content Wrapper */}
        <div className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-8 lg:p-10 pb-24 md:pb-10 pt-6 md:pt-10 transition-all duration-300">
          
          {/* Header Area */}
          <div className="mb-8 md:mb-10 flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <h2 className="font-headline text-3xl md:text-4xl font-bold text-on-surface tracking-tight" data-anim>
                {activeTab === 'reservations' && 'Mis Reservas'}
                {activeTab === 'rooms' && 'Salas Disponibles'}
                {activeTab === 'tech' && 'Equipos y Préstamos'}
                {activeTab === 'profile' && 'Mi Perfil'}
                {activeTab === 'admin' && 'Panel de Administración'}
              </h2>
              <p className="font-body text-on-surface-variant mt-2 text-sm md:text-base max-w-2xl" data-anim>
                {activeTab === 'reservations' && 'Gestiona tus reservas de espacios en el campus universitario.'}
                {activeTab === 'rooms' && 'Explora las salas y consulta su disponibilidad en tiempo real.'}
                {activeTab === 'tech' && 'Solicita ordenadores, periféricos y reporta novedades.'}
                {activeTab === 'profile' && 'Revisa tu historial completo y gestiona tus preferencias.'}
                {activeTab === 'admin' && 'Gestión integral de usuarios, espacios, equipos y estadísticas.'}
              </p>
            </div>
            
            {/* Desktop Profile Snippet */}
            <div className="hidden md:flex items-center gap-3 bg-surface-container-low px-4 py-2.5 rounded-full border border-outline-variant/20 shadow-sm" data-anim>
              <div className="flex flex-col items-end">
                <span className="font-label text-sm font-semibold text-on-surface">{profile?.nombre}</span>
                <span className="font-body text-[11px] text-on-surface-variant uppercase tracking-wider">{profile?.rol}</span>
              </div>
              <div className="size-10 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center font-headline font-bold text-lg shadow-inner">
                {profile?.nombre?.charAt(0).toUpperCase()}
              </div>
            </div>
          </div>

          {/* TABS CONTENT */}
          <div className="animate-fade-in w-full">
            {activeTab === 'reservations' && currentUserId && profile && (
              <ReservationsTab 
                userId={currentUserId}
                profileNombre={profile.nombre}
                isAdmin={profile.rol === 'admin'}
                onShowComingSoon={showComingSoon}
                onShowGlobalError={showGlobalError}
                onPreviewSala={(sala) => { setInitialSalaId(sala.id); setActiveTab('reservations'); }}
                salasRefreshRef={salasRefreshRef}
                initialEquipoId={initialEquipoId}
                initialSalaId={initialSalaId}
                onInitialNavHandled={() => { setInitialEquipoId(undefined); setInitialSalaId(undefined); }}
              />
            )}
            
            {activeTab === 'rooms' && (
              <RoomsTab 
                onPreviewSala={(sala) => handleOpenReservationWithSala(sala.id)}
                refreshRef={salasRefreshRef}
              />
            )}
            
            {activeTab === 'tech' && currentUserId && (
              <TechTab 
                userId={currentUserId}
                onOpenReservationWithEquipo={handleOpenReservationWithEquipo}
                refreshRef={equiposRefreshRef}
              />
            )}
            
            {activeTab === 'admin' && (
              <AdminTab 
                userProfile={profile}
                showGlobalError={showGlobalError}
              />
            )}
            
            {activeTab === 'profile' && profile && (
              <div className="max-w-2xl space-y-5">
                {/* Avatar + name card */}
                <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/20 p-6 flex items-center gap-5 shadow-sm">
                  <div className="size-20 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center font-headline font-bold text-4xl shrink-0 shadow-inner">
                    {profile.nombre.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="font-headline text-2xl font-bold text-on-surface">{profile.nombre}</h3>
                    <span className={`inline-flex items-center gap-1 mt-1.5 text-xs font-label font-semibold px-2.5 py-1 rounded-full ${
                      profile.activo
                        ? 'bg-green-100 text-green-700 border border-green-200'
                        : 'bg-surface-container-high text-on-surface-variant border border-outline-variant/30'
                    }`}>
                      <span className={`size-1.5 rounded-full ${profile.activo ? 'bg-green-500' : 'bg-on-surface-variant/40'}`} />
                      {profile.activo ? 'Activo' : 'Inactivo'}
                    </span>
                  </div>
                </div>

                {/* Info fields */}
                <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/20 shadow-sm overflow-hidden">
                  <div className="px-6 py-4 border-b border-outline-variant/10">
                    <p className="font-label text-[11px] font-bold text-on-surface-variant uppercase tracking-widest">Información de la cuenta</p>
                  </div>
                  <dl className="divide-y divide-outline-variant/10">
                    <div className="flex items-center gap-4 px-6 py-4">
                      <span className="material-symbols-outlined text-[20px] text-secondary shrink-0">person</span>
                      <div className="min-w-0">
                        <dt className="font-label text-[11px] font-semibold text-on-surface-variant uppercase tracking-wider">Nombre</dt>
                        <dd className="font-body text-sm text-on-surface mt-0.5 truncate">{profile.nombre}</dd>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 px-6 py-4">
                      <span className="material-symbols-outlined text-[20px] text-secondary shrink-0">mail</span>
                      <div className="min-w-0">
                        <dt className="font-label text-[11px] font-semibold text-on-surface-variant uppercase tracking-wider">Correo electrónico</dt>
                        <dd className="font-body text-sm text-on-surface mt-0.5 truncate">{profile.correo}</dd>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 px-6 py-4">
                      <span className="material-symbols-outlined text-[20px] text-secondary shrink-0">shield_person</span>
                      <div className="min-w-0">
                        <dt className="font-label text-[11px] font-semibold text-on-surface-variant uppercase tracking-wider">Rol</dt>
                        <dd className="font-body text-sm text-on-surface mt-0.5 capitalize">{profile.rol}</dd>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 px-6 py-4">
                      <span className="material-symbols-outlined text-[20px] text-secondary shrink-0">calendar_today</span>
                      <div className="min-w-0">
                        <dt className="font-label text-[11px] font-semibold text-on-surface-variant uppercase tracking-wider">Miembro desde</dt>
                        <dd className="font-body text-sm text-on-surface mt-0.5">
                          {profile.createdAt
                            ? new Date(profile.createdAt).toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' })
                            : '—'}
                        </dd>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 px-6 py-4">
                      <span className="material-symbols-outlined text-[20px] text-secondary shrink-0">toggle_on</span>
                      <div className="min-w-0">
                        <dt className="font-label text-[11px] font-semibold text-on-surface-variant uppercase tracking-wider">Estado</dt>
                        <dd className="font-body text-sm mt-0.5">
                          <span className={`inline-flex items-center gap-1 font-semibold ${
                            profile.activo ? 'text-green-600' : 'text-on-surface-variant'
                          }`}>
                            <span className={`size-2 rounded-full ${profile.activo ? 'bg-green-500' : 'bg-on-surface-variant/40'}`} />
                            {profile.activo ? 'Cuenta activa' : 'Cuenta inactiva'}
                          </span>
                        </dd>
                      </div>
                    </div>
                  </dl>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Bottom Nav (Mobile) */}
      <nav className="md:hidden fixed bottom-0 left-0 w-full bg-surface-container-lowest border-t border-outline-variant/15 shadow-[0_-4px_16px_rgba(23,28,31,0.06)] z-40 flex justify-around items-center h-16 px-2">
        {navItems.map((item) => (
          <button type="button"
            key={item.id}
            onClick={() => setActiveTab(item.id as ActiveTab)}
            className={`flex flex-col items-center justify-center w-full h-full gap-0.5 transition-colors
              ${activeTab === item.id ? 'text-primary' : 'text-secondary hover:text-primary'}`}
          >
            <div className={`px-4 py-1 rounded-full transition-all duration-300 ${activeTab === item.id ? 'bg-primary-container text-on-primary-container scale-110' : 'bg-transparent text-on-surface-variant'}`}>
              <span className="material-symbols-outlined text-[20px]" style={activeTab === item.id ? { fontVariationSettings: "'FILL' 1" } : undefined}>
                {item.icon}
              </span>
            </div>
            <span className={`text-[10px] font-label tracking-wide ${activeTab === item.id ? 'font-bold' : 'font-medium'}`}>{item.label}</span>
          </button>
        ))}
      </nav>

      <ComingSoonToast visible={comingSoon} />
      <GlobalErrorToast message={globalError} />
    </div>
  )
}