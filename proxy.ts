import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/session'

// Rutas públicas que no requieren autenticación
const PUBLIC_ROUTES = ['/login', '/register', '/forgot-password', '/reset-password', '/auth/callback']

export async function proxy(request: NextRequest) {
  // 1. Primero refrescamos la sesión (siempre)
  const response = await updateSession(request)

  const { pathname } = request.nextUrl

  // 2. Creamos cliente Supabase para leer la sesión actualizada
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll() {},
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  // 3. Ruta raíz → redirigir según sesión (sin pasar por cliente)
  if (pathname === '/') {
    const target = user ? '/main-menu' : '/login'
    return NextResponse.redirect(new URL(target, request.url))
  }

  // 4. Rutas protegidas sin sesión → redirigir a login
  const isPublic = PUBLIC_ROUTES.some(route => pathname.startsWith(route))
  if (!user && !isPublic) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // 5. Usuario ya autenticado intenta entrar a login/register → redirigir al menú
  if (user && (pathname === '/login' || pathname === '/register')) {
    return NextResponse.redirect(new URL('/main-menu', request.url))
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\.(?:svg|png|jpg|jpeg|gif|webp|avif|ico|woff|woff2|ttf|otf)$).*)',
  ],
}
