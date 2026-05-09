// Catálogo de opciones para los selects en cascada de equipos
// Modificar aquí para agregar/quitar categorías, SO, marcas o tipos.

export const CATALOGO = {
  ordenador: {
    label: 'Ordenador',
    sistemas_operativos: {
      windows: {
        label: 'Windows',
        marcas: {
          dell:   { label: 'Dell',   tipos: ['portatil', 'escritorio'] as const },
          hp:     { label: 'HP',     tipos: ['portatil', 'escritorio'] as const },
          lenovo: { label: 'Lenovo', tipos: ['portatil', 'escritorio'] as const },
          asus:   { label: 'Asus',   tipos: ['portatil', 'escritorio'] as const },
          acer:   { label: 'Acer',   tipos: ['portatil', 'escritorio'] as const },
        },
      },
      macos: {
        label: 'macOS',
        marcas: {
          apple: { label: 'Apple', tipos: ['portatil', 'escritorio'] as const },
        },
      },
      linux: {
        label: 'Linux',
        marcas: {
          dell:   { label: 'Dell',   tipos: ['portatil', 'escritorio'] as const },
          lenovo: { label: 'Lenovo', tipos: ['portatil', 'escritorio'] as const },
          hp:     { label: 'HP',     tipos: ['portatil', 'escritorio'] as const },
        },
      },
    },
  },
  movil: {
    label: 'Móvil',
    sistemas_operativos: {
      android: {
        label: 'Android',
        marcas: {
          samsung: { label: 'Samsung', tipos: ['smartphone', 'tablet'] as const },
          xiaomi:  { label: 'Xiaomi',  tipos: ['smartphone'] as const },
          huawei:  { label: 'Huawei',  tipos: ['smartphone', 'tablet'] as const },
        },
      },
      ios: {
        label: 'iOS / iPadOS',
        marcas: {
          apple: { label: 'Apple', tipos: ['smartphone', 'tablet'] as const },
        },
      },
    },
  },
} as const

export type Categoria = keyof typeof CATALOGO

export const TIPO_EQUIPO_LABELS: Record<string, string> = {
  portatil:   'Portátil',
  escritorio: 'Escritorio',
  smartphone: 'Smartphone',
  tablet:     'Tablet',
}

/** Devuelve los SOs disponibles para una categoría */
export function getSistemas(categoria: string) {
  if (!categoria || !(categoria in CATALOGO)) return []
  return Object.entries(
    CATALOGO[categoria as Categoria].sistemas_operativos
  ).map(([value, v]) => ({ value, label: v.label }))
}

/** Devuelve las marcas disponibles para categoría + SO */
export function getMarcas(categoria: string, so: string) {
  if (!categoria || !so) return []
  const sistemas = CATALOGO[categoria as Categoria]?.sistemas_operativos
  if (!sistemas || !(so in sistemas)) return []
  return Object.entries(
    (sistemas as Record<string, { label: string; marcas: Record<string, { label: string; tipos: readonly string[] }> }>)[so].marcas
  ).map(([value, v]) => ({ value, label: v.label }))
}

/** Devuelve los tipos disponibles para categoría + SO + marca */
export function getTipos(categoria: string, so: string, marca: string) {
  if (!categoria || !so || !marca) return []
  const sistemas = CATALOGO[categoria as Categoria]?.sistemas_operativos
  if (!sistemas || !(so in sistemas)) return []
  const marcas = (sistemas as Record<string, { label: string; marcas: Record<string, { label: string; tipos: readonly string[] }> }>)[so].marcas
  if (!marcas || !(marca in marcas)) return []
  return marcas[marca].tipos.map((t) => ({
    value: t,
    label: TIPO_EQUIPO_LABELS[t] ?? t,
  }))
}
