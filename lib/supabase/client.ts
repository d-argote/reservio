import { createClient } from '@supabase/supabase-js'

// Cliente público para uso en componentes cliente (browser)
// Solo opera con la publishable key — respeta RLS
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
)
