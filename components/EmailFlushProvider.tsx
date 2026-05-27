'use client'

import { useEmailFlush } from '@/hooks/useEmailFlush'

/**
 * Componente cliente sin UI que activa el hook useEmailFlush.
 * Se incluye en el RootLayout para que esté activo en toda la app.
 */
export function EmailFlushProvider() {
  useEmailFlush()
  return null
}
