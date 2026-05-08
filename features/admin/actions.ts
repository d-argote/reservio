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
    .select('id, nombre, categoria, sistema_operativo, marca, tipo_equipo, estado, imagen_url')
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
  const { error } = await supabase
    .from('salas')
    .delete()
    .eq('id', id)

  if (error) return { error: error.message }
  return { success: true }
}
