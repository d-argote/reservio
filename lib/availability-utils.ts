import type { FranjaOcupada } from '@/components/ui/AvailabilityTimeline'

/**
 * Returns true if the interval [inicio, fin) overlaps any booked franja.
 */
export function hasOverlap(
  inicio: string,
  fin: string,
  franjas: FranjaOcupada[],
): boolean {
  return franjas.some(f => inicio < f.hora_fin && fin > f.hora_inicio)
}
