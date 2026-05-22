'use server'

import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

// ═══════════════════════════════════════════════════════════════════════════════
// TIPOS
// ═══════════════════════════════════════════════════════════════════════════════

export interface UsuarioAdmin {
  id: string
  nombre: string
  correo: string
  rol: string
  activo: boolean
}

export interface SalaAdmin {
  id: string
  nombre: string
  descripcion: string | null
  capacidad: number
  ubicacion: string | null
  imagen_url: string | null
  estado: 'disponible' | 'ocupada' | 'mantenimiento'
}

export interface Equipo {
  id: string
  nombre: string
  categoria: string
  sistema_operativo: string
  marca: string
  tipo_equipo: string
  estado: 'disponible' | 'reservado' | 'mantenimiento'
  imagen_url: string | null
  numero_serie: string | null
  sala_id?: string | null
}

// ═══════════════════════════════════════════════════════════════════════════════
// GUARD — verifica que quien llama sea admin
// ═══════════════════════════════════════════════════════════════════════════════

async function assertAdmin(): Promise<{ error: string } | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'NO_SESSION' }

  const { data } = await supabase
    .from('usuarios')
    .select('rol')
    .eq('id', user.id)
    .single()

  const rol = data?.rol ?? ''
  if (!['admin', 'administrador', 'administrator'].includes(rol)) {
    return { error: 'FORBIDDEN' }
  }
  return null
}

// ═══════════════════════════════════════════════════════════════════════════════
// USUARIOS
// ═══════════════════════════════════════════════════════════════════════════════

export async function getUsuarios(): Promise<{ data?: UsuarioAdmin[]; error?: string }> {
  const guard = await assertAdmin()
  if (guard) return { error: guard.error }

  const supabase = getSupabaseAdmin()
  if (!supabase) return { error: 'Error interno del servidor' }
  const { data, error } = await supabase
    .from('usuarios')
    .select('id, nombre, correo, rol, activo')
    .order('nombre')

  if (error) return { error: error.message }
  return { data: (data ?? []) as UsuarioAdmin[] }
}

export async function updateUserRole(
  userId: string,
  newRol: 'usuario' | 'admin',
): Promise<{ success?: boolean; error?: string }> {
  const guard = await assertAdmin()
  if (guard) return { error: guard.error }

  const supabase = getSupabaseAdmin()
  if (!supabase) return { error: 'Error interno del servidor' }
  const { error } = await supabase
    .from('usuarios')
    .update({ rol: newRol })
    .eq('id', userId)

  if (error) return { error: error.message }
  return { success: true }
}

export async function createUsuarioAdmin(
  nombre: string,
  correo: string,
  password: string,
  rol: 'usuario' | 'admin',
): Promise<{ success?: boolean; error?: string }> {
  const guard = await assertAdmin()
  if (guard) return { error: guard.error }

  const supabase = getSupabaseAdmin()
  if (!supabase) return { error: 'Error interno del servidor' }
  const email = correo.trim().toLowerCase()

  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { nombre },
  })
  if (authError) return { error: authError.message }

  const { error: dbError } = await supabase
    .from('usuarios')
    .upsert({ id: authData.user.id, nombre: nombre.trim(), correo: email, rol, activo: true })
  if (dbError) return { error: dbError.message }
  return { success: true }
}

export async function toggleUsuarioActivo(
  userId: string,
  activo: boolean,
): Promise<{ success?: boolean; error?: string }> {
  const guard = await assertAdmin()
  if (guard) return { error: guard.error }

  const supabase = getSupabaseAdmin()
  if (!supabase) return { error: 'Error interno del servidor' }
  const { error } = await supabase
    .from('usuarios')
    .update({ activo })
    .eq('id', userId)

  if (error) return { error: error.message }
  return { success: true }
}

export async function updateUsuarioEmail(
  userId: string,
  newEmail: string,
): Promise<{ success?: boolean; error?: string }> {
  const guard = await assertAdmin()
  if (guard) return { error: guard.error }

  const supabase = getSupabaseAdmin()
  if (!supabase) return { error: 'Error interno del servidor' }
  const email = newEmail.trim().toLowerCase()

  const { error: authError } = await supabase.auth.admin.updateUserById(userId, { email })
  if (authError) return { error: authError.message }

  const { error: dbError } = await supabase
    .from('usuarios')
    .update({ correo: email })
    .eq('id', userId)
  if (dbError) return { error: dbError.message }
  return { success: true }
}

export async function updateUsuarioNombre(
  userId: string,
  newNombre: string,
): Promise<{ success?: boolean; error?: string }> {
  const guard = await assertAdmin()
  if (guard) return { error: guard.error }

  const supabase = getSupabaseAdmin()
  if (!supabase) return { error: 'Error interno del servidor' }
  const nombre = newNombre.trim()
  if (!nombre) return { error: 'El nombre no puede estar vacío' }

  const { error } = await supabase
    .from('usuarios')
    .update({ nombre })
    .eq('id', userId)

  if (error) return { error: error.message }
  return { success: true }
}

export async function sendPasswordResetAdmin(
  correo: string,
): Promise<{ success?: boolean; error?: string }> {
  const guard = await assertAdmin()
  if (guard) return { error: guard.error }

  const supabase = await createClient()
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
  const { error } = await supabase.auth.resetPasswordForEmail(correo.trim().toLowerCase(), {
    redirectTo: `${siteUrl}/auth/callback?next=/reset-password`,
  })
  if (error) return { error: error.message }
  return { success: true }
}

// ═══════════════════════════════════════════════════════════════════════════════
// EQUIPOS
// ═══════════════════════════════════════════════════════════════════════════════

export async function getEquipos(): Promise<{ data?: Equipo[]; error?: string }> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('equipos')
    .select('id, nombre, categoria, sistema_operativo, marca, tipo_equipo, estado, imagen_url, numero_serie, sala_id')
    .order('nombre')

  if (error) return { error: error.message }
  return { data: (data ?? []) as Equipo[] }
}

export async function createEquipo(
  equipo: Omit<Equipo, 'id'>,
): Promise<{ data?: Equipo; error?: string }> {
  const guard = await assertAdmin()
  if (guard) return { error: guard.error }

  const supabase = getSupabaseAdmin()
  if (!supabase) return { error: 'Error interno del servidor' }
  const { data, error } = await supabase
    .from('equipos')
    .insert(equipo)
    .select()
    .single()

  if (error) return { error: error.message }
  return { data: data as Equipo }
}

export async function updateEquipoEstado(
  id: string,
  estado: Equipo['estado'],
): Promise<{ success?: boolean; error?: string }> {
  const guard = await assertAdmin()
  if (guard) return { error: guard.error }

  const supabase = getSupabaseAdmin()
  if (!supabase) return { error: 'Error interno del servidor' }
  const { error } = await supabase
    .from('equipos')
    .update({ estado })
    .eq('id', id)

  if (error) return { error: error.message }
  return { success: true }
}

export async function updateEquipo(
  id: string,
  updates: Partial<Omit<Equipo, 'id'>>,
): Promise<{ success?: boolean; error?: string }> {
  const guard = await assertAdmin()
  if (guard) return { error: guard.error }

  const supabase = getSupabaseAdmin()
  if (!supabase) return { error: 'Error interno del servidor' }
  const { error } = await supabase
    .from('equipos')
    .update(updates)
    .eq('id', id)

  if (error) return { error: error.message }
  return { success: true }
}

export async function deleteEquipo(id: string): Promise<{ success?: boolean; error?: string }> {
  const guard = await assertAdmin()
  if (guard) return { error: guard.error }

  const supabase = getSupabaseAdmin()
  if (!supabase) return { error: 'Error interno del servidor' }

  // Validación: No permitir si el estado es reservado
  const { data: equipo } = await supabase.from('equipos').select('estado').eq('id', id).single()
  if (equipo?.estado === 'reservado') {
    return { error: 'No se puede eliminar el equipo porque se encuentra actualmente reservado.' }
  }

  // Validación: No permitir si hay préstamos activos o vencidos
  const { count: countPrestamos } = await supabase
    .from('prestamos_equipo')
    .select('id', { count: 'exact', head: true })
    .eq('equipo_id', id)
    .in('estado', ['activo', 'vencido'])
  
  if (countPrestamos && countPrestamos > 0) {
    return { error: 'No se puede eliminar el equipo porque tiene préstamos en curso.' }
  }

  const { error } = await supabase
    .from('equipos')
    .delete()
    .eq('id', id)

  if (error) return { error: error.message }
  return { success: true }
}

// ═══════════════════════════════════════════════════════════════════════════════
// SALAS
// ═══════════════════════════════════════════════════════════════════════════════

export async function getSalasAdmin(): Promise<{ data?: SalaAdmin[]; error?: string }> {
  const guard = await assertAdmin()
  if (guard) return { error: guard.error }

  const supabase = getSupabaseAdmin()
  if (!supabase) return { error: 'Error interno del servidor' }
  const { data, error } = await supabase
    .from('salas')
    .select('id, nombre, descripcion, capacidad, ubicacion, imagen_url, estado')
    .order('nombre')

  if (error) return { error: error.message }
  return { data: (data ?? []) as SalaAdmin[] }
}

export async function createSala(
  sala: Omit<SalaAdmin, 'id'>,
): Promise<{ data?: SalaAdmin; error?: string }> {
  const guard = await assertAdmin()
  if (guard) return { error: guard.error }

  const supabase = getSupabaseAdmin()
  if (!supabase) return { error: 'Error interno del servidor' }
  const { data, error } = await supabase
    .from('salas')
    .insert(sala)
    .select()
    .single()

  if (error) return { error: error.message }
  return { data: data as SalaAdmin }
}

export async function updateSala(
  id: string,
  updates: Partial<Omit<SalaAdmin, 'id'>>,
): Promise<{ success?: boolean; error?: string }> {
  const guard = await assertAdmin()
  if (guard) return { error: guard.error }

  const supabase = getSupabaseAdmin()
  if (!supabase) return { error: 'Error interno del servidor' }
  const { error } = await supabase
    .from('salas')
    .update(updates)
    .eq('id', id)

  if (error) return { error: error.message }
  return { success: true }
}

export async function deleteSala(id: string): Promise<{ success?: boolean; error?: string }> {
  const guard = await assertAdmin()
  if (guard) return { error: guard.error }

  const supabase = getSupabaseAdmin()
  if (!supabase) return { error: 'Error interno del servidor' }

  // Validación: Verificar que la sala no tenga reservas activas o pendientes
  const { count: countReservas } = await supabase
    .from('reservas')
    .select('id', { count: 'exact', head: true })
    .eq('sala_id', id)
    .in('estado', ['pendiente', 'confirmada'])
  
  if (countReservas && countReservas > 0) {
    return { error: 'No se puede eliminar la sala porque tiene reservas pendientes o confirmadas.' }
  }

  const { error } = await supabase
    .from('salas')
    .delete()
    .eq('id', id)

  if (error) return { error: error.message }
  return { success: true }
}

// ═══════════════════════════════════════════════════════════════════════════════
// ASIGNACIÓN DE SALA A EQUIPO + PRÉSTAMOS (ADMIN)
// ═══════════════════════════════════════════════════════════════════════════════

/** Asigna (o desasigna) un equipo a una sala de forma permanente */
export async function asignarEquipoASala(
  equipoId: string,
  salaId: string | null,
): Promise<{ success?: boolean; error?: string }> {
  const guard = await assertAdmin()
  if (guard) return { error: guard.error }

  const supabase = getSupabaseAdmin()
  if (!supabase) return { error: 'Error interno del servidor' }
  const { error } = await supabase
    .from('equipos')
    .update({ sala_id: salaId })
    .eq('id', equipoId)

  if (error) return { error: error.message }
  return { success: true }
}

export interface PrestamoEquipoAdmin {
  id: string
  equipo_id: string
  usuario_id: string
  sala_id: string | null
  fecha_inicio: string
  fecha_fin_esperada: string
  fecha_devolucion: string | null
  estado: 'activo' | 'devuelto' | 'vencido'
  notas: string | null
  condicion_entrega: string
  condicion_devolucion: string | null
  foto_devolucion_url: string | null
  observaciones_devolucion: string | null
  novedad: boolean
  tipo_novedad: string | null
  descripcion_novedad: string | null
  notas_admin: string | null
  num_acta: string | null
  equipos: { id: string; nombre: string; tipo_equipo: string; imagen_url: string | null } | null
  usuarios: { id: string; nombre: string; correo: string } | null
  salas: { id: string; nombre: string } | null
}

const PRESTAMOS_SELECT = `
  id, equipo_id, usuario_id, sala_id, fecha_inicio, fecha_fin_esperada, fecha_devolucion, estado, notas,
  condicion_entrega, condicion_devolucion, foto_devolucion_url, observaciones_devolucion,
  novedad, tipo_novedad, descripcion_novedad, notas_admin, num_acta,
  equipos:equipo_id ( id, nombre, tipo_equipo, imagen_url ),
  usuarios:usuario_id ( id, nombre, correo ),
  salas:sala_id ( id, nombre )
`

// Préstamos activos + vencidos
export async function getPrestamosAdmin(): Promise<{ data?: PrestamoEquipoAdmin[]; error?: string }> {
  const guard = await assertAdmin()
  if (guard) return { error: guard.error }

  const supabase = getSupabaseAdmin()
  if (!supabase) return { error: 'Error interno del servidor' }

  const { data, error } = await supabase
    .from('prestamos_equipo')
    .select(PRESTAMOS_SELECT)
    .in('estado', ['activo', 'vencido'])
    .order('fecha_fin_esperada', { ascending: true })

  if (error) {
    if (error.code === '42P01') return { data: [] }
    return { error: error.message }
  }
  return { data: (data ?? []) as unknown as PrestamoEquipoAdmin[] }
}

// Historial completo con filtros opcionales
export async function getPrestamosAdminHistorial(opts?: {
  estado?: 'activo' | 'devuelto' | 'vencido' | 'todos'
  soloNovedades?: boolean
}): Promise<{ data?: PrestamoEquipoAdmin[]; error?: string }> {
  const guard = await assertAdmin()
  if (guard) return { error: guard.error }

  const supabase = getSupabaseAdmin()
  if (!supabase) return { error: 'Error interno del servidor' }

  let query = supabase.from('prestamos_equipo').select(PRESTAMOS_SELECT)

  if (opts?.estado && opts.estado !== 'todos') {
    query = query.eq('estado', opts.estado)
  }
  if (opts?.soloNovedades) {
    query = query.eq('novedad', true)
  }
  query = query.order('fecha_fin_esperada', { ascending: false }).limit(200)

  const { data, error } = await query
  if (error) {
    if (error.code === '42P01') return { data: [] }
    return { error: error.message }
  }
  return { data: (data ?? []) as unknown as PrestamoEquipoAdmin[] }
}

export async function devolverPrestamoAdmin(
  prestamoId: string,
  equipoId: string,
  condicionDevolucion: string,
  notasAdmin: string | null,
  novedadTipo?: string | null,
  descripcionNovedad?: string | null,
): Promise<{ success?: boolean; error?: string }> {
  const guard = await assertAdmin()
  if (guard) return { error: guard.error }

  const supabase = getSupabaseAdmin()
  if (!supabase) return { error: 'Error interno del servidor' }

  const novedadFinal = !!novedadTipo || ['dano_leve','dano_grave','perdido'].includes(condicionDevolucion)

  const { error } = await supabase
    .from('prestamos_equipo')
    .update({
      estado: 'devuelto',
      fecha_devolucion: new Date().toISOString(),
      condicion_devolucion: condicionDevolucion,
      notas_admin: notasAdmin,
      novedad: novedadFinal,
      tipo_novedad: novedadFinal ? (novedadTipo ?? 'dano_fisico') : null,
      descripcion_novedad: novedadFinal ? descripcionNovedad : null,
    })
    .eq('id', prestamoId)

  if (error) return { error: error.message }

  // Si fue perdido, marcar como mantenimiento; si hay daño grave, igual
  const nuevoEstado = condicionDevolucion === 'perdido' || condicionDevolucion === 'dano_grave'
    ? 'mantenimiento'
    : 'disponible'

  await supabase.from('equipos').update({ estado: nuevoEstado }).eq('id', equipoId)

  return { success: true }
}

export async function actualizarNotasAdmin(
  prestamoId: string,
  notasAdmin: string,
): Promise<{ success?: boolean; error?: string }> {
  const guard = await assertAdmin()
  if (guard) return { error: guard.error }

  const supabase = getSupabaseAdmin()
  if (!supabase) return { error: 'Error interno del servidor' }

  const { error } = await supabase
    .from('prestamos_equipo')
    .update({ notas_admin: notasAdmin })
    .eq('id', prestamoId)

  if (error) return { error: error.message }
  return { success: true }
}

// ═══════════════════════════════════════════════════════════════════════════════
// ALERTAS DE EQUIPOS — para el panel de administración
// ═══════════════════════════════════════════════════════════════════════════════

export interface AlertaEquipoAdmin {
  prestamo_id: string
  equipo_id: string
  equipo_nombre: string
  usuario_nombre: string
  usuario_correo: string
  fecha_inicio: string
  fecha_fin_esperada: string
  num_acta: string | null
  /** activo_ahora = en uso ahora; vencido = pasó su fecha y no se devolvió; proximo_24h / proximo_48h = empieza pronto */
  tipo: 'activo_ahora' | 'vencido' | 'proximo_24h' | 'proximo_48h'
}

/**
 * Devuelve:
 *  - Préstamos activos en este momento (incluye los vencidos sin devolución)
 *  - Préstamos programados que empiezan en las próximas 48 h
 */
export async function getAlertasEquiposAdmin(): Promise<{ data?: AlertaEquipoAdmin[]; error?: string }> {
  const guard = await assertAdmin()
  if (guard) return { error: guard.error }

  const supabase = getSupabaseAdmin()
  if (!supabase) return { error: 'Error interno del servidor' }

  const ahora = new Date()
  const ahoraISO = ahora.toISOString()
  const en48hISO = new Date(ahora.getTime() + 48 * 60 * 60 * 1000).toISOString()

  const ALERTA_SELECT = `
    id, equipo_id, fecha_inicio, fecha_fin_esperada, num_acta,
    equipos:equipo_id ( nombre ),
    usuarios:usuario_id ( nombre, correo )
  `

  // Préstamos que ya comenzaron (activos ahora o vencidos sin devolución)
  const { data: activosData } = await supabase
    .from('prestamos_equipo')
    .select(ALERTA_SELECT)
    .eq('estado', 'activo')
    .lte('fecha_inicio', ahoraISO)
    .order('fecha_fin_esperada', { ascending: true })

  // Próximos en las próximas 48 h
  const { data: proximosData } = await supabase
    .from('prestamos_equipo')
    .select(ALERTA_SELECT)
    .eq('estado', 'activo')
    .gt('fecha_inicio', ahoraISO)
    .lte('fecha_inicio', en48hISO)
    .order('fecha_inicio', { ascending: true })

  type AlertaRow = {
    id: string
    equipo_id: string
    fecha_inicio: string
    fecha_fin_esperada: string
    num_acta: string | null
    equipos: { nombre: string } | null
    usuarios: { nombre: string; correo: string } | null
  }

  const toAlerta = (row: AlertaRow, tipo: AlertaEquipoAdmin['tipo']): AlertaEquipoAdmin => ({
    prestamo_id: row.id,
    equipo_id: row.equipo_id,
    equipo_nombre: row.equipos?.nombre ?? '—',
    usuario_nombre: row.usuarios?.nombre ?? '—',
    usuario_correo: row.usuarios?.correo ?? '—',
    fecha_inicio: row.fecha_inicio,
    fecha_fin_esperada: row.fecha_fin_esperada,
    num_acta: row.num_acta,
    tipo,
  })

  const alertas: AlertaEquipoAdmin[] = [
    ...(activosData ?? []).map(row => {
      const tipo: AlertaEquipoAdmin['tipo'] =
        new Date(row.fecha_fin_esperada) < ahora ? 'vencido' : 'activo_ahora'
      return toAlerta(row as AlertaRow, tipo)
    }),
    ...(proximosData ?? []).map(row => {
      const horasHasta = (new Date(row.fecha_inicio).getTime() - ahora.getTime()) / (1000 * 60 * 60)
      const tipo: AlertaEquipoAdmin['tipo'] = horasHasta <= 24 ? 'proximo_24h' : 'proximo_48h'
      return toAlerta(row as AlertaRow, tipo)
    }),
  ]

  return { data: alertas }
}
