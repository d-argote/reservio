'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { updatePassword } from '@/features/auth/actions'

export default function ResetPasswordPage() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [globalError, setGlobalError] = useState<string | null>(null)
  const [isSuccess, setIsSuccess] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setGlobalError(null)

    if (password.length < 8) {
      setGlobalError('La contraseña debe tener al menos 8 caracteres.')
      return
    }

    if (password !== confirmPassword) {
      setGlobalError('Las contraseñas no coinciden.')
      return
    }

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
              <input
                id="new-password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-lg px-4 py-3 bg-surface-container-highest border border-outline-variant/15 text-on-surface focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                disabled={isLoading}
                required
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="confirm-password" className="block font-label text-sm font-semibold text-on-surface">
                Confirmar Contraseña
              </label>
              <input
                id="confirm-password"
                type="password"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full rounded-lg px-4 py-3 bg-surface-container-highest border border-outline-variant/15 text-on-surface focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                disabled={isLoading}
                required
              />
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
