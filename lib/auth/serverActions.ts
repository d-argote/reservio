'use server'

import { supabaseAdmin } from '../supabase/serverClient'
import { supabase } from '../supabase/client'

export interface EnsureUserResult {
  ok: boolean
  error?: string
}

export interface RegisterResult {
  ok: boolean
  error?: string
}

/**
 * Crea un usuario nuevo usando el cliente admin (service role).
 * - Bypasa toda la lógica de envío de email (email_confirm: true).
 * - Inserta el perfil en public.usuarios en el mismo paso.
 * - Es la única fuente de verdad para el registro.
 */
export async function registerUser(
  nombre: string,
  correo: string,
  password: string,
): Promise<RegisterResult> {
  const email = correo.trim().toLowerCase()
  const name  = nombre.trim()

  // 1. Crear usuario en auth.users (sin enviar ningún email)
  const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,          // usuario confirmado de inmediato, sin email
    user_metadata: { nombre: name },
  })

  if (authError) {
    console.error('Error creando usuario en auth:', authError)
    // Detectar email duplicado
    if (
      authError.message.includes('already registered') ||
      authError.message.includes('already exists') ||
      authError.message.includes('duplicate')
    ) {
      return { ok: false, error: 'EMAIL_EXISTS' }
    }
    return { ok: false, error: authError.message }
  }

  if (!authData?.user?.id) {
    return { ok: false, error: 'No se obtuvo el ID del usuario creado.' }
  }

  // 2. Insertar en public.usuarios (service role bypasa RLS)
  const { error: dbError } = await supabaseAdmin
    .from('usuarios')
    .upsert(
      { id: authData.user.id, nombre: name, correo: email, rol: 'usuario' },
      { onConflict: 'id' },
    )

  if (dbError) {
    console.error('Error insertando en public.usuarios:', dbError)
    // Limpiar el usuario de auth para no dejar datos huérfanos
    await supabaseAdmin.auth.admin.deleteUser(authData.user.id)
    return { ok: false, error: 'Error al guardar el perfil. Intenta de nuevo.' }
  }

  return { ok: true }
}

/**
 * Inserta o actualiza el perfil del usuario en public.usuarios.
 * Usa service role key para bypass de RLS — solo se llama desde Server Actions.
 */
export async function ensureUserProfile(
  id: string,
  nombre: string,
  correo: string
): Promise<EnsureUserResult> {
  const { error } = await supabaseAdmin
    .from('usuarios')
    .upsert(
      { id, nombre: nombre.trim(), correo: correo.trim().toLowerCase(), rol: 'usuario' },
      { onConflict: 'id' }
    )

  if (error) {
    console.error('Error insertando perfil en public.usuarios:', error)
    return { ok: false, error: error.message }
  }

  return { ok: true }
}

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
