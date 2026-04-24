import { createClient as createSupabaseClient } from '@supabase/supabase-js'

/**
 * Obtiene el cliente de administración de Supabase de forma segura.
 * Se usa una función para evitar que falle la carga del módulo si las variables
 * no están disponibles en el momento exacto de la importación.
 */
export const getSupabaseAdmin = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !key) {
    console.error('[Admin] Error: Faltan variables de entorno para el cliente Admin.')
    return null
  }

  try {
    return createSupabaseClient(url, key, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })
  } catch (err) {
    console.error('[Admin] Error al inicializar el cliente Admin:', err)
    return null
  }
}
