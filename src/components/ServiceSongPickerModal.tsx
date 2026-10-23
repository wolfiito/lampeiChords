import React, { useState, useMemo } from 'react'
import { X, Search, Plus, Check } from 'lucide-react'
import type { Song } from '../types/song'
import { useTheme } from '../context/ThemeContext'

interface ServiceSongPickerModalProps {
  isOpen: boolean
  onClose: () => void
  songs: Song[]
  currentSongIds: string[]
  onAddSong: (songId: string) => void
}

export const ServiceSongPickerModal: React.FC<ServiceSongPickerModalProps> = ({
  isOpen,
  onClose,
  songs,
  currentSongIds,
  onAddSong
}) => {
  const { themeConfig } = useTheme()
  const [searchTerm, setSearchTerm] = useState('')

  const filteredSongs = useMemo(() => {
    const term = searchTerm.toLowerCase()
    return songs.filter(s => {
      return (
        s.title.toLowerCase().includes(term) ||
        s.artist.toLowerCase().includes(term) ||
        s.originalKey.toLowerCase().includes(term) ||
        (s.currentKey && s.currentKey.toLowerCase().includes(term))
      )
    })
  }, [songs, searchTerm])

  if (!isOpen) return null

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/80 backdrop-blur-sm animate-in fade-in"
    >
      <div
        onClick={e => e.stopPropagation()}
        className="bg-zinc-900 border border-zinc-700/80 rounded-3xl p-4 sm:p-5 shadow-2xl max-w-lg w-full text-zinc-100 max-h-[85vh] flex flex-col animate-in zoom-in-95 duration-150"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-zinc-800 shrink-0">
          <div>
            <h3 className="text-base sm:text-lg font-black text-white">
              Agregar Canciones al Servicio
            </h3>
            <p className="text-xs text-zinc-400">
              Toca para agregar a la lista ({currentSongIds.length} ya agregadas)
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-white bg-zinc-800 hover:bg-zinc-700 rounded-xl transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search */}
        <div className="py-3 shrink-0">
          <div className="relative">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar canción por título, tono o artista..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-700/80 rounded-xl pl-9 pr-4 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500 transition"
              autoFocus
            />
          </div>
        </div>

        {/* Song List */}
        <div className="overflow-y-auto divide-y divide-zinc-800/60 border-y border-zinc-800/60 pr-1 flex-1">
          {filteredSongs.length === 0 ? (
            <div className="text-center py-8 text-zinc-500 text-xs">
              No se encontraron canciones con ese criterio.
            </div>
          ) : (
            filteredSongs.map(song => {
              const alreadyCount = currentSongIds.filter(id => id === song.id).length
              const displayKey = song.currentKey || song.originalKey || 'C'

              return (
                <div
                  key={song.id}
                  className="py-2.5 px-2 hover:bg-zinc-800/40 flex items-center justify-between gap-3 transition"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-white truncate">
                        {song.title}
                      </span>
                      <span className={`text-[10px] font-mono font-bold px-1.5 py-0.2 rounded border ${themeConfig.primaryBadge}`}>
                        {displayKey}
                      </span>
                    </div>
                    <span className="text-[11px] text-zinc-400 truncate block">
                      {song.artist || 'Artista'} · {song.tempo ? `${song.tempo} bpm` : 'Sin tempo'}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {alreadyCount > 0 && (
                      <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20 flex items-center gap-1">
                        <Check className="w-3 h-3" />
                        <span>{alreadyCount > 1 ? `x${alreadyCount}` : 'Agregada'}</span>
                      </span>
                    )}

                    <button
                      type="button"
                      onClick={() => onAddSong(song.id)}
                      className={`p-1.5 sm:px-2.5 sm:py-1 ${themeConfig.primaryButton} rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer active:scale-95`}
                      title="Agregar esta canción"
                    >
                      <Plus className="w-4 h-4" />
                      <span className="hidden sm:inline">Agregar</span>
                    </button>
                  </div>
                </div>
              )
            })
          )}
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-zinc-800 flex items-center justify-between shrink-0 mt-2">
          <span className="text-xs text-zinc-500">
            {filteredSongs.length} canciones disponibles
          </span>
          <button
            onClick={onClose}
            className={`px-4 py-1.5 ${themeConfig.primaryButton} text-xs font-bold rounded-xl transition`}
          >
            Listo
          </button>
        </div>
      </div>
    </div>
  )
}
