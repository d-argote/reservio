'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { signUp, checkEmailExists } from '@/lib/auth/authService'

// ═══════════════════════════════════════════════════════════════════════════════
// VALIDACIÓN SIMPLIFICADA - Reglas más flexibles y amigables
// ═══════════════════════════════════════════════════════════════════════════════
const VALIDATION_RULES = {
  correo: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
} as const

// Constantes de validación
const MIN_NOMBRE_LENGTH = 2
const MIN_PASSWORD_LENGTH = 6

// ═══════════════════════════════════════════════════════════════════════════════
// MENSAJES DE ERROR - Texto amigable y claro para cada validación
// ═══════════════════════════════════════════════════════════════════════════════
const ERROR_MESSAGES = {
  nombre: {
    required: 'El nombre es obligatorio.',
    minLength: `El nombre debe tener al menos ${MIN_NOMBRE_LENGTH} caracteres.`,
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
const AUTH_ERROR_MAP: Record<string, string> = {
  'already registered': 'Este correo ya está registrado. Intenta iniciar sesión.',
  'already exists': 'Este correo ya está registrado. Intenta iniciar sesión.',
  'user already registered': 'Este correo ya está registrado. Intenta iniciar sesión.',
  'password': 'La contraseña no cumple los requisitos mínimos de seguridad.',
  'email': 'El formato del correo electrónico es inválido.',
  'invalid email': 'El correo electrónico ingresado no es válido.',
  'signup': 'No se pudo completar el registro. Intenta nuevamente.',
}

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
 * - Mínimo 6 caracteres (estándar de Supabase)
 * - Sin requisito de carácter especial
 */
function validatePassword(value: string): string | undefined {
  if (!value) return ERROR_MESSAGES.password.required
  if (value.length < MIN_PASSWORD_LENGTH) return ERROR_MESSAGES.password.minLength
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
  const lowerMessage = message.toLowerCase()
  
  for (const [key, value] of Object.entries(AUTH_ERROR_MAP)) {
    if (lowerMessage.includes(key.toLowerCase())) {
      // Si es un error de email ya registrado, retorna el código especial
      if (key === 'already registered' || key === 'already exists') {
        return EMAIL_EXISTS_CODE
      }
      return value
    }
  }
  
  // Fallback: mensaje genérico pero descriptivo
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
 * Solo muestra el requisito de longitud mínima (6 caracteres)
 */
function PasswordRequirements({ password }: { password: string }) {
  const met = password.length >= MIN_PASSWORD_LENGTH

  return (
    <div className="mt-2">
      <div
        className={`flex items-center gap-2 text-xs transition-colors ${
          met ? 'text-green-600' : 'text-on-surface-variant/60'
        }`}
      >
        <span className={`material-symbols-outlined text-sm ${met ? 'text-green-500' : ''}`}>
          {met ? 'check_circle' : 'radio_button_unchecked'}
        </span>
        Mínimo {MIN_PASSWORD_LENGTH} caracteres
      </div>
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

    // ── Validación completa del formulario ──────────────────────────
    const allErrors = validateForm(form)
    setErrors(allErrors)
    setTouched({ nombre: true, correo: true, password: true })

    // Si hay errores, NO ejecutar el submit
    if (Object.keys(allErrors).length > 0) {
      // Scroll al primer error para mejor UX
      const firstErrorField = Object.keys(allErrors)[0]
      const fieldIds: Record<string, string> = {
        nombre: 'fullName',
        correo: 'email',
        password: 'password',
      }
      document.getElementById(fieldIds[firstErrorField])?.focus()
      return
    }

    // ── VERIFICACIÓN PREVIA: ¿El email ya existe? ───────────────────
        setIsLoading(true)
    
        const emailExists = await checkEmailExists(form.correo.trim())
    
        if (emailExists) {
          setIsLoading(false)
          setEmailAlreadyExists(true)
          setErrors({}) // Limpiar errores del formulario
          return
        }

        // ── Llamada a Supabase (sin errores de validación) ─────────────
        const { error: authError } = await signUp({
          nombre: form.nombre.trim(),
          correo: form.correo.trim(),
          password: form.password,
        })

        setIsLoading(false)

        // ── Manejo de errores de Supabase ───────────────────────────────
        if (authError) {
              const errorMsg = translateAuthError(authError.message)
      
              // Verificar si es un error de email ya registrado
              if (errorMsg === EMAIL_EXISTS_CODE) {
                setEmailAlreadyExists(true)
                setGlobalError(null)
              } else {
                setGlobalError(errorMsg)
                setEmailAlreadyExists(false)
              }
              return
            }

    // ── ÉXITO ───────────────────────────────────────────────────────
    setIsSuccess(true)
    resetForm()

    // Redirección automática después de 3 segundos
    setTimeout(() => {
      router.push('/login')
    }, 3000)
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
      <div
        className="hidden lg:block lg:w-1/2 relative bg-surface-container-low"
        style={{
          backgroundImage: "url('https://images.unsplash.com/photo-1497366216548-37526070297c?w=1200&q=80')",
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        {/* Overlay gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/85 via-primary/70 to-primary-container/50" />
        
        {/* Content */}
        <div className="absolute inset-0 flex flex-col justify-end p-12">
          <div className="max-w-md text-white drop-shadow-lg">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                <span className="material-symbols-outlined text-white text-2xl">domain</span>
              </div>
              <span className="font-headline text-2xl font-bold tracking-wide">Reservio</span>
            </div>
            <h2 className="font-headline text-4xl font-bold mb-4 leading-tight">
              Excelencia en la Gestión de Recursos.
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
