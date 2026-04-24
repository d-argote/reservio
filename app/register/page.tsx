'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { signUpUser } from '@/lib/auth/serverActions'

// ═══════════════════════════════════════════════════════════════════════════════
// VALIDACIÓN SIMPLIFICADA - Reglas más flexibles y amigables
// ═══════════════════════════════════════════════════════════════════════════════
const VALIDATION_RULES = {
  nombre: /^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/,
  correo: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
} as const

// Constantes de validación
const MIN_NOMBRE_LENGTH = 2
const MIN_PASSWORD_LENGTH = 8

// ═══════════════════════════════════════════════════════════════════════════════
// MENSAJES DE ERROR - Texto amigable y claro para cada validación
// ═══════════════════════════════════════════════════════════════════════════════
const ERROR_MESSAGES = {
  nombre: {
    required: 'El nombre es obligatorio.',
    minLength: `El nombre debe tener al menos ${MIN_NOMBRE_LENGTH} caracteres.`,
    invalidFormat: 'El nombre completo solo puede contener letras y espacios. No se permiten números ni caracteres especiales.',
  },
  correo: {
    required: 'El correo electrónico es obligatorio.',
    invalid: 'El formato del correo electrónico no es válido.',
  },
  password: {
    required: 'La contraseña es obligatoria.',
    minLength: `La contraseña debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres.`,
  },
} as const

// ═══════════════════════════════════════════════════════════════════════════════
// MAPEO DE ERRORES DE SUPABASE - Traduce errores técnicos a mensajes amigables
// ═══════════════════════════════════════════════════════════════════════════════
// Patrones de error de email ya registrado (se detectan antes que cualquier otro)
const EMAIL_EXISTS_PATTERNS = [
  'already registered',
  'already exists',
  'user already registered',
  'email address is already',
  'duplicate',
]

// Patrones de error de formato de email inválido (explícitos, no la palabra "email" genérica)
const INVALID_EMAIL_PATTERNS = [
  'invalid email',
  'invalid email format',
  'email format',
  'not a valid email',
  'malformed email',
]

// Código especial para identificar error de email ya registrado
export const EMAIL_EXISTS_CODE = 'EMAIL_EXISTS'

// ═══════════════════════════════════════════════════════════════════════════════
// TIPOS E INTERFACES
// ═══════════════════════════════════════════════════════════════════════════════
interface FieldErrors {
  nombre?: string
  correo?: string
  password?: string
}

interface FormState {
  nombre: string
  correo: string
  password: string
}

// ═══════════════════════════════════════════════════════════════════════════════
// FUNCIONES DE VALIDACIÓN - Puras y testeables
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Valida el campo nombre:
 * - No vacío
 * - Al menos 2 caracteres (permite apóstrofes, guiones, acentos)
 */
function validateNombre(value: string): string | undefined {
  const trimmed = value.trim()
  if (!trimmed) return ERROR_MESSAGES.nombre.required
  if (trimmed.length < MIN_NOMBRE_LENGTH) return ERROR_MESSAGES.nombre.minLength
  if (!VALIDATION_RULES.nombre.test(trimmed)) return ERROR_MESSAGES.nombre.invalidFormat
  return undefined
}

/**
 * Valida el campo correo:
 * - No vacío
 * - Formato válido de email
 */
function validateCorreo(value: string): string | undefined {
  const trimmed = value.trim()
  if (!trimmed) return ERROR_MESSAGES.correo.required
  if (!VALIDATION_RULES.correo.test(trimmed)) return ERROR_MESSAGES.correo.invalid
  return undefined
}

/**
 * Valida el campo contraseña:
 * - No vacía
 * - Mínimo 8 caracteres
 * - Mayúscula, minúscula, número y símbolo
 */
function validatePassword(value: string): string | undefined {
  if (!value) return ERROR_MESSAGES.password.required
  if (value.length < MIN_PASSWORD_LENGTH) return ERROR_MESSAGES.password.minLength
  if (!/[A-Z]/.test(value)) return 'La contraseña debe tener al menos una letra mayúscula.'
  if (!/[a-z]/.test(value)) return 'La contraseña debe tener al menos una letra minúscula.'
  if (!/[0-9]/.test(value)) return 'La contraseña debe tener al menos un número.'
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(value)) return 'La contraseña debe tener al menos un carácter especial.'
  return undefined
}

/**
 * Valida todos los campos del formulario
 * Retorna un objeto con los errores de cada campo (undefined si es válido)
 */
function validateForm(form: FormState): FieldErrors {
  const errors: FieldErrors = {}
  
  const nombreError = validateNombre(form.nombre)
  if (nombreError) errors.nombre = nombreError

  const correoError = validateCorreo(form.correo)
  if (correoError) errors.correo = correoError

  const passwordError = validatePassword(form.password)
  if (passwordError) errors.password = passwordError

  return errors
}

/**
 * Traduce mensajes de error técnicos de Supabase a mensajes amigables
 */
function translateAuthError(message: string): string {
  const m = message.toLowerCase()

  // 1. Email ya registrado → código especial para mostrar banner
  if (EMAIL_EXISTS_PATTERNS.some(p => m.includes(p))) {
    return EMAIL_EXISTS_CODE
  }

  // 2. Contraseña débil
  if (m.includes('password') && (m.includes('weak') || m.includes('minimum') || m.includes('characters'))) {
    return 'La contraseña no cumple los requisitos mínimos de seguridad.'
  }

  // 3. Formato de email inválido (patrones específicos, NO la palabra genérica "email")
  if (INVALID_EMAIL_PATTERNS.some(p => m.includes(p))) {
    return 'El correo electrónico ingresado no es válido.'
  }

  // 4. Rate limit explícito (solo patrones específicos de throttle, NO "sending")
  if (m.includes('rate limit') || m.includes('too many requests') || m.includes('too many attempts')) {
    return 'Demasiados intentos. Espera unos minutos e intenta de nuevo.'
  }

  // 5. Error de entrega de correo / SMTP — el usuario SÍ se creó, el email falló
  //    Supabase devuelve este error pero GoTrue ya insertó el usuario en auth.users
  if (m.includes('sending') || m.includes('smtp') || m.includes('could not send') || m.includes('email delivery')) {
    return 'SMTP_ERROR'
  }

  // 6. Signup deshabilitado o error general de Supabase
  if (m.includes('signup') || m.includes('sign up') || m.includes('not allowed')) {
    return 'El registro no está disponible en este momento. Intenta más tarde.'
  }

  // Fallback genérico
  return 'Ocurrió un error inesperado. Por favor, intenta nuevamente.'
}

// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENTES UI HELPER - Estilos y componentes reutilizables
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Genera clases CSS dinámicamente según el estado del campo
 */
function getInputClasses(hasError: boolean, hasIcon: boolean = false): string {
  const baseClasses = [
    'w-full rounded-lg px-4 py-3 text-on-surface',
    'focus:outline-none focus:ring-2 transition-all duration-200',
    'placeholder:text-on-surface-variant/50',
  ]

  const stateClasses = hasError
    ? [
        'bg-red-50 border-2 border-red-500',
        'focus:ring-red-200 focus:border-red-500',
      ]
    : [
        'bg-surface-container-highest border border-outline-variant/15',
        'focus:border-primary focus:ring-primary/20',
      ]

  const iconPadding = hasIcon ? 'pr-10' : ''

  return [...baseClasses, ...stateClasses, iconPadding].join(' ')
}

/**
 * Mensaje de error inline para cada campo
 */
function FieldError({ message }: { message: string }) {
  return (
    <p className="flex items-center gap-1.5 text-sm text-red-600 mt-2 animate-fadeIn">
      <span className="material-symbols-outlined text-base leading-none shrink-0">
        error
      </span>
      <span>{message}</span>
    </p>
  )
}

/**
 * Indicador de requisitos de contraseña
 */
function PasswordRequirements({ password }: { password: string }) {
  const requirements = [
    { label: `Mínimo ${MIN_PASSWORD_LENGTH} caracteres`, met: password.length >= MIN_PASSWORD_LENGTH },
    { label: 'Una letra mayúscula', met: /[A-Z]/.test(password) },
    { label: 'Una letra minúscula', met: /[a-z]/.test(password) },
    { label: 'Un número', met: /[0-9]/.test(password) },
    { label: 'Un carácter especial', met: /[!@#$%^&*(),.?":{}|<>]/.test(password) },
  ]

  return (
    <div className="mt-2 space-y-1">
      {requirements.map((req, index) => (
        <div
          key={index}
          className={`flex items-center gap-2 text-xs transition-colors ${
            req.met ? 'text-green-600' : 'text-on-surface-variant/60'
          }`}
        >
          <span className={`material-symbols-outlined text-sm ${req.met ? 'text-green-500' : ''}`}>
            {req.met ? 'check_circle' : 'radio_button_unchecked'}
          </span>
          {req.label}
        </div>
      ))}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL - RegisterPage
// ═══════════════════════════════════════════════════════════════════════════════
export default function RegisterPage() {
  const router = useRouter()

  // ── Estado del formulario ───────────────────────────────────────────
  const [form, setForm] = useState<FormState>({
    nombre: '',
    correo: '',
    password: '',
  })
  const [errors, setErrors] = useState<FieldErrors>({})
  const [touched, setTouched] = useState<Record<string, boolean>>({})

  // ── Estado de UI ───────────────────────────────────────────────────
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [globalError, setGlobalError] = useState<string | null>(null)
  const [isSuccess, setIsSuccess] = useState(false)
  const [emailAlreadyExists, setEmailAlreadyExists] = useState(false)

  // ═══════════════════════════════════════════════════════════════════════
  // HANDLERS DE EVENTOS
  // ═══════════════════════════════════════════════════════════════════════

  /**
   * Maneja cambios en inputs con validación en tiempo real
   * Solo muestra errores después del primer "blur" (touched)
   */
  const handleChange = useCallback((field: keyof FormState, value: string) => {
      setForm(prev => ({ ...prev, [field]: value }))
    
      // Si cambia el correo, limpiamos el banner de email existente
      if (field === 'correo') {
        setEmailAlreadyExists(false)
      }
    
      // Validar en tiempo real solo si el campo ya fue "touched"
      if (touched[field]) {
        validateFieldOnChange(field, value)
      }
    }, [touched])

  /**
   * Marca el campo como "touched" y valida al perder foco
   */
  const handleBlur = useCallback((field: keyof FormState) => {
    setTouched(prev => ({ ...prev, [field]: true }))
    validateFieldOnChange(field, form[field])
  }, [form])

  /**
   * Valida un campo individual y actualiza el estado de errores
   */
  const validateFieldOnChange = (field: keyof FormState, value: string) => {
    let error: string | undefined

    switch (field) {
      case 'nombre':
        error = validateNombre(value)
        break
      case 'correo':
        error = validateCorreo(value)
        break
      case 'password':
        error = validatePassword(value)
        break
    }

    setErrors(prev => ({ ...prev, [field]: error }))
  }

  /**
   * Toggle visibility de la contraseña
   */
  const togglePasswordVisibility = () => {
    setShowPassword(prev => !prev)
  }

  // ═══════════════════════════════════════════════════════════════════════
  // SUBMIT HANDLER
  // ═══════════════════════════════════════════════════════════════════════

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setGlobalError(null)
    setEmailAlreadyExists(false)

    // ── 1. Validación local ────────────────────────────────────────────
    const allErrors = validateForm(form)
    setErrors(allErrors)
    setTouched({ nombre: true, correo: true, password: true })

    if (Object.keys(allErrors).length > 0) {
      const firstErrorField = Object.keys(allErrors)[0]
      const fieldIds: Record<string, string> = { nombre: 'fullName', correo: 'email', password: 'password' }
      document.getElementById(fieldIds[firstErrorField])?.focus()
      return
    }

    setIsLoading(true)

    try {
      // ── 2. Crear usuario con el Server Action ──────────
      const result = await signUpUser(
        form.nombre.trim(),
        form.correo.trim(),
        form.password,
      )

      if (result.error) {
        if (result.error === 'EMAIL_EXISTS') {
          setEmailAlreadyExists(true)
        } else if (result.error === 'RATE_LIMIT') {
          setGlobalError('Demasiados intentos. Por favor espera unos minutos e intenta de nuevo.')
        } else if (result.error === 'CONFIG_ERROR') {
          setGlobalError('Error de configuración del servidor. Por favor contacta al administrador.')
        } else if (result.error === 'UNEXPECTED_ERROR') {
          setGlobalError('Error inesperado en el servidor. Por favor intenta nuevamente en unos minutos.')
        } else {
          setGlobalError(result.error)
        }
        return
      }

      // ── 3. Éxito confirmado ────────────────────────────────────────
      setIsSuccess(true)
      resetForm()
      setTimeout(() => router.push('/login'), 3000)

    } catch (err) {
      console.error('Error inesperado en registro:', err)
      setGlobalError('Ocurrió un error inesperado. Por favor, intenta nuevamente.')
    } finally {
      setIsLoading(false)
    }
  }

  /**
   * Limpia todos los campos del formulario
   */
  const resetForm = () => {
      setForm({ nombre: '', correo: '', password: '' })
      setErrors({})
      setTouched({})
      setEmailAlreadyExists(false)
      setGlobalError(null)
    }

  // ═══════════════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════════════

  const showFieldError = (field: keyof FieldErrors) => touched[field] && errors[field]

  return (
    <div className="bg-surface font-body text-on-surface antialiased min-h-screen flex w-full">

      {/* ── Left Pane - Branding ─────────────────────────────────── */}
      <div className="hidden lg:block lg:w-1/2 relative bg-[#002045] isolate overflow-hidden">
        <img 
          src="/rooms/photo-1605797491749-0c6989a44356.jpg" 
          alt="Office background" 
          className="absolute inset-0 w-full h-full object-cover opacity-50 mix-blend-luminosity saturate-50"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-[#002045] via-[#002045]/60 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
        
        {/* Content */}
        <div className="absolute inset-0 flex flex-col justify-end p-12">
          <div className="max-w-md text-white drop-shadow-lg">
            <div className="flex items-center gap-4 mb-8">
              <div className="w-16 h-16 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20 shadow-[0_8px_30px_rgb(0,0,0,0.12)]">
                <img src="/logo.png" alt="Reservio Logo" className="w-9 h-9 object-contain drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]" />
              </div>
              <span className="font-headline text-4xl font-black tracking-wide text-white drop-shadow-md">Reservio</span>
            </div>
            <h2 className="font-headline text-5xl font-black mb-5 leading-[1.15] tracking-tight text-white drop-shadow-md">
              Excelencia en la<br/>Gestión de Recursos.
            </h2>
            <p className="font-body text-lg text-white/90 leading-relaxed">
              Plataforma integral para optimizar espacios y capital humano en entornos corporativos modernos.
            </p>
          </div>
        </div>
      </div>

      {/* ── Right Pane - Form ────────────────────────────────────── */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12 bg-surface">
        <div className="w-full max-w-md bg-surface-container-lowest rounded-2xl p-8 sm:p-10 shadow-2xl shadow-on-surface/5">

          {/* Header */}
                    <div className="mb-8 text-center">
                      <div className="flex justify-center md:hidden mb-6">
                        <div className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center shadow-lg shadow-primary/20">
                          <img src="/logo.png" alt="Reservio" className="w-9 h-9 object-contain drop-shadow-sm" />
                        </div>
                      </div>
                      <h2 className="font-headline text-2xl font-bold text-on-surface">
                        Crea tu cuenta
                      </h2>
                      <p className="font-body text-on-surface-variant mt-2">
                        Ingresa tus datos para comenzar
                      </p>
                    </div>

                    {/* ══════════════════════════════════════════════════════ */}
                    {/* EMAIL YA REGISTRADO - Banner prominente */}
                    {/* ══════════════════════════════════════════════════════ */}
                    {emailAlreadyExists && (
                      <div className="mb-6 p-5 rounded-xl bg-amber-50 border-2 border-amber-300 animate-fadeIn">
                        <div className="flex items-start gap-4">
                          <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
                            <span className="material-symbols-outlined text-amber-600 text-2xl">warning</span>
                          </div>
                          <div className="flex-1">
                            <p className="font-label text-base font-bold text-amber-800">
                              Esta cuenta de correo ya está registrada
                            </p>
                            <p className="font-label text-sm text-amber-700 mt-2">
                              El correo que ingresaste ya tiene una cuenta en Reservio.
                              {' '}Si ya tienes una cuenta, puedes{' '}
                              <Link
                                href="/login"
                                className="font-semibold text-amber-900 underline hover:text-amber-950"
                              >
                                iniciar sesión aquí
                              </Link>.
                            </p>
                            <button
                              type="button"
                              onClick={() => setEmailAlreadyExists(false)}
                              className="mt-3 text-sm font-medium text-amber-700 hover:text-amber-900 flex items-center gap-1 transition-colors"
                            >
                              <span className="material-symbols-outlined text-base">edit</span>
                              Usar otro correo
                            </button>
                          </div>
                        </div>
                      </div>
                    )}

          {/* ══════════════════════════════════════════════════════ */}
          {/* SUCCESS BANNER - Mostrado después de registro exitoso */}
          {/* ══════════════════════════════════════════════════════ */}
          {isSuccess && (
                      <div className="mb-6 p-4 rounded-xl bg-green-50 border border-green-200 animate-fadeIn">
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                            <span className="material-symbols-outlined text-green-600 text-xl">check_circle</span>
                          </div>
                          <div>
                            <p className="font-label text-base font-semibold text-green-800">
                              ¡Registro exitoso! Bienvenido a Reservio.
                            </p>
                            <p className="font-label text-sm text-green-700 mt-1">
                              Tu cuenta ha sido creada correctamente. Serás redirigido al inicio de sesión en unos segundos…
                            </p>
                          </div>
                        </div>
              
                        {/* Progress bar de redirección */}
                        <div className="mt-4 h-1 bg-green-100 rounded-full overflow-hidden">
                          <div className="h-full bg-green-500 rounded-full animate-shrink" style={{ width: '100%' }} />
                        </div>
                      </div>
                    )}

          {/* ══════════════════════════════════════════════════════ */}
          {/* GLOBAL ERROR - Error de Supabase */}
          {/* ══════════════════════════════════════════════════════ */}
          {globalError && !isSuccess && (
            <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 animate-fadeIn">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-red-600 text-xl">error</span>
                </div>
                <p className="font-label text-sm text-red-700 pt-2">{globalError}</p>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════ */}
          {/* FORM - Oculto después de éxito */}
          {/* ══════════════════════════════════════════════════════ */}
          <form
            onSubmit={handleSubmit}
            className={`space-y-5 ${isSuccess ? 'hidden' : ''}`}
            noValidate
          >
            {/* ── Nombre Completo ──────────────────────────────────── */}
            <div className="space-y-1.5">
              <label
                htmlFor="fullName"
                className="block font-label text-sm font-semibold text-on-surface"
              >
                Nombre Completo
              </label>
              <div className="relative">
                <input
                  id="fullName"
                  type="text"
                  placeholder="Ej. Ana García"
                  value={form.nombre}
                  onChange={(e) => handleChange('nombre', e.target.value)}
                  onBlur={() => handleBlur('nombre')}
                  className={getInputClasses(!!showFieldError('nombre'))}
                  autoComplete="name"
                  disabled={isLoading}
                />
                {showFieldError('nombre') && (
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                    <span className="material-symbols-outlined text-red-500">error</span>
                  </div>
                )}
              </div>
              {showFieldError('nombre') && (
                <FieldError message={errors.nombre!} />
              )}
            </div>

            {/* ── Correo Electrónico ───────────────────────────────── */}
            <div className="space-y-1.5">
              <label
                htmlFor="email"
                className="block font-label text-sm font-semibold text-on-surface"
              >
                Correo Electrónico
              </label>
              <div className="relative">
                <input
                  id="email"
                  type="email"
                  placeholder="ejemplo@empresa.com"
                  value={form.correo}
                  onChange={(e) => handleChange('correo', e.target.value)}
                  onBlur={() => handleBlur('correo')}
                  className={getInputClasses(!!showFieldError('correo'))}
                  autoComplete="email"
                  disabled={isLoading}
                />
                {showFieldError('correo') && (
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                    <span className="material-symbols-outlined text-red-500">error</span>
                  </div>
                )}
              </div>
              {showFieldError('correo') && (
                <FieldError message={errors.correo!} />
              )}
            </div>

            {/* ── Contraseña ───────────────────────────────────────── */}
            <div className="space-y-1.5">
              <label
                htmlFor="password"
                className="block font-label text-sm font-semibold text-on-surface"
              >
                Contraseña
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={form.password}
                  onChange={(e) => handleChange('password', e.target.value)}
                  onBlur={() => handleBlur('password')}
                  className={getInputClasses(!!showFieldError('password'), true)}
                  autoComplete="new-password"
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={togglePasswordVisibility}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-on-surface-variant hover:text-primary transition-colors"
                  aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                  disabled={isLoading}
                >
                  <span className="material-symbols-outlined">
                    {showPassword ? 'visibility_off' : 'visibility'}
                  </span>
                </button>
              </div>
              
              {/* Requisitos con indicadores visuales */}
              {form.password.length > 0 && (
                <PasswordRequirements password={form.password} />
              )}
              
              {/* Mensaje de error */}
              {showFieldError('password') && (
                <FieldError message={errors.password!} />
              )}
            </div>

            {/* ── Submit Button ────────────────────────────────────── */}
            <div className="pt-4">
              <button
                type="submit"
                disabled={isLoading || isSuccess}
                className={`
                  w-full flex justify-center items-center gap-2
                  py-3.5 px-4 rounded-xl text-base font-semibold
                  transition-all duration-300
                  disabled:opacity-60 disabled:cursor-not-allowed
                  ${isLoading
                    ? 'bg-primary/80 text-on-primary cursor-wait'
                    : 'bg-primary text-on-primary hover:bg-primary-container hover:shadow-lg hover:shadow-primary/20 active:scale-[0.98]'
                  }
                `}
              >
                {isLoading ? (
                  <>
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Registrando...
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined">how_to_reg</span>
                    Registrarme en Reservio
                  </>
                )}
              </button>
            </div>
          </form>

          {/* ── Footer - Link a Login ──────────────────────────────── */}
          {!isSuccess && (
            <div className="mt-8 pt-6 border-t border-outline-variant/20 text-center">
              <p className="font-body text-sm text-on-surface-variant">
                ¿Ya tienes cuenta?{' '}
                <Link
                  href="/login"
                  className="font-semibold text-primary hover:text-primary-container hover:underline transition-colors"
                >
                  Inicia sesión aquí
                </Link>
              </p>
            </div>
          )}

        </div>
      </div>

      {/* ── Animaciones CSS Inline ─────────────────────────────── */}
      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out;
        }
        @keyframes shrink {
          from { width: 100%; }
          to { width: 0%; }
        }
        .animate-shrink {
          animation: shrink 3s linear forwards;
        }
      `}</style>
    </div>
  )
}
