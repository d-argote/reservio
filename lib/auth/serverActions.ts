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
