import React, { useState, useEffect } from 'react'
import { X, Calendar, MapPin, Tag } from 'lucide-react'
import type { ServiceItem, ServiceType } from '../types/service'
import { useTheme } from '../context/ThemeContext'

interface ServiceModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (service: ServiceItem) => void
  initialService?: ServiceItem | null
}

export const ServiceModal: React.FC<ServiceModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialService
}) => {
  const { themeConfig } = useTheme()

  const [title, setTitle] = useState('')
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0])
  const [location, setLocation] = useState('')
  const [type, setType] = useState<ServiceType>('servicio')
  const [notes, setNotes] = useState('')

  useEffect(() => {
    if (initialService) {
      setTitle(initialService.title || '')
      setDate(initialService.date || new Date().toISOString().split('T')[0])
      setLocation(initialService.location || '')
      setType(initialService.type || 'servicio')
      setNotes(initialService.notes || '')
    } else {
      setTitle('')
      setDate(new Date().toISOString().split('T')[0])
      setLocation('')
      setType('servicio')
      setNotes('')
    }
  }, [initialService, isOpen])

  if (!isOpen) return null

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return

    const serviceData: ServiceItem = {
      id: initialService?.id || `service-${Date.now()}`,
      title: title.trim(),
      date: date || undefined,
      location: location.trim() || undefined,
      type,
      notes: notes.trim() || undefined,
      songIds: initialService?.songIds || [],
      createdAt: initialService?.createdAt || Date.now(),
      updatedAt: Date.now()
    }

    onSave(serviceData)
    onClose()
  }

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/80 backdrop-blur-sm animate-in fade-in"
    >
      <div
        onClick={e => e.stopPropagation()}
        className="bg-zinc-900 border border-zinc-700/80 rounded-3xl p-5 sm:p-6 shadow-2xl max-w-md w-full text-zinc-100 animate-in zoom-in-95 duration-150"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
          <div>
            <h3 className="text-lg font-black text-white">
              {initialService ? 'Editar Servicio' : 'Nuevo Servicio'}
            </h3>
            <p className="text-xs text-zinc-400">
              {initialService ? 'Modifica los datos del servicio' : 'Crea una lista ordenada de canciones para tu evento'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-white bg-zinc-800 hover:bg-zinc-700 rounded-xl transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {/* Tipo de evento */}
          <div>
            <label className="text-xs font-bold text-zinc-300 block mb-1.5 uppercase tracking-wider">
              Tipo de Evento
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setType('servicio')}
                className={`py-2 px-3 text-xs font-bold rounded-xl transition border cursor-pointer ${
                  type === 'servicio'
                    ? `${themeConfig.primaryButton} shadow-md`
                    : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-white'
                }`}
              >
                ⛪ Servicio
              </button>
              <button
                type="button"
                onClick={() => setType('ensayo')}
                className={`py-2 px-3 text-xs font-bold rounded-xl transition border cursor-pointer ${
                  type === 'ensayo'
                    ? `${themeConfig.primaryButton} shadow-md`
                    : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-white'
                }`}
              >
                🎸 Ensayo
              </button>
              <button
                type="button"
                onClick={() => setType('evento')}
                className={`py-2 px-3 text-xs font-bold rounded-xl transition border cursor-pointer ${
                  type === 'evento'
                    ? `${themeConfig.primaryButton} shadow-md`
                    : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-white'
                }`}
              >
                ✨ Especial
              </button>
            </div>
          </div>

          {/* Título */}
          <div>
            <label className="text-xs font-bold text-zinc-300 block mb-1">
              Nombre del Servicio o Ensayo *
            </label>
            <input
              type="text"
              required
              placeholder="Ej. Domingo 27 Oct - Servicio General"
              value={title}
              onChange={e => setTitle(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-700/80 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500 transition"
              autoFocus
            />
          </div>

          {/* Fecha */}
          <div>
            <label className="text-xs font-bold text-zinc-300 flex items-center gap-1.5 mb-1">
              <Calendar className="w-3.5 h-3.5 text-zinc-400" />
              <span>Fecha</span>
            </label>
            <input
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-700/80 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-emerald-500 transition"
            />
          </div>

          {/* Iglesia / Sede / Ubicación */}
          <div>
            <label className="text-xs font-bold text-zinc-300 flex items-center gap-1.5 mb-1">
              <MapPin className="w-3.5 h-3.5 text-zinc-400" />
              <span>Iglesia / Congregación / Sede (opcional)</span>
            </label>
            <input
              type="text"
              placeholder="Ej. Iglesia Central, Sede Norte, Grupo de Jóvenes..."
              value={location}
              onChange={e => setLocation(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-700/80 rounded-xl px-3.5 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500 transition"
            />
          </div>

          {/* Notas */}
          <div>
            <label className="text-xs font-bold text-zinc-300 flex items-center gap-1.5 mb-1">
              <Tag className="w-3.5 h-3.5 text-zinc-400" />
              <span>Notas o indicaciones (opcional)</span>
            </label>
            <textarea
              rows={2}
              placeholder="Ej. Tocar con dinámica suave en ministración, intro en piano..."
              value={notes}
              onChange={e => setNotes(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-700/80 rounded-xl px-3.5 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500 transition resize-none"
            />
          </div>

          {/* Botones de acción */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white rounded-xl text-xs font-bold transition cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={!title.trim()}
              className={`px-5 py-2 ${themeConfig.primaryButton} disabled:opacity-50 text-xs font-bold rounded-xl transition shadow-md cursor-pointer`}
            >
              {initialService ? 'Guardar Cambios' : 'Crear Servicio'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
