import { createClient } from '@supabase/supabase-js'

// Cliente normal (para uso en frontend - solo operaciones públicas)
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
)

// Cliente con permisos de admin (para operaciones privilegiadas como listar usuarios)
export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY!
)
