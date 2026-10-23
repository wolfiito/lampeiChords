export type ServiceType = 'servicio' | 'ensayo' | 'evento'

export interface ServiceItem {
  id: string
  title: string
  date?: string // Formato YYYY-MM-DD
  location?: string // Congregación / Iglesia / Sede
  type?: ServiceType
  songIds: string[]
  notes?: string
  createdAt: number
  updatedAt: number
}
