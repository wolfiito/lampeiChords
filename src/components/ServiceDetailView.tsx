import React, { useState } from 'react'
import {
  ArrowLeft,
  Play,
  Plus,
  ChevronUp,
  ChevronDown,
  Trash2,
  Calendar,
  MapPin,
  Edit3,
  Music
} from 'lucide-react'
import type { Song } from '../types/song'
import type { ServiceItem } from '../types/service'
import { useTheme } from '../context/ThemeContext'
import { ServiceSongPickerModal } from './ServiceSongPickerModal'

interface ServiceDetailViewProps {
  service: ServiceItem
  songs: Song[]
  onBack: () => void
  onStartService: (startIndex: number) => void
  onEditService: (service: ServiceItem) => void
  onAddSong: (serviceId: string, songId: string) => void
  onRemoveSong: (serviceId: string, songIndex: number) => void
  onReorderSongs: (serviceId: string, newSongIds: string[]) => void
}

export const ServiceDetailView: React.FC<ServiceDetailViewProps> = ({
  service,
  songs,
  onBack,
  onStartService,
  onEditService,
  onAddSong,
  onRemoveSong,
  onReorderSongs
}) => {
  const { themeConfig } = useTheme()
  const [isPickerOpen, setIsPickerOpen] = useState(false)

  // Map service songIds to actual Song objects
  const songMap = new Map(songs.map(s => [s.id, s]))
  const serviceSongObjects: { song: Song | undefined; id: string }[] = service.songIds.map(id => ({
    song: songMap.get(id),
    id
  }))

  const moveUp = (index: number) => {
    if (index <= 0) return
    const newIds = [...service.songIds]
    const temp = newIds[index]
    newIds[index] = newIds[index - 1]
    newIds[index - 1] = temp
    onReorderSongs(service.id, newIds)
  }

  const moveDown = (index: number) => {
    if (index >= service.songIds.length - 1) return
    const newIds = [...service.songIds]
    const temp = newIds[index]
    newIds[index] = newIds[index + 1]
    newIds[index + 1] = temp
    onReorderSongs(service.id, newIds)
  }

  const getTypeBadge = (type?: string) => {
    switch (type) {
      case 'ensayo':
        return { label: '🎸 Ensayo', bg: 'bg-blue-500/10 border-blue-500/30 text-blue-400' }
      case 'evento':
        return { label: '✨ Especial', bg: 'bg-purple-500/10 border-purple-500/30 text-purple-400' }
      default:
        return { label: '⛪ Servicio', bg: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' }
    }
  }

  const typeInfo = getTypeBadge(service.type)

  return (
    <div className="max-w-4xl mx-auto px-3 sm:px-6 py-6 sm:py-8 w-full">
      {/* Top Navigation & Actions */}
      <div className="flex items-center justify-between gap-2 mb-6">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-xs font-bold text-zinc-400 hover:text-white bg-zinc-900/90 hover:bg-zinc-800 px-3 py-2 rounded-xl border border-zinc-800 transition cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4 text-emerald-400" />
          <span>Volver a Servicios</span>
        </button>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onEditService(service)}
            className="p-2 text-zinc-400 hover:text-white bg-zinc-900 hover:bg-zinc-800 rounded-xl border border-zinc-800 transition cursor-pointer"
            title="Editar datos del servicio"
          >
            <Edit3 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Service Header Card */}
      <div className="bg-zinc-900/95 border border-zinc-800 rounded-3xl p-5 sm:p-7 shadow-xl mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className={`text-[10px] sm:text-xs font-bold px-2.5 py-0.5 rounded-full border ${typeInfo.bg}`}>
                {typeInfo.label}
              </span>
              {service.date && (
                <span className="text-[11px] font-semibold text-zinc-400 flex items-center gap-1 bg-zinc-800/80 px-2.5 py-0.5 rounded-full border border-zinc-700/60">
                  <Calendar className="w-3 h-3 text-zinc-400" />
                  <span>{service.date}</span>
                </span>
              )}
              {service.location && (
                <span className="text-[11px] font-semibold text-zinc-300 flex items-center gap-1 bg-zinc-800/80 px-2.5 py-0.5 rounded-full border border-zinc-700/60">
                  <MapPin className="w-3 h-3 text-amber-400" />
                  <span>{service.location}</span>
                </span>
              )}
            </div>

            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              {service.title}
            </h1>

            {service.notes && (
              <p className="text-xs sm:text-sm text-zinc-400 italic">
                "{service.notes}"
              </p>
            )}
          </div>

          {/* Big Start Service Button */}
          {serviceSongObjects.length > 0 && (
            <button
              onClick={() => onStartService(0)}
              className={`py-3 px-6 ${themeConfig.primaryButton} rounded-2xl text-sm font-black shadow-lg transition flex items-center justify-center gap-2 cursor-pointer active:scale-95 shrink-0`}
            >
              <Play className="w-5 h-5 fill-current" />
              <span>Iniciar Servicio</span>
            </button>
          )}
        </div>
      </div>

      {/* Ordered Songs Header & Add Button */}
      <div className="flex items-center justify-between gap-2 mb-3.5">
        <div className="flex items-center gap-2">
          <h2 className="text-base sm:text-lg font-black text-white">
            Orden de Canciones
          </h2>
          <span className={`text-xs font-bold px-2 py-0.2 rounded-full border ${themeConfig.primaryBadge}`}>
            {serviceSongObjects.length} {serviceSongObjects.length === 1 ? 'canción' : 'canciones'}
          </span>
        </div>

        <button
          onClick={() => setIsPickerOpen(true)}
          className={`px-3 py-1.5 ${themeConfig.primaryButton} text-xs font-bold rounded-xl shadow transition flex items-center gap-1.5 cursor-pointer active:scale-95`}
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Agregar Canción</span>
        </button>
      </div>

      {/* Song List */}
      {serviceSongObjects.length === 0 ? (
        <div className="bg-zinc-900/50 border border-dashed border-zinc-800 rounded-3xl p-8 text-center">
          <Music className="w-8 h-8 text-zinc-600 mx-auto mb-2" />
          <h3 className="text-sm font-bold text-white mb-1">
            Este servicio aún no tiene canciones
          </h3>
          <p className="text-xs text-zinc-400 mb-4">
            Agrega las canciones de tu repertorio en el orden que las vas a tocar.
          </p>
          <button
            onClick={() => setIsPickerOpen(true)}
            className={`px-4 py-2 ${themeConfig.primaryButton} text-xs font-bold rounded-xl transition`}
          >
            + Seleccionar Canciones
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {serviceSongObjects.map(({ song, id }, index) => {
            if (!song) {
              return (
                <div
                  key={`${id}-${index}`}
                  className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-3 flex items-center justify-between gap-3 text-zinc-500 text-xs"
                >
                  <span>Canción eliminada del catálogo ({id})</span>
                  <button
                    onClick={() => onRemoveSong(service.id, index)}
                    className="p-1 hover:text-rose-400 transition"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              )
            }

            const displayKey = song.currentKey || song.originalKey || 'C'

            return (
              <div
                key={`${song.id}-${index}`}
                className="bg-zinc-900/90 hover:bg-zinc-850 border border-zinc-800/80 hover:border-zinc-700 rounded-2xl p-3 sm:p-4 flex items-center justify-between gap-3 transition shadow-sm group"
              >
                {/* Number & Song Info */}
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-zinc-800 border border-zinc-700/80 flex items-center justify-center font-black text-xs sm:text-sm text-zinc-300 shrink-0">
                    {index + 1}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-sm sm:text-base text-white truncate">
                        {song.title}
                      </span>
                      <span className={`text-[10px] font-black px-1.5 py-0.2 rounded border ${themeConfig.primaryBadge}`}>
                        {displayKey}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-[11px] text-zinc-400 truncate">
                      <span>{song.artist || 'Artista'}</span>
                      {song.tempo && <span>· {song.tempo} bpm</span>}
                      {song.capo > 0 && <span>· Capo {song.capo}</span>}
                    </div>
                  </div>
                </div>

                {/* Actions: Reorder, Play this, Remove */}
                <div className="flex items-center gap-1 sm:gap-2 shrink-0">
                  {/* Reorder Buttons */}
                  <div className="flex items-center bg-zinc-950 p-0.5 rounded-xl border border-zinc-800">
                    <button
                      type="button"
                      disabled={index === 0}
                      onClick={() => moveUp(index)}
                      className="p-1 text-zinc-400 hover:text-white disabled:opacity-20 disabled:hover:text-zinc-400 transition cursor-pointer"
                      title="Mover arriba"
                    >
                      <ChevronUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      disabled={index === serviceSongObjects.length - 1}
                      onClick={() => moveDown(index)}
                      className="p-1 text-zinc-400 hover:text-white disabled:opacity-20 disabled:hover:text-zinc-400 transition cursor-pointer"
                      title="Mover abajo"
                    >
                      <ChevronDown className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Play from this song button */}
                  <button
                    type="button"
                    onClick={() => onStartService(index)}
                    className="p-2 sm:px-3 sm:py-1.5 bg-emerald-600/90 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer active:scale-95 shadow-sm"
                    title="Tocar desde esta canción"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span className="hidden sm:inline">Tocar</span>
                  </button>

                  {/* Remove button */}
                  <button
                    type="button"
                    onClick={() => onRemoveSong(service.id, index)}
                    className="p-1.5 text-zinc-500 hover:text-rose-400 hover:bg-zinc-800 rounded-lg transition cursor-pointer"
                    title="Quitar de este servicio"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Song Picker Modal */}
      <ServiceSongPickerModal
        isOpen={isPickerOpen}
        onClose={() => setIsPickerOpen(false)}
        songs={songs}
        currentSongIds={service.songIds}
        onAddSong={songId => onAddSong(service.id, songId)}
      />
    </div>
  )
}
