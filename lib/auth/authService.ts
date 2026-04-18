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
 * Tipos de error de login específicos
 */
export type LoginErrorType = 
  | 'USER_NOT_FOUND'
  | 'INVALID_PASSWORD'
  | 'INVALID_EMAIL'
  | 'RATE_LIMIT'
  | 'UNKNOWN'

/**
 * Resultado de login con información detallada del error
 */
export interface LoginResult {
  data: any
  error: any
  errorType?: LoginErrorType
}

/**
 * Inicia sesión con verificación previa del email
 * Retorna el tipo de error específico para mostrar mensajes adecuados
 */
export async function signInWithVerification(correo: string, password: string): Promise<LoginResult> {
  const email = correo.trim().toLowerCase()
  
  try {
    // Paso 1: Verificar si el email existe usando Admin API
    const emailExists = await checkEmailExists(email)
    
    // Paso 2: Intentar el login
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    
    // Si no hay error, el login fue exitoso
    if (!error) {
      return { data, error: null, errorType: undefined }
    }
    
    // Paso 3: Determinar el tipo de error basado en la verificación previa
    const errorMessage = error.message.toLowerCase()
    
    // Error de credenciales inválidas
    if (errorMessage.includes('invalid login credentials') || 
        errorMessage.includes('invalid credentials')) {
      
      if (emailExists) {
        // El email existe pero la contraseña es incorrecta
        return { data: null, error, errorType: 'INVALID_PASSWORD' }
      } else {
        // El email NO existe en la base de datos
        return { data: null, error, errorType: 'USER_NOT_FOUND' }
      }
    }
    
    // Otros errores específicos
    if (errorMessage.includes('rate limit') || errorMessage.includes('too many')) {
      return { data: null, error, errorType: 'RATE_LIMIT' }
    }
    
    if (errorMessage.includes('invalid email') || errorMessage.includes('valid email')) {
      return { data: null, error, errorType: 'INVALID_EMAIL' }
    }
    
    // Error desconocido
    return { data: null, error, errorType: 'UNKNOWN' }
    
  } catch (err) {
    console.error('Error en signInWithVerification:', err)
    return { 
      data: null, 
      error: { message: 'Ocurrió un error inesperado. Por favor, intenta nuevamente.' },
      errorType: 'UNKNOWN' 
    }
  }
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
