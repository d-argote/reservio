const fs = require('fs');
const pageContent = `'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
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

  // Navigation from TechTab -> ReservationsTab with initial equipo
  const [initialEquipoId, setInitialEquipoId] = useState<string | undefined>(undefined)

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
        .select('rol')
        .eq('id', session.user.id)
        .single()

      if (userRecord?.rol) rol = userRecord.rol as string

      setProfile({ nombre, rol })
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
      <aside className="hidden md:flex flex-col w-[260px] lg:w-[280px] h-full bg-surface-container-low border-r border-outline-variant/15 flex-shrink-0 z-20 shadow-[4px_0_24px_rgba(23,28,31,0.04)]">
        <div className="h-20 flex items-center px-6 gap-3 mb-2">
          <div className="size-10 rounded-xl bg-primary flex items-center justify-center text-on-primary shadow-sm hover:shadow-md transition-shadow">
            <span className="material-symbols-outlined text-[24px]">calendar_month</span>
          </div>
          <h1 className="font-headline text-2xl font-bold text-on-surface tracking-tight">Reservio</h1>
        </div>

        <nav className="flex-1 px-4 py-2 space-y-1.5 overflow-y-auto">
          <p className="px-3 pb-2 text-[11px] font-label font-bold text-on-surface-variant uppercase tracking-[0.1em]">Menú Principal</p>
          {navItems.map((item) => {
            if (item.id === 'admin' && profile?.rol !== 'admin') return null
            const isActive = activeTab === item.id
            return (
              <button type="button"
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id as ActiveTab)
                }}
                className={\`w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200 group
                  \${isActive ? 'bg-primary-container text-on-primary-container font-semibold shadow-sm' : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface font-medium'}\`}
              >
                <span className={\`material-symbols-outlined text-[22px] transition-transform group-hover:scale-110 \${isActive ? 'text-primary' : 'text-secondary group-hover:text-primary'}\`}
                  style={isActive ? { fontVariationSettings: "'FILL' 1" } : undefined}>
                  {item.icon}
                </span>
                <span className="font-label text-[14px]">{item.label}</span>
              </button>
            )
          })}
        </nav>

        <div className="p-4 mt-auto border-t border-outline-variant/15">
          <button type="button" onClick={handleSignOut}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-error hover:bg-error-container hover:text-on-error-container transition-colors font-label font-medium text-sm group"
          >
            <span className="material-symbols-outlined text-[20px] transition-transform group-hover:-translate-x-1">logout</span>
            Cerrar Sesión
          </button>
        </div>
      </aside>

      {/* ── Main Content Area ──────────────────────────────────── */}
      <main className="flex-1 flex flex-col h-full overflow-y-auto overflow-x-hidden md:pl-2 relative scroll-smooth bg-surface-container-lowest">
        {/* Mobile Header */}
        <header className="md:hidden flex items-center justify-between px-5 h-16 bg-surface border-b border-outline-variant/15 sticky top-0 z-30 shadow-sm">
          <div className="flex items-center gap-2">
            <div className="size-8 rounded-lg bg-primary flex items-center justify-center text-on-primary shadow-sm">
              <span className="material-symbols-outlined text-[20px]">calendar_month</span>
            </div>
            <h1 className="font-headline text-lg font-bold text-on-surface">Reservio</h1>
          </div>
          <button type="button" onClick={() => setMobileMenuOpen(true)} className="p-2 -mr-2 rounded-full hover:bg-surface-container transition-colors text-on-surface">
            <span className="material-symbols-outlined">menu</span>
          </button>
        </header>

        {/* Mobile menu modal */}
        {mobileMenuOpen && (
          <div className="md:hidden fixed inset-0 z-50 flex">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setMobileMenuOpen(false)} />
            <div className="relative w-4/5 max-w-sm bg-surface-container-lowest h-full shadow-2xl flex flex-col animate-slide-in-right ml-auto">
              <div className="p-5 border-b border-outline-variant/15 flex items-center justify-between bg-surface">
                <div className="flex items-center gap-3">
                  <div className="size-10 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center font-headline font-bold text-lg">
                    {profile?.nombre?.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-label text-sm font-semibold text-on-surface">{profile?.nombre}</p>
                    <p className="font-body text-[11px] text-on-surface-variant uppercase tracking-wider">{profile?.rol}</p>
                  </div>
                </div>
                <button type="button" onClick={() => setMobileMenuOpen(false)} className="p-1.5 -mr-1.5 rounded-full hover:bg-surface-container transition-colors text-on-surface-variant">
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>

              <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
                <p className="px-3 pb-2 text-[10px] font-label font-bold text-on-surface-variant uppercase tracking-[0.1em]">Navegación</p>
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
                      className={\`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all duration-200
                        \${isActive ? 'bg-primary-container text-on-primary-container font-semibold shadow-sm' : 'text-on-surface-variant hover:bg-surface-container font-medium'}\`}
                    >
                      <span className={\`material-symbols-outlined text-[22px] \${isActive ? 'text-primary' : 'text-secondary'}\`}
                        style={isActive ? { fontVariationSettings: "'FILL' 1" } : undefined}>
                        {item.icon}
                      </span>
                      <span className="font-label text-[15px]">{item.label}</span>
                    </button>
                  )
                })}
              </nav>

              <div className="p-4 border-t border-outline-variant/15 bg-surface pb-8">
                <button type="button" onClick={handleSignOut}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-error/30 text-error hover:bg-error/5 transition-colors font-label font-semibold text-sm"
                >
                  <span className="material-symbols-outlined text-[20px]">logout</span>
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
                onPreviewSala={(sala) => { setActiveTab('rooms'); }}
                salasRefreshRef={salasRefreshRef}
                initialEquipoId={initialEquipoId}
                onInitialNavHandled={() => setInitialEquipoId(undefined)}
              />
            )}
            
            {activeTab === 'rooms' && (
              <RoomsTab 
                onPreviewSala={() => {}}
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
            
            {activeTab === 'profile' && (
              <div className="py-20 text-center">
                <span className="material-symbols-outlined text-4xl text-on-surface-variant mb-2">person</span>
                <p className="text-on-surface font-label">Sección de perfil en construcción</p>
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
            className={\`flex flex-col items-center justify-center w-full h-full gap-0.5 transition-colors
              \${activeTab === item.id ? 'text-primary' : 'text-secondary hover:text-primary'}\`}
          >
            <div className={\`px-4 py-1 rounded-full transition-all duration-300 \${activeTab === item.id ? 'bg-primary-container text-on-primary-container scale-110' : 'bg-transparent text-on-surface-variant'}\`}>
              <span className="material-symbols-outlined text-[20px]" style={activeTab === item.id ? { fontVariationSettings: "'FILL' 1" } : undefined}>
                {item.icon}
              </span>
            </div>
            <span className={\`text-[10px] font-label tracking-wide \${activeTab === item.id ? 'font-bold' : 'font-medium'}\`}>{item.label}</span>
          </button>
        ))}
      </nav>

      <ComingSoonToast visible={comingSoon} />
      <GlobalErrorToast message={globalError} />
    </div>
  )
}
`;

fs.writeFileSync('app/main-menu/page.tsx', pageContent);
console.log('page.tsx replaced successfully.');
