import { NextResponse, type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/session'

// Rutas públicas que no requieren autenticación
const PUBLIC_ROUTES = ['/login', '/register', '/forgot-password', '/reset-password', '/auth/callback']

export async function proxy(request: NextRequest) {
  try {
    // Una sola llamada a Supabase — updateSession refresca el token y devuelve el usuario
    const { response, user } = await updateSession(request)

    const { pathname } = request.nextUrl

    // Ruta raíz → redirigir según sesión
    if (pathname === '/') {
      const target = user ? '/main-menu' : '/login'
      return NextResponse.redirect(new URL(target, request.url))
    }

    // Rutas protegidas sin sesión → redirigir a login
    const isPublic = PUBLIC_ROUTES.some(route => pathname.startsWith(route))
    if (!user && !isPublic) {
      return NextResponse.redirect(new URL('/login', request.url))
    }

    // Usuario autenticado intenta entrar a login/register → redirigir al menú
    if (user && (pathname === '/login' || pathname === '/register')) {
      return NextResponse.redirect(new URL('/main-menu', request.url))
    }

    return response
  } catch {
    // En caso de error en cold start, dejamos pasar la request sin bloquear
    return NextResponse.next()
  }
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\.(?:svg|png|jpg|jpeg|gif|webp|avif|ico|woff|woff2|ttf|otf)$).*)',
  ],
}
