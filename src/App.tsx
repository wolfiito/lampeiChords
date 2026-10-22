import { useState, useRef } from 'react'
import { Music, Radio } from 'lucide-react'
import { useSongs } from './hooks/useSongs'
import { Navbar } from './components/Navbar'
import { SongViewer } from './components/SongViewer'
import { SongEditor } from './components/SongEditor'
import { SongList } from './components/SongList'
import { SongLibraryView } from './components/SongLibraryView'
import { ImportModal } from './components/ImportModal'
import { AutoScrollControls } from './components/AutoScrollControls'
import { Tuner } from './components/Tuner'
import { ThemeDropdown } from './components/ThemeDropdown'
import { useTheme } from './context/ThemeContext'
import type { Song } from './types/song'

export function App() {
  const { themeConfig } = useTheme()
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
  const [viewMode, setViewMode] = useState<'library' | 'tuner' | 'viewer' | 'editor'>('library')
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

  // 1. Tuner View
  if (viewMode === 'tuner') {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col font-sans pb-16">
        {/* Top Header matching home */}
        <header className="border-b border-zinc-800/80 bg-zinc-900/60 backdrop-blur-md sticky top-0 z-20">
          <div className="max-w-6xl mx-auto px-2.5 sm:px-6 h-14 sm:h-20 flex items-center justify-between gap-1.5 sm:gap-4 flex-nowrap">
            {/* Logo & Brand */}
            <div
              onClick={() => setViewMode('library')}
              className="flex items-center gap-1.5 sm:gap-3 shrink-0 min-w-0 cursor-pointer hover:opacity-90 transition"
              title="Volver a Canciones"
            >
              <img
                src="/logo.png"
                alt="Logo Lampei"
                className="h-8 sm:h-11 w-auto object-contain shrink-0 drop-shadow-[0_2px_12px_rgba(16,185,129,0.4)] transition-transform hover:scale-105"
              />
              <div className="min-w-0">
                <span className="font-black text-sm sm:text-xl tracking-tight text-white block leading-tight truncate">
                  chords<span className={`transition-colors ${themeConfig.primaryText}`}>Lampei</span>
                </span>
                <span className="text-[10px] sm:text-[11px] text-zinc-400 font-medium hidden sm:inline">Repertorio Digital & Cifrados</span>
              </div>
            </div>

            {/* Module Navigation Tabs */}
            <div className="flex items-center bg-zinc-950 p-0.5 sm:p-1 rounded-xl sm:rounded-2xl border border-zinc-800 shrink-0 gap-0.5 sm:gap-1">
              <button
                type="button"
                onClick={() => setViewMode('library')}
                className="p-1.5 sm:px-3 sm:py-1.5 rounded-lg sm:rounded-xl text-xs font-bold text-zinc-400 hover:text-white hover:bg-zinc-800/60 transition flex items-center gap-1.5 cursor-pointer"
                title="Ver catálogo de canciones"
              >
                <Music className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Canciones</span>
              </button>
              <button
                type="button"
                className={`p-1.5 sm:px-3 sm:py-1.5 rounded-lg sm:rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${themeConfig.primaryBg} text-white shadow`}
                title="Afinador Digital"
              >
                <Radio className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Afinador</span>
              </button>
            </div>

            {/* Theme Dropdown */}
            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
              <ThemeDropdown />
            </div>
          </div>
        </header>

        {/* Tuner Screen Component */}
        <main className="flex-1">
          <Tuner onBackToLibrary={() => setViewMode('library')} />
        </main>
      </div>
    )
  }

  // 2. Repertoire Dashboard (Home view when entering the app)
  if (viewMode === 'library' || (!activeSong && !draftSong)) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col font-sans">
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
          onOpenTuner={() => setViewMode('tuner')}
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
            onOpenTuner={() => setViewMode('tuner')}
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
