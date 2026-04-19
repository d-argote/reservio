import { supabase } from '../supabase/client'

export interface SignUpData {
  nombre: string
  correo: string
  password: string
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
 * Inicia sesión con email y contraseña
 */
export async function signIn(correo: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: correo.trim().toLowerCase(),
    password,
  })
  return { data, error }
}

/**
 * Cierra la sesión del usuario actual
 */
export async function signOut() {
  const { error } = await supabase.auth.signOut()
  return { error }
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

/**
 * Traduce errores de login de Supabase a mensajes amigables específicos
 */
export function getLoginErrorMessage(error: { message?: string } | null): string {
  if (!error?.message) {
    return 'Ocurrió un error inesperado. Por favor, intenta nuevamente.'
  }
  
  const message = error.message.toLowerCase()
  
  // Usuario no encontrado / Email no registrado
  if (message.includes('invalid login credentials') ||
      message.includes('invalid credentials') ||
      message.includes('no user') ||
      message.includes('not found') ||
      message.includes('user not found') ||
      message.includes('email not found')) {
    return 'Este usuario no está registrado. Por favor, crea una cuenta primero.'
  }
  
  // Contraseña incorrecta (usuario existe pero clave falla)
  if (message.includes('invalid password') ||
      message.includes('wrong password') ||
      message.includes('incorrect password')) {
    return 'Contraseña incorrecta. Inténtalo de nuevo.'
  }
  
  // Rate limit en login
  if (message.includes('rate limit') || 
      message.includes('too many requests') ||
      message.includes('too many attempts')) {
    return 'Demasiados intentos fallidos. Por favor, espera unos minutos antes de intentar nuevamente.'
  }
  
  // Email mal formado
  if (message.includes('invalid email') || 
      message.includes('valid email')) {
    return 'Correo incorrecto o debe registrarlo.'
  }
  
  // Fallback
  return 'Correo incorrecto o debe registrarlo.'
}
