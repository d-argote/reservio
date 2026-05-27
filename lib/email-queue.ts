/**
 * Cola de correos offline — módulo sin 'use server' para poder importarse
 * tanto desde Route Handlers como desde Server Actions sin conflictos de bundling.
 *
 * Flujo:
 *   sendReservaEmail falla (sin internet) → enqueueEmail → email_queue (Postgres local)
 *   POST /api/email-flush → flushEmailQueue → reenvía todo lo pendiente por SMTP
 */

import nodemailer from 'nodemailer'
import { getSupabaseAdmin } from '@/lib/supabase/admin'

// ── Creación del transporter SMTP ────────────────────────────────────────────
function createTransporter() {
  const host = process.env.SMTP_HOST
  const user = process.env.SMTP_USER
  const pass = process.env.SMTP_PASS
  if (!host || !user || !pass) return null

  const port = parseInt(process.env.SMTP_PORT ?? '465')
  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  })
}

// ── Encolar un correo ya renderizado ─────────────────────────────────────────
export async function enqueueEmail(opts: {
  recipient: string
  subject: string
  html_body: string
  metadata?: Record<string, unknown>
}): Promise<void> {
  const adminClient = getSupabaseAdmin()
  if (!adminClient) {
    console.error('[EmailQueue] Admin client no disponible — no se pudo encolar el correo')
    return
  }

  const { error } = await adminClient.from('email_queue').insert({
    recipient: opts.recipient,
    subject:   opts.subject,
    html_body: opts.html_body,
    metadata:  opts.metadata ?? null,
  })

  if (error) {
    console.error('[EmailQueue] Error al encolar correo:', error.message)
  } else {
    console.log('[EmailQueue] Correo encolado para', opts.recipient)
  }
}

// ── Vaciar la cola: leer pendientes y reenviar por SMTP ───────────────────────
export async function flushEmailQueue(): Promise<{
  sent: number
  failed: number
  skipped: number
  error?: string
}> {
  const adminClient = getSupabaseAdmin()
  if (!adminClient) {
    console.error('[EmailFlush] Admin client no disponible')
    return { sent: 0, failed: 0, skipped: 0, error: 'admin_client_unavailable' }
  }

  const transporter = createTransporter()
  if (!transporter) {
    // SMTP no configurado — nada que hacer
    return { sent: 0, failed: 0, skipped: 1, error: 'smtp_not_configured' }
  }

  // Leer pendientes donde next_attempt_at ya venció
  const { data: pending, error: queryError } = await adminClient
    .from('email_queue')
    .select('id, recipient, subject, html_body, attempts')
    .eq('status', 'pending')
    .lte('next_attempt_at', new Date().toISOString())
    .lt('attempts', 10)
    .order('created_at', { ascending: true })
    .limit(50)

  if (queryError) {
    console.error('[EmailFlush] Error al leer email_queue:', queryError.message)
    return { sent: 0, failed: 0, skipped: 0, error: queryError.message }
  }

  if (!pending?.length) {
    return { sent: 0, failed: 0, skipped: 0 }
  }

  console.log(`[EmailFlush] Procesando ${pending.length} correo(s) pendiente(s)`)

  const fromName = process.env.SMTP_FROM_NAME ?? 'ITAM Reservio'
  const fromAddr = process.env.SMTP_USER ?? ''
  let sent = 0, failed = 0

  for (const email of pending) {
    try {
      await transporter.sendMail({
        from:    `"${fromName}" <${fromAddr}>`,
        to:      email.recipient,
        subject: email.subject,
        html:    email.html_body,
      })

      const { error: updateErr } = await adminClient
        .from('email_queue')
        .update({ status: 'sent' })
        .eq('id', email.id)

      if (updateErr) {
        console.error('[EmailFlush] Error al marcar sent:', updateErr.message)
      } else {
        console.log('[EmailFlush] Enviado OK →', email.recipient)
      }
      sent++
    } catch (smtpErr) {
      console.error('[EmailFlush] SMTP falló para', email.recipient, smtpErr)
      const newAttempts = (email.attempts ?? 0) + 1
      // Backoff exponencial: 5 min → 15 min → 45 min → 2.25 h → máx 24 h
      const backoffMs = Math.min(5 * Math.pow(3, newAttempts - 1), 1440) * 60_000
      await adminClient.from('email_queue').update({
        attempts:        newAttempts,
        next_attempt_at: new Date(Date.now() + backoffMs).toISOString(),
        status:          newAttempts >= 10 ? 'failed_permanent' : 'pending',
      }).eq('id', email.id)
      failed++
    }
  }

  console.log(`[EmailFlush] Resultado: ${sent} enviados, ${failed} fallidos`)
  return { sent, failed, skipped: 0 }
}
