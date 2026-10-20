import React, { useState, useEffect, useRef, useMemo } from 'react'
import {
  Play,
  Pause,
  FastForward,
  Clock,
  Music2,
  Sliders,
  ChevronDown,
  ChevronUp,
  RotateCcw
} from 'lucide-react'
import type { Song } from '../types/song'
import { calculateSongTiming, formatTime, type SongTimingData } from '../music/songTiming'

export type ScrollMode = 'manual' | 'duration' | 'sections'

interface AutoScrollControlsProps {
  song?: Song
  activeSectionIndex?: number
  onActiveSectionChange?: (index: number) => void
  scrollContainerRef?: React.RefObject<HTMLElement | null>
}

export const AutoScrollControls: React.FC<AutoScrollControlsProps> = ({
  song,
  activeSectionIndex = -1,
  onActiveSectionChange,
  scrollContainerRef
}) => {
  const [isPlaying, setIsPlaying] = useState(false)
  const [mode, setMode] = useState<ScrollMode>('manual')
  const [isExpanded, setIsExpanded] = useState(false)

  // 1. Manual mode state
  const [speed, setSpeed] = useState(1.0)

  // 2. Timing data derived from song
  const initialTempo = song?.tempo || 75
  const [currentTempo, setCurrentTempo] = useState(initialTempo)

  useEffect(() => {
    if (song?.tempo) {
      setCurrentTempo(song.tempo)
    }
  }, [song?.tempo, song?.id])

  const timingData: SongTimingData = useMemo(() => {
    return calculateSongTiming(song?.content || '', currentTempo, song?.timeSignature || '4/4')
  }, [song?.content, currentTempo, song?.timeSignature])

  // 3. Duration mode state
  const [targetDuration, setTargetDuration] = useState<number>(timingData.totalSeconds)

  useEffect(() => {
    setTargetDuration(timingData.totalSeconds)
  }, [timingData.totalSeconds, song?.id])

  // Real-time playback timer & animation refs
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const elapsedRef = useRef<number>(0)
  const animationFrameRef = useRef<number | null>(null)
  const lastTimeRef = useRef<number>(0)
  const accumulatedScrollRef = useRef<number>(0)
  const isPlayingRef = useRef<boolean>(false)
  isPlayingRef.current = isPlaying

  // Get maximum scrollable height
  const getMaxScroll = (): number => {
    const el = scrollContainerRef?.current
    if (el && el.scrollHeight > el.clientHeight) {
      return Math.max(0, el.scrollHeight - el.clientHeight)
    }
    const docHeight = Math.max(
      document.body.scrollHeight,
      document.documentElement.scrollHeight,
      document.body.offsetHeight,
      document.documentElement.offsetHeight,
      document.body.clientHeight,
      document.documentElement.clientHeight
    )
    const winHeight = window.innerHeight || document.documentElement.clientHeight || 800
    return Math.max(0, docHeight - winHeight)
  }

  // Get current scroll Y
  const getScrollY = (): number => {
    const el = scrollContainerRef?.current
    if (el && el.scrollHeight > el.clientHeight) {
      return el.scrollTop
    }
    return window.scrollY || document.documentElement.scrollTop || document.body.scrollTop || 0
  }

  // Set scroll Y
  const setScrollY = (y: number) => {
    const el = scrollContainerRef?.current
    if (el && el.scrollHeight > el.clientHeight) {
      el.scrollTop = y
    } else {
      window.scrollTo(0, y)
    }
  }

  // Sync accumulated scroll when user touches/scrolls manually
  useEffect(() => {
    const handleScroll = () => {
      const currentY = getScrollY()
      if (Math.abs(currentY - accumulatedScrollRef.current) > 4) {
        accumulatedScrollRef.current = currentY
      }
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    const el = scrollContainerRef?.current
    if (el) el.addEventListener('scroll', handleScroll, { passive: true })

    return () => {
      window.removeEventListener('scroll', handleScroll)
      if (el) el.removeEventListener('scroll', handleScroll)
    }
  }, [scrollContainerRef])

  // Play / Pause toggle
  const togglePlay = () => {
    if (!isPlaying) {
      // Starting
      accumulatedScrollRef.current = getScrollY()
      lastTimeRef.current = performance.now()
      setIsPlaying(true)
    } else {
      // Pausing
      setIsPlaying(false)
    }
  }

  // Reset scroll and timer to start
  const handleResetToTop = () => {
    setIsPlaying(false)
    setScrollY(0)
    accumulatedScrollRef.current = 0
    elapsedRef.current = 0
    setElapsedSeconds(0)
    onActiveSectionChange?.(-1)
  }

  // Jump to specific section
  const handleJumpToSection = (secIndex: number) => {
    const sec = timingData.sections[secIndex]
    if (!sec) return

    elapsedRef.current = sec.startSec
    setElapsedSeconds(sec.startSec)
    onActiveSectionChange?.(secIndex)

    const secElem = document.getElementById(`song-section-${secIndex}`)
    if (secElem) {
      const topOffset = Math.max(0, secElem.offsetTop - 120)
      setScrollY(topOffset)
      accumulatedScrollRef.current = topOffset
    }
  }

  // Main animation frame loop
  useEffect(() => {
    if (!isPlaying) {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
      return
    }

    accumulatedScrollRef.current = getScrollY()
    lastTimeRef.current = performance.now()

    const step = (currentTime: number) => {
      if (!lastTimeRef.current) lastTimeRef.current = currentTime
      const deltaMs = currentTime - lastTimeRef.current
      lastTimeRef.current = currentTime
      const deltaSec = deltaMs / 1000

      const maxScroll = getMaxScroll()

      if (mode === 'manual') {
        // Linear calibrated speed with float accumulation (fixes 0.5x - 1.6x subpixel bug!)
        // 1.0x = 28 px/sec, 0.5x = 14 px/sec, 0.2x = 5.6 px/sec
        const pxPerMs = (speed * 28) / 1000
        const move = deltaMs * pxPerMs

        accumulatedScrollRef.current += move
        setScrollY(accumulatedScrollRef.current)

        if (accumulatedScrollRef.current >= maxScroll - 4) {
          setIsPlaying(false)
          return
        }
      } else if (mode === 'duration') {
        // Continuous proportional time scroll
        elapsedRef.current += deltaSec
        setElapsedSeconds(Math.min(targetDuration, elapsedRef.current))

        const progress = Math.min(1, elapsedRef.current / Math.max(1, targetDuration))
        const targetY = progress * maxScroll

        accumulatedScrollRef.current = targetY
        setScrollY(targetY)

        if (elapsedRef.current >= targetDuration || targetY >= maxScroll - 4) {
          setIsPlaying(false)
          return
        }
      } else if (mode === 'sections') {
        // Musical section-by-section smart scroll with active glow
        elapsedRef.current += deltaSec
        setElapsedSeconds(elapsedRef.current)

        const currentSec =
          timingData.sections.find(
            s => elapsedRef.current >= s.startSec && elapsedRef.current < s.endSec
          ) || timingData.sections[timingData.sections.length - 1]

        if (currentSec && currentSec.index !== activeSectionIndex) {
          onActiveSectionChange?.(currentSec.index)

          // Smoothly scroll to the active section with breathing room
          const secElem = document.getElementById(`song-section-${currentSec.index}`)
          if (secElem) {
            const targetY = Math.max(0, secElem.offsetTop - 120)
            // Interpolate toward section position
            accumulatedScrollRef.current = targetY
            setScrollY(targetY)
          }
        }

        if (elapsedRef.current >= timingData.totalSeconds) {
          setIsPlaying(false)
          return
        }
      }

      animationFrameRef.current = requestAnimationFrame(step)
    }

    animationFrameRef.current = requestAnimationFrame(step)

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [isPlaying, mode, speed, targetDuration, timingData, activeSectionIndex, onActiveSectionChange])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeTag = document.activeElement?.tagName.toLowerCase()
      if (
        activeTag === 'input' ||
        activeTag === 'textarea' ||
        (document.activeElement as HTMLElement)?.isContentEditable
      ) {
        return
      }

      if (e.code === 'Space') {
        e.preventDefault()
        togglePlay()
      } else if (e.key === 'ArrowUp' && e.altKey) {
        e.preventDefault()
        if (mode === 'manual') {
          setSpeed(s => Math.min(6, Math.round((s + 0.5) * 10) / 10))
        } else if (mode === 'duration') {
          setTargetDuration(d => d + 15)
        } else if (mode === 'sections') {
          setCurrentTempo(t => Math.min(240, t + 5))
        }
      } else if (e.key === 'ArrowDown' && e.altKey) {
        e.preventDefault()
        if (mode === 'manual') {
          setSpeed(s => Math.max(0.2, Math.round((s - 0.5) * 10) / 10))
        } else if (mode === 'duration') {
          setTargetDuration(d => Math.max(30, d - 15))
        } else if (mode === 'sections') {
          setCurrentTempo(t => Math.max(40, t - 5))
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [mode, isPlaying])

  // Active section display
  const currentActiveSection = useMemo(() => {
    if (activeSectionIndex >= 0 && timingData.sections[activeSectionIndex]) {
      return timingData.sections[activeSectionIndex]
    }
    return (
      timingData.sections.find(
        s => elapsedSeconds >= s.startSec && elapsedSeconds < s.endSec
      ) || timingData.sections[0]
    )
  }, [activeSectionIndex, timingData.sections, elapsedSeconds])

  return (
    <aside
      aria-label="Controles de Auto-Scroll Inteligente"
      className="no-print fixed bottom-3 right-3 sm:bottom-5 sm:right-5 z-40 flex flex-col items-end gap-2 max-w-[96vw]"
    >
      {/* Expanded Control Panel */}
      {isExpanded && (
        <div className="bg-zinc-900/95 backdrop-blur-xl border border-zinc-800 rounded-3xl p-3.5 sm:p-4 shadow-2xl w-80 sm:w-96 text-zinc-100 flex flex-col gap-3 animate-in fade-in slide-in-from-bottom-2 duration-200">
          {/* Header: Mode Selector Tabs */}
          <div className="flex items-center justify-between border-b border-zinc-800/80 pb-2.5">
            <span className="text-[11px] uppercase tracking-wider font-bold text-zinc-400">
              Modo de Auto-Scroll
            </span>
            <button
              onClick={() => setIsExpanded(false)}
              className="text-zinc-400 hover:text-white p-1 rounded-lg hover:bg-zinc-800 transition"
              title="Cerrar panel"
            >
              <ChevronDown className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-3 gap-1.5 p-1 bg-zinc-950/80 rounded-2xl border border-zinc-800">
            <button
              type="button"
              onClick={() => setMode('manual')}
              className={`py-1.5 px-2 text-xs font-bold rounded-xl transition flex flex-col items-center gap-0.5 cursor-pointer ${
                mode === 'manual'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>Velocidad</span>
            </button>

            <button
              type="button"
              onClick={() => setMode('duration')}
              className={`py-1.5 px-2 text-xs font-bold rounded-xl transition flex flex-col items-center gap-0.5 cursor-pointer ${
                mode === 'duration'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Duración</span>
            </button>

            <button
              type="button"
              onClick={() => setMode('sections')}
              className={`py-1.5 px-2 text-xs font-bold rounded-xl transition flex flex-col items-center gap-0.5 cursor-pointer ${
                mode === 'sections'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Music2 className="w-3.5 h-3.5" />
              <span>Secciones</span>
            </button>
          </div>

          {/* Mode 1: Manual Controls */}
          {mode === 'manual' && (
            <div className="space-y-2.5 pt-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-zinc-400 font-medium">Velocidad lineal suave:</span>
                <span className="font-mono font-black text-emerald-400 text-sm">
                  {speed.toFixed(1)}x
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSpeed(s => Math.max(0.2, Math.round((s - 0.5) * 10) / 10))}
                  className="w-8 h-8 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-bold flex items-center justify-center transition border border-zinc-700"
                  title="Reducir 0.5x"
                >
                  -0.5
                </button>
                <input
                  type="range"
                  min="0.2"
                  max="5"
                  step="0.1"
                  value={speed}
                  onChange={e => setSpeed(Number(e.target.value))}
                  className="flex-1 accent-emerald-500 h-2 bg-zinc-800 rounded-lg cursor-pointer"
                />
                <button
                  type="button"
                  onClick={() => setSpeed(s => Math.min(6, Math.round((s + 0.5) * 10) / 10))}
                  className="w-8 h-8 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-bold flex items-center justify-center transition border border-zinc-700"
                  title="Aumentar 0.5x"
                >
                  +0.5
                </button>
              </div>

              {/* Quick Presets */}
              <div className="flex items-center justify-between gap-1.5 pt-1">
                {[0.5, 0.8, 1.0, 1.5, 2.0].map(p => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setSpeed(p)}
                    className={`flex-1 py-1 rounded-lg text-xs font-bold transition border ${
                      Math.abs(speed - p) < 0.05
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50'
                        : 'bg-zinc-800/80 text-zinc-400 border-zinc-700 hover:text-white'
                    }`}
                  >
                    {p}x
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Mode 2: Duration Controls */}
          {mode === 'duration' && (
            <div className="space-y-2.5 pt-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-zinc-400 font-medium">Duración total de la canción:</span>
                <span className="font-mono font-black text-emerald-400 text-base">
                  {formatTime(targetDuration)}
                </span>
              </div>

              {/* Adjust Duration Buttons */}
              <div className="flex items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={() => setTargetDuration(d => Math.max(30, d - 15))}
                  className="px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-bold transition border border-zinc-700"
                >
                  -15s
                </button>
                <div className="px-4 py-1.5 bg-zinc-950 rounded-xl border border-zinc-800 font-mono text-sm font-bold text-white">
                  {formatTime(elapsedSeconds)} / {formatTime(targetDuration)}
                </div>
                <button
                  type="button"
                  onClick={() => setTargetDuration(d => d + 15)}
                  className="px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-bold transition border border-zinc-700"
                >
                  +15s
                </button>
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-zinc-800 rounded-full h-1.5 overflow-hidden">
                <div
                  className="bg-emerald-400 h-full transition-all duration-150"
                  style={{
                    width: `${Math.min(100, (elapsedSeconds / Math.max(1, targetDuration)) * 100)}%`
                  }}
                />
              </div>

              <p className="text-[11px] text-zinc-400 text-center">
                El scroll se sincroniza para recorrer toda la letra en {formatTime(targetDuration)}.
              </p>
            </div>
          )}

          {/* Mode 3: Musical Sections Controls */}
          {mode === 'sections' && (
            <div className="space-y-2.5 pt-1">
              {/* Tempo Adjuster */}
              <div className="flex items-center justify-between text-xs pb-1 border-b border-zinc-800/80">
                <span className="text-zinc-400 font-medium">Tempo musical:</span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setCurrentTempo(t => Math.max(40, t - 5))}
                    className="w-6 h-6 rounded-lg bg-zinc-800 text-zinc-300 font-bold hover:text-white"
                  >
                    -
                  </button>
                  <span className="font-mono font-black text-emerald-400 text-sm w-16 text-center">
                    {currentTempo} BPM
                  </span>
                  <button
                    type="button"
                    onClick={() => setCurrentTempo(t => Math.min(240, t + 5))}
                    className="w-6 h-6 rounded-lg bg-zinc-800 text-zinc-300 font-bold hover:text-white"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Active Section Info */}
              <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-2.5 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-emerald-400 uppercase font-black block">
                    Sección en curso:
                  </span>
                  <span className="text-sm font-bold text-white">
                    {currentActiveSection?.title || 'Inicio'}
                  </span>
                </div>
                <span className="text-xs font-mono font-bold text-emerald-300">
                  {formatTime(elapsedSeconds)} / {formatTime(timingData.totalSeconds)}
                </span>
              </div>

              {/* Clickable Section Quick-Jump Pills */}
              <div>
                <span className="text-[10px] uppercase font-bold text-zinc-400 block mb-1.5">
                  Saltar a sección:
                </span>
                <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto scrollbar-none">
                  {timingData.sections.map(sec => {
                    const isActive = activeSectionIndex === sec.index
                    return (
                      <button
                        key={sec.index}
                        type="button"
                        onClick={() => handleJumpToSection(sec.index)}
                        className={`px-2 py-1 rounded-lg text-[11px] font-bold transition border cursor-pointer ${
                          isActive
                            ? 'bg-emerald-500 text-zinc-950 border-emerald-400 shadow-sm'
                            : 'bg-zinc-800 text-zinc-300 border-zinc-700 hover:text-white hover:bg-zinc-700'
                        }`}
                        title={`Saltar a ${sec.title} (${formatTime(sec.startSec)})`}
                      >
                        {sec.title}
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Main Floating Action Pill */}
      <div className="bg-zinc-900/95 backdrop-blur-md border border-zinc-800 rounded-2xl sm:rounded-3xl shadow-2xl p-1.5 sm:p-2 flex items-center gap-1.5 sm:gap-2.5 transition-all hover:border-emerald-500/50">
        {/* Reset to Top Button */}
        <button
          onClick={handleResetToTop}
          title="Reiniciar y volver al inicio"
          className="p-1.5 sm:p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-xl transition cursor-pointer"
        >
          <RotateCcw className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
        </button>

        {/* Play / Pause Toggle Button */}
        <button
          onClick={togglePlay}
          title={isPlaying ? 'Pausar auto-scroll (Espacio)' : 'Iniciar auto-scroll (Espacio)'}
          className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl sm:rounded-2xl font-bold flex items-center gap-1.5 sm:gap-2 shadow-lg transition-all cursor-pointer ${
            isPlaying
              ? 'bg-amber-500 hover:bg-amber-600 text-zinc-950 animate-pulse'
              : 'bg-emerald-500 hover:bg-emerald-600 text-zinc-950 shadow-emerald-500/20'
          }`}
        >
          {isPlaying ? (
            <>
              <Pause className="w-4 h-4 sm:w-4.5 sm:h-4.5 fill-current" />
              <span className="text-[10px] sm:text-xs uppercase tracking-wider font-extrabold">
                Pausar
              </span>
            </>
          ) : (
            <>
              <Play className="w-4 h-4 sm:w-4.5 sm:h-4.5 fill-current" />
              <span className="text-[10px] sm:text-xs uppercase tracking-wider font-extrabold">
                Scroll
              </span>
            </>
          )}
        </button>

        {/* Current Mode Badge / Quick Adjust */}
        {mode === 'manual' && (
          <div className="flex items-center gap-1 sm:gap-1.5 bg-zinc-800/80 px-2 sm:px-2.5 py-1 sm:py-1.5 rounded-xl sm:rounded-2xl border border-zinc-700/50">
            <button
              onClick={() => setSpeed(s => Math.max(0.2, Math.round((s - 0.5) * 10) / 10))}
              className="w-5 h-5 flex items-center justify-center text-xs font-bold text-zinc-300 hover:text-white rounded transition cursor-pointer"
              title="Reducir velocidad (-0.5x)"
            >
              -
            </button>
            <FastForward className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span className="text-[10px] sm:text-xs font-mono font-bold text-emerald-400 min-w-7 text-center select-none">
              {speed.toFixed(1)}x
            </span>
            <button
              onClick={() => setSpeed(s => Math.min(6, Math.round((s + 0.5) * 10) / 10))}
              className="w-5 h-5 flex items-center justify-center text-xs font-bold text-zinc-300 hover:text-white rounded transition cursor-pointer"
              title="Aumentar velocidad (+0.5x)"
            >
              +
            </button>
          </div>
        )}

        {mode === 'duration' && (
          <div
            onClick={() => setIsExpanded(true)}
            className="flex items-center gap-1.5 bg-zinc-800/80 px-2.5 py-1.5 rounded-xl sm:rounded-2xl border border-zinc-700/50 cursor-pointer hover:bg-zinc-750 transition"
            title="Ajustar duración de la canción"
          >
            <Clock className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-[10px] sm:text-xs font-mono font-bold text-emerald-400 select-none">
              {formatTime(elapsedSeconds)} / {formatTime(targetDuration)}
            </span>
          </div>
        )}

        {mode === 'sections' && (
          <div
            onClick={() => setIsExpanded(true)}
            className="flex items-center gap-1.5 bg-zinc-800/80 px-2.5 py-1.5 rounded-xl sm:rounded-2xl border border-zinc-700/50 cursor-pointer hover:bg-zinc-750 transition"
            title="Ver o cambiar sección"
          >
            <Music2 className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-[10px] sm:text-xs font-bold text-emerald-300 max-w-28 sm:max-w-36 truncate select-none">
              {currentActiveSection?.title || 'Sección'} ({currentTempo} BPM)
            </span>
          </div>
        )}

        {/* Toggle Expand Panel Button */}
        <button
          onClick={() => setIsExpanded(e => !e)}
          title={isExpanded ? 'Ocultar ajustes de scroll' : 'Modos de scroll inteligente'}
          className={`p-1.5 sm:p-2 rounded-xl transition cursor-pointer border ${
            isExpanded
              ? 'bg-emerald-600/20 text-emerald-300 border-emerald-500/40'
              : 'text-zinc-400 hover:text-white hover:bg-zinc-800 border-transparent'
          }`}
        >
          {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
        </button>
      </div>
    </aside>
  )
}
