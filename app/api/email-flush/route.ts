import { NextResponse } from 'next/server'
import { flushEmailQueue } from '@/lib/email-queue'

/**
 * POST /api/email-flush
 *
 * Vacía la cola de correos pendientes (email_queue) reintentando el envío
 * por SMTP. Llamado automáticamente por el cliente cuando detecta que
 * recuperó conectividad a internet (evento 'online') o al cargar la app.
 */
export async function POST() {
  const result = await flushEmailQueue()
  return NextResponse.json(result)
}
