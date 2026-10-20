import React, { useState, useEffect } from 'react'
import {
  Menu,
  Download,
  Edit3,
  BookOpen,
  FileDown,
  Maximize,
  Minimize,
  ArrowLeft
} from 'lucide-react'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

interface NavbarProps {
  songTitle: string
  isEditing: boolean
  onToggleEdit: () => void
  onOpenLibrary: () => void
  onOpenPrint: () => void
  onBackToLibrary?: () => void
}

export const Navbar: React.FC<NavbarProps> = ({
  songTitle,
  isEditing,
  onToggleEdit,
  onOpenLibrary,
  onOpenPrint,
  onBackToLibrary
}) => {
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [isInstallable, setIsInstallable] = useState(false)

  useEffect(() => {
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
      setIsInstallable(true)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstall)

    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement)
    }
    document.addEventListener('fullscreenchange', handleFullscreenChange)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall)
      document.removeEventListener('fullscreenchange', handleFullscreenChange)
    }
  }, [])

  const handleInstallClick = async () => {
    if (!deferredPrompt) return
    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    if (outcome === 'accepted') {
      setIsInstallable(false)
      setDeferredPrompt(null)
    }
  }

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {})
    } else {
      document.exitFullscreen().catch(() => {})
    }
  }

  return (
    <header className="no-print sticky top-0 z-40 bg-zinc-900/95 backdrop-blur-md border-b border-zinc-800 text-zinc-100">
      <div className="max-w-6xl mx-auto px-3 sm:px-4 h-14 sm:h-16 flex items-center justify-between gap-2 sm:gap-4">
        {/* Left: Back to library button or drawer toggle & Brand with Lampei Logo */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {onBackToLibrary ? (
            <button
              onClick={onBackToLibrary}
              className="px-2.5 sm:px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 hover:text-white rounded-xl border border-zinc-700 transition flex items-center gap-1.5 font-bold text-xs shadow-sm"
              title="Volver a la lista de canciones"
            >
              <ArrowLeft className="w-4 h-4 text-emerald-400" />
              <span>Repertorio</span>
            </button>
          ) : (
            <button
              onClick={onOpenLibrary}
              className="p-1.5 sm:p-2 bg-zinc-800/80 hover:bg-zinc-800 text-zinc-200 rounded-xl border border-zinc-700 transition flex items-center gap-1.5"
              title="Abrir repertorio de canciones"
            >
              <Menu className="w-5 h-5 text-emerald-400" />
              <span className="hidden md:inline text-xs font-bold">Repertorio</span>
            </button>
          )}

          <div
            onClick={onBackToLibrary}
            className={`flex items-center gap-1.5 sm:gap-2.5 ${onBackToLibrary ? 'cursor-pointer hover:opacity-90 transition-opacity' : ''}`}
            title={onBackToLibrary ? 'Volver al Repertorio' : undefined}
          >
            <img
              src="/logo.png"
              alt="Logo Lampei"
              className="h-8 sm:h-9 w-auto object-contain shrink-0 drop-shadow-[0_2px_10px_rgba(16,185,129,0.4)] transition-transform hover:scale-105"
            />
            <span className="font-black text-base sm:text-lg tracking-tight text-white whitespace-nowrap">
              chords<span className="text-emerald-400">Lampei</span>
            </span>
          </div>
        </div>

        {/* Center: Current Song Title badge (hidden on small screens to save space) */}
        <div className="hidden lg:flex items-center gap-2 max-w-xs truncate text-center">
          <span className="text-xs text-zinc-400 truncate">
            {isEditing ? 'Editando:' : 'Tocando:'}{' '}
            <strong className="text-emerald-300 font-bold">{songTitle}</strong>
          </span>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* PWA Install Button */}
          {isInstallable && (
            <button
              onClick={handleInstallClick}
              className="px-2.5 sm:px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-md transition flex items-center gap-1 animate-pulse"
              title="Instalar como App en tu dispositivo"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Instalar</span>
            </button>
          )}

          {/* Export PDF Button (1 Page) */}
          <button
            onClick={onOpenPrint}
            title="Exportar canción a PDF (1 sola página)"
            className="px-2.5 sm:px-3 py-1.5 bg-emerald-600/20 hover:bg-emerald-600 hover:text-white text-emerald-300 border border-emerald-500/40 font-bold text-xs rounded-xl transition flex items-center gap-1.5"
          >
            <FileDown className="w-4 h-4 text-emerald-400" />
            <span className="hidden sm:inline">Guardar PDF</span>
          </button>

          {/* Edit / View Toggle */}
          <button
            onClick={onToggleEdit}
            className={`px-2.5 sm:px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 border ${
              isEditing
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                : 'bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-500 shadow-md shadow-emerald-600/20'
            }`}
          >
            {isEditing ? (
              <>
                <BookOpen className="w-4 h-4" />
                <span className="hidden sm:inline">Ver Letra</span>
              </>
            ) : (
              <>
                <Edit3 className="w-4 h-4" />
                <span className="hidden sm:inline">Editar</span>
              </>
            )}
          </button>

          {/* Fullscreen */}
          <button
            onClick={toggleFullscreen}
            title={isFullscreen ? 'Salir de pantalla completa' : 'Pantalla completa para atril'}
            className="p-1.5 sm:p-2 text-zinc-300 hover:text-white hover:bg-zinc-800 rounded-xl border border-zinc-800 transition hidden sm:flex"
          >
            {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </header>
  )
}
