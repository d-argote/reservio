'use server'

import { supabaseAdmin } from '../supabase/serverClient'
import { supabase } from '../supabase/client'

export type LoginErrorType =
  | 'USER_NOT_FOUND'
  | 'INVALID_PASSWORD'
  | 'INVALID_EMAIL'
  | 'RATE_LIMIT'
  | 'UNKNOWN'

export interface LoginResult {
  data: any
  error: any
  errorType?: LoginErrorType
}

/**
 * Verifica si un correo electrónico ya está registrado.
 * Ejecuta en el servidor — la service role key nunca llega al browser.
 */
export async function checkEmailExists(email: string): Promise<boolean> {
  try {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers()
    if (error) {
      console.error('Error verificando email:', error)
      return false
    }
    const emailLower = email.trim().toLowerCase()
    return (data?.users ?? []).some(u => u.email?.toLowerCase() === emailLower)
  } catch (err) {
    console.error('Excepción verificando email:', err)
    return false
  }
}

/**
 * Inicia sesión con verificación previa del email.
 * Retorna el tipo de error específico para mostrar mensajes adecuados.
 */
export async function signInWithVerification(
  correo: string,
  password: string
): Promise<LoginResult> {
  const email = correo.trim().toLowerCase()

  try {
    const emailExists = await checkEmailExists(email)

    const { data, error } = await supabase.auth.signInWithPassword({ email, password })

    if (!error) return { data, error: null, errorType: undefined }

    const errorMessage = error.message.toLowerCase()

    if (
      errorMessage.includes('invalid login credentials') ||
      errorMessage.includes('invalid credentials')
    ) {
      return {
        data: null,
        error,
        errorType: emailExists ? 'INVALID_PASSWORD' : 'USER_NOT_FOUND',
      }
    }

    if (errorMessage.includes('rate limit') || errorMessage.includes('too many')) {
      return { data: null, error, errorType: 'RATE_LIMIT' }
    }

    if (errorMessage.includes('invalid email') || errorMessage.includes('valid email')) {
      return { data: null, error, errorType: 'INVALID_EMAIL' }
    }

    return { data: null, error, errorType: 'UNKNOWN' }
  } catch (err) {
    console.error('Error en signInWithVerification:', err)
    return {
      data: null,
      error: { message: 'Ocurrió un error inesperado. Por favor, intenta nuevamente.' },
      errorType: 'UNKNOWN',
    }
  }
}
