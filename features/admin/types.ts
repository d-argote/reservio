/** Valores válidos del campo `rol` que reciben acceso de administrador. */
export const ADMIN_ROLES = ['admin', 'administrador', 'administrator'] as const

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

export interface PrestamoEquipoAdmin {
  id: string
  equipo_id: string
  usuario_id: string
  sala_id: string | null
  fecha_inicio: string
  fecha_fin_esperada: string
  fecha_devolucion: string | null
  estado: 'activo' | 'devuelto' | 'vencido' | 'pendiente_revision'
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
