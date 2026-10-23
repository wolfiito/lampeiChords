import React, { useState } from 'react'
import {
  ArrowLeft,
  Play,
  Plus,
  ChevronUp,
  ChevronDown,
  Trash2,
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

  return (
    <div className="max-w-3xl mx-auto px-3 sm:px-6 py-4 sm:py-6 w-full">
      {/* Top Header: Navigation & Service Info */}
      <div className="flex items-center justify-between gap-3 mb-6 pb-4 border-b border-zinc-800/80">
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={onBack}
            className="p-2 text-zinc-400 hover:text-white bg-zinc-900 hover:bg-zinc-800 rounded-xl border border-zinc-800 transition cursor-pointer shrink-0"
            title="Volver a Servicios"
          >
            <ArrowLeft className="w-4 h-4 text-emerald-400" />
          </button>
          <div className="min-w-0">
            <h1 className="text-lg sm:text-xl font-black text-white truncate leading-tight">
              {service.title}
            </h1>
            <div className="flex items-center gap-2 text-xs text-zinc-400 mt-0.5 truncate">
              <span>{serviceSongObjects.length} {serviceSongObjects.length === 1 ? 'canción' : 'canciones'}</span>
              {service.date && <span>· {service.date}</span>}
              {service.location && <span>· {service.location}</span>}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {serviceSongObjects.length > 0 && (
            <button
              onClick={() => onStartService(0)}
              className={`py-2 px-3.5 ${themeConfig.primaryButton} rounded-xl text-xs font-black shadow transition flex items-center gap-1.5 cursor-pointer active:scale-95`}
              title="Iniciar servicio desde la primera canción"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Iniciar</span>
            </button>
          )}

          <button
            onClick={() => onEditService(service)}
            className="p-2 text-zinc-400 hover:text-white bg-zinc-900 hover:bg-zinc-800 rounded-xl border border-zinc-800 transition cursor-pointer"
            title="Editar servicio"
          >
            <Edit3 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Ordered Songs Header & + Button */}
      <div className="flex items-center justify-between gap-2 mb-3 px-1">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-bold text-zinc-300 uppercase tracking-wider">
            Orden de Canciones
          </h2>
        </div>

        {/* Solo el botón + */}
        <button
          onClick={() => setIsPickerOpen(true)}
          className={`p-2 ${themeConfig.primaryButton} text-white rounded-xl shadow transition flex items-center justify-center cursor-pointer active:scale-95`}
          title="Agregar canción"
          aria-label="Agregar canción"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      {/* Song List (Lista limpia, sin cajas) */}
      {serviceSongObjects.length === 0 ? (
        <div className="py-12 border border-dashed border-zinc-800/80 rounded-2xl p-6 text-center text-zinc-500">
          <Music className="w-8 h-8 text-zinc-600 mx-auto mb-2 opacity-40" />
          <h3 className="text-sm font-bold text-white mb-1">
            Este servicio aún no tiene canciones
          </h3>
          <p className="text-xs text-zinc-400 mb-4">
            Toca el botón + para agregar canciones de tu repertorio.
          </p>
          <button
            onClick={() => setIsPickerOpen(true)}
            className={`p-2.5 ${themeConfig.primaryButton} text-white rounded-xl shadow transition inline-flex items-center justify-center cursor-pointer active:scale-95`}
            title="Agregar canción"
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>
      ) : (
        <div className="divide-y divide-zinc-800/60 border-y border-zinc-800/60">
          {serviceSongObjects.map(({ song, id }, index) => {
            if (!song) {
              return (
                <div
                  key={`${id}-${index}`}
                  className="py-2.5 px-2 flex items-center justify-between gap-3 text-zinc-500 text-xs"
                >
                  <span>Canción eliminada del catálogo ({id})</span>
                  <button
                    onClick={() => onRemoveSong(service.id, index)}
                    className="p-1 hover:text-rose-400 transition cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              )
            }

            return (
              <div
                key={`${song.id}-${index}`}
                onClick={() => onStartService(index)}
                className="py-2.5 px-2 sm:px-3 flex items-center justify-between gap-2.5 sm:gap-4 hover:bg-zinc-900/50 transition group cursor-pointer"
              >
                {/* Number & Song Info */}
                <div className="flex items-center gap-2.5 sm:gap-3.5 min-w-0 flex-1">
                  <span className="font-mono text-xs sm:text-sm font-bold text-zinc-500 group-hover:text-zinc-300 w-5 text-right shrink-0">
                    {index + 1}
                  </span>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm sm:text-base text-white group-hover:text-zinc-200 transition-colors truncate">
                        {song.title}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-[11px] text-zinc-500 truncate">
                      <span className={`font-medium ${themeConfig.primaryText}`}>
                        {song.artist || 'Artista'}
                      </span>
                      {song.tempo && <span>· {song.tempo} bpm</span>}
                      {song.capo > 0 && <span>· Capo {song.capo}</span>}
                    </div>
                  </div>
                </div>

                {/* Actions: Reorder, Remove */}
                <div className="flex items-center gap-1 sm:gap-2 shrink-0" onClick={e => e.stopPropagation()}>
                  {/* Reorder Buttons */}
                  <div className="flex items-center">
                    <button
                      type="button"
                      disabled={index === 0}
                      onClick={() => moveUp(index)}
                      className="p-1 text-zinc-500 hover:text-white disabled:opacity-20 transition cursor-pointer"
                      title="Mover arriba"
                    >
                      <ChevronUp className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      disabled={index === serviceSongObjects.length - 1}
                      onClick={() => moveDown(index)}
                      className="p-1 text-zinc-500 hover:text-white disabled:opacity-20 transition cursor-pointer"
                      title="Mover abajo"
                    >
                      <ChevronDown className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Remove button */}
                  <button
                    type="button"
                    onClick={() => onRemoveSong(service.id, index)}
                    className="p-1.5 text-zinc-600 hover:text-rose-400 transition cursor-pointer"
                    title="Quitar de este servicio"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
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
