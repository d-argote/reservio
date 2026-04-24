import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/'

  // Usar siempre la URL canónica configurada en el entorno.
  // Esto evita inconsistencias entre www/no-www o headers de proxy.
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? origin

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      return NextResponse.redirect(`${baseUrl}${next}`)
    }

    console.error('[auth/callback] Error al intercambiar código:', error.message)
  }

  return NextResponse.redirect(`${baseUrl}/login?error=Invalid_or_expired_token`)
}
