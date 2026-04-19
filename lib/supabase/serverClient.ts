import { createClient } from '@supabase/supabase-js'

// Cliente admin SOLO para uso en servidor (Server Actions, API Routes)
// Nunca importar desde componentes cliente ('use client')
// Usa SUPABASE_SERVICE_ROLE_KEY sin prefijo NEXT_PUBLIC_ para que no se exponga al browser
export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)
