'use server'

import { createClient } from '@/lib/supabase/server'
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

// ═══════════════════════════════════════════════════════════════════════════════
// CREAR RESERVA
// ═══════════════════════════════════════════════════════════════════════════════

export async function createReserva(
  data: ReservaInput,
  equiposIds: string[] = [],
): Promise<{ data?: { id: string }; error?: string }> {
  const { user, supabase } = await getAuthUser()
  if (!user) return { error: 'No autenticado' }

  // Verificar conflicto de horario en la misma sala y fecha
  const { data: overlapping } = await supabase
    .from('reservas')
    .select('id')
    .eq('sala_id', data.sala_id)
    .eq('fecha', data.fecha)
    .in('estado', ['pendiente', 'confirmada'])
    .lt('hora_inicio', data.hora_fin)
    .gt('hora_fin', data.hora_inicio)

  if (overlapping && overlapping.length > 0) {
    return { error: 'La sala ya tiene una reserva en ese horario. Elige otra franja horaria.' }
  }

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

  if (error) return { error: error.message }
  if (!reserva) return { error: 'Error al crear la reserva' }

  // Vincular equipos si los hay
  if (equiposIds.length > 0) {
    // Tabla pivote (best-effort — requiere ejecutar la migración SQL)
    const pivotRows = equiposIds.map(equipoId => ({
      reserva_id: reserva.id,
      equipo_id: equipoId,
    }))
    await supabase.from('reserva_equipos').insert(pivotRows)

    // Marcar equipos como reservados
    await supabase
      .from('equipos')
      .update({ estado: 'reservado' })
      .in('id', equiposIds)
  }

  // Email notification (best-effort)
  if (user.email) {
    const { data: salaInfo } = await supabase
      .from('salas')
      .select('nombre')
      .eq('id', data.sala_id)
      .single()
    await sendReservaEmail({
      to: user.email,
      action: 'confirmada',
      titulo: data.titulo.trim(),
      fecha: data.fecha,
      horaInicio: data.hora_inicio,
      horaFin: data.hora_fin,
      sala: salaInfo?.nombre,
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
      .select('titulo, fecha, hora_inicio, hora_fin, salas(nombre)')
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

  if (pivotRows && pivotRows.length > 0) {
    await supabase
      .from('equipos')
      .update({ estado: 'disponible' })
      .in('id', (pivotRows as { equipo_id: string }[]).map(r => r.equipo_id))
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

  const { data: pivotRows } = await supabase
    .from('reserva_equipos')
    .select('equipo_id')
    .eq('reserva_id', id)

  const { error } = await supabase
    .from('reservas')
    .delete()
    .eq('id', id)
    .eq('usuario_id', user.id)

  if (error) return { error: error.message }

  if (pivotRows && pivotRows.length > 0) {
    await supabase
      .from('equipos')
      .update({ estado: 'disponible' })
      .in('id', (pivotRows as { equipo_id: string }[]).map(r => r.equipo_id))
  }

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

export interface PrestamoEquipo {
  id: string
  equipo_id: string
  sala_id: string | null
  fecha_inicio: string
  fecha_fin_esperada: string
  fecha_devolucion: string | null
  estado: 'activo' | 'devuelto' | 'vencido'
  notas: string | null
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
  salaId: string | null,
  fechaFinEsperada: string, // ISO string e.g. '2026-05-15T17:00:00'
  notas: string | null,
): Promise<{ data?: { id: string }; error?: string }> {
  const { user, supabase } = await getAuthUser()
  if (!user) return { error: 'No autenticado' }

  // Validar que la fecha de devolución sea futura (interpretada como hora Bogotá UTC-5)
  const fechaFinDate = new Date(fechaFinEsperada + '-05:00')
  if (isNaN(fechaFinDate.getTime()) || fechaFinDate <= new Date()) {
    return { error: 'La fecha y hora de devolución debe ser posterior al momento actual.' }
  }

  // Verificar que el equipo esté disponible
  const { data: equipo } = await supabase
    .from('equipos')
    .select('estado')
    .eq('id', equipoId)
    .single()

  if (!equipo) return { error: 'Equipo no encontrado' }
  if (equipo.estado !== 'disponible') {
    return { error: 'El equipo ya no está disponible. Puede que alguien más lo haya solicitado.' }
  }

  const { data: prestamo, error } = await supabase
    .from('prestamos_equipo')
    .insert({
      equipo_id: equipoId,
      usuario_id: user.id,
      sala_id: salaId,
      fecha_fin_esperada: fechaFinEsperada,
      notas,
    })
    .select('id')
    .single()

  if (error) return { error: error.message }
  if (!prestamo) return { error: 'Error al registrar el préstamo' }

  // Marcar equipo como reservado
  await supabase
    .from('equipos')
    .update({ estado: 'reservado' })
    .eq('id', equipoId)

  return { data: { id: prestamo.id } }
}

export async function getMisPrestamos(): Promise<{ data?: PrestamoEquipo[]; error?: string }> {
  const { user, supabase } = await getAuthUser()
  if (!user) return { data: [] }

  const { data, error } = await supabase
    .from('prestamos_equipo')
    .select(`
      id, equipo_id, sala_id, fecha_inicio, fecha_fin_esperada, fecha_devolucion, estado, notas,
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

export async function devolverEquipo(
  prestamoId: string,
): Promise<{ success?: boolean; equipoId?: string; error?: string }> {
  const { user, supabase } = await getAuthUser()
  if (!user) return { error: 'No autenticado' }

  const { data: prestamo } = await supabase
    .from('prestamos_equipo')
    .select('equipo_id, estado')
    .eq('id', prestamoId)
    .eq('usuario_id', user.id)
    .single()

  if (!prestamo) return { error: 'Préstamo no encontrado o sin permiso' }
  if (prestamo.estado !== 'activo') return { error: 'Este préstamo ya no está activo' }

  const { error } = await supabase
    .from('prestamos_equipo')
    .update({ estado: 'devuelto', fecha_devolucion: new Date().toISOString() })
    .eq('id', prestamoId)
    .eq('usuario_id', user.id)

  if (error) return { error: error.message }

  // Liberar el equipo
  await supabase
    .from('equipos')
    .update({ estado: 'disponible' })
    .eq('id', prestamo.equipo_id)

  return { success: true, equipoId: prestamo.equipo_id }
}
