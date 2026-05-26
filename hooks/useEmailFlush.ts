'use client'

import { useEffect } from 'react'

// Cada cuántos ms se verifica la cola aunque no haya evento 'online'
const POLL_INTERVAL_MS = 2 * 60 * 1000 // 2 minutos

/**
 * Vacía la cola de correos pendientes (email_queue) llamando a /api/email-flush.
 * Se dispara en tres momentos:
 *   1. Al montar el componente (cubre correos de sesiones anteriores)
 *   2. Cuando el navegador emite el evento 'online'
 *   3. Cada POLL_INTERVAL_MS (cubre reconexiones silenciosas donde 'online' no dispara,
 *      que es el caso más común cuando la máquina tiene red local pero sin internet)
 */
export function useEmailFlush() {
  useEffect(() => {
    const flush = () => {
      fetch('/api/email-flush', { method: 'POST' })
        .then(r => r.json())
        .then(data => {
          if (data.sent > 0) console.log(`[EmailFlush] ${data.sent} correo(s) enviado(s) de la cola`)
          if (data.error) console.warn('[EmailFlush] Error del servidor:', data.error)
        })
        .catch(() => {
          // Sin conexión todavía — se reintentará en el próximo intervalo
        })
    }

    // 1. Al montar
    flush()

    // 2. Evento 'online' (cuando el navegador detecta reconexión de red)
    window.addEventListener('online', flush)

    // 3. Intervalo periódico — maneja el caso más común: red local activa
    //    pero sin acceso externo a internet (el evento 'online' nunca dispara)
    const intervalId = setInterval(flush, POLL_INTERVAL_MS)

    return () => {
      window.removeEventListener('online', flush)
      clearInterval(intervalId)
    }
  }, [])
}

