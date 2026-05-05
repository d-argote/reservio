'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { loginUser } from '@/features/auth/actions'

const SimpleParallax = dynamic(() => import('simple-parallax-js'), { ssr: false })

export default function LoginPage() {
  const router = useRouter()
  const [correo, setCorreo] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [globalError, setGlobalError] = useState<string | null>(null)
  const [isSuccess, setIsSuccess] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setGlobalError(null)

    if (!correo.trim() || !password.trim()) {
      setGlobalError('Por favor, completa todos los campos.')
      return
    }

    setIsLoading(true)
    const result = await loginUser(correo.trim(), password)
    setIsLoading(false)

    if (result.error) {
      switch (result.error) {
        case 'USER_INACTIVE':
          setGlobalError('Tu cuenta ha sido desactivada. Contacta al administrador.')
          break
        case 'USER_NOT_FOUND':
          setGlobalError('Este usuario no está registrado. Por favor, crea una cuenta primero.')
          break
        case 'INVALID_PASSWORD':
          setGlobalError('Contraseña incorrecta. Inténtalo de nuevo.')
          break
        case 'RATE_LIMIT':
          setGlobalError('Demasiados intentos fallidos. Por favor, espera unos minutos.')
          break
        case 'INVALID_EMAIL':
          setGlobalError('Formato de correo electrónico inválido.')
          break
        default:
          setGlobalError('Ocurrió un error. Verifica tus credenciales e intenta de nuevo.')
      }
      return
    }

    setIsSuccess(true)
    setTimeout(() => {
      router.push('/main-menu')
    }, 2000)
  }

  return (
    /* ─── Root: flex row, full viewport height on desktop ─── */
    <div className="font-body text-on-surface antialiased flex min-h-screen bg-surface">

      {/* ════════════════════════════════════════════════════
          LEFT PANEL — Branding
          sticky + h-screen keeps it locked regardless of how
          tall the right panel grows (keyboard, errors, etc.)
          ════════════════════════════════════════════════════ */}
      <aside className="hidden lg:flex lg:w-1/2 flex-col h-screen sticky top-0 relative bg-[#001529] overflow-hidden">

        {/* ── Background image — plain img, absolutely fills the panel ── */}
        <img
          src="/fondo1.avif"
          alt=""
          aria-hidden="true"
          className="absolute inset-0 w-full h-full object-cover"
        />

        {/* ── Layered overlays — guarantee legibility over any source image ── */}
        {/* Base dark wash */}
        <div className="absolute inset-0 bg-[#001529]/65 pointer-events-none" />
        {/* Bottom-up gradient so tagline is always readable */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#001529]/95 via-[#001529]/20 to-transparent pointer-events-none" />
        {/* Subtle vignette on the right edge — softens the split with the form panel */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent to-[#001529]/30 pointer-events-none" />

        {/* ── Inner content ────────────────────────────────────── */}
        <div className="relative z-10 flex flex-col h-full p-10 xl:p-14">

          {/* Logo inside frosted-glass card
              The glass backdrop gives the navy logo enough contrast
              regardless of what fondo1 looks like underneath */}
          <div className="flex-1 flex items-center justify-center">
            <div className="bg-white/[0.18] backdrop-blur-md rounded-2xl px-8 py-6 border border-white/[0.28] shadow-2xl shadow-black/40">
              <SimpleParallax scale={1.08} delay={0.4} orientation="up" overflow={false}>
                <img
                  src="/Reservi1.png?v=3"
                  alt="Reservio"
                  className="w-auto h-auto max-w-[320px] xl:max-w-[370px] object-contain drop-shadow-[0_2px_20px_rgba(255,255,255,0.18)]"
                />
              </SimpleParallax>
            </div>
          </div>

          {/* Tagline anchored to the bottom */}
          <div className="max-w-sm">
            <h2 className="font-headline text-4xl xl:text-5xl font-black text-white mb-3 leading-[1.15] tracking-tight">
              Excelencia en la<br />Gestión de Recursos.
            </h2>
            <p className="font-body text-base xl:text-lg text-white/65 leading-relaxed">
              Plataforma integral para optimizar espacios y capital humano en entornos corporativos modernos.
            </p>
          </div>
        </div>
      </aside>

      {/* ════════════════════════════════════════════════════
          RIGHT PANEL — Form
          flex-1 so it fills the remaining width; min-h-screen
          so it covers the viewport even when content is short
          ════════════════════════════════════════════════════ */}
      <main className="flex-1 flex items-center justify-center p-6 sm:p-10 min-h-screen bg-surface">
        <div className="w-full max-w-md">

          {/* Mobile logo — only visible on small screens */}
          <div className="flex justify-center lg:hidden mb-8">
            <div className="w-14 h-14 rounded-2xl bg-primary flex items-center justify-center shadow-lg shadow-primary/25">
              <img src="/logo.png" alt="Reservio" className="w-8 h-8 object-contain" />
            </div>
          </div>

          {/* Card */}
          <div className="bg-surface-container-lowest rounded-2xl p-8 sm:p-10 shadow-xl shadow-black/[0.06] border border-outline-variant/10">

            {/* Header */}
            <div className="mb-8">
              <h1 className="font-headline text-2xl font-bold text-on-surface tracking-tight">
                Bienvenido a Reservio
              </h1>
              <p className="font-body text-on-surface-variant mt-1.5 text-sm">
                Ingresa tus credenciales para continuar
              </p>
            </div>

            {/* Success banner */}
            {isSuccess && (
              <div className="mb-6 p-4 rounded-xl bg-green-50 border border-green-200 animate-fadeIn">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-green-600 text-lg">check_circle</span>
                  </div>
                  <div>
                    <p className="font-label text-sm font-semibold text-green-800">
                      ¡Bienvenido de nuevo a Reservio!
                    </p>
                    <p className="font-label text-xs text-green-700 mt-0.5">
                      Redirigiendo al dashboard…
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Error banner */}
            {globalError && !isSuccess && (
              <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 animate-fadeIn">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-red-600 text-lg">error</span>
                  </div>
                  <p className="font-label text-sm text-red-700 pt-1.5">{globalError}</p>
                </div>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className={`space-y-5 ${isSuccess ? 'hidden' : ''}`} noValidate>

              {/* Email */}
              <div className="space-y-1.5">
                <label htmlFor="email" className="block font-label text-sm font-semibold text-on-surface">
                  Correo electrónico
                </label>
                <input
                  id="email"
                  type="email"
                  placeholder="nombre@empresa.com"
                  value={correo}
                  onChange={(e) => setCorreo(e.target.value)}
                  className="w-full rounded-lg px-4 py-3 bg-surface-container-high border border-outline-variant/20 text-on-surface focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 placeholder:text-on-surface-variant/40 transition-all duration-200"
                  autoComplete="email"
                  disabled={isLoading}
                />
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <label htmlFor="password" className="block font-label text-sm font-semibold text-on-surface">
                  Contraseña
                </label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full rounded-lg px-4 py-3 pr-11 bg-surface-container-high border border-outline-variant/20 text-on-surface focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 placeholder:text-on-surface-variant/40 transition-all duration-200"
                    autoComplete="current-password"
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-on-surface-variant hover:text-primary transition-colors"
                    aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                    disabled={isLoading}
                  >
                    <span className="material-symbols-outlined text-[20px]">
                      {showPassword ? 'visibility_off' : 'visibility'}
                    </span>
                  </button>
                </div>
              </div>

              {/* Forgot password */}
              <div className="flex justify-end">
                <Link
                  href="/forgot-password"
                  className="text-xs font-medium text-secondary hover:text-primary transition-colors"
                >
                  ¿Olvidaste tu contraseña?
                </Link>
              </div>

              {/* Submit */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isLoading || isSuccess}
                  className={`
                    w-full flex justify-center items-center gap-2
                    py-3.5 px-4 rounded-xl text-sm font-semibold tracking-wide
                    transition-all duration-200
                    disabled:opacity-60 disabled:cursor-not-allowed
                    ${isLoading
                      ? 'bg-primary/80 text-on-primary cursor-wait'
                      : 'bg-primary text-on-primary hover:bg-primary-container hover:shadow-lg hover:shadow-primary/20 active:scale-[0.98]'
                    }
                  `}
                >
                  {isLoading ? (
                    <>
                      <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Verificando…
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-[18px]">login</span>
                      Iniciar sesión
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* Footer link */}
          {!isSuccess && (
            <p className="mt-6 text-center font-body text-sm text-on-surface-variant">
              ¿No tienes cuenta?{' '}
              <Link
                href="/register"
                className="font-semibold text-primary hover:underline transition-colors"
              >
                Regístrate aquí
              </Link>
            </p>
          )}
        </div>
      </main>


    </div>
  )
}
