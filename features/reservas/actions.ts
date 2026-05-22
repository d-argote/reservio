'use server'

import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import nodemailer from 'nodemailer'

// ═══════════════════════════════════════════════════════════════════════════════
// TIPOS
// ═══════════════════════════════════════════════════════════════════════════════

export interface ReservaInput {
  titulo: string
  sala_id: string
  fecha: string       // 'YYYY-MM-DD'
  hora_inicio: string // 'HH:MM'
  hora_fin: string    // 'HH:MM'
}

// ── Disponibilidad por franja horaria ──────────────────────────────
export interface FranjaOcupada {
  hora_inicio: string   // 'HH:MM'
  hora_fin: string      // 'HH:MM'
  titulo?: string       // título de la reserva (opcional)
}

export type EstadoDisponibilidad = 'libre' | 'parcial' | 'ocupada_total' | 'mantenimiento'

export interface SalaDisponibilidad {
  id: string
  nombre: string
  descripcion: string | null
  capacidad: number
  ubicacion: string | null
  imagen_url: string | null
  estado: 'disponible' | 'ocupada' | 'mantenimiento'
  franjas_reservadas: FranjaOcupada[]
  disponibilidad: EstadoDisponibilidad
  proxima_libre: string | null   // 'HH:MM' hora a partir de la cual hay espacio libre hoy
}

export interface EquipoConflicto {
  equipo_id: string
  conflicto: boolean
  franjas_ocupadas: FranjaOcupada[]
}

export interface ReportData {
  equipos: {
    total: number
    disponibles: number
    reservados: number
    mantenimiento: number
    porCategoria: { categoria: string; total: number; disponibles: number }[]
    lista: { id: string; nombre: string; categoria: string; marca: string; tipo_equipo: string; estado: string; numero_serie: string | null }[]
  }
  salas: {
    total: number
    disponibles: number
    ocupadas: number
    mantenimiento: number
    lista: { id: string; nombre: string; capacidad: number; ubicacion: string | null; estado: string }[]
  }
  reservas: {
    total: number
    confirmadas: number
    pendientes: number
    canceladas: number
    porMes: { mes: string; total: number }[]
    lista: { id: string; titulo: string; fecha: string; hora_inicio: string; hora_fin: string; estado: string; sala_nombre: string | null; usuario_nombre: string | null }[]
  }
}

// ─── helper interno ────────────────────────────────────────────────
async function getAuthUser() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return { user, supabase }
}

/**
 * Obtiene la fecha y hora actual en la zona horaria de Bogotá (UTC-5, sin DST).
 * Se usa en el servidor para calcular disponibilidad en tiempo real.
 */
function getBogotaNowServer(): { dateStr: string; timeStr: string } {
  const now = new Date()
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Bogota',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hour12: false,
  })
  const parts = fmt.formatToParts(now)
  const get = (type: string) => parts.find(p => p.type === type)?.value ?? '00'
  const dateStr = `${get('year')}-${get('month')}-${get('day')}`
  const h = parseInt(get('hour'))
  const m = parseInt(get('minute'))
  const timeStr = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
  return { dateStr, timeStr }
}

/**
 * Recalcula el estado de una sala basándose en si hay una reserva
 * en curso AHORA MISMO (no cualquier reserva futura).
 * Solo marca 'ocupada' durante la franja horaria exacta que está reservada.
 */
async function recalcularEstadoSala(salaId: string): Promise<void> {
  const adminClient = getSupabaseAdmin()
  if (!adminClient) return

  // No tocar salas en mantenimiento
  const { data: sala } = await adminClient
    .from('salas')
    .select('estado')
    .eq('id', salaId)
    .single()
  if (sala?.estado === 'mantenimiento') return

  const { dateStr, timeStr } = getBogotaNowServer()

  // Solo 'ocupada' si hay una reserva activa en este momento exacto
  const { count } = await adminClient
    .from('reservas')
    .select('id', { count: 'exact', head: true })
    .eq('sala_id', salaId)
    .eq('fecha', dateStr)
    .in('estado', ['pendiente', 'confirmada'])
    .lte('hora_inicio', timeStr)
    .gt('hora_fin', timeStr)

  const nuevoEstado = (count ?? 0) > 0 ? 'ocupada' : 'disponible'
  await adminClient.from('salas').update({ estado: nuevoEstado }).eq('id', salaId)
}

/**
 * Recalcula el estado de un equipo basándose en si hay un préstamo
 * activo EN CURSO ahora mismo (fecha_inicio <= ahora < fecha_fin_esperada).
 * Equipos en mantenimiento no son modificados.
 */
async function recalcularEstadoEquipo(equipoId: string): Promise<void> {
  const adminClient = getSupabaseAdmin()
  if (!adminClient) return

  const { data: equipo } = await adminClient
    .from('equipos')
    .select('estado')
    .eq('id', equipoId)
    .single()
  if (equipo?.estado === 'mantenimiento') return

  const ahora = new Date().toISOString()

  const { count } = await adminClient
    .from('prestamos_equipo')
    .select('id', { count: 'exact', head: true })
    .eq('equipo_id', equipoId)
    .eq('estado', 'activo')
    .lte('fecha_inicio', ahora)
    .gt('fecha_fin_esperada', ahora)

  const nuevoEstado = (count ?? 0) > 0 ? 'reservado' : 'disponible'
  await adminClient.from('equipos').update({ estado: nuevoEstado }).eq('id', equipoId)
}

// ═══════════════════════════════════════════════════════════════════════════════
// EMAIL NOTIFICATION — best-effort via Hostinger SMTP
// Variables de entorno requeridas en .env.local:
//   SMTP_HOST        hostinger — smtp.hostinger.com
//   SMTP_PORT        465 (SSL) o 587 (TLS)
//   SMTP_USER        tu correo completo, ej: noreply@tudominio.com
//   SMTP_PASS        contraseña del correo
//   SMTP_FROM_NAME   (opcional) nombre visible, ej: ITAM Reservio
// ═══════════════════════════════════════════════════════════════════════════════

function createTransporter() {
  const host = process.env.SMTP_HOST
  const user = process.env.SMTP_USER
  const pass = process.env.SMTP_PASS
  if (!host || !user || !pass) return null   // opt-in — salta si no está configurado

  const port = parseInt(process.env.SMTP_PORT ?? '465')
  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,   // SSL para 465, STARTTLS para 587
    auth: { user, pass },
  })
}

async function sendReservaEmail(opts: {
  to: string
  action: 'confirmada' | 'actualizada' | 'cancelada'
  titulo: string
  fecha: string
  horaInicio: string
  horaFin: string
  sala?: string | null
}) {
  const transporter = createTransporter()
  if (!transporter) return   // no configurado — silencioso

  const cfg = {
    confirmada: { accent: '#002045', bg: '#d6e3ff', label: 'Reserva Confirmada',  icon: '✅' },
    actualizada: { accent: '#3b6090', bg: '#d4e3ff', label: 'Reserva Actualizada', icon: '✏️' },
    cancelada:   { accent: '#ba1a1a', bg: '#ffdad6', label: 'Reserva Cancelada',   icon: '❌' },
  }[opts.action]

  const dateFormatted = new Date(opts.fecha + 'T00:00:00').toLocaleDateString('es-ES', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })

  const salaRow = opts.sala
    ? `<tr><td style="padding:12px 0;border-bottom:1px solid #f0f4f8;vertical-align:top;width:36px;"><span style="font-size:18px;">🏛️</span></td><td style="padding:12px 0 12px 14px;border-bottom:1px solid #f0f4f8;"><p style="margin:0;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;color:#74777f;">Sala</p><p style="margin:3px 0 0;font-size:14px;font-weight:600;color:#171c1f;">${opts.sala}</p></td></tr>`
    : ''

  const html = `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f6fafe;font-family:Helvetica,Arial,sans-serif;">
<div style="max-width:520px;margin:40px auto;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,32,69,0.10);">
  <div style="background:${cfg.accent};padding:32px 40px;">
    <p style="margin:0;font-size:10px;letter-spacing:3px;text-transform:uppercase;color:rgba(255,255,255,0.55);font-weight:700;">ITAM RESERVIO</p>
    <h1 style="margin:10px 0 0;font-size:22px;font-weight:800;color:#ffffff;line-height:1.3;">${cfg.icon} ${cfg.label}</h1>
  </div>
  <div style="padding:32px 40px;">
    <div style="background:${cfg.bg};border-radius:12px;padding:20px 24px;margin-bottom:28px;border-left:4px solid ${cfg.accent};">
      <p style="margin:0 0 4px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:2px;color:${cfg.accent};">Reserva</p>
      <p style="margin:0;font-size:20px;font-weight:800;color:${cfg.accent};line-height:1.3;">${opts.titulo}</p>
    </div>
    <table style="width:100%;border-collapse:collapse;">
      <tr><td style="padding:12px 0;border-bottom:1px solid #f0f4f8;vertical-align:top;width:36px;"><span style="font-size:18px;">📅</span></td><td style="padding:12px 0 12px 14px;border-bottom:1px solid #f0f4f8;"><p style="margin:0;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;color:#74777f;">Fecha</p><p style="margin:3px 0 0;font-size:14px;font-weight:600;color:#171c1f;text-transform:capitalize;">${dateFormatted}</p></td></tr>
      <tr><td style="padding:12px 0;border-bottom:1px solid #f0f4f8;vertical-align:top;width:36px;"><span style="font-size:18px;">⏰</span></td><td style="padding:12px 0 12px 14px;border-bottom:1px solid #f0f4f8;"><p style="margin:0;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;color:#74777f;">Horario</p><p style="margin:3px 0 0;font-size:14px;font-weight:600;color:#171c1f;">${opts.horaInicio.slice(0, 5)} – ${opts.horaFin.slice(0, 5)}</p></td></tr>
      ${salaRow}
    </table>
  </div>
  <div style="background:#f0f4f8;padding:20px 40px;text-align:center;">
    <p style="margin:0;font-size:11px;color:#74777f;line-height:1.6;">Este es un correo automático de <strong>ITAM Reservio</strong>.<br>Si no realizaste esta acción, contacta al administrador del sistema.</p>
  </div>
</div>
</body></html>`

  const fromName = process.env.SMTP_FROM_NAME ?? 'ITAM Reservio'
  const fromAddr = process.env.SMTP_USER ?? ''

  try {
    const info = await transporter.sendMail({
      from: `"${fromName}" <${fromAddr}>`,
      to: opts.to,
      subject: `${cfg.label}: ${opts.titulo} — ITAM Reservio`,
      html,
    })
    console.log('[Email] Enviado OK →', info.messageId)
  } catch (err) {
    console.error('[Email] Error al enviar correo SMTP:', err)
  }
}

// ── Labels de condición para emails ───────────────────────────────────────────
const CONDICION_LABEL: Record<string, string> = {
  nuevo:       'Nuevo',
  excelente:   'Excelente',
  bueno:       'Bueno',
  regular:     'Regular',
  dano_leve:   'Daño leve',
  dano_grave:  'Daño grave',
  perdido:     'Perdido / extraviado',
}
const NOVEDAD_LABEL: Record<string, string> = {
  dano_fisico:         'Daño físico',
  dano_software:       'Daño de software',
  perdida:             'Pérdida del equipo',
  faltante_accesorio:  'Faltante de accesorio',
  entrega_tardia:      'Entrega tardía',
  otro:                'Otra novedad',
}

async function sendPrestamoEmail(opts: {
  to: string
  userName: string
  action: 'confirmado' | 'devuelto' | 'devuelto_novedad'
  equipoNombre: string
  numActa: string
  condicionEntrega?: string
  condicionDevolucion?: string
  novedadTipo?: string | null
  fechaFin?: string
  salaNombre?: string | null
}) {
  const transporter = createTransporter()
  if (!transporter) return

  const fromName = process.env.SMTP_FROM_NAME ?? 'ITAM Reservio'
  const fromAddr = process.env.SMTP_USER ?? ''

  const cfg = {
    confirmado:       { accent: '#002045', bg: '#d6e3ff', label: '✅ Préstamo Confirmado',       subject: 'Préstamo confirmado' },
    devuelto:         { accent: '#1a6b3c', bg: '#d6f5e3', label: '📦 Devolución Registrada',     subject: 'Devolución registrada' },
    devuelto_novedad: { accent: '#ba1a1a', bg: '#ffdad6', label: '⚠️ Devolución con Novedad',    subject: 'Devolución con novedad reportada' },
  }[opts.action]

  const condRow = opts.action === 'confirmado' && opts.condicionEntrega
    ? `<tr><td style="padding:10px 0;border-bottom:1px solid #f0f4f8;vertical-align:top;width:36px;"><span style="font-size:16px;">🔍</span></td><td style="padding:10px 0 10px 14px;border-bottom:1px solid #f0f4f8;"><p style="margin:0;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;color:#74777f;">Condición de entrega</p><p style="margin:3px 0 0;font-size:14px;font-weight:600;color:#171c1f;">${CONDICION_LABEL[opts.condicionEntrega] ?? opts.condicionEntrega}</p></td></tr>`
    : ''
  const devCondRow = opts.condicionDevolucion
    ? `<tr><td style="padding:10px 0;border-bottom:1px solid #f0f4f8;vertical-align:top;width:36px;"><span style="font-size:16px;">📋</span></td><td style="padding:10px 0 10px 14px;border-bottom:1px solid #f0f4f8;"><p style="margin:0;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;color:#74777f;">Condición al devolver</p><p style="margin:3px 0 0;font-size:14px;font-weight:600;color:#171c1f;">${CONDICION_LABEL[opts.condicionDevolucion] ?? opts.condicionDevolucion}</p></td></tr>`
    : ''
  const novedadRow = opts.novedadTipo
    ? `<tr><td style="padding:10px 0;border-bottom:1px solid #f0f4f8;vertical-align:top;width:36px;"><span style="font-size:16px;">⚠️</span></td><td style="padding:10px 0 10px 14px;border-bottom:1px solid #f0f4f8;"><p style="margin:0;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;color:#74777f;">Novedad</p><p style="margin:3px 0 0;font-size:14px;font-weight:600;color:#ba1a1a;">${NOVEDAD_LABEL[opts.novedadTipo] ?? opts.novedadTipo}</p></td></tr>`
    : ''
  const fechaRow = opts.fechaFin
    ? `<tr><td style="padding:10px 0;border-bottom:1px solid #f0f4f8;vertical-align:top;width:36px;"><span style="font-size:16px;">📅</span></td><td style="padding:10px 0 10px 14px;border-bottom:1px solid #f0f4f8;"><p style="margin:0;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;color:#74777f;">Devolución esperada</p><p style="margin:3px 0 0;font-size:14px;font-weight:600;color:#171c1f;">${new Date(opts.fechaFin + '-05:00').toLocaleString('es-ES', { dateStyle: 'long', timeStyle: 'short', timeZone: 'America/Bogota' })}</p></td></tr>`
    : ''
  const salaRow = opts.salaNombre
    ? `<tr><td style="padding:10px 0;border-bottom:1px solid #f0f4f8;vertical-align:top;width:36px;"><span style="font-size:16px;">🏛️</span></td><td style="padding:10px 0 10px 14px;border-bottom:1px solid #f0f4f8;"><p style="margin:0;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;color:#74777f;">Sala de uso</p><p style="margin:3px 0 0;font-size:14px;font-weight:600;color:#171c1f;">${opts.salaNombre}</p></td></tr>`
    : ''

  const footerMsg = opts.action === 'devuelto_novedad'
    ? 'El equipo de TI revisará la novedad reportada y se comunicará contigo si es necesario.'
    : opts.action === 'confirmado'
    ? 'Por favor cuida el equipo y devuélvelo en las mismas condiciones en que lo recibiste.'
    : 'Gracias por devolver el equipo. ¡Hasta la próxima!'

  const html = `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f6fafe;font-family:Helvetica,Arial,sans-serif;">
<div style="max-width:520px;margin:40px auto;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,32,69,0.10);">
  <div style="background:${cfg.accent};padding:32px 40px;">
    <p style="margin:0;font-size:10px;letter-spacing:3px;text-transform:uppercase;color:rgba(255,255,255,0.55);font-weight:700;">ITAM RESERVIO · PRÉSTAMOS</p>
    <h1 style="margin:10px 0 0;font-size:22px;font-weight:800;color:#ffffff;line-height:1.3;">${cfg.label}</h1>
  </div>
  <div style="padding:32px 40px;">
    <p style="margin:0 0 20px;font-size:15px;color:#3b4752;">Hola <strong>${opts.userName}</strong>,</p>
    <div style="background:${cfg.bg};border-radius:12px;padding:20px 24px;margin-bottom:24px;border-left:4px solid ${cfg.accent};">
      <p style="margin:0 0 4px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:2px;color:${cfg.accent};">Equipo</p>
      <p style="margin:0;font-size:20px;font-weight:800;color:${cfg.accent};line-height:1.3;">${opts.equipoNombre}</p>
      ${opts.numActa ? `<p style="margin:6px 0 0;font-size:11px;color:#74777f;letter-spacing:0.5px;">Acta: <strong>${opts.numActa}</strong></p>` : ''}
    </div>
    <table style="width:100%;border-collapse:collapse;">
      ${condRow}${devCondRow}${novedadRow}${fechaRow}${salaRow}
    </table>
    <p style="margin:24px 0 0;font-size:13px;color:#74777f;line-height:1.6;">${footerMsg}</p>
  </div>
  <div style="background:#f0f4f8;padding:20px 40px;text-align:center;">
    <p style="margin:0;font-size:11px;color:#74777f;line-height:1.6;">Este es un correo automático de <strong>ITAM Reservio</strong>.<br>Si no realizaste esta acción, contacta al administrador del sistema.</p>
  </div>
</div></body></html>`

  try {
    await transporter.sendMail({
      from: `"${fromName}" <${fromAddr}>`,
      to: opts.to,
      subject: `${cfg.subject}: ${opts.equipoNombre} (${opts.numActa}) — ITAM Reservio`,
      html,
    })
  } catch (err) {
    console.error('[Email Préstamo] Error:', err)
  }
}

async function sendNovedadEmailAdmin(opts: {
  to: string
  equipoNombre: string
  numActa: string
  userName: string
  userEmail: string
  condicionDevolucion: string
  tipoNovedad: string
  descripcion: string
  fotoUrl: string | null
}) {
  const transporter = createTransporter()
  if (!transporter) return

  const fromName = process.env.SMTP_FROM_NAME ?? 'ITAM Reservio'
  const fromAddr = process.env.SMTP_USER ?? ''

  const fotoHtml = opts.fotoUrl
    ? `<p style="margin:16px 0 0;"><a href="${opts.fotoUrl}" style="display:inline-block;padding:10px 20px;background:#ba1a1a;color:#fff;border-radius:8px;font-size:13px;font-weight:700;text-decoration:none;">📷 Ver foto de devolución</a></p>`
    : ''

  const html = `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#fff5f5;font-family:Helvetica,Arial,sans-serif;">
<div style="max-width:520px;margin:40px auto;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(186,26,26,0.12);">
  <div style="background:#ba1a1a;padding:28px 40px;">
    <p style="margin:0;font-size:10px;letter-spacing:3px;text-transform:uppercase;color:rgba(255,255,255,0.6);font-weight:700;">ITAM RESERVIO · ALERTA</p>
    <h1 style="margin:8px 0 0;font-size:20px;font-weight:800;color:#fff;">⚠️ Novedad en devolución de equipo</h1>
  </div>
  <div style="padding:28px 40px;">
    <div style="background:#ffdad6;border-radius:10px;padding:16px 20px;margin-bottom:20px;border-left:4px solid #ba1a1a;">
      <p style="margin:0 0 2px;font-size:10px;font-weight:700;letter-spacing:2px;color:#ba1a1a;">EQUIPO · ACTA ${opts.numActa}</p>
      <p style="margin:0;font-size:18px;font-weight:800;color:#ba1a1a;">${opts.equipoNombre}</p>
    </div>
    <table style="width:100%;border-collapse:collapse;">
      <tr><td style="padding:10px 0;border-bottom:1px solid #fde;width:36px;"><span style="font-size:16px;">👤</span></td><td style="padding:10px 0 10px 14px;border-bottom:1px solid #fde;"><p style="margin:0;font-size:10px;font-weight:700;letter-spacing:1.5px;color:#74777f;">Usuario</p><p style="margin:2px 0 0;font-size:14px;font-weight:600;color:#171c1f;">${opts.userName} · <a href="mailto:${opts.userEmail}" style="color:#ba1a1a;">${opts.userEmail}</a></p></td></tr>
      <tr><td style="padding:10px 0;border-bottom:1px solid #fde;width:36px;"><span style="font-size:16px;">📋</span></td><td style="padding:10px 0 10px 14px;border-bottom:1px solid #fde;"><p style="margin:0;font-size:10px;font-weight:700;letter-spacing:1.5px;color:#74777f;">Condición al devolver</p><p style="margin:2px 0 0;font-size:14px;font-weight:600;color:#171c1f;">${CONDICION_LABEL[opts.condicionDevolucion] ?? opts.condicionDevolucion}</p></td></tr>
      <tr><td style="padding:10px 0;border-bottom:1px solid #fde;width:36px;"><span style="font-size:16px;">⚠️</span></td><td style="padding:10px 0 10px 14px;border-bottom:1px solid #fde;"><p style="margin:0;font-size:10px;font-weight:700;letter-spacing:1.5px;color:#74777f;">Tipo de novedad</p><p style="margin:2px 0 0;font-size:14px;font-weight:600;color:#ba1a1a;">${NOVEDAD_LABEL[opts.tipoNovedad] ?? opts.tipoNovedad}</p></td></tr>
      ${opts.descripcion ? `<tr><td style="padding:10px 0;width:36px;"><span style="font-size:16px;">📝</span></td><td style="padding:10px 0 10px 14px;"><p style="margin:0;font-size:10px;font-weight:700;letter-spacing:1.5px;color:#74777f;">Descripción</p><p style="margin:2px 0 0;font-size:14px;color:#171c1f;">${opts.descripcion}</p></td></tr>` : ''}
    </table>
    ${fotoHtml}
  </div>
  <div style="background:#f0f4f8;padding:16px 40px;text-align:center;">
    <p style="margin:0;font-size:11px;color:#74777f;">Alerta automática de <strong>ITAM Reservio</strong>. Revisa el panel de administración para gestionar esta novedad.</p>
  </div>
</div></body></html>`

  try {
    await transporter.sendMail({
      from: `"${fromName}" <${fromAddr}>`,
      to: opts.to,
      subject: `🚨 Novedad en devolución: ${opts.equipoNombre} (${opts.numActa}) — ITAM Reservio`,
      html,
    })
  } catch (err) {
    console.error('[Email Novedad Admin] Error:', err)
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// CREAR RESERVA
// ═══════════════════════════════════════════════════════════════════════════════

export async function createReserva(
  data: ReservaInput,
  equiposIds: string[] = [],
): Promise<{ data?: { id: string }; error?: string; prestamosError?: string }> {
  const { user, supabase } = await getAuthUser()
  if (!user) return { error: 'No autenticado' }

  const adminClient = getSupabaseAdmin()
  const writeClient = adminClient ?? supabase

  // ── 1. Pre-insert conflict checks + fetch sala nombre — todo en paralelo ──
  // Three checks run in parallel:
  //   a) Room overlap check (via reservas table)
  //   b) Equipment check via reserva_equipos (user reservations)
  //   c) Equipment check via prestamos_equipo (standalone admin loans that don't go through reserva_equipos)
  //   d) Sala name for the confirmation email
  //
  // Note: these are application-layer early-return guards for a good UX.
  // The DB-level EXCLUDE constraints (no_sala_overlap, no_equipo_overlap) are the
  // atomic safety net that prevents race conditions when two users submit simultaneously.
  const horaInicioStr    = data.hora_inicio.length === 5 ? `${data.hora_inicio}:00` : data.hora_inicio
  const horaFinStr       = data.hora_fin.length === 5    ? `${data.hora_fin}:00`    : data.hora_fin
  const fechaInicioCk    = `${data.fecha}T${horaInicioStr}-05:00`
  const fechaFinCk       = `${data.fecha}T${horaFinStr}-05:00`

  const [salaCheck, equipoReservaCheck, equipoPrestamoCheck, salaInfoResult] = await Promise.all([
    // a) Room: no other confirmed/pending reservation overlaps this slot
    supabase
      .from('reservas')
      .select('id', { count: 'exact', head: true })
      .eq('sala_id', data.sala_id)
      .eq('fecha', data.fecha)
      .in('estado', ['pendiente', 'confirmada'])
      .lt('hora_inicio', data.hora_fin)
      .gt('hora_fin', data.hora_inicio),

    // b) Equipment: no other confirmed/pending reservation uses these equipos at this time
    equiposIds.length > 0
      ? writeClient
          .from('reserva_equipos')
          .select('equipo_id, reservas!inner(fecha, hora_inicio, hora_fin, estado)')
          .in('equipo_id', equiposIds)
          .eq('reservas.fecha', data.fecha)
          .in('reservas.estado', ['pendiente', 'confirmada'])
          .lt('reservas.hora_inicio', data.hora_fin)
          .gt('reservas.hora_fin', data.hora_inicio)
      : Promise.resolve({ data: [] as { equipo_id: string }[], error: null }),

    // c) Equipment: no standalone admin loan overlaps this time window
    equiposIds.length > 0
      ? writeClient
          .from('prestamos_equipo')
          .select('equipo_id', { count: 'exact', head: true })
          .in('equipo_id', equiposIds)
          .eq('estado', 'activo')
          .lt('fecha_inicio', fechaFinCk)
          .gt('fecha_fin_esperada', fechaInicioCk)
      : Promise.resolve({ count: 0, error: null }),

    // d) Sala name for the email
    supabase.from('salas').select('nombre').eq('id', data.sala_id).single(),
  ])

  if ((salaCheck.count ?? 0) > 0) {
    return { error: 'La sala ya tiene una reserva en ese horario. Elige otra franja horaria.' }
  }
  if (equipoReservaCheck.data && equipoReservaCheck.data.length > 0) {
    return { error: 'El equipo seleccionado ya está reservado en esa franja horaria. Elige otro horario o equipo.' }
  }
  if ((equipoPrestamoCheck.count ?? 0) > 0) {
    return { error: 'Uno de los equipos seleccionados tiene un préstamo activo en ese horario. Elige otro equipo.' }
  }

  // ── 2. Insertar reserva ───────────────────────────────────────────────────
  const { data: reserva, error } = await supabase
    .from('reservas')
    .insert({
      usuario_id: user.id,
      sala_id: data.sala_id,
      titulo: data.titulo.trim(),
      fecha: data.fecha,
      hora_inicio: data.hora_inicio,
      hora_fin: data.hora_fin,
      estado: 'confirmada',
    })
    .select('id')
    .single()

  if (error) {
    // 23P01 = PostgreSQL exclusion_violation (DB-level atomic overlap constraint)
    if (error.code === '23P01') {
      return { error: 'La sala ya tiene una reserva en ese horario. Elige otra franja horaria.' }
    }
    return { error: error.message }
  }
  if (!reserva) return { error: 'Error al crear la reserva' }

  // ── 3. Insertar pivote + préstamos en paralelo ────────────────────────────
  if (equiposIds.length > 0) {
    // horaInicioStr / horaFinStr already declared above in the conflict-check block
    const fechaInicio      = `${data.fecha}T${horaInicioStr}-05:00`
    const fechaFinEsperada = `${data.fecha}T${horaFinStr}-05:00`

    const pivotRows = equiposIds.map(equipoId => ({ reserva_id: reserva.id, equipo_id: equipoId }))
    const prestamoRows = equiposIds.map(equipoId => ({
      equipo_id:          equipoId,
      usuario_id:         user.id,
      reserva_id:         reserva.id,
      sala_id:            data.sala_id || null,
      fecha_inicio:       fechaInicio,
      fecha_fin_esperada: fechaFinEsperada,
      estado:             'activo',
    }))

    const [pivotRes, prestamosRes] = await Promise.all([
      writeClient.from('reserva_equipos').insert(pivotRows),
      writeClient.from('prestamos_equipo').insert(prestamoRows),
    ])

    if (pivotRes.error) {
      console.error('[createReserva] Error inserting reserva_equipos:', pivotRes.error)
      return { data: { id: reserva.id }, prestamosError: pivotRes.error.message }
    }
    if (prestamosRes.error) {
      console.error('[createReserva] Error inserting prestamos_equipo:', prestamosRes.error)
      // 23P01 = exclusion_violation — equipment already booked at this time by another user
      if (prestamosRes.error.code === '23P01') {
        return { data: { id: reserva.id }, prestamosError: 'Uno de los equipos ya fue reservado por otro usuario en ese horario. Elige equipos diferentes.' }
      }
      return { data: { id: reserva.id }, prestamosError: prestamosRes.error.message }
    }

    // Marcar equipos 'reservado' si la reserva está activa AHORA (fire-and-forget)
    const { dateStr: today, timeStr: nowTime } = getBogotaNowServer()
    if (data.fecha === today && data.hora_inicio <= nowTime && data.hora_fin > nowTime) {
      writeClient.from('equipos').update({ estado: 'reservado' }).in('id', equiposIds).catch(console.error)
    }
  }

  // ── 4. Email (awaited — confiable) + recalcular sala (fire-and-forget) ───
  // recalcularEstadoSala es estado de fondo; el email es crítico para el usuario.
  recalcularEstadoSala(data.sala_id).catch(console.error)

  if (user.email) {
    await sendReservaEmail({
      to: user.email,
      action: 'confirmada',
      titulo: data.titulo.trim(),
      fecha: data.fecha,
      horaInicio: data.hora_inicio,
      horaFin: data.hora_fin,
      sala: salaInfoResult.data?.nombre,
    })
  }

  return { data: { id: reserva.id } }
}

// ═══════════════════════════════════════════════════════════════════════════════
// EDITAR RESERVA
// ═══════════════════════════════════════════════════════════════════════════════

export async function updateReserva(
  id: string,
  data: Partial<ReservaInput>,
): Promise<{ success?: boolean; error?: string }> {
  const { user, supabase } = await getAuthUser()
  if (!user) return { error: 'No autenticado' }

  const { data: existing } = await supabase
    .from('reservas')
    .select('usuario_id, sala_id, titulo, fecha, hora_inicio, hora_fin, estado')
    .eq('id', id)
    .single()

  if (!existing) return { error: 'Reserva no encontrada' }
  if (existing.usuario_id !== user.id) return { error: 'Sin permiso para editar esta reserva' }
  if (existing.estado === 'cancelada') return { error: 'No puedes editar una reserva cancelada' }

  // Verificar conflicto con los valores finales
  const sala_id    = data.sala_id    ?? existing.sala_id
  const fecha      = data.fecha      ?? existing.fecha
  const hora_inicio = data.hora_inicio ?? existing.hora_inicio
  const hora_fin   = data.hora_fin   ?? existing.hora_fin

  const { data: overlapping } = await supabase
    .from('reservas')
    .select('id')
    .eq('sala_id', sala_id)
    .eq('fecha', fecha)
    .in('estado', ['pendiente', 'confirmada'])
    .neq('id', id)
    .lt('hora_inicio', hora_fin)
    .gt('hora_fin', hora_inicio)

  if (overlapping && overlapping.length > 0) {
    return { error: 'La sala ya tiene una reserva en ese horario. Elige otra franja horaria.' }
  }

  const updates: Record<string, string> = {}
  if (data.titulo)      updates.titulo      = data.titulo.trim()
  if (data.sala_id)     updates.sala_id     = data.sala_id
  if (data.fecha)       updates.fecha       = data.fecha
  if (data.hora_inicio) updates.hora_inicio = data.hora_inicio
  if (data.hora_fin)    updates.hora_fin    = data.hora_fin

  const { error } = await supabase
    .from('reservas')
    .update(updates)
    .eq('id', id)
    .eq('usuario_id', user.id)

  if (error) return { error: error.message }

  // Email notification (best-effort)
  if (user.email) {
    const finalSalaId    = data.sala_id    ?? existing.sala_id
    const finalTitulo    = data.titulo     ?? existing.titulo
    const finalFecha     = data.fecha      ?? existing.fecha
    const finalInicio    = data.hora_inicio ?? existing.hora_inicio
    const finalFin       = data.hora_fin   ?? existing.hora_fin
    const { data: salaInfo } = await supabase
      .from('salas')
      .select('nombre')
      .eq('id', finalSalaId)
      .single()
    await sendReservaEmail({
      to: user.email,
      action: 'actualizada',
      titulo: finalTitulo ?? 'Reserva',
      fecha: finalFecha,
      horaInicio: finalInicio,
      horaFin: finalFin,
      sala: salaInfo?.nombre,
    })
  }

  return { success: true }
}

// ═══════════════════════════════════════════════════════════════════════════════
// CANCELAR RESERVA
// ═══════════════════════════════════════════════════════════════════════════════

export async function cancelarReserva(id: string): Promise<{ success?: boolean; error?: string }> {
  const { user, supabase } = await getAuthUser()
  if (!user) return { error: 'No autenticado' }

  // Fetch reserva details for notification (before cancelling)
  const [pivotResult, detailsResult] = await Promise.allSettled([
    supabase.from('reserva_equipos').select('equipo_id').eq('reserva_id', id),
    supabase
      .from('reservas')
      .select('titulo, fecha, hora_inicio, hora_fin, sala_id, salas(id, nombre)')
      .eq('id', id)
      .single(),
  ])

  const pivotRows = pivotResult.status === 'fulfilled' ? pivotResult.value.data : null
  const details   = detailsResult.status === 'fulfilled' ? detailsResult.value.data : null

  const { error } = await supabase
    .from('reservas')
    .update({ estado: 'cancelada' })
    .eq('id', id)
    .eq('usuario_id', user.id)

  if (error) return { error: error.message }

  // Marcar los préstamos vinculados a esta reserva como 'devuelto'
  // y recalcular el estado de cada equipo involucrado
  if (pivotRows && pivotRows.length > 0) {
    const adminClient = getSupabaseAdmin()
    const writeClient = adminClient ?? supabase
    const equipoIds = (pivotRows as { equipo_id: string }[]).map(r => r.equipo_id)

    // Cerrar prestamos activos vinculados a esta reserva
    await writeClient
      .from('prestamos_equipo')
      .update({ estado: 'devuelto', fecha_devolucion: new Date().toISOString() })
      .eq('reserva_id', id)
      .eq('estado', 'activo')

    // Recalcular estado de cada equipo individualmente
    for (const equipoId of equipoIds) {
      await recalcularEstadoEquipo(equipoId)
    }
  }

  // Email notification (best-effort)
  if (user.email && details) {
    const d = details as unknown as {
      titulo: string; fecha: string; hora_inicio: string; hora_fin: string
      salas: { nombre: string } | { nombre: string }[] | null
    }
    const salaNombre = Array.isArray(d.salas) ? d.salas[0]?.nombre : d.salas?.nombre
    await sendReservaEmail({
      to: user.email,
      action: 'cancelada',
      titulo: d.titulo,
      fecha: d.fecha,
      horaInicio: d.hora_inicio,
      horaFin: d.hora_fin,
      sala: salaNombre,
    })
  }

  // Actualizar estado de la sala (re-evaluar si sigue ocupada)
  const reservaDetails = details as unknown as { sala_id?: string; salas?: { id?: string } | null } | null
  const salaId = reservaDetails?.sala_id
    ?? (Array.isArray(reservaDetails?.salas)
      ? (reservaDetails?.salas as { id?: string }[])[0]?.id
      : (reservaDetails?.salas as { id?: string } | null)?.id)
  if (salaId) await recalcularEstadoSala(salaId)

  return { success: true }
}

// ═══════════════════════════════════════════════════════════════════════════════
// ELIMINAR RESERVA
// ═══════════════════════════════════════════════════════════════════════════════
// ELIMINAR RESERVA
// ═══════════════════════════════════════════════════════════════════════════════

export async function deleteReserva(id: string): Promise<{ success?: boolean; error?: string }> {
  const { user, supabase } = await getAuthUser()
  if (!user) return { error: 'No autenticado' }

  // Obtener sala_id y equipos ANTES de eliminar la reserva
  const [pivotResult, reservaResult] = await Promise.allSettled([
    supabase.from('reserva_equipos').select('equipo_id').eq('reserva_id', id),
    supabase.from('reservas').select('sala_id').eq('id', id).eq('usuario_id', user.id).single(),
  ])

  const pivotRows = pivotResult.status === 'fulfilled' ? pivotResult.value.data : null
  const salaId    = reservaResult.status === 'fulfilled' ? reservaResult.value.data?.sala_id : null

  const { error } = await supabase
    .from('reservas')
    .delete()
    .eq('id', id)
    .eq('usuario_id', user.id)

  if (error) return { error: error.message }

  // Recalcular estado de cada equipo que estaba vinculado
  if (pivotRows && pivotRows.length > 0) {
    const equipoIds = (pivotRows as { equipo_id: string }[]).map(r => r.equipo_id)
    for (const equipoId of equipoIds) {
      await recalcularEstadoEquipo(equipoId)
    }
  }

  // Recalcular estado de la sala ahora que la reserva fue eliminada
  if (salaId) await recalcularEstadoSala(salaId)

  return { success: true }
}

// ═══════════════════════════════════════════════════════════════════════════════
// DATOS PARA REPORTES (admin)
// ═══════════════════════════════════════════════════════════════════════════════

export async function getReportData(): Promise<{ data?: ReportData; error?: string }> {
  const { user, supabase } = await getAuthUser()
  if (!user) return { error: 'No autenticado' }

  const { data: userRecord } = await supabase
    .from('usuarios')
    .select('rol')
    .eq('id', user.id)
    .single()

  if (!userRecord || !['admin', 'administrador', 'administrator'].includes(userRecord.rol)) {
    return { error: 'FORBIDDEN' }
  }

  const [equiposRes, salasRes, reservasRes, salasListaRes, equiposListaRes, reservasListaRes] = await Promise.allSettled([
    supabase.from('equipos').select('id, categoria, estado'),
    supabase.from('salas').select('id, estado'),
    supabase.from('reservas').select('id, estado, fecha'),
    supabase.from('salas').select('id, nombre, capacidad, ubicacion, estado').order('nombre'),
    supabase.from('equipos').select('id, nombre, categoria, marca, tipo_equipo, estado, numero_serie').order('nombre').limit(200),
    supabase
      .from('reservas')
      .select('id, titulo, fecha, hora_inicio, hora_fin, estado, salas(nombre), usuarios(nombre)')
      .order('fecha', { ascending: false })
      .order('hora_inicio', { ascending: false })
      .limit(200),
  ])

  const equiposData: { id: string; categoria: string; estado: string }[] =
    equiposRes.status === 'fulfilled' ? (equiposRes.value.data ?? []) : []
  const salasData: { id: string; estado: string }[] =
    salasRes.status === 'fulfilled' ? (salasRes.value.data ?? []) : []
  const reservasData: { id: string; estado: string; fecha: string }[] =
    reservasRes.status === 'fulfilled' ? (reservasRes.value.data ?? []) : []

  const salasLista: { id: string; nombre: string; capacidad: number; ubicacion: string | null; estado: string }[] =
    salasListaRes.status === 'fulfilled' ? (salasListaRes.value.data ?? []) : []
  const equiposLista: { id: string; nombre: string; categoria: string; marca: string; tipo_equipo: string; estado: string; numero_serie: string | null }[] =
    equiposListaRes.status === 'fulfilled' ? (equiposListaRes.value.data ?? []) : []

  type RawReserva = {
    id: string; titulo: string; fecha: string; hora_inicio: string; hora_fin: string; estado: string
    salas: { nombre: string } | null
    usuarios: { nombre: string } | null
  }
  const reservasListaRaw: RawReserva[] =
    reservasListaRes.status === 'fulfilled' ? ((reservasListaRes.value.data ?? []) as unknown as RawReserva[]) : []
  const reservasLista = reservasListaRaw.map(r => ({
    id: r.id,
    titulo: r.titulo,
    fecha: r.fecha,
    hora_inicio: r.hora_inicio,
    hora_fin: r.hora_fin,
    estado: r.estado,
    sala_nombre: r.salas?.nombre ?? null,
    usuario_nombre: r.usuarios?.nombre ?? null,
  }))

  // Equipos por categoría
  const catMap: Record<string, { total: number; disponibles: number }> = {}
  for (const eq of equiposData) {
    const cat = eq.categoria || 'otro'
    if (!catMap[cat]) catMap[cat] = { total: 0, disponibles: 0 }
    catMap[cat].total++
    if (eq.estado === 'disponible') catMap[cat].disponibles++
  }

  // Reservas por mes (últimos 6 meses)
  const mesMap: Record<string, number> = {}
  for (const r of reservasData) {
    const mes = r.fecha?.slice(0, 7)
    if (mes) mesMap[mes] = (mesMap[mes] || 0) + 1
  }
  const porMes = Object.entries(mesMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-6)
    .map(([mes, total]) => ({ mes, total }))

  return {
    data: {
      equipos: {
        total:        equiposData.length,
        disponibles:  equiposData.filter(e => e.estado === 'disponible').length,
        reservados:   equiposData.filter(e => e.estado === 'reservado').length,
        mantenimiento: equiposData.filter(e => e.estado === 'mantenimiento').length,
        porCategoria: Object.entries(catMap).map(([categoria, stats]) => ({ categoria, ...stats })),
        lista: equiposLista,
      },
      salas: {
        total:        salasData.length,
        disponibles:  salasData.filter(s => s.estado === 'disponible').length,
        ocupadas:     salasData.filter(s => s.estado === 'ocupada').length,
        mantenimiento: salasData.filter(s => s.estado === 'mantenimiento').length,
        lista: salasLista,
      },
      reservas: {
        total:       reservasData.length,
        confirmadas: reservasData.filter(r => r.estado === 'confirmada').length,
        pendientes:  reservasData.filter(r => r.estado === 'pendiente').length,
        canceladas:  reservasData.filter(r => r.estado === 'cancelada').length,
        porMes,
        lista: reservasLista,
      },
    },
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// PRÉSTAMOS DE EQUIPO
// ═══════════════════════════════════════════════════════════════════════════════

export type CondicionEquipo = 'nuevo' | 'excelente' | 'bueno' | 'regular' | 'dano_leve'
export type CondicionDevolucion = 'excelente' | 'bueno' | 'regular' | 'dano_leve' | 'dano_grave' | 'perdido'
export type TipoNovedad = 'dano_fisico' | 'dano_software' | 'perdida' | 'faltante_accesorio' | 'entrega_tardia' | 'otro'

export interface PrestamoEquipo {
  id: string
  equipo_id: string
  reserva_id: string | null
  sala_id: string | null
  fecha_inicio: string
  fecha_fin_esperada: string
  fecha_devolucion: string | null
  estado: 'activo' | 'devuelto' | 'vencido'
  notas: string | null
  // Gestión profesional de condición
  condicion_entrega: CondicionEquipo
  condicion_devolucion: CondicionDevolucion | null
  foto_devolucion_url: string | null
  observaciones_devolucion: string | null
  novedad: boolean
  tipo_novedad: TipoNovedad | null
  descripcion_novedad: string | null
  num_acta: string | null
  equipos: {
    id: string
    nombre: string
    tipo_equipo: string
    marca: string
    imagen_url: string | null
  } | null
  salas: { id: string; nombre: string } | null
}

export async function createPrestamoEquipo(
  equipoId: string,
  reservaId: string,
  fechaFinEsperada: string, // ISO string e.g. '2026-05-15T17:00:00'
  notas: string | null,
  condicionEntrega: CondicionEquipo = 'bueno',
): Promise<{ data?: { id: string; num_acta?: string }; error?: string }> {
  const { user, supabase } = await getAuthUser()
  if (!user) return { error: 'No autenticado' }

  if (!reservaId) return { error: 'Debes vincular el préstamo a una reserva activa.' }

  // Validar que la fecha de devolución sea futura (interpretada como hora Bogotá UTC-5)
  const fechaFinDate = new Date(fechaFinEsperada + '-05:00')
  if (isNaN(fechaFinDate.getTime()) || fechaFinDate <= new Date()) {
    return { error: 'La fecha y hora de devolución debe ser posterior al momento actual.' }
  }

  // Verificar que la reserva pertenece al usuario
  const { data: reserva } = await supabase
    .from('reservas')
    .select('id, sala_id')
    .eq('id', reservaId)
    .eq('usuario_id', user.id)
    .single()

  if (!reserva) return { error: 'La reserva seleccionada no es válida o no te pertenece.' }

  // Verificar que el equipo esté disponible
  const { data: equipo } = await supabase
    .from('equipos')
    .select('estado, sala_id')
    .eq('id', equipoId)
    .single()

  if (!equipo) return { error: 'Equipo no encontrado' }
  // Only block on maintenance — a 'reservado' estado means a CURRENT active loan,
  // but the time-overlap check below correctly handles future/non-overlapping schedules.
  // Using the stale estado column to block all non-'disponible' equipment would
  // incorrectly prevent valid loans when the existing loan does not overlap.
  if (equipo.estado === 'mantenimiento') {
    return { error: 'El equipo se encuentra en mantenimiento y no puede ser prestado.' }
  }
  // Validar que el equipo pertenece a la sala de la reserva (si tiene sala asignada)
  if (equipo.sala_id && equipo.sala_id !== reserva.sala_id) {
    return { error: 'El equipo seleccionado está asignado a otra sala y no puede prestarse para esta reserva.' }
  }

  // Calcular fecha_inicio = inicio de la reserva (no ahora)
  const { data: reservaDetalle } = await supabase
    .from('reservas')
    .select('fecha, hora_inicio')
    .eq('id', reservaId)
    .single()

  const horaInicioReserva = reservaDetalle
    ? `${reservaDetalle.fecha}T${String(reservaDetalle.hora_inicio).slice(0, 8)}-05:00`
    : new Date().toISOString()

  // Verificar que no haya préstamos activos que se solapen con este horario
  // Solape: existente.inicio < nuevo.fin  Y  existente.fin > nuevo.inicio
  const fechaFinConZona = `${fechaFinEsperada}-05:00`
  const { count: conflictos, error: errorConflicto } = await supabase
    .from('prestamos_equipo')
    .select('id', { count: 'exact', head: true })
    .eq('equipo_id', equipoId)
    .eq('estado', 'activo')
    .lt('fecha_inicio', fechaFinConZona)
    .gt('fecha_fin_esperada', horaInicioReserva)

  if (errorConflicto) return { error: 'Error al verificar disponibilidad del equipo.' }
  if ((conflictos ?? 0) > 0) {
    return { error: 'El equipo ya tiene un préstamo registrado que se solapa con el horario de tu reserva. Por favor elige otro equipo o un horario diferente.' }
  }

  const { data: prestamo, error } = await supabase
    .from('prestamos_equipo')
    .insert({
      equipo_id: equipoId,
      usuario_id: user.id,
      reserva_id: reservaId,
      sala_id: reserva.sala_id || null,
      fecha_inicio: horaInicioReserva,
      fecha_fin_esperada: fechaFinEsperada + '-05:00',
      notas,
      condicion_entrega: condicionEntrega,
    })
    .select('id, num_acta')
    .single()

  if (error) {
    // 23P01 = exclusion_violation — DB-level atomic constraint caught a race condition
    // (two users requested the same equipment at the exact same instant)
    if (error.code === '23P01') {
      return { error: 'El equipo ya fue reservado por otro usuario en ese horario. Por favor elige otro equipo o un horario diferente.' }
    }
    return { error: error.message }
  }
  if (!prestamo) return { error: 'Error al registrar el préstamo' }

  // Marcar equipo como 'reservado' solo si la reserva está activa AHORA
  const { dateStr: today, timeStr: nowTime } = getBogotaNowServer()
  const prestamoEsAhora = reservaDetalle
    ? reservaDetalle.fecha === today &&
      String(reservaDetalle.hora_inicio).slice(0, 5) <= nowTime &&
      (fechaFinEsperada.slice(11, 16)) > nowTime
    : false

  if (prestamoEsAhora) {
    const adminClient = getSupabaseAdmin()
    const writeClient = adminClient ?? supabase
    await writeClient.from('equipos').update({ estado: 'reservado' }).eq('id', equipoId)
  }

  // Send confirmation email best-effort
  try {
    const { data: userProfile } = await supabase.from('usuarios').select('correo, nombre').eq('id', user.id).single()
    if (userProfile?.correo) {
      const equipoNombre = (await supabase.from('equipos').select('nombre').eq('id', equipoId).single()).data?.nombre ?? 'Equipo'
      const salaNombre = reserva.sala_id ? (await supabase.from('salas').select('nombre').eq('id', reserva.sala_id).single()).data?.nombre : null
      await sendPrestamoEmail({
        to: userProfile.correo,
        userName: userProfile.nombre,
        action: 'confirmado',
        equipoNombre,
        numActa: prestamo.num_acta ?? '',
        condicionEntrega,
        fechaFin: fechaFinEsperada,
        salaNombre,
      })
    }
  } catch { /* best-effort */ }

  return { data: { id: prestamo.id, num_acta: prestamo.num_acta } }
}

export async function getMisPrestamos(): Promise<{ data?: PrestamoEquipo[]; error?: string }> {
  const { user, supabase } = await getAuthUser()
  if (!user) return { data: [] }

  const { data, error } = await supabase
    .from('prestamos_equipo')
    .select(`
      id, equipo_id, reserva_id, sala_id, fecha_inicio, fecha_fin_esperada, fecha_devolucion, estado, notas,
      condicion_entrega, condicion_devolucion, foto_devolucion_url, observaciones_devolucion,
      novedad, tipo_novedad, descripcion_novedad, num_acta,
      equipos:equipo_id ( id, nombre, tipo_equipo, marca, imagen_url ),
      salas:sala_id ( id, nombre )
    `)
    .eq('usuario_id', user.id)
    .eq('estado', 'activo')
    .order('fecha_fin_esperada', { ascending: true })

  if (error) {
    // Si la tabla aún no existe (migración pendiente), retornar vacío silenciosamente
    if (error.code === '42P01') return { data: [] }
    return { error: error.message }
  }
  return { data: (data ?? []) as unknown as PrestamoEquipo[] }
}

/**
 * Devuelve la fecha estimada de retorno para equipos actualmente prestados.
 * Sólo expone el equipo_id y la fecha — sin datos del usuario — para su uso
 * en la vista pública de equipos.
 */
export async function getEquiposRetornos(): Promise<{
  data?: { equipo_id: string; fecha_fin_esperada: string }[]
  error?: string
}> {
  const { user, supabase } = await getAuthUser()
  if (!user) return { data: [] }

  const ahora = new Date().toISOString()

  const { data, error } = await supabase
    .from('prestamos_equipo')
    .select('equipo_id, fecha_fin_esperada')
    .eq('estado', 'activo')
    .lte('fecha_inicio', ahora)
    .gt('fecha_fin_esperada', ahora)
    .order('fecha_fin_esperada', { ascending: true })

  if (error) {
    if (error.code === '42P01') return { data: [] }
    return { error: error.message }
  }

  // Si un equipo tiene múltiples filas (no debería con el overlap check), quedarse con la más lejana
  const map = new Map<string, string>()
  for (const row of data ?? []) {
    const existing = map.get(row.equipo_id)
    if (!existing || row.fecha_fin_esperada > existing) {
      map.set(row.equipo_id, row.fecha_fin_esperada)
    }
  }

  return { data: Array.from(map.entries()).map(([equipo_id, fecha_fin_esperada]) => ({ equipo_id, fecha_fin_esperada })) }
}

export async function devolverEquipo(
  prestamoId: string,
  condicionDevolucion: CondicionDevolucion,
  observaciones: string | null,
  fotoUrl: string | null,
  tieneNovedad: boolean,
  tipoNovedad?: TipoNovedad | null,
  descripcionNovedad?: string | null,
): Promise<{ success?: boolean; equipoId?: string; numActa?: string; error?: string }> {
  const { user, supabase } = await getAuthUser()
  if (!user) return { error: 'No autenticado' }

  const { data: prestamo, error: selectError } = await supabase
    .from('prestamos_equipo')
    .select('equipo_id, estado, num_acta, condicion_entrega, equipos:equipo_id(nombre)')
    .eq('id', prestamoId)
    .eq('usuario_id', user.id)
    .single()

  if (selectError) return { error: selectError.message }
  if (!prestamo) return { error: 'Préstamo no encontrado o sin permiso' }
  if (prestamo.estado !== 'activo') return { error: 'Este préstamo ya no está activo' }

  // Determinar si hay novedad automática por condición degradada
  const condicionesDegradadas: CondicionDevolucion[] = ['dano_leve', 'dano_grave', 'perdido']
  const novedadFinal = tieneNovedad || condicionesDegradadas.includes(condicionDevolucion)

  const updateData: Record<string, unknown> = {
    estado: 'devuelto',
    fecha_devolucion: new Date().toISOString(),
    condicion_devolucion: condicionDevolucion,
    observaciones_devolucion: observaciones,
    foto_devolucion_url: fotoUrl,
    novedad: novedadFinal,
    tipo_novedad: novedadFinal ? (tipoNovedad ?? (condicionesDegradadas.includes(condicionDevolucion) ? 'dano_fisico' : null)) : null,
    descripcion_novedad: novedadFinal ? descripcionNovedad : null,
  }

  const { error } = await supabase
    .from('prestamos_equipo')
    .update(updateData)
    .eq('id', prestamoId)
    .eq('usuario_id', user.id)

  if (error) return { error: error.message }

  // Recalcular estado real del equipo
  await recalcularEstadoEquipo(prestamo.equipo_id)

  // Email best-effort
  try {
    const { data: userProfile } = await supabase.from('usuarios').select('correo, nombre').eq('id', user.id).single()
    const equipoNombre = (prestamo as { equipos?: { nombre?: string } }).equipos
      ? ((prestamo as { equipos?: { nombre?: string } }).equipos as { nombre?: string }).nombre ?? 'Equipo'
      : 'Equipo'
    if (userProfile?.correo) {
      await sendPrestamoEmail({
        to: userProfile.correo,
        userName: userProfile.nombre,
        action: novedadFinal ? 'devuelto_novedad' : 'devuelto',
        equipoNombre,
        numActa: prestamo.num_acta ?? '',
        condicionDevolucion,
        novedadTipo: novedadFinal ? (tipoNovedad ?? null) : null,
      })
    }
    // Notificar admin si hay novedad
    if (novedadFinal) {
      const adminEmail = process.env.ADMIN_EMAIL ?? process.env.SMTP_USER
      if (adminEmail) {
        await sendNovedadEmailAdmin({
          to: adminEmail,
          equipoNombre,
          numActa: prestamo.num_acta ?? '',
          userName: userProfile?.nombre ?? '—',
          userEmail: userProfile?.correo ?? '—',
          condicionDevolucion,
          tipoNovedad: tipoNovedad ?? 'dano_fisico',
          descripcion: descripcionNovedad ?? '',
          fotoUrl,
        })
      }
    }
  } catch { /* best-effort */ }

  return { success: true, equipoId: prestamo.equipo_id, numActa: prestamo.num_acta ?? undefined }
}

export async function updatePrestamoReserva(
  prestamoId: string,
  reservaId: string,
): Promise<{ success?: boolean; error?: string }> {
  const { user, supabase } = await getAuthUser()
  if (!user) return { error: 'No autenticado' }

  // Verificar que la reserva pertenece al usuario
  const { data: reserva } = await supabase
    .from('reservas')
    .select('id, sala_id')
    .eq('id', reservaId)
    .eq('usuario_id', user.id)
    .single()

  if (!reserva) return { error: 'La reserva seleccionada no es válida o no te pertenece.' }

  const { error } = await supabase
    .from('prestamos_equipo')
    .update({ reserva_id: reservaId, sala_id: reserva.sala_id })
    .eq('id', prestamoId)
    .eq('usuario_id', user.id)

  if (error) return { error: error.message }
  return { success: true }
}

// ═══════════════════════════════════════════════════════════════════════════════
// DISPONIBILIDAD POR FRANJA HORARIA
// ═══════════════════════════════════════════════════════════════════════════════

// Horario operativo del sistema: día completo 00:00 – 23:59
// (debe coincidir con APERTURA / CIERRE de AvailabilityTimeline y HOUR_START / HOUR_END del calendario)
const HORA_APERTURA = '00:00'
const HORA_CIERRE   = '23:59'

/**
 * Calcula el estado de disponibilidad de una sala para una fecha dada.
 * Devuelve las franjas horarias reservadas y un estado derivado:
 *   - 'libre'        → sin reservas ese día
 *   - 'parcial'      → algunas franjas reservadas
 *   - 'ocupada_total'→ toda la jornada cubierta por reservas contiguas
 *   - 'mantenimiento'→ sala fuera de servicio
 */
function calcularDisponibilidadSala(
  estado: 'disponible' | 'ocupada' | 'mantenimiento',
  reservas: { hora_inicio: string; hora_fin: string }[],
): { disponibilidad: EstadoDisponibilidad; proxima_libre: string | null } {
  if (estado === 'mantenimiento') {
    return { disponibilidad: 'mantenimiento', proxima_libre: null }
  }
  if (reservas.length === 0) {
    return { disponibilidad: 'libre', proxima_libre: HORA_APERTURA }
  }

  // Verificar si toda la jornada operativa está cubierta
  const sorted = [...reservas].sort((a, b) => a.hora_inicio.localeCompare(b.hora_inicio))

  let covered = HORA_APERTURA
  for (const r of sorted) {
    if (r.hora_inicio > covered) break   // hay un hueco antes de esta reserva
    if (r.hora_fin > covered) covered = r.hora_fin
  }

  if (covered >= HORA_CIERRE) {
    return { disponibilidad: 'ocupada_total', proxima_libre: null }
  }

  // Hay al menos un hueco → parcial; proxima_libre = primer hueco disponible
  let primerLibre: string | null = HORA_APERTURA
  let cursor = HORA_APERTURA
  for (const r of sorted) {
    if (r.hora_inicio > cursor) { primerLibre = cursor; break }
    if (r.hora_fin > cursor) cursor = r.hora_fin
  }
  if (!primerLibre) primerLibre = cursor < HORA_CIERRE ? cursor : null

  return { disponibilidad: 'parcial', proxima_libre: primerLibre }
}

/**
 * Devuelve todas las salas con sus franjas horarias reservadas para una fecha.
 * Permite a la UI mostrar disponibilidad parcial en lugar de bloquear toda la sala.
 */
export async function getSalasConDisponibilidadFecha(
  fecha: string,  // 'YYYY-MM-DD'
): Promise<{ data?: SalaDisponibilidad[]; error?: string }> {
  // Use admin client so RLS does not hide reservations made by other users.
  // Availability data is read-only and must reflect all reservations.
  const admin = getSupabaseAdmin()
  if (!admin) return { error: 'Admin client no disponible' }

  const [salasResult, reservasResult] = await Promise.allSettled([
    admin
      .from('salas')
      .select('id, nombre, descripcion, capacidad, ubicacion, imagen_url, estado')
      .order('nombre'),
    admin
      .from('reservas')
      .select('sala_id, hora_inicio, hora_fin, titulo, estado')
      .eq('fecha', fecha)
      .in('estado', ['pendiente', 'confirmada']),
  ])

  if (salasResult.status === 'rejected') return { error: 'Error al cargar salas' }

  const salas = salasResult.value.data ?? []
  const reservas = reservasResult.status === 'fulfilled' ? (reservasResult.value.data ?? []) : []

  // Agrupar reservas por sala_id
  const porSala = new Map<string, { hora_inicio: string; hora_fin: string; titulo?: string }[]>()
  for (const r of reservas) {
    const arr = porSala.get(r.sala_id) ?? []
    arr.push({
      hora_inicio: (r.hora_inicio as string).slice(0, 5),
      hora_fin:    (r.hora_fin as string).slice(0, 5),
      titulo:      r.titulo ?? undefined,
    })
    porSala.set(r.sala_id, arr)
  }

  const data: SalaDisponibilidad[] = salas.map(s => {
    const franjas = porSala.get(s.id) ?? []
    const { disponibilidad, proxima_libre } = calcularDisponibilidadSala(s.estado, franjas)
    return {
      id:                s.id,
      nombre:            s.nombre,
      descripcion:       s.descripcion,
      capacidad:         s.capacidad,
      ubicacion:         s.ubicacion,
      imagen_url:        s.imagen_url,
      estado:            s.estado,
      franjas_reservadas: franjas.sort((a, b) => a.hora_inicio.localeCompare(b.hora_inicio)),
      disponibilidad,
      proxima_libre,
    }
  })

  return { data }
}

/**
 * Devuelve las franjas horarias reservadas (pendiente + confirmada) para una
 * sala específica en una fecha concreta. Útil para mostrar disponibilidad en
 * el formulario de reserva sin necesidad de cargar todas las salas.
 *
 * @param salaId          UUID de la sala
 * @param fecha           'YYYY-MM-DD'
 * @param excludeReservaId  Omite esta reserva del cálculo (útil al editar)
 */
export async function getDisponibilidadSala(
  salaId: string,
  fecha: string,
  excludeReservaId?: string,
): Promise<{ franjas?: FranjaOcupada[]; error?: string }> {
  // Use admin client so RLS does not hide reservations made by other users.
  // The timeline must show ALL booked slots regardless of who made them.
  const admin = getSupabaseAdmin()
  if (!admin) return { error: 'Admin client no disponible' }

  let query = admin
    .from('reservas')
    .select('hora_inicio, hora_fin, titulo')
    .eq('sala_id', salaId)
    .eq('fecha', fecha)
    .in('estado', ['pendiente', 'confirmada'])

  if (excludeReservaId) {
    query = query.neq('id', excludeReservaId)
  }

  const { data, error } = await query

  if (error) return { error: error.message }

  const franjas: FranjaOcupada[] = (data ?? [])
    .map(r => ({
      hora_inicio: (r.hora_inicio as string).slice(0, 5),
      hora_fin:    (r.hora_fin as string).slice(0, 5),
      titulo:      r.titulo ?? undefined,
    }))
    .sort((a, b) => a.hora_inicio.localeCompare(b.hora_inicio))

  return { franjas }
}

/**
 * Recalcula el estado de TODOS los equipos no mantenimiento
 * en función de si tienen un préstamo activo en curso ahora mismo.
 * Acción pensada para admins o para llamar al cargar el tab de equipos.
 */
export async function recalcularEstadosEquiposDB(): Promise<{ updated: number; error?: string }> {
  const adminClient = getSupabaseAdmin()
  if (!adminClient) return { updated: 0, error: 'Admin client no disponible' }

  const ahora = new Date().toISOString()

  // Equipos con préstamo activo EN CURSO
  const { data: enUso } = await adminClient
    .from('prestamos_equipo')
    .select('equipo_id')
    .eq('estado', 'activo')
    .lte('fecha_inicio', ahora)
    .gt('fecha_fin_esperada', ahora)

  const enUsoIds = new Set((enUso ?? []).map(p => p.equipo_id))

  // Obtener todos los equipos no-mantenimiento
  const { data: todos } = await adminClient
    .from('equipos')
    .select('id, estado')
    .neq('estado', 'mantenimiento')

  if (!todos) return { updated: 0 }

  const aReservar   = todos.filter(e => enUsoIds.has(e.id)  && e.estado !== 'reservado').map(e => e.id)
  const aLiberar    = todos.filter(e => !enUsoIds.has(e.id) && e.estado !== 'disponible').map(e => e.id)

  let updated = 0
  if (aReservar.length > 0) {
    await adminClient.from('equipos').update({ estado: 'reservado'  }).in('id', aReservar)
    updated += aReservar.length
  }
  if (aLiberar.length > 0) {
    await adminClient.from('equipos').update({ estado: 'disponible' }).in('id', aLiberar)
    updated += aLiberar.length
  }

  return { updated }
}
