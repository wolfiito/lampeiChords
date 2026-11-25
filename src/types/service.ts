export type ServiceType = 'servicio' | 'ensayo' | 'evento'

// Pestaña/categoría a la que pertenece la lista (Culto u Oración)
export type ServiceCategory = 'culto' | 'oracion'

export interface ServiceItem {
  id: string
  title: string
  date?: string // Formato YYYY-MM-DD
  location?: string // Congregación / Iglesia / Sede
  type?: ServiceType
  category?: ServiceCategory // Por defecto 'culto' (registros anteriores)
  songIds: string[]
  notes?: string
  createdAt: number
  updatedAt: number
}

export const getServiceCategory = (s: Pick<ServiceItem, 'category'>): ServiceCategory =>
  s.category === 'oracion' ? 'oracion' : 'culto'

export const CATEGORY_LABELS: Record<ServiceCategory, { singular: string; plural: string; article: string; articleNew: string }> = {
  culto: { singular: 'Culto', plural: 'Cultos', article: 'el', articleNew: 'Nuevo' },
  oracion: { singular: 'Oración', plural: 'Oraciones', article: 'la', articleNew: 'Nueva' }
}
