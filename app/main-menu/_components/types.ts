import type { EstadoDisponibilidad } from '@/features/reservas/actions'

export interface UserProfile {
  nombre: string
  rol: string
}

export interface Sala {
  id: string
  nombre: string
  descripcion: string | null
  capacidad: number
  ubicacion: string | null
  imagen_url: string | null
  estado: 'disponible' | 'ocupada' | 'mantenimiento'
  franjas_reservadas?: { hora_inicio: string; hora_fin: string; titulo?: string }[]
  disponibilidad?: EstadoDisponibilidad
  proxima_libre?: string | null
}

export interface Reserva {
  id: string
  titulo: string
  fecha: string
  hora_inicio: string
  hora_fin: string
  estado: 'pendiente' | 'confirmada' | 'cancelada'
  salas: Pick<Sala, 'id' | 'nombre' | 'capacidad' | 'ubicacion'> | null
}

export type ActiveTab = 'reservations' | 'rooms' | 'tech' | 'profile' | 'admin'
export type AdminSubTab = 'users' | 'equipment' | 'rooms' | 'reports'

export interface ReservaForm {
  titulo: string
  sala_id: string
  fecha: string
  hora_inicio: string
  hora_fin: string
}

export const EMPTY_FORM: ReservaForm = {
  titulo: '',
  sala_id: '',
  fecha: '',
  hora_inicio: '',
  hora_fin: '',
}
