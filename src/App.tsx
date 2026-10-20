import { useState, useRef } from 'react'
import { useSongs } from './hooks/useSongs'
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

  // App starts on the Repertoire catalog ('library') instead of jumping straight into a song!
  const [viewMode, setViewMode] = useState<'library' | 'viewer' | 'editor'>('library')
  const [draftSong, setDraftSong] = useState<Song | null>(null)
  const [isLibraryOpen, setIsLibraryOpen] = useState(false)
  const [isImportOpen, setIsImportOpen] = useState(false)
  const [isPrintRequested, setIsPrintRequested] = useState(false)
  const [activeSectionIndex, setActiveSectionIndex] = useState<number>(-1)

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

  // Current song being edited: if it's a new song draft, use draftSong; otherwise activeSong
  const songToEdit = draftSong || activeSong

  // 1. Repertoire Dashboard (Home view when entering the app)
  if (viewMode === 'library' || (!activeSong && !draftSong)) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col font-sans selection:bg-emerald-500 selection:text-white">
        <SongLibraryView
          songs={songs}
          onSelectSong={id => {
            setDraftSong(null)
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
    <div ref={scrollRef} className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col font-sans selection:bg-emerald-500 selection:text-white">
      {/* Top Navbar with back to library button and branding */}
      <Navbar
        songTitle={draftSong ? draftSong.title : (activeSong?.title || '')}
        isEditing={viewMode === 'editor'}
        onToggleEdit={() => {
          if (draftSong) {
            // Discard unsaved draft if toggling away
            setDraftSong(null)
            setViewMode(activeSong ? 'viewer' : 'library')
          } else {
            setViewMode(m => (m === 'editor' ? 'viewer' : 'editor'))
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
            activeSectionIndex={activeSectionIndex}
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
