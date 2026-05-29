'use client'

import { supabase } from '@/lib/supabase/client'
import type { CondicionEquipo, CondicionDevolucion, TipoNovedad } from '@/features/reservas/actions'

// ── Date/Time Helpers ──────────────────────────────────────────────

export function formatFecha(fechaStr: string): string {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today)
  tomorrow.setDate(today.getDate() + 1)
  const [y, m, d] = fechaStr.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  if (date.getTime() === today.getTime()) return 'Hoy'
  if (date.getTime() === tomorrow.getTime()) return 'Mañana'
  return date.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' })
}

export function formatHora(hora: string): string {
  return hora.slice(0, 5)
}

/** Suma `horas` (puede ser decimal) a un string 'HH:MM' y devuelve 'HH:MM'. */
export function addHoras(timeStr: string, horas: number): string {
  const [h, m] = timeStr.split(':').map(Number)
  const totalMin = h * 60 + m + Math.round(horas * 60)
  const capped = Math.min(totalMin, 23 * 60 + 59)
  const hh = Math.floor(capped / 60)
  const mm = capped % 60
  return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`
}

/** Diferencia en horas entre dos strings 'HH:MM'. Puede ser negativa. */
export function diffHoras(inicio: string, fin: string): number {
  const [h1, m1] = inicio.split(':').map(Number)
  const [h2, m2] = fin.split(':').map(Number)
  return ((h2 * 60 + m2) - (h1 * 60 + m1)) / 60
}

/** Formatea horas decimales como texto legible, e.g. 1.5 → '1 h 30 min' */
export function formatDuracion(horas: number): string {
  if (horas <= 0) return ''
  const h = Math.floor(horas)
  const m = Math.round((horas - h) * 60)
  if (h === 0) return `${m} min`
  if (m === 0) return `${h} h`
  return `${h} h ${m} min`
}

/** Genera un código de activo único tipo: EQ-202605-A3X9F */
export function generarCodigoActivo(): string {
  const now = new Date()
  const ym = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`
  const rand = crypto.randomUUID().replace(/-/g, '').slice(0, 5).toUpperCase()
  return `EQ-${ym}-${rand}`
}

/** Zona horaria fija: Bogotá (America/Bogota, UTC-5, sin DST) */
export function getBogotaNow() {
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
  return { dateStr, timeStr, totalMinutes: h * 60 + m }
}

// ── Image Upload ───────────────────────────────────────────────────

export async function uploadImagen(bucket: 'equipos' | 'salas', file: File): Promise<string | null> {
  const ext = file.name.split('.').pop() ?? 'jpg'
  const path = `${Date.now()}-${crypto.randomUUID().replace(/-/g, '')}.${ext}`
  const { error } = await supabase.storage.from(bucket).upload(path, file, { upsert: true })
  if (error) { console.error('[uploadImagen]', error.message); return null }
  const { data } = supabase.storage.from(bucket).getPublicUrl(path)
  return data.publicUrl
}

export async function uploadFotoDevolucion(file: File): Promise<string | null> {
  const ext = file.name.split('.').pop() ?? 'jpg'
  const path = `devolucion-${Date.now()}-${crypto.randomUUID().replace(/-/g, '')}.${ext}`
  const { error } = await supabase.storage.from('prestamos').upload(path, file, { upsert: true })
  if (error) {
    const fallback = await supabase.storage.from('equipos').upload(`devoluciones/${path}`, file, { upsert: true })
    if (fallback.error) { console.error('[uploadFotoDevolucion]', fallback.error.message); return null }
    const { data } = supabase.storage.from('equipos').getPublicUrl(`devoluciones/${path}`)
    return data.publicUrl
  }
  const { data } = supabase.storage.from('prestamos').getPublicUrl(path)
  return data.publicUrl
}

export function getSafeImageUrl(url: string | null | undefined, fallback: string): string {
  if (!url) return fallback
  // Si es URL relativa o del mismo origen, retornar directamente
  if (!url.startsWith('http')) return url
  return url
}

// ── Room Images ────────────────────────────────────────────────────

export const ROOM_IMAGES = [
  '/rooms/photo-1495576775051-8af0d10f19b1.jpg',
  '/rooms/photo-1605797491749-0c6989a44356.jpg',
  '/rooms/photo-1676477605752-224a26e6ec71.jpg',
  '/rooms/photo-1677078610072-7f11ebc4d4d7.jpg',
  '/rooms/photo-1760611656160-7c7bf7e6da9f.jpg',
  '/rooms/photo-1765371512992-843e6a92d7e6.jpg',
  '/rooms/photo-1767648718260-572abd64b81e.jpg',
  '/rooms/photo-1771054244002-4445dc1da2eb.jpg',
]

export function getRoomImage(index: number): string {
  return ROOM_IMAGES[index % ROOM_IMAGES.length]
}

// ── Condition Labels / Colors / Icons ─────────────────────────────

export const CONDICION_LABEL: Record<string, string> = {
  nuevo:      'Nuevo',
  excelente:  'Excelente',
  bueno:      'Bueno',
  regular:    'Regular',
  dano_leve:  'Daño leve',
  dano_grave: 'Daño grave',
  perdido:    'Perdido',
}

export const CONDICION_COLOR: Record<string, string> = {
  nuevo:      'bg-emerald-100 text-emerald-700 border-emerald-200',
  excelente:  'bg-green-100 text-green-700 border-green-200',
  bueno:      'bg-blue-100 text-blue-700 border-blue-200',
  regular:    'bg-yellow-100 text-yellow-700 border-yellow-200',
  dano_leve:  'bg-orange-100 text-orange-700 border-orange-200',
  dano_grave: 'bg-red-100 text-red-700 border-red-200',
  perdido:    'bg-gray-100 text-gray-700 border-gray-200',
}

export const CONDICION_ICON: Record<string, string> = {
  nuevo:      'fiber_new',
  excelente:  'verified',
  bueno:      'thumb_up',
  regular:    'warning',
  dano_leve:  'build',
  dano_grave: 'report',
  perdido:    'help',
}

export const NOVEDAD_LABEL: Record<string, string> = {
  dano_fisico:         'Daño físico',
  dano_software:       'Daño de software',
  perdida:             'Pérdida del equipo',
  faltante_accesorio:  'Faltante de accesorio',
  entrega_tardia:      'Entrega tardía',
  otro:                'Otra novedad',
}

export const CONDICIONES_ENTREGA: CondicionEquipo[] = ['nuevo', 'excelente', 'bueno', 'regular', 'dano_leve']
export const CONDICIONES_DEVOLUCION: CondicionDevolucion[] = ['excelente', 'bueno', 'regular', 'dano_leve', 'dano_grave', 'perdido']
export const TIPOS_NOVEDAD: TipoNovedad[] = ['dano_fisico', 'dano_software', 'perdida', 'faltante_accesorio', 'entrega_tardia', 'otro']

export const CARD_STYLES = [
  { bg: 'bg-primary-container',   text: 'text-on-primary',                icon: 'groups'     },
  { bg: 'bg-secondary-container', text: 'text-on-secondary-container',    icon: 'videocam'   },
  { bg: 'bg-tertiary-fixed',      text: 'text-on-tertiary-fixed',         icon: 'laptop_mac' },
]

// ── Skeleton Components ────────────────────────────────────────────

export function SkeletonSummaryCard() {
  return (
    <div className="bg-surface-container-lowest rounded-xl p-5 border border-outline-variant/20 shadow-sm flex items-start gap-4 animate-pulse">
      <div className="size-11 rounded-lg bg-gradient-to-r from-surface-container via-surface-container-low to-surface-container shrink-0" />
      <div className="flex-1 space-y-2 pt-1">
        <div className="h-3 bg-gradient-to-r from-surface-container via-surface-container-low to-surface-container rounded w-2/5" />
        <div className="h-4 bg-gradient-to-r from-surface-container via-surface-container-low to-surface-container rounded w-3/4" />
        <div className="h-3 bg-gradient-to-r from-surface-container via-surface-container-low to-surface-container rounded w-1/2" />
      </div>
    </div>
  )
}

export function SkeletonReservationCard() {
  return (
    <div className="bg-surface-container-lowest rounded-lg p-5 border border-outline-variant/15 shadow-sm animate-pulse">
      <div className="flex items-start gap-4">
        <div className="size-12 rounded-lg bg-gradient-to-r from-surface-container via-surface-container-low to-surface-container shrink-0" />
        <div className="flex-1 space-y-2 pt-1">
          <div className="h-4 bg-gradient-to-r from-surface-container via-surface-container-low to-surface-container rounded w-3/4" />
          <div className="h-3 bg-gradient-to-r from-surface-container via-surface-container-low to-surface-container rounded w-1/2" />
        </div>
        <div className="hidden sm:flex flex-col items-end gap-2">
          <div className="h-6 bg-gradient-to-r from-surface-container via-surface-container-low to-surface-container rounded w-32" />
        </div>
      </div>
    </div>
  )
}

export function SkeletonRoomCard() {
  return (
    <div className="bg-surface-container-lowest rounded-2xl overflow-hidden shadow-md animate-pulse border border-outline-variant/10">
      <div className="h-48 bg-gradient-to-r from-surface-container via-surface-container-low to-surface-container w-full" />
      <div className="p-5 space-y-3">
        <div className="h-5 bg-gradient-to-r from-surface-container via-surface-container-low to-surface-container rounded w-3/4" />
        <div className="h-4 bg-gradient-to-r from-surface-container via-surface-container-low to-surface-container rounded w-1/2" />
        <div className="pt-2">
          <div className="h-10 bg-gradient-to-r from-surface-container via-surface-container-low to-surface-container rounded w-full" />
        </div>
      </div>
    </div>
  )
}

// ── Admin Validations ──────────────────────────────────────────────

export const ADMIN_MIN_NOMBRE_LENGTH = 2
export const ADMIN_MIN_PASSWORD_LENGTH = 8
const ADMIN_NOMBRE_REGEX = /^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/

export function adminValidateNombre(value: string): string | undefined {
  const trimmed = value.trim()
  if (!trimmed) return 'El nombre es obligatorio.'
  if (trimmed.length < ADMIN_MIN_NOMBRE_LENGTH) return `El nombre debe tener al menos ${ADMIN_MIN_NOMBRE_LENGTH} caracteres.`
  if (!ADMIN_NOMBRE_REGEX.test(trimmed)) return 'El nombre solo puede contener letras y espacios. No se permiten números ni caracteres especiales.'
  return undefined
}

export function adminValidateEmail(value: string): string | undefined {
  const trimmed = value.trim()
  if (!trimmed) return 'El correo es obligatorio.'
  if (trimmed.includes(' ')) return 'El correo no puede contener espacios.'
  if (/[(),:;<>[\]\\]/.test(trimmed)) return 'El correo contiene caracteres no permitidos: ( ) , : ; < > [ ] \\'
  const atCount = (trimmed.match(/@/g) ?? []).length
  if (atCount === 0) return 'El correo debe contener el símbolo @.'
  if (atCount > 1) return 'El correo debe contener exactamente un símbolo @.'
  if (!/^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/.test(trimmed))
    return 'El formato no es válido. Ejemplo: usuario@dominio.com'
  return undefined
}

export function adminValidatePassword(value: string): string | undefined {
  if (!value) return 'La contraseña es obligatoria.'
  if (value.length < ADMIN_MIN_PASSWORD_LENGTH) return `La contraseña debe tener al menos ${ADMIN_MIN_PASSWORD_LENGTH} caracteres.`
  if (!/[A-Z]/.test(value)) return 'La contraseña debe tener al menos una letra mayúscula.'
  if (!/[a-z]/.test(value)) return 'La contraseña debe tener al menos una letra minúscula.'
  if (!/[0-9]/.test(value)) return 'La contraseña debe tener al menos un número.'
  if (!/[^a-zA-Z0-9]/.test(value)) return 'La contraseña debe tener al menos un carácter especial.'
  return undefined
}

export function AdminPasswordRequirements({ password }: { password: string }) {
  const requirements = [
    { label: `Mínimo ${ADMIN_MIN_PASSWORD_LENGTH} caracteres`, met: password.length >= ADMIN_MIN_PASSWORD_LENGTH },
    { label: 'Una letra mayúscula', met: /[A-Z]/.test(password) },
    { label: 'Una letra minúscula', met: /[a-z]/.test(password) },
    { label: 'Un número', met: /[0-9]/.test(password) },
    { label: 'Un carácter especial', met: /[^a-zA-Z0-9]/.test(password) },
  ]
  return (
    <div className="mt-1 space-y-1">
      {requirements.map((req, i) => (
        <div key={i} className={`flex items-center gap-1.5 text-xs transition-colors ${req.met ? 'text-green-600' : 'text-on-surface-variant/60'}`}>
          <span className={`material-symbols-outlined text-sm ${req.met ? 'text-green-500' : ''}`}>
            {req.met ? 'check_circle' : 'radio_button_unchecked'}
          </span>
          {req.label}
        </div>
      ))}
    </div>
  )
}