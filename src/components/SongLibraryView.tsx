import React, { useState, useMemo } from 'react'
import {
  Search,
  Plus,
  Trash2,
  Copy,
  Music,
  Download,
  Play,
  Edit3,
  Tag
} from 'lucide-react'
import type { Song } from '../types/song'
import { useTheme } from '../context/ThemeContext'
import { ThemeDropdown } from './ThemeDropdown'

interface SongLibraryViewProps {
  songs: Song[]
  onSelectSong: (id: string) => void
  onNewSong: () => void
  onEditSong: (id: string) => void
  onDuplicateSong: (id: string) => void
  onDeleteSong: (id: string) => void
  onOpenImportModal?: () => void
  onExportLibrary: () => void
}

export const SongLibraryView: React.FC<SongLibraryViewProps> = ({
  songs,
  onSelectSong,
  onNewSong,
  onEditSong,
  onDuplicateSong,
  onDeleteSong,
  onExportLibrary
}) => {
  const { themeConfig } = useTheme()
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedTag, setSelectedTag] = useState<string | null>(null)

  const allTags = useMemo(() => {
    const set = new Set<string>()
    songs.forEach(s => s.tags?.forEach(t => set.add(t)))
    return Array.from(set)
  }, [songs])

  const filteredSongs = useMemo(() => {
    return songs.filter(s => {
      const term = searchTerm.toLowerCase()
      const matchSearch =
        s.title.toLowerCase().includes(term) ||
        s.artist.toLowerCase().includes(term) ||
        s.originalKey.toLowerCase().includes(term) ||
        (s.currentKey && s.currentKey.toLowerCase().includes(term))
      const matchTag = selectedTag ? s.tags?.includes(selectedTag) : true
      return matchSearch && matchTag
    })
  }, [songs, searchTerm, selectedTag])

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col font-sans pb-16">
      {/* Top Hero / Header */}
      <header className="border-b border-zinc-800/80 bg-zinc-900/60 backdrop-blur-md sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-3 sm:px-6 h-14 sm:h-20 flex items-center justify-between gap-2 sm:gap-3">
          {/* Logo & Brand */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0 min-w-0">
            <img
              src="/logo.png"
              alt="Logo Lampei"
              className="h-8 sm:h-11 w-auto object-contain shrink-0 drop-shadow-[0_2px_12px_rgba(16,185,129,0.4)] transition-transform hover:scale-105"
            />
            <div className="min-w-0">
              <span className="font-black text-base sm:text-xl tracking-tight text-white block leading-tight truncate">
                chords<span className={`transition-colors ${themeConfig.primaryText}`}>Lampei</span>
              </span>
              <span className="text-[10px] sm:text-[11px] text-zinc-400 font-medium hidden sm:inline">Repertorio Digital & Cifrados</span>
            </div>
          </div>

          {/* Action Buttons: Theme Selector + Nueva Canción */}
          <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
            <ThemeDropdown />

            <button
              onClick={onNewSong}
              className={`px-2.5 sm:px-3.5 py-1.5 sm:py-2 ${themeConfig.primaryButton} text-xs font-bold rounded-xl shadow-md transition flex items-center gap-1 sm:gap-1.5 cursor-pointer active:scale-95 shrink-0`}
              title="Crear una nueva canción"
            >
              <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span className="hidden sm:inline">Nueva Canción</span>
              <span className="sm:hidden">Nueva</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8 w-full flex-1">
        {/* Title & Stats */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-2.5">
              <span>Canciones</span>
              <span className={`text-xs sm:text-sm font-bold px-2.5 py-0.5 rounded-full border transition-colors ${themeConfig.primaryBadge}`}>
                {songs.length} {songs.length === 1 ? 'canción' : 'canciones'}
              </span>
            </h1>
          </div>
        </div>

        {/* Search & Tags Filter Bar */}
        <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-3 sm:p-4 mb-6 sm:mb-8 space-y-3 shadow-lg">
          {/* Search Box */}
          <div className="relative">
            <Search className="w-4 h-4 sm:w-5 sm:h-5 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Buscar por título, artista o tono (ej. G, C, Alabanza)..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full bg-zinc-950/80 text-sm sm:text-base text-zinc-100 placeholder-zinc-500 pl-10 sm:pl-11 pr-4 py-2.5 rounded-xl border border-zinc-700/80 focus:outline-none focus:border-zinc-500 transition"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="text-xs text-zinc-400 hover:text-white absolute right-3.5 top-1/2 -translate-y-1/2 bg-zinc-800 px-2 py-0.5 rounded-lg"
              >
                Limpiar
              </button>
            )}
          </div>

          {/* Tags Filter Chips */}
          {allTags.length > 0 && (
            <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pt-1">
              <span className="text-xs font-semibold text-zinc-400 flex items-center gap-1 mr-1 shrink-0">
                <Tag className={`w-3.5 h-3.5 ${themeConfig.primaryText}`} /> Filtros:
              </span>
              <button
                onClick={() => setSelectedTag(null)}
                className={`px-3 py-1 rounded-xl text-xs font-bold whitespace-nowrap transition cursor-pointer ${
                  selectedTag === null
                    ? `${themeConfig.primaryButton} shadow-sm`
                    : 'bg-zinc-800 text-zinc-400 hover:text-white'
                }`}
              >
                Todas ({songs.length})
              </button>
              {allTags.map(tag => {
                const count = songs.filter(s => s.tags?.includes(tag)).length
                const isSelected = selectedTag === tag
                return (
                  <button
                    key={tag}
                    onClick={() => setSelectedTag(isSelected ? null : tag)}
                    className={`px-3 py-1 rounded-xl text-xs font-bold whitespace-nowrap transition cursor-pointer ${
                      isSelected
                        ? `${themeConfig.primaryButton} shadow-sm`
                        : 'bg-zinc-800 text-zinc-400 hover:text-white'
                    }`}
                  >
                    #{tag} ({count})
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* Empty State */}
        {filteredSongs.length === 0 ? (
          <div className="bg-zinc-900/40 border border-dashed border-zinc-800 rounded-3xl p-8 sm:p-12 text-center max-w-lg mx-auto">
            <div className="w-14 h-14 mx-auto mb-4 bg-emerald-500/10 text-emerald-400 rounded-2xl flex items-center justify-center">
              <Music className="w-7 h-7" />
            </div>
            <h3 className="text-lg font-bold text-white mb-1">
              {searchTerm || selectedTag ? 'No se encontraron canciones' : 'Tu repertorio está vacío'}
            </h3>
            <p className="text-xs sm:text-sm text-zinc-400 mb-6">
              {searchTerm || selectedTag
                ? 'Prueba buscando con otros términos o limpiando los filtros.'
                : 'Crea tu primera canción o importa tu repertorio existente para comenzar.'}
            </p>
            {searchTerm || selectedTag ? (
              <button
                onClick={() => {
                  setSearchTerm('')
                  setSelectedTag(null)
                }}
                className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-xl text-xs font-bold transition"
              >
                Restablecer filtros
              </button>
            ) : (
              <div className="flex flex-wrap items-center justify-center gap-2.5">
                <button
                  onClick={onNewSong}
                  className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-sm font-bold shadow-lg shadow-emerald-600/30 transition flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  <span>Nueva Canción</span>
                </button>
              </div>
            )}
          </div>
        ) : (
          /* Responsive Song Cards Grid */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-4">
            {filteredSongs.map(song => {
              const displayKey = song.currentKey || song.originalKey || 'C'

              return (
                <div
                  key={song.id}
                  onClick={() => onSelectSong(song.id)}
                  className="group bg-zinc-900/90 hover:bg-zinc-850 border border-zinc-800/80 hover:border-emerald-600/50 rounded-2xl p-4 sm:p-5 transition-all duration-200 cursor-pointer shadow-md hover:shadow-xl hover:shadow-emerald-950/20 flex flex-col justify-between"
                >
                  <div>
                    {/* Header: Title and Tonalidad badge */}
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <h3 className={`font-extrabold text-base sm:text-lg text-white transition-colors line-clamp-1`}>
                        {song.title}
                      </h3>
                      <span className={`shrink-0 text-xs font-black px-2.5 py-0.5 rounded-lg border transition-colors ${themeConfig.primaryBadge}`}>
                        {displayKey}
                      </span>
                    </div>

                    {/* Artist */}
                    <p className="text-xs text-zinc-400 font-medium mb-3 line-clamp-1">
                      {song.artist || 'Artista desconocido'}
                    </p>

                    {/* Badges: Capo, BPM, Tags */}
                    <div className="flex flex-wrap items-center gap-1.5 mb-4">
                      {song.capo > 0 && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-500/10 border border-amber-500/30 text-amber-300">
                          🎸 Capo {song.capo}
                        </span>
                      )}
                      {song.tempo && (
                        <span className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-zinc-800 border border-zinc-700/60 text-zinc-300">
                          ⏱️ {song.tempo} bpm
                        </span>
                      )}
                      {song.tags?.slice(0, 2).map(tag => (
                        <span
                          key={tag}
                          className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-zinc-800 text-zinc-400"
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Footer Actions on Card */}
                  <div className="flex items-center justify-between pt-3 border-t border-zinc-800/80 mt-auto gap-2">
                    {/* Primary Play Button */}
                    <button
                      type="button"
                      onClick={e => {
                        e.stopPropagation()
                        onSelectSong(song.id)
                      }}
                      className={`flex-1 py-1.5 px-3 ${themeConfig.cardButton} rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 border cursor-pointer active:scale-98`}
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>Abrir y Tocar</span>
                    </button>

                    {/* Secondary Actions */}
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={e => {
                          e.stopPropagation()
                          onEditSong(song.id)
                        }}
                        title="Editar canción"
                        className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={e => {
                          e.stopPropagation()
                          onDuplicateSong(song.id)
                        }}
                        title="Duplicar canción"
                        className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={e => {
                          e.stopPropagation()
                          if (confirm(`¿Eliminar "${song.title}"?`)) {
                            onDeleteSong(song.id)
                          }
                        }}
                        title="Eliminar canción"
                        className="p-1.5 text-zinc-400 hover:text-rose-400 hover:bg-zinc-800 rounded-lg transition"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Footer Backup & Info */}
        <div className="mt-12 pt-6 border-t border-zinc-800/80 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-zinc-500">
          <div className="flex items-center gap-2">
            <Music className="w-4 h-4 text-emerald-500" />
            <span>chordsLampei · Repertorio sincronizado</span>
          </div>

          <button
            onClick={onExportLibrary}
            className="flex items-center gap-1.5 hover:text-emerald-400 py-1.5 px-3 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-zinc-700 transition"
            title="Descargar copia de seguridad en JSON de todas tus canciones"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Descargar Copia de Respaldo (JSON)</span>
          </button>
        </div>
      </main>
    </div>
  )
}
