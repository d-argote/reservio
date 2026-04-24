'use server'

import { createClient } from '../supabase/server'
import { supabaseAdmin } from '../supabase/admin'

export async function signUpUser(nombre: string, correo: string, password: string) {
  const supabase = await createClient()
  const email = correo.trim().toLowerCase()

  // 1. Verificar si el email ya existe
  const emailExists = await checkEmailExists(email)
  if (emailExists) {
    return { error: 'EMAIL_EXISTS' }
  }

  // 2. Registrar usuario (esto enviará el email de confirmación si está activado en Supabase)
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { nombre },
    },
  })

  if (error) {
    console.error('Error en signUp:', error)
    return { error: error.message }
  }

  return { success: true }
}

export async function loginUser(correo: string, password: string) {
  const supabase = await createClient()
  const email = correo.trim().toLowerCase()

  const { data, error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    const errorMessage = error.message.toLowerCase()
    const emailExists = await checkEmailExists(email)

    if (errorMessage.includes('invalid login credentials') || errorMessage.includes('invalid credentials')) {
      return { error: emailExists ? 'INVALID_PASSWORD' : 'USER_NOT_FOUND' }
    }

    if (errorMessage.includes('rate limit') || errorMessage.includes('too many')) {
      return { error: 'RATE_LIMIT' }
    }

    if (errorMessage.includes('invalid email') || errorMessage.includes('valid email')) {
      return { error: 'INVALID_EMAIL' }
    }

    return { error: 'UNKNOWN' }
  }

  return { success: true }
}

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

// ═══════════════════════════════════════════════════════════════════════════════
// RECUPERACIÓN DE CONTRASEÑA
// ═══════════════════════════════════════════════════════════════════════════════

export async function resetPasswordForEmail(correo: string) {
  const supabase = await createClient()
  const email = correo.trim().toLowerCase()

  // Verificamos si el usuario existe para evitar correos fantasma
  const emailExists = await checkEmailExists(email)
  if (!emailExists) {
    return { error: 'USER_NOT_FOUND' }
  }

  // Obtenemos la URL base desde el entorno
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${siteUrl}/auth/callback?next=/reset-password`,
  })

  if (error) {
    console.error('Error enviando correo de recuperación:', error)
    if (error.message.includes('rate limit')) return { error: 'RATE_LIMIT' }
    return { error: error.message }
  }

  return { success: true }
}

export async function updatePassword(newPassword: string) {
  const supabase = await createClient()

  // Actualiza la contraseña del usuario actualmente autenticado (la sesión se establece vía el link de recuperación)
  const { error } = await supabase.auth.updateUser({
    password: newPassword
  })

  if (error) {
    console.error('Error actualizando contraseña:', error)
    return { error: error.message }
  }

  return { success: true }
}
