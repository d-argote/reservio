'use client'

import { useState } from 'react'
import Link from 'next/link'
import { resetPasswordForEmail } from '@/lib/auth/serverActions'

export default function ForgotPasswordPage() {
  const [correo, setCorreo] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [globalError, setGlobalError] = useState<string | null>(null)
  const [isSuccess, setIsSuccess] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setGlobalError(null)

    if (!correo.trim()) {
      setGlobalError('Por favor, ingresa tu correo electrónico.')
      return
    }

    setIsLoading(true)
    const result = await resetPasswordForEmail(correo.trim())
    setIsLoading(false)

    if (result.error) {
      if (result.error === 'USER_NOT_FOUND') {
        // Por seguridad, puedes simular éxito incluso si el email no existe, 
        // pero aquí mostramos el error según la lógica de tu app.
        setGlobalError('No encontramos una cuenta con ese correo electrónico.')
      } else if (result.error === 'RATE_LIMIT') {
        setGlobalError('Demasiados intentos. Por favor espera unos minutos.')
      } else {
        setGlobalError('Ocurrió un error inesperado. Inténtalo de nuevo.')
      }
      return
    }

    setIsSuccess(true)
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
            Recupera tu contraseña
          </h2>
          <p className="font-body text-on-surface-variant mt-2 text-sm">
            Ingresa tu correo y te enviaremos un enlace para crear una nueva.
          </p>
        </div>

        {isSuccess ? (
          <div className="text-center animate-fadeIn">
            <div className="mb-6 p-5 rounded-xl bg-green-50 border border-green-200">
              <span className="material-symbols-outlined text-green-600 text-4xl mb-2">mark_email_read</span>
              <p className="font-label text-base font-semibold text-green-800">
                ¡Correo enviado!
              </p>
              <p className="font-body text-sm text-green-700 mt-2">
                Revisa tu bandeja de entrada. Hemos enviado un enlace a <strong>{correo}</strong> para restablecer tu contraseña.
              </p>
            </div>
            <Link href="/login" className="inline-flex items-center justify-center gap-2 w-full py-3.5 px-4 rounded-xl text-base font-semibold bg-surface-container hover:bg-surface-container-high transition-all text-on-surface">
              <span className="material-symbols-outlined">arrow_back</span>
              Volver al inicio de sesión
            </Link>
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
              <label htmlFor="email" className="block font-label text-sm font-semibold text-on-surface">
                Correo Electrónico
              </label>
              <input
                id="email"
                type="email"
                placeholder="nombre@empresa.com"
                value={correo}
                onChange={(e) => setCorreo(e.target.value)}
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
                {isLoading ? 'Enviando...' : 'Enviar enlace de recuperación'}
              </button>
              
              <Link href="/login" className="w-full flex justify-center items-center gap-2 py-3.5 px-4 rounded-xl text-sm font-semibold text-secondary hover:text-primary transition-all">
                Cancelar y volver
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
