'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { updatePassword } from '@/features/auth/actions'

// ═══════════════════════════════════════════════════════════════════════════════
// VALIDACIÓN DE CONTRASEÑA
// ═══════════════════════════════════════════════════════════════════════════════
const MIN_PASSWORD_LENGTH = 8

function validatePassword(value: string): string | undefined {
  if (!value) return 'La contraseña es obligatoria.'
  if (value.length < MIN_PASSWORD_LENGTH) return `La contraseña debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres.`
  if (!/[A-Z]/.test(value)) return 'La contraseña debe tener al menos una letra mayúscula.'
  if (!/[a-z]/.test(value)) return 'La contraseña debe tener al menos una letra minúscula.'
  if (!/[0-9]/.test(value)) return 'La contraseña debe tener al menos un número.'
  if (!/[^a-zA-Z0-9]/.test(value)) return 'La contraseña debe tener al menos un carácter especial.'  
  return undefined
}

function PasswordRequirements({ password }: { password: string }) {
  const requirements = [
    { label: `Mínimo ${MIN_PASSWORD_LENGTH} caracteres`, met: password.length >= MIN_PASSWORD_LENGTH },
    { label: 'Una letra mayúscula', met: /[A-Z]/.test(password) },
    { label: 'Una letra minúscula', met: /[a-z]/.test(password) },
    { label: 'Un número', met: /[0-9]/.test(password) },
    { label: 'Un carácter especial', met: /[^a-zA-Z0-9]/.test(password) },
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

function FieldError({ message }: { message: string }) {
  return (
    <p className="flex items-center gap-1.5 text-sm text-red-600 mt-2 animate-fadeIn">
      <span className="material-symbols-outlined text-base leading-none shrink-0">error</span>
      <span>{message}</span>
    </p>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════════════
export default function ResetPasswordPage() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordError, setPasswordError] = useState<string | undefined>()
  const [confirmError, setConfirmError] = useState<string | undefined>()
  const [touchedPassword, setTouchedPassword] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [globalError, setGlobalError] = useState<string | null>(null)
  const [isSuccess, setIsSuccess] = useState(false)

  const handlePasswordChange = (value: string) => {
    setPassword(value)
    if (touchedPassword) {
      setPasswordError(validatePassword(value))
    }
    if (confirmPassword) {
      setConfirmError(value !== confirmPassword ? 'Las contraseñas no coinciden.' : undefined)
    }
  }

  const handleConfirmChange = (value: string) => {
    setConfirmPassword(value)
    setConfirmError(value !== password ? 'Las contraseñas no coinciden.' : undefined)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setGlobalError(null)

    const pwError = validatePassword(password)
    const cfError = password !== confirmPassword ? 'Las contraseñas no coinciden.' : undefined

    setPasswordError(pwError)
    setConfirmError(cfError)
    setTouchedPassword(true)

    if (pwError || cfError) return

    setIsLoading(true)
    const result = await updatePassword(password)
    setIsLoading(false)

    if (result.error) {
      setGlobalError('No se pudo actualizar la contraseña. Es posible que el enlace haya expirado.')
      return
    }

    setIsSuccess(true)
    setTimeout(() => {
      router.push('/login')
    }, 3000)
  }

  return (
    <div className="bg-surface font-body text-on-surface antialiased min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-surface-container-lowest rounded-2xl p-8 sm:p-10 shadow-2xl shadow-on-surface/5">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center shadow-lg shadow-primary/20">
              <img src="/logo.png" alt="Reservio Logo" className="w-9 h-9 object-contain drop-shadow-sm" />
            </div>
          </div>
          <h2 className="font-headline text-2xl font-bold text-on-surface">
            Crea tu nueva contraseña
          </h2>
          <p className="font-body text-on-surface-variant mt-2 text-sm">
            Asegúrate de usar una contraseña segura.
          </p>
        </div>

        {isSuccess ? (
          <div className="text-center animate-fadeIn">
            <div className="mb-6 p-5 rounded-xl bg-green-50 border border-green-200">
              <span className="material-symbols-outlined text-green-600 text-4xl mb-2">check_circle</span>
              <p className="font-label text-base font-semibold text-green-800">
                Contraseña actualizada
              </p>
              <p className="font-body text-sm text-green-700 mt-2">
                Tu contraseña ha sido cambiada exitosamente. Redirigiendo al inicio de sesión...
              </p>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            {globalError && (
              <div className="p-4 rounded-xl bg-red-50 border border-red-200 animate-fadeIn flex items-start gap-3">
                <span className="material-symbols-outlined text-red-600">error</span>
                <p className="font-label text-sm text-red-700 pt-0.5">{globalError}</p>
              </div>
            )}

            <div className="space-y-1.5">
              <label htmlFor="new-password" className="block font-label text-sm font-semibold text-on-surface">
                Nueva Contraseña
              </label>
              <div className="relative">
                <input
                  id="new-password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => handlePasswordChange(e.target.value)}
                  onBlur={() => {
                    setTouchedPassword(true)
                    setPasswordError(validatePassword(password))
                  }}
                  className={`w-full rounded-lg px-4 py-3 pr-10 text-on-surface focus:outline-none focus:ring-2 transition-all duration-200 placeholder:text-on-surface-variant/50 ${
                    passwordError
                      ? 'bg-red-50 border-2 border-red-500 focus:ring-red-200 focus:border-red-500'
                      : 'bg-surface-container-highest border border-outline-variant/15 focus:border-primary focus:ring-primary/20'
                  }`}
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(p => !p)}
                  className="absolute inset-y-0 right-3 flex items-center text-on-surface-variant hover:text-on-surface transition-colors"
                  tabIndex={-1}
                >
                  <span className="material-symbols-outlined text-xl">
                    {showPassword ? 'visibility_off' : 'visibility'}
                  </span>
                </button>
              </div>
              {password && <PasswordRequirements password={password} />}
              {passwordError && <FieldError message={passwordError} />}
            </div>

            <div className="space-y-1.5">
              <label htmlFor="confirm-password" className="block font-label text-sm font-semibold text-on-surface">
                Confirmar Contraseña
              </label>
              <div className="relative">
                <input
                  id="confirm-password"
                  type={showConfirm ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => handleConfirmChange(e.target.value)}
                  className={`w-full rounded-lg px-4 py-3 pr-10 text-on-surface focus:outline-none focus:ring-2 transition-all duration-200 placeholder:text-on-surface-variant/50 ${
                    confirmError
                      ? 'bg-red-50 border-2 border-red-500 focus:ring-red-200 focus:border-red-500'
                      : 'bg-surface-container-highest border border-outline-variant/15 focus:border-primary focus:ring-primary/20'
                  }`}
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(p => !p)}
                  className="absolute inset-y-0 right-3 flex items-center text-on-surface-variant hover:text-on-surface transition-colors"
                  tabIndex={-1}
                >
                  <span className="material-symbols-outlined text-xl">
                    {showConfirm ? 'visibility_off' : 'visibility'}
                  </span>
                </button>
              </div>
              {confirmError && <FieldError message={confirmError} />}
            </div>

            <div className="pt-4 space-y-3">
              <button
                type="submit"
                disabled={isLoading}
                className={`w-full flex justify-center items-center gap-2 py-3.5 px-4 rounded-xl text-base font-semibold transition-all duration-300 disabled:opacity-60 disabled:cursor-not-allowed ${
                  isLoading ? 'bg-primary/80 text-on-primary cursor-wait' : 'bg-primary text-on-primary hover:bg-primary-container'
                }`}
              >
                {isLoading ? 'Actualizando...' : 'Guardar nueva contraseña'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
