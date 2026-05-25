'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import Image from 'next/image'
import dynamic from 'next/dynamic'
import { supabase } from '@/lib/supabase/client'
import {
  getUsuarios, updateUserRole,
  getEquipos, getPrestamosAdmin, getAlertasEquiposAdmin, getPrestamosAdminHistorial,
  createEquipo, updateEquipo, deleteEquipo,
  getSalasAdmin, createSala, updateSala, deleteSala,
  devolverPrestamoAdmin, confirmarRevisionAdmin, reasignarEquipoAdmin,
  updateEquipoEstado, asignarEquipoASala,
  createUsuarioAdmin, toggleUsuarioActivo, updateUsuarioEmail, updateUsuarioNombre, sendPasswordResetAdmin
} from '@/features/admin/actions'
import {
  devolverEquipo,
  updatePrestamoReserva,
  createPrestamoEquipo,
  getMisPrestamos,
  getEquiposRetornos,
  recalcularEstadosEquiposDB,
  getReportData,
  type PrestamoEquipo,
  type CondicionEquipo,
  type CondicionDevolucion,
  type TipoNovedad,
  type ReportData
} from '@/features/reservas/actions'
import type { UsuarioAdmin, Equipo, SalaAdmin, PrestamoEquipoAdmin, AlertaEquipoAdmin } from '@/features/admin/types'
import {
  TIPO_EQUIPO_LABELS,
  getSistemas,
  getMarcas,
  getTipos,
  getTiposDirectos,
  isTechCategory,
  CATEGORIA_LABELS
} from '@/lib/equipo-catalogo'
import type { AdminSubTab } from './types'
import {
  formatFecha, formatDuracion, generarCodigoActivo, getBogotaNow,
  CONDICION_LABEL, CONDICION_COLOR, CONDICION_ICON, NOVEDAD_LABEL,
  CONDICIONES_ENTREGA, CONDICIONES_DEVOLUCION, TIPOS_NOVEDAD,
  SkeletonSummaryCard, SkeletonRoomCard,
  adminValidateNombre, adminValidateEmail, adminValidatePassword, AdminPasswordRequirements,
  uploadFotoDevolucion, uploadImagen
} from './helpers'
import { Line, Bar, Doughnut } from 'react-chartjs-2'
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Title, Tooltip, Legend, Filler
} from 'chart.js'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Title, Tooltip, Legend, Filler)

const D3DonutChart = dynamic(
  () => import('@/components/ui/charts/D3DonutChart').then(m => ({ default: m.D3DonutChart })),
  { ssr: false, loading: () => <div className="w-[180px] h-[180px] bg-surface-container rounded-full animate-pulse" /> }
)

export interface AdminTabProps {
  userProfile: { nombre: string; rol: string } | null
  showGlobalError: (msg: string) => void
}

export function AdminTab({ userProfile, showGlobalError }: AdminTabProps) {
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

  // ── Sprint 3: Reportes ────────────────────────────────────────────
  const [reportData, setReportData] = useState<ReportData | null>(null)
  const [loadingReports, setLoadingReports] = useState(false)
  const [reportSubTab, setReportSubTab] = useState<'overview' | 'salas' | 'reservas' | 'equipos'>('overview')
  const [reportSearchReservas, setReportSearchReservas] = useState('')
  const [reportSearchSalas, setReportSearchSalas] = useState('')
  const [reportSearchEquipos, setReportSearchEquipos] = useState('')
  const [reportPageReservas, setReportPageReservas] = useState(1)
  const REPORT_PAGE_SIZE = 10

  const loadSalasAdmin = useCallback(async () => {
    setLoadingSalasAdmin(true)
    const result = await getSalasAdmin()
    if (result.data) setSalasAdmin(result.data)
    setLoadingSalasAdmin(false)
  }, [])

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
  const loadReports = useCallback(async () => {
    setLoadingReports(true)
    const result = await getReportData()
    if (result.data) setReportData(result.data)
    setLoadingReports(false)
  }, [])

  // ── Historial de reservas del usuario ────────────────────────────


  useEffect(() => {
    loadUsuarios()
    loadEquipos()
    loadSalasAdmin()
    loadReports()
  }, [loadUsuarios, loadEquipos, loadSalasAdmin, loadReports])

  return (
    <>
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
                                            {salasAdmin.map(s => (
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
    </>
  )
}
