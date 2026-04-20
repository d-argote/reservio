import { createClient as createSupabaseClient } from '@supabase/supabase-js'

// Cliente admin SOLO para uso en servidor (Server Actions, API Routes)
// Nunca importar desde componentes cliente ('use client')
export const supabaseAdmin = createSupabaseClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)
