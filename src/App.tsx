import { useState, useRef } from 'react'
import { useSongs } from './hooks/useSongs'
import { Navbar } from './components/Navbar'
import { SongViewer } from './components/SongViewer'
import { SongEditor } from './components/SongEditor'
import { SongList } from './components/SongList'
import { ImportModal } from './components/ImportModal'
import { AutoScrollControls } from './components/AutoScrollControls'

export function App() {
  const {
    songs,
    activeSong,
    activeSongId,
    setActiveSongId,
    saveSong,
    deleteSong,
    duplicateSong,
    resetToDefaults,
    importLibrary,
    exportLibrary
  } = useSongs()

  const [isEditing, setIsEditing] = useState(false)
  const [isLibraryOpen, setIsLibraryOpen] = useState(false)
  const [isImportOpen, setIsImportOpen] = useState(false)
  const [isPrintRequested, setIsPrintRequested] = useState(false)

  const scrollRef = useRef<HTMLDivElement>(null)

  const handleNewSong = () => {
    saveSong({
      title: 'Nueva Canción',
      artist: 'Artista',
      originalKey: 'C',
      currentKey: 'C',
      capo: 0,
      tempo: 100,
      tags: ['Favoritos'],
      content: `{title: Nueva Canción}\n{artist: Artista}\n{key: C}\n\n[Intro]\n[C]  [G]  [Am]  [F]\n\n[Verso 1]\nEscribe aquí [C]tu letra con los a[G]cordes entre corchetes.\nCada acorde en [Am]corchetes se ubicará [F]exactamente sobre la sílaba.\n\n[Coro]\n[C]¡Canta con fuerza!\n[G]¡Sube o baja el tono con un clic!\n[Am]  [F]  [C]`
    })
    setIsEditing(true)
  }

  if (!activeSong) {
    return (
      <div className="min-h-screen bg-zinc-950 text-white flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-zinc-400 mb-4">No hay canciones en tu biblioteca.</p>
          <button
            onClick={handleNewSong}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 rounded-2xl font-bold text-sm shadow-lg shadow-emerald-600/30"
          >
            Crear Primera Canción
          </button>
        </div>
      </div>
    )
  }

  return (
    <div ref={scrollRef} className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col font-sans selection:bg-emerald-500 selection:text-white">
      {/* Top Navbar with chordsLampei Branding */}
      <Navbar
        songTitle={activeSong.title}
        isEditing={isEditing}
        onToggleEdit={() => setIsEditing(e => !e)}
        onOpenLibrary={() => setIsLibraryOpen(true)}
        onOpenPrint={() => setIsPrintRequested(true)}
      />

      {/* Main Content Area: Editor or Viewer */}
      <main className="flex-1">
        {isEditing ? (
          <SongEditor
            song={activeSong}
            onSave={updated => {
              saveSong({ id: activeSong.id, ...updated })
              setIsEditing(false)
            }}
            onCancel={() => setIsEditing(false)}
          />
        ) : (
          <SongViewer
            song={activeSong}
            onUpdateSong={updated => saveSong({ id: activeSong.id, ...updated })}
            onEdit={() => setIsEditing(true)}
            isPrintRequested={isPrintRequested}
            onClosePrint={() => setIsPrintRequested(false)}
          />
        )}
      </main>

      {/* Musician AutoScroll Tool */}
      {!isEditing && <AutoScrollControls />}

      {/* Song Library Drawer */}
      <SongList
        isOpen={isLibraryOpen}
        onClose={() => setIsLibraryOpen(false)}
        songs={songs}
        activeSongId={activeSongId}
        onSelectSong={id => {
          setActiveSongId(id)
          setIsEditing(false)
        }}
        onNewSong={handleNewSong}
        onDuplicateSong={duplicateSong}
        onDeleteSong={deleteSong}
        onOpenImportModal={() => setIsImportOpen(true)}
        onExportLibrary={exportLibrary}
        onResetToDefaults={resetToDefaults}
      />

      {/* Smart Import Modal */}
      <ImportModal
        isOpen={isImportOpen}
        onClose={() => setIsImportOpen(false)}
        onSaveSong={newSong => {
          saveSong(newSong)
          setIsEditing(false)
        }}
        onImportLibrary={importLibrary}
      />
    </div>
  )
}

export default App
