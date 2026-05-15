'use server'

import { createClient } from '@/lib/supabase/server'

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
  }
  salas: {
    total: number
    disponibles: number
    ocupadas: number
    mantenimiento: number
  }
  reservas: {
    total: number
    confirmadas: number
    pendientes: number
    canceladas: number
    porMes: { mes: string; total: number }[]
  }
}

// ─── helper interno ────────────────────────────────────────────────
async function getAuthUser() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return { user, supabase }
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
    .select('usuario_id, sala_id, fecha, hora_inicio, hora_fin, estado')
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
  return { success: true }
}

// ═══════════════════════════════════════════════════════════════════════════════
// CANCELAR RESERVA
// ═══════════════════════════════════════════════════════════════════════════════

export async function cancelarReserva(id: string): Promise<{ success?: boolean; error?: string }> {
  const { user, supabase } = await getAuthUser()
  if (!user) return { error: 'No autenticado' }

  // Obtener equipos vinculados para liberarlos
  const { data: pivotRows } = await supabase
    .from('reserva_equipos')
    .select('equipo_id')
    .eq('reserva_id', id)

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

  const [equiposRes, salasRes, reservasRes] = await Promise.allSettled([
    supabase.from('equipos').select('id, categoria, estado'),
    supabase.from('salas').select('id, estado'),
    supabase.from('reservas').select('id, estado, fecha'),
  ])

  const equiposData: { id: string; categoria: string; estado: string }[] =
    equiposRes.status === 'fulfilled' ? (equiposRes.value.data ?? []) : []
  const salasData: { id: string; estado: string }[] =
    salasRes.status === 'fulfilled' ? (salasRes.value.data ?? []) : []
  const reservasData: { id: string; estado: string; fecha: string }[] =
    reservasRes.status === 'fulfilled' ? (reservasRes.value.data ?? []) : []

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
      },
      salas: {
        total:        salasData.length,
        disponibles:  salasData.filter(s => s.estado === 'disponible').length,
        ocupadas:     salasData.filter(s => s.estado === 'ocupada').length,
        mantenimiento: salasData.filter(s => s.estado === 'mantenimiento').length,
      },
      reservas: {
        total:       reservasData.length,
        confirmadas: reservasData.filter(r => r.estado === 'confirmada').length,
        pendientes:  reservasData.filter(r => r.estado === 'pendiente').length,
        canceladas:  reservasData.filter(r => r.estado === 'cancelada').length,
        porMes,
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
