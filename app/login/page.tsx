'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { loginUser } from '@/lib/auth/serverActions'

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
    <div className="bg-surface font-body text-on-surface antialiased min-h-screen flex w-full">
      <div className="hidden lg:block lg:w-1/2 relative bg-[#002045] isolate overflow-hidden">
        <img 
          src="/rooms/fondo.jpg" 
          alt="Office background" 
          className="absolute inset-0 w-full h-full object-cover opacity-50 mix-blend-luminosity saturate-50"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-[#002045] via-[#002045]/60 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
        
        <div className="absolute inset-0 flex flex-col justify-between p-10 xl:p-14 z-10">
          {/* Logo centrado y adaptable */}
          <div className="flex-1 flex items-center justify-center overflow-visible -mt-24">
            <img
              src="/logo.png"
              alt="Reservio Logo"
              className="w-full h-full object-contain scale-[1.35] drop-shadow-[0_8px_40px_rgba(255,255,255,0.35)]"
            />
          </div>
          {/* Texto anclado abajo */}
          <div className="max-w-md text-white">
            <h2 className="font-headline text-4xl xl:text-5xl font-black mb-3 leading-[1.15] tracking-tight drop-shadow-md">
              Excelencia en la<br/>Gestión de Recursos.
            </h2>
            <p className="font-body text-base xl:text-lg text-white/80 leading-relaxed">
              Plataforma integral para optimizar espacios y capital humano en entornos corporativos modernos.
            </p>
          </div>
        </div>
      </div>

      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12 bg-surface">
        <div className="w-full max-w-md bg-surface-container-lowest rounded-2xl p-8 sm:p-10 shadow-2xl shadow-on-surface/5">
          <div className="text-center mb-8">
            <div className="flex justify-center md:hidden mb-6">
              <div className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center shadow-lg shadow-primary/20">
                <img src="/logo.png" alt="Reservio" className="w-9 h-9 object-contain drop-shadow-sm" />
              </div>
            </div>
            <h2 className="font-headline text-2xl font-bold text-on-surface">
              Bienvenido a Reservio
            </h2>
            <p className="font-body text-on-surface-variant mt-2">
              Ingresa tus credenciales para continuar
            </p>
          </div>

          {isSuccess && (
            <div className="mb-6 p-4 rounded-xl bg-green-50 border border-green-200 animate-fadeIn">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-green-600 text-xl">check_circle</span>
                </div>
                <div>
                  <p className="font-label text-base font-semibold text-green-800">
                    Bienvenido de nuevo a Reservio!
                  </p>
                  <p className="font-label text-sm text-green-700 mt-1">
                    Redirigiendo al dashboard...
                  </p>
                </div>
              </div>
            </div>
          )}

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

          <form onSubmit={handleSubmit} className={`space-y-5 ${isSuccess ? 'hidden' : ''}`}>
            <div className="space-y-1.5">
              <label htmlFor="email" className="block font-label text-sm font-semibold text-on-surface">
                Correo Electronico
              </label>
              <input
                id="email"
                type="email"
                placeholder="nombre@empresa.com"
                value={correo}
                onChange={(e) => setCorreo(e.target.value)}
                className="w-full rounded-lg px-4 py-3 bg-surface-container-highest border border-outline-variant/15 text-on-surface focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 placeholder:text-on-surface-variant/50 transition-all"
                autoComplete="email"
                disabled={isLoading}
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="password" className="block font-label text-sm font-semibold text-on-surface">
                Contrasena
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder=""
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-lg px-4 py-3 pr-10 bg-surface-container-highest border border-outline-variant/15 text-on-surface focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 placeholder:text-on-surface-variant/50 transition-all"
                  autoComplete="current-password"
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-on-surface-variant hover:text-primary transition-colors"
                  disabled={isLoading}
                >
                  <span className="material-symbols-outlined">
                    {showPassword ? 'visibility_off' : 'visibility'}
                  </span>
                </button>
              </div>
            </div>

            <div className="flex justify-end -mt-2">
              <Link href="/forgot-password" className="text-sm font-medium text-secondary hover:text-primary transition-colors">
                Olvidaste tu contrasena?
              </Link>
            </div>

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
                    Cargando...
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined">arrow_forward</span>
                    Iniciar Sesion
                  </>
                )}
              </button>
            </div>
          </form>

          {!isSuccess && (
            <div className="mt-8 pt-6 border-t border-outline-variant/20 text-center">
              <p className="font-body text-sm text-on-surface-variant">
                No tienes cuenta?{' '}
                <Link href="/register" className="font-semibold text-primary hover:text-primary-container hover:underline transition-colors">
                  Registrate aqui
                </Link>
              </p>
            </div>
          )}
        </div>
      </div>

      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out;
        }
      `}</style>
    </div>
  )
}
