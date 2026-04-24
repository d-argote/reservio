/**
 * Feature flags — Sprint control
 *
 * Cambia a `true` cuando el Sprint correspondiente esté listo.
 * false = muestra aviso "Próximamente", no ejecuta la acción real.
 */
export const FEATURES = {
  /** Sprint 2 — Crear / editar / cancelar reservas */
  reservations: false,

  /** Sprint 2 — Reservar sala directamente desde el catálogo */
  roomBooking: false,

  /** Sprint 3 — Solicitar equipamiento tecnológico */
  techRequests: false,
} as const
