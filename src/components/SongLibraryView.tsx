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
  Tag,
  Calendar,
  MapPin,
  ListMusic
} from 'lucide-react'
import type { Song } from '../types/song'
import type { ServiceItem } from '../types/service'
import { useTheme } from '../context/ThemeContext'
import { ThemeDropdown } from './ThemeDropdown'
import { ServiceDetailView } from './ServiceDetailView'
import { ServiceModal } from './ServiceModal'

interface SongLibraryViewProps {
  songs: Song[]
  services?: ServiceItem[]
  onSelectSong: (id: string) => void
  onNewSong: () => void
  onEditSong: (id: string) => void
  onDuplicateSong: (id: string) => void
  onDeleteSong: (id: string) => void
  onOpenImportModal?: () => void
  onExportLibrary: () => void
  // Service management props
  onStartServiceSong?: (serviceId: string, startIndex: number) => void
  onSaveService?: (service: ServiceItem) => void
  onDeleteService?: (id: string) => void
  onDuplicateService?: (id: string) => void
  onAddSongToService?: (serviceId: string, songId: string) => void
  onRemoveSongFromService?: (serviceId: string, songIndex: number) => void
  onReorderSongsInService?: (serviceId: string, newSongIds: string[]) => void
}

export const SongLibraryView: React.FC<SongLibraryViewProps> = ({
  songs,
  services = [],
  onSelectSong,
  onNewSong,
  onEditSong,
  onDuplicateSong,
  onDeleteSong,
  onExportLibrary,
  onStartServiceSong,
  onSaveService,
  onDeleteService,
  onDuplicateService,
  onAddSongToService,
  onRemoveSongFromService,
  onReorderSongsInService
}) => {
  const { themeConfig } = useTheme()
  const [libraryTab, setLibraryTab] = useState<'songs' | 'services'>('songs')
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedTag, setSelectedTag] = useState<string | null>(null)

  // Service Detail view state
  const [selectedServiceDetailId, setSelectedServiceDetailId] = useState<string | null>(null)
  const [isServiceModalOpen, setIsServiceModalOpen] = useState(false)
  const [editingService, setEditingService] = useState<ServiceItem | null>(null)

  const songMap = useMemo(() => new Map(songs.map(s => [s.id, s])), [songs])

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

  const filteredServices = useMemo(() => {
    const term = searchTerm.toLowerCase()
    return services.filter(s => {
      return (
        s.title.toLowerCase().includes(term) ||
        (s.location && s.location.toLowerCase().includes(term)) ||
        (s.date && s.date.includes(term))
      )
    })
  }, [services, searchTerm])

  const getServiceTypeBadge = (type?: string) => {
    switch (type) {
      case 'ensayo':
        return { label: '🎸 Ensayo', bg: 'bg-blue-500/10 border-blue-500/30 text-blue-400' }
      case 'evento':
        return { label: '✨ Especial', bg: 'bg-purple-500/10 border-purple-500/30 text-purple-400' }
      default:
        return { label: '⛪ Servicio', bg: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' }
    }
  }

  // If a specific service is selected for detail view:
  if (selectedServiceDetailId) {
    const currentService = services.find(s => s.id === selectedServiceDetailId)
    if (currentService) {
      return (
        <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col font-sans pb-16">
          <header className="border-b border-zinc-800/80 bg-zinc-900/60 backdrop-blur-md sticky top-0 z-20">
            <div className="max-w-6xl mx-auto px-3 sm:px-6 h-14 sm:h-16 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <img
                  src="/logo.png"
                  alt="Logo Lampei"
                  className="h-8 w-auto object-contain shrink-0"
                />
                <span className="font-black text-base text-white">
                  chords<span className={themeConfig.primaryText}>Lampei</span>
                </span>
              </div>
              <ThemeDropdown />
            </div>
          </header>

          <ServiceDetailView
            service={currentService}
            songs={songs}
            onBack={() => setSelectedServiceDetailId(null)}
            onStartService={startIndex => {
              if (onStartServiceSong) {
                onStartServiceSong(currentService.id, startIndex)
              }
            }}
            onEditService={s => {
              setEditingService(s)
              setIsServiceModalOpen(true)
            }}
            onAddSong={(serviceId, songId) => onAddSongToService?.(serviceId, songId)}
            onRemoveSong={(serviceId, songIndex) => onRemoveSongFromService?.(serviceId, songIndex)}
            onReorderSongs={(serviceId, newSongIds) => onReorderSongsInService?.(serviceId, newSongIds)}
          />

          <ServiceModal
            isOpen={isServiceModalOpen}
            onClose={() => setIsServiceModalOpen(false)}
            onSave={s => onSaveService?.(s)}
            initialService={editingService}
          />
        </div>
      )
    }
  }

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

          {/* Action Buttons: Theme Selector + New Song / New Service Button */}
          <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
            <ThemeDropdown />

            {libraryTab === 'songs' ? (
              <button
                onClick={onNewSong}
                className={`px-2.5 sm:px-3.5 py-1.5 sm:py-2 ${themeConfig.primaryButton} text-xs font-bold rounded-xl shadow-md transition flex items-center gap-1 sm:gap-1.5 cursor-pointer active:scale-95 shrink-0`}
                title="Crear una nueva canción"
              >
                <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <span className="hidden sm:inline">Nueva Canción</span>
                <span className="sm:hidden">Nueva</span>
              </button>
            ) : (
              <button
                onClick={() => {
                  setEditingService(null)
                  setIsServiceModalOpen(true)
                }}
                className={`px-2.5 sm:px-3.5 py-1.5 sm:py-2 ${themeConfig.primaryButton} text-xs font-bold rounded-xl shadow-md transition flex items-center gap-1 sm:gap-1.5 cursor-pointer active:scale-95 shrink-0`}
                title="Crear un nuevo servicio"
              >
                <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <span className="hidden sm:inline">Nuevo Servicio</span>
                <span className="sm:hidden">Nuevo</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8 w-full flex-1">
        {/* Navigation Tabs: Canciones vs Servicios (Sin caja desproporcionada ni línea divisoria) */}
        <div className="flex items-center gap-6 sm:gap-8 mb-4">
          <button
            onClick={() => {
              setLibraryTab('songs')
              setSelectedServiceDetailId(null)
            }}
            className={`pb-2 text-sm sm:text-base font-bold transition-all flex items-center gap-2 cursor-pointer relative ${
              libraryTab === 'songs'
                ? `${themeConfig.primaryText}`
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Music className="w-4 h-4" />
            <span>Canciones</span>
            <span className="text-xs opacity-60 font-mono">({songs.length})</span>
            {libraryTab === 'songs' && (
              <span className={`absolute bottom-0 left-0 right-0 h-0.5 ${themeConfig.primaryBg} rounded-full`} />
            )}
          </button>

          <button
            onClick={() => {
              setLibraryTab('services')
            }}
            className={`pb-2 text-sm sm:text-base font-bold transition-all flex items-center gap-2 cursor-pointer relative ${
              libraryTab === 'services'
                ? `${themeConfig.primaryText}`
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Calendar className="w-4 h-4" />
            <span>Servicios</span>
            <span className="text-xs opacity-60 font-mono">({services.length})</span>
            {libraryTab === 'services' && (
              <span className={`absolute bottom-0 left-0 right-0 h-0.5 ${themeConfig.primaryBg} rounded-full`} />
            )}
          </button>
        </div>

        {/* Search & Filter Bar (Sin caja) */}
        <div className="mb-6 space-y-3">
          {/* Search Box - Flat, clean and minimal */}
          <div className="relative border-b border-zinc-800/80 focus-within:border-emerald-500 transition-colors pb-1">
            <Search className="w-4 h-4 sm:w-5 sm:h-5 text-zinc-500 absolute left-1 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder={
                libraryTab === 'songs'
                  ? 'Buscar por título, artista o tono (ej. G, C, Alabanza)...'
                  : 'Buscar servicio por nombre, fecha o iglesia...'
              }
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full bg-transparent text-sm sm:text-base text-zinc-100 placeholder-zinc-500 pl-8 sm:pl-9 pr-16 py-2 focus:outline-none transition"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="text-xs text-zinc-400 hover:text-white absolute right-1 top-1/2 -translate-y-1/2 bg-zinc-800 hover:bg-zinc-700 px-2 py-0.5 rounded-lg cursor-pointer transition"
              >
                Limpiar
              </button>
            )}
          </div>

          {/* Tags Filter Chips (only for Songs tab) */}
          {libraryTab === 'songs' && allTags.length > 0 && (
            <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pt-0.5">
              <span className="text-xs font-semibold text-zinc-500 flex items-center gap-1 mr-1 shrink-0">
                <Tag className={`w-3.5 h-3.5 ${themeConfig.primaryText}`} />
              </span>
              <button
                onClick={() => setSelectedTag(null)}
                className={`px-3 py-1 rounded-xl text-xs font-bold whitespace-nowrap transition cursor-pointer ${
                  selectedTag === null
                    ? `${themeConfig.primaryButton} shadow-sm`
                    : 'bg-zinc-900/60 text-zinc-400 hover:text-white hover:bg-zinc-800'
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
                        : 'bg-zinc-900/60 text-zinc-400 hover:text-white hover:bg-zinc-800'
                    }`}
                  >
                    #{tag} ({count})
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* ============================================================== */}
        {/* TAB 1: CANCIONES GENERALES                                    */}
        {/* ============================================================== */}
        {libraryTab === 'songs' && (
          <>
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
                    className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-xl text-xs font-bold transition cursor-pointer"
                  >
                    Restablecer filtros
                  </button>
                ) : (
                  <button
                    onClick={onNewSong}
                    className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-sm font-bold shadow-lg shadow-emerald-600/30 transition flex items-center gap-2 mx-auto cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Crear Primera Canción</span>
                  </button>
                )}
              </div>
            ) : (
              <div className="divide-y divide-zinc-800/60 border-y border-zinc-800/60">
                {filteredSongs.map(song => {
                  return (
                    <div
                      key={song.id}
                      onClick={() => onSelectSong(song.id)}
                      className="py-3 px-2 sm:px-4 flex items-center justify-between gap-3 hover:bg-zinc-900/50 transition cursor-pointer group"
                    >
                      {/* Left: Info de la canción */}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`font-bold text-sm sm:text-base ${themeConfig.primaryText} hover:brightness-125 transition-colors truncate`}>
                            {song.title}
                          </span>
                          {song.capo > 0 && (
                            <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-amber-500/10 border border-amber-500/30 text-amber-300 shrink-0">
                              Capo {song.capo}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2 text-xs text-zinc-400 mt-0.5 truncate">
                          <span>{song.artist || 'Artista desconocido'}</span>
                          {song.tags && song.tags.length > 0 && (
                            <span className="text-zinc-500 hidden sm:inline">
                              · {song.tags.slice(0, 2).map(t => `#${t}`).join(' ')}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Right: Actions */}
                      <div className="flex items-center gap-1 sm:gap-1.5 shrink-0" onClick={e => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={() => onSelectSong(song.id)}
                          className="p-1.5 sm:px-3 sm:py-1 bg-zinc-850 hover:bg-emerald-600 text-zinc-300 hover:text-white rounded-lg text-xs font-semibold transition flex items-center gap-1 cursor-pointer active:scale-95"
                          title="Abrir y tocar"
                        >
                          <Play className="w-3.5 h-3.5 fill-current" />
                          <span className="hidden sm:inline">Tocar</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => onEditSong(song.id)}
                          title="Editar canción"
                          className="p-1.5 text-zinc-500 hover:text-white hover:bg-zinc-800 rounded-lg transition cursor-pointer"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>

                        <button
                          type="button"
                          onClick={() => onDuplicateSong(song.id)}
                          title="Duplicar canción"
                          className="p-1.5 text-zinc-500 hover:text-white hover:bg-zinc-800 rounded-lg transition cursor-pointer"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            if (confirm(`¿Eliminar "${song.title}"?`)) {
                              onDeleteSong(song.id)
                            }
                          }}
                          title="Eliminar canción"
                          className="p-1.5 text-zinc-500 hover:text-rose-400 hover:bg-zinc-800 rounded-lg transition cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </>
        )}

        {/* ============================================================== */}
        {/* TAB 2: SERVICIOS Y ENSAYOS                                     */}
        {/* ============================================================== */}
        {libraryTab === 'services' && (
          <>
            {filteredServices.length === 0 ? (
              <div className="bg-zinc-900/40 border border-dashed border-zinc-800 rounded-3xl p-8 sm:p-12 text-center max-w-lg mx-auto">
                <div className="w-14 h-14 mx-auto mb-4 bg-emerald-500/10 text-emerald-400 rounded-2xl flex items-center justify-center">
                  <Calendar className="w-7 h-7" />
                </div>
                <h3 className="text-lg font-bold text-white mb-1">
                  {searchTerm ? 'No se encontraron servicios' : 'Aún no tienes servicios creados'}
                </h3>
                <p className="text-xs sm:text-sm text-zinc-400 mb-6">
                  {searchTerm
                    ? 'Prueba buscando con otro nombre o fecha.'
                    : 'Crea un servicio para ordenar las canciones de tu próximo domingo o ensayo y pasar entre ellas con un toque.'}
                </p>
                <button
                  onClick={() => {
                    setEditingService(null)
                    setIsServiceModalOpen(true)
                  }}
                  className={`px-4 py-2.5 ${themeConfig.primaryButton} rounded-xl text-sm font-bold shadow-lg transition flex items-center gap-2 mx-auto cursor-pointer`}
                >
                  <Plus className="w-4 h-4" />
                  <span>Crear Primer Servicio</span>
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredServices.map(service => {
                  const typeInfo = getServiceTypeBadge(service.type)
                  const songCount = service.songIds.length
                  const firstThreeSongs = service.songIds
                    .slice(0, 3)
                    .map(id => songMap.get(id)?.title)
                    .filter(Boolean)

                  return (
                    <div
                      key={service.id}
                      onClick={() => setSelectedServiceDetailId(service.id)}
                      className="group bg-zinc-900/90 hover:bg-zinc-850 border border-zinc-800/80 hover:border-emerald-600/50 rounded-2xl p-4 sm:p-5 transition-all duration-200 cursor-pointer shadow-md hover:shadow-xl hover:shadow-emerald-950/20 flex flex-col justify-between"
                    >
                      <div>
                        {/* Type, Date, Location Badges */}
                        <div className="flex flex-wrap items-center gap-1.5 mb-2.5">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${typeInfo.bg}`}>
                            {typeInfo.label}
                          </span>
                          {service.date && (
                            <span className="text-[10px] font-semibold text-zinc-400 flex items-center gap-1 bg-zinc-800/80 px-2 py-0.5 rounded-full border border-zinc-700/60">
                              <Calendar className="w-2.5 h-2.5 text-zinc-400" />
                              <span>{service.date}</span>
                            </span>
                          )}
                          {service.location && (
                            <span className="text-[10px] font-semibold text-zinc-300 flex items-center gap-1 bg-zinc-800/80 px-2 py-0.5 rounded-full border border-zinc-700/60">
                              <MapPin className="w-2.5 h-2.5 text-amber-400" />
                              <span className="truncate max-w-[110px]">{service.location}</span>
                            </span>
                          )}
                        </div>

                        {/* Title */}
                        <h3 className="font-extrabold text-base sm:text-lg text-white mb-1.5 line-clamp-1">
                          {service.title}
                        </h3>

                        {/* Song Count & Preview */}
                        <div className="mb-4">
                          <div className="text-xs font-bold text-emerald-400 mb-1 flex items-center gap-1">
                            <ListMusic className="w-3.5 h-3.5" />
                            <span>{songCount} {songCount === 1 ? 'canción' : 'canciones'}</span>
                          </div>

                          {firstThreeSongs.length > 0 ? (
                            <div className="space-y-0.5 text-[11px] text-zinc-400">
                              {firstThreeSongs.map((t, idx) => (
                                <div key={idx} className="truncate">
                                  {idx + 1}. {t}
                                </div>
                              ))}
                              {songCount > 3 && (
                                <span className="text-[10px] text-zinc-500 italic">
                                  + {songCount - 3} más...
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-[11px] text-zinc-500 italic">
                              Sin canciones aún (toca para agregar)
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Footer Actions on Service Card */}
                      <div className="flex items-center justify-between pt-3 border-t border-zinc-800/80 mt-auto gap-2">
                        {/* Primary Button */}
                        <button
                          type="button"
                          onClick={e => {
                            e.stopPropagation()
                            if (songCount > 0 && onStartServiceSong) {
                              onStartServiceSong(service.id, 0)
                            } else {
                              setSelectedServiceDetailId(service.id)
                            }
                          }}
                          className={`flex-1 py-1.5 px-3 ${themeConfig.cardButton} rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 border cursor-pointer active:scale-98`}
                        >
                          <Play className="w-3.5 h-3.5 fill-current" />
                          <span>{songCount > 0 ? 'Tocar Servicio' : 'Ver Canciones'}</span>
                        </button>

                        {/* Actions */}
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={e => {
                              e.stopPropagation()
                              setEditingService(service)
                              setIsServiceModalOpen(true)
                            }}
                            title="Editar datos del servicio"
                            className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>

                          <button
                            type="button"
                            onClick={e => {
                              e.stopPropagation()
                              onDuplicateService?.(service.id)
                            }}
                            title="Duplicar servicio"
                            className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>

                          <button
                            type="button"
                            onClick={e => {
                              e.stopPropagation()
                              if (confirm(`¿Eliminar el servicio "${service.title}"?`)) {
                                onDeleteService?.(service.id)
                              }
                            }}
                            title="Eliminar servicio"
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
          </>
        )}

        {/* Footer Backup & Info */}
        <div className="mt-12 pt-6 border-t border-zinc-800/80 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-zinc-500">
          <div className="flex items-center gap-2">
            <Music className="w-4 h-4 text-emerald-500" />
            <span>chordsLampei · Repertorio y Servicios en la nube</span>
          </div>

          <button
            onClick={onExportLibrary}
            className="flex items-center gap-1.5 hover:text-emerald-400 py-1.5 px-3 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-zinc-700 transition cursor-pointer"
            title="Descargar copia de seguridad en JSON de todas tus canciones"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Descargar Copia de Respaldo (JSON)</span>
          </button>
        </div>
      </main>

      {/* Service Edit / Create Modal */}
      <ServiceModal
        isOpen={isServiceModalOpen}
        onClose={() => setIsServiceModalOpen(false)}
        onSave={s => onSaveService?.(s)}
        initialService={editingService}
      />
    </div>
  )
}
