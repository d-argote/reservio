import { createClient as createSupabaseClient, SupabaseClient } from '@supabase/supabase-js'

// ── Singleton del cliente admin ───────────────────────────────────────────────
// Se crea UNA SOLA VEZ por proceso Node.js y se reutiliza en todas las llamadas.
// Esto evita crear una nueva instancia (con su propia pool HTTP interna) en cada
// Server Action, reduciendo el overhead de inicialización bajo carga.
let _adminClient: SupabaseClient | null = null

/**
 * Devuelve el cliente de administración de Supabase (service_role).
 * Singleton: la instancia se crea la primera vez y se reutiliza.
 * Devuelve `null` si faltan las variables de entorno (fallo silencioso).
 */
export const getSupabaseAdmin = (): SupabaseClient | null => {
  if (_adminClient) return _adminClient

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !key) {
    console.error('[Admin] Error: Faltan variables de entorno para el cliente Admin.')
    return null
  }

  try {
    _adminClient = createSupabaseClient(url, key, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })
    return _adminClient
  } catch (err) {
    console.error('[Admin] Error al inicializar el cliente Admin:', err)
    return null
  }
}
