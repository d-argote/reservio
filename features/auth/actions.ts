'use server'

import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'

export async function signUpUser(nombre: string, correo: string, password: string) {
  try {
    // ── Validación de variables de entorno ─────────────────────────────
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
      console.error('[signUpUser] CRÍTICO: NEXT_PUBLIC_SUPABASE_URL no está configurada')
      return { error: 'CONFIG_ERROR' }
    }
    if (!process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) {
      console.error('[signUpUser] CRÍTICO: NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY no está configurada')
      return { error: 'CONFIG_ERROR' }
    }

    const supabase = await createClient()
    const email = correo.trim().toLowerCase()

    // ── 1. Verificar si el email ya existe (solo si admin disponible) ──
    const emailExists = await checkEmailExists(email)
    if (emailExists) {
      return { error: 'EMAIL_EXISTS' }
    }

    // ── 2. Registrar usuario ───────────────────────────────────────────
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { nombre },
      },
    })

    if (error) {
      console.error('[signUpUser] Error de Supabase:', error.message, '| Status:', error.status, '| Code:', (error as any).code)
      // Detectar email ya existente por respuesta de Supabase
      const msg = error.message.toLowerCase()
      const code = ((error as any).code ?? '').toLowerCase()
      if (
        msg.includes('already registered') ||
        msg.includes('already exists') ||
        msg.includes('duplicate') ||
        code === 'email_exists' ||
        code === 'user_already_exists'
      ) {
        return { error: 'EMAIL_EXISTS' }
      }
      if (msg.includes('rate limit') || msg.includes('too many')) {
        return { error: 'RATE_LIMIT' }
      }
      if (msg.includes('sending') || msg.includes('smtp') || msg.includes('email delivery')) {
        // Usuario creado pero fallo en el correo — éxito parcial
        console.warn('[signUpUser] Fallo SMTP pero usuario creado:', email)
        return { success: true }
      }
      return { error: error.message }
    }

    console.log('[signUpUser] Usuario registrado exitosamente:', email)
    return { success: true }

  } catch (err: unknown) {
    // Este catch atrapa todos los errores incluyendo red, CORS, timeouts
    const message = err instanceof Error ? err.message : String(err)
    console.error('[signUpUser] Excepción no controlada:', message, err)
    // Traducir errores de red a un código manejable
    if (message.includes('fetch') || message.includes('network') || message.includes('ENOTFOUND') || message.includes('ECONNREFUSED')) {
      return { error: 'NETWORK_ERROR' }
    }
    return { error: 'UNEXPECTED_ERROR' }
  }
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

  // Verificar si el usuario está activo
  const admin = getSupabaseAdmin()
  if (!admin) return { success: true } // si no hay admin client, permitir el login
  const { data: userRecord } = await admin
    .from('usuarios')
    .select('activo')
    .eq('id', data.user.id)
    .single()

  if (userRecord && userRecord.activo === false) {
    await supabase.auth.signOut()
    return { error: 'USER_INACTIVE' }
  }

  return { success: true }
}

export async function checkEmailExists(email: string): Promise<boolean> {
  try {
    const admin = getSupabaseAdmin()
    if (!admin) {
      console.warn('[checkEmailExists] Cliente Admin no disponible, omitiendo verificación.')
      return false
    }

    const { data, error } = await admin.auth.admin.listUsers()
    if (error) {
      console.error('[checkEmailExists] Error al listar usuarios:', error.message)
      return false
    }

    const emailLower = email.trim().toLowerCase()
    return (data?.users ?? []).some(u => u.email?.toLowerCase() === emailLower)
  } catch (err) {
    console.error('[checkEmailExists] Excepción inesperada:', err)
    return false
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// RECUPERACIÓN DE CONTRASEÑA
// ═══════════════════════════════════════════════════════════════════════════════

export async function resetPasswordForEmail(correo: string) {
  const supabase = await createClient()
  const email = correo.trim().toLowerCase()

  // Solo bloqueamos si tenemos la key admin Y confirmamos que el usuario NO existe
  // Si la key no está configurada, dejamos que Supabase lo maneje
  if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
    const emailExists = await checkEmailExists(email)
    if (!emailExists) {
      return { error: 'USER_NOT_FOUND' }
    }
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
