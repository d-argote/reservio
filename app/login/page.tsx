'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { loginUser } from '@/features/auth/actions'
import { animate, spring, stagger } from 'animejs'
import { useRef } from 'react'

const SimpleParallax = dynamic(() => import('simple-parallax-js'), { ssr: false })

export default function LoginPage() {
  const { push } = useRouter()
  const [correo, setCorreo] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [globalError, setGlobalError] = useState<string | null>(null)
  const [isSuccess, setIsSuccess] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  // ── Animation refs ───────────────────────────────────────────────
  const asideRef    = useRef<HTMLElement>(null)
  const mainRef     = useRef<HTMLElement>(null)
  const cardRef     = useRef<HTMLDivElement>(null)
  const taglineRef  = useRef<HTMLDivElement>(null)
  const logoCardRef = useRef<HTMLDivElement>(null)
  const submitRef   = useRef<HTMLButtonElement>(null)

  // Redirect to dashboard after successful login
  useEffect(() => {
    if (!isSuccess) return
    const timer = setTimeout(() => push('/main-menu'), 2000)
    return () => clearTimeout(timer)
  }, [isSuccess, push])

  // ── Entrance animation on mount ──────────────────────────────────
  useEffect(() => {
    // Set initial invisible state in JS (not JSX) so elements are
    // visible if JS/animation fails (graceful degradation)
    const aside     = asideRef.current
    const logoCard  = logoCardRef.current
    const tagline   = taglineRef.current
    const card      = cardRef.current
    const fields    = mainRef.current ? Array.from(mainRef.current.querySelectorAll<HTMLElement>('[data-field]')) : []

    if (aside)    Object.assign(aside.style, { opacity: '0' })
    if (logoCard) Object.assign(logoCard.style, { opacity: '0', transform: 'scale(0.9)' })
    if (tagline)  Object.assign(tagline.style, { opacity: '0', transform: 'translateY(20px)' })
    if (card)     Object.assign(card.style, { opacity: '0', transform: 'translateY(24px)' })
    fields.forEach(f => Object.assign(f.style, { opacity: '0', transform: 'translateY(10px)' }))

    // Fire animations
    if (aside) animate(aside, { opacity: [0, 1], duration: 500, ease: 'out(2)', delay: 0 })

    if (logoCard) animate(logoCard, {
      opacity: [0, 1], scale: [0.9, 1],
      duration: 560, ease: spring({ stiffness: 220, damping: 18, mass: 1 }), delay: 160,
    })

    if (tagline) animate(tagline, {
      opacity: [0, 1], translateY: [20, 0],
      duration: 480, ease: 'out(3)', delay: 340,
    })

    if (card) animate(card, {
      opacity: [0, 1], translateY: [24, 0],
      duration: 520, ease: spring({ stiffness: 240, damping: 22, mass: 0.9 }), delay: 80,
    })

    if (fields.length) animate(fields, {
      opacity: [0, 1], translateY: [10, 0],
      delay: stagger(70, { start: 300 }),
      duration: 340, ease: 'out(3)',
    })
  }, [])

  // ── Submit button press feedback ─────────────────────────────────
  const handleButtonPress = () => {
    const el = submitRef.current
    if (!el) return
    animate(el, {
      scale: [1, 0.96, 1],
      duration: 300,
      ease: spring({ stiffness: 400, damping: 14 }),
    })
  }

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
  }

  return (
    /* ─── Root: flex row, full viewport height on desktop ─── */
    <div className="font-body text-on-surface antialiased flex min-h-screen bg-surface">

      {/* ════════════════════════════════════════════════════
          LEFT PANEL — Branding
          ════════════════════════════════════════════════════ */}
      <aside ref={asideRef} className="hidden lg:flex lg:w-1/2 flex-col h-screen sticky top-0 relative bg-[#001529] overflow-hidden">

        {/* ── Background image ── */}
        <Image
          src="/fondo1.avif"
          alt=""
          aria-hidden="true"
          fill
          className="object-cover"
          priority
        />

        {/* ── Layered overlays ── */}
        <div className="absolute inset-0 bg-[#001529]/65 pointer-events-none" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#001529]/95 via-[#001529]/20 to-transparent pointer-events-none" />
        <div className="absolute inset-0 bg-gradient-to-r from-transparent to-[#001529]/30 pointer-events-none" />

        {/* ── Inner content ── */}
        <div className="relative z-10 flex flex-col h-full p-10 xl:p-14">

          {/* Logo card */}
          <div className="flex-1 flex items-center justify-center">
            <div ref={logoCardRef} className="bg-white/[0.18] backdrop-blur-md rounded-2xl px-8 py-6 border border-white/[0.28] shadow-2xl shadow-black/40">
              <SimpleParallax scale={1.08} delay={0.4} orientation="up" overflow={false}>
                <Image
                  src="/Reservi1.png"
                  alt="Reservio"
                  width={370}
                  height={200}
                  className="w-auto h-auto max-w-[320px] xl:max-w-[370px] object-contain drop-shadow-[0_2px_20px_rgba(255,255,255,0.18)]"
                />
              </SimpleParallax>
            </div>
          </div>

          {/* Tagline */}
          <div ref={taglineRef} className="max-w-sm">
            <h2 className="font-headline text-4xl xl:text-5xl font-semibold text-white mb-3 leading-[1.15] tracking-tight">
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
          ════════════════════════════════════════════════════ */}
      <main ref={mainRef} className="flex-1 flex items-center justify-center p-6 sm:p-10 min-h-screen bg-surface">
        <div className="w-full max-w-md">

          {/* Mobile logo */}
          <div className="flex justify-center lg:hidden mb-8" data-field>
            <div className="size-14 rounded-2xl bg-primary flex items-center justify-center shadow-lg shadow-primary/25">
              <Image src="/logo.png" alt="Reservio" width={32} height={32} className="object-contain" />
            </div>
          </div>

          {/* Card */}
          <div ref={cardRef} className="bg-surface-container-lowest rounded-2xl p-8 sm:p-10 shadow-xl shadow-black/[0.06] border border-outline-variant/10">

            {/* Header */}
            <div className="mb-8" data-field>
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
                  <div className="size-9 rounded-full bg-green-100 flex items-center justify-center shrink-0">
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
                  <div className="size-9 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-red-600 text-lg">error</span>
                  </div>
                  <p className="font-label text-sm text-red-700 pt-1.5">{globalError}</p>
                </div>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className={`space-y-5 ${isSuccess ? 'hidden' : ''}`} noValidate>

              {/* Email */}
              <div className="space-y-1.5" data-field>
                <label htmlFor="email" className="block font-label text-sm font-semibold text-on-surface">
                  Correo electrónico
                </label>
                <input
                  id="email"
                  type="email"
                  aria-label="Correo electrónico"
                  placeholder="nombre@empresa.com"
                  value={correo}
                  onChange={(e) => setCorreo(e.target.value)}
                  className="input-animated w-full rounded-lg px-4 py-3 bg-surface-container-high border border-outline-variant/20 text-on-surface focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 placeholder:text-on-surface-variant/40 transition-all duration-200"
                  autoComplete="email"
                  disabled={isLoading}
                />
              </div>

              {/* Password */}
              <div className="space-y-1.5" data-field>
                <label htmlFor="password" className="block font-label text-sm font-semibold text-on-surface">
                  Contraseña
                </label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    aria-label="Contraseña"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="input-animated w-full rounded-lg px-4 py-3 pr-11 bg-surface-container-high border border-outline-variant/20 text-on-surface focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 placeholder:text-on-surface-variant/40 transition-all duration-200"
                    autoComplete="current-password"
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="btn-press absolute inset-y-0 right-0 pr-3 flex items-center text-on-surface-variant hover:text-primary transition-colors"
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
              <div className="flex justify-end" data-field>
                <Link
                  href="/forgot-password"
                  className="text-xs font-medium text-secondary hover:text-primary transition-colors"
                >
                  ¿Olvidaste tu contraseña?
                </Link>
              </div>

              {/* Submit */}
              <div className="pt-2" data-field>
                <button
                  ref={submitRef}
                  type="submit"
                  disabled={isLoading || isSuccess}
                  onMouseDown={handleButtonPress}
                  className={`
                    btn-press w-full flex justify-center items-center gap-2
                    py-3.5 px-4 rounded-xl text-sm font-semibold tracking-wide
                    transition-all duration-200
                    disabled:opacity-60 disabled:cursor-not-allowed
                    ${isLoading
                      ? 'bg-primary/80 text-on-primary cursor-wait'
                      : 'bg-primary text-on-primary hover:bg-primary-container hover:shadow-lg hover:shadow-primary/20'
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
            <p className="mt-6 text-center font-body text-sm text-on-surface-variant" data-field>
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
