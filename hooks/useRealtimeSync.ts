'use client'

/**
 * useRealtimeSync — Gestiona las 4 suscripciones de Supabase Realtime.
 *
 * Extrae la lógica de Realtime del God Component para:
 *  - Reducir la superficie de re-renders (el hook no tiene estado propio)
 *  - Centralizar el ciclo de vida de los canales
 *  - Permitir debouncing configurable por canal
 *  - Facilitar testing y mantenimiento
 *
 * El hook recibe callbacks estables (memoizados con useCallback en el padre)
 * para notificar cuando deben refrescarse salas o equipos.
 */

import { useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase/client'

interface UseRealtimeSyncOptions {
  /** Llamado cuando cambia el estado de salas o reservas (con debounce) */
  onSalasChange: () => void
  /** Llamado cuando cambia el estado de equipos o préstamos (con debounce) */
  onEquiposChange: () => void
  /** ms de debounce para el canal de salas. Default: 1500 */
  salaDebounceMs?: number
  /** ms de debounce para el canal de equipos. Default: 1500 */
  equipoDebounceMs?: number
}

export function useRealtimeSync({
  onSalasChange,
  onEquiposChange,
  salaDebounceMs = 1500,
  equipoDebounceMs = 1500,
}: UseRealtimeSyncOptions): void {
  // Usar refs para los callbacks para evitar que el efecto se re-ejecute
  // cuando los callbacks cambian (ya que son recreados en cada render del padre)
  const onSalasChangeRef = useRef(onSalasChange)
  const onEquiposChangeRef = useRef(onEquiposChange)

  useEffect(() => {
    onSalasChangeRef.current = onSalasChange
  }, [onSalasChange])

  useEffect(() => {
    onEquiposChangeRef.current = onEquiposChange
  }, [onEquiposChange])

  useEffect(() => {
    let salasTimer: ReturnType<typeof setTimeout> | null = null
    let equiposTimer: ReturnType<typeof setTimeout> | null = null

    // Debounce: agrupa múltiples eventos seguidos en una sola actualización.
    // Evita re-fetches en cascada cuando se producen varios cambios en DB rápidamente.
    const triggerSalasRefresh = () => {
      if (salasTimer) clearTimeout(salasTimer)
      salasTimer = setTimeout(() => onSalasChangeRef.current(), salaDebounceMs)
    }

    const triggerEquiposRefresh = () => {
      if (equiposTimer) clearTimeout(equiposTimer)
      equiposTimer = setTimeout(() => onEquiposChangeRef.current(), equipoDebounceMs)
    }

    // Canal 1: cambios en reservas → afecta disponibilidad de salas
    const reservasChannel = supabase
      .channel('realtime:reservas')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'reservas' }, triggerSalasRefresh)
      .subscribe()

    // Canal 2: actualizaciones en salas (e.g. trigger DB fn_recalcular_sala_estado)
    const salasChannel = supabase
      .channel('realtime:salas')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'salas' }, triggerSalasRefresh)
      .subscribe()

    // Canal 3: cambios en préstamos → afecta disponibilidad de equipos
    const prestamosChannel = supabase
      .channel('realtime:prestamos')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'prestamos_equipo' }, triggerEquiposRefresh)
      .subscribe()

    // Canal 4: actualizaciones en equipos (trigger DB o cambio manual de estado)
    const equiposChannel = supabase
      .channel('realtime:equipos')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'equipos' }, triggerEquiposRefresh)
      .subscribe()

    return () => {
      if (salasTimer) clearTimeout(salasTimer)
      if (equiposTimer) clearTimeout(equiposTimer)
      supabase.removeChannel(reservasChannel)
      supabase.removeChannel(salasChannel)
      supabase.removeChannel(prestamosChannel)
      supabase.removeChannel(equiposChannel)
    }
    // mount-only: los timers y canales se crean una vez.
    // Las refs garantizan que siempre ejecutamos la versión más reciente del callback.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [salaDebounceMs, equipoDebounceMs])
}
