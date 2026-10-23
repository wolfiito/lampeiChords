import { useState, useRef } from 'react'
import { useSongs } from './hooks/useSongs'
import { useServices } from './hooks/useServices'
import { Navbar } from './components/Navbar'
import { SongViewer } from './components/SongViewer'
import { SongEditor } from './components/SongEditor'
import { SongList } from './components/SongList'
import { SongLibraryView } from './components/SongLibraryView'
import { ImportModal } from './components/ImportModal'
import { AutoScrollControls } from './components/AutoScrollControls'
import type { Song } from './types/song'

export function App() {
  const {
    songs,
    activeSong,
    activeSongId,
    setActiveSongId,
    saveSong,
    deleteSong,
    duplicateSong,
    importLibrary,
    exportLibrary
  } = useSongs()

  const {
    services,
    activeService,
    setActiveServiceId,
    saveService,
    deleteService,
    duplicateService,
    addSongToService,
    removeSongFromService,
    reorderSongsInService
  } = useServices()

  // App starts on the Repertoire catalog ('library') instead of jumping straight into a song!
  const [viewMode, setViewMode] = useState<'library' | 'viewer' | 'editor'>('library')
  const [draftSong, setDraftSong] = useState<Song | null>(null)
  const [isLibraryOpen, setIsLibraryOpen] = useState(false)
  const [isImportOpen, setIsImportOpen] = useState(false)
  const [isPrintRequested, setIsPrintRequested] = useState(false)
  const [activeSectionIndex, setActiveSectionIndex] = useState<number>(-1)
  const [serviceSongIndex, setServiceSongIndex] = useState<number>(0)

  const scrollRef = useRef<HTMLDivElement>(null)

  const handleNewSong = () => {
    const newId = `song-${Date.now()}`
    const templateSong: Song = {
      id: newId,
      title: 'Nueva Canción',
      artist: 'Artista',
      originalKey: 'C',
      currentKey: 'C',
      capo: 0,
      tempo: 100,
      tags: ['Favoritos'],
      content: `{title: Nueva Canción}\n{artist: Artista}\n{key: C}\n\n[Intro]\n[C]  [G]  [Am]  [F]\n\n[Verso 1]\nEscribe aquí [C]tu letra con los a[G]cordes entre corchetes.\nCada acorde en [Am]corchetes se ubicará [F]exactamente sobre la sílaba.\n\n[Coro]\n[C]¡Canta con fuerza!\n[G]¡Sube o baja el tono con un clic!\n[Am]  [F]  [C]`,
      createdAt: Date.now(),
      updatedAt: Date.now()
    }
    // Set as draft WITHOUT saving to database or localStorage!
    setDraftSong(templateSong)
    setViewMode('editor')
  }

  // Handle playing inside a Service
  const handleStartServiceSong = (serviceId: string, startIndex: number) => {
    setActiveServiceId(serviceId)
    setServiceSongIndex(startIndex)
    const targetService = services.find(s => s.id === serviceId)
    const targetSongId = targetService?.songIds[startIndex]
    if (targetSongId) {
      setDraftSong(null)
      setActiveSongId(targetSongId)
      setViewMode('viewer')
    }
  }

  // Navigate between songs within active service
  const handleNavigateServiceSong = (direction: 'prev' | 'next') => {
    if (!activeService) return
    const nextIndex = direction === 'next' ? serviceSongIndex + 1 : serviceSongIndex - 1
    if (nextIndex >= 0 && nextIndex < activeService.songIds.length) {
      setServiceSongIndex(nextIndex)
      const nextSongId = activeService.songIds[nextIndex]
      if (nextSongId) {
        setActiveSongId(nextSongId)
        window.scrollTo({ top: 0, behavior: 'smooth' })
      }
    }
  }

  const handleJumpToServiceSongIndex = (index: number) => {
    if (!activeService) return
    if (index >= 0 && index < activeService.songIds.length) {
      setServiceSongIndex(index)
      const targetSongId = activeService.songIds[index]
      if (targetSongId) {
        setActiveSongId(targetSongId)
        window.scrollTo({ top: 0, behavior: 'smooth' })
      }
    }
  }

  // Ordered Song objects for the active service
  const activeServiceSongs = activeService
    ? activeService.songIds
        .map(id => songs.find(s => s.id === id))
        .filter((s): s is Song => Boolean(s))
    : []

  // Current song being edited: if it's a new song draft, use draftSong; otherwise activeSong
  const songToEdit = draftSong || activeSong

  // 1. Repertoire Dashboard (Home view when entering the app)
  if (viewMode === 'library' || (!activeSong && !draftSong)) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col font-sans selection:bg-emerald-500 selection:text-white">
        <SongLibraryView
          songs={songs}
          services={services}
          onSelectSong={id => {
            setDraftSong(null)
            setActiveServiceId(null) // Disassociate from any service when choosing a standalone song
            setActiveSongId(id)
            setViewMode('viewer')
          }}
          onNewSong={handleNewSong}
          onEditSong={id => {
            setDraftSong(null)
            setActiveSongId(id)
            setViewMode('editor')
          }}
          onDuplicateSong={duplicateSong}
          onDeleteSong={deleteSong}
          onOpenImportModal={() => setIsImportOpen(true)}
          onExportLibrary={exportLibrary}
          onStartServiceSong={handleStartServiceSong}
          onSaveService={saveService}
          onDeleteService={deleteService}
          onDuplicateService={duplicateService}
          onAddSongToService={addSongToService}
          onRemoveSongFromService={removeSongFromService}
          onReorderSongsInService={reorderSongsInService}
        />

        {/* Smart Import Modal */}
        <ImportModal
          isOpen={isImportOpen}
          onClose={() => setIsImportOpen(false)}
          onSaveSong={newSong => {
            saveSong(newSong)
            if (newSong.id) setActiveSongId(newSong.id)
            setViewMode('viewer')
          }}
          onImportLibrary={importLibrary}
        />
      </div>
    )
  }

  // 2. Song Viewer or Song Editor View
  return (
    <div ref={scrollRef} className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col font-sans">
      {/* Top Navbar ONLY when editing */}
      {viewMode === 'editor' && (
        <Navbar
          songTitle={draftSong ? draftSong.title : (activeSong?.title || '')}
          isEditing={true}
          onToggleEdit={() => {
            if (draftSong) {
              // Discard unsaved draft if toggling away
              setDraftSong(null)
              setViewMode(activeSong ? 'viewer' : 'library')
            } else {
              setViewMode('viewer')
            }
          }}
          onOpenLibrary={() => setIsLibraryOpen(true)}
          onOpenPrint={() => setIsPrintRequested(true)}
          onBackToLibrary={() => {
            if (draftSong) {
              setDraftSong(null)
            }
            setViewMode('library')
          }}
        />
      )}

      {/* Main Content Area: Editor or Viewer */}
      <main className="flex-1">
        {viewMode === 'editor' && songToEdit ? (
          <SongEditor
            song={songToEdit}
            onSave={updated => {
              if (draftSong) {
                // Now and ONLY now, persist the new song!
                const completeNewSong = { ...draftSong, ...updated }
                saveSong(completeNewSong)
                setActiveSongId(draftSong.id)
                setDraftSong(null)
              } else if (activeSong) {
                saveSong({ id: activeSong.id, ...updated })
              }
              setViewMode('viewer')
            }}
            onCancel={() => {
              if (draftSong) {
                // Cancel draft without saving anything
                setDraftSong(null)
                setViewMode('library')
              } else {
                setViewMode('viewer')
              }
            }}
          />
        ) : activeSong ? (
          <SongViewer
            song={activeSong}
            onUpdateSong={updated => saveSong({ id: activeSong.id, ...updated })}
            onEdit={() => setViewMode('editor')}
            isPrintRequested={isPrintRequested}
            onClosePrint={() => setIsPrintRequested(false)}
            onBackToLibrary={() => {
              setActiveSectionIndex(-1)
              setViewMode('library')
            }}
            onOpenLibrary={() => setIsLibraryOpen(true)}
            activeSectionIndex={activeSectionIndex}
            activeService={activeService}
            serviceSongs={activeServiceSongs}
            currentServiceSongIndex={serviceSongIndex}
            onNavigateServiceSong={handleNavigateServiceSong}
            onJumpToServiceSongIndex={handleJumpToServiceSongIndex}
          />
        ) : null}
      </main>

      {/* Musician AutoScroll Tool (only while viewing lyrics) */}
      {viewMode === 'viewer' && activeSong && (
        <AutoScrollControls
          song={activeSong}
          activeSectionIndex={activeSectionIndex}
          onActiveSectionChange={setActiveSectionIndex}
        />
      )}

      {/* Song Library Drawer (for quick song switching while in viewer) */}
      <SongList
        isOpen={isLibraryOpen}
        onClose={() => setIsLibraryOpen(false)}
        songs={songs}
        activeSongId={activeSongId}
        onSelectSong={id => {
          setDraftSong(null)
          setActiveSongId(id)
          setViewMode('viewer')
        }}
        onNewSong={handleNewSong}
        onDuplicateSong={duplicateSong}
        onDeleteSong={deleteSong}
        onOpenImportModal={() => setIsImportOpen(true)}
        onExportLibrary={exportLibrary}
      />

      {/* Smart Import Modal */}
      <ImportModal
        isOpen={isImportOpen}
        onClose={() => setIsImportOpen(false)}
        onSaveSong={newSong => {
          saveSong(newSong)
          if (newSong.id) setActiveSongId(newSong.id)
          setViewMode('viewer')
        }}
        onImportLibrary={importLibrary}
      />
    </div>
  )
}

export default App
