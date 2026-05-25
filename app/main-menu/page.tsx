'use client'

import { useEffect, useState, useCallback, useRef, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import dynamic from 'next/dynamic'
import { supabase } from '@/lib/supabase/client'
import { FEATURES } from '@/config/features'
import { animate, spring } from 'animejs'
import { AnimatedToast } from '@/components/ui/AnimatedToast'
import { TabContent } from '@/components/ui/TabContent'
import {
  getUsuarios,
  updateUserRole,
  getEquipos,
  createEquipo,
  updateEquipoEstado,
  updateEquipo,
  deleteEquipo,
  createUsuarioAdmin,
  toggleUsuarioActivo,
  updateUsuarioEmail,
  updateUsuarioNombre,
  sendPasswordResetAdmin,
  getSalasAdmin,
  createSala,
  updateSala,
  deleteSala,
  asignarEquipoASala,
  getPrestamosAdmin,
  getPrestamosAdminHistorial,
  devolverPrestamoAdmin,
  confirmarRevisionAdmin,
  reasignarEquipoAdmin,
  actualizarNotasAdmin,
  getAlertasEquiposAdmin,
} from '@/features/admin/actions'
import type { UsuarioAdmin, Equipo, SalaAdmin, PrestamoEquipoAdmin, AlertaEquipoAdmin } from '@/features/admin/types'
import { getSistemas, getMarcas, getTipos, getTiposDirectos, isTechCategory, TIPO_EQUIPO_LABELS, CATEGORIA_LABELS } from '@/lib/equipo-catalogo'
import {
  createReserva,
  updateReserva,
  cancelarReserva,
  deleteReserva,
  getReportData,
  getMisReservasHistorial,
  createPrestamoEquipo,
  getMisPrestamos,
  devolverEquipo,
  updatePrestamoReserva,
  getSalasConDisponibilidadFecha,
  getDisponibilidadSala,
  recalcularEstadosEquiposDB,
  getEquiposRetornos,
  type ReportData,
  type ReservaHistorial,
  type PrestamoEquipo,
  type CondicionEquipo,
  type CondicionDevolucion,
  type TipoNovedad,
  type SalaDisponibilidad,
  type EstadoDisponibilidad,
  type FranjaOcupada,
} from '@/features/reservas/actions'
import { ReservasCalendar } from '@/components/ui/ReservasCalendar'
import { AvailabilityTimeline } from '@/components/ui/AvailabilityTimeline'
import { hasOverlap } from '@/lib/availability-utils'
import { useRealtimeSync } from '@/hooks/useRealtimeSync'

// ── D3 Charts — dynamic imports (lazy loading): D3 pesa ~180 KB min+gz.
// Se cargan ÚNICAMENTE cuando el usuario navega a la tab de Reportes.
// Esto reduce el bundle inicial de manera significativa para todos los usuarios.
const D3BarChart = dynamic(
  () => import('@/components/ui/charts/D3BarChart').then(m => ({ default: m.D3BarChart })),
  { ssr: false, loading: () => <div className="h-48 rounded-xl bg-surface-container animate-pulse" /> },
)
const D3DonutChart = dynamic(
  () => import('@/components/ui/charts/D3DonutChart').then(m => ({ default: m.D3DonutChart })),
  { ssr: false, loading: () => <div className="h-48 rounded-xl bg-surface-container animate-pulse" /> },
)
const D3HorizontalBars = dynamic(
  () => import('@/components/ui/charts/D3HorizontalBars').then(m => ({ default: m.D3HorizontalBars })),
  { ssr: false, loading: () => <div className="h-48 rounded-xl bg-surface-container animate-pulse" /> },
)
const D3AreaChart = dynamic(
  () => import('@/components/ui/charts/D3AreaChart').then(m => ({ default: m.D3AreaChart })),
  { ssr: false, loading: () => <div className="h-48 rounded-xl bg-surface-container animate-pulse" /> },
)
const LineChartMonthly = dynamic(
  () => import('@/components/ui/charts/LineChartMonthly').then(m => ({ default: m.LineChartMonthly })),
  { ssr: false, loading: () => <div className="h-48 rounded-xl bg-surface-container animate-pulse" /> },
)

// ── Types

interface UserProfile {
  nombre: string
  rol: string
}

interface Sala {
  id: string
  nombre: string
  descripcion: string | null
  capacidad: number
  ubicacion: string | null
  imagen_url: string | null
  estado: 'disponible' | 'ocupada' | 'mantenimiento'
  // Disponibilidad calculada (viene de getSalasConDisponibilidadFecha)
  franjas_reservadas?: { hora_inicio: string; hora_fin: string; titulo?: string }[]
  disponibilidad?: EstadoDisponibilidad
  proxima_libre?: string | null
}

interface Reserva {
  id: string
  titulo: string
  fecha: string       // 'YYYY-MM-DD'
  hora_inicio: string // 'HH:MM:SS'
  hora_fin: string    // 'HH:MM:SS'
  estado: 'pendiente' | 'confirmada' | 'cancelada'
  salas: Pick<Sala, 'id' | 'nombre' | 'capacidad' | 'ubicacion'> | null
}

type ActiveTab = 'reservations' | 'rooms' | 'tech' | 'profile' | 'admin'
type AdminSubTab = 'users' | 'equipment' | 'rooms' | 'reports'

interface ReservaForm {
  titulo: string
  sala_id: string
  fecha: string
  hora_inicio: string
  hora_fin: string
}

const EMPTY_FORM: ReservaForm = {
  titulo: '',
  sala_id: '',
  fecha: '',
  hora_inicio: '',
  hora_fin: '',
}

// ── Helpers ────────────────────────────────────────────────────────

function formatFecha(fechaStr: string): string {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today)
  tomorrow.setDate(today.getDate() + 1)
  // Parse as local date to avoid timezone shifts
  const [y, m, d] = fechaStr.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  if (date.getTime() === today.getTime()) return 'Hoy'
  if (date.getTime() === tomorrow.getTime()) return 'Mañana'
  return date.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' })
}

function formatHora(hora: string): string {
  return hora.slice(0, 5)
}

/** Suma `horas` (puede ser decimal) a un string 'HH:MM' y devuelve 'HH:MM'. */
function addHoras(timeStr: string, horas: number): string {
  const [h, m] = timeStr.split(':').map(Number)
  const totalMin = h * 60 + m + Math.round(horas * 60)
  const capped = Math.min(totalMin, 23 * 60 + 59)
  const hh = Math.floor(capped / 60)
  const mm = capped % 60
  return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`
}

/** Diferencia en horas entre dos strings 'HH:MM'. Puede ser negativa. */
function diffHoras(inicio: string, fin: string): number {
  const [h1, m1] = inicio.split(':').map(Number)
  const [h2, m2] = fin.split(':').map(Number)
  return ((h2 * 60 + m2) - (h1 * 60 + m1)) / 60
}

/** Formatea horas decimales como texto legible, e.g. 1.5 → '1 h 30 min' */
function formatDuracion(horas: number): string {
  if (horas <= 0) return ''
  const h = Math.floor(horas)
  const m = Math.round((horas - h) * 60)
  if (h === 0) return `${m} min`
  if (m === 0) return `${h} h`
  return `${h} h ${m} min`
}

/** Genera un código de activo único tipo: EQ-202605-A3X9F */
function generarCodigoActivo(): string {
  const now = new Date()
  const ym = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`
  const rand = crypto.randomUUID().replace(/-/g, '').slice(0, 5).toUpperCase()
  return `EQ-${ym}-${rand}`
}

async function uploadImagen(bucket: 'equipos' | 'salas', file: File): Promise<string | null> {
  const ext = file.name.split('.').pop() ?? 'jpg'
  const path = `${Date.now()}-${crypto.randomUUID().replace(/-/g, '')}.${ext}`
  const { error } = await supabase.storage.from(bucket).upload(path, file, { upsert: true })
  if (error) { console.error('[uploadImagen]', error.message); return null }
  const { data } = supabase.storage.from(bucket).getPublicUrl(path)
  return data.publicUrl
}

async function uploadFotoDevolucion(file: File): Promise<string | null> {
  const ext = file.name.split('.').pop() ?? 'jpg'
  const path = `devolucion-${Date.now()}-${crypto.randomUUID().replace(/-/g, '')}.${ext}`
  // Intenta bucket 'prestamos', fallback a 'equipos/devoluciones/'
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

// ── Condición de equipo: labels, colores e iconos ─────────────────────────────
const CONDICION_LABEL: Record<string, string> = {
  nuevo:      'Nuevo',
  excelente:  'Excelente',
  bueno:      'Bueno',
  regular:    'Regular',
  dano_leve:  'Daño leve',
  dano_grave: 'Daño grave',
  perdido:    'Perdido',
}

const CONDICION_COLOR: Record<string, string> = {
  nuevo:      'bg-emerald-100 text-emerald-700 border-emerald-200',
  excelente:  'bg-green-100 text-green-700 border-green-200',
  bueno:      'bg-blue-100 text-blue-700 border-blue-200',
  regular:    'bg-yellow-100 text-yellow-700 border-yellow-200',
  dano_leve:  'bg-orange-100 text-orange-700 border-orange-200',
  dano_grave: 'bg-red-100 text-red-700 border-red-200',
  perdido:    'bg-gray-100 text-gray-700 border-gray-200',
}

const CONDICION_ICON: Record<string, string> = {
  nuevo:      'fiber_new',
  excelente:  'verified',
  bueno:      'thumb_up',
  regular:    'warning',
  dano_leve:  'build',
  dano_grave: 'report',
  perdido:    'help',
}

const NOVEDAD_LABEL: Record<string, string> = {
  dano_fisico:         'Daño físico',
  dano_software:       'Daño de software',
  perdida:             'Pérdida del equipo',
  faltante_accesorio:  'Faltante de accesorio',
  entrega_tardia:      'Entrega tardía',
  otro:                'Otra novedad',
}

const CONDICIONES_ENTREGA: CondicionEquipo[] = ['nuevo', 'excelente', 'bueno', 'regular', 'dano_leve']
const CONDICIONES_DEVOLUCION: CondicionDevolucion[] = ['excelente', 'bueno', 'regular', 'dano_leve', 'dano_grave', 'perdido']
const TIPOS_NOVEDAD: TipoNovedad[] = ['dano_fisico', 'dano_software', 'perdida', 'faltante_accesorio', 'entrega_tardia', 'otro']


const CARD_STYLES = [
  { bg: 'bg-primary-container',   text: 'text-on-primary',                icon: 'groups'     },
  { bg: 'bg-secondary-container', text: 'text-on-secondary-container',    icon: 'videocam'   },
  { bg: 'bg-tertiary-fixed',      text: 'text-on-tertiary-fixed',         icon: 'laptop_mac' },
]

// ── Images Helpers ──────────────────────────────────────────────────

const ROOM_IMAGES = [
  '/rooms/photo-1495576775051-8af0d10f19b1.jpg',
  '/rooms/photo-1605797491749-0c6989a44356.jpg',
  '/rooms/photo-1676477605752-224a26e6ec71.jpg',
  '/rooms/photo-1677078610072-7f11ebc4d4d7.jpg',
  '/rooms/photo-1760611656160-7c7bf7e6da9f.jpg',
  '/rooms/photo-1765371512992-843e6a92d7e6.jpg',
  '/rooms/photo-1767648718260-572abd64b81e.jpg',
  '/rooms/photo-1771054244002-4445dc1da2eb.jpg'
];

function getRoomImage(index: number) {
  return ROOM_IMAGES[index % ROOM_IMAGES.length];
}

// ── Skeleton Components ────────────────────────────────────────────

function SkeletonSummaryCard() {
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

function SkeletonReservationCard() {
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

function SkeletonRoomCard() {
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

// ── Validaciones para el panel admin ──────────────────────────────────
const ADMIN_MIN_NOMBRE_LENGTH = 2
const ADMIN_MIN_PASSWORD_LENGTH = 8
const ADMIN_NOMBRE_REGEX = /^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/

function adminValidateNombre(value: string): string | undefined {
  const trimmed = value.trim()
  if (!trimmed) return 'El nombre es obligatorio.'
  if (trimmed.length < ADMIN_MIN_NOMBRE_LENGTH) return `El nombre debe tener al menos ${ADMIN_MIN_NOMBRE_LENGTH} caracteres.`
  if (!ADMIN_NOMBRE_REGEX.test(trimmed)) return 'El nombre solo puede contener letras y espacios. No se permiten números ni caracteres especiales.'
  return undefined
}

function adminValidateEmail(value: string): string | undefined {
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

function adminValidatePassword(value: string): string | undefined {
  if (!value) return 'La contraseña es obligatoria.'
  if (value.length < ADMIN_MIN_PASSWORD_LENGTH) return `La contraseña debe tener al menos ${ADMIN_MIN_PASSWORD_LENGTH} caracteres.`
  if (!/[A-Z]/.test(value)) return 'La contraseña debe tener al menos una letra mayúscula.'
  if (!/[a-z]/.test(value)) return 'La contraseña debe tener al menos una letra minúscula.'
  if (!/[0-9]/.test(value)) return 'La contraseña debe tener al menos un número.'
  if (!/[^a-zA-Z0-9]/.test(value)) return 'La contraseña debe tener al menos un carácter especial.'
  return undefined
}

function AdminPasswordRequirements({ password }: { password: string }) {
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

// ── Zona horaria fija: Bogotá (America/Bogota, UTC-5, sin DST) ────────
function getBogotaNow() {
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

export default function MainMenuPage() {
  const router = useRouter()

  // ── Auth state ────────────────────────────────────────────────────
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // ── Data state ────────────────────────────────────────────────────
  const [reservas, setReservas] = useState<Reserva[]>([])
  const [salas, setSalas] = useState<Sala[]>([])
  const [loadingReservas, setLoadingReservas] = useState(true)
  const [loadingSalas, setLoadingSalas] = useState(true)

  // ── UI state ──────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<ActiveTab>('reservations')
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  // ── Coming-soon toast ─────────────────────────────────────────────
  const [comingSoon, setComingSoon] = useState(false)
  const showComingSoon = useCallback(() => {
    setComingSoon(true)
    setTimeout(() => setComingSoon(false), 2800)
  }, [])

  // ── Global Error toast ────────────────────────────────────────────
  const [globalError, setGlobalError] = useState<string | null>(null)
  const showGlobalError = useCallback((msg: string) => {
    setGlobalError(msg)
    setTimeout(() => setGlobalError(null), 4500)
  }, [])

  // ── Modal state ───────────────────────────────────────────────────
  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState<ReservaForm>(EMPTY_FORM)
  const [submitting, setSubmitting] = useState(false)
  const [modalError, setModalError] = useState<string | null>(null)
  const [modalSuccess, setModalSuccess] = useState(false)
  const [duracionPreset, setDuracionPreset] = useState<number | 'libre' | 'dia'>('libre')

  // ── Availability timeline state ───────────────────────────────────
  const [modalFranjas, setModalFranjas] = useState<FranjaOcupada[]>([])
  const [loadingFranjas, setLoadingFranjas] = useState(false)
  /**
   * Callback ref — permite a fetchSalasSilent forzar un re-fetch del timeline
   * del modal sin provocar un re-render completo del componente (useRef en vez
   * de useState evita que cada evento Realtime redibuje los 6000 líneas).
   */
  const refreshModalFranjasRef = useRef<(() => void) | null>(null)

  // ── HU-08: Preview modal de sala ─────────────────────────────────
  const [previewSala, setPreviewSala] = useState<Sala | null>(null)

  // ── HU-06: Admin — Usuarios ───────────────────────────────────────
  const [adminSubTab, setAdminSubTab] = useState<AdminSubTab>('users')
  const [usuarios, setUsuarios] = useState<UsuarioAdmin[]>([])
  const [loadingUsuarios, setLoadingUsuarios] = useState(false)
  const [updatingRole, setUpdatingRole] = useState<string | null>(null)

  // ── HU-07: Admin — Equipos ────────────────────────────────────────
  const [equipos, setEquipos] = useState<Equipo[]>([])
  const [loadingEquipos, setLoadingEquipos] = useState(false)
  // Map equipo_id -> fecha_fin_esperada (ISO) para equipos actualmente prestados
  const [equiposRetornos, setEquiposRetornos] = useState<Map<string, string>>(new Map())
  const [equipoForm, setEquipoForm] = useState({
    nombre: '',
    categoria: '',
    sistema_operativo: '',
    marca: '',
    tipo_equipo: '',
    estado: 'disponible' as Equipo['estado'],
    imagen_url: '',
  })
  const [addingEquipo, setAddingEquipo] = useState(false)
  const [showEquipoForm, setShowEquipoForm] = useState(false)
  const [equipoFormStage, setEquipoFormStage] = useState<'form' | 'processing' | 'success'>('form')
  const [equipoSearch, setEquipoSearch] = useState('')
  const [editingEquipoId, setEditingEquipoId] = useState<string | null>(null)
  const [editEquipoForm, setEditEquipoForm] = useState({
    nombre: '',
    categoria: '',
    sistema_operativo: '',
    marca: '',
    tipo_equipo: '',
    estado: 'disponible' as Equipo['estado'],
    imagen_url: '',
  })
  const [savingEquipo, setSavingEquipo] = useState(false)
  const [equipoImageFile, setEquipoImageFile] = useState<File | null>(null)
  const [editEquipoImageFile, setEditEquipoImageFile] = useState<File | null>(null)
  const [equipoCantidad, setEquipoCantidad] = useState(1)
  const [equipoSeriales, setEquipoSeriales] = useState<string[]>([''])
  const [necesitaEquipo, setNecesitaEquipo] = useState(false)
  const [equiposSeleccionados, setEquiposSeleccionados] = useState<string[]>([])
  const [techSearch, setTechSearch] = useState('')
  const [techFilter, setTechFilter] = useState('')

  // ── Préstamos de equipo (Sprint 3) ────────────────────────────────────────
  const [loanModalOpen, setLoanModalOpen] = useState(false)
  const [loanEquipo, setLoanEquipo] = useState<Equipo | null>(null)
  const [loanForm, setLoanForm] = useState({ fecha: '', hora_devolucion: '', sala_id: '', notas: '', reserva_id: '', condicion_entrega: 'bueno' as CondicionEquipo })
  const [loanSubmitting, setLoanSubmitting] = useState(false)
  const [loanError, setLoanError] = useState<string | null>(null)
  const [loanSuccess, setLoanSuccess] = useState(false)
  const [loanActa, setLoanActa] = useState<string | null>(null)
  const [misPrestamos, setMisPrestamos] = useState<PrestamoEquipo[]>([])
  const [loadingPrestamos, setLoadingPrestamos] = useState(false)
  const [devolviendoPrestamo, setDevolviendoPrestamo] = useState<string | null>(null)
  const [editandoPrestamoId, setEditandoPrestamoId] = useState<string | null>(null)
  const [editPrestamoReservaId, setEditPrestamoReservaId] = useState('')
  const [savingEditPrestamo, setSavingEditPrestamo] = useState(false)
  const [editPrestamoError, setEditPrestamoError] = useState<string | null>(null)
  // ── Modal de devolución con documentación ────────────────────────────────
  const [returnModalOpen, setReturnModalOpen] = useState(false)
  const [returnPrestamo, setReturnPrestamo] = useState<PrestamoEquipo | null>(null)
  const [returnStep, setReturnStep] = useState<1 | 2 | 3>(1)
  const [returnCondicion, setReturnCondicion] = useState<CondicionDevolucion>('bueno')
  const [returnObservaciones, setReturnObservaciones] = useState('')
  const [returnFotoFile, setReturnFotoFile] = useState<File | null>(null)
  const [returnFotoPreview, setReturnFotoPreview] = useState<string | null>(null)
  const [returnNovedad, setReturnNovedad] = useState(false)
  const [returnTipoNovedad, setReturnTipoNovedad] = useState<TipoNovedad>('dano_fisico')
  const [returnDescNovedad, setReturnDescNovedad] = useState('')
  const [returnConfirmed, setReturnConfirmed] = useState(false)
  const [returnSubmitting, setReturnSubmitting] = useState(false)
  const [returnError, setReturnError] = useState<string | null>(null)
  const [returnSuccess, setReturnSuccess] = useState<{ numActa: string } | null>(null)
  // ── Admin: préstamos activos ──────────────────────────────────────────────
  const [prestamosAdmin, setPrestamosAdmin] = useState<PrestamoEquipoAdmin[]>([])
  const [loadingPrestamosAdmin, setLoadingPrestamosAdmin] = useState(false)
  const [prestamosAdminTab, setPrestamosAdminTab] = useState<'activos' | 'pendiente_revision' | 'novedades' | 'historial'>('activos')
  const [prestamosHistorial, setPrestamosHistorial] = useState<PrestamoEquipoAdmin[]>([])
  const [loadingHistorial, setLoadingHistorial] = useState(false)
  // ── Admin: alertas de equipos ─────────────────────────────────────────────
  const [alertasEquipos, setAlertasEquipos] = useState<AlertaEquipoAdmin[]>([])
  const [loadingAlertas, setLoadingAlertas] = useState(false)
  // ── Modal devolución admin ────────────────────────────────────────────────
  const [adminReturnModalOpen, setAdminReturnModalOpen] = useState(false)
  const [adminReturnPrestamo, setAdminReturnPrestamo] = useState<PrestamoEquipoAdmin | null>(null)
  const [adminReturnCondicion, setAdminReturnCondicion] = useState<string>('bueno')
  const [adminReturnNotas, setAdminReturnNotas] = useState('')
  const [adminReturnNovedad, setAdminReturnNovedad] = useState(false)
  const [adminReturnTipoNovedad, setAdminReturnTipoNovedad] = useState<string>('dano_fisico')
  const [adminReturnDescNovedad, setAdminReturnDescNovedad] = useState('')
  const [adminReturnSubmitting, setAdminReturnSubmitting] = useState(false)
  const [adminReturnError, setAdminReturnError] = useState<string | null>(null)
  // ── Modal confirmación revisión (pendiente_revision → devuelto) ──────────
  const [revisionModalOpen, setRevisionModalOpen] = useState(false)
  const [revisionPrestamo, setRevisionPrestamo] = useState<PrestamoEquipoAdmin | null>(null)
  const [revisionCondicion, setRevisionCondicion] = useState<string>('bueno')
  const [revisionNotas, setRevisionNotas] = useState('')
  const [revisionNovedad, setRevisionNovedad] = useState(false)
  const [revisionTipoNovedad, setRevisionTipoNovedad] = useState<string>('dano_fisico')
  const [revisionDescNovedad, setRevisionDescNovedad] = useState('')
  const [revisionSubmitting, setRevisionSubmitting] = useState(false)
  const [revisionError, setRevisionError] = useState<string | null>(null)
  // ── Modal reasignación de equipo ─────────────────────────────────────────
  const [reasignarModalOpen, setReasignarModalOpen] = useState(false)
  const [reasignarPrestamo, setReasignarPrestamo] = useState<PrestamoEquipoAdmin | null>(null)
  const [reasignarEquipoId, setReasignarEquipoId] = useState<string>('')
  const [reasignarNotas, setReasignarNotas] = useState('')
  const [reasignarSubmitting, setReasignarSubmitting] = useState(false)
  const [reasignarError, setReasignarError] = useState<string | null>(null)
  // ── Misc admin state ─────────────────────────────────────────────
  const [asignandoSala, setAsignandoSala] = useState<string | null>(null)
  const [devolviendoAdmin, setDevolviendoAdmin] = useState<string | null>(null)

  // ── Admin — Usuarios CRUD ─────────────────────────────────────────
  const [showUserForm, setShowUserForm] = useState(false)
  const [userForm, setUserForm] = useState({ nombre: '', correo: '', password: '', confirmPassword: '', rol: 'usuario' as 'usuario' | 'admin' })
  const [addingUser, setAddingUser] = useState(false)
  const [userFormError, setUserFormError] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [showOnlyActivos, setShowOnlyActivos] = useState(true)
  const [togglingActivo, setTogglingActivo] = useState<string | null>(null)
  const [editingUserId, setEditingUserId] = useState<string | null>(null)
  const [editEmailValue, setEditEmailValue] = useState('')
  const [editNombreValue, setEditNombreValue] = useState('')
  const [editUserError, setEditUserError] = useState<string | null>(null)
  const [savingEmail, setSavingEmail] = useState(false)
  const [resetingPwd, setResetingPwd] = useState<string | null>(null)
  const [pwdResetSuccess, setPwdResetSuccess] = useState<string | null>(null)

  // ── Admin — Salas CRUD ────────────────────────────────────────────
  const [salasAdmin, setSalasAdmin] = useState<SalaAdmin[]>([])
  const [loadingSalasAdmin, setLoadingSalasAdmin] = useState(false)
  const [showSalaForm, setShowSalaForm] = useState(false)
  const [salaForm, setSalaForm] = useState({ nombre: '', descripcion: '', capacidad: '', ubicacion: '', imagen_url: '', estado: 'disponible' as SalaAdmin['estado'] })
  const [addingSala, setAddingSala] = useState(false)
  const [editingSalaId, setEditingSalaId] = useState<string | null>(null)
  const [editSalaForm, setEditSalaForm] = useState({ nombre: '', descripcion: '', capacidad: '', ubicacion: '', imagen_url: '', estado: 'disponible' as SalaAdmin['estado'] })
  const [savingSala, setSavingSala] = useState(false)
  const [salaImageFile, setSalaImageFile] = useState<File | null>(null)
  const [editSalaImageFile, setEditSalaImageFile] = useState<File | null>(null)

  // ── Sprint 3: Usuario actual + operaciones reservas ───────────────
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [editingReservaId, setEditingReservaId] = useState<string | null>(null)
  const [cancelingReservaId, setCancelingReservaId] = useState<string | null>(null)
  const [deletingReservaId, setDeletingReservaId] = useState<string | null>(null)

  // ── Reservas: vista calendario ────────────────────────────────────
  const [reservaView, setReservaView] = useState<'list' | 'calendar'>('calendar')
  const [calendarReservas, setCalendarReservas] = useState<Reserva[]>([])
  const [loadingCalendar, setLoadingCalendar] = useState(false)

  // ── Sprint 3: Reportes ────────────────────────────────────────────
  const [reportData, setReportData] = useState<ReportData | null>(null)
  const [loadingReports, setLoadingReports] = useState(false)
  const [reportSubTab, setReportSubTab] = useState<'overview' | 'salas' | 'reservas' | 'equipos'>('overview')
  const [reportSearchReservas, setReportSearchReservas] = useState('')
  const [reportSearchSalas, setReportSearchSalas] = useState('')
  const [reportSearchEquipos, setReportSearchEquipos] = useState('')
  const [reportPageReservas, setReportPageReservas] = useState(1)
  const [reportPageSalas, setReportPageSalas] = useState(1)
  const [reportPageEquipos, setReportPageEquipos] = useState(1)
  const REPORT_PAGE_SIZE = 10

  // ── Historial de reservas del usuario ────────────────────────────
  const [reservasHistorial, setReservasHistorial] = useState<ReservaHistorial[]>([])
  const [loadingHistorialReservas, setLoadingHistorialReservas] = useState(false)
  const [historialReservasLoaded, setHistorialReservasLoaded] = useState(false)
  const [reservaView2, setReservaView2] = useState<'upcoming' | 'history'>('upcoming')
  const [historialSearch, setHistorialSearch] = useState('')
  const [historialEstadoFilter, setHistorialEstadoFilter] = useState<'todos' | 'confirmada' | 'pendiente' | 'cancelada'>('todos')
  const [historialPage, setHistorialPage] = useState(1)
  const HISTORIAL_PAGE_SIZE = 8

  const fetchReservas = useCallback(async (uid: string) => {
    setLoadingReservas(true)
    const { dateStr: todayStr } = getBogotaNow()
    const { data } = await supabase
      .from('reservas')
      .select('id, titulo, fecha, hora_inicio, hora_fin, estado, salas(id, nombre, capacidad, ubicacion)')
      .eq('usuario_id', uid)
      .gte('fecha', todayStr)
      .in('estado', ['pendiente', 'confirmada'])
      .order('fecha',       { ascending: true })
      .order('hora_inicio', { ascending: true })
      .limit(10)
    if (data) setReservas(data as unknown as Reserva[])
    setLoadingReservas(false)
  }, [])

  const fetchCalendarReservas = useCallback(async (uid: string) => {
    setLoadingCalendar(true)
    const now   = new Date()
    const start = new Date(now.getFullYear(), now.getMonth() - 2, 1)
    const end   = new Date(now.getFullYear(), now.getMonth() + 5, 0)
    const p     = (n: number) => String(n).padStart(2, '0')
    const startStr = `${start.getFullYear()}-${p(start.getMonth() + 1)}-01`
    const endStr   = `${end.getFullYear()}-${p(end.getMonth() + 1)}-${p(end.getDate())}`
    const { data } = await supabase
      .from('reservas')
      .select('id, titulo, fecha, hora_inicio, hora_fin, estado, salas(id, nombre, capacidad, ubicacion)')
      .eq('usuario_id', uid)
      .gte('fecha', startStr)
      .lte('fecha', endStr)
      .order('fecha',       { ascending: true })
      .order('hora_inicio', { ascending: true })
    if (data) setCalendarReservas(data as unknown as Reserva[])
    setLoadingCalendar(false)
  }, [])

  const fetchSalas = useCallback(async () => {
    setLoadingSalas(true)
    // Usar la fecha de hoy en Bogotá para calcular disponibilidad real
    const { dateStr: fechaHoy } = getBogotaNow()
    const result = await getSalasConDisponibilidadFecha(fechaHoy)
    if (result.data) setSalas(result.data as Sala[])
    setLoadingSalas(false)
  }, [])

  // Versiones "silenciosas" (sin spinner) para las actualizaciones de Realtime.
  // Evitan el parpadeo de loading cuando llega un cambio en background.
  const fetchSalasSilent = useCallback(async () => {
    const { dateStr } = getBogotaNow()
    const result = await getSalasConDisponibilidadFecha(dateStr)
    if (result.data) {
      setSalas(result.data as Sala[])
      refreshModalFranjasRef.current?.() // re-fetch del timeline sin re-render global
    }
  }, [])

  const fetchEquiposSilent = useCallback(async () => {
    const [eqResult, retResult] = await Promise.all([getEquipos(), getEquiposRetornos()])
    if (eqResult.data) setEquipos(eqResult.data)
    if (retResult.data) setEquiposRetornos(new Map(retResult.data.map(r => [r.equipo_id, r.fecha_fin_esperada])))
  }, [])

  useEffect(() => {
    const init = async () => {
      // 1. Verificar sesión activa
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/login'); return }

      // 2. Cargar perfil y rol
      const nombre =
        session.user.user_metadata?.nombre ??
        session.user.email?.split('@')[0] ??
        'Usuario'

      let rol: string = session.user.user_metadata?.rol ?? 'usuario'

      const { data: userRecord } = await supabase
        .from('usuarios')
        .select('rol')
        .eq('id', session.user.id)
        .single()

      if (userRecord?.rol) rol = userRecord.rol as string

      setProfile({ nombre, rol })
      setIsLoading(false) // muestra el layout sin esperar los datos

      // 3. Fetch de datos en paralelo
      const uid = session.user.id
      setCurrentUserId(uid)

      await Promise.allSettled([
        fetchReservas(uid),
        fetchSalas(),           // carga salas con disponibilidad real del día
      ])

      fetchCalendarReservas(uid)
    }

    init()
  // fetchSalas tiene deps estables (useCallback([])) — se incluye para satisfacer exhaustive-deps
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router, fetchReservas, fetchCalendarReservas, fetchSalas])

  // ── Real-time: shared availability across ALL users ──────────────
  // Suscripciones a cambios de DB para reflejar reservas y préstamos de TODOS
  // los usuarios en tiempo real, sin recargar la página.
  // La lógica de canales está centralizada en el custom hook useRealtimeSync.
  useRealtimeSync({
    onSalasChange: fetchSalasSilent,
    onEquiposChange: fetchEquiposSilent,
  })

  // ── Fetch availability whenever sala or date changes inside modal ─
  useEffect(() => {
    if (!modalOpen || !form.sala_id || !form.fecha) {
      setModalFranjas([])
      return
    }
    let cancelled = false
    const doFetch = () => {
      if (cancelled) return
      setLoadingFranjas(true)
      getDisponibilidadSala(form.sala_id, form.fecha, editingReservaId ?? undefined).then((result: { franjas?: FranjaOcupada[]; error?: string }) => {
        if (!cancelled) {
          setModalFranjas(result.franjas ?? [])
          setLoadingFranjas(false)
        }
      })
    }
    // Registrar en el ref para que fetchSalasSilent pueda forzar un re-fetch
    // del timeline sin provocar un re-render completo del componente padre.
    refreshModalFranjasRef.current = doFetch
    doFetch()
    return () => {
      cancelled = true
      refreshModalFranjasRef.current = null
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  // Note: editingReservaId intentionally omitted (stable during modal lifetime)
  }, [modalOpen, form.sala_id, form.fecha])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  // ── HU-08: Abrir preview modal de sala ───────────────────────────
  const handleReservarPreview = (sala: Sala) => {
    setPreviewSala(sala)
  }

  // ── HU-06: Cargar usuarios ────────────────────────────────────────
  const loadUsuarios = useCallback(async () => {
    setLoadingUsuarios(true)
    const result = await getUsuarios()
    if (result.data) setUsuarios(result.data)
    setLoadingUsuarios(false)
  }, [])

  const handleRoleChange = async (userId: string, newRol: 'usuario' | 'admin') => {
    setUpdatingRole(userId)
    await updateUserRole(userId, newRol)
    setUsuarios(prev => prev.map(u => u.id === userId ? { ...u, rol: newRol } : u))
    setUpdatingRole(null)
  }

  // ── HU-07: Cargar y gestionar equipos ────────────────────────────
  const loadEquipos = useCallback(async () => {
    setLoadingEquipos(true)
    // Recalcular estados de equipos antes de cargar (fire-and-forget best-effort)
    recalcularEstadosEquiposDB().catch(() => {})
    const [result, retornos] = await Promise.all([getEquipos(), getEquiposRetornos()])
    if (result.data) setEquipos(result.data)
    if (retornos.data) setEquiposRetornos(new Map(retornos.data.map(r => [r.equipo_id, r.fecha_fin_esperada])))
    setLoadingEquipos(false)
  }, [])

  // ── Préstamos: cargar y gestionar ─────────────────────────────────────────
  const loadMisPrestamos = useCallback(async () => {
    setLoadingPrestamos(true)
    const result = await getMisPrestamos()
    if (result.data) setMisPrestamos(result.data)
    setLoadingPrestamos(false)
  }, [])

  const loadPrestamosAdmin = useCallback(async () => {
    setLoadingPrestamosAdmin(true)
    const result = await getPrestamosAdmin()
    if (result.data) setPrestamosAdmin(result.data)
    setLoadingPrestamosAdmin(false)
  }, [])

  const loadAlertasEquipos = useCallback(async () => {
    setLoadingAlertas(true)
    const result = await getAlertasEquiposAdmin()
    if (result.data) setAlertasEquipos(result.data)
    setLoadingAlertas(false)
  }, [])

  const loadPrestamosHistorial = useCallback(async (tab: 'activos' | 'pendiente_revision' | 'novedades' | 'historial') => {
    setLoadingHistorial(true)
    let result
    if (tab === 'activos') {
      result = await getPrestamosAdmin()
    } else if (tab === 'novedades') {
      result = await getPrestamosAdminHistorial({ soloNovedades: true })
    } else {
      result = await getPrestamosAdminHistorial({ estado: 'todos' })
    }
    if (result.data) setPrestamosHistorial(result.data)
    setLoadingHistorial(false)
  }, [])

  const handleSolicitarEquipo = (equipo: Equipo) => {
    const { dateStr } = getBogotaNow()
    setLoanEquipo(equipo)
    setLoanForm({ fecha: dateStr, hora_devolucion: '', sala_id: '', notas: '', reserva_id: '', condicion_entrega: 'bueno' })
    setLoanError(null)
    setLoanSuccess(false)
    setLoanActa(null)
    setLoanModalOpen(true)
  }

  const handleSubmitLoan = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!loanEquipo || !loanForm.reserva_id || !loanForm.fecha || !loanForm.hora_devolucion) {
      setLoanError('Debes seleccionar una reserva activa y completar todos los campos obligatorios.')
      return
    }
    if (!loanEquipo.imagen_url) {
      setLoanError('El equipo no tiene imagen registrada. Contacta al administrador antes de proceder.')
      return
    }
    setLoanSubmitting(true)
    setLoanError(null)

    // Validar que la fecha/hora de devolución sea futura (hora Bogotá)
    const { dateStr: todayStr, timeStr: nowTimeStr } = getBogotaNow()
    if (loanForm.fecha < todayStr) {
      setLoanError('La fecha de devolución no puede ser una fecha pasada.')
      setLoanSubmitting(false)
      return
    }
    if (loanForm.fecha === todayStr && loanForm.hora_devolucion <= nowTimeStr) {
      setLoanError('La hora de devolución debe ser posterior a la hora actual.')
      setLoanSubmitting(false)
      return
    }

    const fechaFin = `${loanForm.fecha}T${loanForm.hora_devolucion}:00`
    const result = await createPrestamoEquipo(
      loanEquipo.id,
      loanForm.reserva_id,
      fechaFin,
      loanForm.notas || null,
      loanForm.condicion_entrega,
    )

    if (result.error) {
      setLoanError(result.error)
      setLoanSubmitting(false)
      return
    }

    setLoanActa(result.data?.num_acta ?? null)
    setLoanSuccess(true)
    // Actualizar estado del equipo localmente
    setEquipos(prev => prev.map(e => e.id === loanEquipo.id ? { ...e, estado: 'reservado' as const } : e))
    await loadMisPrestamos()
    setTimeout(() => {
      setLoanModalOpen(false)
      setLoanSuccess(false)
      setLoanEquipo(null)
    }, 1800)
    setLoanSubmitting(false)
  }

  // Return modal: open
  const handleAbrirDevolucion = (prestamo: PrestamoEquipo) => {
    setReturnPrestamo(prestamo)
    setReturnStep(1)
    setReturnCondicion('bueno')
    setReturnObservaciones('')
    setReturnFotoFile(null)
    setReturnFotoPreview(null)
    setReturnNovedad(false)
    setReturnTipoNovedad('dano_fisico')
    setReturnDescNovedad('')
    setReturnConfirmed(false)
    setReturnError(null)
    setReturnSuccess(null)
    setReturnModalOpen(true)
  }

  // Return modal: submit
  const handleSubmitDevolucion = async () => {
    if (!returnPrestamo || !returnConfirmed) return
    if (!returnFotoFile) {
      setReturnError('La fotografía del equipo es obligatoria.')
      return
    }
    if (returnNovedad && !returnDescNovedad.trim()) {
      setReturnError('Debes describir la novedad reportada.')
      return
    }
    setReturnSubmitting(true)
    setReturnError(null)

    let fotoUrl: string | null = null
    if (returnFotoFile) {
      fotoUrl = await uploadFotoDevolucion(returnFotoFile)
    }

    const result = await devolverEquipo(
      returnPrestamo.id,
      returnCondicion,
      returnObservaciones || null,
      fotoUrl,
      returnNovedad,
      returnNovedad ? returnTipoNovedad : null,
      returnNovedad && returnDescNovedad ? returnDescNovedad : null,
    )

    if (result.error) {
      setReturnError(result.error)
      setReturnSubmitting(false)
      return
    }

    setMisPrestamos(prev => prev.filter(p => p.id !== returnPrestamo.id))
    if (result.equipoId) {
      setEquipos(prev => prev.map(e => e.id === result.equipoId ? { ...e, estado: 'disponible' as const } : e))
    }
    setReturnSuccess({ numActa: result.numActa ?? returnPrestamo.num_acta ?? '' })
    setReturnSubmitting(false)
  }

  const handleEditarPrestamo = async () => {
    if (!editandoPrestamoId || !editPrestamoReservaId) return
    setSavingEditPrestamo(true)
    setEditPrestamoError(null)
    const result = await updatePrestamoReserva(editandoPrestamoId, editPrestamoReservaId)
    if (result.error) {
      setEditPrestamoError(result.error)
    } else {
      await loadMisPrestamos()
      setEditandoPrestamoId(null)
      setEditPrestamoReservaId('')
    }
    setSavingEditPrestamo(false)
  }

  const handleAsignarSala = async (equipoId: string, salaId: string | null) => {
    setAsignandoSala(equipoId)
    await asignarEquipoASala(equipoId, salaId)
    setEquipos(prev => prev.map(e => e.id === equipoId ? { ...e, sala_id: salaId } : e))
    setAsignandoSala(null)
  }

  // Admin return modal
  const handleAbrirDevolucionAdmin = (p: PrestamoEquipoAdmin) => {
    setAdminReturnPrestamo(p)
    setAdminReturnCondicion('bueno')
    setAdminReturnNotas('')
    setAdminReturnNovedad(false)
    setAdminReturnTipoNovedad('dano_fisico')
    setAdminReturnDescNovedad('')
    setAdminReturnError(null)
    setAdminReturnModalOpen(true)
  }

  const handleSubmitDevolucionAdmin = async () => {
    if (!adminReturnPrestamo) return
    if (adminReturnNovedad && !adminReturnDescNovedad.trim()) {
      setAdminReturnError('Debes describir la novedad antes de continuar.')
      return
    }
    setAdminReturnSubmitting(true)
    setAdminReturnError(null)
    const result = await devolverPrestamoAdmin(
      adminReturnPrestamo.id,
      adminReturnPrestamo.equipo_id,
      adminReturnCondicion,
      adminReturnNotas || null,
      adminReturnNovedad ? adminReturnTipoNovedad : null,
      adminReturnNovedad && adminReturnDescNovedad ? adminReturnDescNovedad : null,
    )
    if (result.error) {
      setAdminReturnError(result.error)
      setAdminReturnSubmitting(false)
      return
    }
    setPrestamosAdmin(prev => prev.filter(p => p.id !== adminReturnPrestamo.id))
    setPrestamosHistorial(prev => prev.filter(p => p.id !== adminReturnPrestamo.id))
    const nuevoEstado = adminReturnCondicion === 'perdido' || adminReturnCondicion === 'dano_grave' ? 'mantenimiento' : 'disponible'
    setEquipos(prev => prev.map(e => e.id === adminReturnPrestamo.equipo_id ? { ...e, estado: nuevoEstado as Equipo['estado'] } : e))
    setAdminReturnModalOpen(false)
    setAdminReturnSubmitting(false)
  }

  const handleToggleEquipo = async (id: string, estado: Equipo['estado']) => {
    await updateEquipoEstado(id, estado)
    setEquipos(prev => prev.map(e => e.id === id ? { ...e, estado } : e))
  }

  // ── Handlers: confirmación de revisión (pendiente_revision → devuelto) ───
  const handleAbrirRevision = (p: PrestamoEquipoAdmin) => {
    setRevisionPrestamo(p)
    setRevisionCondicion(p.condicion_devolucion ?? 'bueno')
    setRevisionNotas('')
    setRevisionNovedad(p.novedad)
    setRevisionTipoNovedad(p.tipo_novedad ?? 'dano_fisico')
    setRevisionDescNovedad(p.descripcion_novedad ?? '')
    setRevisionError(null)
    setRevisionModalOpen(true)
  }

  const handleSubmitRevision = async () => {
    if (!revisionPrestamo) return
    if (revisionNovedad && !revisionDescNovedad.trim()) {
      setRevisionError('Debes describir la novedad antes de continuar.')
      return
    }
    setRevisionSubmitting(true)
    setRevisionError(null)
    const result = await confirmarRevisionAdmin(
      revisionPrestamo.id,
      revisionPrestamo.equipo_id,
      revisionCondicion,
      revisionNotas || null,
      revisionNovedad ? revisionTipoNovedad : null,
      revisionNovedad && revisionDescNovedad ? revisionDescNovedad : null,
    )
    if (result.error) {
      setRevisionError(result.error)
      setRevisionSubmitting(false)
      return
    }
    setPrestamosAdmin(prev => prev.filter(p => p.id !== revisionPrestamo.id))
    const nuevoEstadoEquipo = revisionCondicion === 'perdido' || revisionCondicion === 'dano_grave' ? 'mantenimiento' : 'disponible'
    setEquipos(prev => prev.map(e => e.id === revisionPrestamo.equipo_id ? { ...e, estado: nuevoEstadoEquipo as Equipo['estado'] } : e))
    setRevisionModalOpen(false)
    setRevisionSubmitting(false)
  }

  // ── Handlers: reasignación de equipo ─────────────────────────────────────
  const handleAbrirReasignar = (p: PrestamoEquipoAdmin) => {
    setReasignarPrestamo(p)
    setReasignarEquipoId('')
    setReasignarNotas('')
    setReasignarError(null)
    setReasignarModalOpen(true)
  }

  const handleSubmitReasignar = async () => {
    if (!reasignarPrestamo) return
    if (!reasignarEquipoId) {
      setReasignarError('Debes seleccionar un equipo de reemplazo.')
      return
    }
    if (reasignarEquipoId === reasignarPrestamo.equipo_id) {
      setReasignarError('El equipo de reemplazo debe ser diferente al original.')
      return
    }
    setReasignarSubmitting(true)
    setReasignarError(null)
    const result = await reasignarEquipoAdmin(
      reasignarPrestamo.id,
      reasignarPrestamo.equipo_id,
      reasignarEquipoId,
      reasignarPrestamo.usuario_id,
      reasignarNotas || null,
    )
    if (result.error) {
      setReasignarError(result.error)
      setReasignarSubmitting(false)
      return
    }
    // Update original equipment to mantenimiento, reassigned to reservado
    setEquipos(prev => prev.map(e => {
      if (e.id === reasignarPrestamo.equipo_id) return { ...e, estado: 'mantenimiento' as Equipo['estado'] }
      if (e.id === reasignarEquipoId) return { ...e, estado: 'reservado' as Equipo['estado'] }
      return e
    }))
    setPrestamosAdmin(prev => prev.filter(p => p.id !== reasignarPrestamo.id))
    setReasignarModalOpen(false)
    setReasignarSubmitting(false)
    // Reload admin loans to show the new active loan
    await loadPrestamosAdmin()
  }

  const handleDeleteEquipo = async (id: string) => {
    const result = await deleteEquipo(id)
    if (result.error) {
      showGlobalError(result.error)
      return
    }
    setEquipos(prev => prev.filter(e => e.id !== id))
  }

  const handleAddEquipo = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!equipoForm.nombre.trim() || !equipoForm.tipo_equipo) return

    // Validar seriales
    const cantidad = Math.max(1, equipoCantidad)
    for (let i = 0; i < cantidad; i++) {
      const serial = (equipoSeriales[i] ?? '').trim()
      if (serial.length < 4) {
        alert(`La unidad #${i + 1} requiere un N/S o IMEI válido (mínimo 4 caracteres).`)
        return
      }
    }
    const serialesUsados = equipoSeriales.slice(0, cantidad).map(s => s.trim())
    const duplicados = serialesUsados.filter((s, i) => serialesUsados.indexOf(s) !== i)
    if (duplicados.length > 0) {
      alert(`Hay números de serie duplicados: ${duplicados.join(', ')}. Cada unidad debe tener un código único.`)
      return
    }

    setAddingEquipo(true)
    setEquipoFormStage('processing')
    let imagenUrl: string | null = null
    if (equipoImageFile) {
      imagenUrl = await uploadImagen('equipos', equipoImageFile)
    }
    const nuevosEquipos: Equipo[] = []
    const equipoPromises = Array.from({ length: cantidad }, (_, i) => {
      const nombreUnidad = cantidad > 1
        ? `${equipoForm.nombre.trim()} #${i + 1}`
        : equipoForm.nombre.trim()
      return createEquipo({
        nombre: nombreUnidad,
        categoria: equipoForm.categoria,
        sistema_operativo: equipoForm.sistema_operativo,
        marca: equipoForm.marca,
        tipo_equipo: equipoForm.tipo_equipo,
        estado: equipoForm.estado,
        imagen_url: imagenUrl,
        numero_serie: serialesUsados[i],
      })
    })
    const results = await Promise.all(equipoPromises)
    for (const result of results) {
      if (result.data) nuevosEquipos.push(result.data)
    }
    if (nuevosEquipos.length > 0) {
      setEquipos(prev => [...prev, ...nuevosEquipos])
      setEquipoFormStage('success')
      setTimeout(() => {
        setEquipoForm({ nombre: '', categoria: '', sistema_operativo: '', marca: '', tipo_equipo: '', estado: 'disponible', imagen_url: '' })
        setEquipoImageFile(null)
        setEquipoCantidad(1)
        setEquipoSeriales([''])
        setShowEquipoForm(false)
        setEquipoFormStage('form')
      }, 1800)
    } else {
      setEquipoFormStage('form')
    }
    setAddingEquipo(false)
  }

  const handleSaveEquipo = async (id: string) => {
    setSavingEquipo(true)
    let imagenUrl = editEquipoForm.imagen_url || null
    if (editEquipoImageFile) {
      const uploaded = await uploadImagen('equipos', editEquipoImageFile)
      if (uploaded) imagenUrl = uploaded
    }
    await updateEquipo(id, {
      nombre: editEquipoForm.nombre.trim(),
      categoria: editEquipoForm.categoria,
      sistema_operativo: editEquipoForm.sistema_operativo,
      marca: editEquipoForm.marca,
      tipo_equipo: editEquipoForm.tipo_equipo,
      estado: editEquipoForm.estado,
      imagen_url: imagenUrl,
    })
    setEquipos(prev => prev.map(eq => eq.id === id ? {
      ...eq,
      nombre: editEquipoForm.nombre.trim(),
      categoria: editEquipoForm.categoria,
      sistema_operativo: editEquipoForm.sistema_operativo,
      marca: editEquipoForm.marca,
      tipo_equipo: editEquipoForm.tipo_equipo,
      estado: editEquipoForm.estado,
      imagen_url: imagenUrl,
    } : eq))
    setEditingEquipoId(null)
    setEditEquipoImageFile(null)
    setSavingEquipo(false)
  }

  function setEditEquipoField(field: string, value: string) {
    setEditEquipoForm(prev => {
      const next = { ...prev, [field]: value }
      if (field === 'categoria') {
        next.sistema_operativo = ''
        next.marca             = ''
        next.tipo_equipo       = ''
      }
      if (field === 'sistema_operativo') {
        next.marca       = ''
        next.tipo_equipo = ''
      }
      if (field === 'marca') {
        next.tipo_equipo = ''
      }
      return next
    })
  }

  function setEquipoField(field: string, value: string) {
    setEquipoForm(prev => {
      const next = { ...prev, [field]: value }
      if (field === 'categoria') {
        // Para categorías no-tech, el SO no aplica; usar 'N/A' como valor
        next.sistema_operativo = isTechCategory(value) ? '' : 'N/A'
        next.marca             = ''
        next.tipo_equipo       = ''
      }
      if (field === 'sistema_operativo') {
        next.marca       = ''
        next.tipo_equipo = ''
      }
      if (field === 'marca') {
        next.tipo_equipo = ''
      }
      return next
    })
  }

  // ── Activar tab admin y cargar datos ─────────────────────────────
  const handleAdminTab = useCallback(() => {
    setActiveTab('admin')
    loadUsuarios()
    loadEquipos()
  }, [loadUsuarios, loadEquipos])
  // ── Admin: Crear usuario ──────────────────────────────────────────
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault()
    setUserFormError(null)
    const nombreError = adminValidateNombre(userForm.nombre)
    if (nombreError) {
      setUserFormError(nombreError)
      return
    }
    const emailError = adminValidateEmail(userForm.correo)
    if (emailError) {
      setUserFormError(emailError)
      return
    }
    const passwordError = adminValidatePassword(userForm.password)
    if (passwordError) {
      setUserFormError(passwordError)
      return
    }
    if (userForm.password !== userForm.confirmPassword) {
      setUserFormError('Las contraseñas no coinciden.')
      return
    }
    setAddingUser(true)
    const result = await createUsuarioAdmin(userForm.nombre, userForm.correo, userForm.password, userForm.rol)
    if (result.error) {
      setUserFormError(result.error)
    } else {
      setUserForm({ nombre: '', correo: '', password: '', confirmPassword: '', rol: 'usuario' })
      setShowUserForm(false)
      setShowPassword(false)
      setShowConfirmPassword(false)
      loadUsuarios()
    }
    setAddingUser(false)
  }

  // ── Admin: Toggle activo ──────────────────────────────────────────
  const handleToggleActivo = async (userId: string, activo: boolean) => {
    setTogglingActivo(userId)
    await toggleUsuarioActivo(userId, activo)
    setUsuarios(prev => prev.map(u => u.id === userId ? { ...u, activo } : u))
    setTogglingActivo(null)
  }

  // ── Admin: Editar email y nombre ──────────────────────────────────
  const NOMBRE_REGEX = /^[a-zA-ZáéíóúÁÉÍÓÚüÜñÑ\s'-]{2,60}$/
  const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

  const handleSaveEmail = async (userId: string) => {
    setEditUserError(null)
    const nombre = editNombreValue.trim()
    const correo = editEmailValue.trim()

    if (!nombre) {
      setEditUserError('El nombre no puede estar vacío.')
      return
    }
    if (!NOMBRE_REGEX.test(nombre)) {
      setEditUserError('El nombre solo puede contener letras, espacios, apóstrofes o guiones (mín. 2 caracteres).')
      return
    }
    if (!correo) {
      setEditUserError('El correo no puede estar vacío.')
      return
    }
    if (!EMAIL_REGEX.test(correo)) {
      setEditUserError('Ingresa un correo electrónico válido.')
      return
    }

    setSavingEmail(true)
    const [emailResult, nombreResult] = await Promise.all([
      updateUsuarioEmail(userId, correo),
      updateUsuarioNombre(userId, nombre),
    ])
    const serverError = emailResult.error || nombreResult.error
    if (serverError) {
      setEditUserError(serverError)
    } else {
      setUsuarios(prev => prev.map(u => u.id === userId
        ? { ...u, correo: correo.toLowerCase(), nombre }
        : u
      ))
      setEditingUserId(null)
    }
    setSavingEmail(false)
  }

  // ── Admin: Reset password ─────────────────────────────────────────
  const handleResetPassword = async (correo: string, userId: string) => {
    setResetingPwd(userId)
    await sendPasswordResetAdmin(correo)
    setPwdResetSuccess(userId)
    setResetingPwd(null)
    setTimeout(() => setPwdResetSuccess(null), 3000)
  }

  // ── Admin: Salas CRUD ─────────────────────────────────────────────
  const loadSalasAdmin = useCallback(async () => {
    setLoadingSalasAdmin(true)
    const result = await getSalasAdmin()
    if (result.data) setSalasAdmin(result.data)
    setLoadingSalasAdmin(false)
  }, [])

  const handleAddSala = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!salaForm.nombre.trim() || !salaForm.capacidad) return
    setAddingSala(true)
    let imagenUrl: string | null = null
    if (salaImageFile) {
      imagenUrl = await uploadImagen('salas', salaImageFile)
    }
    const result = await createSala({
      nombre: salaForm.nombre.trim(),
      descripcion: salaForm.descripcion.trim() || null,
      capacidad: parseInt(salaForm.capacidad) || 1,
      ubicacion: salaForm.ubicacion.trim() || null,
      imagen_url: imagenUrl,
      estado: salaForm.estado,
    })
    if (result.data) {
      setSalasAdmin(prev => [...prev, result.data!])
      setSalaForm({ nombre: '', descripcion: '', capacidad: '', ubicacion: '', imagen_url: '', estado: 'disponible' })
      setSalaImageFile(null)
      setShowSalaForm(false)
    }
    setAddingSala(false)
  }

  const handleDeleteSala = async (id: string) => {
    const result = await deleteSala(id)
    if (result.error) {
      showGlobalError(result.error)
      return
    }
    setSalasAdmin(prev => prev.filter(s => s.id !== id))
  }

  const handleSaveSala = async (id: string) => {
    setSavingSala(true)
    let imagenUrl = editSalaForm.imagen_url || null
    if (editSalaImageFile) {
      const uploaded = await uploadImagen('salas', editSalaImageFile)
      if (uploaded) imagenUrl = uploaded
    }
    await updateSala(id, {
      nombre: editSalaForm.nombre.trim(),
      descripcion: editSalaForm.descripcion.trim() || null,
      capacidad: parseInt(editSalaForm.capacidad) || 1,
      ubicacion: editSalaForm.ubicacion.trim() || null,
      imagen_url: imagenUrl,
      estado: editSalaForm.estado,
    })
    setSalasAdmin(prev => prev.map(s => s.id === id ? {
      ...s,
      nombre: editSalaForm.nombre.trim(),
      descripcion: editSalaForm.descripcion.trim() || null,
      capacidad: parseInt(editSalaForm.capacidad) || 1,
      ubicacion: editSalaForm.ubicacion.trim() || null,
      imagen_url: imagenUrl,
      estado: editSalaForm.estado,
    } : s))
    setEditingSalaId(null)
    setEditSalaImageFile(null)
    setSavingSala(false)
  }

  const openModal = async (salaId?: string, fecha?: string, equipoId?: string) => {
    const { dateStr: todayStr } = getBogotaNow()
    setForm({ ...EMPTY_FORM, fecha: fecha ?? todayStr, sala_id: salaId ?? '' })
    setModalError(null)
    setModalSuccess(false)
    setDuracionPreset('libre')
    setModalFranjas([])

    // Si se pasa un equipoId explícito (p.ej. desde el modal de préstamo), usarlo directamente
    if (equipoId) {
      setNecesitaEquipo(true)
      setEquiposSeleccionados([equipoId])
      if (equipos.length === 0) loadEquipos()
      setModalOpen(true)
      return
    }

    // Resolver lista de equipos (puede no estar cargada todavía)
    let listaEquipos = equipos
    if (listaEquipos.length === 0) {
      const { data } = await getEquipos()
      listaEquipos = data ?? []
      if (data) setEquipos(data)
    }

    // Si hay sala, pre-seleccionar equipos asignados a ella
    if (salaId) {
      const asignados = listaEquipos
        .filter(e => e.sala_id === salaId && e.estado === 'disponible')
        .map(e => e.id)
      if (asignados.length > 0) {
        setNecesitaEquipo(true)
        setEquiposSeleccionados(asignados)
        setModalOpen(true)
        return
      }
    }

    setNecesitaEquipo(false)
    setEquiposSeleccionados([])
    setModalOpen(true)
  }

  const handleNuevaReserva = () => {
    if (!FEATURES.reservations) { showComingSoon(); return }
    openModal()
  }

  const handleReservarRapido = (sala: Sala) => {
    handleReservarPreview(sala)
  }

  const handleSubmitReserva = async (e: React.FormEvent) => {
    e.preventDefault()
    setModalError(null)

    if (!form.titulo.trim())   { setModalError('El título es obligatorio.'); return }
    if (form.titulo.trim().length < 3) { setModalError('El título debe tener al menos 3 caracteres.'); return }
    if (!form.sala_id)         { setModalError('Selecciona una sala.'); return }
    if (!form.fecha)           { setModalError('Selecciona una fecha.'); return }
    const { dateStr: _localToday } = getBogotaNow()
    if (form.fecha < _localToday) { setModalError('No puedes reservar en una fecha pasada.'); return }
    if (!form.hora_inicio)     { setModalError('Indica la hora de inicio.'); return }
    if (!form.hora_fin)        { setModalError('Indica la hora de fin.'); return }
    if (form.hora_fin <= form.hora_inicio) {
      setModalError('La hora de fin debe ser posterior a la hora de inicio.')
      return
    }
    const durMin = diffHoras(form.hora_inicio, form.hora_fin) * 60
    if (durMin < 30) { setModalError('La reserva debe durar al menos 30 minutos.'); return }
    if (durMin > 24 * 60) { setModalError('La reserva no puede durar más de 24 horas.'); return }

    // Validación estricta de hora en zona horaria Bogotá (UTC-5)
    if (form.fecha === _localToday) {
      const [h, m] = form.hora_inicio.split(':').map(Number)
      const selectedMinutes = h * 60 + m
      const { totalMinutes: currentTotalMinutes } = getBogotaNow()
      if (selectedMinutes < currentTotalMinutes) {
        setModalError('La hora de inicio ya pasó. Por favor, selecciona una hora válida.')
        return
      }
    }

    // Validación de solapamiento contra franjas ya reservadas (cliente)
    if (modalFranjas.length > 0 && hasOverlap(form.hora_inicio, form.hora_fin, modalFranjas)) {
      setModalError('El horario seleccionado se solapa con una reserva existente. Elige un rango disponible.')
      return
    }

    setSubmitting(true)

    if (editingReservaId) {
      // Modo edición
      const result = await updateReserva(editingReservaId, {
        titulo:      form.titulo.trim(),
        sala_id:     form.sala_id,
        fecha:       form.fecha,
        hora_inicio: form.hora_inicio,
        hora_fin:    form.hora_fin,
      })
      if (result.error) {
        setModalError(result.error)
        setSubmitting(false)
        return
      }
    } else {
      // Modo creación
      const result = await createReserva(
        {
          titulo:      form.titulo.trim(),
          sala_id:     form.sala_id,
          fecha:       form.fecha,
          hora_inicio: form.hora_inicio,
          hora_fin:    form.hora_fin,
        },
        necesitaEquipo ? equiposSeleccionados : [],
      )
      if (result.error) {
        setModalError(result.error)
        setSubmitting(false)
        return
      }
      if (result.prestamosError) {
        // La reserva se creó, pero el registro de préstamos falló.
        // Esto ocurre si la migración de la tabla prestamos_equipo no se ha ejecutado en Supabase.
        setModalError(`Reserva creada, pero no se pudieron registrar los préstamos de equipo: ${result.prestamosError}. Ejecuta la migración 003_prestamos_equipo.sql en Supabase.`)
        setSubmitting(false)
        if (currentUserId) { fetchReservas(currentUserId); fetchCalendarReservas(currentUserId) }
        return
      }
    }

    setSubmitting(false)
    setModalSuccess(true)
    if (currentUserId) { fetchReservas(currentUserId); fetchCalendarReservas(currentUserId) }
    // Recargar salas para reflejar cambios de estado (ocupada/disponible)
    fetchSalas()
    // Si se reservaron equipos, actualizar préstamos activos y estado de equipos
    if (!editingReservaId && necesitaEquipo && equiposSeleccionados.length > 0) {
      await loadMisPrestamos()
      await loadEquipos()
    }

    setTimeout(() => {
      setModalOpen(false)
      setModalSuccess(false)
      setEditingReservaId(null)
    }, 1500)
  }

  // ── Sprint 3: Editar reserva ──────────────────────────────────────
  const handleEditReserva = (reserva: Reserva) => {
    setEditingReservaId(reserva.id)
    setForm({
      titulo:      reserva.titulo,
      sala_id:     reserva.salas?.id ?? '',
      fecha:       reserva.fecha,
      hora_inicio: reserva.hora_inicio.slice(0, 5),
      hora_fin:    reserva.hora_fin.slice(0, 5),
    })
    setModalError(null)
    setModalSuccess(false)
    setDuracionPreset('libre')
    setModalFranjas([])
    setNecesitaEquipo(false)
    setEquiposSeleccionados([])
    setModalOpen(true)
  }

  // ── Sprint 3: Cancelar reserva ────────────────────────────────────
  const handleCancelReserva = async (reservaId: string) => {
    setCancelingReservaId(reservaId)
    const result = await cancelarReserva(reservaId)
    if (!result.error) {
      setReservas(prev => prev.filter(r => r.id !== reservaId))
      setCalendarReservas(prev => prev.map(r => r.id === reservaId ? { ...r, estado: 'cancelada' as const } : r))
      // Recargar salas para reflejar el cambio de estado
      fetchSalas()
    }
    setCancelingReservaId(null)
  }

  // ── Sprint 3: Eliminar reserva ────────────────────────────────────
  const handleDeleteReserva = async (reservaId: string) => {
    setDeletingReservaId(reservaId)
    const result = await deleteReserva(reservaId)
    if (!result.error) {
      setReservas(prev => prev.filter(r => r.id !== reservaId))
      setCalendarReservas(prev => prev.filter(r => r.id !== reservaId))
      // Recargar salas para reflejar el cambio de estado
      fetchSalas()
    }
    setDeletingReservaId(null)
  }

  // ── Sprint 3: Cargar reportes ─────────────────────────────────────
  const loadReports = useCallback(async () => {
    setLoadingReports(true)
    const result = await getReportData()
    if (result.data) setReportData(result.data)
    setLoadingReports(false)
  }, [])

  // ── Historial de reservas del usuario ────────────────────────────
  const loadHistorialReservas = useCallback(async () => {
    if (historialReservasLoaded) return
    setLoadingHistorialReservas(true)
    const result = await getMisReservasHistorial()
    if (result.data) setReservasHistorial(result.data)
    setLoadingHistorialReservas(false)
    setHistorialReservasLoaded(true)
  }, [historialReservasLoaded])

  // ── Datos derivados con useMemo ──────────────────────────────────
  // IMPORTANT: todos los hooks deben declararse ANTES de cualquier early return.
  // Se recalculan SOLO cuando cambian sus dependencias, evitando recómputos
  // innecesarios en cada render causado por otras partes del estado.
  const isAdmin = useMemo(
    () =>
      profile?.rol === 'admin' ||
      profile?.rol === 'administrador' ||
      profile?.rol === 'administrator',
    [profile?.rol],
  )

  const proximaReserva = useMemo(() => reservas[0] ?? null, [reservas])

  // Equipos filtrados por búsqueda y categoría — evita recorrer el array en cada render
  const filteredTech = useMemo(() => equipos.filter(eq => {
    const matchesSearch = techSearch.trim() === '' ||
      eq.nombre.toLowerCase().includes(techSearch.toLowerCase()) ||
      eq.marca.toLowerCase().includes(techSearch.toLowerCase()) ||
      eq.tipo_equipo.toLowerCase().includes(techSearch.toLowerCase())
    const matchesFilter = techFilter === '' || eq.categoria === techFilter || eq.tipo_equipo === techFilter
    return matchesSearch && matchesFilter
  }), [equipos, techSearch, techFilter])

  if (isLoading) {
    return (
      <div className="bg-surface flex h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="font-body text-on-surface-variant text-sm">Cargando tu espacio…</p>
        </div>
      </div>
    )
  }

  // Datos derivados sin memoización (recómputo barato)
  const salasCount = salas.length

  const navItems = [
    { id: 'reservations' as ActiveTab, label: 'Reservas', icon: 'event_available' },
    { id: 'rooms' as ActiveTab, label: 'Salas', icon: 'meeting_room' },
    { id: 'tech' as ActiveTab, label: 'Equipos', icon: 'devices' },
    { id: 'profile' as ActiveTab, label: 'Perfil', icon: 'account_circle' },
  ]

  return (
    <div className="bg-surface text-on-surface flex h-screen overflow-hidden">

      {/* ── Coming Soon toast ────────────────────────────────── */}
      {comingSoon && (
        <AnimatedToast className="fixed top-6 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-3 bg-[#001529] text-white px-5 py-3 rounded-xl shadow-2xl border border-white/10">
          <span className="material-symbols-outlined text-[20px] text-yellow-400" style={{ fontVariationSettings: "'FILL' 1" }}>rocket_launch</span>
          <span className="font-label text-sm font-medium">Próximamente: disponible en el siguiente Sprint</span>
        </AnimatedToast>
      )}

      {/* ── Global Error toast ────────────────────────────────── */}
      {globalError && (
        <AnimatedToast className="fixed top-6 left-1/2 -translate-x-1/2 z-[105] flex items-center gap-3 bg-error-container text-on-error-container border border-error/20 shadow-2xl px-5 py-3 rounded-xl max-w-[90vw] md:max-w-md">
          <span className="material-symbols-outlined text-[20px] shrink-0" style={{ fontVariationSettings: "'FILL' 1" }}>error</span>
          <span className="font-body text-sm font-medium leading-tight">{globalError}</span>
        </AnimatedToast>
      )}
      {/* ── Sidebar (desktop) ─────────────────────────────────── */}
      <nav className="bg-surface text-primary font-body hidden h-screen w-72 flex-col border-r border-outline-variant/20 fixed left-0 top-0 z-50 md:flex">
        {/* Brand */}
        <div className="p-8 flex items-center gap-3 border-b border-outline-variant/20 mb-2">
          <Image src="/logo.png" alt="Reservio Logo" width={40} height={40} className="object-contain drop-shadow-sm" />
          <div>
            <h1 className="font-headline text-2xl font-semibold text-primary mb-0 leading-none">Reservio</h1>
            <p className="font-body text-secondary text-[11px] font-semibold tracking-wider uppercase mt-1">Workspace</p>
          </div>
        </div>

        {/* Nav items */}
        <div className="flex flex-col gap-y-1 flex-grow overflow-y-auto pb-4 px-2">
          {navItems.map((item) => (
            <button type="button"
              key={item.id}
              onClick={() => { setActiveTab(item.id); if (item.id === 'tech') { loadEquipos(); loadMisPrestamos() } if (item.id === 'rooms') { fetchSalas() } }}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium w-full text-left transition-all duration-200
                ${
                  activeTab === item.id
                    ? 'border-l-[3px] border-primary bg-surface-container-lowest text-primary font-semibold'
                    : 'text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface'
                }`}
            >
              <span
                className="material-symbols-outlined"
                style={
                  activeTab === item.id
                    ? { fontVariationSettings: "'FILL' 1" }
                    : undefined
                }
              >
                {item.icon}
              </span>
              <span>{item.label}</span>
            </button>
          ))}

          {/* Admin section */}
          {isAdmin && (
            <>
              <div className="h-px bg-outline-variant/30 my-3 mx-4" />
              <p className="font-label text-[10px] uppercase tracking-widest text-on-surface-variant/80 px-4 mb-1">
                Administración
              </p>
              <button type="button"
                onClick={() => { handleAdminTab(); setAdminSubTab('users') }}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium w-full text-left transition-all duration-200 ${
                  activeTab === 'admin' && adminSubTab === 'users'
                    ? 'border-l-[3px] border-primary bg-surface-container-lowest text-primary font-semibold'
                    : 'text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface'
                }`}
              >
                <span className="material-symbols-outlined text-[20px]" style={activeTab === 'admin' && adminSubTab === 'users' ? { fontVariationSettings: "'FILL' 1" } : undefined}>manage_accounts</span>
                <span>Usuarios</span>
              </button>
              <button type="button"
                onClick={() => { handleAdminTab(); setAdminSubTab('equipment'); loadPrestamosAdmin(); loadAlertasEquipos() }}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium w-full text-left transition-all duration-200 ${
                  activeTab === 'admin' && adminSubTab === 'equipment'
                    ? 'border-l-[3px] border-primary bg-surface-container-lowest text-primary font-semibold'
                    : 'text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface'
                }`}
              >
                <span className="material-symbols-outlined text-[20px]" style={activeTab === 'admin' && adminSubTab === 'equipment' ? { fontVariationSettings: "'FILL' 1" } : undefined}>devices</span>
                <span>Equipos</span>
              </button>
              <button type="button"
                onClick={() => { handleAdminTab(); setAdminSubTab('rooms'); loadSalasAdmin() }}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium w-full text-left transition-all duration-200 ${
                  activeTab === 'admin' && adminSubTab === 'rooms'
                    ? 'border-l-[3px] border-primary bg-surface-container-lowest text-primary font-semibold'
                    : 'text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface'
                }`}
              >
                <span className="material-symbols-outlined text-[20px]" style={activeTab === 'admin' && adminSubTab === 'rooms' ? { fontVariationSettings: "'FILL' 1" } : undefined}>meeting_room</span>
                <span>Salas</span>
              </button>
              <button type="button"
                onClick={() => { handleAdminTab(); setAdminSubTab('reports'); loadReports() }}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium w-full text-left transition-all duration-200 ${
                  activeTab === 'admin' && adminSubTab === 'reports'
                    ? 'border-l-[3px] border-primary bg-surface-container-lowest text-primary font-semibold'
                    : 'text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface'
                }`}
              >
                <span className="material-symbols-outlined text-[20px]" style={activeTab === 'admin' && adminSubTab === 'reports' ? { fontVariationSettings: "'FILL' 1" } : undefined}>analytics</span>
                <span>Reportes</span>
              </button>
            </>
          )}
        </div>

        {/* Sign out */}
        <div className="p-6 mt-auto">
          <button type="button"
            onClick={handleSignOut}
            className="w-full flex items-center justify-center gap-2 border border-outline-variant/30 text-on-surface-variant py-3 rounded-lg hover:border-error/40 hover:text-error hover:bg-error/5 transition-colors text-sm font-medium font-label"
          >
            <span className="material-symbols-outlined text-lg">logout</span>
            Cerrar Sesión
          </button>
        </div>
      </nav>

      {/* ── Top app bar (mobile) ───────────────────────────────── */}
      <header className="md:hidden bg-surface/95 backdrop-blur-sm fixed top-0 left-0 right-0 z-40 flex items-center justify-between px-6 h-16 border-b border-outline-variant/20">
        <div className="flex items-center gap-2">
          <Image src="/logo.png" alt="Logo" width={28} height={28} className="object-contain" />
          <span className="font-headline text-xl font-semibold text-primary tracking-wide">Reservio</span>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" className="p-2 rounded-full hover:bg-surface-container transition-colors">
            <span className="material-symbols-outlined text-on-surface-variant">notifications</span>
          </button>
          <button type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-full hover:bg-surface-container transition-colors"
          >
            <span className="material-symbols-outlined text-on-surface-variant">
              {mobileMenuOpen ? 'close' : 'menu'}
            </span>
          </button>
        </div>
      </header>

      {/* Mobile slide-over menu */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-50">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="absolute left-0 top-0 bottom-0 w-72 bg-surface flex flex-col shadow-2xl">
            <div className="p-8 pt-16 flex items-center gap-3">
              <Image src="/logo.png" alt="Reservio Logo" width={40} height={40} className="object-contain drop-shadow-sm" />
              <div>
                <h1 className="font-headline text-2xl font-semibold text-primary mb-0 leading-none">Reservio</h1>
                <p className="font-body text-secondary text-[11px] font-semibold tracking-wider uppercase mt-1">Workspace</p>
              </div>
            </div>
            <div className="flex flex-col gap-y-1 flex-grow overflow-y-auto pb-4 px-2">
              {navItems.map((item) => (
                <button type="button"
                  key={item.id}
                  onClick={() => { setActiveTab(item.id); if (item.id === 'tech') { loadEquipos(); loadMisPrestamos() } if (item.id === 'rooms') { fetchSalas() } setMobileMenuOpen(false) }}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium w-full text-left transition-all duration-200
                    ${activeTab === item.id
                      ? 'bg-surface-container-lowest text-primary font-semibold'
                      : 'text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface'
                    }`}
                >
                  <span
                    className="material-symbols-outlined"
                    style={activeTab === item.id ? { fontVariationSettings: "'FILL' 1" } : undefined}
                  >
                    {item.icon}
                  </span>
                  <span>{item.label}</span>
                </button>
              ))}
              {isAdmin && (
                <>
                  <div className="h-px bg-outline-variant/30 my-3 mx-4" />
                  <p className="font-label text-[10px] uppercase tracking-widest text-on-surface-variant px-4 mb-1">
                    Administración
                  </p>
                  <button type="button"
                    onClick={() => { handleAdminTab(); setAdminSubTab('users'); setMobileMenuOpen(false) }}
                    className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium w-full text-left transition-all duration-200 ${
                      activeTab === 'admin' && adminSubTab === 'users'
                        ? 'bg-surface-container-lowest text-primary font-semibold'
                        : 'text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[20px]">manage_accounts</span>
                    <span>Usuarios</span>
                  </button>
                  <button type="button"
                    onClick={() => { handleAdminTab(); setAdminSubTab('equipment'); loadPrestamosAdmin(); loadAlertasEquipos(); setMobileMenuOpen(false) }}
                    className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium w-full text-left transition-all duration-200 ${
                      activeTab === 'admin' && adminSubTab === 'equipment'
                        ? 'bg-surface-container-lowest text-primary font-semibold'
                        : 'text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[20px]">devices</span>
                    <span>Equipos</span>
                  </button>
                  <button type="button"
                    onClick={() => { handleAdminTab(); setAdminSubTab('rooms'); loadSalasAdmin(); setMobileMenuOpen(false) }}
                    className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium w-full text-left transition-all duration-200 ${
                      activeTab === 'admin' && adminSubTab === 'rooms'
                        ? 'bg-surface-container-lowest text-primary font-semibold'
                        : 'text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[20px]">meeting_room</span>
                    <span>Salas</span>
                  </button>
                  <button type="button"
                    onClick={() => { handleAdminTab(); setAdminSubTab('reports'); loadReports(); setMobileMenuOpen(false) }}
                    className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium w-full text-left transition-all duration-200 ${
                      activeTab === 'admin' && adminSubTab === 'reports'
                        ? 'bg-surface-container-lowest text-primary font-semibold'
                        : 'text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[20px]">analytics</span>
                    <span>Reportes</span>
                  </button>
                </>
              )}
            </div>
            <div className="p-6">
              <button type="button"
                onClick={handleSignOut}
                className="w-full flex items-center justify-center gap-2 border border-outline-variant/30 text-on-surface-variant py-3 rounded-lg hover:border-error/40 hover:text-error hover:bg-error/5 transition-colors text-sm font-medium font-label"
              >
                <span className="material-symbols-outlined text-lg">logout</span>
                Cerrar Sesión
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Main content ─────────────────────────────────────────── */}
      <main className="flex-1 ml-0 md:ml-72 pt-16 md:pt-0 bg-surface h-full overflow-y-auto">
        <div className="max-w-7xl mx-auto p-6 md:p-8 xl:p-12">

          {/* Welcome header — siempre visible */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-10">
            <div>
              <h2 className="font-headline text-2xl md:text-3xl font-semibold text-on-surface tracking-tight mb-2">
                {activeTab === 'reservations' && <>Hola, {profile?.nombre}</>}
                {activeTab === 'rooms'        && 'Salas disponibles'}
                {activeTab === 'tech'         && 'Equipamiento Tecnológico'}
                {activeTab === 'profile'      && 'Mi Perfil'}
                {activeTab === 'admin' && adminSubTab === 'users'     && 'Gestión de Usuarios'}
                {activeTab === 'admin' && adminSubTab === 'equipment' && 'Gestión de Equipos'}
                {activeTab === 'admin' && adminSubTab === 'rooms'     && 'Gestión de Salas'}
                {activeTab === 'admin' && adminSubTab === 'reports'   && 'Reportes'}
              </h2>
              <p className="font-body text-sm text-on-surface-variant">
                {activeTab === 'reservations' && 'Reserva espacios y equipos fácilmente.'}
                {activeTab === 'rooms'        && 'Encuentra el ambiente perfecto para tu próxima reunión.'}
                {activeTab === 'tech'         && 'Herramientas de última generación para potenciar tu trabajo.'}
                {activeTab === 'profile'      && 'Gestiona tus datos personales y preferencias de cuenta.'}
                {activeTab === 'admin' && adminSubTab === 'users'     && 'Administra los roles y accesos de todos los usuarios.'}
                {activeTab === 'admin' && adminSubTab === 'equipment' && 'Registra y controla la disponibilidad del equipamiento.'}
                {activeTab === 'admin' && adminSubTab === 'rooms'     && 'Crea y administra las salas disponibles.'}
                {activeTab === 'admin' && adminSubTab === 'reports'   && 'Estadísticas de uso de equipos, salas y reservas.'}
              </p>
            </div>
            {activeTab === 'reservations' && (
              <div className="flex items-center gap-2">
                {/* Upcoming / History / Calendar toggle */}
                <div className="flex items-center gap-0.5 bg-surface-container rounded-xl p-1 border border-outline-variant/20">
                  <button type="button"
                    onClick={() => setReservaView2('upcoming')}
                    title="Próximas reservas"
                    className={`flex items-center gap-1.5 px-3 h-8 rounded-lg transition-all font-label text-xs font-medium ${
                      reservaView2 === 'upcoming'
                        ? 'bg-primary text-on-primary shadow-sm'
                        : 'text-on-surface-variant hover:bg-surface-container-high'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[16px]">upcoming</span>
                    Próximas
                  </button>
                  <button type="button"
                    onClick={() => { setReservaView2('history'); loadHistorialReservas() }}
                    title="Historial de reservas"
                    className={`flex items-center gap-1.5 px-3 h-8 rounded-lg transition-all font-label text-xs font-medium ${
                      reservaView2 === 'history'
                        ? 'bg-primary text-on-primary shadow-sm'
                        : 'text-on-surface-variant hover:bg-surface-container-high'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[16px]">history</span>
                    Historial
                  </button>
                </div>
                {reservaView2 === 'upcoming' && (
                  <div className="flex items-center gap-0.5 bg-surface-container rounded-xl p-1 border border-outline-variant/20">
                    <button type="button"
                      onClick={() => setReservaView('list')}
                      title="Vista lista"
                      className={`size-8 rounded-lg flex items-center justify-center transition-all ${
                        reservaView === 'list'
                          ? 'bg-primary text-on-primary shadow-sm'
                          : 'text-on-surface-variant hover:bg-surface-container-high'
                      }`}
                    >
                      <span className="material-symbols-outlined text-[18px]">view_list</span>
                    </button>
                    <button type="button"
                      onClick={() => setReservaView('calendar')}
                      title="Vista calendario"
                      className={`size-8 rounded-lg flex items-center justify-center transition-all ${
                        reservaView === 'calendar'
                          ? 'bg-primary text-on-primary shadow-sm'
                          : 'text-on-surface-variant hover:bg-surface-container-high'
                      }`}
                    >
                      <span className="material-symbols-outlined text-[18px]">calendar_month</span>
                    </button>
                  </div>
                )}
                <button type="button"
                  onClick={handleNuevaReserva}
                  className="btn-press inline-flex items-center gap-2 bg-primary text-on-primary px-5 py-2.5 rounded-lg font-label font-medium text-sm shadow-sm hover:shadow-md hover:brightness-105 transition-all duration-200"
                >
                  <span className="material-symbols-outlined text-[20px]">add</span>
                  Nueva Reserva
                </button>
              </div>
            )}
            {activeTab === 'rooms' && (
              <button type="button"
                onClick={() => { if (!FEATURES.reservations) { showComingSoon(); return }; openModal() }}
                className="btn-press inline-flex items-center gap-2 bg-primary text-on-primary px-5 py-2.5 rounded-lg font-label font-medium text-sm shadow-sm hover:shadow-md hover:brightness-105 transition-all duration-200"
              >
                <span className="material-symbols-outlined text-[20px]">add</span>
                Nueva Reserva
              </button>
            )}
          </div>

          {/* ══ TAB CONTENT WRAPPER — animates on tab change ══════ */}
          <TabContent tabKey={activeTab === 'admin' ? `admin-${adminSubTab}` : activeTab}>

          {/* ══ TAB: RESERVATIONS ══════════════════════════════════ */}
          {activeTab === 'reservations' && (
            <>
          {reservaView2 === 'upcoming' && (<>
          {/* Summary cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-10">

            {/* Card: próxima reserva */}
            {loadingReservas ? (
              <SkeletonSummaryCard />
            ) : (
              <div className="bg-surface-container-lowest rounded-xl p-5 border border-outline-variant/25 card-lift flex items-start gap-4" data-anim>
                <div className="bg-primary/10 text-primary size-10 rounded-lg flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>
                    event_available
                  </span>
                </div>
                <div>
                  <p className="font-label text-xs uppercase tracking-widest text-on-surface-variant mb-1">
                    Próxima Reserva
                  </p>
                  {proximaReserva ? (
                    <>
                      <p className="font-body font-semibold text-on-surface text-sm leading-snug">
                        {proximaReserva.salas?.nombre}, {formatFecha(proximaReserva.fecha)}, {formatHora(proximaReserva.hora_inicio)}
                      </p>
                      <p className="font-body text-xs text-secondary mt-0.5">{proximaReserva.titulo}</p>
                    </>
                  ) : (
                    <p className="font-body font-semibold text-on-surface-variant text-sm">Sin reservas próximas</p>
                  )}
                </div>
              </div>
            )}

            {/* Card: salas disponibles */}
            {loadingSalas ? (
              <SkeletonSummaryCard />
            ) : (
              <div className="bg-surface-container-lowest rounded-xl p-5 border border-outline-variant/25 card-lift flex items-start gap-4" data-anim>
                <div className="bg-primary/10 text-primary size-10 rounded-lg flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>
                    meeting_room
                  </span>
                </div>
                <div>
                  <p className="font-label text-xs uppercase tracking-widest text-on-surface-variant mb-1">
                    Salas Disponibles
                  </p>
                  <p className="font-body font-semibold text-on-surface text-sm leading-snug">
                    {salasCount} {salasCount === 1 ? 'sala libre' : 'salas libres'} ahora
                  </p>
                  <p className="font-body text-xs text-secondary mt-0.5">
                    {salas.slice(0, 2).map((s) => s.nombre).join(', ')}
                    {salas.length > 2 ? ` +${salas.length - 2} más` : ''}
                  </p>
                </div>
              </div>
            )}

            {/* Card: rol */}
            <div className="bg-surface-container-lowest rounded-xl p-5 border border-outline-variant/25 card-lift flex items-start gap-4" data-anim>
              <div className="bg-primary/10 text-primary size-10 rounded-lg flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>
                  {isAdmin ? 'shield_person' : 'account_circle'}
                </span>
              </div>
              <div>
                <p className="font-label text-xs uppercase tracking-widest text-on-surface-variant mb-1">
                  Tu Rol
                </p>
                <p className="font-body font-semibold text-on-surface text-sm leading-snug capitalize">
                  {isAdmin ? 'Administrador' : 'Usuario'}
                </p>
                <p className="font-body text-xs text-secondary mt-0.5">
                  {isAdmin ? 'Acceso total al sistema' : 'Acceso estándar'}
                </p>
              </div>
            </div>
          </div>

          {/* Calendar view */}
          {reservaView === 'calendar' && (
            <ReservasCalendar
              reservas={calendarReservas}
              loading={loadingCalendar}
              onNewReserva={(fecha) => { if (!FEATURES.reservations) { showComingSoon(); return }; openModal(undefined, fecha) }}
              onEditReserva={handleEditReserva}
              onCancelReserva={handleCancelReserva}
              onDeleteReserva={handleDeleteReserva}
              cancelingId={cancelingReservaId}
              deletingId={deletingReservaId}
            />
          )}

          {/* Bento grid (list view) */}
          {reservaView === 'list' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* Mis próximas reservas (2 cols) */}
            <div className="lg:col-span-2 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-headline text-xl font-semibold text-on-surface">Mis próximas reservas</h3>
                <button
                  type="button"
                  onClick={() => {}}
                  className="font-label text-sm font-medium text-secondary hover:text-primary transition-colors"
                >
                  Ver todas
                </button>
              </div>

              <div className="bg-surface-container-low rounded-xl p-6 space-y-4">
                {loadingReservas ? (
                  <>
                    <SkeletonReservationCard />
                    <SkeletonReservationCard />
                  </>
                ) : reservas.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10 text-center gap-3">
                    <div className="size-14 rounded-full bg-surface-container flex items-center justify-center">
                      <span className="material-symbols-outlined text-on-surface-variant text-3xl">event_busy</span>
                    </div>
                    <div>
                      <p className="font-body font-semibold text-on-surface text-sm">Sin reservas próximas</p>
                      <p className="font-body text-xs text-secondary mt-1">Crea una nueva reserva para comenzar</p>
                    </div>
                    <button type="button"
                      onClick={handleNuevaReserva}
                      className="font-label text-sm font-medium text-primary hover:underline"
                    >
                      + Nueva Reserva
                    </button>
                  </div>
                ) : (
                  reservas.map((reserva, idx) => {
                    const style = CARD_STYLES[idx % CARD_STYLES.length]
                    return (
                      <div
                        key={reserva.id}
                        className="bg-surface-container-lowest rounded-xl border border-outline-variant/20 p-4 hover:border-outline-variant/40 hover:shadow-sm transition-all duration-150 flex flex-col sm:flex-row sm:items-center justify-between gap-4 group"
                      >
                        <div className="flex items-start gap-4">
                          <div className={`${style.bg} ${style.text} size-12 rounded-lg flex items-center justify-center shrink-0`}>
                            <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>
                              {style.icon}
                            </span>
                          </div>
                          <div>
                            <h4 className="font-headline font-semibold text-on-surface text-base">{reserva.titulo}</h4>
                            <p className="font-mono text-xs text-on-surface-variant flex items-center gap-1 mt-1">
                              <span className="material-symbols-outlined text-[16px]">schedule</span>
                              {formatFecha(reserva.fecha)}, {formatHora(reserva.hora_inicio)}&ndash;{formatHora(reserva.hora_fin)}
                            </p>
                          </div>
                        </div>
                        <div className="flex flex-col sm:items-end gap-2">
                          <span className="bg-surface-container px-3 py-1 rounded-full text-xs font-label font-semibold uppercase tracking-wider text-on-surface-variant">
                            {reserva.salas?.nombre ?? 'Sala desconocida'}
                          </span>
                          <span className={`px-2.5 py-0.5 rounded-full text-xs font-label font-bold ${
                            reserva.estado === 'confirmada' ? 'bg-emerald-100 text-emerald-700' :
                            reserva.estado === 'cancelada' ? 'bg-red-100 text-red-600' :
                            'bg-amber-100 text-amber-700'
                          }`}>
                            {reserva.estado}
                          </span>
                          <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button type="button"
                              onClick={() => handleEditReserva(reserva)}
                              className="font-label text-xs text-primary font-medium hover:underline"
                            >
                              Editar
                            </button>
                            <span className="text-outline-variant/50">·</span>
                            <button type="button"
                              onClick={() => handleCancelReserva(reserva.id)}
                              disabled={cancelingReservaId === reserva.id}
                              className="font-label text-xs text-error font-medium hover:underline disabled:opacity-50"
                            >
                              {cancelingReservaId === reserva.id ? '…' : 'Cancelar'}
                            </button>
                            <span className="text-outline-variant/50">·</span>
                            <button type="button"
                              onClick={() => handleDeleteReserva(reserva.id)}
                              disabled={deletingReservaId === reserva.id}
                              className="font-label text-xs text-on-surface-variant font-medium hover:underline disabled:opacity-50"
                            >
                              {deletingReservaId === reserva.id ? '…' : 'Eliminar'}
                            </button>
                          </div>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            </div>

            {/* Salas disponibles (1 col) */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-headline text-xl font-semibold text-on-surface">Salas disponibles</h3>
                <span className="bg-tertiary-container text-on-tertiary-container text-[10px] font-label font-semibold px-2 py-1 rounded uppercase tracking-wider">
                  AHORA
                </span>
              </div>

              <div className="bg-surface-container-low rounded-xl p-6 space-y-4">
                {loadingSalas ? (
                  <>
                    <SkeletonRoomCard />
                    <SkeletonRoomCard />
                  </>
                ) : salas.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-center gap-2">
                    <span className="material-symbols-outlined text-on-surface-variant text-3xl">meeting_room</span>
                    <p className="font-body text-sm text-on-surface-variant">No hay salas disponibles ahora</p>
                  </div>
                ) : (
                  <>
                    {salas.slice(0, 3).map((sala, idx) => (
                      <div key={sala.id} className="bg-surface-container-lowest rounded-xl overflow-hidden border border-outline-variant/15 shadow-sm hover:shadow-md transition-all group cursor-pointer flex items-center gap-4 pr-4">
                        <Image src={sala.imagen_url || getRoomImage(idx)} alt={sala.nombre} width={80} height={96} className="object-cover" unoptimized />
                        <div className="flex-1 py-3">
                          <div className="flex justify-between items-start mb-1">
                            <h4 className="font-headline font-semibold text-on-surface text-sm">{sala.nombre}</h4>
                            <div className={`size-2.5 rounded-full ${sala.estado === 'disponible' ? 'bg-[#10b981] shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-red-500'}`} />
                          </div>
                          <p className="font-body text-xs text-secondary mb-2 flex items-center gap-1"><span className="material-symbols-outlined text-[14px]">group</span> {sala.capacidad} pers.</p>
                          <button type="button"
                            onClick={() => handleReservarRapido(sala)}
                            className="font-label text-xs font-semibold text-primary hover:underline"
                          >
                            Reservar Rápido
                          </button>
                        </div>
                      </div>
                    ))}
                    <div className="pt-1 text-center">
                      <button type="button" className="font-label text-sm font-medium text-primary hover:text-primary-container transition-colors flex items-center justify-center gap-1 w-full">
                        Ver mapa de planta
                        <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
          )} {/* end reservaView === 'list' */}
          </>) /* end reservaView2 === 'upcoming' */}

          {/* ── Historial de reservas ─────────────────────────────── */}
          {reservaView2 === 'history' && (
            <div className="space-y-5">
              {/* Filters */}
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-[18px] pointer-events-none">search</span>
                  <input aria-label="Buscar reservas"
                    type="text"
                    placeholder="Buscar por título o sala…"
                    value={historialSearch}
                    onChange={e => { setHistorialSearch(e.target.value); setHistorialPage(1) }}
                    className="w-full pl-9 pr-4 py-2 rounded-lg border border-outline-variant/40 bg-surface-container-lowest font-body text-sm text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/40"
                  />
                </div>
                <div className="flex gap-1 bg-surface-container rounded-xl p-1 border border-outline-variant/20 shrink-0">
                  {(['todos', 'confirmada', 'pendiente', 'cancelada'] as const).map(est => (
                    <button type="button"
                      key={est}
                      onClick={() => { setHistorialEstadoFilter(est); setHistorialPage(1) }}
                      className={`px-3 py-1.5 rounded-lg font-label text-xs font-medium capitalize transition-all ${
                        historialEstadoFilter === est
                          ? 'bg-primary text-on-primary shadow-sm'
                          : 'text-on-surface-variant hover:bg-surface-container-high'
                      }`}
                    >
                      {est === 'todos' ? 'Todos' : est}
                    </button>
                  ))}
                </div>
              </div>

              {/* List */}
              {loadingHistorialReservas ? (
                <div className="space-y-3">
                  {[0,1,2,3].map(i => (
                    <div key={i} className="h-20 bg-surface-container rounded-xl animate-pulse" />
                  ))}
                </div>
              ) : (() => {
                const q = historialSearch.toLowerCase()
                const filtered = reservasHistorial.filter(r => {
                  const matchSearch = !q || r.titulo.toLowerCase().includes(q) || (r.sala_nombre ?? '').toLowerCase().includes(q)
                  const matchEstado = historialEstadoFilter === 'todos' || r.estado === historialEstadoFilter
                  return matchSearch && matchEstado
                })
                const total = filtered.length
                const pages = Math.ceil(total / HISTORIAL_PAGE_SIZE)
                const page = filtered.slice((historialPage - 1) * HISTORIAL_PAGE_SIZE, historialPage * HISTORIAL_PAGE_SIZE)

                if (filtered.length === 0) return (
                  <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
                    <div className="size-14 rounded-full bg-surface-container flex items-center justify-center">
                      <span className="material-symbols-outlined text-on-surface-variant text-3xl">history</span>
                    </div>
                    <p className="font-body font-semibold text-on-surface text-sm">
                      {reservasHistorial.length === 0 ? 'No tienes reservas aún' : 'Sin resultados para esta búsqueda'}
                    </p>
                    <p className="font-body text-xs text-on-surface-variant">
                      {reservasHistorial.length === 0 ? 'Tus reservas pasadas y activas aparecerán aquí' : 'Prueba con otro término o filtro'}
                    </p>
                  </div>
                )

                return (
                  <div className="space-y-3">
                    {page.map(r => {
                      const { dateStr: todayStr } = getBogotaNow()
                      const isPast = r.fecha < todayStr
                      return (
                        <div
                          key={r.id}
                          className="bg-surface-container-lowest rounded-xl border border-outline-variant/20 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-outline-variant/40 hover:shadow-sm transition-all"
                        >
                          <div className="flex items-start gap-4">
                            <div className={`size-10 rounded-lg flex items-center justify-center shrink-0 ${
                              r.estado === 'cancelada' ? 'bg-red-100 text-red-500' :
                              isPast ? 'bg-surface-container text-on-surface-variant' :
                              'bg-primary/10 text-primary'
                            }`}>
                              <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                                {r.estado === 'cancelada' ? 'event_busy' : isPast ? 'event_available' : 'pending_actions'}
                              </span>
                            </div>
                            <div className="min-w-0">
                              <h4 className="font-headline font-semibold text-on-surface text-sm leading-snug truncate">{r.titulo}</h4>
                              {r.sala_nombre && (
                                <p className="font-body text-xs text-on-surface-variant mt-0.5">
                                  <span className="material-symbols-outlined text-[13px] align-middle mr-0.5">meeting_room</span>
                                  {r.sala_nombre}
                                  {r.sala_ubicacion ? ` · ${r.sala_ubicacion}` : ''}
                                </p>
                              )}
                              <p className="font-mono text-[11px] text-on-surface-variant mt-0.5">
                                {formatFecha(r.fecha)} · {formatHora(r.hora_inicio)}–{formatHora(r.hora_fin)}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3 shrink-0">
                            <span className={`px-2.5 py-1 rounded-full text-[11px] font-label font-bold uppercase tracking-wide ${
                              r.estado === 'confirmada' ? 'bg-emerald-100 text-emerald-700' :
                              r.estado === 'cancelada' ? 'bg-red-100 text-red-600' :
                              'bg-amber-100 text-amber-700'
                            }`}>
                              {r.estado}
                            </span>
                            {isPast && r.estado !== 'cancelada' && (
                              <span className="bg-surface-container text-on-surface-variant text-[10px] font-label font-medium px-2 py-0.5 rounded-full uppercase tracking-wide">
                                Pasada
                              </span>
                            )}
                          </div>
                        </div>
                      )
                    })}
                    {pages > 1 && (
                      <div className="flex items-center justify-between pt-2">
                        <span className="font-body text-xs text-on-surface-variant">
                          {total} reservas · página {historialPage} de {pages}
                        </span>
                        <div className="flex gap-2">
                          <button type="button"
                            onClick={() => setHistorialPage(p => Math.max(1, p - 1))}
                            disabled={historialPage === 1}
                            className="px-3 py-1.5 rounded-lg border border-outline-variant/40 font-label text-xs text-on-surface hover:bg-surface-container disabled:opacity-40 transition-all"
                          >Anterior</button>
                          <button type="button"
                            onClick={() => setHistorialPage(p => Math.min(pages, p + 1))}
                            disabled={historialPage === pages}
                            className="px-3 py-1.5 rounded-lg border border-outline-variant/40 font-label text-xs text-on-surface hover:bg-surface-container disabled:opacity-40 transition-all"
                          >Siguiente</button>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })()}
            </div>
          )}
            </>
          )}

          {/* ══ TAB: ROOMS ═════════════════════════════════════════ */}
          {activeTab === 'rooms' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {loadingSalas ? (
                [0,1,2,3].map((i) => <SkeletonRoomCard key={i} />)
              ) : salas.length === 0 ? (
                <div className="col-span-full flex flex-col items-center justify-center py-20 text-center gap-3">
                  <span className="material-symbols-outlined text-on-surface-variant text-4xl">meeting_room</span>
                  <p className="font-body font-semibold text-on-surface">No hay salas disponibles en este momento</p>
                </div>
              ) : (
                salas.map((sala, idx) => {
                  const disp = sala.disponibilidad ?? (sala.estado === 'mantenimiento' ? 'mantenimiento' : 'libre')
                  const badgeConfig = {
                    libre:         { bg: 'bg-green-500/20',  text: 'text-green-50',  border: 'border-green-500/30',  dot: 'bg-green-400 shadow-[0_0_8px_rgba(74,222,128,0.8)]',  label: 'Disponible' },
                    parcial:       { bg: 'bg-amber-500/20',  text: 'text-amber-50',  border: 'border-amber-500/30',  dot: 'bg-amber-400',                                          label: 'Parc. ocupada' },
                    ocupada_total: { bg: 'bg-red-500/20',    text: 'text-red-50',    border: 'border-red-500/30',    dot: 'bg-red-400',                                            label: 'Ocupada' },
                    mantenimiento: { bg: 'bg-yellow-500/20', text: 'text-yellow-50', border: 'border-yellow-500/30', dot: 'bg-yellow-400',                                         label: 'Mantenimiento' },
                  }[disp] ?? { bg: 'bg-surface/20', text: 'text-on-surface', border: 'border-outline/30', dot: 'bg-outline', label: sala.estado }

                  const HORA_APERTURA_MIN = 0          // 00:00 → 0 min
                  const HORA_CIERRE_MIN   = 24 * 60   // 24:00 → 1440 min
                  const jornada = HORA_CIERRE_MIN - HORA_APERTURA_MIN  // 1440 min

                  const toMin = (t: string) => {
                    const [h, m] = t.split(':').map(Number)
                    return h * 60 + m
                  }

                  return (
                  <div key={sala.id} className="bg-surface-container-lowest rounded-2xl overflow-hidden border border-outline-variant/15 card-lift group flex flex-col" data-anim>
                    <div className="relative h-48 overflow-hidden bg-surface-container">
                      <img 
                        src={sala.imagen_url || getRoomImage(idx)} 
                        alt={sala.nombre} 
                        className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-300" 
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-80" />
                      <div className="absolute bottom-4 left-4 right-4 flex justify-between items-end">
                        <span className={`inline-flex items-center gap-1.5 text-xs font-label font-bold px-2.5 py-1 rounded-md uppercase tracking-wider backdrop-blur-md ${badgeConfig.bg} ${badgeConfig.text} border ${badgeConfig.border}`}>
                          <span className={`size-1.5 rounded-full ${badgeConfig.dot}`} />
                          {badgeConfig.label}
                        </span>
                      </div>
                    </div>
                    
                    <div className="p-4 flex-1 flex flex-col">
                      <div>
                        <h4 className="font-headline font-semibold text-on-surface text-lg">{sala.nombre}</h4>
                        {sala.descripcion && (
                          <p className="font-body text-sm text-on-surface-variant mt-1.5 leading-relaxed line-clamp-2">{sala.descripcion}</p>
                        )}
                      </div>
                      
                      <div className="flex flex-wrap gap-4 mt-4 text-sm font-label text-secondary">
                        <span className="flex items-center gap-1.5 bg-surface-container px-2 py-1 rounded-md">
                          <span className="material-symbols-outlined text-[16px]">group</span>
                          {sala.capacidad} cap.
                        </span>
                        {sala.ubicacion && (
                          <span className="flex items-center gap-1.5 bg-surface-container px-2 py-1 rounded-md">
                            <span className="material-symbols-outlined text-[16px]">location_on</span>
                            {sala.ubicacion}
                          </span>
                        )}
                      </div>

                      {/* Barra visual de franjas horarias (disponibilidad real del día) */}
                      {disp !== 'mantenimiento' && (() => {
                        const { timeStr: nowTime } = getBogotaNow()
                        const nowMin = toMin(nowTime)
                        const nowPct = Math.max(0, Math.min(100,
                          ((nowMin - HORA_APERTURA_MIN) / jornada) * 100
                        ))
                        const showNow = nowMin >= HORA_APERTURA_MIN && nowMin <= HORA_CIERRE_MIN
                        return (
                          <div className="mt-4">
                            {/* Hour tick labels: every 6 h across full day (00 → 06 → 12 → 18) */}
                            <div className="relative h-3 mb-0.5">
                              {[0, 6, 12, 18].map(h => {
                                const pct = ((h * 60 - HORA_APERTURA_MIN) / jornada) * 100
                                return (
                                  <span
                                    key={h}
                                    className="absolute text-[9px] font-mono text-on-surface-variant/55 -translate-x-1/2"
                                    style={{ left: `${pct}%` }}
                                  >
                                    {String(h).padStart(2, '0')}h
                                  </span>
                                )
                              })}
                            </div>
                            {/* The bar */}
                            <div className="relative h-2.5 rounded-full bg-surface-container overflow-visible">
                              {/* Free base (green) */}
                              <div className="absolute inset-0 rounded-full bg-green-500/30 overflow-hidden" />
                              {/* Booked slots (red) */}
                              {(sala.franjas_reservadas ?? []).map((f, fi) => {
                                const startMin = Math.max(toMin(f.hora_inicio), HORA_APERTURA_MIN)
                                const endMin   = Math.min(toMin(f.hora_fin),    HORA_CIERRE_MIN)
                                if (endMin <= startMin) return null
                                const left  = ((startMin - HORA_APERTURA_MIN) / jornada) * 100
                                const width = ((endMin  - startMin)           / jornada) * 100
                                return (
                                  <div
                                    key={fi}
                                    title={`${f.hora_inicio}–${f.hora_fin}${f.titulo ? ': ' + f.titulo : ''}`}
                                    className="absolute top-0 h-full rounded-sm bg-red-400/75"
                                    style={{ left: `${left}%`, width: `${width}%` }}
                                  />
                                )
                              })}
                              {/* "Now" indicator */}
                              {showNow && (
                                <div
                                  className="absolute top-1/2 -translate-y-1/2 w-0.5 h-4 bg-primary rounded-full shadow-sm z-10"
                                  style={{ left: `${nowPct}%` }}
                                  title={`Ahora: ${nowTime}`}
                                />
                              )}
                            </div>
                            {/* Status text below bar */}
                            {disp === 'parcial' && sala.proxima_libre && (
                              <p className="text-[11px] font-label text-on-surface-variant mt-1">
                                Próxima libre: <span className="font-semibold text-green-600 dark:text-green-400">{sala.proxima_libre}</span>
                              </p>
                            )}
                            {disp === 'ocupada_total' && (
                              <p className="text-[11px] font-label text-red-500 mt-1">Sin disponibilidad hoy</p>
                            )}
                            {disp === 'libre' && (
                              <p className="text-[11px] font-label text-green-600 dark:text-green-400 mt-1">Libre todo el día</p>
                            )}
                          </div>
                        )
                      })()}
                      
                      <div className="mt-4 pt-4 border-t border-outline-variant/15 mt-auto">
                        <button type="button"
                          onClick={() => handleReservarRapido(sala)}
                          disabled={disp === 'mantenimiento'}
                          className="w-full border border-primary/40 text-primary font-label text-sm font-semibold py-3 rounded-xl hover:bg-primary hover:text-on-primary transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                          <>
                            <span className="material-symbols-outlined text-[18px]">calendar_add_on</span>
                            {disp === 'mantenimiento' ? 'En mantenimiento' : disp === 'libre' ? 'Reservar Sala' : 'Ver horarios / Reservar'}
                          </>
                        </button>
                      </div>
                    </div>
                  </div>
                  )
                })
              )}
            </div>
          )}

          {/* ══ TAB: TECH (EQUIPOS) ═════════════════════════════════════════ */}
          {activeTab === 'tech' && (() => {
            return (
              <div className="space-y-6">
                {/* ── Mis Préstamos Activos ──────────────────────────────────── */}
                {(loadingPrestamos || misPrestamos.length > 0) && (
                  <div className="bg-surface-container-lowest rounded-xl border border-outline-variant/20 shadow-sm overflow-hidden">
                    <div className="flex items-center gap-2 px-5 py-3.5 border-b border-outline-variant/15 bg-surface-container">
                      <span className="material-symbols-outlined text-primary text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>inventory_2</span>
                      <h3 className="font-label text-sm font-semibold text-on-surface">Mis Préstamos</h3>
                      {misPrestamos.length > 0 && (
                        <span className="ml-auto inline-flex items-center justify-center size-5 rounded-full bg-primary text-on-primary text-[10px] font-semibold">{misPrestamos.length}</span>
                      )}
                    </div>
                    {loadingPrestamos ? (
                      <div className="flex items-center justify-center gap-2 py-6 text-sm font-body text-on-surface-variant">
                        <span className="size-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                        Cargando préstamos…
                      </div>
                    ) : (
                      <div className="divide-y divide-outline-variant/10">
                        {misPrestamos.map(p => {
                          const finDate = new Date(p.fecha_fin_esperada)
                          const isOverdue = finDate < new Date(getBogotaNow().dateStr) && p.estado === 'activo'
                          const isPendienteRevision = p.estado === 'pendiente_revision'
                          const condicion = p.condicion_entrega ?? 'bueno'
                          return (
                            <div key={p.id} className="divide-y divide-outline-variant/10">
                              <div className={`flex items-start gap-3 px-5 py-4 ${isOverdue ? 'bg-red-50/30' : isPendienteRevision ? 'bg-orange-50/20' : ''}`}>
                                {/* Equipo imagen */}
                                <div className="shrink-0">
                                  {p.equipos?.imagen_url ? (
                                    <Image src={p.equipos.imagen_url} alt={p.equipos.nombre} width={44} height={44} className="rounded-lg object-cover border border-outline-variant/15" unoptimized />
                                  ) : (
                                    <div className="size-11 rounded-lg bg-surface-container flex items-center justify-center">
                                      <span className="material-symbols-outlined text-on-surface-variant text-[22px]">devices</span>
                                    </div>
                                  )}
                                </div>

                                {/* Info */}
                                <div className="flex-1 min-w-0">
                                  <div className="flex flex-wrap items-center gap-2 mb-1">
                                    <p className="font-body text-sm font-semibold text-on-surface truncate">{p.equipos?.nombre ?? 'N/A'}</p>
                                    {/* Acta badge */}
                                    {p.num_acta && (
                                      <span className="font-mono text-[10px] bg-surface-container text-on-surface-variant px-1.5 py-0.5 rounded border border-outline-variant/20">{p.num_acta}</span>
                                    )}
                                    {/* Condition badge */}
                                    <span className={`inline-flex items-center gap-0.5 text-[10px] font-label font-semibold px-1.5 py-0.5 rounded border ${CONDICION_COLOR[condicion]}`}>
                                      <span className="material-symbols-outlined text-[11px]" style={{ fontVariationSettings: "'FILL' 1" }}>{CONDICION_ICON[condicion]}</span>
                                      Entregado: {CONDICION_LABEL[condicion]}
                                    </span>
                                    {/* Overdue / novedad badges */}
                                    {isOverdue && (
                                      <span className="inline-flex items-center gap-0.5 text-[10px] font-label font-semibold px-1.5 py-0.5 rounded bg-red-100 text-red-700 border border-red-200">
                                        <span className="material-symbols-outlined text-[11px]">warning</span>Vencido
                                      </span>
                                    )}
                                    {isPendienteRevision && (
                                      <span className="inline-flex items-center gap-0.5 text-[10px] font-label font-semibold px-1.5 py-0.5 rounded bg-orange-100 text-orange-700 border border-orange-200">
                                        <span className="material-symbols-outlined text-[11px]" style={{ fontVariationSettings: "'FILL' 1" }}>manage_search</span>En revisión
                                      </span>
                                    )}
                                  </div>
                                  <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5">
                                    {isPendienteRevision ? (
                                      <span className="flex items-center gap-1 font-body text-xs text-orange-600">
                                        <span className="material-symbols-outlined text-[12px]">info</span>
                                        Equipo entregado · pendiente de revisión por el administrador
                                      </span>
                                    ) : (
                                      <span className={`flex items-center gap-1 font-body text-xs ${isOverdue ? 'text-red-500 font-semibold' : 'text-on-surface-variant'}`}>
                                        <span className="material-symbols-outlined text-[12px]">{isOverdue ? 'event_busy' : 'schedule'}</span>
                                        {isOverdue ? 'Venció el ' : 'Devolver antes de: '}
                                        {finDate.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'America/Bogota' })} · {finDate.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Bogota' })}
                                      </span>
                                    )}
                                    {p.salas && (
                                      <span className="flex items-center gap-1 font-body text-xs text-on-surface-variant">
                                        <span className="material-symbols-outlined text-[12px]">meeting_room</span>
                                        {p.salas.nombre}
                                      </span>
                                    )}
                                    {p.equipos?.marca && (
                                      <span className="font-body text-xs text-on-surface-variant">{p.equipos.marca} · {p.equipos.tipo_equipo}</span>
                                    )}
                                  </div>
                                </div>

                                {/* Actions */}
                                <div className="flex flex-col sm:flex-row items-end sm:items-center gap-2 shrink-0">
                                  {!isPendienteRevision && (
                                    <>
                                      <button type="button"
                                        onClick={() => {
                                          if (editandoPrestamoId === p.id) {
                                            setEditandoPrestamoId(null); setEditPrestamoError(null)
                                          } else {
                                            setEditandoPrestamoId(p.id); setEditPrestamoReservaId(p.reserva_id ?? ''); setEditPrestamoError(null)
                                          }
                                        }}
                                        className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-label font-semibold border transition-colors ${editandoPrestamoId === p.id ? 'bg-primary/10 text-primary border-primary/30' : 'bg-surface-container text-on-surface-variant border-outline-variant/20 hover:bg-blue-50 hover:text-blue-700'}`}
                                      >
                                        <span className="material-symbols-outlined text-[14px]">edit</span>
                                        Editar
                                      </button>
                                      <button type="button"
                                        onClick={() => handleAbrirDevolucion(p)}
                                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-on-primary text-xs font-label font-semibold hover:opacity-90 border border-primary/30 transition-all shadow-sm"
                                      >
                                        <span className="material-symbols-outlined text-[14px]">assignment_return</span>
                                        Devolver equipo
                                      </button>
                                    </>
                                  )}
                                  {isPendienteRevision && (
                                    <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-orange-50 text-orange-700 border border-orange-200 text-xs font-label font-semibold">
                                      <span className="material-symbols-outlined text-[14px]" style={{ fontVariationSettings: "'FILL' 1" }}>manage_search</span>
                                      En revisión
                                    </span>
                                  )}
                                </div>
                              </div>
                              {editandoPrestamoId === p.id && (
                                <div className="px-5 py-3 bg-surface-container/40 space-y-2.5">
                                  <p className="font-label text-xs text-on-surface-variant uppercase tracking-widest">Cambiar reserva vinculada</p>
                                  <select
                                    value={editPrestamoReservaId}
                                    onChange={e => setEditPrestamoReservaId(e.target.value)}
                                    disabled={savingEditPrestamo}
                                    className="w-full rounded-lg border border-outline-variant/40 bg-surface-container-lowest px-3 py-2 text-sm font-body text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition appearance-none"
                                  >
                                    <option value="">Selecciona una reserva</option>
                                    {reservas.filter(r => r.estado !== 'cancelada').map(r => (
                                      <option key={r.id} value={r.id}>{r.titulo} · {r.salas?.nombre ?? 'Sin sala'} · {r.fecha} {r.hora_inicio.slice(0,5)}–{r.hora_fin.slice(0,5)}</option>
                                    ))}
                                  </select>
                                  {editPrestamoError && (
                                    <p className="text-xs font-body text-error flex items-center gap-1">
                                      <span className="material-symbols-outlined text-[13px]">error</span>{editPrestamoError}
                                    </p>
                                  )}
                                  <div className="flex gap-2">
                                    <button type="button" onClick={handleEditarPrestamo} disabled={!editPrestamoReservaId || savingEditPrestamo} className="flex-1 py-2 rounded-lg bg-primary text-on-primary text-xs font-label font-semibold hover:opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed">
                                      {savingEditPrestamo ? 'Guardando…' : 'Guardar cambio'}
                                    </button>
                                    <button type="button" onClick={() => { setEditandoPrestamoId(null); setEditPrestamoError(null) }} className="px-4 py-2 rounded-lg border border-outline-variant/30 text-xs font-label text-on-surface-variant hover:bg-surface-container transition">
                                      Cancelar
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* Search + filter bar */}
                <div className="bg-surface-container-lowest rounded-xl border border-outline-variant/20 p-4 shadow-sm flex flex-col sm:flex-row gap-3">
                  <div className="relative flex-1">
                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-[18px]">search</span>
                    <input aria-label="Buscar equipos"
                      type="text"
                      value={techSearch}
                      onChange={e => setTechSearch(e.target.value)}
                      placeholder="Buscar por modelo, marca, tipo…"
                      className="w-full pl-9 pr-3 py-2 bg-surface-container-low border border-outline-variant/30 rounded-lg text-sm font-body text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/40"
                    />
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    {[
                      { value: '', label: 'Todos' },
                      { value: 'ordenador', label: 'Ordenadores' },
                      { value: 'movil', label: 'Móviles' },
                      { value: 'periferico', label: 'Periféricos' },
                      { value: 'mobiliario', label: 'Mobiliario' },
                      { value: 'climatizacion', label: 'Climatización' },
                    ].map(f => (
                      <button type="button"
                        key={f.value}
                        onClick={() => setTechFilter(f.value)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-label font-semibold border transition-colors ${
                          techFilter === f.value
                            ? 'bg-primary text-on-primary border-primary'
                            : 'bg-surface border-outline-variant/30 text-on-surface-variant hover:bg-surface-container'
                        }`}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>
                </div>

                {loadingEquipos ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[0,1,2,3,4,5].map(i => <SkeletonRoomCard key={i} />)}
                  </div>
                ) : filteredTech.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
                    <span className="material-symbols-outlined text-on-surface-variant text-4xl">devices_off</span>
                    <p className="font-body font-semibold text-on-surface text-sm">
                      {techSearch || techFilter ? 'Sin resultados para tu búsqueda' : 'No hay equipos disponibles'}
                    </p>
                    {(techSearch || techFilter) && (
                      <button type="button" onClick={() => { setTechSearch(''); setTechFilter('') }} className="font-label text-sm text-primary hover:underline">
                        Limpiar filtros
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredTech.map((item) => (
                      <div key={item.id} className="bg-surface-container-lowest rounded-2xl overflow-hidden border border-outline-variant/15 card-lift group flex flex-col" data-anim>
                        <div className="relative h-48 overflow-hidden bg-surface-container">
                          {item.imagen_url ? (
                            <img
                              src={item.imagen_url}
                              alt={item.nombre}
                              className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-300"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-surface-container-high">
                              <span className="material-symbols-outlined text-on-surface-variant text-6xl">devices</span>
                            </div>
                          )}
                          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-80" />
                          <div className="absolute bottom-4 left-4 right-4 flex justify-between items-end">
                            {(() => {
                              const retorno = equiposRetornos.get(item.id)
                              const estaEnUsoAhora = item.estado === 'reservado' && !!retorno
                              const estaReservadoFuturo = item.estado === 'reservado' && !retorno
                              return (
                                <span className={`inline-flex items-center gap-1.5 text-xs font-label font-bold px-2.5 py-1 rounded-md uppercase tracking-wider backdrop-blur-md ${
                                  item.estado === 'disponible'  ? 'bg-green-500/20 text-green-50 border border-green-500/30'  :
                                  estaEnUsoAhora               ? 'bg-blue-500/20 text-blue-50 border border-blue-500/30'     :
                                  estaReservadoFuturo          ? 'bg-sky-500/20 text-sky-100 border border-sky-400/30'       :
                                  'bg-orange-500/20 text-orange-50 border border-orange-500/30'
                                }`}>
                                  <span className={`size-1.5 rounded-full ${
                                    item.estado === 'disponible' ? 'bg-green-400 shadow-[0_0_8px_rgba(74,222,128,0.8)]' :
                                    estaEnUsoAhora               ? 'bg-blue-400' :
                                    estaReservadoFuturo          ? 'bg-sky-300' :
                                    'bg-orange-400'
                                  }`} />
                                  {item.estado === 'disponible' ? 'Disponible' :
                                   estaEnUsoAhora               ? 'En uso' :
                                   estaReservadoFuturo          ? 'Reservado' :
                                   'Mantenimiento'}
                                </span>
                              )
                            })()}
                          </div>
                        </div>

                        <div className="p-4 flex-1 flex flex-col">
                          <div>
                            <h4 className="font-headline font-semibold text-on-surface text-lg">{item.nombre}</h4>
                            <p className="font-label text-xs uppercase tracking-wider text-primary mt-1">{TIPO_EQUIPO_LABELS[item.tipo_equipo] ?? item.tipo_equipo} · {item.marca}</p>
                          </div>

                          <div className="flex flex-wrap gap-2 mt-3">
                            <span className="inline-flex items-center gap-1 bg-surface-container px-2 py-0.5 rounded text-xs font-label text-on-surface-variant capitalize">
                              <span className="material-symbols-outlined text-[14px]">computer</span>
                              {item.sistema_operativo}
                            </span>
                            <span className="inline-flex items-center gap-1 bg-surface-container px-2 py-0.5 rounded text-xs font-label text-on-surface-variant capitalize">
                              <span className="material-symbols-outlined text-[14px]">category</span>
                              {item.categoria}
                            </span>
                            {item.numero_serie && (
                              <span className="inline-flex items-center gap-1 bg-surface-container px-2 py-0.5 rounded text-xs font-mono text-primary">
                                <span className="material-symbols-outlined text-[12px]">tag</span>
                                {item.numero_serie}
                              </span>
                            )}
                          </div>

                          {/* Información de disponibilidad temporal */}
                          {item.estado === 'reservado' && (() => {
                            const retorno = equiposRetornos.get(item.id)
                            if (retorno) {
                              const retornoDate = new Date(retorno)
                              return (
                                <div className="mt-2 flex items-center gap-1.5 text-xs font-body text-blue-600 bg-blue-50 border border-blue-100 rounded-lg px-2.5 py-1.5">
                                  <span className="material-symbols-outlined text-[13px]" style={{ fontVariationSettings: "'FILL' 1" }}>schedule</span>
                                  Disponible aprox. {retornoDate.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', timeZone: 'America/Bogota' })} {retornoDate.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Bogota' })}
                                </div>
                              )
                            }
                            return (
                              <div className="mt-2 flex items-center gap-1.5 text-xs font-body text-sky-600 bg-sky-50 border border-sky-100 rounded-lg px-2.5 py-1.5">
                                <span className="material-symbols-outlined text-[13px]" style={{ fontVariationSettings: "'FILL' 1" }}>event_upcoming</span>
                                Reservado para una fecha futura
                              </div>
                            )
                          })()}

                          <div className="mt-6 pt-4 border-t border-outline-variant/15 mt-auto">
                            <button type="button"
                              onClick={() => handleSolicitarEquipo(item)}
                              disabled={item.estado !== 'disponible'}
                              className="w-full bg-surface-container-high text-on-surface font-label text-sm font-semibold py-3 rounded-xl hover:bg-secondary hover:text-on-secondary hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 disabled:opacity-40 disabled:hover:translate-y-0 disabled:shadow-none disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                              {item.estado === 'disponible' ? (
                                <>
                                  <span className="material-symbols-outlined text-[18px]">add_shopping_cart</span>
                                  Solicitar Equipo
                                </>
                              ) : item.estado === 'reservado' ? (
                                <>
                                  <span className="material-symbols-outlined text-[18px]">block</span>
                                  {equiposRetornos.has(item.id) ? 'En uso, no disponible' : 'Reservado, no disponible'}
                                </>
                              ) : 'En Mantenimiento'}
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })()}


          {/* ══ TAB: PROFILE ═══════════════════════════════════════ */}
          {activeTab === 'profile' && (
            <div className="max-w-lg space-y-6">
              {/* Avatar + nombre */}
              <div className="bg-surface-container-lowest rounded-xl p-6 border border-outline-variant/20 shadow-sm flex items-center gap-5">
                <div className="size-16 rounded-full bg-primary-container text-on-primary flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-3xl" style={{ fontVariationSettings: "'FILL' 1" }}>account_circle</span>
                </div>
                <div>
                  <h3 className="font-headline text-xl font-semibold text-on-surface">{profile?.nombre}</h3>
                  <span className={`inline-block mt-1 text-xs font-label font-bold px-2 py-0.5 rounded border uppercase tracking-wider ${
                    isAdmin ? 'bg-primary/10 text-primary border-primary/20' : 'bg-surface-container text-on-surface-variant border-outline-variant/30'
                  }`}>
                    {isAdmin ? 'Administrador' : 'Usuario'}
                  </span>
                </div>
              </div>

              {/* Datos de cuenta */}
              <div className="bg-surface-container-lowest rounded-xl border border-outline-variant/20 shadow-sm divide-y divide-outline-variant/15">
                <div className="px-6 py-4">
                  <p className="font-label text-[10px] uppercase tracking-widest text-on-surface-variant mb-1">Nombre</p>
                  <p className="font-body text-on-surface font-medium">{profile?.nombre}</p>
                </div>
                <div className="px-6 py-4">
                  <p className="font-label text-[10px] uppercase tracking-widest text-on-surface-variant mb-1">Rol del sistema</p>
                  <p className="font-body text-on-surface font-medium capitalize">{profile?.rol}</p>
                </div>
                <div className="px-6 py-4">
                  <p className="font-label text-[10px] uppercase tracking-widest text-on-surface-variant mb-1">Reservas activas</p>
                  <p className="font-body text-on-surface font-medium">{reservas.length} próxima{reservas.length !== 1 ? 's' : ''}</p>
                </div>
              </div>

              {/* Cerrar sesión desde perfil */}
              <button type="button"
                onClick={handleSignOut}
                className="w-full flex items-center justify-center gap-2 bg-error-container text-on-error-container py-3 rounded-lg hover:opacity-90 transition-opacity text-sm font-label font-medium"
              >
                <span className="material-symbols-outlined text-lg">logout</span>
                Cerrar Sesión
              </button>
            </div>
          )}

          {/* ══ TAB: ADMIN ════════════════════════════════════════════ */}
          {activeTab === 'admin' && (
            <div className="space-y-6">

              {/* Sub-tabs */}
              <div className="flex gap-2 border-b border-outline-variant/20 pb-0">
                <button type="button"
                  onClick={() => { setAdminSubTab('users'); loadUsuarios() }}
                  className={`px-5 py-2.5 text-sm font-label font-semibold rounded-t-lg border-b-2 transition-colors ${
                    adminSubTab === 'users'
                      ? 'border-primary text-primary'
                      : 'border-transparent text-on-surface-variant hover:text-on-surface'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[18px]">manage_accounts</span>
                    Usuarios
                  </span>
                </button>
                <button type="button"
                  onClick={() => { setAdminSubTab('equipment'); loadEquipos(); loadAlertasEquipos() }}
                  className={`px-5 py-2.5 text-sm font-label font-semibold rounded-t-lg border-b-2 transition-colors ${
                    adminSubTab === 'equipment'
                      ? 'border-primary text-primary'
                      : 'border-transparent text-on-surface-variant hover:text-on-surface'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[18px]">devices</span>
                    Equipos
                  </span>
                </button>
                <button type="button"
                  onClick={() => { setAdminSubTab('rooms'); loadSalasAdmin() }}
                  className={`px-5 py-2.5 text-sm font-label font-semibold rounded-t-lg border-b-2 transition-colors ${
                    adminSubTab === 'rooms'
                      ? 'border-primary text-primary'
                      : 'border-transparent text-on-surface-variant hover:text-on-surface'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[18px]">meeting_room</span>
                    Salas
                  </span>
                </button>
                <button type="button"
                  onClick={() => { setAdminSubTab('reports'); loadReports() }}
                  className={`px-5 py-2.5 text-sm font-label font-semibold rounded-t-lg border-b-2 transition-colors ${
                    adminSubTab === 'reports'
                      ? 'border-primary text-primary'
                      : 'border-transparent text-on-surface-variant hover:text-on-surface'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[18px]">analytics</span>
                    Reportes
                  </span>
                </button>
              </div>

              {/* ─── HU-06: Gestión de usuarios ─────────────────────── */}
              {adminSubTab === 'users' && (
                <div className="space-y-4">
                  {/* Botón registrar usuario */}
                  <div className="flex justify-end">
                    <button type="button"
                      onClick={() => { setShowUserForm(v => !v); setUserFormError(null); if (showUserForm) { setShowPassword(false); setShowConfirmPassword(false) } }}
                      className="inline-flex items-center gap-2 bg-primary text-on-primary px-5 py-2.5 rounded-lg font-label text-sm font-semibold hover:opacity-90 transition-opacity"
                    >
                      <span className="material-symbols-outlined text-[18px]">{showUserForm ? 'close' : 'person_add'}</span>
                      {showUserForm ? 'Cancelar' : 'Registrar Usuario'}
                    </button>
                  </div>

                  {/* Formulario registrar usuario */}
                  {showUserForm && (
                    <form onSubmit={handleCreateUser} className="bg-surface-container-lowest rounded-xl border border-outline-variant/20 p-5 space-y-4">
                      <h4 className="font-headline font-semibold text-on-surface mb-2">Nuevo Usuario</h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label htmlFor="field-mm-1" className="font-label text-xs uppercase tracking-widest text-on-surface-variant block mb-1.5">Nombre *</label>
                          <input aria-label="Nombre del usuario" id="field-mm-1" type="text" value={userForm.nombre} onChange={e => setUserForm(f => ({ ...f, nombre: e.target.value }))} placeholder="Nombre completo" className="w-full bg-surface-container-low border border-outline-variant/30 rounded-lg px-3 py-2 text-sm font-body text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/40" required />
                        </div>
                        <div>
                          <label htmlFor="field-mm-2" className="font-label text-xs uppercase tracking-widest text-on-surface-variant block mb-1.5">Correo *</label>
                          <input aria-label="Correo electrónico" id="field-mm-2" type="text" value={userForm.correo} onChange={e => setUserForm(f => ({ ...f, correo: e.target.value }))} placeholder="correo@ejemplo.com" className="w-full bg-surface-container-low border border-outline-variant/30 rounded-lg px-3 py-2 text-sm font-body text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/40" />
                        </div>
                        <div>
                          <label htmlFor="field-mm-3" className="font-label text-xs uppercase tracking-widest text-on-surface-variant block mb-1.5">Contraseña *</label>
                          <div className="relative flex items-center">
                            <input aria-label="Contraseña" id="field-mm-3" type={showPassword ? "text" : "password"} value={userForm.password} onChange={e => setUserForm(f => ({ ...f, password: e.target.value }))} placeholder="Mín. 8 caracteres" className="w-full bg-surface-container-low border border-outline-variant/30 rounded-lg px-3 py-2 pr-10 text-sm font-body text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/40" required />
                            <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 text-on-surface-variant hover:text-on-surface transition-colors">
                              <span className="material-symbols-outlined text-[20px]">{showPassword ? 'visibility_off' : 'visibility'}</span>
                            </button>
                          </div>
                          {userForm.password && <AdminPasswordRequirements password={userForm.password} />}
                        </div>
                        <div>
                          <label htmlFor="field-mm-4" className="font-label text-xs uppercase tracking-widest text-on-surface-variant block mb-1.5">Confirmar Contraseña *</label>
                          <div className="relative flex items-center">
                            <input aria-label="Confirmar contraseña" id="field-mm-4" type={showConfirmPassword ? "text" : "password"} value={userForm.confirmPassword} onChange={e => setUserForm(f => ({ ...f, confirmPassword: e.target.value }))} placeholder="Repite la contraseña" className="w-full bg-surface-container-low border border-outline-variant/30 rounded-lg px-3 py-2 pr-10 text-sm font-body text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/40" required />
                            <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-3 text-on-surface-variant hover:text-on-surface transition-colors">
                              <span className="material-symbols-outlined text-[20px]">{showConfirmPassword ? 'visibility_off' : 'visibility'}</span>
                            </button>
                          </div>
                        </div>
                        <div>
                          <label htmlFor="field-mm-5" className="font-label text-xs uppercase tracking-widest text-on-surface-variant block mb-1.5">Rol</label>
                          <select id="field-mm-5" value={userForm.rol} onChange={e => setUserForm(f => ({ ...f, rol: e.target.value as 'usuario' | 'admin' }))} className="w-full bg-surface-container-low border border-outline-variant/30 rounded-lg px-3 py-2 text-sm font-body text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/40">
                            <option value="usuario">Usuario</option>
                            <option value="admin">Admin</option>
                          </select>
                        </div>
                      </div>
                      {userFormError && (
                        <p className="text-sm text-red-600 font-body flex items-center gap-1.5">
                          <span className="material-symbols-outlined text-[16px]">error</span>
                          {userFormError}
                        </p>
                      )}
                      <div className="flex justify-end">
                        <button type="submit" disabled={addingUser} className="inline-flex items-center gap-2 bg-primary text-on-primary px-5 py-2 rounded-lg font-label text-sm font-semibold disabled:opacity-60">
                          {addingUser ? <><span className="size-4 animate-spin rounded-full border-2 border-on-primary border-t-transparent" /> Creando…</> : <><span className="material-symbols-outlined text-[18px]">save</span> Crear Usuario</>}
                        </button>
                      </div>
                    </form>
                  )}

                  {/* Tabla usuarios */}
                  <div className="space-y-4">
                    {/* Filtro Ver solo activos */}
                    <div className="flex items-center gap-2 px-4 py-3 bg-surface-container-low rounded-lg border border-outline-variant/20">
                      <input aria-label="Ver solo activos"
                        type="checkbox"
                        id="showOnlyActivos"
                        checked={showOnlyActivos}
                        onChange={e => setShowOnlyActivos(e.target.checked)}
                        className="size-4 rounded cursor-pointer accent-primary"
                      />
                      <label htmlFor="showOnlyActivos" className="font-body text-sm text-on-surface cursor-pointer">
                        Ver solo activos
                      </label>
                    </div>

                    {/* Tabla usuarios */}
                    <div className="bg-surface-container-lowest rounded-xl border border-outline-variant/20 shadow-sm overflow-hidden">
                    {loadingUsuarios ? (
                      <div className="flex items-center justify-center py-16 gap-3">
                        <span className="size-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                        <span className="font-body text-sm text-on-surface-variant">Cargando usuarios…</span>
                      </div>
                    ) : usuarios.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
                        <span className="material-symbols-outlined text-on-surface-variant text-4xl">group_off</span>
                        <p className="font-body text-sm text-on-surface-variant">No se encontraron usuarios.</p>
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead className="bg-surface-container border-b border-outline-variant/20">
                            <tr>
                              <th className="text-left font-label text-xs uppercase tracking-widest text-on-surface-variant px-6 py-3">Nombre</th>
                              <th className="text-left font-label text-xs uppercase tracking-widest text-on-surface-variant px-6 py-3">Correo</th>
                              <th className="text-left font-label text-xs uppercase tracking-widest text-on-surface-variant px-6 py-3">Rol</th>
                              <th className="text-left font-label text-xs uppercase tracking-widest text-on-surface-variant px-6 py-3">Estado</th>
                              <th className="text-left font-label text-xs uppercase tracking-widest text-on-surface-variant px-6 py-3">Acciones</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-outline-variant/10">
                            {usuarios.filter(u => showOnlyActivos ? u.activo !== false : true).map((u) => (
                              <tr key={u.id} className={`transition-colors ${u.activo === false ? 'bg-red-50/60' : 'even:bg-surface-container-lowest/50 hover:bg-surface-container/50'}`}>
                                <td className={`px-6 py-4 font-body font-medium ${u.activo === false ? 'text-red-500 line-through decoration-red-400' : 'text-on-surface'}`}>
                                  {editingUserId === u.id ? (
                                    <input aria-label="Editar nombre de usuario"
                                      type="text"
                                      value={editNombreValue}
                                      onChange={e => { setEditNombreValue(e.target.value); setEditUserError(null) }}
                                      className="bg-surface-container-low border border-primary/40 rounded-lg px-2 py-1 text-xs font-body text-on-surface focus:outline-none focus:ring-1 focus:ring-primary w-36"
                                      placeholder="Nombre completo"
                                    />
                                  ) : u.nombre}
                                </td>
                                <td className="px-6 py-4 font-body text-on-surface-variant">
                                  {editingUserId === u.id ? (
                                    <div className="flex flex-col gap-1">
                                      <div className="flex items-center gap-2">
                                        <input aria-label="Editar correo electrónico" type="email" value={editEmailValue} onChange={e => { setEditEmailValue(e.target.value); setEditUserError(null) }} className="bg-surface-container-low border border-primary/40 rounded-lg px-2 py-1 text-xs font-body text-on-surface focus:outline-none focus:ring-1 focus:ring-primary w-44" placeholder="correo@ejemplo.com" />
                                        <button type="button" onClick={() => handleSaveEmail(u.id)} disabled={savingEmail} className="p-1 rounded hover:bg-green-100 text-green-600 disabled:opacity-50">
                                          {savingEmail ? <span className="h-3 w-3 animate-spin rounded-full border border-green-600 border-t-transparent inline-block" /> : <span className="material-symbols-outlined text-[16px]">check</span>}
                                        </button>
                                        <button type="button" onClick={() => { setEditingUserId(null); setEditUserError(null) }} className="p-1 rounded hover:bg-red-50 text-red-500">
                                          <span className="material-symbols-outlined text-[16px]">close</span>
                                        </button>
                                      </div>
                                      {editUserError && (
                                        <span className="text-xs text-red-500 font-body">{editUserError}</span>
                                      )}
                                    </div>
                                  ) : u.correo}
                                </td>
                                <td className="px-6 py-4">
                                  <select
                                    value={['admin','administrador','administrator'].includes(u.rol) ? 'admin' : 'usuario'}
                                    onChange={(e) => handleRoleChange(u.id, e.target.value as 'usuario' | 'admin')}
                                    disabled={updatingRole === u.id || u.activo === false}
                                    className="bg-surface-container-low border border-outline-variant/30 rounded-lg px-3 py-1.5 text-xs font-body text-on-surface focus:outline-none disabled:opacity-50"
                                  >
                                    <option value="usuario">Usuario</option>
                                    <option value="admin">Admin</option>
                                  </select>
                                </td>
                                <td className="px-6 py-4">
                                  {u.activo === false ? (
                                    <span className="inline-flex items-center gap-1 text-xs font-label font-semibold px-2 py-0.5 rounded bg-red-100 text-red-600">
                                      <span className="size-1.5 rounded-full bg-red-500" />Eliminado
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 text-xs font-label font-semibold px-2 py-0.5 rounded bg-green-100 text-green-700">
                                      <span className="size-1.5 rounded-full bg-green-500" />Activo
                                    </span>
                                  )}
                                </td>
                                <td className="px-6 py-4">
                                  <div className="flex items-center gap-1">
                                    {editingUserId !== u.id && (
                                      <button type="button" onClick={() => { setEditingUserId(u.id); setEditEmailValue(u.correo); setEditNombreValue(u.nombre) }} title="Editar usuario" className="p-1.5 rounded-lg text-on-surface-variant hover:bg-surface-container transition-colors">
                                        <span className="material-symbols-outlined text-[16px]">edit</span>
                                      </button>
                                    )}
                                    <button type="button"
                                      onClick={() => handleResetPassword(u.correo, u.id)}
                                      disabled={resetingPwd === u.id || u.activo === false}
                                      title="Enviar reset de contraseña"
                                      className="p-1.5 rounded-lg text-on-surface-variant hover:bg-surface-container transition-colors disabled:opacity-40"
                                    >
                                      {pwdResetSuccess === u.id ? <span className="material-symbols-outlined text-[16px] text-green-600">check_circle</span>
                                        : resetingPwd === u.id ? <span className="size-4 animate-spin rounded-full border-2 border-primary border-t-transparent inline-block" />
                                        : <span className="material-symbols-outlined text-[16px]">lock_reset</span>}
                                    </button>
                                    <button type="button"
                                      onClick={() => handleToggleActivo(u.id, u.activo === false)}
                                      disabled={togglingActivo === u.id}
                                      title={u.activo === false ? 'Reactivar usuario' : 'Desactivar usuario'}
                                      className={`p-1.5 rounded-lg transition-colors disabled:opacity-40 ${u.activo === false ? 'text-green-600 hover:bg-green-50' : 'text-red-500 hover:bg-red-50'}`}
                                    >
                                      {togglingActivo === u.id
                                        ? <span className="size-4 animate-spin rounded-full border-2 border-primary border-t-transparent inline-block" />
                                        : <span className="material-symbols-outlined text-[16px]">{u.activo === false ? 'person_check' : 'person_off'}</span>}
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                    </div>
                  </div>
                </div>
              )}

              {/* ─── HU-07: Gestión de equipos ──────────────────────── */}
              {adminSubTab === 'equipment' && (() => {
                const filteredEquipos = equipos.filter(eq =>
                  equipoSearch.trim() === '' ||
                  eq.nombre.toLowerCase().includes(equipoSearch.toLowerCase()) ||
                  eq.marca.toLowerCase().includes(equipoSearch.toLowerCase()) ||
                  eq.tipo_equipo.toLowerCase().includes(equipoSearch.toLowerCase()) ||
                  eq.categoria.toLowerCase().includes(equipoSearch.toLowerCase())
                )
                const totalEquipos       = equipos.length
                const disponiblesCount   = equipos.filter(e => e.estado === 'disponible').length
                const reservadosCount    = equipos.filter(e => e.estado === 'reservado').length
                const mantenimientoCount = equipos.filter(e => e.estado === 'mantenimiento').length

                return (
                  <div className="space-y-6">

                    {/* KPI Cards */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                      <div className="bg-surface-container-lowest rounded-xl p-4 border border-outline-variant/20 shadow-sm flex flex-col justify-between">
                        <div className="flex justify-between items-start">
                          <span className="font-label text-xs uppercase tracking-widest text-on-surface-variant">Total Equipos</span>
                          <span className="material-symbols-outlined text-primary bg-primary/10 p-1.5 rounded-lg text-[18px]">devices</span>
                        </div>
                        <div className="mt-3">
                          <span className="font-headline text-3xl font-semibold text-on-surface">{totalEquipos}</span>
                        </div>
                      </div>
                      <div className="bg-surface-container-lowest rounded-xl p-4 border border-outline-variant/20 shadow-sm flex flex-col justify-between">
                        <div className="flex justify-between items-start">
                          <span className="font-label text-xs uppercase tracking-widest text-on-surface-variant">Disponibles</span>
                          <span className="material-symbols-outlined text-green-600 bg-green-50 p-1.5 rounded-lg text-[18px]">check_circle</span>
                        </div>
                        <div className="mt-3">
                          <span className="font-headline text-3xl font-semibold text-on-surface">{disponiblesCount}</span>
                          <p className="font-label text-[11px] text-on-surface-variant mt-0.5">
                            {totalEquipos > 0 ? Math.round((disponiblesCount / totalEquipos) * 100) : 0}% del inventario
                          </p>
                        </div>
                      </div>
                      <div className="bg-surface-container-lowest rounded-xl p-4 border border-outline-variant/20 shadow-sm flex flex-col justify-between">
                        <div className="flex justify-between items-start">
                          <span className="font-label text-xs uppercase tracking-widest text-on-surface-variant">Reservados</span>
                          <span className="material-symbols-outlined text-primary bg-primary/10 p-1.5 rounded-lg text-[18px]">event_available</span>
                        </div>
                        <div className="mt-3">
                          <span className="font-headline text-3xl font-semibold text-on-surface">{reservadosCount}</span>
                        </div>
                      </div>
                      <div className="bg-surface-container-lowest rounded-xl p-4 border border-outline-variant/20 shadow-sm flex flex-col justify-between">
                        <div className="flex justify-between items-start">
                          <span className="font-label text-xs uppercase tracking-widest text-on-surface-variant">Mantenimiento</span>
                          <span className="material-symbols-outlined text-orange-500 bg-orange-50 p-1.5 rounded-lg text-[18px]">build</span>
                        </div>
                        <div className="mt-3">
                          <span className="font-headline text-3xl font-semibold text-on-surface">{mantenimientoCount}</span>
                          {mantenimientoCount > 0 && (
                            <p className="font-label text-[11px] text-orange-500 flex items-center gap-0.5 mt-0.5">
                              <span className="material-symbols-outlined text-[12px]">warning</span>
                              Requiere atención
                            </p>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Toolbar: search + register button */}
                    <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
                      <div className="relative w-full sm:max-w-xs">
                        <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-[18px]">search</span>
                        <input aria-label="Buscar usuario"
                          type="text"
                          value={equipoSearch}
                          onChange={e => setEquipoSearch(e.target.value)}
                          placeholder="Buscar por nombre, marca, tipo…"
                          className="w-full pl-9 pr-3 py-2 bg-surface-container-low border border-outline-variant/30 rounded-lg text-sm font-body text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/40"
                        />
                      </div>
                      <button type="button"
                        onClick={() => { setShowEquipoForm(v => !v); setEquipoFormStage('form') }}
                        className="inline-flex items-center gap-2 bg-primary text-on-primary px-5 py-2.5 rounded-lg font-label text-sm font-medium hover:bg-primary-container transition-colors shrink-0"
                      >
                        <span className="material-symbols-outlined text-[18px]">{showEquipoForm ? 'close' : 'add'}</span>
                        {showEquipoForm ? 'Cancelar' : 'Registrar Equipo'}
                      </button>
                    </div>

                    {/* Registration form — 3 stages */}
                    {showEquipoForm && (
                      <div className="bg-surface-container-lowest rounded-xl border border-outline-variant/20 shadow-sm overflow-hidden">

                        {/* Stage: processing */}
                        {equipoFormStage === 'processing' && (
                          <div className="flex flex-col items-center justify-center py-16 gap-4">
                            <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                            <p className="font-headline font-semibold text-on-surface text-lg">Registrando equipo…</p>
                            <p className="font-body text-sm text-on-surface-variant">Procesando los datos del nuevo activo.</p>
                          </div>
                        )}

                        {/* Stage: success */}
                        {equipoFormStage === 'success' && (
                          <div className="flex flex-col items-center justify-center py-16 gap-4 text-center">
                            <div className="bg-primary/10 text-primary rounded-full size-16 flex items-center justify-center">
                              <span className="material-symbols-outlined text-4xl" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                            </div>
                            <div>  <p className="font-headline font-semibold text-on-surface text-xl">¡Equipo{equipoCantidad > 1 ? `s` : ''} Registrado{equipoCantidad > 1 ? `s` : ''}!</p>
                              <p className="font-body text-sm text-on-surface-variant mt-1">{equipoCantidad > 1 ? `${equipoCantidad} unidades han sido añadidas` : 'El nuevo equipo ha sido añadido'} al inventario con códigos de activo únicos.</p>
                            </div>
                          </div>
                        )}

                        {/* Stage: form */}
                        {equipoFormStage === 'form' && (
                          <form onSubmit={handleAddEquipo} className="p-5">
                            <h4 className="font-headline font-semibold text-on-surface mb-4 flex items-center gap-2">
                              <span className="material-symbols-outlined text-primary text-[20px]">add_box</span>
                              Registrar Nuevo Equipo
                            </h4>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">

                              {/* Nombre */}
                              <div className="sm:col-span-2 lg:col-span-3">
                                <label htmlFor="field-mm-6" className="font-label text-xs uppercase tracking-widest text-on-surface-variant block mb-1.5">Nombre / Modelo *</label>
                                <input aria-label="Nombre del equipo" id="field-mm-6"
                                  type="text"
                                  value={equipoForm.nombre}
                                  onChange={(e) => setEquipoField('nombre', e.target.value)}
                                  placeholder="Ej: Dell Latitude 5520 #3"
                                  className="w-full bg-surface-container-low border border-outline-variant/30 rounded-lg px-3 py-2 text-sm font-body text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/40"
                                  required
                                />
                              </div>

                              {/* Categoría */}
                              <div>
                                <label htmlFor="field-mm-7" className="font-label text-xs uppercase tracking-widest text-on-surface-variant block mb-1.5">Categoría *</label>
                                <select id="field-mm-7"
                                  value={equipoForm.categoria}
                                  onChange={(e) => setEquipoField('categoria', e.target.value)}
                                  className="w-full bg-surface-container-low border border-outline-variant/30 rounded-lg px-3 py-2 text-sm font-body text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/40"
                                  required
                                >
                                  <option value="">Selecciona categoría</option>
                                  {Object.entries(CATEGORIA_LABELS).map(([val, lbl]) => (
                                    <option key={val} value={val}>{lbl}</option>
                                  ))}
                                </select>
                              </div>

                              {/* Sistema Operativo - solo para categorías tech */}
                              {isTechCategory(equipoForm.categoria) && (
                              <div>
                                <label className={`font-label text-xs uppercase tracking-widest block mb-1.5 ${equipoForm.categoria ? 'text-on-surface-variant' : 'text-on-surface-variant/40'}`}>
                                  Sistema Operativo *
                                </label>
                                <select
                                  value={equipoForm.sistema_operativo}
                                  onChange={(e) => setEquipoField('sistema_operativo', e.target.value)}
                                  disabled={!equipoForm.categoria}
                                  className="w-full bg-surface-container-low border border-outline-variant/30 rounded-lg px-3 py-2 text-sm font-body text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/40 disabled:opacity-40 disabled:cursor-not-allowed"
                                  required
                                >
                                  <option value="">Selecciona SO</option>
                                  {getSistemas(equipoForm.categoria).map(o => (
                                    <option key={o.value} value={o.value}>{o.label}</option>
                                  ))}
                                </select>
                              </div>
                              )}

                              {/* Marca */}
                              <div>
                                <label className={`font-label text-xs uppercase tracking-widest block mb-1.5 ${isTechCategory(equipoForm.categoria) ? (equipoForm.sistema_operativo ? 'text-on-surface-variant' : 'text-on-surface-variant/40') : (equipoForm.categoria ? 'text-on-surface-variant' : 'text-on-surface-variant/40')}`}>
                                  Marca *
                                </label>
                                {isTechCategory(equipoForm.categoria) ? (
                                  <select
                                    value={equipoForm.marca}
                                    onChange={(e) => setEquipoField('marca', e.target.value)}
                                    disabled={!equipoForm.sistema_operativo}
                                    className="w-full bg-surface-container-low border border-outline-variant/30 rounded-lg px-3 py-2 text-sm font-body text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/40 disabled:opacity-40 disabled:cursor-not-allowed"
                                    required
                                  >
                                    <option value="">Selecciona marca</option>
                                    {getMarcas(equipoForm.categoria, equipoForm.sistema_operativo).map(o => (
                                      <option key={o.value} value={o.value}>{o.label}</option>
                                    ))}
                                  </select>
                                ) : (
                                  <input aria-label="Categoría del equipo"
                                    type="text"
                                    value={equipoForm.marca}
                                    onChange={(e) => setEquipoField('marca', e.target.value)}
                                    disabled={!equipoForm.categoria}
                                    placeholder="Ej: Samsung, Genérica…"
                                    className="w-full bg-surface-container-low border border-outline-variant/30 rounded-lg px-3 py-2 text-sm font-body text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/40 disabled:opacity-40 disabled:cursor-not-allowed"
                                    required
                                  />
                                )}
                              </div>

                              {/* Tipo de equipo */}
                              <div>
                                <label className={`font-label text-xs uppercase tracking-widest block mb-1.5 ${(isTechCategory(equipoForm.categoria) ? equipoForm.marca : equipoForm.categoria) ? 'text-on-surface-variant' : 'text-on-surface-variant/40'}`}>
                                  Tipo de Equipo *
                                </label>
                                <select
                                  value={equipoForm.tipo_equipo}
                                  onChange={(e) => setEquipoField('tipo_equipo', e.target.value)}
                                  disabled={isTechCategory(equipoForm.categoria) ? !equipoForm.marca : !equipoForm.categoria}
                                  className="w-full bg-surface-container-low border border-outline-variant/30 rounded-lg px-3 py-2 text-sm font-body text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/40 disabled:opacity-40 disabled:cursor-not-allowed"
                                  required
                                >
                                  <option value="">Selecciona tipo</option>
                                  {isTechCategory(equipoForm.categoria)
                                    ? getTipos(equipoForm.categoria, equipoForm.sistema_operativo, equipoForm.marca).map(o => (
                                        <option key={o.value} value={o.value}>{o.label}</option>
                                      ))
                                    : getTiposDirectos(equipoForm.categoria).map(o => (
                                        <option key={o.value} value={o.value}>{o.label}</option>
                                      ))
                                  }
                                </select>
                              </div>

                              {/* Estado inicial */}
                              <div>
                                <label className="font-label text-xs uppercase tracking-widest text-on-surface-variant block mb-1.5">Estado Inicial</label>
                                <div className="flex items-center gap-3 bg-surface-container-low border border-outline-variant/30 rounded-lg px-3 py-2">
                                  <span className={`inline-flex items-center gap-1 text-xs font-label font-bold px-2 py-0.5 rounded ${
                                    equipoForm.estado === 'disponible' ? 'bg-green-100 text-green-700' :
                                    equipoForm.estado === 'reservado'  ? 'bg-primary/10 text-primary' :
                                    'bg-orange-100 text-orange-700'
                                  }`}>
                                    <span className={`size-1.5 rounded-full ${
                                      equipoForm.estado === 'disponible' ? 'bg-green-500' :
                                      equipoForm.estado === 'reservado'  ? 'bg-primary' :
                                      'bg-orange-500'
                                    }`} />
                                    {equipoForm.estado === 'disponible' ? 'Disponible' : equipoForm.estado === 'reservado' ? 'Reservado' : 'Mantenimiento'}
                                  </span>
                                  <select
                                    value={equipoForm.estado}
                                    onChange={(e) => setEquipoField('estado', e.target.value)}
                                    className="flex-1 bg-transparent text-sm font-body text-on-surface focus:outline-none"
                                  >
                                    <option value="disponible">Disponible</option>
                                    <option value="reservado">Reservado</option>
                                    <option value="mantenimiento">Mantenimiento</option>
                                  </select>
                                </div>
                              </div>

                              {/* Cantidad de unidades */}
                              <div className="sm:col-span-2 lg:col-span-3">
                                <label htmlFor="field-mm-8" className="font-label text-xs uppercase tracking-widest text-on-surface-variant block mb-1.5">Cantidad de unidades</label>
                                <input aria-label="Descripción del equipo" id="field-mm-8"
                                  type="number"
                                  min={1}
                                  max={20}
                                  value={equipoCantidad}
                                  onChange={(e) => {
                                    const n = Math.max(1, Math.min(20, parseInt(e.target.value) || 1))
                                    setEquipoCantidad(n)
                                    setEquipoSeriales(prev => {
                                      const next = [...prev]
                                      while (next.length < n) next.push('')
                                      return next.slice(0, n)
                                    })
                                  }}
                                  className="w-full bg-surface-container-low border border-outline-variant/30 rounded-lg px-3 py-2 text-sm font-body text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/40"
                                />
                              </div>

                              {/* Números de serie por unidad */}
                              <div className="sm:col-span-2 lg:col-span-3">
                                <div className="flex items-center gap-2 mb-2">
                                  <span className="material-symbols-outlined text-primary text-[16px]">tag</span>
                                  <label className="font-label text-xs uppercase tracking-widest text-on-surface-variant">
                                    {equipoCantidad === 1 ? 'Número de serie / IMEI *' : `Números de serie / IMEI * (${equipoCantidad} unidades)`}
                                  </label>
                                </div>
                                <div className="space-y-2">
                                  {Array.from({ length: equipoCantidad }).map((_, i) => {
                                    const val = equipoSeriales[i] ?? ''
                                    const isDuplicate = val.trim().length >= 4 &&
                                      equipoSeriales.some((s, j) => j !== i && s.trim() === val.trim())
                                    return (
                                      <div key={i} className="flex items-center gap-2">
                                        {equipoCantidad > 1 && (
                                          <span className="shrink-0 size-6 rounded-full bg-surface-container flex items-center justify-center text-[10px] font-label font-semibold text-on-surface-variant">{i + 1}</span>
                                        )}
                                        <div className="relative flex-1">
                                          <input aria-label="Número de serie"
                                            type="text"
                                            value={val}
                                            onChange={ev => {
                                              const next = [...equipoSeriales]
                                              next[i] = ev.target.value
                                              setEquipoSeriales(next)
                                            }}
                                            placeholder={equipoForm.categoria === 'movil' ? 'IMEI: 123456789012345' : 'S/N: A1B2C3D4E5'}
                                            maxLength={30}
                                            className={`w-full bg-surface-container-low border rounded-lg px-3 py-2 text-sm font-mono text-on-surface placeholder:font-body placeholder:text-on-surface-variant/50 focus:outline-none focus:ring-2 transition ${
                                              isDuplicate
                                                ? 'border-red-400 focus:ring-red-300/40'
                                                : val.trim().length > 0 && val.trim().length < 4
                                                ? 'border-amber-400 focus:ring-amber-300/40'
                                                : val.trim().length >= 4
                                                ? 'border-green-400 focus:ring-green-300/40'
                                                : 'border-outline-variant/30 focus:ring-primary/40'
                                            }`}
                                            required
                                          />
                                          {val.trim().length >= 4 && !isDuplicate && (
                                            <span className="absolute right-2.5 top-1/2 -translate-y-1/2 material-symbols-outlined text-green-500 text-[16px]" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                                          )}
                                          {isDuplicate && (
                                            <span className="absolute right-2.5 top-1/2 -translate-y-1/2 material-symbols-outlined text-red-500 text-[16px]">error</span>
                                          )}
                                        </div>
                                        {isDuplicate && (
                                          <p className="text-[10px] text-red-500 font-body">Duplicado</p>
                                        )}
                                      </div>
                                    )
                                  })}
                                </div>
                                <p className="mt-1.5 text-xs font-body text-on-surface-variant flex items-center gap-1">
                                  <span className="material-symbols-outlined text-[13px]">info</span>
                                  {equipoForm.categoria === 'movil' ? 'Para móviles usa el IMEI (15 dígitos). Lo encuentras en *#06#.' : isTechCategory(equipoForm.categoria) ? 'Usa el número de serie del fabricante (etiqueta inferior del equipo).' : 'Usa un código interno o número de serie si el equipo lo tiene.'}
                                </p>
                              </div>

                              {/* Imagen */}
                              <div className="sm:col-span-2">
                                <label htmlFor="field-mm-9" className="font-label text-xs uppercase tracking-widest text-on-surface-variant block mb-1.5">Imagen</label>
                                <div className="flex items-center gap-3">
                                  {equipoImageFile && (
                                    <img src={URL.createObjectURL(equipoImageFile)} alt="preview" className="size-12 rounded-lg object-cover border border-outline-variant/20 shrink-0" />
                                  )}
                                  <label htmlFor="field-mm-10" className="flex items-center gap-2 px-3 py-2 rounded-lg border border-dashed border-outline-variant/50 cursor-pointer hover:border-primary/60 transition-colors text-sm font-body text-on-surface-variant w-full">
                                    <span className="material-symbols-outlined text-[18px]">upload</span>
                                    <span className="truncate">{equipoImageFile ? equipoImageFile.name : 'Seleccionar imagen…'}</span>
                                    <input aria-label="Imagen del equipo" id="field-mm-10" type="file" accept="image/*" className="hidden" onChange={e => setEquipoImageFile(e.target.files?.[0] ?? null)} />
                                  </label>
                                  {equipoImageFile && (
                                    <button type="button" onClick={() => setEquipoImageFile(null)} className="p-1 rounded text-red-400 hover:bg-red-50 shrink-0">
                                      <span className="material-symbols-outlined text-[16px]">close</span>
                                    </button>
                                  )}
                                </div>
                              </div>
                            </div>

                            <div className="mt-5 flex items-center justify-end gap-3 pt-4 border-t border-outline-variant/15">
                              <button
                                type="button"
                                onClick={() => { setShowEquipoForm(false); setEquipoFormStage('form'); setEquipoImageFile(null); setEquipoSeriales(['']); setEquipoCantidad(1) }}
                                className="px-4 py-2 rounded-lg border border-outline-variant/30 text-sm font-label font-medium text-on-surface hover:bg-surface-container transition-colors"
                              >
                                Cancelar
                              </button>
                              <button
                                type="submit"
                                disabled={addingEquipo}
                                className="inline-flex items-center gap-2 bg-primary text-on-primary px-5 py-2 rounded-lg font-label text-sm font-medium hover:bg-primary-container disabled:opacity-60 transition-colors"
                              >
                                <span className="material-symbols-outlined text-[18px]">save</span>
                                Registrar Equipo
                              </button>
                            </div>
                          </form>
                        )}
                      </div>
                    )}

                    {/* Equipment table */}
                    <div className="bg-surface-container-lowest rounded-xl border border-outline-variant/20 shadow-sm overflow-hidden">
                      {loadingEquipos ? (
                        <div className="flex items-center justify-center py-16 gap-3">
                          <span className="size-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                          <span className="font-body text-sm text-on-surface-variant">Cargando equipos…</span>
                        </div>
                      ) : filteredEquipos.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
                          <span className="material-symbols-outlined text-on-surface-variant text-4xl">devices_off</span>
                          <p className="font-body text-sm text-on-surface-variant">
                            {equipoSearch ? 'Sin resultados para tu búsqueda.' : 'No hay equipos registrados.'}
                          </p>
                          {!equipoSearch && (
                            <p className="font-body text-xs text-on-surface-variant/60">Registra el primer equipo con el botón de arriba.</p>
                          )}
                        </div>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead className="bg-surface-container border-b border-outline-variant/20">
                              <tr>
                                <th className="text-left font-label text-xs uppercase tracking-widest text-on-surface-variant px-5 py-3">Nombre</th>
                                <th className="text-left font-label text-xs uppercase tracking-widest text-on-surface-variant px-5 py-3 hidden md:table-cell">Categoría</th>
                                <th className="text-left font-label text-xs uppercase tracking-widest text-on-surface-variant px-5 py-3 hidden lg:table-cell">Marca</th>
                                <th className="text-left font-label text-xs uppercase tracking-widest text-on-surface-variant px-5 py-3 hidden lg:table-cell">SO</th>
                                <th className="text-left font-label text-xs uppercase tracking-widest text-on-surface-variant px-5 py-3">Tipo</th>
                                <th className="text-left font-label text-xs uppercase tracking-widest text-on-surface-variant px-5 py-3">Estado</th>
                                <th className="text-left font-label text-xs uppercase tracking-widest text-on-surface-variant px-5 py-3 hidden xl:table-cell">Sala Asignada</th>
                                <th className="text-left font-label text-xs uppercase tracking-widest text-on-surface-variant px-5 py-3">Acciones</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-outline-variant/10">
                              {filteredEquipos.map((eq) => (
                                <tr key={eq.id} className="even:bg-surface-container-lowest/50 hover:bg-surface-container/40 transition-colors">
                                  {editingEquipoId === eq.id ? (
                                    <>
                                      <td className="px-5 py-3">
                                        <div className="flex flex-col gap-1">
                                          <input aria-label="Nombre del equipo" type="text" value={editEquipoForm.nombre} onChange={e => setEditEquipoField('nombre', e.target.value)} className="w-full bg-surface-container-low border border-primary/40 rounded-lg px-2 py-1 text-xs font-body text-on-surface focus:outline-none min-w-[120px]" />
                                          <label htmlFor="field-mm-11" className="flex items-center gap-1 cursor-pointer text-xs text-on-surface-variant hover:text-primary transition-colors">
                                            {editEquipoImageFile
                                              ? <img src={URL.createObjectURL(editEquipoImageFile)} alt="" className="size-5 rounded object-cover shrink-0" />
                                              : <span className="material-symbols-outlined text-[14px]">image</span>}
                                            <span className="truncate max-w-[100px]">{editEquipoImageFile ? editEquipoImageFile.name : 'Cambiar imagen…'}</span>
                                            <input aria-label="Imagen del equipo" id="field-mm-11" type="file" accept="image/*" className="hidden" onChange={e => setEditEquipoImageFile(e.target.files?.[0] ?? null)} />
                                          </label>
                                        </div>
                                      </td>
                                      <td className="px-5 py-3 hidden md:table-cell">
                                        <select value={editEquipoForm.categoria} onChange={e => setEditEquipoField('categoria', e.target.value)} className="bg-surface-container-low border border-primary/40 rounded-lg px-2 py-1 text-xs font-body text-on-surface focus:outline-none">
                                          <option value="">Seleccionar</option>
                                          <option value="ordenador">Ordenador</option>
                                          <option value="movil">Móvil</option>
                                        </select>
                                      </td>
                                      <td className="px-5 py-3 hidden lg:table-cell">
                                        <select value={editEquipoForm.marca} onChange={e => setEditEquipoField('marca', e.target.value)} disabled={!editEquipoForm.sistema_operativo} className="bg-surface-container-low border border-primary/40 rounded-lg px-2 py-1 text-xs font-body text-on-surface focus:outline-none disabled:opacity-40">
                                          <option value="">Seleccionar</option>
                                          {getMarcas(editEquipoForm.categoria, editEquipoForm.sistema_operativo).map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                                        </select>
                                      </td>
                                      <td className="px-5 py-3 hidden lg:table-cell">
                                        <select value={editEquipoForm.sistema_operativo ?? ''} onChange={e => setEditEquipoField('sistema_operativo', e.target.value)} disabled={!editEquipoForm.categoria} className="bg-surface-container-low border border-primary/40 rounded-lg px-2 py-1 text-xs font-body text-on-surface focus:outline-none disabled:opacity-40">
                                          <option value="">Seleccionar</option>
                                          {getSistemas(editEquipoForm.categoria).map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                                        </select>
                                      </td>
                                      <td className="px-5 py-3">
                                        <select value={editEquipoForm.tipo_equipo} onChange={e => setEditEquipoField('tipo_equipo', e.target.value)} disabled={!editEquipoForm.marca} className="bg-surface-container-low border border-primary/40 rounded-lg px-2 py-1 text-xs font-body text-on-surface focus:outline-none disabled:opacity-40">
                                          <option value="">Seleccionar</option>
                                          {getTipos(editEquipoForm.categoria, editEquipoForm.sistema_operativo, editEquipoForm.marca).map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                                        </select>
                                      </td>
                                      <td className="px-5 py-3">
                                        <select value={editEquipoForm.estado} onChange={e => setEditEquipoField('estado', e.target.value)} className="bg-surface-container-low border border-primary/40 rounded-lg px-2 py-1 text-xs font-body text-on-surface focus:outline-none">
                                          <option value="disponible">Disponible</option>
                                          <option value="reservado">Reservado</option>
                                          <option value="mantenimiento">Mantenimiento</option>
                                        </select>
                                      </td>
                                      <td className="px-5 py-3">
                                        <div className="flex items-center gap-1">
                                          <button type="button" onClick={() => handleSaveEquipo(eq.id)} disabled={savingEquipo} className="p-1.5 rounded-lg text-green-600 hover:bg-green-50 transition-colors disabled:opacity-50">
                                            {savingEquipo ? <span className="size-4 animate-spin rounded-full border-2 border-green-600 border-t-transparent inline-block" /> : <span className="material-symbols-outlined text-[16px]">check</span>}
                                          </button>
                                          <button type="button" onClick={() => { setEditingEquipoId(null); setEditEquipoImageFile(null) }} className="p-1.5 rounded-lg text-on-surface-variant hover:bg-surface-container transition-colors">
                                            <span className="material-symbols-outlined text-[16px]">close</span>
                                          </button>
                                        </div>
                                      </td>
                                      <td className="hidden xl:table-cell" />
                                    </>
                                  ) : (
                                    <>
                                      <td className="px-5 py-4 font-body font-medium text-on-surface">
                                        <div className="flex items-center gap-3">
                                          {eq.imagen_url && (
                                            <Image src={eq.imagen_url} alt={eq.nombre} width={32} height={32} className="rounded-lg object-cover shrink-0 border border-outline-variant/20" unoptimized />
                                          )}
                                          <div>
                                            <span className="line-clamp-1">{eq.nombre}</span>
                                            {eq.numero_serie && (
                                              <code className="text-[10px] font-mono text-on-surface-variant bg-surface-container px-1.5 py-0.5 rounded mt-0.5 block tracking-wider">{eq.numero_serie}</code>
                                            )}
                                          </div>
                                        </div>
                                      </td>
                                      <td className="px-5 py-4 font-body text-on-surface-variant capitalize hidden md:table-cell">{eq.categoria}</td>
                                      <td className="px-5 py-4 font-body text-on-surface-variant capitalize hidden lg:table-cell">{eq.marca}</td>
                                      <td className="px-5 py-4 font-body text-on-surface-variant capitalize hidden lg:table-cell">{eq.sistema_operativo}</td>
                                      <td className="px-5 py-4 font-label text-xs uppercase tracking-wider text-primary">{TIPO_EQUIPO_LABELS[eq.tipo_equipo] ?? eq.tipo_equipo}</td>
                                      <td className="px-5 py-4">
                                        <span className={`inline-flex items-center gap-1 text-xs font-label font-bold px-2 py-0.5 rounded ${
                                          eq.estado === 'disponible'   ? 'bg-green-100 text-green-700' :
                                          eq.estado === 'reservado'    ? 'bg-primary/10 text-primary' :
                                          'bg-orange-100 text-orange-700'
                                        }`}>
                                          <span className={`size-1.5 rounded-full ${
                                            eq.estado === 'disponible' ? 'bg-green-500' :
                                            eq.estado === 'reservado'  ? 'bg-primary' :
                                            'bg-orange-500'
                                          }`} />
                                          {eq.estado === 'disponible' ? 'Disponible' : eq.estado === 'reservado' ? 'Reservado' : 'Mantenimiento'}
                                        </span>
                                      </td>
                                      <td className="px-5 py-4 hidden xl:table-cell">
                                        <div className="flex items-center gap-1.5">
                                          <select
                                            value={eq.sala_id ?? ''}
                                            onChange={e => handleAsignarSala(eq.id, e.target.value || null)}
                                            disabled={asignandoSala === eq.id}
                                            className="bg-surface-container-low border border-outline-variant/30 rounded-lg px-2 py-1 text-xs font-body text-on-surface focus:outline-none focus:ring-1 focus:ring-primary/40 disabled:opacity-50 max-w-[160px]"
                                          >
                                            <option value="">Sin sala asignada</option>
                                            {salas.map(s => (
                                              <option key={s.id} value={s.id}>{s.nombre}</option>
                                            ))}
                                          </select>
                                          {asignandoSala === eq.id && (
                                            <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-primary border-t-transparent shrink-0" />
                                          )}
                                        </div>
                                      </td>
                                      <td className="px-5 py-4">
                                        <div className="flex items-center gap-1">
                                          <button type="button"
                                            onClick={() => {
                                              setEditingEquipoId(eq.id)
                                              setEditEquipoForm({
                                                nombre: eq.nombre,
                                                categoria: eq.categoria,
                                                sistema_operativo: eq.sistema_operativo,
                                                marca: eq.marca,
                                                tipo_equipo: eq.tipo_equipo,
                                                estado: eq.estado,
                                                imagen_url: eq.imagen_url ?? '',
                                              })
                                            }}
                                            title="Editar equipo"
                                            className="p-1.5 rounded-lg text-on-surface-variant hover:bg-surface-container transition-colors"
                                          >
                                            <span className="material-symbols-outlined text-[16px]">edit</span>
                                          </button>
                                          <button type="button"
                                            onClick={() => handleDeleteEquipo(eq.id)}
                                            title="Eliminar equipo"
                                            className="p-1.5 rounded-lg text-on-surface-variant hover:bg-red-50 hover:text-red-600 transition-colors"
                                          >
                                            <span className="material-symbols-outlined text-[16px]">delete</span>
                                          </button>
                                        </div>
                                      </td>
                                    </>
                                  )}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>

                    {/* ── Panel de Alertas de Inventario ─────────────────── */}
                    {(loadingAlertas || alertasEquipos.length > 0) && (() => {
                      const vencidos      = alertasEquipos.filter(a => a.tipo === 'vencido')
                      const enUso         = alertasEquipos.filter(a => a.tipo === 'activo_ahora')
                      const proximos24    = alertasEquipos.filter(a => a.tipo === 'proximo_24h')
                      const proximos48    = alertasEquipos.filter(a => a.tipo === 'proximo_48h')
                      return (
                        <div className="bg-surface-container-lowest rounded-xl border border-outline-variant/20 shadow-sm overflow-hidden">
                          <div className="flex items-center gap-2 px-5 py-3 border-b border-outline-variant/15 bg-surface-container">
                            <span className="material-symbols-outlined text-amber-500 text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>notification_important</span>
                            <h3 className="font-label text-sm font-semibold text-on-surface">Alertas de Inventario</h3>
                            {vencidos.length > 0 && (
                              <span className="ml-1 inline-flex items-center justify-center px-2 py-0.5 rounded-full bg-red-100 text-red-700 text-[10px] font-semibold">{vencidos.length} vencido{vencidos.length !== 1 ? 's' : ''}</span>
                            )}
                            {(proximos24.length + proximos48.length) > 0 && (
                              <span className="ml-1 inline-flex items-center justify-center px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-[10px] font-semibold">{proximos24.length + proximos48.length} próximo{(proximos24.length + proximos48.length) !== 1 ? 's' : ''}</span>
                            )}
                            <button type="button" onClick={loadAlertasEquipos} className="ml-auto p-1.5 rounded-lg text-on-surface-variant hover:bg-surface-container-low transition-colors" title="Actualizar alertas">
                              <span className={`material-symbols-outlined text-[16px] ${loadingAlertas ? 'animate-spin' : ''}`}>refresh</span>
                            </button>
                          </div>
                          {loadingAlertas ? (
                            <div className="flex items-center justify-center gap-2 py-6 text-sm font-body text-on-surface-variant">
                              <span className="size-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                              Cargando alertas…
                            </div>
                          ) : (
                            <div className="p-4 space-y-4">
                              {/* Préstamos vencidos */}
                              {vencidos.length > 0 && (
                                <div>
                                  <p className="font-label text-[11px] uppercase tracking-widest text-red-600 mb-2 flex items-center gap-1">
                                    <span className="material-symbols-outlined text-[13px]" style={{ fontVariationSettings: "'FILL' 1" }}>event_busy</span>
                                    No devueltos: vencidos ({vencidos.length})
                                  </p>
                                  <div className="space-y-1.5">
                                    {vencidos.map(a => (
                                      <div key={a.prestamo_id} className="flex items-center gap-2 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                                        <span className="material-symbols-outlined text-red-500 text-[16px]" style={{ fontVariationSettings: "'FILL' 1" }}>devices</span>
                                        <div className="flex-1 min-w-0">
                                          <span className="font-label text-xs font-semibold text-on-surface">{a.equipo_nombre}</span>
                                          <span className="font-body text-xs text-on-surface-variant ml-2">· {a.usuario_nombre}</span>
                                          {a.num_acta && <span className="font-mono text-[10px] text-on-surface-variant/70 ml-2">{a.num_acta}</span>}
                                        </div>
                                        <span className="font-body text-[11px] text-red-500 whitespace-nowrap">
                                          Venció {new Date(a.fecha_fin_esperada).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', timeZone: 'America/Bogota' })}
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                              {/* Equipos en uso ahora */}
                              {enUso.length > 0 && (
                                <div>
                                  <p className="font-label text-[11px] uppercase tracking-widest text-blue-600 mb-2 flex items-center gap-1">
                                    <span className="material-symbols-outlined text-[13px]" style={{ fontVariationSettings: "'FILL' 1" }}>hourglass_top</span>
                                    En uso ahora ({enUso.length})
                                  </p>
                                  <div className="space-y-1.5">
                                    {enUso.map(a => (
                                      <div key={a.prestamo_id} className="flex items-center gap-2 bg-blue-50 border border-blue-100 rounded-lg px-3 py-2">
                                        <span className="material-symbols-outlined text-blue-500 text-[16px]" style={{ fontVariationSettings: "'FILL' 1" }}>devices</span>
                                        <div className="flex-1 min-w-0">
                                          <span className="font-label text-xs font-semibold text-on-surface">{a.equipo_nombre}</span>
                                          <span className="font-body text-xs text-on-surface-variant ml-2">· {a.usuario_nombre}</span>
                                        </div>
                                        <span className="font-body text-[11px] text-blue-600 whitespace-nowrap">
                                          Devuelve {new Date(a.fecha_fin_esperada).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', timeZone: 'America/Bogota' })} {new Date(a.fecha_fin_esperada).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Bogota' })}
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                              {/* Próximos en 24 h */}
                              {proximos24.length > 0 && (
                                <div>
                                  <p className="font-label text-[11px] uppercase tracking-widest text-amber-600 mb-2 flex items-center gap-1">
                                    <span className="material-symbols-outlined text-[13px]" style={{ fontVariationSettings: "'FILL' 1" }}>event_upcoming</span>
                                    Próximos en las siguientes 24 h: preparar ({proximos24.length})
                                  </p>
                                  <div className="space-y-1.5">
                                    {proximos24.map(a => (
                                      <div key={a.prestamo_id} className="flex items-center gap-2 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
                                        <span className="material-symbols-outlined text-amber-500 text-[16px]" style={{ fontVariationSettings: "'FILL' 1" }}>devices</span>
                                        <div className="flex-1 min-w-0">
                                          <span className="font-label text-xs font-semibold text-on-surface">{a.equipo_nombre}</span>
                                          <span className="font-body text-xs text-on-surface-variant ml-2">· {a.usuario_nombre}</span>
                                        </div>
                                        <span className="font-body text-[11px] text-amber-600 whitespace-nowrap">
                                          Inicia {new Date(a.fecha_inicio).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', timeZone: 'America/Bogota' })} {new Date(a.fecha_inicio).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Bogota' })}
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                              {/* Próximos en 48 h */}
                              {proximos48.length > 0 && (
                                <div>
                                  <p className="font-label text-[11px] uppercase tracking-widest text-sky-600 mb-2 flex items-center gap-1">
                                    <span className="material-symbols-outlined text-[13px]" style={{ fontVariationSettings: "'FILL' 1" }}>calendar_clock</span>
                                    Próximos en 24–48 h ({proximos48.length})
                                  </p>
                                  <div className="space-y-1.5">
                                    {proximos48.map(a => (
                                      <div key={a.prestamo_id} className="flex items-center gap-2 bg-sky-50 border border-sky-100 rounded-lg px-3 py-2">
                                        <span className="material-symbols-outlined text-sky-500 text-[16px]" style={{ fontVariationSettings: "'FILL' 1" }}>devices</span>
                                        <div className="flex-1 min-w-0">
                                          <span className="font-label text-xs font-semibold text-on-surface">{a.equipo_nombre}</span>
                                          <span className="font-body text-xs text-on-surface-variant ml-2">· {a.usuario_nombre}</span>
                                        </div>
                                        <span className="font-body text-[11px] text-sky-600 whitespace-nowrap">
                                          Inicia {new Date(a.fecha_inicio).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', timeZone: 'America/Bogota' })} {new Date(a.fecha_inicio).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Bogota' })}
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )
                    })()}

                    {/* ── Gestión de Préstamos (admin) ───────────────────── */}
                    <div className="bg-surface-container-lowest rounded-xl border border-outline-variant/20 shadow-sm overflow-hidden">
                      {/* Header con tabs */}
                      <div className="border-b border-outline-variant/15 bg-surface-container">
                        <div className="flex items-center gap-2 px-5 py-3">
                          <span className="material-symbols-outlined text-primary text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>assignment</span>
                          <h3 className="font-label text-sm font-semibold text-on-surface">Gestión de Préstamos</h3>
                          <button type="button"
                            onClick={() => { loadPrestamosAdmin(); loadPrestamosHistorial(prestamosAdminTab); loadAlertasEquipos() }}
                            className="ml-auto p-1.5 rounded-lg text-on-surface-variant hover:bg-surface-container-low transition-colors"
                            title="Actualizar"
                          >
                            <span className="material-symbols-outlined text-[16px]">refresh</span>
                          </button>
                        </div>
                        {/* Tab bar */}
                        <div className="flex gap-1 px-4 pb-0">
                          {([
                            { id: 'activos', label: 'Activos & Vencidos', icon: 'hourglass_top' },
                            { id: 'pendiente_revision', label: 'Pendiente Revisión', icon: 'manage_search' },
                            { id: 'novedades', label: 'Con Novedad', icon: 'warning' },
                            { id: 'historial', label: 'Historial', icon: 'history' },
                          ] as const).map(tab => (
                            <button type="button"
                              key={tab.id}
                              onClick={() => {
                                setPrestamosAdminTab(tab.id)
                                loadPrestamosHistorial(tab.id)
                              }}
                              className={`flex items-center gap-1.5 px-3 py-2 text-xs font-label font-semibold border-b-2 transition-all -mb-px ${
                                prestamosAdminTab === tab.id
                                  ? 'border-primary text-primary'
                                  : 'border-transparent text-on-surface-variant hover:text-on-surface'
                              }`}
                            >
                              <span className="material-symbols-outlined text-[14px]" style={prestamosAdminTab === tab.id ? { fontVariationSettings: "'FILL' 1" } : undefined}>{tab.icon}</span>
                              {tab.label}
                              {tab.id === 'pendiente_revision' && prestamosAdmin.filter(p => p.estado === 'pendiente_revision').length > 0 && (
                                <span className="inline-flex items-center justify-center size-4 rounded-full bg-orange-500 text-white text-[9px] font-semibold">{prestamosAdmin.filter(p => p.estado === 'pendiente_revision').length}</span>
                              )}
                              {tab.id === 'novedades' && prestamosHistorial.filter(p => p.novedad).length > 0 && (
                                <span className="inline-flex items-center justify-center size-4 rounded-full bg-amber-500 text-white text-[9px] font-semibold">{prestamosHistorial.filter(p => p.novedad).length}</span>
                              )}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Content */}
                      {(() => {
                        const isLoading = prestamosAdminTab === 'activos' || prestamosAdminTab === 'pendiente_revision' ? loadingPrestamosAdmin : loadingHistorial
                        const items = prestamosAdminTab === 'activos'
                          ? prestamosAdmin.filter(p => p.estado === 'activo' || p.estado === 'vencido')
                          : prestamosAdminTab === 'pendiente_revision'
                          ? prestamosAdmin.filter(p => p.estado === 'pendiente_revision')
                          : prestamosAdminTab === 'novedades'
                          ? prestamosHistorial.filter(p => p.novedad)
                          : prestamosHistorial

                        if (isLoading) return (
                          <div className="flex items-center justify-center gap-2 py-10 text-sm font-body text-on-surface-variant">
                            <span className="size-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                            Cargando…
                          </div>
                        )

                        if (items.length === 0) return (
                          <div className="flex flex-col items-center justify-center py-10 gap-2 text-center">
                            <span className="material-symbols-outlined text-on-surface-variant text-3xl">
                              {prestamosAdminTab === 'novedades' ? 'check_circle' : prestamosAdminTab === 'pendiente_revision' ? 'inventory_2' : 'assignment_turned_in'}
                            </span>
                            <p className="font-body text-sm text-on-surface-variant">
                              {prestamosAdminTab === 'activos' ? 'No hay préstamos activos.' : prestamosAdminTab === 'pendiente_revision' ? 'No hay devoluciones pendientes de revisión.' : prestamosAdminTab === 'novedades' ? 'Sin novedades registradas.' : 'Sin historial disponible.'}
                            </p>
                          </div>
                        )

                        return (
                          <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                              <thead className="bg-surface-container border-b border-outline-variant/20">
                                <tr>
                                  <th className="text-left font-label text-[11px] uppercase tracking-widest text-on-surface-variant px-4 py-3">Equipo · Acta</th>
                                  <th className="text-left font-label text-[11px] uppercase tracking-widest text-on-surface-variant px-4 py-3 hidden md:table-cell">Usuario</th>
                                  <th className="text-left font-label text-[11px] uppercase tracking-widest text-on-surface-variant px-4 py-3 hidden lg:table-cell">Condición</th>
                                  <th className="text-left font-label text-[11px] uppercase tracking-widest text-on-surface-variant px-4 py-3">Estado · Fecha</th>
                                  <th className="text-left font-label text-[11px] uppercase tracking-widest text-on-surface-variant px-4 py-3">Acciones</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-outline-variant/10">
                                {items.map(p => {
                                  const inicioDate = new Date(p.fecha_inicio)
                                  const finDate = new Date(p.fecha_fin_esperada)
                                  const ahora = new Date()
                                  const isProgramado = p.estado === 'activo' && inicioDate > ahora
                                  const isEnUso = p.estado === 'activo' && inicioDate <= ahora && finDate > ahora
                                  const isOverdue = p.estado === 'activo' && finDate <= ahora
                                  return (
                                    <tr key={p.id} className={`hover:bg-surface-container/40 transition-colors ${isOverdue ? 'bg-red-50/20' : p.estado === 'pendiente_revision' ? 'bg-orange-50/20' : isProgramado ? 'bg-sky-50/10' : p.novedad ? 'bg-amber-50/20' : ''}`}>
                                      {/* Equipo */}
                                      <td className="px-4 py-3">
                                        <div className="flex items-center gap-2">
                                          {p.equipos?.imagen_url ? (
                                            <Image src={p.equipos.imagen_url} alt="" width={32} height={32} className="rounded-lg object-cover shrink-0 border border-outline-variant/15" unoptimized />
                                          ) : (
                                            <div className="size-8 rounded-lg bg-surface-container flex items-center justify-center shrink-0">
                                              <span className="material-symbols-outlined text-on-surface-variant text-[16px]">devices</span>
                                            </div>
                                          )}
                                          <div className="min-w-0">
                                            <p className="font-body text-sm font-semibold text-on-surface truncate max-w-[140px]">{p.equipos?.nombre ?? 'N/A'}</p>
                                            {p.num_acta && <p className="font-mono text-[10px] text-on-surface-variant">{p.num_acta}</p>}
                                          </div>
                                        </div>
                                      </td>
                                      {/* Usuario */}
                                      <td className="px-4 py-3 hidden md:table-cell">
                                        <p className="font-body text-sm text-on-surface">{p.usuarios?.nombre ?? 'N/A'}</p>
                                        <a href={`mailto:${p.usuarios?.correo}`} className="font-body text-xs text-primary hover:underline">{p.usuarios?.correo}</a>
                                      </td>
                                      {/* Condición */}
                                      <td className="px-4 py-3 hidden lg:table-cell">
                                        <div className="flex flex-col gap-1">
                                          <span className={`inline-flex items-center gap-0.5 text-[10px] font-label font-semibold px-1.5 py-0.5 rounded border w-fit ${CONDICION_COLOR[p.condicion_entrega ?? 'bueno']}`}>
                                            ↑ {CONDICION_LABEL[p.condicion_entrega ?? 'bueno']}
                                          </span>
                                          {p.condicion_devolucion && (
                                            <span className={`inline-flex items-center gap-0.5 text-[10px] font-label font-semibold px-1.5 py-0.5 rounded border w-fit ${CONDICION_COLOR[p.condicion_devolucion]}`}>
                                              ↓ {CONDICION_LABEL[p.condicion_devolucion]}
                                            </span>
                                          )}
                                          {p.novedad && (
                                            <span className="inline-flex items-center gap-0.5 text-[10px] font-label font-semibold px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 border border-amber-200 w-fit">
                                              <span className="material-symbols-outlined text-[10px]" style={{ fontVariationSettings: "'FILL' 1" }}>warning</span>
                                              {p.tipo_novedad ? NOVEDAD_LABEL[p.tipo_novedad] : 'Novedad'}
                                            </span>
                                          )}
                                        </div>
                                      </td>
                                      {/* Estado */}
                                      <td className="px-4 py-3">
                                        <div className="space-y-0.5">
                                          {isProgramado && (
                                            <span className="inline-flex items-center gap-0.5 text-[10px] font-label font-semibold px-1.5 py-0.5 rounded bg-sky-100 text-sky-700 border border-sky-200">
                                              <span className="material-symbols-outlined text-[10px]" style={{ fontVariationSettings: "'FILL' 1" }}>event_upcoming</span>Programado
                                            </span>
                                          )}
                                          {isEnUso && (
                                            <span className="inline-flex items-center gap-0.5 text-[10px] font-label font-semibold px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 border border-blue-200">
                                              <span className="material-symbols-outlined text-[10px]" style={{ fontVariationSettings: "'FILL' 1" }}>hourglass_top</span>En uso
                                            </span>
                                          )}
                                          {isOverdue && (
                                            <span className="inline-flex items-center gap-0.5 text-[10px] font-label font-semibold px-1.5 py-0.5 rounded bg-red-100 text-red-700 border border-red-200">
                                              <span className="material-symbols-outlined text-[10px]" style={{ fontVariationSettings: "'FILL' 1" }}>event_busy</span>Vencido
                                            </span>
                                          )}
                                          {p.estado === 'pendiente_revision' && (
                                            <span className="inline-flex items-center gap-0.5 text-[10px] font-label font-semibold px-1.5 py-0.5 rounded bg-orange-100 text-orange-700 border border-orange-200">
                                              <span className="material-symbols-outlined text-[10px]" style={{ fontVariationSettings: "'FILL' 1" }}>manage_search</span>Pendiente revisión
                                            </span>
                                          )}
                                          {p.estado === 'devuelto' && (
                                            <span className="inline-flex items-center gap-0.5 text-[10px] font-label font-semibold px-1.5 py-0.5 rounded bg-green-100 text-green-700 border border-green-200">
                                              <span className="material-symbols-outlined text-[10px]" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>Devuelto
                                            </span>
                                          )}
                                          {isProgramado && (
                                            <p className="font-body text-[10px] text-sky-600">
                                              Inicia: {inicioDate.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', timeZone: 'America/Bogota' })} {inicioDate.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Bogota' })}
                                            </p>
                                          )}
                                          <p className={`font-body text-xs ${isOverdue ? 'text-red-500' : 'text-on-surface-variant'}`}>
                                            {(p.estado === 'devuelto' || p.estado === 'pendiente_revision') && p.fecha_devolucion
                                              ? `Entregado: ${new Date(p.fecha_devolucion).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', timeZone: 'America/Bogota' })}`
                                              : `Devol: ${finDate.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', timeZone: 'America/Bogota' })} ${finDate.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Bogota' })}`
                                            }
                                          </p>
                                          {p.salas && <p className="font-body text-[10px] text-on-surface-variant/70">{p.salas.nombre}</p>}
                                        </div>
                                      </td>
                                      {/* Acciones */}
                                      <td className="px-4 py-3">
                                        <div className="flex flex-col gap-1.5">
                                          {/* Activo/Vencido sin programar → registrar devolución manual */}
                                          {(p.estado === 'activo' || p.estado === 'vencido') && !isProgramado && (
                                            <button type="button"
                                              onClick={() => handleAbrirDevolucionAdmin(p)}
                                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-primary text-on-primary text-xs font-label font-semibold hover:opacity-90 transition"
                                            >
                                              <span className="material-symbols-outlined text-[13px]">assignment_return</span>
                                              Registrar devolución
                                            </button>
                                          )}
                                          {isProgramado && (
                                            <span className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-sky-50 text-sky-600 border border-sky-200 text-xs font-label font-semibold">
                                              <span className="material-symbols-outlined text-[13px]">schedule</span>
                                              Pendiente de entrega
                                            </span>
                                          )}
                                          {/* Pendiente revisión → acciones de revisión */}
                                          {p.estado === 'pendiente_revision' && (
                                            <>
                                              <button type="button"
                                                onClick={() => handleAbrirRevision(p)}
                                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-orange-600 text-white text-xs font-label font-semibold hover:bg-orange-700 transition"
                                              >
                                                <span className="material-symbols-outlined text-[13px]">fact_check</span>
                                                Confirmar revisión
                                              </button>
                                              <button type="button"
                                                onClick={() => handleAbrirReasignar(p)}
                                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-surface-container text-on-surface text-xs font-label font-semibold hover:bg-surface-container-low border border-outline-variant/30 transition"
                                              >
                                                <span className="material-symbols-outlined text-[13px]">swap_horiz</span>
                                                Reasignar equipo
                                              </button>
                                            </>
                                          )}
                                          {p.foto_devolucion_url && (
                                            <a
                                              href={p.foto_devolucion_url}
                                              target="_blank"
                                              rel="noopener noreferrer"
                                              className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-surface-container text-on-surface-variant text-xs font-label hover:bg-surface-container-low transition border border-outline-variant/20"
                                            >
                                              <span className="material-symbols-outlined text-[12px]">photo_camera</span>
                                              Ver foto
                                            </a>
                                          )}
                                          {p.novedad && p.descripcion_novedad && (
                                            <p className="font-body text-[10px] text-amber-700 bg-amber-50 rounded px-1.5 py-1 border border-amber-100 max-w-[160px]" title={p.descripcion_novedad}>
                                              {p.descripcion_novedad.slice(0, 50)}{p.descripcion_novedad.length > 50 ? '…' : ''}
                                            </p>
                                          )}
                                        </div>
                                      </td>
                                    </tr>
                                  )
                                })}
                              </tbody>
                            </table>
                          </div>
                        )
                      })()}
                    </div>

                  </div>
                )
              })()}

              {/* ─── Admin: Gestión de salas ──────────────────────────── */}
              {adminSubTab === 'rooms' && (
                <div className="space-y-4">
                  {/* Botón agregar sala */}
                  <div className="flex justify-end">
                    <button type="button"
                      onClick={() => setShowSalaForm(v => !v)}
                      className="inline-flex items-center gap-2 bg-primary text-on-primary px-5 py-2.5 rounded-lg font-label text-sm font-semibold hover:opacity-90 transition-opacity"
                    >
                      <span className="material-symbols-outlined text-[18px]">{showSalaForm ? 'close' : 'add'}</span>
                      {showSalaForm ? 'Cancelar' : 'Agregar Sala'}
                    </button>
                  </div>

                  {/* Formulario agregar sala */}
                  {showSalaForm && (
                    <form onSubmit={handleAddSala} className="bg-surface-container-lowest rounded-xl border border-outline-variant/20 p-5 space-y-4">
                      <h4 className="font-headline font-semibold text-on-surface mb-2">Nueva Sala</h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        <div>
                          <label htmlFor="field-mm-12" className="font-label text-xs uppercase tracking-widest text-on-surface-variant block mb-1.5">Nombre *</label>
                          <input aria-label="Nombre de la sala" id="field-mm-12" type="text" value={salaForm.nombre} onChange={e => setSalaForm(f => ({ ...f, nombre: e.target.value }))} placeholder="Ej: Sala Innovación A" className="w-full bg-surface-container-low border border-outline-variant/30 rounded-lg px-3 py-2 text-sm font-body text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/40" required />
                        </div>
                        <div>
                          <label htmlFor="field-mm-13" className="font-label text-xs uppercase tracking-widest text-on-surface-variant block mb-1.5">Capacidad *</label>
                          <input aria-label="Capacidad de la sala" id="field-mm-13" type="number" min="1" value={salaForm.capacidad} onChange={e => setSalaForm(f => ({ ...f, capacidad: e.target.value }))} placeholder="Ej: 10" className="w-full bg-surface-container-low border border-outline-variant/30 rounded-lg px-3 py-2 text-sm font-body text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/40" required />
                        </div>
                        <div>
                          <label htmlFor="field-mm-14" className="font-label text-xs uppercase tracking-widest text-on-surface-variant block mb-1.5">Ubicación</label>
                          <input aria-label="Ubicación de la sala" id="field-mm-14" type="text" value={salaForm.ubicacion} onChange={e => setSalaForm(f => ({ ...f, ubicacion: e.target.value }))} placeholder="Ej: Piso 2, Ala Norte" className="w-full bg-surface-container-low border border-outline-variant/30 rounded-lg px-3 py-2 text-sm font-body text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/40" />
                        </div>
                        <div className="sm:col-span-2">
                          <label htmlFor="field-mm-15" className="font-label text-xs uppercase tracking-widest text-on-surface-variant block mb-1.5">Descripción</label>
                          <input aria-label="Descripción de la sala" id="field-mm-15" type="text" value={salaForm.descripcion} onChange={e => setSalaForm(f => ({ ...f, descripcion: e.target.value }))} placeholder="Descripción breve de la sala" className="w-full bg-surface-container-low border border-outline-variant/30 rounded-lg px-3 py-2 text-sm font-body text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/40" />
                        </div>
                        <div>
                          <label htmlFor="field-mm-16" className="font-label text-xs uppercase tracking-widest text-on-surface-variant block mb-1.5">Estado</label>
                          <select id="field-mm-16" value={salaForm.estado} onChange={e => setSalaForm(f => ({ ...f, estado: e.target.value as SalaAdmin['estado'] }))} className="w-full bg-surface-container-low border border-outline-variant/30 rounded-lg px-3 py-2 text-sm font-body text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/40">
                            <option value="disponible">Disponible</option>
                            <option value="ocupada">Ocupada</option>
                            <option value="mantenimiento">Mantenimiento</option>
                          </select>
                        </div>
                        <div className="sm:col-span-2 lg:col-span-3">
                          <label htmlFor="field-mm-17" className="font-label text-xs uppercase tracking-widest text-on-surface-variant block mb-1.5">Imagen</label>
                          <div className="flex items-center gap-3">
                            {salaImageFile && (
                              <img src={URL.createObjectURL(salaImageFile)} alt="preview" className="size-12 rounded-lg object-cover border border-outline-variant/20 shrink-0" />
                            )}
                            <label htmlFor="field-mm-18" className="flex items-center gap-2 px-3 py-2 rounded-lg border border-dashed border-outline-variant/50 cursor-pointer hover:border-primary/60 transition-colors text-sm font-body text-on-surface-variant w-full">
                              <span className="material-symbols-outlined text-[18px]">upload</span>
                              <span className="truncate">{salaImageFile ? salaImageFile.name : 'Seleccionar imagen…'}</span>
                              <input aria-label="Imagen de la sala" id="field-mm-18" type="file" accept="image/*" className="hidden" onChange={e => setSalaImageFile(e.target.files?.[0] ?? null)} />
                            </label>
                            {salaImageFile && (
                              <button type="button" onClick={() => setSalaImageFile(null)} className="p-1 rounded text-red-400 hover:bg-red-50 shrink-0">
                                <span className="material-symbols-outlined text-[16px]">close</span>
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex justify-end">
                        <button type="submit" disabled={addingSala} className="inline-flex items-center gap-2 bg-primary text-on-primary px-5 py-2 rounded-lg font-label text-sm font-semibold disabled:opacity-60">
                          {addingSala ? <><span className="size-4 animate-spin rounded-full border-2 border-on-primary border-t-transparent" /> Guardando…</> : <><span className="material-symbols-outlined text-[18px]">save</span> Guardar Sala</>}
                        </button>
                      </div>
                    </form>
                  )}

                  {/* Lista de salas */}
                  <div className="bg-surface-container-lowest rounded-xl border border-outline-variant/20 shadow-sm overflow-hidden">
                    {loadingSalasAdmin ? (
                      <div className="flex items-center justify-center py-16 gap-3">
                        <span className="size-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                        <span className="font-body text-sm text-on-surface-variant">Cargando salas…</span>
                      </div>
                    ) : salasAdmin.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
                        <span className="material-symbols-outlined text-on-surface-variant text-4xl">meeting_room</span>
                        <p className="font-body text-sm text-on-surface-variant">No hay salas registradas.</p>
                        <p className="font-body text-xs text-on-surface-variant/60">Agrega la primera sala con el botón de arriba.</p>
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead className="bg-surface-container border-b border-outline-variant/20">
                            <tr>
                              <th className="text-left font-label text-xs uppercase tracking-widest text-on-surface-variant px-6 py-3">Nombre</th>
                              <th className="text-left font-label text-xs uppercase tracking-widest text-on-surface-variant px-6 py-3">Cap.</th>
                              <th className="text-left font-label text-xs uppercase tracking-widest text-on-surface-variant px-6 py-3">Ubicación</th>
                              <th className="text-left font-label text-xs uppercase tracking-widest text-on-surface-variant px-6 py-3">Estado</th>
                              <th className="text-left font-label text-xs uppercase tracking-widest text-on-surface-variant px-6 py-3">Acciones</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-outline-variant/10">
                            {salasAdmin.map((s) => (
                              <tr key={s.id} className="hover:bg-surface-container/50 transition-colors">
                                {editingSalaId === s.id ? (
                                  <>
                                    <td className="px-6 py-3">
                                      <div className="flex flex-col gap-1">
                                        <input aria-label="Nombre de la sala" type="text" value={editSalaForm.nombre} onChange={e => setEditSalaForm(f => ({ ...f, nombre: e.target.value }))} className="w-full bg-surface-container-low border border-primary/40 rounded-lg px-2 py-1 text-xs font-body text-on-surface focus:outline-none" />
                                        {/* Preview: nuevo archivo seleccionado, o imagen actual de BD */}
                                        {(editSalaImageFile || editSalaForm.imagen_url) && (
                                          <div className="relative w-full h-20 rounded-lg overflow-hidden bg-surface-container">
                                            <img
                                              src={editSalaImageFile ? URL.createObjectURL(editSalaImageFile) : editSalaForm.imagen_url}
                                              alt="Vista previa"
                                              className="w-full h-full object-cover"
                                            />
                                            {!editSalaImageFile && (
                                              <span className="absolute bottom-1 left-1 text-[9px] font-label font-semibold uppercase tracking-wider bg-black/50 text-white px-1.5 py-0.5 rounded">Actual</span>
                                            )}
                                          </div>
                                        )}
                                        <label htmlFor="field-mm-19" className="flex items-center gap-1 cursor-pointer text-xs text-on-surface-variant hover:text-primary transition-colors">
                                          <span className="material-symbols-outlined text-[14px]">{editSalaImageFile ? 'check_circle' : 'upload'}</span>
                                          <span className="truncate max-w-[120px]">{editSalaImageFile ? editSalaImageFile.name : editSalaForm.imagen_url ? 'Cambiar imagen…' : 'Subir imagen…'}</span>
                                          <input aria-label="Imagen de la sala" id="field-mm-19" type="file" accept="image/*" className="hidden" onChange={e => setEditSalaImageFile(e.target.files?.[0] ?? null)} />
                                        </label>
                                      </div>
                                    </td>
                                    <td className="px-6 py-3"><input aria-label="Capacidad de la sala" type="number" min="1" value={editSalaForm.capacidad} onChange={e => setEditSalaForm(f => ({ ...f, capacidad: e.target.value }))} className="w-16 bg-surface-container-low border border-primary/40 rounded-lg px-2 py-1 text-xs font-body text-on-surface focus:outline-none" /></td>
                                    <td className="px-6 py-3"><input aria-label="Ubicación de la sala" type="text" value={editSalaForm.ubicacion} onChange={e => setEditSalaForm(f => ({ ...f, ubicacion: e.target.value }))} className="w-full bg-surface-container-low border border-primary/40 rounded-lg px-2 py-1 text-xs font-body text-on-surface focus:outline-none" /></td>
                                    <td className="px-6 py-3">
                                      <select value={editSalaForm.estado} onChange={e => setEditSalaForm(f => ({ ...f, estado: e.target.value as SalaAdmin['estado'] }))} className="bg-surface-container-low border border-primary/40 rounded-lg px-2 py-1 text-xs font-body text-on-surface focus:outline-none">
                                        <option value="disponible">Disponible</option>
                                        <option value="ocupada">Ocupada</option>
                                        <option value="mantenimiento">Mantenimiento</option>
                                      </select>
                                    </td>
                                    <td className="px-6 py-3">
                                      <div className="flex items-center gap-1">
                                        <button type="button" onClick={() => handleSaveSala(s.id)} disabled={savingSala} className="p-1.5 rounded-lg text-green-600 hover:bg-green-50 transition-colors disabled:opacity-50">
                                          {savingSala ? <span className="size-4 animate-spin rounded-full border-2 border-green-600 border-t-transparent inline-block" /> : <span className="material-symbols-outlined text-[16px]">check</span>}
                                        </button>
                                        <button type="button" onClick={() => { setEditingSalaId(null); setEditSalaImageFile(null) }} className="p-1.5 rounded-lg text-on-surface-variant hover:bg-surface-container transition-colors">
                                          <span className="material-symbols-outlined text-[16px]">close</span>
                                        </button>
                                      </div>
                                    </td>
                                  </>
                                ) : (
                                  <>
                                    <td className="px-6 py-4">
                                      <div className="flex items-center gap-3">
                                        {s.imagen_url
                                          ? <Image src={s.imagen_url} alt={s.nombre} width={40} height={40} className="rounded-lg object-cover shrink-0 border border-outline-variant/30" unoptimized />
                                          : <div className="size-10 rounded-lg bg-surface-container flex items-center justify-center shrink-0"><span className="material-symbols-outlined text-[18px] text-on-surface-variant">meeting_room</span></div>
                                        }
                                        <span className="font-body font-medium text-on-surface">{s.nombre}</span>
                                      </div>
                                    </td>
                                    <td className="px-6 py-4 font-body text-on-surface-variant">{s.capacidad}</td>
                                    <td className="px-6 py-4 font-body text-on-surface-variant">{s.ubicacion ?? 'N/A'}</td>
                                    <td className="px-6 py-4">
                                      <span className={`inline-flex items-center gap-1 text-xs font-label font-bold px-2 py-0.5 rounded ${
                                        s.estado === 'disponible' ? 'bg-green-100 text-green-700' :
                                        s.estado === 'ocupada' ? 'bg-red-100 text-red-600' : 'bg-yellow-100 text-yellow-700'
                                      }`}>
                                        <span className={`size-1.5 rounded-full ${s.estado === 'disponible' ? 'bg-green-500' : s.estado === 'ocupada' ? 'bg-red-500' : 'bg-yellow-500'}`} />
                                        {s.estado === 'disponible' ? 'Disponible' : s.estado === 'ocupada' ? 'Ocupada' : 'Mantenimiento'}
                                      </span>
                                    </td>
                                    <td className="px-6 py-4">
                                      <div className="flex items-center gap-1">
                                        <button type="button"
                                          onClick={() => { setEditingSalaId(s.id); setEditSalaForm({ nombre: s.nombre, descripcion: s.descripcion ?? '', capacidad: String(s.capacidad), ubicacion: s.ubicacion ?? '', imagen_url: s.imagen_url ?? '', estado: s.estado }) }}
                                          title="Editar sala"
                                          className="p-1.5 rounded-lg text-on-surface-variant hover:bg-surface-container transition-colors"
                                        >
                                          <span className="material-symbols-outlined text-[16px]">edit</span>
                                        </button>
                                        <button type="button"
                                          onClick={() => handleDeleteSala(s.id)}
                                          title="Eliminar sala"
                                          className="p-1.5 rounded-lg text-on-surface-variant hover:bg-red-50 hover:text-red-600 transition-colors"
                                        >
                                          <span className="material-symbols-outlined text-[16px]">delete</span>
                                        </button>
                                      </div>
                                    </td>
                                  </>
                                )}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ─── Sprint 3: Módulo de Reportes ─────────────────────── */}
              {adminSubTab === 'reports' && (() => {
                // ── PDF export helper ─────────────────────────────────────
                const handleExportPDF = () => {
                  if (!reportData) return
                  const printWin = window.open('', '_blank', 'width=1000,height=800')
                  if (!printWin) { alert('Permite ventanas emergentes para exportar el PDF.'); return }
                  const now = new Date().toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' })
                  const fmtEstado = (e: string) => ({ confirmada: 'Confirmada', pendiente: 'Pendiente', cancelada: 'Cancelada', disponible: 'Disponible', ocupada: 'Ocupada', mantenimiento: 'Mantenimiento', reservado: 'Reservado' }[e] ?? e)
                  const html = `<!DOCTYPE html><html lang="es"><head><meta charset="utf-8"/>
                    <title>Reporte ITAM Reservio</title>
                    <style>
                      *{box-sizing:border-box;margin:0;padding:0}
                      body{font-family:'Segoe UI',Arial,sans-serif;color:#1a1a2e;background:#fff;font-size:12px}
                      .page{max-width:900px;margin:0 auto;padding:40px 48px}
                      .header{display:flex;justify-content:space-between;align-items:center;border-bottom:3px solid #00288e;padding-bottom:20px;margin-bottom:28px}
                      .logo-area h1{font-size:22px;font-weight:700;color:#00288e;letter-spacing:-0.5px}
                      .logo-area p{font-size:11px;color:#757684;margin-top:2px}
                      .meta{text-align:right;font-size:11px;color:#757684}
                      .meta strong{display:block;color:#1a1a2e;font-size:13px;margin-bottom:2px}
                      .section{margin-bottom:32px}
                      .section-title{font-size:14px;font-weight:700;color:#00288e;border-bottom:1px solid #dce2f3;padding-bottom:6px;margin-bottom:14px;display:flex;align-items:center;gap:6px}
                      .kpi-row{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:20px}
                      .kpi-card{background:#f0f3ff;border-radius:8px;padding:14px;text-align:center}
                      .kpi-card .num{font-size:28px;font-weight:700;color:#00288e}
                      .kpi-card .lbl{font-size:10px;color:#757684;text-transform:uppercase;letter-spacing:.05em;margin-top:3px}
                      table{width:100%;border-collapse:collapse;font-size:11px}
                      thead tr{background:#f0f3ff}
                      th{text-align:left;padding:8px 10px;font-weight:600;color:#444653;font-size:10px;text-transform:uppercase;letter-spacing:.05em}
                      td{padding:7px 10px;border-bottom:1px solid #e7eefe;color:#1a1a2e}
                      tr:last-child td{border-bottom:none}
                      .badge{display:inline-block;padding:2px 8px;border-radius:20px;font-size:10px;font-weight:600}
                      .badge-green{background:#dcfce7;color:#166534}
                      .badge-amber{background:#fef3c7;color:#92400e}
                      .badge-red{background:#fee2e2;color:#991b1b}
                      .badge-blue{background:#dbeafe;color:#1e40af}
                      .bar-row{display:flex;align-items:center;gap:8px;margin-bottom:6px}
                      .bar-label{width:110px;font-size:10px;color:#444653;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
                      .bar-track{flex:1;height:10px;background:#e7eefe;border-radius:5px;overflow:hidden}
                      .bar-fill{height:100%;background:#00288e;border-radius:5px}
                      .bar-val{width:28px;text-align:right;font-size:10px;font-weight:600;color:#1a1a2e}
                      .footer{margin-top:40px;border-top:1px solid #dce2f3;padding-top:14px;text-align:center;font-size:10px;color:#757684}
                      @media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact}}
                    </style></head><body><div class="page">
                    <div class="header">
                      <div class="logo-area"><h1>ITAM Reservio</h1><p>Sistema de Reservas y Control de Préstamos</p></div>
                      <div class="meta"><strong>Reporte Ejecutivo</strong>${now}</div>
                    </div>
                    <div class="section">
                      <div class="section-title">📊 Resumen General</div>
                      <div class="kpi-row">
                        <div class="kpi-card"><div class="num">${reportData.reservas.total}</div><div class="lbl">Total Reservas</div></div>
                        <div class="kpi-card"><div class="num">${reportData.salas.total}</div><div class="lbl">Total Salas</div></div>
                        <div class="kpi-card"><div class="num">${reportData.equipos.total}</div><div class="lbl">Total Equipos</div></div>
                        <div class="kpi-card"><div class="num">${reportData.equipos.disponibles}</div><div class="lbl">Equipos Disponibles</div></div>
                      </div>
                    </div>
                    <div class="section">
                      <div class="section-title">📅 Reservas: Estado</div>
                      <div class="kpi-row">
                        <div class="kpi-card"><div class="num" style="color:#166534">${reportData.reservas.confirmadas}</div><div class="lbl">Confirmadas</div></div>
                        <div class="kpi-card"><div class="num" style="color:#92400e">${reportData.reservas.pendientes}</div><div class="lbl">Pendientes</div></div>
                        <div class="kpi-card"><div class="num" style="color:#991b1b">${reportData.reservas.canceladas}</div><div class="lbl">Canceladas</div></div>
                        <div class="kpi-card"><div class="num">${reportData.salas.disponibles}</div><div class="lbl">Salas Disponibles</div></div>
                      </div>
                      ${reportData.reservas.porMes.length > 0 ? `
                      <div style="margin-top:12px">
                        <div style="font-size:11px;font-weight:600;color:#444653;margin-bottom:8px">Reservas por Mes</div>
                        ${(() => {
                          const mx = Math.max(...reportData.reservas.porMes.map(e => e.total), 1)
                          return reportData.reservas.porMes.map(e => `
                          <div class="bar-row">
                            <div class="bar-label">${e.mes}</div>
                            <div class="bar-track"><div class="bar-fill" style="width:${Math.round((e.total/mx)*100)}%"></div></div>
                            <div class="bar-val">${e.total}</div>
                          </div>`).join('')
                        })()}
                      </div>` : ''}
                    </div>
                    ${reportData.reservas.lista.length > 0 ? `
                    <div class="section">
                      <div class="section-title">📋 Últimas Reservas</div>
                      <table><thead><tr><th>Título</th><th>Fecha</th><th>Sala</th><th>Usuario</th><th>Hora Inicio</th><th>Estado</th></tr></thead>
                      <tbody>${reportData.reservas.lista.slice(0, 30).map(r => `
                        <tr><td>${r.titulo}</td><td>${r.fecha}</td><td>${r.sala_nombre ?? 'N/A'}</td><td>${r.usuario_nombre ?? 'N/A'}</td>
                        <td>${r.hora_inicio.slice(0,5)}</td>
                        <td><span class="badge ${r.estado==='confirmada'?'badge-green':r.estado==='pendiente'?'badge-amber':'badge-red'}">${fmtEstado(r.estado)}</span></td></tr>
                      `).join('')}</tbody></table>
                    </div>` : ''}
                    <div class="section">
                      <div class="section-title">🏢 Salas</div>
                      <table><thead><tr><th>Nombre</th><th>Capacidad</th><th>Ubicación</th><th>Estado</th></tr></thead>
                      <tbody>${reportData.salas.lista.map(s => `
                        <tr><td>${s.nombre}</td><td>${s.capacidad} personas</td><td>${s.ubicacion ?? 'N/A'}</td>
                        <td><span class="badge ${s.estado==='disponible'?'badge-green':s.estado==='ocupada'?'badge-red':'badge-amber'}">${fmtEstado(s.estado)}</span></td></tr>
                      `).join('')}</tbody></table>
                    </div>
                    <div class="section">
                      <div class="section-title">💻 Equipos por Categoría</div>
                      ${reportData.equipos.porCategoria.map(c => {
                        const mx2 = Math.max(...reportData.equipos.porCategoria.map(x => x.total), 1)
                        return `<div class="bar-row">
                          <div class="bar-label">${c.categoria}</div>
                          <div class="bar-track"><div class="bar-fill" style="width:${Math.round((c.total/mx2)*100)}%"></div></div>
                          <div class="bar-val">${c.total}</div>
                        </div>`
                      }).join('')}
                    </div>
                    ${reportData.equipos.lista.length > 0 ? `
                    <div class="section">
                      <div class="section-title">💻 Inventario de Equipos</div>
                      <table><thead><tr><th>Nombre</th><th>Categoría</th><th>Marca</th><th>Tipo</th><th>N/S</th><th>Estado</th></tr></thead>
                      <tbody>${reportData.equipos.lista.slice(0, 50).map(e => `
                        <tr><td>${e.nombre}</td><td>${e.categoria}</td><td>${e.marca||'N/A'}</td><td>${e.tipo_equipo||'N/A'}</td>
                        <td style="font-family:monospace;font-size:10px">${e.numero_serie||'N/A'}</td>
                        <td><span class="badge ${e.estado==='disponible'?'badge-green':e.estado==='reservado'?'badge-blue':'badge-amber'}">${fmtEstado(e.estado)}</span></td></tr>
                      `).join('')}</tbody></table>
                    </div>` : ''}
                    <div class="footer">Generado por ITAM Reservio · ${now} · Sistema de Control de Préstamos y Reservas</div>
                    </div></body></html>`
                  printWin.document.write(html)
                  printWin.document.close()
                  printWin.focus()
                  setTimeout(() => printWin.print(), 600)
                }

                // ── Donut chart helper ────────────────────────────────────
                const donutData = [
                  { label: 'Confirmadas', value: reportData?.reservas.confirmadas ?? 0, color: '#166534' },
                  { label: 'Pendientes',  value: reportData?.reservas.pendientes  ?? 0, color: '#d97706' },
                  { label: 'Canceladas',  value: reportData?.reservas.canceladas  ?? 0, color: '#dc2626' },
                ]

                return (
                <div className="space-y-6">
                  {loadingReports ? (
                    <div className="flex items-center justify-center py-24 gap-3">
                      <span className="h-7 w-7 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                      <span className="font-body text-sm text-on-surface-variant">Generando reportes…</span>
                    </div>
                  ) : !reportData ? (
                    <div className="flex flex-col items-center py-24 gap-4 text-center">
                      <span className="material-symbols-outlined text-5xl text-on-surface-variant/40">analytics</span>
                      <p className="font-body text-sm text-on-surface-variant">No hay datos disponibles</p>
                      <button type="button" onClick={loadReports} className="font-label text-sm text-primary hover:underline">Cargar datos</button>
                    </div>
                  ) : (
                    <>
                      {/* ── Report header ─────────────────────────────────── */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div>
                          <h3 className="font-headline text-xl font-semibold text-on-surface">Reportes &amp; Análisis</h3>
                          <p className="font-body text-sm text-on-surface-variant mt-0.5">Estadísticas de salas, reservas y equipos del sistema.</p>
                        </div>
                        <button type="button"
                          onClick={handleExportPDF}
                          className="inline-flex items-center gap-2 bg-primary text-on-primary px-5 py-2.5 rounded-lg font-label text-sm font-semibold hover:opacity-90 transition-opacity whitespace-nowrap shrink-0"
                        >
                          <span className="material-symbols-outlined text-[18px]">picture_as_pdf</span>
                          Exportar PDF
                        </button>
                      </div>

                      {/* ── Sub-tab navigation ────────────────────────────── */}
                      <div className="flex overflow-x-auto gap-1 border-b border-outline-variant/20 pb-0">
                        {([
                          { id: 'overview',  label: 'Resumen',   icon: 'dashboard' },
                          { id: 'reservas',  label: 'Reservas',  icon: 'event_note' },
                          { id: 'salas',     label: 'Salas',     icon: 'meeting_room' },
                          { id: 'equipos',   label: 'Equipos',   icon: 'devices' },
                        ] as const).map(tab => (
                          <button type="button"
                            key={tab.id}
                            onClick={() => setReportSubTab(tab.id)}
                            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-label font-semibold whitespace-nowrap rounded-t-lg border-b-2 transition-colors ${
                              reportSubTab === tab.id
                                ? 'border-primary text-primary bg-primary/5'
                                : 'border-transparent text-on-surface-variant hover:text-on-surface hover:bg-surface-container/50'
                            }`}
                          >
                            <span className="material-symbols-outlined text-[17px]" style={reportSubTab === tab.id ? { fontVariationSettings: "'FILL' 1" } : undefined}>{tab.icon}</span>
                            {tab.label}
                          </button>
                        ))}
                      </div>

                      {/* ══ OVERVIEW TAB ══════════════════════════════════════ */}
                      {reportSubTab === 'overview' && (
                        <div className="space-y-6">
                          {/* KPI cards */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            {[
                              { label: 'Total Reservas',       value: reportData.reservas.total,    icon: 'event_note',    delta: reportData.reservas.confirmadas > 0 ? `+${reportData.reservas.confirmadas} confirmadas` : undefined, color: 'text-primary bg-primary/10' },
                              { label: 'Tasa de Confirmación', value: reportData.reservas.total > 0 ? `${Math.round((reportData.reservas.confirmadas/reportData.reservas.total)*100)}%` : '0%', icon: 'verified', delta: `${reportData.reservas.confirmadas} de ${reportData.reservas.total}`, color: 'text-green-600 bg-green-50' },
                              { label: 'Equipos en Mantenimiento', value: reportData.equipos.mantenimiento, icon: 'build', delta: reportData.equipos.mantenimiento > 0 ? 'Requiere atención' : 'Todo en orden', color: reportData.equipos.mantenimiento > 0 ? 'text-orange-500 bg-orange-50' : 'text-green-600 bg-green-50' },
                            ].map(kpi => (
                              <div key={kpi.label} className="bg-surface-container-lowest rounded-xl border border-outline-variant/20 p-5 shadow-sm flex flex-col gap-2 relative overflow-hidden group">
                                <div className="absolute top-0 right-0 size-20 bg-primary/3 rounded-bl-full -mr-3 -mt-3 transition-transform group-hover:scale-110" />
                                <div className="flex justify-between items-start">
                                  <span className="font-label text-xs uppercase tracking-widest text-on-surface-variant">{kpi.label}</span>
                                  <span className={`material-symbols-outlined p-1.5 rounded-lg text-[18px] ${kpi.color}`} style={{ fontVariationSettings: "'FILL' 1" }}>{kpi.icon}</span>
                                </div>
                                <span className="font-headline text-3xl font-semibold text-on-surface">{kpi.value}</span>
                                {kpi.delta && <span className="font-body text-xs text-on-surface-variant">{kpi.delta}</span>}
                              </div>
                            ))}
                          </div>

                          {/* Charts row */}
                          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                            {/* Donut chart — Reservation status */}
                            <div className="lg:col-span-5 bg-surface-container-lowest rounded-xl border border-outline-variant/20 p-5 shadow-sm flex flex-col gap-4">
                              <div className="flex justify-between items-center">
                                <h4 className="font-label text-sm font-semibold text-on-surface">Estado de Reservas</h4>
                              </div>
                              <D3DonutChart
                                data={donutData}
                                size={180}
                                showTotal
                                totalLabel="Total"
                              />
                            </div>

                            {/* Bar chart — Reservas por mes */}
                            <div className="lg:col-span-7 bg-surface-container-lowest rounded-xl border border-outline-variant/20 p-5 shadow-sm flex flex-col gap-4">
                              <h4 className="font-label text-sm font-semibold text-on-surface">Reservas por Mes</h4>
                              {(() => {
                                const maxV = Math.max(...reportData.reservas.porMes.map(e => e.total), 1)
                                return (
                                  <div className="flex-1 flex flex-col gap-2">
                                    <div className="flex items-end gap-1.5 h-40 border-b border-l border-outline-variant/30 relative">
                                      {reportData.reservas.porMes.map((entry, i) => (
                                        <div key={entry.mes} className="flex-1 flex flex-col items-center gap-1 h-full justify-end group">
                                          <span className="font-label text-[10px] text-on-surface font-semibold opacity-0 group-hover:opacity-100 transition-opacity">{entry.total}</span>
                                          <div
                                            className={`w-full rounded-t transition-all ${i === reportData.reservas.porMes.length - 1 ? 'bg-primary' : 'bg-primary/50 hover:bg-primary/70'}`}
                                            style={{ height: entry.total > 0 ? `${(entry.total / maxV) * 90}%` : '3px', opacity: entry.total > 0 ? 1 : 0.18 }}
                                          />
                                        </div>
                                      ))}
                                    </div>
                                    <div className="flex gap-1.5">
                                      {reportData.reservas.porMes.map(entry => (
                                        <span key={entry.mes} className="flex-1 text-center font-mono text-[9px] text-on-surface-variant truncate">
                                          {entry.mes.slice(5)}/{entry.mes.slice(2, 4)}
                                        </span>
                                      ))}
                                    </div>
                                  </div>
                                )
                              })()}
                            </div>
                          </div>

                          {/* Equipos por categoría — horizontal bars */}
                          {reportData.equipos.porCategoria.length > 0 && (
                            <div className="bg-surface-container-lowest rounded-xl border border-outline-variant/20 p-5 shadow-sm">
                              <h4 className="font-label text-sm font-semibold text-on-surface mb-4">Equipos por Categoría</h4>
                              <D3HorizontalBars
                                data={reportData.equipos.porCategoria
                                  .toSorted((a, b) => b.total - a.total)
                                  .map(c => ({
                                    label: c.categoria,
                                    displayLabel: (CATEGORIA_LABELS as Record<string, string>)[c.categoria] ?? c.categoria,
                                    available: c.disponibles,
                                    total: c.total,
                                  }))}
                              />
                            </div>
                          )}

                          {/* Salas status mini-cards */}
                          <div className="bg-surface-container-lowest rounded-xl border border-outline-variant/20 p-5 shadow-sm">
                            <h4 className="font-label text-sm font-semibold text-on-surface mb-4">Estado de Salas</h4>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                              {[
                                { label: 'Total',         value: reportData.salas.total,         color: 'bg-primary/10 text-primary' },
                                { label: 'Disponibles',   value: reportData.salas.disponibles,   color: 'bg-green-50 text-green-700' },
                                { label: 'Ocupadas',      value: reportData.salas.ocupadas,      color: 'bg-red-50 text-red-700' },
                                { label: 'Mantenimiento', value: reportData.salas.mantenimiento, color: 'bg-orange-50 text-orange-700' },
                              ].map(s => (
                                <div key={s.label} className={`rounded-lg p-3 text-center ${s.color}`}>
                                  <div className="font-headline text-2xl font-semibold">{s.value}</div>
                                  <div className="font-label text-xs mt-0.5 opacity-80">{s.label}</div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* ══ RESERVAS TAB ══════════════════════════════════════ */}
                      {reportSubTab === 'reservas' && (() => {
                        const q = reportSearchReservas.toLowerCase()
                        const filtered = reportData.reservas.lista.filter(r =>
                          !q || r.titulo.toLowerCase().includes(q) || (r.sala_nombre ?? '').toLowerCase().includes(q) || (r.usuario_nombre ?? '').toLowerCase().includes(q) || r.estado.includes(q) || r.fecha.includes(q)
                        )
                        const totalPages = Math.max(1, Math.ceil(filtered.length / REPORT_PAGE_SIZE))
                        const page = Math.min(reportPageReservas, totalPages)
                        const paged = filtered.slice((page - 1) * REPORT_PAGE_SIZE, page * REPORT_PAGE_SIZE)
                        return (
                          <div className="space-y-5">
                            {/* KPI row */}
                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                              {[
                                { label: 'Total', value: reportData.reservas.total, icon: 'event_note', color: 'text-primary bg-primary/10' },
                                { label: 'Confirmadas', value: reportData.reservas.confirmadas, icon: 'event_available', color: 'text-green-600 bg-green-50' },
                                { label: 'Pendientes', value: reportData.reservas.pendientes, icon: 'pending', color: 'text-amber-500 bg-amber-50' },
                                { label: 'Canceladas', value: reportData.reservas.canceladas, icon: 'event_busy', color: 'text-red-500 bg-red-50' },
                              ].map(s => (
                                <div key={s.label} className="bg-surface-container-lowest rounded-xl p-4 border border-outline-variant/20 shadow-sm">
                                  <div className="flex justify-between items-start mb-2">
                                    <span className="font-label text-xs uppercase tracking-widest text-on-surface-variant">{s.label}</span>
                                    <span className={`material-symbols-outlined p-1.5 rounded-lg text-[18px] ${s.color}`} style={{ fontVariationSettings: "'FILL' 1" }}>{s.icon}</span>
                                  </div>
                                  <span className="font-headline text-3xl font-semibold text-on-surface">{s.value}</span>
                                </div>
                              ))}
                            </div>

                            {/* Line chart por mes */}
                            {reportData.reservas.porMes.length > 0 && (
                              <div className="bg-surface-container-lowest rounded-xl border border-outline-variant/20 p-5 shadow-sm">
                                <h4 className="font-label text-sm font-semibold text-on-surface mb-2">Evolución Mensual de Reservas</h4>
                                <LineChartMonthly data={reportData.reservas.porMes} color="#00288e" height={280} quarterly />
                              </div>
                            )}

                            {/* Search + table */}
                            <div className="bg-surface-container-lowest rounded-xl border border-outline-variant/20 shadow-sm overflow-hidden">
                              <div className="p-4 border-b border-outline-variant/15 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-surface-bright">
                                <h4 className="font-label text-sm font-semibold text-on-surface">Historial de Reservas</h4>
                                <div className="relative w-full sm:w-64">
                                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-[16px]">search</span>
                                  <input aria-label="Buscar reserva por nombre"
                                    type="text"
                                    value={reportSearchReservas}
                                    onChange={e => { setReportSearchReservas(e.target.value); setReportPageReservas(1) }}
                                    placeholder="Buscar reservas…"
                                    className="w-full pl-8 pr-3 py-2 border border-outline-variant/30 rounded-lg text-xs font-body text-on-surface bg-surface-container-lowest focus:outline-none focus:ring-2 focus:ring-primary/30"
                                  />
                                </div>
                              </div>
                              <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse min-w-[700px]">
                                  <thead>
                                    <tr className="bg-surface-container border-b border-outline-variant/20">
                                      <th className="py-3 px-4 font-label text-xs uppercase tracking-widest text-on-surface-variant font-semibold">Título</th>
                                      <th className="py-3 px-4 font-label text-xs uppercase tracking-widest text-on-surface-variant font-semibold">Fecha</th>
                                      <th className="py-3 px-4 font-label text-xs uppercase tracking-widest text-on-surface-variant font-semibold">Sala</th>
                                      <th className="py-3 px-4 font-label text-xs uppercase tracking-widest text-on-surface-variant font-semibold">Usuario</th>
                                      <th className="py-3 px-4 font-label text-xs uppercase tracking-widest text-on-surface-variant font-semibold">Horario</th>
                                      <th className="py-3 px-4 font-label text-xs uppercase tracking-widest text-on-surface-variant font-semibold">Estado</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {paged.length === 0 ? (
                                      <tr><td colSpan={6} className="py-12 text-center font-body text-sm text-on-surface-variant">No se encontraron registros.</td></tr>
                                    ) : paged.map(r => (
                                      <tr key={r.id} className="border-b border-outline-variant/10 hover:bg-surface-container/50 transition-colors">
                                        <td className="py-3 px-4 font-body text-sm text-on-surface font-medium max-w-[160px] truncate">{r.titulo}</td>
                                        <td className="py-3 px-4 font-body text-sm text-on-surface-variant">{r.fecha}</td>
                                        <td className="py-3 px-4 font-body text-sm text-on-surface">{r.sala_nombre ?? <span className="text-on-surface-variant/50">N/A</span>}</td>
                                        <td className="py-3 px-4 font-body text-sm text-on-surface-variant">{r.usuario_nombre ?? 'N/A'}</td>
                                        <td className="py-3 px-4 font-body text-xs text-on-surface-variant">{r.hora_inicio.slice(0,5)} – {r.hora_fin.slice(0,5)}</td>
                                        <td className="py-3 px-4">
                                          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full font-label text-xs font-semibold ${
                                            r.estado === 'confirmada' ? 'bg-green-100 text-green-700'
                                            : r.estado === 'pendiente' ? 'bg-amber-100 text-amber-700'
                                            : 'bg-red-100 text-red-700'
                                          }`}>
                                            <span className={`size-1.5 rounded-full ${r.estado === 'confirmada' ? 'bg-green-500' : r.estado === 'pendiente' ? 'bg-amber-500' : 'bg-red-500'}`} />
                                            {r.estado === 'confirmada' ? 'Confirmada' : r.estado === 'pendiente' ? 'Pendiente' : 'Cancelada'}
                                          </span>
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                              {/* Pagination */}
                              <div className="p-4 flex justify-between items-center bg-surface-bright border-t border-outline-variant/10">
                                <span className="font-body text-xs text-on-surface-variant">Mostrando {paged.length > 0 ? (page-1)*REPORT_PAGE_SIZE+1 : 0}–{Math.min(page*REPORT_PAGE_SIZE, filtered.length)} de {filtered.length}</span>
                                <div className="flex gap-1">
                                  <button type="button" disabled={page <= 1} onClick={() => setReportPageReservas(p => p-1)} className="p-1.5 rounded border border-outline-variant/30 bg-surface-container-lowest text-on-surface-variant hover:bg-surface-container disabled:opacity-40 transition-colors">
                                    <span className="material-symbols-outlined text-[16px]">chevron_left</span>
                                  </button>
                                  {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                                    const pg = totalPages <= 5 ? i+1 : page <= 3 ? i+1 : page >= totalPages-2 ? totalPages-4+i : page-2+i
                                    return <button type="button" key={pg} onClick={() => setReportPageReservas(pg)} className={`px-2.5 py-1 rounded border font-label text-xs transition-colors ${pg === page ? 'bg-primary border-primary text-on-primary' : 'border-outline-variant/30 bg-surface-container-lowest text-on-surface-variant hover:bg-surface-container'}`}>{pg}</button>
                                  })}
                                  <button type="button" disabled={page >= totalPages} onClick={() => setReportPageReservas(p => p+1)} className="p-1.5 rounded border border-outline-variant/30 bg-surface-container-lowest text-on-surface-variant hover:bg-surface-container disabled:opacity-40 transition-colors">
                                    <span className="material-symbols-outlined text-[16px]">chevron_right</span>
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        )
                      })()}

                      {/* ══ SALAS TAB ══════════════════════════════════════════ */}
                      {reportSubTab === 'salas' && (() => {
                        const q = reportSearchSalas.toLowerCase()
                        const filtered = reportData.salas.lista.filter(s =>
                          !q || s.nombre.toLowerCase().includes(q) || (s.ubicacion ?? '').toLowerCase().includes(q) || s.estado.includes(q)
                        )
                        const totalPages = Math.max(1, Math.ceil(filtered.length / REPORT_PAGE_SIZE))
                        const page = Math.min(reportPageSalas, totalPages)
                        const paged = filtered.slice((page - 1) * REPORT_PAGE_SIZE, page * REPORT_PAGE_SIZE)
                        return (
                          <div className="space-y-5">
                            {/* KPI row */}
                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                              {[
                                { label: 'Total', value: reportData.salas.total, icon: 'meeting_room', color: 'text-primary bg-primary/10' },
                                { label: 'Disponibles', value: reportData.salas.disponibles, icon: 'check_circle', color: 'text-green-600 bg-green-50' },
                                { label: 'Ocupadas', value: reportData.salas.ocupadas, icon: 'do_not_disturb_on', color: 'text-red-500 bg-red-50' },
                                { label: 'Mantenimiento', value: reportData.salas.mantenimiento, icon: 'build', color: 'text-orange-500 bg-orange-50' },
                              ].map(s => (
                                <div key={s.label} className="bg-surface-container-lowest rounded-xl p-4 border border-outline-variant/20 shadow-sm">
                                  <div className="flex justify-between items-start mb-2">
                                    <span className="font-label text-xs uppercase tracking-widest text-on-surface-variant">{s.label}</span>
                                    <span className={`material-symbols-outlined p-1.5 rounded-lg text-[18px] ${s.color}`} style={{ fontVariationSettings: "'FILL' 1" }}>{s.icon}</span>
                                  </div>
                                  <span className="font-headline text-3xl font-semibold text-on-surface">{s.value}</span>
                                </div>
                              ))}
                            </div>

                            {/* Ocupación visual */}
                            {reportData.salas.total > 0 && (
                              <div className="bg-surface-container-lowest rounded-xl border border-outline-variant/20 p-5 shadow-sm">
                                <h4 className="font-label text-sm font-semibold text-on-surface mb-3">Distribución de Estado</h4>
                                <div className="flex h-5 rounded-full overflow-hidden gap-0.5">
                                  {reportData.salas.disponibles > 0 && <div className="bg-green-400 transition-all" style={{ flex: reportData.salas.disponibles }} title={`Disponibles: ${reportData.salas.disponibles}`} />}
                                  {reportData.salas.ocupadas > 0 && <div className="bg-red-400 transition-all" style={{ flex: reportData.salas.ocupadas }} title={`Ocupadas: ${reportData.salas.ocupadas}`} />}
                                  {reportData.salas.mantenimiento > 0 && <div className="bg-orange-400 transition-all" style={{ flex: reportData.salas.mantenimiento }} title={`Mantenimiento: ${reportData.salas.mantenimiento}`} />}
                                </div>
                                <div className="flex items-center gap-4 mt-2">
                                  {[{l:'Disponibles',c:'bg-green-400'},{l:'Ocupadas',c:'bg-red-400'},{l:'Mantenimiento',c:'bg-orange-400'}].map(x=>(
                                    <div key={x.l} className="flex items-center gap-1.5"><span className={`w-3 h-2.5 rounded ${x.c}`}/><span className="font-body text-xs text-on-surface-variant">{x.l}</span></div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Search + table */}
                            <div className="bg-surface-container-lowest rounded-xl border border-outline-variant/20 shadow-sm overflow-hidden">
                              <div className="p-4 border-b border-outline-variant/15 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-surface-bright">
                                <h4 className="font-label text-sm font-semibold text-on-surface">Detalle de Salas</h4>
                                <div className="relative w-full sm:w-64">
                                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-[16px]">search</span>
                                  <input aria-label="Filtrar por estado"
                                    type="text"
                                    value={reportSearchSalas}
                                    onChange={e => { setReportSearchSalas(e.target.value); setReportPageSalas(1) }}
                                    placeholder="Buscar salas…"
                                    className="w-full pl-8 pr-3 py-2 border border-outline-variant/30 rounded-lg text-xs font-body text-on-surface bg-surface-container-lowest focus:outline-none focus:ring-2 focus:ring-primary/30"
                                  />
                                </div>
                              </div>
                              <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse min-w-[500px]">
                                  <thead>
                                    <tr className="bg-surface-container border-b border-outline-variant/20">
                                      <th className="py-3 px-4 font-label text-xs uppercase tracking-widest text-on-surface-variant font-semibold">Nombre</th>
                                      <th className="py-3 px-4 font-label text-xs uppercase tracking-widest text-on-surface-variant font-semibold">Capacidad</th>
                                      <th className="py-3 px-4 font-label text-xs uppercase tracking-widest text-on-surface-variant font-semibold">Ubicación</th>
                                      <th className="py-3 px-4 font-label text-xs uppercase tracking-widest text-on-surface-variant font-semibold">Estado</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {paged.length === 0 ? (
                                      <tr><td colSpan={4} className="py-12 text-center font-body text-sm text-on-surface-variant">No se encontraron salas.</td></tr>
                                    ) : paged.map(s => (
                                      <tr key={s.id} className="border-b border-outline-variant/10 hover:bg-surface-container/50 transition-colors">
                                        <td className="py-3 px-4 font-body text-sm text-on-surface font-medium">{s.nombre}</td>
                                        <td className="py-3 px-4 font-body text-sm text-on-surface-variant">{s.capacidad} personas</td>
                                        <td className="py-3 px-4 font-body text-sm text-on-surface-variant">{s.ubicacion ?? 'N/A'}</td>
                                        <td className="py-3 px-4">
                                          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full font-label text-xs font-semibold ${
                                            s.estado === 'disponible' ? 'bg-green-100 text-green-700'
                                            : s.estado === 'ocupada' ? 'bg-red-100 text-red-700'
                                            : 'bg-orange-100 text-orange-700'
                                          }`}>
                                            <span className={`size-1.5 rounded-full ${s.estado === 'disponible' ? 'bg-green-500' : s.estado === 'ocupada' ? 'bg-red-500' : 'bg-orange-500'}`} />
                                            {s.estado.charAt(0).toUpperCase() + s.estado.slice(1)}
                                          </span>
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                              <div className="p-4 flex justify-between items-center bg-surface-bright border-t border-outline-variant/10">
                                <span className="font-body text-xs text-on-surface-variant">Mostrando {paged.length > 0 ? (page-1)*REPORT_PAGE_SIZE+1 : 0}–{Math.min(page*REPORT_PAGE_SIZE, filtered.length)} de {filtered.length}</span>
                                <div className="flex gap-1">
                                  <button type="button" disabled={page <= 1} onClick={() => setReportPageSalas(p => p-1)} className="p-1.5 rounded border border-outline-variant/30 bg-surface-container-lowest text-on-surface-variant hover:bg-surface-container disabled:opacity-40 transition-colors">
                                    <span className="material-symbols-outlined text-[16px]">chevron_left</span>
                                  </button>
                                  {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                                    const pg = totalPages <= 5 ? i+1 : page <= 3 ? i+1 : page >= totalPages-2 ? totalPages-4+i : page-2+i
                                    return <button type="button" key={pg} onClick={() => setReportPageSalas(pg)} className={`px-2.5 py-1 rounded border font-label text-xs transition-colors ${pg === page ? 'bg-primary border-primary text-on-primary' : 'border-outline-variant/30 bg-surface-container-lowest text-on-surface-variant hover:bg-surface-container'}`}>{pg}</button>
                                  })}
                                  <button type="button" disabled={page >= totalPages} onClick={() => setReportPageSalas(p => p+1)} className="p-1.5 rounded border border-outline-variant/30 bg-surface-container-lowest text-on-surface-variant hover:bg-surface-container disabled:opacity-40 transition-colors">
                                    <span className="material-symbols-outlined text-[16px]">chevron_right</span>
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        )
                      })()}

                      {/* ══ EQUIPOS TAB ════════════════════════════════════════ */}
                      {reportSubTab === 'equipos' && (() => {
                        const q = reportSearchEquipos.toLowerCase()
                        const filtered = reportData.equipos.lista.filter(e =>
                          !q || e.nombre.toLowerCase().includes(q) || e.categoria.toLowerCase().includes(q) || e.marca.toLowerCase().includes(q) || (e.numero_serie ?? '').toLowerCase().includes(q) || e.estado.includes(q)
                        )
                        const totalPages = Math.max(1, Math.ceil(filtered.length / REPORT_PAGE_SIZE))
                        const page = Math.min(reportPageEquipos, totalPages)
                        const paged = filtered.slice((page - 1) * REPORT_PAGE_SIZE, page * REPORT_PAGE_SIZE)
                        return (
                          <div className="space-y-5">
                            {/* KPI row */}
                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                              {[
                                { label: 'Total', value: reportData.equipos.total, icon: 'devices', color: 'text-primary bg-primary/10' },
                                { label: 'Disponibles', value: reportData.equipos.disponibles, icon: 'check_circle', color: 'text-green-600 bg-green-50' },
                                { label: 'Reservados', value: reportData.equipos.reservados, icon: 'event_available', color: 'text-primary bg-primary/10' },
                                { label: 'Mantenimiento', value: reportData.equipos.mantenimiento, icon: 'build', color: 'text-orange-500 bg-orange-50' },
                              ].map(s => (
                                <div key={s.label} className="bg-surface-container-lowest rounded-xl p-4 border border-outline-variant/20 shadow-sm">
                                  <div className="flex justify-between items-start mb-2">
                                    <span className="font-label text-xs uppercase tracking-widest text-on-surface-variant">{s.label}</span>
                                    <span className={`material-symbols-outlined p-1.5 rounded-lg text-[18px] ${s.color}`} style={{ fontVariationSettings: "'FILL' 1" }}>{s.icon}</span>
                                  </div>
                                  <span className="font-headline text-3xl font-semibold text-on-surface">{s.value}</span>
                                  {s.label === 'Disponibles' && reportData.equipos.total > 0 && (
                                    <p className="font-label text-[11px] text-on-surface-variant mt-0.5">{Math.round((reportData.equipos.disponibles/reportData.equipos.total)*100)}% del inventario</p>
                                  )}
                                </div>
                              ))}
                            </div>

                            {/* Category chart */}
                            {reportData.equipos.porCategoria.length > 0 && (
                              <div className="bg-surface-container-lowest rounded-xl border border-outline-variant/20 p-5 shadow-sm">
                                <h4 className="font-label text-sm font-semibold text-on-surface mb-4">Disponibilidad por Categoría</h4>
                                <D3HorizontalBars
                                  data={reportData.equipos.porCategoria.toSorted((a, b) => b.total - a.total).map(c => ({
                                    label: c.categoria,
                                    displayLabel: (CATEGORIA_LABELS as Record<string, string>)[c.categoria] ?? c.categoria,
                                    available: c.disponibles,
                                    total: c.total,
                                  }))}
                                />
                              </div>
                            )}

                            {/* Search + table */}
                            <div className="bg-surface-container-lowest rounded-xl border border-outline-variant/20 shadow-sm overflow-hidden">
                              <div className="p-4 border-b border-outline-variant/15 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-surface-bright">
                                <h4 className="font-label text-sm font-semibold text-on-surface">Inventario de Equipos</h4>
                                <div className="relative w-full sm:w-64">
                                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-[16px]">search</span>
                                  <input aria-label="Filtrar por categoría"
                                    type="text"
                                    value={reportSearchEquipos}
                                    onChange={e => { setReportSearchEquipos(e.target.value); setReportPageEquipos(1) }}
                                    placeholder="Buscar equipos…"
                                    className="w-full pl-8 pr-3 py-2 border border-outline-variant/30 rounded-lg text-xs font-body text-on-surface bg-surface-container-lowest focus:outline-none focus:ring-2 focus:ring-primary/30"
                                  />
                                </div>
                              </div>
                              <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse min-w-[650px]">
                                  <thead>
                                    <tr className="bg-surface-container border-b border-outline-variant/20">
                                      <th className="py-3 px-4 font-label text-xs uppercase tracking-widest text-on-surface-variant font-semibold">Nombre</th>
                                      <th className="py-3 px-4 font-label text-xs uppercase tracking-widest text-on-surface-variant font-semibold">Categoría</th>
                                      <th className="py-3 px-4 font-label text-xs uppercase tracking-widest text-on-surface-variant font-semibold">Marca</th>
                                      <th className="py-3 px-4 font-label text-xs uppercase tracking-widest text-on-surface-variant font-semibold">Tipo</th>
                                      <th className="py-3 px-4 font-label text-xs uppercase tracking-widest text-on-surface-variant font-semibold">N/S</th>
                                      <th className="py-3 px-4 font-label text-xs uppercase tracking-widest text-on-surface-variant font-semibold">Estado</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {paged.length === 0 ? (
                                      <tr><td colSpan={6} className="py-12 text-center font-body text-sm text-on-surface-variant">No se encontraron equipos.</td></tr>
                                    ) : paged.map(eq => (
                                      <tr key={eq.id} className="border-b border-outline-variant/10 hover:bg-surface-container/50 transition-colors">
                                        <td className="py-3 px-4 font-body text-sm text-on-surface font-medium max-w-[160px] truncate">{eq.nombre}</td>
                                        <td className="py-3 px-4 font-body text-sm text-on-surface-variant capitalize">{CATEGORIA_LABELS[eq.categoria] ?? eq.categoria}</td>
                                        <td className="py-3 px-4 font-body text-sm text-on-surface-variant">{eq.marca || 'N/A'}</td>
                                        <td className="py-3 px-4 font-body text-sm text-on-surface-variant">{eq.tipo_equipo || 'N/A'}</td>
                                        <td className="py-3 px-4 font-mono text-xs text-on-surface-variant">{eq.numero_serie ?? 'N/A'}</td>
                                        <td className="py-3 px-4">
                                          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full font-label text-xs font-semibold ${
                                            eq.estado === 'disponible' ? 'bg-green-100 text-green-700'
                                            : eq.estado === 'reservado' ? 'bg-blue-100 text-blue-700'
                                            : 'bg-orange-100 text-orange-700'
                                          }`}>
                                            <span className={`size-1.5 rounded-full ${eq.estado === 'disponible' ? 'bg-green-500' : eq.estado === 'reservado' ? 'bg-blue-500' : 'bg-orange-500'}`} />
                                            {eq.estado.charAt(0).toUpperCase() + eq.estado.slice(1)}
                                          </span>
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                              <div className="p-4 flex justify-between items-center bg-surface-bright border-t border-outline-variant/10">
                                <span className="font-body text-xs text-on-surface-variant">Mostrando {paged.length > 0 ? (page-1)*REPORT_PAGE_SIZE+1 : 0}–{Math.min(page*REPORT_PAGE_SIZE, filtered.length)} de {filtered.length}</span>
                                <div className="flex gap-1">
                                  <button type="button" disabled={page <= 1} onClick={() => setReportPageEquipos(p => p-1)} className="p-1.5 rounded border border-outline-variant/30 bg-surface-container-lowest text-on-surface-variant hover:bg-surface-container disabled:opacity-40 transition-colors">
                                    <span className="material-symbols-outlined text-[16px]">chevron_left</span>
                                  </button>
                                  {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                                    const pg = totalPages <= 5 ? i+1 : page <= 3 ? i+1 : page >= totalPages-2 ? totalPages-4+i : page-2+i
                                    return <button type="button" key={pg} onClick={() => setReportPageEquipos(pg)} className={`px-2.5 py-1 rounded border font-label text-xs transition-colors ${pg === page ? 'bg-primary border-primary text-on-primary' : 'border-outline-variant/30 bg-surface-container-lowest text-on-surface-variant hover:bg-surface-container'}`}>{pg}</button>
                                  })}
                                  <button type="button" disabled={page >= totalPages} onClick={() => setReportPageEquipos(p => p+1)} className="p-1.5 rounded border border-outline-variant/30 bg-surface-container-lowest text-on-surface-variant hover:bg-surface-container disabled:opacity-40 transition-colors">
                                    <span className="material-symbols-outlined text-[16px]">chevron_right</span>
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        )
                      })()}
                    </>
                  )}
                </div>
                )
              })()}

            </div>
          )}

          </TabContent>
        </div>
      </main>

      {/* ── Bottom nav (mobile) ────────────────────────────────── */}
      <nav className="md:hidden fixed bottom-0 left-0 w-full bg-surface-container-lowest border-t border-outline-variant/15 shadow-[0_-4px_16px_rgba(23,28,31,0.06)] z-40 flex justify-around items-center h-16 px-2">
        {navItems.map((item) => (
          <button type="button"
            key={item.id}
            onClick={() => { setActiveTab(item.id); if (item.id === 'tech') { loadEquipos(); loadMisPrestamos() } if (item.id === 'rooms') { fetchSalas() } }}
            className={`flex flex-col items-center justify-center w-full h-full gap-0.5 transition-colors
              ${activeTab === item.id ? 'text-primary' : 'text-secondary hover:text-primary'}`}
          >
            <span
              className="material-symbols-outlined text-[22px]"
              style={activeTab === item.id ? { fontVariationSettings: "'FILL' 1" } : undefined}
            >
              {item.icon}
            </span>
            <span className="font-label text-[10px] font-medium">{item.label}</span>
          </button>
        ))}
      </nav>

      {/* ══ MODAL: NUEVA RESERVA ══════════════════════════════════ */}
      {modalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
            onClick={() => { if (!submitting) { setModalOpen(false); setEditingReservaId(null) } }}
          />

          {/* Panel */}
          <div className="relative w-full max-w-xl bg-surface rounded-2xl shadow-2xl border border-outline-variant/20 flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-outline-variant/15">
              <div className="flex items-center gap-3">
                <div className="bg-primary-container text-on-primary size-9 rounded-lg flex items-center justify-center">
                  <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                    event_available
                  </span>
                </div>
                <h2 className="font-headline text-lg font-semibold text-on-surface">{editingReservaId ? 'Editar Reserva' : 'Nueva Reserva'}</h2>
              </div>
              <button type="button"
                onClick={() => { if (!submitting) { setModalOpen(false); setEditingReservaId(null) } }}
                className="p-1.5 rounded-lg hover:bg-surface-container transition-colors text-on-surface-variant"
                aria-label="Cerrar"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmitReserva} className="px-6 py-5 space-y-4 overflow-y-auto flex-1">
              {/* Título */}
              <div>
                <label className="font-label text-xs uppercase tracking-widest text-on-surface-variant block mb-1.5">
                  Título *
                </label>
                <input aria-label="Título de la reserva"
                  type="text"
                  value={form.titulo}
                  onChange={(e) => setForm({ ...form, titulo: e.target.value })}
                  placeholder="Ej: Reunión de equipo Q3"
                  className="w-full rounded-lg border border-outline-variant/40 bg-surface-container-lowest px-3 py-2.5 text-sm font-body text-on-surface placeholder:text-on-surface-variant/60 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition"
                  disabled={submitting}
                />
              </div>

              {/* Sala */}
              <div>
                <label className="font-label text-xs uppercase tracking-widest text-on-surface-variant block mb-1.5">
                  Sala *
                </label>
                <select
                  value={form.sala_id}
                  onChange={(e) => setForm({ ...form, sala_id: e.target.value })}
                  className="w-full rounded-lg border border-outline-variant/40 bg-surface-container-lowest px-3 py-2.5 text-sm font-body text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition appearance-none"
                  disabled={submitting || loadingSalas}
                >
                  <option value="">Selecciona una sala…</option>
                  {salas.map((s) => (
                    <option
                      key={s.id}
                      value={s.id}
                      disabled={s.estado === 'mantenimiento'}
                    >
                      {s.nombre} (cap. {s.capacidad})
                      {s.estado === 'mantenimiento'
                        ? ' (mantenimiento)'
                        : s.disponibilidad === 'ocupada_total'
                          ? ' (sin disponibilidad hoy)'
                          : s.disponibilidad === 'parcial'
                            ? ' (parcialmente ocupada hoy)'
                            : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Fecha */}
              <div>
                <label className="font-label text-xs uppercase tracking-widest text-on-surface-variant block mb-1.5">
                  Fecha *
                </label>
                <input aria-label="Sala para la reserva"
                  type="date"
                  value={form.fecha}
                  min={getBogotaNow().dateStr}
                  onChange={(e) => {
                    const newFecha = e.target.value
                    const { dateStr: localToday } = getBogotaNow()
                    // Si cambia a hoy, limpiar las horas para forzar selección válida
                    if (newFecha === localToday) {
                      setForm(f => ({ ...f, fecha: newFecha, hora_inicio: '', hora_fin: '' }))
                      setDuracionPreset('libre')
                    } else {
                      setForm(f => ({ ...f, fecha: newFecha }))
                    }
                  }}
                  className="w-full rounded-lg border border-outline-variant/40 bg-surface-container-lowest px-3 py-2.5 text-sm font-body text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition"
                  disabled={submitting}
                />
              </div>

              {/* Availability timeline — always visible; shows prompt until sala is chosen */}
              {form.fecha && (
                form.sala_id ? (
                  <AvailabilityTimeline
                    franjas={modalFranjas}
                    horaInicio={form.hora_inicio || undefined}
                    horaFin={form.hora_fin || undefined}
                    loading={loadingFranjas}
                    onSelectWindow={(inicio, fin) => {
                      setForm(f => {
                        const next = { ...f, hora_inicio: inicio }
                        if (duracionPreset !== 'libre' && duracionPreset !== 'dia' && typeof duracionPreset === 'number') {
                          const calculated = addHoras(inicio, duracionPreset)
                          next.hora_fin = calculated <= fin ? calculated : fin
                        } else {
                          next.hora_fin = fin
                        }
                        return next
                      })
                    }}
                  />
                ) : (
                  <div className="rounded-xl border border-outline-variant/20 bg-surface-container-lowest px-4 py-3 flex items-center gap-3 text-sm font-body text-on-surface-variant">
                    <span className="material-symbols-outlined text-[20px] text-outline shrink-0">schedule</span>
                    <span>Selecciona una sala para ver su disponibilidad</span>
                  </div>
                )
              )}

              {/* Duración preestablecida */}
              <div>
                <label className="font-label text-xs uppercase tracking-widest text-on-surface-variant block mb-1.5">
                  Duración
                </label>
                <div className="flex flex-wrap gap-2">
                  {([0.5, 1, 2, 4, 6, 8] as const).map((h) => (
                    <button
                      key={h}
                      type="button"
                      disabled={submitting}
                      onClick={() => {
                        setDuracionPreset(h)
                        if (form.hora_inicio) {
                          const fin = addHoras(form.hora_inicio, h)
                          setForm(f => ({ ...f, hora_fin: fin }))
                        }
                      }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-label font-medium border transition-colors ${
                        duracionPreset === h
                          ? 'bg-primary text-on-primary border-primary'
                          : 'border-outline-variant/40 text-on-surface hover:bg-surface-container'
                      }`}
                    >
                      {h === 0.5 ? '30 min' : h === 1 ? '1 h' : `${h} h`}
                    </button>
                  ))}
                  <button
                    type="button"
                    disabled={submitting}
                    onClick={() => {
                      setDuracionPreset('dia')
                      setForm(f => ({ ...f, hora_inicio: '00:00', hora_fin: '23:59' }))
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-label font-medium border transition-colors ${
                      duracionPreset === 'dia'
                        ? 'bg-primary text-on-primary border-primary'
                        : 'border-outline-variant/40 text-on-surface hover:bg-surface-container'
                    }`}
                  >
                    Día completo
                  </button>
                  <button
                    type="button"
                    disabled={submitting}
                    onClick={() => setDuracionPreset('libre')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-label font-medium border transition-colors ${
                      duracionPreset === 'libre'
                        ? 'bg-primary text-on-primary border-primary'
                        : 'border-outline-variant/40 text-on-surface hover:bg-surface-container'
                    }`}
                  >
                    Libre
                  </button>
                </div>
              </div>

              {/* Horas */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-label text-xs uppercase tracking-widest text-on-surface-variant block mb-1.5">
                    Hora inicio *
                  </label>
                  <input aria-label="Fecha de la reserva"
                    type="time"
                    value={form.hora_inicio}
                    min={(() => {
                      const { dateStr: localToday, timeStr } = getBogotaNow()
                      return form.fecha === localToday ? timeStr : undefined
                    })()}
                    onChange={(e) => {
                      const inicio = e.target.value
                      setForm(f => {
                        const next = { ...f, hora_inicio: inicio }
                        if (duracionPreset !== 'libre' && duracionPreset !== 'dia' && inicio) {
                          next.hora_fin = addHoras(inicio, duracionPreset as number)
                        } else if (duracionPreset === 'dia') {
                          next.hora_inicio = '00:00'
                          next.hora_fin = '23:59'
                        }
                        return next
                      })
                    }}
                    className="w-full rounded-lg border border-outline-variant/40 bg-surface-container-lowest px-3 py-2.5 text-sm font-body text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition"
                    disabled={submitting}
                  />
                </div>
                <div>
                  <label className="font-label text-xs uppercase tracking-widest text-on-surface-variant block mb-1.5">
                    Hora fin *
                  </label>
                  <input aria-label="Notas de la reserva"
                    type="time"
                    value={form.hora_fin}
                    onChange={(e) => {
                      const fin = e.target.value
                      setForm(f => {
                        // Si el usuario cambia la hora de fin manualmente, recalcular duración real
                        // y cambiar preset a 'libre' si no coincide
                        if (f.hora_inicio && fin > f.hora_inicio) {
                          const diff = diffHoras(f.hora_inicio, fin)
                          const isFullDay = f.hora_inicio === '00:00' && fin === '23:59'
                          if (isFullDay) {
                            setDuracionPreset('dia')
                          } else {
                            const match = ([0.5, 1, 2, 4, 6, 8] as number[]).find(h => Math.abs(h - diff) < 0.1)
                            setDuracionPreset(match ?? 'libre')
                          }
                        } else {
                          setDuracionPreset('libre')
                        }
                        return { ...f, hora_fin: fin }
                      })
                    }}
                    className={`w-full rounded-lg border bg-surface-container-lowest px-3 py-2.5 text-sm font-body text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition ${
                      form.hora_fin && form.hora_inicio && form.hora_fin <= form.hora_inicio
                        ? 'border-red-400 bg-red-50/40'
                        : 'border-outline-variant/40'
                    }`}
                    disabled={submitting}
                  />
                </div>
              </div>

              {/* Resumen de duración */}
              {form.hora_inicio && form.hora_fin && form.hora_fin > form.hora_inicio && (
                <div className="flex items-center gap-2 text-xs font-body text-on-surface-variant bg-surface-container rounded-lg px-3 py-2">
                  <span className="material-symbols-outlined text-[15px] text-primary">schedule</span>
                  <span>Duración: <strong className="text-on-surface">{formatDuracion(diffHoras(form.hora_inicio, form.hora_fin))}</strong></span>
                  <span className="mx-1 text-outline-variant">·</span>
                  <span>{form.hora_inicio} → {form.hora_fin}</span>
                </div>
              )}
              {form.hora_fin && form.hora_inicio && form.hora_fin <= form.hora_inicio && (
                <p className="text-xs text-red-500 font-body flex items-center gap-1">
                  <span className="material-symbols-outlined text-[14px]">error</span>
                  La hora de fin debe ser posterior a la de inicio.
                </p>
              )}

              {/* Error */}
              {modalError && (
                <div className="flex items-start gap-2 bg-error-container text-on-error-container rounded-lg px-4 py-3 text-sm font-body">
                  <span className="material-symbols-outlined text-[18px] shrink-0 mt-0.5">error</span>
                  {modalError}
                </div>
              )}

              {/* ── Equipo tecnológico (removido) ─────────────────── */}

              {/* Éxito */}
              {modalSuccess && (
                <div className="flex items-start gap-3 bg-green-50 border border-green-200 rounded-xl px-4 py-3">
                  <span className="material-symbols-outlined text-[22px] text-green-500 shrink-0 mt-0.5" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                  <div>
                    <p className="font-label text-sm font-semibold text-green-800">¡Reserva {editingReservaId ? 'actualizada' : 'creada'} con éxito!</p>
                    <p className="font-body text-xs text-green-700 mt-0.5">Tu reserva ha sido confirmada correctamente.</p>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => { if (!submitting) { setModalOpen(false); setEditingReservaId(null) } }}
                  disabled={submitting}
                  className="flex-1 py-2.5 rounded-lg border border-outline-variant/40 text-on-surface font-label text-sm font-medium hover:bg-surface-container transition-colors disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting || modalSuccess}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg bg-primary text-on-primary font-label text-sm font-medium hover:brightness-105 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? (
                    <>
                      <span className="size-4 animate-spin rounded-full border-2 border-on-primary border-t-transparent" />
                      Guardando…
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-[18px]">{editingReservaId ? 'save' : 'add'}</span>
                      {editingReservaId ? 'Guardar Cambios' : 'Confirmar'}
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ══ HU-08: MODAL PREVIEW SALA ══════════════════════════════ */}
      {previewSala && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
            onClick={() => setPreviewSala(null)}
          />
          <div className="relative w-full max-w-sm bg-surface rounded-2xl shadow-2xl border border-outline-variant/20 overflow-hidden">
            {/* Imagen */}
            <div className="relative h-44 overflow-hidden">
              <img
                src={previewSala.imagen_url || '/rooms/photo-1495576775051-8af0d10f19b1.jpg'}
                alt={previewSala.nombre}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
              <button type="button"
                onClick={() => setPreviewSala(null)}
                className="absolute top-3 right-3 p-1.5 rounded-full bg-black/30 text-white hover:bg-black/50 transition-colors"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            {/* Contenido */}
            <div className="px-6 py-5 space-y-4">
              <div>
                <h3 className="font-headline text-xl font-semibold text-on-surface">{previewSala.nombre}</h3>
                <div className="flex flex-wrap gap-3 mt-2 text-sm font-label text-secondary">
                  <span className="flex items-center gap-1 bg-surface-container px-2 py-1 rounded-md">
                    <span className="material-symbols-outlined text-[14px]">group</span>
                    {previewSala.capacidad} personas
                  </span>
                  {previewSala.ubicacion && (
                    <span className="flex items-center gap-1 bg-surface-container px-2 py-1 rounded-md">
                      <span className="material-symbols-outlined text-[14px]">location_on</span>
                      {previewSala.ubicacion}
                    </span>
                  )}
                </div>
              </div>

              {/* Acciones */}
              <div className="flex flex-col gap-3">
                <button type="button"
                  onClick={() => {
                    setPreviewSala(null)
                    openModal(previewSala?.id)
                  }}
                  disabled={previewSala?.estado === 'mantenimiento'}
                  className="w-full py-3 rounded-xl bg-primary text-on-primary font-label text-sm font-semibold hover:brightness-105 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  <span className="material-symbols-outlined text-[18px]">calendar_add_on</span>
                  {previewSala?.estado === 'mantenimiento'
                    ? 'En mantenimiento'
                    : previewSala?.estado === 'ocupada'
                      ? 'Ver horarios / Reservar'
                      : 'Reservar esta sala'}
                </button>
                <button type="button"
                  onClick={() => setPreviewSala(null)}
                  className="w-full py-3 rounded-xl bg-surface-container text-on-surface font-label text-sm font-medium hover:bg-surface-container-high transition-colors"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══ MODAL: SOLICITAR PRÉSTAMO DE EQUIPO ══════════════════ */}
      {loanModalOpen && loanEquipo && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
            onClick={() => { if (!loanSubmitting) { setLoanModalOpen(false); setLoanEquipo(null) } }}
          />
          <div className="relative w-full max-w-md bg-surface rounded-2xl shadow-2xl border border-outline-variant/20 flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-outline-variant/15">
              <div className="flex items-center gap-3">
                <div className="bg-primary-container text-on-primary size-9 rounded-lg flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>add_shopping_cart</span>
                </div>
                <h2 className="font-headline text-lg font-semibold text-on-surface">Solicitar Equipo</h2>
              </div>
              <button type="button"
                onClick={() => { if (!loanSubmitting) { setLoanModalOpen(false); setLoanEquipo(null) } }}
                className="p-1.5 rounded-lg hover:bg-surface-container transition-colors text-on-surface-variant"
                aria-label="Cerrar"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            {/* Equipment info card */}
            <div className="px-6 pt-4">
              <div className="flex items-center gap-3 bg-surface-container rounded-xl p-3 border border-outline-variant/15">
                {loanEquipo.imagen_url ? (
                  <Image src={loanEquipo.imagen_url} alt={loanEquipo.nombre} width={56} height={56} className="rounded-lg object-cover shrink-0 border border-outline-variant/15" unoptimized />
                ) : (
                  <div className="size-14 rounded-lg bg-surface-container-high flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-on-surface-variant text-[28px]">devices</span>
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-headline font-semibold text-on-surface text-base truncate">{loanEquipo.nombre}</p>
                  <p className="font-label text-xs text-primary uppercase tracking-wide mt-0.5">{TIPO_EQUIPO_LABELS[loanEquipo.tipo_equipo] ?? loanEquipo.tipo_equipo} · {loanEquipo.marca}</p>
                  {loanEquipo.numero_serie && (
                    <code className="text-[10px] font-mono text-on-surface-variant mt-0.5 block">{loanEquipo.numero_serie}</code>
                  )}
                </div>
                <span className="inline-flex items-center gap-1 text-[10px] font-label font-semibold px-2 py-0.5 rounded bg-green-100 text-green-700 shrink-0">
                  <span className="size-1.5 rounded-full bg-green-500" />
                  Disponible
                </span>
              </div>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmitLoan} className="px-6 py-4 space-y-4 overflow-y-auto flex-1">
              <p className="font-label text-xs uppercase tracking-widest text-on-surface-variant">Detalles del préstamo</p>

              {/* Vincular a reserva activa — obligatorio */}
              <div>
                <label className="font-label text-xs text-on-surface-variant block mb-1.5">
                  Vincular a una reserva activa <span className="text-error">*</span>
                </label>
                {reservas.filter(r => r.estado !== 'cancelada').length === 0 ? (
                  <div className="space-y-2">
                    <div className="flex items-start gap-2 bg-surface-container rounded-lg px-3 py-3 text-sm font-body text-on-surface-variant">
                      <span className="material-symbols-outlined text-[18px] text-error shrink-0 mt-0.5">event_busy</span>
                      <span>No tienes reservas activas. Para solicitar un equipo debes tener una sala reservada.</span>
                    </div>
                    {loanEquipo && (
                      <button
                        type="button"
                        onClick={() => {
                          setLoanModalOpen(false)
                          openModal(undefined, undefined, loanEquipo.id)
                        }}
                        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg border border-primary text-primary text-sm font-label font-semibold hover:bg-primary/5 transition"
                      >
                        <span className="material-symbols-outlined text-[18px]">add_circle</span>
                        Crear reserva con este equipo
                      </button>
                    )}
                  </div>
                ) : (
                  <>
                    <select
                      value={loanForm.reserva_id}
                      onChange={e => {
                        const rid = e.target.value
                        const r = reservas.find(x => x.id === rid)
                        if (r) {
                          setLoanForm(f => ({
                            ...f,
                            reserva_id: rid,
                            sala_id: r.salas?.id ?? '',
                            fecha: r.fecha,
                            hora_devolucion: r.hora_fin.slice(0, 5),
                          }))
                        } else {
                          setLoanForm(f => ({ ...f, reserva_id: '', sala_id: '', fecha: '', hora_devolucion: '' }))
                        }
                      }}
                      disabled={loanSubmitting}
                      required
                      className="w-full rounded-lg border border-outline-variant/40 bg-surface-container-lowest px-3 py-2.5 text-sm font-body text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition appearance-none"
                    >
                      <option value="">Selecciona una reserva</option>
                      {reservas.filter(r => r.estado !== 'cancelada').map(r => (
                        <option key={r.id} value={r.id}>
                          {r.titulo} · {r.salas?.nombre ?? 'Sin sala'} · {r.fecha} {r.hora_inicio.slice(0,5)}–{r.hora_fin.slice(0,5)}
                        </option>
                      ))}
                    </select>
                    {loanForm.reserva_id && (
                      <p className="mt-1.5 text-[11px] font-body text-primary flex items-center gap-1">
                        <span className="material-symbols-outlined text-[14px]">link</span>
                        Sala y horario de devolución pre-llenados desde la reserva.
                      </p>
                    )}
                  </>
                )}
              </div>

              {/* Fecha y hora de devolución — se llenan desde la reserva */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-label text-xs text-on-surface-variant block mb-1.5">
                    Fecha de devolución
                  </label>
                  <input aria-label="Buscar equipo"
                    type="date"
                    value={loanForm.fecha}
                    readOnly
                    disabled={loanSubmitting}
                    className="w-full rounded-lg border border-outline-variant/40 bg-surface-container px-3 py-2.5 text-sm font-body text-on-surface-variant cursor-not-allowed"
                    required
                  />
                </div>
                <div>
                  <label className="font-label text-xs text-on-surface-variant block mb-1.5">
                    Hora de devolución <span className="text-error">*</span>
                  </label>
                  <input aria-label="Filtrar por categoría"
                    type="time"
                    value={loanForm.hora_devolucion}
                    readOnly
                    disabled={loanSubmitting}
                    className="w-full rounded-lg border border-outline-variant/40 bg-surface-container px-3 py-2.5 text-sm font-body text-on-surface-variant cursor-not-allowed"
                    required
                  />
                </div>
              </div>

              {/* Notas */}
              <div>
                <label className="font-label text-xs text-on-surface-variant block mb-1.5">
                  Notas
                  <span className="ml-1 text-on-surface-variant/50">(opcional)</span>
                </label>
                <textarea aria-label="Descripción del equipo"
                  value={loanForm.notas}
                  onChange={e => setLoanForm(f => ({ ...f, notas: e.target.value }))}
                  disabled={loanSubmitting}
                  placeholder="Ej: Para presentación del proyecto final…"
                  rows={2}
                  maxLength={300}
                  className="w-full rounded-lg border border-outline-variant/40 bg-surface-container-lowest px-3 py-2.5 text-sm font-body text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition resize-none"
                />
              </div>

              {/* Condición de entrega */}
              <div>
                <label className="font-label text-xs text-on-surface-variant block mb-1.5 uppercase tracking-widest">Condición del equipo al recibirlo *</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {CONDICIONES_ENTREGA.map(c => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setLoanForm(f => ({ ...f, condicion_entrega: c }))}
                      className={`flex items-center gap-1.5 px-3 py-2 rounded-lg border text-xs font-label font-semibold transition-all ${loanForm.condicion_entrega === c ? `${CONDICION_COLOR[c]} ring-2 ring-offset-1 ring-current` : 'border-outline-variant/30 text-on-surface-variant hover:bg-surface-container'}`}
                    >
                      <span className="material-symbols-outlined text-[14px]" style={{ fontVariationSettings: "'FILL' 1" }}>{CONDICION_ICON[c]}</span>
                      {CONDICION_LABEL[c]}
                    </button>
                  ))}
                </div>
                <p className="font-body text-[11px] text-on-surface-variant mt-1.5">Esta condición queda registrada en el acta del préstamo.</p>
              </div>

              {/* Info chip */}
              <div className="flex items-start gap-2 bg-surface-container rounded-lg px-3 py-2.5 text-xs font-body text-on-surface-variant">
                <span className="material-symbols-outlined text-[16px] text-primary shrink-0 mt-0.5">info</span>
                <span>El equipo quedará como <strong>reservado</strong>. Al devolverlo deberás documentar su condición y tomar una foto. Se generará un acta electrónica automáticamente.</span>
              </div>

              {/* Error */}
              {loanError && (
                <div className="flex items-start gap-2 bg-error-container text-on-error-container rounded-lg px-4 py-3 text-sm font-body">
                  <span className="material-symbols-outlined text-[18px] shrink-0 mt-0.5">error</span>
                  {loanError}
                </div>
              )}

              {/* Success */}
              {loanSuccess && (
                <div className="flex items-start gap-3 bg-green-50 border border-green-200 rounded-xl px-4 py-3">
                  <span className="material-symbols-outlined text-[22px] text-green-500 shrink-0 mt-0.5" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                  <div>
                    <p className="font-label text-sm font-semibold text-green-800">¡Préstamo registrado!</p>
                    {loanActa && <p className="font-mono text-xs text-green-600 mt-0.5">Acta: {loanActa}</p>}
                    <p className="font-body text-xs text-green-700 mt-0.5">Se ha enviado confirmación a tu correo. Recuerda devolver el equipo en las mismas condiciones.</p>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => { if (!loanSubmitting) { setLoanModalOpen(false); setLoanEquipo(null) } }}
                  disabled={loanSubmitting}
                  className="flex-1 py-2.5 rounded-lg border border-outline-variant/40 text-on-surface font-label text-sm font-medium hover:bg-surface-container transition-colors disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loanSubmitting || loanSuccess || !loanForm.reserva_id || !loanForm.fecha || !loanForm.hora_devolucion}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg bg-primary text-on-primary font-label text-sm font-medium hover:brightness-105 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loanSubmitting ? (
                    <>
                      <span className="size-4 animate-spin rounded-full border-2 border-on-primary border-t-transparent" />
                      Procesando…
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-[18px]">add_shopping_cart</span>
                      Confirmar préstamo
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ══ MODAL: DEVOLUCIÓN DE EQUIPO ══════════════════════════ */}
      {returnModalOpen && returnPrestamo && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" onClick={() => { if (!returnSubmitting) setReturnModalOpen(false) }} />
          <div className="relative w-full max-w-lg bg-surface rounded-2xl shadow-2xl border border-outline-variant/20 flex flex-col max-h-[92vh]">

            {/* Header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-outline-variant/15">
              <div className="flex items-center gap-3">
                <div className="bg-primary/10 text-primary size-9 rounded-lg flex items-center justify-center">
                  <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>assignment_return</span>
                </div>
                <div>
                  <h2 className="font-headline text-base font-semibold text-on-surface">Devolver equipo</h2>
                  {returnPrestamo.num_acta && <p className="font-mono text-[11px] text-on-surface-variant">{returnPrestamo.num_acta}</p>}
                </div>
              </div>
              <button type="button" onClick={() => { if (!returnSubmitting) setReturnModalOpen(false) }} className="p-1.5 rounded-lg hover:bg-surface-container transition-colors text-on-surface-variant">
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            {/* Step indicator */}
            {!returnSuccess && (
              <div className="flex items-center gap-1 px-6 py-3 border-b border-outline-variant/10 bg-surface-container/30">
                {([1, 2, 3] as const).map(s => (
                  <div key={s} className="flex items-center gap-1">
                    <div className={`size-6 rounded-full flex items-center justify-center text-[11px] font-label font-bold transition-colors ${returnStep >= s ? 'bg-primary text-on-primary' : 'bg-surface-container text-on-surface-variant'}`}>{s}</div>
                    <span className={`text-[11px] font-label hidden sm:block ${returnStep >= s ? 'text-primary font-semibold' : 'text-on-surface-variant'}`}>
                      {s === 1 ? 'Condición' : s === 2 ? 'Documentación' : 'Confirmar'}
                    </span>
                    {s < 3 && <div className={`w-8 h-px mx-1 ${returnStep > s ? 'bg-primary' : 'bg-outline-variant/30'}`} />}
                  </div>
                ))}
              </div>
            )}

            <div className="overflow-y-auto flex-1 px-6 py-5">
              {/* Equipo info */}
              <div className="flex items-center gap-3 mb-5 p-3 bg-surface-container rounded-xl">
                {returnPrestamo.equipos?.imagen_url ? (
                  <Image src={returnPrestamo.equipos.imagen_url} alt="" width={48} height={48} className="rounded-lg object-cover border border-outline-variant/15 shrink-0" unoptimized />
                ) : (
                  <div className="size-12 rounded-lg bg-surface-container-high flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-on-surface-variant text-[24px]">devices</span>
                  </div>
                )}
                <div>
                  <p className="font-body font-semibold text-sm text-on-surface">{returnPrestamo.equipos?.nombre}</p>
                  <p className="font-body text-xs text-on-surface-variant">{returnPrestamo.equipos?.marca} · {returnPrestamo.equipos?.tipo_equipo}</p>
                  <div className="flex items-center gap-1.5 mt-1">
                    <span className={`inline-flex items-center gap-0.5 text-[10px] font-label font-semibold px-1.5 py-0.5 rounded border ${CONDICION_COLOR[returnPrestamo.condicion_entrega ?? 'bueno']}`}>
                      <span className="material-symbols-outlined text-[10px]" style={{ fontVariationSettings: "'FILL' 1" }}>{CONDICION_ICON[returnPrestamo.condicion_entrega ?? 'bueno']}</span>
                      Al prestar: {CONDICION_LABEL[returnPrestamo.condicion_entrega ?? 'bueno']}
                    </span>
                  </div>
                </div>
              </div>

              {/* ── STEP 1: Condición de devolución ─────────────── */}
              {returnStep === 1 && !returnSuccess && (
                <div className="space-y-4">
                  <div>
                    <p className="font-label text-xs font-semibold text-on-surface uppercase tracking-widest mb-3">¿En qué condición devuelves el equipo?</p>
                    <div className="grid grid-cols-2 gap-2">
                      {CONDICIONES_DEVOLUCION.map(c => (
                        <button type="button"
                          key={c}
                          onClick={() => {
                            setReturnCondicion(c)
                            if (['dano_leve','dano_grave','perdido'].includes(c)) setReturnNovedad(true)
                            else setReturnNovedad(false)
                          }}
                          className={`flex items-center gap-2 px-3 py-3 rounded-xl border text-sm font-label font-semibold transition-all text-left ${returnCondicion === c ? `${CONDICION_COLOR[c]} ring-2 ring-offset-1 ring-current` : 'border-outline-variant/30 text-on-surface-variant hover:bg-surface-container'}`}
                        >
                          <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>{CONDICION_ICON[c]}</span>
                          <span>{CONDICION_LABEL[c]}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Auto-novedad warning */}
                  {['dano_leve','dano_grave','perdido'].includes(returnCondicion) && (
                    <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2.5 text-xs font-body text-amber-800">
                      <span className="material-symbols-outlined text-[15px] text-amber-500 shrink-0 mt-0.5">warning</span>
                      Se registrará automáticamente una <strong>novedad</strong> y se notificará al equipo de TI.
                    </div>
                  )}

                  <button type="button" onClick={() => setReturnStep(2)} className="w-full py-2.5 rounded-xl bg-primary text-on-primary font-label font-semibold text-sm hover:opacity-90 transition">
                    Continuar →
                  </button>
                </div>
              )}

              {/* ── STEP 2: Documentación ───────────────────────── */}
              {returnStep === 2 && !returnSuccess && (
                <div className="space-y-4">
                  {/* Foto de devolución */}
                  <div>
                    <label className="font-label text-xs font-semibold text-on-surface uppercase tracking-widest block mb-2">
                      Foto del equipo
                      {['dano_leve','dano_grave'].includes(returnCondicion) && <span className="ml-1 text-red-500">*</span>}
                    </label>
                    {returnFotoPreview ? (
                      <div className="relative">
                        <img src={returnFotoPreview} alt="preview" className="w-full h-40 object-cover rounded-xl border border-outline-variant/20" />
                        <button type="button" onClick={() => { setReturnFotoFile(null); setReturnFotoPreview(null) }} className="absolute top-2 right-2 bg-black/50 text-white p-1 rounded-full hover:bg-black/70 transition">
                          <span className="material-symbols-outlined text-[16px]">close</span>
                        </button>
                      </div>
                    ) : (
                      <label htmlFor="field-mm-20" className="flex flex-col items-center gap-2 py-8 border-2 border-dashed border-outline-variant/40 rounded-xl cursor-pointer hover:border-primary/50 hover:bg-surface-container/30 transition">
                        <span className="material-symbols-outlined text-on-surface-variant text-4xl">add_a_photo</span>
                        <span className="font-body text-sm text-on-surface-variant">Toca para adjuntar foto</span>
                        <span className="font-body text-xs text-on-surface-variant/60">JPG, PNG, WEBP · máx 10 MB</span>
                        <input aria-label="Nombre del solicitante" id="field-mm-20"
                          type="file"
                          accept="image/*"
                          capture="environment"
                          className="hidden"
                          onChange={e => {
                            const f = e.target.files?.[0]
                            if (f) {
                              setReturnFotoFile(f)
                              setReturnFotoPreview(URL.createObjectURL(f))
                            }
                          }}
                        />
                      </label>
                    )}
                    <p className="font-body text-[11px] text-on-surface-variant mt-1">Obligatoria. Toma la foto ahora mostrando el estado visible completo del equipo.</p>
                  </div>

                  {/* Observaciones */}
                  <div>
                    <label htmlFor="field-mm-21" className="font-label text-xs font-semibold text-on-surface uppercase tracking-widest block mb-1.5">Observaciones <span className="text-on-surface-variant font-normal">(opcional)</span></label>
                    <textarea aria-label="Descripción de la devolución" id="field-mm-21"
                      value={returnObservaciones}
                      onChange={e => setReturnObservaciones(e.target.value)}
                      rows={3}
                      maxLength={500}
                      placeholder="Describe cualquier detalle relevante sobre el estado del equipo al momento de la devolución…"
                      className="w-full rounded-lg border border-outline-variant/40 bg-surface-container-lowest px-3 py-2.5 text-sm font-body text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition resize-none"
                    />
                  </div>

                  {/* Novedad toggle */}
                  <div className="border border-outline-variant/20 rounded-xl overflow-hidden">
                    <button type="button"
                      onClick={() => setReturnNovedad(v => !v)}
                      className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-label font-semibold transition-colors ${returnNovedad ? 'bg-amber-50 text-amber-800' : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-low'}`}
                    >
                      <span className="material-symbols-outlined text-[18px]" style={{ fontVariationSettings: `'FILL' ${returnNovedad ? 1 : 0}` }}>warning</span>
                      Reportar novedad o incidencia
                      <span className="ml-auto material-symbols-outlined text-[18px]">{returnNovedad ? 'expand_less' : 'expand_more'}</span>
                    </button>
                    {returnNovedad && (
                      <div className="px-4 py-3 bg-amber-50/50 space-y-3">
                        <div>
                          <label htmlFor="field-mm-22" className="font-label text-xs text-on-surface-variant block mb-1">Tipo de novedad</label>
                          <select id="field-mm-22" value={returnTipoNovedad} onChange={e => setReturnTipoNovedad(e.target.value as TipoNovedad)} className="w-full rounded-lg border border-outline-variant/40 bg-white px-3 py-2 text-sm font-body focus:outline-none focus:ring-2 focus:ring-amber-400/40 appearance-none">
                            {TIPOS_NOVEDAD.map(t => <option key={t} value={t}>{NOVEDAD_LABEL[t]}</option>)}
                          </select>
                        </div>
                        <div>
                          <label htmlFor="field-mm-23" className="font-label text-xs text-on-surface-variant block mb-1">Descripción detallada <span className="text-red-500">*</span></label>
                          <textarea aria-label="Notas de la devolución" id="field-mm-23"
                            value={returnDescNovedad}
                            onChange={e => setReturnDescNovedad(e.target.value)}
                            rows={2}
                            maxLength={300}
                            placeholder="Describe qué ocurrió con el equipo…"
                            className={`w-full rounded-lg border px-3 py-2.5 text-sm font-body focus:outline-none focus:ring-2 focus:ring-amber-400/40 transition resize-none bg-white ${!returnDescNovedad.trim() ? 'border-red-300' : 'border-outline-variant/40'}`}
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <button type="button" onClick={() => setReturnStep(1)} className="px-4 py-2.5 rounded-xl border border-outline-variant/30 text-sm font-label text-on-surface-variant hover:bg-surface-container transition">← Atrás</button>
                    <button type="button"
                      onClick={() => setReturnStep(3)}
                      disabled={!returnFotoFile || (returnNovedad && !returnDescNovedad.trim())}
                      className="flex-1 py-2.5 rounded-xl bg-primary text-on-primary font-label font-semibold text-sm hover:opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed"
                      title={!returnFotoFile ? 'La foto es obligatoria' : (returnNovedad && !returnDescNovedad.trim()) ? 'Describe la novedad' : undefined}
                    >
                      Continuar → Revisar
                    </button>
                  </div>
                </div>
              )}

              {/* ── STEP 3: Confirmar ───────────────────────────── */}
              {returnStep === 3 && !returnSuccess && (
                <div className="space-y-4">
                  <p className="font-label text-xs font-semibold text-on-surface uppercase tracking-widest">Resumen del acta de devolución</p>
                  <div className="bg-surface-container rounded-xl p-4 space-y-2.5 text-sm font-body">
                    <div className="flex justify-between">
                      <span className="text-on-surface-variant">Condición de entrega</span>
                      <span className={`font-semibold px-2 py-0.5 rounded text-xs border ${CONDICION_COLOR[returnPrestamo.condicion_entrega ?? 'bueno']}`}>{CONDICION_LABEL[returnPrestamo.condicion_entrega ?? 'bueno']}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-on-surface-variant">Condición de devolución</span>
                      <span className={`font-semibold px-2 py-0.5 rounded text-xs border ${CONDICION_COLOR[returnCondicion]}`}>{CONDICION_LABEL[returnCondicion]}</span>
                    </div>
                    {returnObservaciones && (
                      <div><span className="text-on-surface-variant text-xs">Observaciones: </span><span className="text-on-surface text-xs">{returnObservaciones}</span></div>
                    )}
                    {returnFotoFile && (
                      <div className="flex items-center gap-1.5 text-xs text-green-700">
                        <span className="material-symbols-outlined text-[14px]">check_circle</span> Foto adjunta: {returnFotoFile.name}
                      </div>
                    )}
                    {returnNovedad && (
                      <div className="flex items-center gap-1.5 text-xs text-amber-700 bg-amber-50 rounded-lg px-2 py-1.5">
                        <span className="material-symbols-outlined text-[14px]">warning</span>
                        Novedad: {NOVEDAD_LABEL[returnTipoNovedad]} {returnDescNovedad ? `· ${returnDescNovedad.slice(0,60)}…` : ''}
                      </div>
                    )}
                  </div>

                  {/* Acknowledgment */}
                  <label htmlFor="field-mm-24" className="flex items-start gap-3 cursor-pointer p-3 rounded-xl border border-outline-variant/20 hover:bg-surface-container/30 transition">
                    <input aria-label="Número de acta" id="field-mm-24"
                      type="checkbox"
                      checked={returnConfirmed}
                      onChange={e => setReturnConfirmed(e.target.checked)}
                      className="mt-0.5 size-4 accent-primary"
                    />
                    <span className="font-body text-xs text-on-surface leading-relaxed">
                      Confirmo que la información registrada es correcta y que entrego el equipo al área de TI en las condiciones indicadas. Comprendo que cualquier diferencia con la condición de entrega puede generar responsabilidad a mi nombre.
                    </span>
                  </label>

                  {returnError && (
                    <div className="flex items-start gap-2 bg-error-container text-on-error-container rounded-lg px-4 py-3 text-sm font-body">
                      <span className="material-symbols-outlined text-[18px] shrink-0 mt-0.5">error</span>{returnError}
                    </div>
                  )}

                  <div className="flex gap-2">
                    <button type="button" onClick={() => setReturnStep(2)} disabled={returnSubmitting} className="px-4 py-2.5 rounded-xl border border-outline-variant/30 text-sm font-label text-on-surface-variant hover:bg-surface-container transition disabled:opacity-50">← Atrás</button>
                    <button type="button"
                      onClick={handleSubmitDevolucion}
                      disabled={!returnConfirmed || returnSubmitting}
                      className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl font-label font-semibold text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed ${returnNovedad ? 'bg-amber-600 text-white hover:bg-amber-700' : 'bg-primary text-on-primary hover:opacity-90'}`}
                    >
                      {returnSubmitting ? (
                        <><span className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent" />Procesando…</>
                      ) : (
                        <><span className="material-symbols-outlined text-[18px]">send</span>{returnNovedad ? 'Devolver y reportar novedad' : 'Confirmar devolución'}</>
                      )}
                    </button>
                  </div>
                </div>
              )}

              {/* ── SUCCESS ─────────────────────────────────────── */}
              {returnSuccess && (
                <div className="flex flex-col items-center gap-4 py-4 text-center">
                  <div className={`size-16 rounded-full flex items-center justify-center ${returnNovedad ? 'bg-amber-100' : 'bg-green-100'}`}>
                    <span className={`material-symbols-outlined text-4xl ${returnNovedad ? 'text-amber-600' : 'text-green-600'}`} style={{ fontVariationSettings: "'FILL' 1" }}>
                      {returnNovedad ? 'report' : 'check_circle'}
                    </span>
                  </div>
                  <div>
                    <p className="font-headline text-base font-semibold text-on-surface">{returnNovedad ? 'Devolución registrada con novedad' : '¡Devolución registrada!'}</p>
                    {returnSuccess.numActa && <p className="font-mono text-xs text-on-surface-variant mt-1">Acta: {returnSuccess.numActa}</p>}
                    <p className="font-body text-sm text-on-surface-variant mt-2">
                      {returnNovedad
                        ? 'El equipo de TI ha sido notificado y revisará la novedad reportada. Recibirás un correo de confirmación.'
                        : 'Hemos enviado la confirmación a tu correo. ¡Gracias por devolver el equipo correctamente!'}
                    </p>
                  </div>
                  <button type="button" onClick={() => setReturnModalOpen(false)} className="px-6 py-2.5 rounded-xl bg-primary text-on-primary font-label font-semibold text-sm hover:opacity-90 transition">
                    Cerrar
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ══ MODAL: DEVOLUCIÓN ADMIN ═══════════════════════════════ */}
      {adminReturnModalOpen && adminReturnPrestamo && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" onClick={() => { if (!adminReturnSubmitting) setAdminReturnModalOpen(false) }} />
          <div className="relative w-full max-w-lg bg-surface rounded-2xl shadow-2xl border border-outline-variant/20 flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-outline-variant/15">
              <div className="flex items-center gap-3">
                <div className="bg-primary/10 text-primary size-9 rounded-lg flex items-center justify-center">
                  <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>manage_accounts</span>
                </div>
                <div>
                  <h2 className="font-headline text-base font-semibold text-on-surface">Registrar devolución (Admin)</h2>
                  {adminReturnPrestamo.num_acta && <p className="font-mono text-[11px] text-on-surface-variant">{adminReturnPrestamo.num_acta}</p>}
                </div>
              </div>
              <button type="button" onClick={() => { if (!adminReturnSubmitting) setAdminReturnModalOpen(false) }} className="p-1.5 rounded-lg hover:bg-surface-container transition-colors text-on-surface-variant">
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <div className="overflow-y-auto flex-1 px-6 py-5 space-y-5">
              {/* Equipo + usuario info */}
              <div className="flex items-center gap-3 p-3 bg-surface-container rounded-xl">
                {adminReturnPrestamo.equipos?.imagen_url ? (
                  <Image src={adminReturnPrestamo.equipos.imagen_url} alt="" width={48} height={48} className="rounded-lg object-cover border border-outline-variant/15 shrink-0" unoptimized />
                ) : (
                  <div className="size-12 rounded-lg bg-surface-container-high flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-on-surface-variant text-[24px]">devices</span>
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-body font-semibold text-sm text-on-surface">{adminReturnPrestamo.equipos?.nombre}</p>
                  <p className="font-body text-xs text-on-surface-variant">{adminReturnPrestamo.equipos?.tipo_equipo}</p>
                  <p className="font-body text-xs text-primary mt-0.5">{adminReturnPrestamo.usuarios?.nombre} · {adminReturnPrestamo.usuarios?.correo}</p>
                </div>
                <span className={`inline-flex items-center gap-0.5 text-[10px] font-label font-semibold px-1.5 py-0.5 rounded border ${CONDICION_COLOR[adminReturnPrestamo.condicion_entrega ?? 'bueno']}`}>
                  <span className="material-symbols-outlined text-[10px]" style={{ fontVariationSettings: "'FILL' 1" }}>{CONDICION_ICON[adminReturnPrestamo.condicion_entrega ?? 'bueno']}</span>
                  Al prestar: {CONDICION_LABEL[adminReturnPrestamo.condicion_entrega ?? 'bueno']}
                </span>
              </div>

              {/* Condición de devolución */}
              <div>
                <label className="font-label text-xs font-semibold text-on-surface uppercase tracking-widest block mb-2">Condición al devolver *</label>
                <div className="grid grid-cols-2 gap-2">
                  {CONDICIONES_DEVOLUCION.map(c => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => {
                        setAdminReturnCondicion(c)
                        if (['dano_leve','dano_grave','perdido'].includes(c)) setAdminReturnNovedad(true)
                      }}
                      className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm font-label font-semibold transition-all text-left ${adminReturnCondicion === c ? `${CONDICION_COLOR[c]} ring-2 ring-offset-1 ring-current` : 'border-outline-variant/30 text-on-surface-variant hover:bg-surface-container'}`}
                    >
                      <span className="material-symbols-outlined text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>{CONDICION_ICON[c]}</span>
                      {CONDICION_LABEL[c]}
                    </button>
                  ))}
                </div>
              </div>

              {/* Notas admin */}
              <div>
                <label htmlFor="field-mm-25" className="font-label text-xs font-semibold text-on-surface uppercase tracking-widest block mb-1.5">Notas internas del equipo de TI</label>
                <textarea aria-label="Condición de entrega" id="field-mm-25"
                  value={adminReturnNotas}
                  onChange={e => setAdminReturnNotas(e.target.value)}
                  rows={3}
                  maxLength={500}
                  placeholder="Registra observaciones sobre el estado del equipo, acción a tomar, responsable, etc."
                  className="w-full rounded-lg border border-outline-variant/40 bg-surface-container-lowest px-3 py-2.5 text-sm font-body text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition resize-none"
                />
              </div>

              {/* Novedad toggle */}
              <div className="border border-outline-variant/20 rounded-xl overflow-hidden">
                <button
                  type="button"
                  onClick={() => setAdminReturnNovedad(v => !v)}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-label font-semibold transition-colors ${adminReturnNovedad ? 'bg-amber-50 text-amber-800' : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-low'}`}
                >
                  <span className="material-symbols-outlined text-[18px]" style={{ fontVariationSettings: `'FILL' ${adminReturnNovedad ? 1 : 0}` }}>warning</span>
                  Registrar novedad / incidencia
                  <span className="ml-auto material-symbols-outlined text-[18px]">{adminReturnNovedad ? 'expand_less' : 'expand_more'}</span>
                </button>
                {adminReturnNovedad && (
                  <div className="px-4 py-3 bg-amber-50/50 space-y-3">
                    <div>
                      <label htmlFor="field-mm-26" className="font-label text-xs text-on-surface-variant block mb-1">Tipo de novedad</label>
                      <select id="field-mm-26" value={adminReturnTipoNovedad} onChange={e => setAdminReturnTipoNovedad(e.target.value)} className="w-full rounded-lg border border-outline-variant/40 bg-white px-3 py-2 text-sm font-body focus:outline-none focus:ring-2 focus:ring-amber-400/40 appearance-none">
                        {TIPOS_NOVEDAD.map(t => <option key={t} value={t}>{NOVEDAD_LABEL[t]}</option>)}
                      </select>
                    </div>
                    <div>
                      <label htmlFor="field-mm-27" className="font-label text-xs text-on-surface-variant block mb-1">Descripción <span className="text-red-500">*</span></label>
                      <textarea aria-label="Condición de devolución" id="field-mm-27"
                        value={adminReturnDescNovedad}
                        onChange={e => setAdminReturnDescNovedad(e.target.value)}
                        rows={2}
                        maxLength={300}
                        placeholder="Describe la novedad con detalle para el registro oficial…"
                        className={`w-full rounded-lg border px-3 py-2.5 text-sm font-body focus:outline-none focus:ring-2 focus:ring-amber-400/40 transition resize-none bg-white ${adminReturnNovedad && !adminReturnDescNovedad.trim() ? 'border-red-300' : 'border-outline-variant/40'}`}
                      />
                    </div>
                  </div>
                )}
              </div>

              {adminReturnError && (
                <div className="flex items-start gap-2 bg-error-container text-on-error-container rounded-lg px-4 py-3 text-sm font-body">
                  <span className="material-symbols-outlined text-[18px] shrink-0 mt-0.5">error</span>
                  {adminReturnError}
                </div>
              )}

              <div className="flex gap-3 pb-1">
                <button
                  type="button"
                  onClick={() => setAdminReturnModalOpen(false)}
                  disabled={adminReturnSubmitting}
                  className="px-5 py-2.5 rounded-xl border border-outline-variant/30 text-sm font-label text-on-surface-variant hover:bg-surface-container transition disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleSubmitDevolucionAdmin}
                  disabled={adminReturnSubmitting || (adminReturnNovedad && !adminReturnDescNovedad.trim())}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl font-label font-semibold text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed ${adminReturnNovedad ? 'bg-amber-600 text-white hover:bg-amber-700' : 'bg-primary text-on-primary hover:opacity-90'}`}
                >
                  {adminReturnSubmitting ? (
                    <><span className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent" />Procesando…</>
                  ) : (
                    <><span className="material-symbols-outlined text-[18px]">send</span>{adminReturnNovedad ? 'Registrar con novedad' : 'Confirmar devolución'}</>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══ MODAL: CONFIRMACIÓN DE REVISIÓN ══════════════════════════ */}
      {revisionModalOpen && revisionPrestamo && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" onClick={() => { if (!revisionSubmitting) setRevisionModalOpen(false) }} />
          <div className="relative w-full max-w-lg bg-surface rounded-2xl shadow-2xl border border-outline-variant/20 flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-outline-variant/15">
              <div className="flex items-center gap-3">
                <div className="bg-orange-100 text-orange-700 size-9 rounded-lg flex items-center justify-center">
                  <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>fact_check</span>
                </div>
                <div>
                  <h2 className="font-headline text-base font-semibold text-on-surface">Revisar devolución del equipo</h2>
                  {revisionPrestamo.num_acta && <p className="font-mono text-[11px] text-on-surface-variant">{revisionPrestamo.num_acta}</p>}
                </div>
              </div>
              <button type="button" onClick={() => { if (!revisionSubmitting) setRevisionModalOpen(false) }} className="p-1.5 rounded-lg hover:bg-surface-container transition-colors text-on-surface-variant">
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <div className="overflow-y-auto flex-1 px-6 py-5 space-y-5">
              {/* Equipo + usuario info */}
              <div className="flex items-center gap-3 p-3 bg-surface-container rounded-xl">
                {revisionPrestamo.equipos?.imagen_url ? (
                  <Image src={revisionPrestamo.equipos.imagen_url} alt="" width={48} height={48} className="rounded-lg object-cover border border-outline-variant/15 shrink-0" unoptimized />
                ) : (
                  <div className="size-12 rounded-lg bg-surface-container-high flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-on-surface-variant text-[24px]">devices</span>
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-body font-semibold text-sm text-on-surface">{revisionPrestamo.equipos?.nombre}</p>
                  <p className="font-body text-xs text-on-surface-variant">{revisionPrestamo.equipos?.tipo_equipo}</p>
                  <p className="font-body text-xs text-primary mt-0.5">{revisionPrestamo.usuarios?.nombre} · {revisionPrestamo.usuarios?.correo}</p>
                </div>
                <span className={`inline-flex items-center gap-0.5 text-[10px] font-label font-semibold px-1.5 py-0.5 rounded border ${CONDICION_COLOR[revisionPrestamo.condicion_entrega ?? 'bueno']}`}>
                  Al prestar: {CONDICION_LABEL[revisionPrestamo.condicion_entrega ?? 'bueno']}
                </span>
              </div>

              {/* Condición reportada por el usuario */}
              {revisionPrestamo.condicion_devolucion && (
                <div className="flex items-start gap-3 p-3 bg-blue-50 border border-blue-200 rounded-xl">
                  <span className="material-symbols-outlined text-blue-600 text-[18px] mt-0.5" style={{ fontVariationSettings: "'FILL' 1" }}>info</span>
                  <div>
                    <p className="font-label text-xs font-semibold text-blue-800 uppercase tracking-wide">Reportado por el usuario</p>
                    <p className="font-body text-sm text-blue-700 mt-0.5">
                      Condición: <strong>{CONDICION_LABEL[revisionPrestamo.condicion_devolucion]}</strong>
                    </p>
                    {revisionPrestamo.observaciones_devolucion && (
                      <p className="font-body text-xs text-blue-600 mt-1">{revisionPrestamo.observaciones_devolucion}</p>
                    )}
                    {revisionPrestamo.novedad && revisionPrestamo.descripcion_novedad && (
                      <p className="font-body text-xs text-orange-700 mt-1 font-medium">Novedad: {revisionPrestamo.descripcion_novedad}</p>
                    )}
                  </div>
                  {revisionPrestamo.foto_devolucion_url && (
                    <a href={revisionPrestamo.foto_devolucion_url} target="_blank" rel="noopener noreferrer" className="ml-auto shrink-0 inline-flex items-center gap-1 px-2 py-1 bg-white border border-blue-200 rounded-lg text-xs text-blue-700 font-label hover:bg-blue-50 transition">
                      <span className="material-symbols-outlined text-[14px]">photo_camera</span>Foto
                    </a>
                  )}
                </div>
              )}

              {/* Condición confirmada por admin */}
              <div>
                <label className="font-label text-xs font-semibold text-on-surface uppercase tracking-widest block mb-2">Condición física verificada por admin *</label>
                <div className="grid grid-cols-2 gap-2">
                  {CONDICIONES_DEVOLUCION.map(c => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => {
                        setRevisionCondicion(c)
                        if (['dano_leve', 'dano_grave', 'perdido'].includes(c)) setRevisionNovedad(true)
                      }}
                      className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm font-label font-semibold transition-all text-left ${revisionCondicion === c ? `${CONDICION_COLOR[c]} ring-2 ring-offset-1 ring-current` : 'border-outline-variant/30 text-on-surface-variant hover:bg-surface-container'}`}
                    >
                      <span className="material-symbols-outlined text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>{CONDICION_ICON[c]}</span>
                      {CONDICION_LABEL[c]}
                    </button>
                  ))}
                </div>
              </div>

              {/* Notas admin */}
              <div>
                <label htmlFor="field-mm-28" className="font-label text-xs font-semibold text-on-surface uppercase tracking-widest block mb-1.5">Notas de la revisión</label>
                <textarea aria-label="Descripción de la devolución" id="field-mm-28"
                  value={revisionNotas}
                  onChange={e => setRevisionNotas(e.target.value)}
                  rows={3}
                  maxLength={500}
                  placeholder="Observaciones sobre el estado físico del equipo, accesorios verificados, acción tomada…"
                  className="w-full rounded-lg border border-outline-variant/40 bg-surface-container-lowest px-3 py-2.5 text-sm font-body text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition resize-none"
                />
              </div>

              {/* Novedad toggle */}
              <div className="border border-outline-variant/20 rounded-xl overflow-hidden">
                <button
                  type="button"
                  onClick={() => setRevisionNovedad(v => !v)}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-label font-semibold transition-colors ${revisionNovedad ? 'bg-amber-50 text-amber-800' : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-low'}`}
                >
                  <span className="material-symbols-outlined text-[18px]" style={{ fontVariationSettings: `'FILL' ${revisionNovedad ? 1 : 0}` }}>warning</span>
                  Registrar novedad / daño detectado
                  <span className="ml-auto material-symbols-outlined text-[18px]">{revisionNovedad ? 'expand_less' : 'expand_more'}</span>
                </button>
                {revisionNovedad && (
                  <div className="px-4 py-3 bg-amber-50/50 space-y-3">
                    <div>
                      <label htmlFor="field-mm-29" className="font-label text-xs text-on-surface-variant block mb-1">Tipo de novedad</label>
                      <select id="field-mm-29" value={revisionTipoNovedad} onChange={e => setRevisionTipoNovedad(e.target.value)} className="w-full rounded-lg border border-outline-variant/40 bg-white px-3 py-2 text-sm font-body focus:outline-none focus:ring-2 focus:ring-amber-400/40 appearance-none">
                        {TIPOS_NOVEDAD.map(t => <option key={t} value={t}>{NOVEDAD_LABEL[t]}</option>)}
                      </select>
                    </div>
                    <div>
                      <label htmlFor="field-mm-30" className="font-label text-xs text-on-surface-variant block mb-1">Descripción <span className="text-red-500">*</span></label>
                      <textarea aria-label="Notas de la devolución" id="field-mm-30"
                        value={revisionDescNovedad}
                        onChange={e => setRevisionDescNovedad(e.target.value)}
                        rows={2}
                        maxLength={300}
                        placeholder="Describe el daño o novedad detectada durante la revisión…"
                        className={`w-full rounded-lg border px-3 py-2.5 text-sm font-body focus:outline-none focus:ring-2 focus:ring-amber-400/40 transition resize-none bg-white ${revisionNovedad && !revisionDescNovedad.trim() ? 'border-red-300' : 'border-outline-variant/40'}`}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Info: si hay daño grave, sugerir reasignación */}
              {(revisionCondicion === 'dano_grave' || revisionCondicion === 'perdido') && (
                <div className="flex items-start gap-3 p-3 bg-amber-50 border border-amber-200 rounded-xl">
                  <span className="material-symbols-outlined text-amber-600 text-[18px] mt-0.5" style={{ fontVariationSettings: "'FILL' 1" }}>tip</span>
                  <p className="font-body text-xs text-amber-800">
                    El equipo pasará a <strong>mantenimiento</strong>. Si el usuario aún necesita el equipo,
                    puedes usar <strong>"Reasignar equipo"</strong> en la tabla para asignarle uno similar.
                  </p>
                </div>
              )}

              {revisionError && (
                <div className="flex items-start gap-2 bg-error-container text-on-error-container rounded-lg px-4 py-3 text-sm font-body">
                  <span className="material-symbols-outlined text-[18px] shrink-0 mt-0.5">error</span>
                  {revisionError}
                </div>
              )}

              <div className="flex gap-3 pb-1">
                <button
                  type="button"
                  onClick={() => setRevisionModalOpen(false)}
                  disabled={revisionSubmitting}
                  className="px-5 py-2.5 rounded-xl border border-outline-variant/30 text-sm font-label text-on-surface-variant hover:bg-surface-container transition disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleSubmitRevision}
                  disabled={revisionSubmitting || (revisionNovedad && !revisionDescNovedad.trim())}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl font-label font-semibold text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed ${revisionNovedad ? 'bg-amber-600 text-white hover:bg-amber-700' : 'bg-orange-600 text-white hover:bg-orange-700'}`}
                >
                  {revisionSubmitting ? (
                    <><span className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent" />Procesando…</>
                  ) : (
                    <><span className="material-symbols-outlined text-[18px]">done_all</span>{revisionNovedad ? 'Confirmar con novedad' : 'Aprobar devolución'}</>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══ MODAL: REASIGNACIÓN DE EQUIPO ════════════════════════════ */}
      {reasignarModalOpen && reasignarPrestamo && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" onClick={() => { if (!reasignarSubmitting) setReasignarModalOpen(false) }} />
          <div className="relative w-full max-w-lg bg-surface rounded-2xl shadow-2xl border border-outline-variant/20 flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-outline-variant/15">
              <div className="flex items-center gap-3">
                <div className="bg-surface-container-high text-on-surface-variant size-9 rounded-lg flex items-center justify-center">
                  <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>swap_horiz</span>
                </div>
                <div>
                  <h2 className="font-headline text-base font-semibold text-on-surface">Reasignar equipo similar</h2>
                  <p className="font-body text-xs text-on-surface-variant">El equipo original pasará a mantenimiento</p>
                </div>
              </div>
              <button type="button" onClick={() => { if (!reasignarSubmitting) setReasignarModalOpen(false) }} className="p-1.5 rounded-lg hover:bg-surface-container transition-colors text-on-surface-variant">
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <div className="overflow-y-auto flex-1 px-6 py-5 space-y-5">
              {/* Equipo original */}
              <div className="flex items-center gap-3 p-3 bg-red-50 border border-red-200 rounded-xl">
                {reasignarPrestamo.equipos?.imagen_url ? (
                  <Image src={reasignarPrestamo.equipos.imagen_url} alt="" width={40} height={40} className="rounded-lg object-cover border border-red-200 shrink-0" unoptimized />
                ) : (
                  <div className="size-10 rounded-lg bg-red-100 flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-red-500 text-[20px]">devices</span>
                  </div>
                )}
                <div>
                  <p className="font-label text-[10px] text-red-600 uppercase tracking-wide font-semibold">Equipo a reemplazar → Mantenimiento</p>
                  <p className="font-body text-sm font-semibold text-red-800">{reasignarPrestamo.equipos?.nombre}</p>
                  <p className="font-body text-xs text-red-600">{reasignarPrestamo.usuarios?.nombre}</p>
                </div>
              </div>

              {/* Selección de equipo de reemplazo */}
              <div>
                <label htmlFor="field-mm-31" className="font-label text-xs font-semibold text-on-surface uppercase tracking-widest block mb-2">Equipo de reemplazo *</label>
                <select id="field-mm-31"
                  value={reasignarEquipoId}
                  onChange={e => setReasignarEquipoId(e.target.value)}
                  className="w-full rounded-lg border border-outline-variant/40 bg-surface-container-lowest px-3 py-2.5 text-sm font-body text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition appearance-none"
                >
                  <option value="">Seleccionar equipo disponible</option>
                  {(() => {
                    // IDs de equipos que tienen préstamos activos, vencidos o pendiente revisión
                    const equiposOcupados = new Set(
                      prestamosAdmin
                        .filter(p => ['activo', 'pendiente_revision', 'vencido'].includes(p.estado))
                        .map(p => p.equipo_id)
                    )
                    // IDs de equipos con préstamos que se solapan con el periodo del préstamo original
                    const fechaFinNuevo = reasignarPrestamo.fecha_fin_esperada
                    const equiposConSolapamiento = new Set(
                      prestamosAdmin
                        .filter(p =>
                          p.equipo_id !== reasignarPrestamo.equipo_id &&
                          ['activo', 'vencido'].includes(p.estado) &&
                          p.fecha_inicio < fechaFinNuevo
                        )
                        .map(p => p.equipo_id)
                    )
                    return equipos
                      .filter(e =>
                        e.estado === 'disponible' &&
                        e.id !== reasignarPrestamo.equipo_id &&
                        !equiposOcupados.has(e.id) &&
                        !equiposConSolapamiento.has(e.id)
                      )
                      .map(e => (
                        <option key={e.id} value={e.id}>
                          {e.nombre} · {e.tipo_equipo} · {e.marca}
                          {e.numero_serie ? ` (S/N: ${e.numero_serie})` : ''}
                        </option>
                      ))
                  })()}
                </select>
                {(() => {
                  const equiposOcupados = new Set(
                    prestamosAdmin
                      .filter(p => ['activo', 'pendiente_revision', 'vencido'].includes(p.estado))
                      .map(p => p.equipo_id)
                  )
                  const fechaFinNuevo = reasignarPrestamo.fecha_fin_esperada
                  const equiposConSolapamiento = new Set(
                    prestamosAdmin
                      .filter(p =>
                        p.equipo_id !== reasignarPrestamo.equipo_id &&
                        ['activo', 'vencido'].includes(p.estado) &&
                        p.fecha_inicio < fechaFinNuevo
                      )
                      .map(p => p.equipo_id)
                  )
                  const disponibles = equipos.filter(e =>
                    e.estado === 'disponible' &&
                    e.id !== reasignarPrestamo.equipo_id &&
                    !equiposOcupados.has(e.id) &&
                    !equiposConSolapamiento.has(e.id)
                  )
                  return disponibles.length === 0
                    ? <p className="font-body text-xs text-amber-700 mt-2">No hay equipos disponibles en este momento.</p>
                    : null
                })()}
              </div>

              {/* Notas */}
              <div>
                <label htmlFor="field-mm-32" className="font-label text-xs font-semibold text-on-surface uppercase tracking-widest block mb-1.5">Notas de la reasignación</label>
                <textarea aria-label="Notas de la reasignación" id="field-mm-32"
                  value={reasignarNotas}
                  onChange={e => setReasignarNotas(e.target.value)}
                  rows={3}
                  maxLength={500}
                  placeholder="Razón del reemplazo, detalles de la entrega del equipo de reemplazo, etc."
                  className="w-full rounded-lg border border-outline-variant/40 bg-surface-container-lowest px-3 py-2.5 text-sm font-body text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition resize-none"
                />
              </div>

              {/* Warning */}
              <div className="flex items-start gap-3 p-3 bg-amber-50 border border-amber-200 rounded-xl">
                <span className="material-symbols-outlined text-amber-600 text-[18px] mt-0.5" style={{ fontVariationSettings: "'FILL' 1" }}>warning</span>
                <p className="font-body text-xs text-amber-800">
                  Esta acción: <strong>(1)</strong> marcará el préstamo original como <em>devuelto con novedad</em>,
                  <strong> (2)</strong> pondrá el equipo original en <em>mantenimiento</em>, y
                  <strong> (3)</strong> creará un nuevo préstamo activo para el usuario con el equipo seleccionado.
                </p>
              </div>

              {reasignarError && (
                <div className="flex items-start gap-2 bg-error-container text-on-error-container rounded-lg px-4 py-3 text-sm font-body">
                  <span className="material-symbols-outlined text-[18px] shrink-0 mt-0.5">error</span>
                  {reasignarError}
                </div>
              )}

              <div className="flex gap-3 pb-1">
                <button
                  type="button"
                  onClick={() => setReasignarModalOpen(false)}
                  disabled={reasignarSubmitting}
                  className="px-5 py-2.5 rounded-xl border border-outline-variant/30 text-sm font-label text-on-surface-variant hover:bg-surface-container transition disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleSubmitReasignar}
                  disabled={reasignarSubmitting || !reasignarEquipoId}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-primary text-on-primary font-label font-semibold text-sm hover:opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {reasignarSubmitting ? (
                    <><span className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent" />Procesando…</>
                  ) : (
                    <><span className="material-symbols-outlined text-[18px]">swap_horiz</span>Confirmar reasignación</>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

