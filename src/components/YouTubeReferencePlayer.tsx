import React, { useState, useEffect } from 'react'
import {
  X,
  Minimize2,
  Maximize2,
  ExternalLink,
  Edit2,
  Play,
  Pause,
  Check,
  AlertCircle
} from 'lucide-react'
import { YouTubeIcon } from './YouTubeIcon'
import { parseYouTubeUrl, buildYouTubeEmbedUrl, getYouTubeThumbnailUrl } from '../music/youtubeUtils'
import { useTheme } from '../context/ThemeContext'

interface YouTubeReferencePlayerProps {
  songTitle: string
  youtubeUrl?: string
  isOpen: boolean
  onClose: () => void
  onUpdateUrl: (newUrl: string) => void
  stageMode?: boolean
}

export const YouTubeReferencePlayer: React.FC<YouTubeReferencePlayerProps> = ({
  songTitle,
  youtubeUrl,
  isOpen,
  onClose,
  onUpdateUrl,
  stageMode: _stageMode = false
}) => {
  const { themeConfig } = useTheme()

  // Player view mode: 'expanded' (full video), 'minimized' (compact audio pill)
  const [isMinimized, setIsMinimized] = useState<boolean>(() => {
    try {
      return localStorage.getItem('chords_yt_minimized') === 'true'
    } catch {
      return false
    }
  })

  // URL editing modal state
  const [isEditingUrl, setIsEditingUrl] = useState<boolean>(!youtubeUrl)
  const [urlInput, setUrlInput] = useState<string>(youtubeUrl || '')
  const [inputError, setInputError] = useState<string | null>(null)

  // Auto-scroll sync toggle
  const [syncScroll, setSyncScroll] = useState<boolean>(() => {
    try {
      return localStorage.getItem('chords_yt_sync_scroll') !== 'false'
    } catch {
      return true
    }
  })

  // Global scroll state
  const [isScrollPlaying, setIsScrollPlaying] = useState<boolean>(false)

  useEffect(() => {
    const handleScrollState = (e: Event) => {
      const custom = e as CustomEvent<{ isPlaying: boolean }>
      if (custom.detail) {
        setIsScrollPlaying(custom.detail.isPlaying)
      }
    }
    window.addEventListener('chords:scroll:state', handleScrollState)
    window.dispatchEvent(new CustomEvent('chords:scroll:req-state'))
    return () => window.removeEventListener('chords:scroll:state', handleScrollState)
  }, [])

  // Sync state when song youtubeUrl changes
  useEffect(() => {
    setUrlInput(youtubeUrl || '')
    if (!youtubeUrl) {
      setIsEditingUrl(true)
    } else {
      setIsEditingUrl(false)
    }
  }, [youtubeUrl])

  // Save minimized preference
  const toggleMinimized = () => {
    setIsMinimized(prev => {
      const next = !prev
      try {
        localStorage.setItem('chords_yt_minimized', String(next))
      } catch {}
      return next
    })
  }

  // Save sync preference
  const toggleSyncScroll = () => {
    setSyncScroll(prev => {
      const next = !prev
      try {
        localStorage.setItem('chords_yt_sync_scroll', String(next))
      } catch {}
      return next
    })
  }

  const parsed = parseYouTubeUrl(youtubeUrl)

  const handleSaveUrl = (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    setInputError(null)

    const cleanInput = urlInput.trim()
    if (!cleanInput) {
      onUpdateUrl('')
      setIsEditingUrl(false)
      return
    }

    const testParsed = parseYouTubeUrl(cleanInput)
    if (!testParsed.videoId) {
      setInputError('El enlace no parece ser un video válido de YouTube. Pega una URL completa o el ID del video.')
      return
    }

    onUpdateUrl(testParsed.cleanUrl || cleanInput)
    setIsEditingUrl(false)
  }

  const handleToggleScrollFromPlayer = () => {
    window.dispatchEvent(new CustomEvent('chords:scroll:cmd-toggle'))
  }

  if (!isOpen) return null

  // 1. Edit URL Modal (displayed when user has not set a URL yet or clicks edit)
  if (isEditingUrl || !parsed.videoId) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
        <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-3xl p-5 sm:p-6 shadow-2xl relative text-zinc-100">
          <button
            onClick={() => {
              if (youtubeUrl) {
                setIsEditingUrl(false)
              } else {
                onClose()
              }
            }}
            className="absolute top-4 right-4 p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-xl transition cursor-pointer"
            title="Cerrar"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-2xl bg-red-600/20 text-red-500 flex items-center justify-center shrink-0 border border-red-500/30">
              <YouTubeIcon className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-white">Audio o Video de Referencia</h3>
              <p className="text-xs text-zinc-400">Escucha la versión original mientras practicas</p>
            </div>
          </div>

          <form onSubmit={handleSaveUrl} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-zinc-300 mb-1.5">
                Enlace de YouTube para "{songTitle}"
              </label>
              <input
                type="text"
                autoFocus
                value={urlInput}
                onChange={e => {
                  setUrlInput(e.target.value)
                  setInputError(null)
                }}
                placeholder="https://www.youtube.com/watch?v=... o https://youtu.be/..."
                className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-700/80 rounded-xl text-xs sm:text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-red-500 transition"
              />
              <p className="text-[11px] text-zinc-500 mt-1.5">
                Puedes pegar cualquier enlace de YouTube o YouTube Music. También soporta minuto de inicio (ej. ?t=45s).
              </p>
              {inputError && (
                <div className="flex items-center gap-1.5 text-rose-400 text-xs mt-2 font-medium">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{inputError}</span>
                </div>
              )}
            </div>

            {/* Preview if valid */}
            {urlInput.trim() && parseYouTubeUrl(urlInput).videoId && (
              <div className="flex items-center gap-3 p-2.5 rounded-xl bg-zinc-950/70 border border-zinc-800">
                <img
                  src={getYouTubeThumbnailUrl(parseYouTubeUrl(urlInput).videoId!)}
                  alt="Vista previa"
                  className="w-16 h-10 object-cover rounded-lg shrink-0 border border-zinc-800"
                />
                <div className="min-w-0">
                  <span className="text-[11px] font-bold text-emerald-400 flex items-center gap-1">
                    <Check className="w-3.5 h-3.5" /> Video Detectado
                  </span>
                  <p className="text-[11px] text-zinc-400 truncate">ID: {parseYouTubeUrl(urlInput).videoId}</p>
                </div>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-800">
              {youtubeUrl && (
                <button
                  type="button"
                  onClick={() => {
                    onUpdateUrl('')
                    setUrlInput('')
                    setIsEditingUrl(false)
                  }}
                  className="px-3 py-2 text-xs font-semibold text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 rounded-xl transition cursor-pointer"
                >
                  Quitar video
                </button>
              )}

              <button
                type="button"
                onClick={() => {
                  if (youtubeUrl) {
                    setIsEditingUrl(false)
                  } else {
                    onClose()
                  }
                }}
                className="px-3.5 py-2 text-xs font-bold text-zinc-400 hover:text-white transition cursor-pointer"
              >
                Cancelar
              </button>

              <button
                type="submit"
                className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-red-600/30 transition flex items-center gap-1.5 cursor-pointer"
              >
                <Check className="w-4 h-4" />
                <span>Guardar y Reproducir</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    )
  }

  const embedUrl = buildYouTubeEmbedUrl(parsed.videoId, {
    autoplay: true,
    startTime: parsed.startTime
  })

  // 2. Minimized Floating Audio Bar (sits at bottom right, super slim)
  if (isMinimized) {
    return (
      <aside
        aria-label="Reproductor de audio minimizado"
        className="fixed bottom-4 right-4 z-40 bg-zinc-900/95 backdrop-blur-xl border border-zinc-700/80 rounded-2xl p-2 sm:p-2.5 shadow-2xl flex items-center gap-2 sm:gap-3 max-w-[92vw] sm:max-w-md animate-in slide-in-from-bottom-3 duration-200"
      >
        <div className="w-8 h-8 rounded-xl bg-red-600 text-white flex items-center justify-center shrink-0 shadow-md">
          <YouTubeIcon className="w-4 h-4 text-white" />
        </div>

        <div className="min-w-0 pr-1">
          <p className="text-xs font-bold text-white truncate max-w-[160px] sm:max-w-[200px]">
            {songTitle}
          </p>
          <p className="text-[10px] text-zinc-400 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>Audio de Referencia Activo</span>
          </p>
        </div>

        <div className="flex items-center gap-1 shrink-0 border-l border-zinc-800 pl-2">
          {/* Scroll sync quick trigger */}
          <button
            type="button"
            onClick={handleToggleScrollFromPlayer}
            className={`p-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
              isScrollPlaying
                ? 'bg-amber-500 text-zinc-950 shadow-sm'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
            }`}
            title={isScrollPlaying ? 'Pausar Auto-Scroll' : 'Iniciar Auto-Scroll'}
          >
            {isScrollPlaying ? <Pause className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current" />}
          </button>

          {/* Maximize */}
          <button
            type="button"
            onClick={toggleMinimized}
            className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition cursor-pointer"
            title="Expandir ventana de video"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>

          {/* Close */}
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-rose-400 hover:bg-zinc-800 rounded-lg transition cursor-pointer"
            title="Cerrar reproductor"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </aside>
    )
  }

  // 3. Expanded Floating Picture-in-Picture Video Card
  return (
    <aside
      aria-label="Reproductor de video de referencia"
      className="fixed bottom-3 right-3 sm:bottom-6 sm:right-6 z-40 w-[94vw] sm:w-[380px] md:w-[420px] bg-zinc-900/95 backdrop-blur-xl border border-zinc-700/80 rounded-3xl shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200"
    >
      {/* Header bar */}
      <div className="px-3.5 py-2.5 bg-zinc-950/80 border-b border-zinc-800 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-5 h-5 rounded-lg bg-red-600 text-white flex items-center justify-center shrink-0">
            <YouTubeIcon className="w-3.5 h-3.5 text-white" />
          </div>
          <span className="text-xs font-black text-white truncate">{songTitle}</span>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {/* Edit URL */}
          <button
            type="button"
            onClick={() => setIsEditingUrl(true)}
            className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition cursor-pointer"
            title="Cambiar video de YouTube"
          >
            <Edit2 className="w-3.5 h-3.5" />
          </button>

          {/* Open on YouTube */}
          <a
            href={parsed.cleanUrl || youtubeUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition cursor-pointer"
            title="Abrir en YouTube"
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </a>

          {/* Minimize to Audio Bar */}
          <button
            type="button"
            onClick={toggleMinimized}
            className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition cursor-pointer"
            title="Minimizar a barra de audio"
          >
            <Minimize2 className="w-3.5 h-3.5" />
          </button>

          {/* Close */}
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-rose-400 hover:bg-zinc-800 rounded-lg transition cursor-pointer"
            title="Cerrar video"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Responsive 16:9 Video Embed */}
      <div className="relative w-full aspect-video bg-black">
        <iframe
          src={embedUrl}
          title={`YouTube reference for ${songTitle}`}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          className="absolute inset-0 w-full h-full border-0"
        />
      </div>

      {/* Footer controls: Auto-scroll integration */}
      <div className="px-3.5 py-2.5 bg-zinc-950/90 border-t border-zinc-800 flex items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={toggleSyncScroll}
            className={`w-4 h-4 rounded flex items-center justify-center border transition cursor-pointer ${
              syncScroll
                ? `${themeConfig.primaryBg} border-transparent text-white`
                : 'border-zinc-600 bg-zinc-800'
            }`}
            title="Sincronizar reproducción con Auto-Scroll"
          >
            {syncScroll && <Check className="w-3 h-3 stroke-[3]" />}
          </button>
          <span
            onClick={toggleSyncScroll}
            className="text-[11px] font-semibold text-zinc-300 cursor-pointer select-none"
          >
            Auto-Scroll Sincronizado
          </span>
        </div>

        {/* Quick Scroll Play/Pause */}
        <button
          type="button"
          onClick={handleToggleScrollFromPlayer}
          className={`px-3 py-1 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer active:scale-95 ${
            isScrollPlaying
              ? 'bg-amber-500 hover:bg-amber-400 text-zinc-950 shadow-md shadow-amber-500/20'
              : `${themeConfig.primaryButton} shadow-sm`
          }`}
        >
          {isScrollPlaying ? (
            <>
              <Pause className="w-3 h-3 fill-current" />
              <span>Pausar Scroll</span>
            </>
          ) : (
            <>
              <Play className="w-3 h-3 fill-current" />
              <span>Iniciar Scroll</span>
            </>
          )}
        </button>
      </div>
    </aside>
  )
}
