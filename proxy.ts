import { NextResponse, type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/session'

// ─── Rutas que NO requieren sesión ───────────────────────────────────────────
const PUBLIC_PATHS = new Set([
  '/login',
  '/register',
  '/forgot-password',
  '/reset-password',
  '/auth/callback',
])

// ─── Rutas que sólo pueden ver usuarios NO autenticados ──────────────────────
// Si ya tienes sesión y entras a /login → te lleva a /main-menu
const AUTH_ONLY_PATHS = new Set(['/login', '/register', '/forgot-password'])

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  try {
    // Una sola llamada a Supabase — updateSession refresca el token y devuelve el usuario
    const { response, user } = await updateSession(request)

    const isAuthenticated = !!user
    const isPublicPath = PUBLIC_PATHS.has(pathname)
    const isAuthOnlyPath = AUTH_ONLY_PATHS.has(pathname)

    // Usuario autenticado intentando acceder a una ruta sólo para no-autenticados
    if (isAuthenticated && isAuthOnlyPath) {
      return NextResponse.redirect(new URL('/main-menu', request.url))
    }

    // Usuario NO autenticado intentando acceder a una ruta privada
    if (!isAuthenticated && !isPublicPath) {
      const loginUrl = new URL('/login', request.url)
      if (pathname !== '/') loginUrl.searchParams.set('next', pathname)
      return NextResponse.redirect(loginUrl)
    }

    // Ruta raíz ('/') → redirigir según estado de autenticación
    if (pathname === '/') {
      return NextResponse.redirect(
        new URL(isAuthenticated ? '/main-menu' : '/login', request.url),
      )
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
