// Catálogo de opciones para los selects en cascada de equipos
// Modificar aquí para agregar/quitar categorías, SO, marcas o tipos.

// Etiquetas para el select de categoría en el formulario
export const CATEGORIA_LABELS: Record<string, string> = {
  ordenador:    'Ordenador',
  movil:        'Móvil',
  periferico:   'Periférico',
  mobiliario:   'Mobiliario',
  climatizacion: 'Climatización',
  otro:         'Otro',
}

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
  // Tech (ordenador / móvil)
  portatil:   'Portátil',
  escritorio: 'Escritorio',
  smartphone: 'Smartphone',
  tablet:     'Tablet',
  // Periféricos
  monitor:          'Monitor',
  teclado:          'Teclado',
  mouse:            'Mouse / Ratón',
  auriculares:      'Auriculares',
  webcam:           'Webcam',
  proyector:        'Proyector',
  impresora:        'Impresora',
  escaner:          'Escáner',
  otro_periferico:  'Periférico',
  // Mobiliario
  silla:           'Silla',
  armario:         'Armario / Locker',
  pizarron:        'Pizarrón',
  otro_mobiliario: 'Mobiliario',
  // Climatización
  aire_acondicionado: 'Aire Acondicionado',
  ventilador:         'Ventilador',
  calefactor:         'Calefactor',
  purificador:        'Purificador de Aire',
  otro_climatizacion: 'Climatización',
  // Otro
  equipo_general: 'Equipo General',
}

/** Categorías que no necesitan SO, usan texto libre para marca */
export function isTechCategory(cat: string): boolean {
  return cat === 'ordenador' || cat === 'movil'
}

/** Tipos disponibles para categorías no-tech (periférico, mobiliario, etc.) */
export const TIPOS_DIRECTOS: Record<string, { value: string; label: string }[]> = {
  periferico: [
    { value: 'monitor',         label: 'Monitor' },
    { value: 'teclado',         label: 'Teclado' },
    { value: 'mouse',           label: 'Mouse / Ratón' },
    { value: 'auriculares',     label: 'Auriculares' },
    { value: 'webcam',          label: 'Webcam' },
    { value: 'proyector',       label: 'Proyector' },
    { value: 'impresora',       label: 'Impresora' },
    { value: 'escaner',         label: 'Escáner' },
    { value: 'otro_periferico', label: 'Otro periférico' },
  ],
  mobiliario: [
    { value: 'escritorio',      label: 'Escritorio' },
    { value: 'silla',           label: 'Silla' },
    { value: 'armario',         label: 'Armario / Locker' },
    { value: 'pizarron',        label: 'Pizarrón' },
    { value: 'otro_mobiliario', label: 'Otro mobiliario' },
  ],
  climatizacion: [
    { value: 'aire_acondicionado', label: 'Aire Acondicionado' },
    { value: 'ventilador',         label: 'Ventilador' },
    { value: 'calefactor',         label: 'Calefactor' },
    { value: 'purificador',        label: 'Purificador de Aire' },
    { value: 'otro_climatizacion', label: 'Otro climatización' },
  ],
  otro: [
    { value: 'equipo_general', label: 'Equipo General' },
  ],
}

export function getTiposDirectos(categoria: string): { value: string; label: string }[] {
  return TIPOS_DIRECTOS[categoria] ?? []
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
