import React, { useState, useEffect, useRef } from 'react'
import {
  X,
  Minimize2,
  Maximize2,
  ExternalLink,
  Edit2,
  Play,
  Pause,
  Check,
  AlertCircle,
  GripHorizontal,
  Pin,
  PinOff
} from 'lucide-react'
import { YouTubeIcon } from './YouTubeIcon'
import { parseYouTubeUrl, getYouTubeThumbnailUrl } from '../music/youtubeUtils'

// Global declaration for YouTube IFrame API
declare global {
  interface Window {
    YT: any
    onYouTubeIframeAPIReady: () => void
  }
}

interface YouTubeReferencePlayerProps {
  songTitle: string
  youtubeUrl?: string
  isOpen: boolean
  onClose: () => void
  onUpdateUrl: (newUrl: string) => void
  stageMode?: boolean
}

function loadYouTubeIframeApi(): Promise<void> {
  return new Promise(resolve => {
    if (typeof window !== 'undefined' && window.YT && window.YT.Player) {
      resolve()
      return
    }

    if (!document.getElementById('youtube-iframe-api-script')) {
      const tag = document.createElement('script')
      tag.id = 'youtube-iframe-api-script'
      tag.src = 'https://www.youtube.com/iframe_api'
      const firstScriptTag = document.getElementsByTagName('script')[0]
      firstScriptTag?.parentNode?.insertBefore(tag, firstScriptTag)
    }

    const prevReady = window.onYouTubeIframeAPIReady
    window.onYouTubeIframeAPIReady = () => {
      if (typeof prevReady === 'function') prevReady()
      resolve()
    }

    const interval = setInterval(() => {
      if (window.YT && window.YT.Player) {
        clearInterval(interval)
        resolve()
      }
    }, 100)
  })
}

function formatDuration(sec: number): string {
  if (isNaN(sec) || sec < 0) return '0:00'
  const m = Math.floor(sec / 60)
  const s = Math.floor(sec % 60)
  return `${m}:${s < 10 ? '0' : ''}${s}`
}

export const YouTubeReferencePlayer: React.FC<YouTubeReferencePlayerProps> = ({
  songTitle,
  youtubeUrl,
  isOpen,
  onClose,
  onUpdateUrl,
  stageMode = false
}) => {
  // Video view mode: 'expanded' vs 'minimized'
  const [isMinimized, setIsMinimized] = useState<boolean>(() => {
    try {
      return localStorage.getItem('chords_yt_minimized') === 'true'
    } catch {
      return false
    }
  })

  // Docked at top (especially for Stage Mode or user preference)
  const [isDockedTop, setIsDockedTop] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('chords_yt_docked_top')
      if (saved !== null) return saved === 'true'
      return stageMode
    } catch {
      return stageMode
    }
  })

  // Keep in sync with stageMode changes
  useEffect(() => {
    if (stageMode) {
      setIsDockedTop(true)
    }
  }, [stageMode])

  // Drag position for floating mode (avoiding bottom-right collision with AutoScrollControls)
  const [position, setPosition] = useState<{ x: number; y: number }>(() => {
    try {
      const saved = localStorage.getItem('chords_yt_pos')
      if (saved) {
        const parsed = JSON.parse(saved)
        if (typeof parsed.x === 'number' && typeof parsed.y === 'number') {
          return parsed
        }
      }
    } catch {}
    return { x: 16, y: 76 }
  })

  const [isDragging, setIsDragging] = useState<boolean>(false)
  const dragStartRef = useRef<{ startX: number; startY: number; mouseX: number; mouseY: number }>({
    startX: 0,
    startY: 0,
    mouseX: 0,
    mouseY: 0
  })

  // URL edit modal state
  const [isEditingUrl, setIsEditingUrl] = useState<boolean>(!youtubeUrl)
  const [urlInput, setUrlInput] = useState<string>(youtubeUrl || '')
  const [inputError, setInputError] = useState<string | null>(null)

  // YouTube Player instance & playback status
  const playerRef = useRef<any>(null)
  const [isPlaying, setIsPlaying] = useState<boolean>(false)
  const [currentTime, setCurrentTime] = useState<number>(0)
  const [duration, setDuration] = useState<number>(0)
  const lastSyncTimeRef = useRef<number>(0)
  const isSyncingFromApiRef = useRef<boolean>(false)

  const parsed = parseYouTubeUrl(youtubeUrl)
  const playerId = 'chords-yt-iframe-player'

  // Initialize or reload YouTube player when video ID changes
  useEffect(() => {
    if (!isOpen || !parsed.videoId) return

    let isSubscribed = true

    loadYouTubeIframeApi().then(() => {
      if (!isSubscribed) return

      // If player already exists, check if video changed
      if (playerRef.current && typeof playerRef.current.loadVideoById === 'function') {
        try {
          const currentVideoData = playerRef.current.getVideoData?.()
          if (currentVideoData?.video_id !== parsed.videoId) {
            playerRef.current.loadVideoById({
              videoId: parsed.videoId,
              startSeconds: parsed.startTime || 0
            })
          }
        } catch {}
        return
      }

      // Create new YT.Player instance
      try {
        new window.YT.Player(playerId, {
          videoId: parsed.videoId,
          playerVars: {
            autoplay: 0,
            playsinline: 1,
            rel: 0,
            modestbranding: 1,
            enablejsapi: 1,
            origin: window.location.origin,
            start: parsed.startTime || 0
          },
          events: {
            onReady: (event: any) => {
              if (!isSubscribed) return
              playerRef.current = event.target
              try {
                const dur = event.target.getDuration()
                if (dur > 0) setDuration(dur)
              } catch {}
            },
            onStateChange: (event: any) => {
              if (!isSubscribed) return
              const state = event.data
              // 1: PLAYING
              if (state === 1) {
                setIsPlaying(true)
                isSyncingFromApiRef.current = true
                let cur = 0
                let dur = 0
                try {
                  cur = event.target.getCurrentTime() || 0
                  dur = event.target.getDuration() || 0
                } catch {}
                window.dispatchEvent(
                  new CustomEvent('chords:scroll:cmd-play', {
                    detail: { currentTime: cur, duration: dur }
                  })
                )
                if (dur > 0) {
                  window.dispatchEvent(
                    new CustomEvent('chords:scroll:sync-time', {
                      detail: { currentTime: cur, duration: dur }
                    })
                  )
                }
                setTimeout(() => {
                  isSyncingFromApiRef.current = false
                }, 300)
              }
              // 2: PAUSED or 0: ENDED
              else if (state === 2 || state === 0) {
                setIsPlaying(false)
                isSyncingFromApiRef.current = true
                window.dispatchEvent(new CustomEvent('chords:scroll:cmd-pause'))
                setTimeout(() => {
                  isSyncingFromApiRef.current = false
                }, 300)
              }
            }
          }
        })
      } catch (err) {
        console.warn('Error instantiating YouTube player:', err)
      }
    })

    return () => {
      isSubscribed = false
    }
  }, [isOpen, parsed.videoId])

  // Periodic time tracker while playing: syncs scroll position when video scrubs or progresses
  useEffect(() => {
    if (!isPlaying) return

    const interval = setInterval(() => {
      if (!playerRef.current || typeof playerRef.current.getCurrentTime !== 'function') return
      try {
        const cur = playerRef.current.getCurrentTime()
        const dur = playerRef.current.getDuration()

        if (dur > 0) {
          setCurrentTime(cur)
          setDuration(dur)

          // Broadcast sync event so lyrics stay in exact sync with YouTube audio
          window.dispatchEvent(
            new CustomEvent('chords:scroll:sync-time', {
              detail: { currentTime: cur, duration: dur }
            })
          )

          // Fallback direct smooth scroll if time jumped significantly (seek/scrub)
          const delta = Math.abs(cur - lastSyncTimeRef.current)
          if (delta > 1.5) {
            const scrollableHeight = document.documentElement.scrollHeight - window.innerHeight
            if (scrollableHeight > 0) {
              const targetY = (cur / dur) * scrollableHeight
              window.scrollTo({ top: targetY, behavior: 'smooth' })
            }
          }
          lastSyncTimeRef.current = cur
        }
      } catch {}
    }, 150)

    return () => clearInterval(interval)
  }, [isPlaying])

  // Two-way synchronization: If YouTube is currently playing, pause it when scroll is paused/toggled
  useEffect(() => {
    const handleRemoteScrollToggle = () => {
      if (isSyncingFromApiRef.current) return
      if (!playerRef.current) return
      try {
        if (isPlaying) {
          playerRef.current.pauseVideo()
        }
      } catch {}
    }

    const handleRemoteScrollPause = () => {
      if (isSyncingFromApiRef.current) return
      if (!playerRef.current) return
      try {
        if (isPlaying) {
          playerRef.current.pauseVideo()
        }
      } catch {}
    }

    window.addEventListener('chords:scroll:cmd-toggle', handleRemoteScrollToggle)
    window.addEventListener('chords:scroll:cmd-pause', handleRemoteScrollPause)

    return () => {
      window.removeEventListener('chords:scroll:cmd-toggle', handleRemoteScrollToggle)
      window.removeEventListener('chords:scroll:cmd-pause', handleRemoteScrollPause)
    }
  }, [isPlaying])

  // Cleanup player on unmount
  useEffect(() => {
    return () => {
      if (playerRef.current) {
        try {
          playerRef.current.destroy()
        } catch {}
        playerRef.current = null
      }
    }
  }, [])

  // Drag handlers
  const handlePointerDown = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest('button, a, input, select')) return
    e.preventDefault()
    setIsDragging(true)
    dragStartRef.current = {
      startX: position.x,
      startY: position.y,
      mouseX: e.clientX,
      mouseY: e.clientY
    }
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
  }

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return
    const dx = e.clientX - dragStartRef.current.mouseX
    const dy = e.clientY - dragStartRef.current.mouseY

    const playerWidth = isMinimized ? 280 : Math.min(380, window.innerWidth - 32)
    const playerHeight = isMinimized ? 52 : 280

    const maxX = Math.max(0, window.innerWidth - playerWidth - 10)
    const maxY = Math.max(0, window.innerHeight - playerHeight - 10)

    const newX = Math.max(10, Math.min(maxX, dragStartRef.current.startX + dx))
    const newY = Math.max(10, Math.min(maxY, dragStartRef.current.startY + dy))

    setPosition({ x: newX, y: newY })
  }

  const handlePointerUp = (e: React.PointerEvent) => {
    if (isDragging) {
      setIsDragging(false)
      try {
        localStorage.setItem('chords_yt_pos', JSON.stringify(position))
      } catch {}
      try {
        ;(e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId)
      } catch {}
    }
  }

  const togglePlayPause = () => {
    if (!playerRef.current) return
    try {
      if (isPlaying) {
        playerRef.current.pauseVideo()
      } else {
        playerRef.current.playVideo()
      }
    } catch {}
  }

  const toggleDockTop = () => {
    setIsDockedTop(prev => {
      const next = !prev
      try {
        localStorage.setItem('chords_yt_docked_top', String(next))
      } catch {}
      return next
    })
  }

  const toggleMinimized = () => {
    setIsMinimized(prev => {
      const next = !prev
      try {
        localStorage.setItem('chords_yt_minimized', String(next))
      } catch {}
      return next
    })
  }

  const handleClose = () => {
    if (playerRef.current) {
      try {
        playerRef.current.pauseVideo()
      } catch {}
    }
    setIsPlaying(false)
    window.dispatchEvent(new CustomEvent('chords:scroll:cmd-pause'))
    onClose()
  }

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

  if (!isOpen) return null

  // 1. Modal to configure/paste YouTube link
  if (isEditingUrl || !parsed.videoId) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
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
              <p className="text-xs text-zinc-400">Escucha la versión original sincronizada con tu letra</p>
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
                Al darle Play en YouTube, la letra comenzará a scrollear automáticamente y se pausará si tú pausas la canción.
              </p>
              {inputError && (
                <div className="flex items-center gap-1.5 text-rose-400 text-xs mt-2 font-medium">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{inputError}</span>
                </div>
              )}
            </div>

            {/* Live thumbnail preview */}
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
                <span>Guardar y Sincronizar</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    )
  }

  // 2. Docked at Top View (ideal for Stage Mode or when pinned to top)
  if (isDockedTop) {
    return (
      <div className="fixed top-13 sm:top-14 left-0 right-0 z-40 bg-zinc-950/95 backdrop-blur-md border-b border-zinc-800 shadow-xl transition-all">
        {/* Progress track */}
        {duration > 0 && (
          <div className="w-full h-1 bg-zinc-800 overflow-hidden">
            <div
              className="h-full bg-red-600 transition-all duration-300"
              style={{ width: `${Math.min(100, (currentTime / duration) * 100)}%` }}
            />
          </div>
        )}

        <div className="max-w-6xl mx-auto px-3 sm:px-4 py-1.5 sm:py-2 flex items-center justify-between gap-2">
          {/* Left info & status */}
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-6 h-6 rounded-lg bg-red-600 text-white flex items-center justify-center shrink-0">
              <YouTubeIcon className="w-3.5 h-3.5 text-white" />
            </div>
            <div className="min-w-0 flex items-center gap-2">
              <span className="text-xs font-extrabold text-white truncate max-w-[140px] sm:max-w-xs">
                {songTitle}
              </span>
              <span className="text-[11px] font-mono text-zinc-400 hidden sm:inline">
                {formatDuration(currentTime)} / {formatDuration(duration)}
              </span>
              {isPlaying && (
                <span className="text-[10px] font-bold text-emerald-400 flex items-center gap-1 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Scroll sincronizado
                </span>
              )}
            </div>
          </div>

          {/* Right controls */}
          <div className="flex items-center gap-1 sm:gap-2 shrink-0">
            {/* Play/Pause Button */}
            <button
              type="button"
              onClick={togglePlayPause}
              className={`px-3 py-1 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                isPlaying
                  ? 'bg-amber-500 hover:bg-amber-400 text-zinc-950 shadow-md shadow-amber-500/20 animate-pulse'
                  : 'bg-red-600 hover:bg-red-500 text-white shadow-md shadow-red-600/30'
              }`}
              title={isPlaying ? 'Pausar canción y scroll' : 'Reproducir canción y scroll'}
            >
              {isPlaying ? <Pause className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current" />}
              <span>{isPlaying ? 'Pausar' : 'Reproducir'}</span>
            </button>

            {/* Toggle Docked vs Floating */}
            <button
              type="button"
              onClick={toggleDockTop}
              className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition cursor-pointer"
              title="Hacer ventana flotante"
            >
              <PinOff className="w-3.5 h-3.5" />
            </button>

            {/* Toggle video expanded */}
            <button
              type="button"
              onClick={toggleMinimized}
              className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition cursor-pointer"
              title={isMinimized ? 'Ver video' : 'Ocultar video'}
            >
              {isMinimized ? <Maximize2 className="w-3.5 h-3.5" /> : <Minimize2 className="w-3.5 h-3.5" />}
            </button>

            {/* Close */}
            <button
              type="button"
              onClick={handleClose}
              className="p-1.5 text-zinc-400 hover:text-rose-400 hover:bg-zinc-800 rounded-lg transition cursor-pointer"
              title="Cerrar reproductor"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Video iframe container (collapsible, kept in DOM so audio never stops) */}
        <div className={`transition-all duration-300 overflow-hidden ${isMinimized ? 'h-0 opacity-0 pointer-events-none' : 'max-w-md mx-auto aspect-video bg-black pb-2 px-3'}`}>
          <div id={playerId} className="w-full h-full rounded-2xl overflow-hidden" />
        </div>
      </div>
    )
  }

  // 3. Floating Draggable Player (moves anywhere on screen so it never covers anything!)
  return (
    <div
      style={{
        transform: `translate3d(${position.x}px, ${position.y}px, 0)`,
        position: 'fixed',
        top: 0,
        left: 0,
        zIndex: 50,
        touchAction: 'none'
      }}
      className={`transition-shadow select-none ${isDragging ? 'shadow-2xl opacity-95 scale-[1.02]' : 'shadow-xl'}`}
    >
      <div
        className={`bg-zinc-900/95 backdrop-blur-xl border border-zinc-700/80 shadow-2xl overflow-hidden flex flex-col transition-all ${
          isMinimized ? 'w-72 sm:w-80 rounded-2xl' : 'w-[320px] sm:w-[380px] rounded-3xl'
        }`}
      >
        {isMinimized ? (
          /* Minimized Floating Audio Bar Header */
          <div
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            className="p-2 flex items-center gap-2 cursor-grab active:cursor-grabbing w-full"
          >
            <div className="w-8 h-8 rounded-xl bg-red-600 text-white flex items-center justify-center shrink-0 shadow-md">
              <YouTubeIcon className="w-4 h-4 text-white" />
            </div>

            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-white truncate">{songTitle}</p>
              <p className="text-[10px] text-zinc-400 flex items-center gap-1">
                <span className={`w-1.5 h-1.5 rounded-full ${isPlaying ? 'bg-emerald-400 animate-pulse' : 'bg-zinc-500'}`} />
                <span>{isPlaying ? 'Scroll automático activo' : formatDuration(currentTime)}</span>
              </p>
            </div>

            <div className="flex items-center gap-1 shrink-0 border-l border-zinc-800 pl-1.5">
              <button
                type="button"
                onClick={togglePlayPause}
                className={`p-1.5 rounded-lg transition cursor-pointer ${
                  isPlaying ? 'bg-amber-500 text-zinc-950 shadow-sm' : 'bg-red-600 text-white'
                }`}
                title={isPlaying ? 'Pausar' : 'Reproducir'}
              >
                {isPlaying ? <Pause className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current" />}
              </button>

              <button
                type="button"
                onClick={toggleDockTop}
                className="p-1.5 text-zinc-400 hover:text-white rounded-lg transition cursor-pointer"
                title="Fijar arriba"
              >
                <Pin className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                onClick={toggleMinimized}
                className="p-1.5 text-zinc-400 hover:text-white rounded-lg transition cursor-pointer"
                title="Expandir video"
              >
                <Maximize2 className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                onClick={handleClose}
                className="p-1.5 text-zinc-400 hover:text-rose-400 rounded-lg transition cursor-pointer"
                title="Cerrar"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ) : (
          /* Expanded Floating Video Window Header */
          <div
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            className="px-3 py-2 bg-zinc-950/90 border-b border-zinc-800 flex items-center justify-between gap-2 cursor-grab active:cursor-grabbing"
          >
            <div className="flex items-center gap-2 min-w-0">
              <GripHorizontal className="w-4 h-4 text-zinc-500 shrink-0" />
              <div className="w-5 h-5 rounded-lg bg-red-600 text-white flex items-center justify-center shrink-0">
                <YouTubeIcon className="w-3 h-3 text-white" />
              </div>
              <span className="text-xs font-black text-white truncate max-w-[130px] sm:max-w-[180px]">
                {songTitle}
              </span>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              {/* Pin to top */}
              <button
                type="button"
                onClick={toggleDockTop}
                className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition cursor-pointer"
                title="Fijar arriba como scroll"
              >
                <Pin className="w-3.5 h-3.5" />
              </button>

              {/* Edit URL */}
              <button
                type="button"
                onClick={() => setIsEditingUrl(true)}
                className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition cursor-pointer"
                title="Cambiar video"
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

              {/* Minimize */}
              <button
                type="button"
                onClick={toggleMinimized}
                className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition cursor-pointer"
                title="Minimizar"
              >
                <Minimize2 className="w-3.5 h-3.5" />
              </button>

              {/* Close */}
              <button
                type="button"
                onClick={handleClose}
                className="p-1.5 text-zinc-400 hover:text-rose-400 hover:bg-zinc-800 rounded-lg transition cursor-pointer"
                title="Cerrar"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* Video iframe container (always kept mounted in DOM so audio never stops!) */}
        <div className={`transition-all duration-300 overflow-hidden ${isMinimized ? 'h-0 opacity-0 pointer-events-none' : 'w-full aspect-video bg-black relative'}`}>
          <div id={playerId} className="w-full h-full" />
        </div>

        {/* Bottom auto-sync info bar (only visible when expanded) */}
        {!isMinimized && (
          <div className="px-3.5 py-2 bg-zinc-950/90 border-t border-zinc-800 flex items-center justify-between text-xs text-zinc-400">
            <div className="flex items-center gap-1.5 font-medium text-[11px]">
              <span className={`w-2 h-2 rounded-full ${isPlaying ? 'bg-emerald-400 animate-ping' : 'bg-zinc-500'}`} />
              <span className={isPlaying ? 'text-emerald-400 font-bold' : 'text-zinc-400'}>
                {isPlaying ? 'Sincronizado con el video' : 'Sincronización lista (o usa scroll independiente)'}
              </span>
            </div>

            <div className="font-mono text-[11px] text-zinc-300">
              {formatDuration(currentTime)} / {formatDuration(duration)}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
