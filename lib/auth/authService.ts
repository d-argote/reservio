import { supabase, supabaseAdmin } from '../supabase/client'

export interface SignUpData {
  nombre: string
  correo: string
  password: string
}

/**
 * Verifica si un correo electrónico ya está registrado usando Admin API
 * Retorna true si el usuario ya existe, false en caso contrario
 */
export async function checkEmailExists(email: string): Promise<boolean> {
  try {
    // Usamos supabaseAdmin que tiene permisos de admin para listar usuarios
    const { data, error } = await supabaseAdmin.auth.admin.listUsers()
    
    if (error) {
      console.error('Error verificando email:', error)
      return false
    }
    
    // Busca si existe algún usuario con ese email
    const users = data?.users || []
    const emailLower = email.trim().toLowerCase()
    
    return users.some(user => user.email?.toLowerCase() === emailLower)
  } catch (err) {
    console.error('Excepción verificando email:', err)
    return false
  }
}

export async function signUp({ nombre, correo, password }: SignUpData) {
  const { data, error } = await supabase.auth.signUp({
    email: correo.trim().toLowerCase(),
    password,
    options: {
      data: { nombre },
    },
  })
  return { data, error }
}

/**
 * Traduce códigos de error de Supabase a mensajes amigables
 */
export function getAuthErrorMessage(error: { message?: string } | null): string {
  if (!error?.message) {
    return 'Ocurrió un error inesperado. Por favor, intenta nuevamente.'
  }
  
  const message = error.message.toLowerCase()
  
  // Email ya registrado - retorna código especial para manejar en el frontend
  if (message.includes('already registered') || 
      message.includes('already exists') || 
      message.includes('user already') ||
      message.includes('duplicate') ||
      message.includes('already been') ||
      message.includes('already use') ||
      message.includes('email address is already')) {
    return 'EMAIL_EXISTS'
  }
  
  // Contraseña muy débil
  if (message.includes('password') && (message.includes('weak') || message.includes('minimum') || message.includes('6 characters'))) {
    return 'La contraseña no cumple los requisitos mínimos de seguridad.'
  }
  
  // Email inválido
  if (message.includes('invalid email') || message.includes('valid email')) {
    return 'El formato del correo electrónico es inválido.'
  }
  
  // Rate limit
  if (message.includes('rate limit') || message.includes('too many')) {
    return 'Demasiados intentos. Por favor, espera unos minutos antes de intentar nuevamente.'
  }
  
  // Fallback
  return error.message || 'Ocurrió un error inesperado. Por favor, intenta nuevamente.'
}
