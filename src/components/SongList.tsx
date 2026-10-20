import React, { useState, useMemo } from 'react'
import {
  Search,
  Plus,
  Trash2,
  Copy,
  Music,
  X,
  Upload,
  Download
} from 'lucide-react'
import type { Song } from '../types/song'

interface SongListProps {
  isOpen: boolean
  onClose: () => void
  songs: Song[]
  activeSongId: string
  onSelectSong: (id: string) => void
  onNewSong: () => void
  onDuplicateSong: (id: string) => void
  onDeleteSong: (id: string) => void
  onOpenImportModal: () => void
  onExportLibrary: () => void
}

export const SongList: React.FC<SongListProps> = ({
  isOpen,
  onClose,
  songs,
  activeSongId,
  onSelectSong,
  onNewSong,
  onDuplicateSong,
  onDeleteSong,
  onOpenImportModal,
  onExportLibrary
}) => {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedTag, setSelectedTag] = useState<string | null>(null)

  const allTags = useMemo(() => {
    const set = new Set<string>()
    songs.forEach(s => s.tags?.forEach(t => set.add(t)))
    return Array.from(set)
  }, [songs])

  const filteredSongs = useMemo(() => {
    return songs.filter(s => {
      const matchSearch =
        s.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.artist.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.originalKey.toLowerCase().includes(searchTerm.toLowerCase())
      const matchTag = selectedTag ? s.tags?.includes(selectedTag) : true
      return matchSearch && matchTag
    })
  }, [songs, searchTerm, selectedTag])

  if (!isOpen) return null

  return (
    <div className="no-print fixed inset-0 z-50 flex justify-start bg-black/60 backdrop-blur-xs animate-in fade-in">
      <div className="relative w-full max-w-[88vw] sm:max-w-md bg-zinc-900 border-r border-zinc-800 h-full flex flex-col shadow-2xl animate-in slide-in-from-left duration-200">
        {/* Drawer Header */}
        <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-xl">
              <Music className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-black text-lg text-white">Mi Repertorio</h2>
              <p className="text-xs text-emerald-400 font-medium">{songs.length} canciones guardadas</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-xl transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Action Buttons: New Song & Import */}
        <div className="p-3 sm:p-4 space-y-2 border-b border-zinc-800/80">
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => {
                onNewSong()
                onClose()
              }}
              className="px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow transition flex items-center justify-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>Nueva</span>
            </button>
            <button
              onClick={() => {
                onOpenImportModal()
                onClose()
              }}
              className="px-3 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-bold text-xs rounded-xl border border-zinc-700 transition flex items-center justify-center gap-1.5"
            >
              <Upload className="w-4 h-4 text-emerald-400" />
              <span>Importar</span>
            </button>
          </div>
        </div>

        {/* Search Input */}
        <div className="px-4 pt-3 pb-2">
          <div className="relative">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Buscar por título, artista o tono..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full bg-zinc-800/90 text-sm text-zinc-200 placeholder-zinc-400 pl-9 pr-4 py-2 rounded-xl border border-zinc-700 focus:outline-none focus:border-emerald-500"
            />
          </div>
        </div>

        {/* Tag Filters */}
        {allTags.length > 0 && (
          <div className="px-4 py-2 flex items-center gap-1.5 overflow-x-auto scrollbar-none border-b border-zinc-800/50">
            <button
              onClick={() => setSelectedTag(null)}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
                selectedTag === null
                  ? 'bg-emerald-500 text-zinc-950 font-bold'
                  : 'bg-zinc-800 text-zinc-400 hover:text-white'
              }`}
            >
              Todos
            </button>
            {allTags.map(tag => (
              <button
                key={tag}
                onClick={() => setSelectedTag(t => (t === tag ? null : tag))}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
                  selectedTag === tag
                    ? 'bg-emerald-500 text-zinc-950 font-bold'
                    : 'bg-zinc-800 text-zinc-400 hover:text-white'
                }`}
              >
                {tag}
              </button>
            ))}
          </div>
        )}

        {/* Songs List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {filteredSongs.length === 0 ? (
            <div className="text-center py-12 text-zinc-400">
              <p className="text-sm">No se encontraron canciones.</p>
            </div>
          ) : (
            filteredSongs.map(song => {
              const isActive = song.id === activeSongId
              return (
                <div
                  key={song.id}
                  onClick={() => {
                    onSelectSong(song.id)
                    onClose()
                  }}
                  className={`group relative p-3.5 rounded-2xl border cursor-pointer transition flex items-center justify-between gap-3 ${
                    isActive
                      ? 'bg-emerald-500/15 border-emerald-500 shadow-md'
                      : 'bg-zinc-800/50 border-zinc-700/60 hover:bg-zinc-800 hover:border-zinc-600'
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <h3
                      className={`font-bold text-sm truncate ${
                        isActive ? 'text-emerald-400 font-black' : 'text-zinc-100'
                      }`}
                    >
                      {song.title}
                    </h3>
                    <p className="text-xs text-zinc-400 truncate mt-0.5">{song.artist}</p>

                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-zinc-900 border border-zinc-700 text-emerald-400">
                        {song.currentKey || song.originalKey}
                      </span>
                      {song.capo > 0 && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-500/10 border border-amber-500/30 text-amber-300">
                          Capo {song.capo}
                        </span>
                      )}
                      {song.tempo && (
                        <span className="text-[10px] font-medium text-zinc-400">
                          {song.tempo} bpm
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions: Duplicate & Delete */}
                  <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100">
                    <button
                      onClick={e => {
                        e.stopPropagation()
                        onDuplicateSong(song.id)
                      }}
                      title="Duplicar canción"
                      className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-700 rounded-lg transition"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                    {songs.length > 1 && (
                      <button
                        onClick={e => {
                          e.stopPropagation()
                          if (confirm(`¿Eliminar "${song.title}"?`)) {
                            onDeleteSong(song.id)
                          }
                        }}
                        title="Eliminar canción"
                        className="p-1.5 text-zinc-400 hover:text-rose-400 hover:bg-zinc-700 rounded-lg transition"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              )
            })
          )}
        </div>

        {/* Drawer Footer: Backup */}
        <div className="p-3 border-t border-zinc-800 bg-zinc-950/50 flex items-center justify-between text-xs text-zinc-400">
          <button
            onClick={onExportLibrary}
            className="flex items-center gap-1.5 hover:text-emerald-300 py-1 px-2 rounded-lg hover:bg-zinc-800 transition"
            title="Descargar copia de seguridad en JSON de todas tus canciones"
          >
            <Download className="w-3.5 h-3.5" />
            Descargar Respaldo (JSON)
          </button>
        </div>
      </div>
    </div>
  )
}
