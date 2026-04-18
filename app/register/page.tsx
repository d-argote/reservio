'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { signUp } from '@/lib/auth/authService'

// ── Validation rules ────────────────────────────────────────────────────────
const RULES = {
  nombre:   /^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/,
  correo:   /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  especial: /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?`~]/,
}

interface FieldErrors {
  nombre?: string
  correo?: string
  password?: string
}

function validate(nombre: string, correo: string, password: string): FieldErrors {
  const errors: FieldErrors = {}

  if (!nombre.trim())
    errors.nombre = 'El nombre es obligatorio.'
  else if (!RULES.nombre.test(nombre))
    errors.nombre = 'Solo se permiten letras y espacios (sin números ni caracteres especiales).'

  if (!correo.trim())
    errors.correo = 'El correo es obligatorio.'
  else if (!RULES.correo.test(correo))
    errors.correo = 'Formato de correo electrónico inválido.'

  if (!password)
    errors.password = 'La contraseña es obligatoria.'
  else if (password.length < 8)
    errors.password = 'Debe contener al menos 8 caracteres.'
  else if (!RULES.especial.test(password))
    errors.password = 'Debe incluir al menos un carácter especial (ej. !@#$%).'

  return errors
}

function mapAuthError(message: string): string {
  if (message.includes('already registered') || message.includes('already exists'))
    return 'Este correo ya está registrado. Intenta iniciar sesión.'
  if (message.includes('Password should be') || message.includes('password'))
    return 'La contraseña no cumple los requisitos mínimos de seguridad.'
  if (message.includes('Invalid email'))
    return 'El formato del correo electrónico es inválido.'
  return message
}

const BG_IMAGE =
  'https://lh3.googleusercontent.com/aida-public/AB6AXuDt1a5CmegsmJsVLjUwcvm1d6TMgBN4b-QpTtFQMUovbEh31d05n5kFL0HWBInB1_Gs2kPD_6OjwVJ-IZjrQeO3zS7DhAF40gPfSVdOPjANJFPrC_copDfY1vNj7c5ZX6dwG5aRZ7CCVrRODtlXGXpPqvgMXqByhEMkL_Gx8SyzywnRqgpOAKgQMUbqoOEZ2LM8GvFUCBuW6waBdEEtHTyr3ddyFq8j28gBI3ad-6yTG_QpQHKgEyicOmXAR00LYK2l79Hi7SJidQ'

// ── Field helpers ───────────────────────────────────────────────────────────
function inputClass(hasError: boolean, extraClasses = '') {
  return [
    'w-full rounded-lg px-4 py-3 text-on-surface focus:outline-none focus:ring-1 transition-colors',
    hasError
      ? 'bg-red-50 border border-red-500 focus:ring-red-500'
      : 'bg-surface-container-highest border border-outline-variant/15 focus:border-primary focus:ring-primary placeholder:text-on-surface-variant/50',
    extraClasses,
  ].join(' ')
}

function FieldErrorMsg({ msg }: { msg?: string }) {
  if (!msg) return null
  return (
    <p className="flex items-center gap-1 text-sm text-red-500 mt-1">
      <span className="material-symbols-outlined text-base leading-none">error</span>
      {msg}
    </p>
  )
}

// ── Component ───────────────────────────────────────────────────────────────
export default function RegisterPage() {
  const router = useRouter()

  const [nombre,      setNombre]      = useState('')
  const [correo,      setCorreo]      = useState('')
  const [password,    setPassword]    = useState('')
  const [showPwd,     setShowPwd]     = useState(false)
  const [loading,     setLoading]     = useState(false)
  const [submitted,   setSubmitted]   = useState(false) // track first submit attempt
  const [globalError, setGlobalError] = useState<string | null>(null)
  const [success,     setSuccess]     = useState(false)
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})

  // Re-validate on each keystroke only after the first submit attempt
  const revalidate = (n = nombre, c = correo, p = password) => {
    if (submitted) setFieldErrors(validate(n, c, p))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitted(true)
    setGlobalError(null)

    const errors = validate(nombre, correo, password)
    setFieldErrors(errors)
    if (Object.keys(errors).length > 0) return

    setLoading(true)
    const { error: authError } = await signUp({ nombre, correo, password })
    setLoading(false)

    if (authError) {
      setGlobalError(mapAuthError(authError.message))
      return
    }

    // ── Success ──────────────────────────────────────────────
    setSuccess(true)
    setNombre('')
    setCorreo('')
    setPassword('')
    setFieldErrors({})

    setTimeout(() => router.push('/login'), 3000)
  }

  return (
    <div className="bg-surface font-body text-on-surface antialiased min-h-screen flex w-full">

      {/* ── Left Pane ──────────────────────────────────────────── */}
      <div
        className="hidden lg:block lg:w-1/2 relative bg-surface-container-low"
        style={{ backgroundImage: `url('${BG_IMAGE}')`, backgroundSize: 'cover', backgroundPosition: 'center' }}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-primary/80 to-primary-container/40 mix-blend-multiply" />
        <div className="absolute bottom-12 left-12 max-w-md text-surface-container-lowest">
          <h2 className="font-headline text-3xl font-bold mb-4 leading-tight">
            Excelencia en la Gestión de Recursos.
          </h2>
          <p className="font-body text-lg text-surface-container-lowest/80">
            Plataforma integral para optimizar espacios y capital humano en entornos corporativos modernos.
          </p>
        </div>
      </div>

      {/* ── Right Pane ─────────────────────────────────────────── */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12 bg-surface">
        <div className="w-full max-w-md bg-surface-container-lowest rounded-xl p-8 sm:p-10 shadow-[0_24px_32px_-4px_rgba(23,28,31,0.06)]">

          {/* Header */}
          <div className="mb-10 text-center">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-lg bg-surface-container mb-6">
              <span className="material-symbols-outlined text-primary text-3xl">domain</span>
            </div>
            <h1 className="font-headline text-xl font-black text-primary tracking-widest uppercase mb-2">
              Reservio
            </h1>
            <h2 className="font-headline text-2xl font-bold text-on-surface mt-2">
              Crea tu cuenta
            </h2>
            <p className="font-body text-on-surface-variant mt-2">
              Ingresa tus datos para comenzar
            </p>
          </div>

          {/* ── Success banner ──────────────────────────────────── */}
          {success && (
            <div className="mb-6 flex items-start gap-3 rounded-lg bg-green-50 border border-green-200 px-4 py-4">
              <span className="material-symbols-outlined text-green-600 text-2xl shrink-0 mt-0.5">check_circle</span>
              <div>
                <p className="font-label text-sm font-semibold text-green-800">
                  ¡Registro exitoso! Tu cuenta en Reservio ha sido creada.
                </p>
                <p className="font-label text-xs text-green-700 mt-1">
                  Serás redirigido al inicio de sesión en unos segundos…
                </p>
              </div>
            </div>
          )}

          {/* ── Global error banner ─────────────────────────────── */}
          {globalError && !success && (
            <div className="mb-6 flex items-start gap-2 rounded-lg bg-red-50 border border-red-200 px-4 py-3">
              <span className="material-symbols-outlined text-red-500 text-xl shrink-0 mt-0.5">error</span>
              <p className="font-label text-sm text-red-600">{globalError}</p>
            </div>
          )}

          {/* ── Form ───────────────────────────────────────────────
               Hidden once success banner is shown (still in DOM so
               clearing state is reflected, but user sees the banner) */}
          <form
            onSubmit={handleSubmit}
            className={`space-y-6 ${success ? 'hidden' : ''}`}
            noValidate
          >
            {/* Nombre Completo */}
            <div className="space-y-1">
              <label className="block font-label text-sm font-medium text-on-surface" htmlFor="fullName">
                Nombre Completo
              </label>
              <div className="relative">
                <input
                  id="fullName"
                  name="fullName"
                  type="text"
                  placeholder="Ej. Ana García"
                  value={nombre}
                  onChange={(e) => { setNombre(e.target.value); revalidate(e.target.value, correo, password) }}
                  className={inputClass(!!fieldErrors.nombre, !!fieldErrors.nombre ? 'pr-10' : '')}
                />
                {fieldErrors.nombre && (
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                    <span className="material-symbols-outlined text-red-500 text-xl">error</span>
                  </div>
                )}
              </div>
              <FieldErrorMsg msg={fieldErrors.nombre} />
            </div>

            {/* Correo Electrónico */}
            <div className="space-y-1">
              <label className="block font-label text-sm font-medium text-on-surface" htmlFor="email">
                Correo Electrónico
              </label>
              <div className="relative">
                <input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="ejemplo@empresa.com"
                  value={correo}
                  onChange={(e) => { setCorreo(e.target.value); revalidate(nombre, e.target.value, password) }}
                  className={inputClass(!!fieldErrors.correo, !!fieldErrors.correo ? 'pr-10' : '')}
                />
                {fieldErrors.correo && (
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                    <span className="material-symbols-outlined text-red-500 text-xl">error</span>
                  </div>
                )}
              </div>
              <FieldErrorMsg msg={fieldErrors.correo} />
            </div>

            {/* Contraseña */}
            <div className="space-y-1">
              <label className="block font-label text-sm font-medium text-on-surface" htmlFor="password">
                Contraseña
              </label>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPwd ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); revalidate(nombre, correo, e.target.value) }}
                  className={inputClass(!!fieldErrors.password, 'pr-10')}
                />
                <button
                  type="button"
                  onClick={() => setShowPwd((v) => !v)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-on-surface-variant hover:text-on-surface transition-colors"
                  aria-label={showPwd ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                >
                  <span className="material-symbols-outlined text-xl">
                    {showPwd ? 'visibility' : 'visibility_off'}
                  </span>
                </button>
              </div>
              {fieldErrors.password
                ? <FieldErrorMsg msg={fieldErrors.password} />
                : (
                  <p className="font-label text-xs text-on-surface-variant mt-1">
                    Mínimo 8 caracteres y al menos un carácter especial (ej.&nbsp;!@#$%).
                  </p>
                )
              }
            </div>

            {/* Submit */}
            <div className="pt-4">
              <button
                type="submit"
                disabled={loading || success}
                className="w-full flex justify-center items-center gap-2 py-3.5 px-4 border border-transparent rounded-lg text-base font-medium text-on-primary bg-primary hover:bg-primary-container transition-colors duration-300 shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {loading && (
                  <svg className="animate-spin h-5 w-5 text-on-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                  </svg>
                )}
                {loading ? 'Registrando...' : 'Registrarme en Reservio'}
              </button>
            </div>
          </form>

          {/* Footer */}
          <div className="mt-8 text-center">
            <p className="font-body text-sm text-on-surface-variant">
              ¿Ya tienes cuenta?{' '}
              <Link
                href="/login"
                className="font-medium text-primary hover:text-primary-container hover:underline transition-colors ml-1"
              >
                Inicia sesión aquí
              </Link>
            </p>
          </div>

        </div>
      </div>
    </div>
  )
}
