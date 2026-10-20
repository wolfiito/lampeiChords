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
  const setScrollY = (y: number, smooth: boolean = false) => {
    const el = scrollContainerRef?.current
    if (el && el.scrollHeight > el.clientHeight) {
      if (smooth) {
        el.scrollTo({ top: y, behavior: 'smooth' })
      } else {
        el.scrollTop = y
      }
    } else {
      if (smooth) {
        window.scrollTo({ top: y, behavior: 'smooth' })
      } else {
        window.scrollTo(0, y)
      }
    }
  }

  // Section transition style: 'jump' (salto directo a la sección) vs 'continuous' (flujo continuo)
  const [transitionMode, setTransitionMode] = useState<'jump' | 'continuous'>('jump')

  // Auto-switch to sections mode and jump transition if custom manual times [Intro]{30} exist
  useEffect(() => {
    if (timingData.hasCustomTiming) {
      setMode('sections')
      setTransitionMode('jump')
    }
  }, [timingData.hasCustomTiming, song?.id])

  const currentSecRef = useRef<number>(activeSectionIndex)
  useEffect(() => {
    currentSecRef.current = activeSectionIndex
  }, [activeSectionIndex])

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

  // Track whether current section fits fully on screen or needs 1x overflow scroll
  const sectionScrollStateRef = useRef<{
    targetDomIndex: number
    startScrollY: number
    endScrollY: number
    isFullyVisible: boolean
    startSec: number
  } | null>(null)

  // Get true absolute scroll position of an element regardless of parent positioning/columns
  const getElementPageY = (el: HTMLElement): number => {
    const container = scrollContainerRef?.current
    if (container && container.scrollHeight > container.clientHeight) {
      const containerRect = container.getBoundingClientRect()
      const elemRect = el.getBoundingClientRect()
      return elemRect.top - containerRect.top + container.scrollTop
    }
    const elemRect = el.getBoundingClientRect()
    const currentWindowScroll = window.scrollY || document.documentElement.scrollTop || document.body.scrollTop || 0
    return elemRect.top + currentWindowScroll
  }

  // Measure section height vs viewport visible height to decide if small 1x scroll is needed
  const calculateSectionScrollBounds = (targetDomIndex: number, currentStartSec: number) => {
    const secElem = document.getElementById(`song-section-${targetDomIndex}`)
    if (!secElem) return null

    const container = scrollContainerRef?.current
    const secTop = getElementPageY(secElem)
    // The section block container (secElem.parentElement) wraps the header and all its lyric lines
    const blockContainer = secElem.parentElement
    const secHeight = blockContainer ? blockContainer.offsetHeight : Math.max(80, secElem.offsetHeight)
    const secBottom = secTop + secHeight

    const viewportHeight = container?.clientHeight || window.innerHeight || 800
    const topPadding = 70 // Leave space for sticky header (56px) + margin
    const bottomPadding = 120
    const availableHeight = Math.max(150, viewportHeight - topPadding - bottomPadding)
    const startScrollY = Math.max(0, secTop - topPadding)
    const maxNeededScrollY = Math.max(startScrollY, secBottom - viewportHeight + bottomPadding)
    const isSectionFullyVisible = secHeight <= availableHeight

    return {
      targetDomIndex,
      startScrollY,
      endScrollY: maxNeededScrollY,
      isFullyVisible: isSectionFullyVisible,
      startSec: currentStartSec
    }
  }

  // Reset scroll and timer to start
  const handleResetToTop = () => {
    setIsPlaying(false)
    setScrollY(0, true)
    accumulatedScrollRef.current = 0
    elapsedRef.current = 0
    currentSecRef.current = -1
    sectionScrollStateRef.current = null
    setElapsedSeconds(0)
    onActiveSectionChange?.(-1)
  }

  // Jump to specific section (jumps to target chorus if repeating)
  const handleJumpToSection = (secIndex: number) => {
    const sec = timingData.sections[secIndex]
    if (!sec) return

    elapsedRef.current = sec.startSec
    currentSecRef.current = secIndex
    setElapsedSeconds(sec.startSec)
    onActiveSectionChange?.(secIndex)

    const targetDomIndex = sec.targetSectionIndex ?? sec.index
    const bounds = calculateSectionScrollBounds(targetDomIndex, sec.startSec)
    if (bounds) {
      sectionScrollStateRef.current = bounds
      accumulatedScrollRef.current = bounds.startScrollY
      setScrollY(bounds.startScrollY, true)
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
        setScrollY(accumulatedScrollRef.current, false)

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
        setScrollY(targetY, false)

        if (elapsedRef.current >= targetDuration || targetY >= maxScroll - 4) {
          setIsPlaying(false)
          return
        }
      } else if (mode === 'sections') {
        // Musical section-by-section smart scroll with repeat jumping & 1x overflow scroll
        elapsedRef.current += deltaSec
        setElapsedSeconds(elapsedRef.current)

        const currentSec =
          timingData.sections.find(
            s => elapsedRef.current >= s.startSec && elapsedRef.current < s.endSec
          ) || timingData.sections[timingData.sections.length - 1]

        const targetDomIndex = currentSec.targetSectionIndex ?? currentSec.index

        if (currentSec && currentSec.index !== currentSecRef.current) {
          currentSecRef.current = currentSec.index
          onActiveSectionChange?.(currentSec.index)

          // Smoothly glide / jump directly to the target section (original chorus if repeat)
          const bounds = calculateSectionScrollBounds(targetDomIndex, currentSec.startSec)
          if (bounds) {
            sectionScrollStateRef.current = bounds
            accumulatedScrollRef.current = bounds.startScrollY
            setScrollY(bounds.startScrollY, true)
          }
        } else if (transitionMode === 'jump' && currentSec) {
          // If section overflows available height, scroll gently at 1x speed to reveal full section
          const state = sectionScrollStateRef.current
          if (state && !state.isFullyVisible && state.endScrollY > state.startScrollY) {
            const timeInSection = elapsedRef.current - state.startSec
            const initialHoldSec = 2.0 // 2 second pause to read the first lines before scrolling
            if (timeInSection > initialHoldSec) {
              const scrollTime = timeInSection - initialHoldSec
              const pxPerSec = (speed || 1.0) * 28 // 1x calibrated speed
              const move = scrollTime * pxPerSec
              const targetY = Math.min(state.endScrollY, state.startScrollY + move)
              accumulatedScrollRef.current = targetY
              setScrollY(targetY, false)
            }
          }
        } else if (transitionMode === 'continuous' && currentSec) {
          // Continuous smooth flow between sections
          const secDuration = Math.max(0.1, currentSec.endSec - currentSec.startSec)
          const secProgress = Math.min(1, Math.max(0, (elapsedRef.current - currentSec.startSec) / secDuration))
          const secElem = document.getElementById(`song-section-${targetDomIndex}`)
          const nextSecElem = document.getElementById(`song-section-${targetDomIndex + 1}`)

          if (secElem) {
            const curTop = Math.max(0, getElementPageY(secElem) - 70)
            const nextTop = nextSecElem ? Math.max(0, getElementPageY(nextSecElem) - 70) : maxScroll
            const targetY = curTop + secProgress * (nextTop - curTop)
            accumulatedScrollRef.current = targetY
            setScrollY(targetY, false)
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
  }, [isPlaying, mode, speed, targetDuration, timingData, transitionMode, onActiveSectionChange])

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

  // Active section display & countdown
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

  const secTimeRemaining = currentActiveSection
    ? Math.max(0, currentActiveSection.endSec - elapsedSeconds)
    : 0

  const secProgressPct = currentActiveSection && currentActiveSection.durationSec > 0
    ? Math.min(100, Math.max(0, ((elapsedSeconds - currentActiveSection.startSec) / currentActiveSection.durationSec) * 100))
    : 0

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
              {/* Manual Times Banner if custom durations detected */}
              {timingData.hasCustomTiming && (
                <div className="bg-emerald-500/15 border border-emerald-500/40 rounded-xl px-2.5 py-1.5 text-[11px] text-emerald-300 font-bold flex items-center justify-between shadow-xs">
                  <span className="flex items-center gap-1.5">
                    <span>⚡</span>
                    <span>Tiempos manuales ({timingData.sections.filter(s => s.isExplicitDuration).length} partes con tiempo)</span>
                  </span>
                  <span className="font-mono text-[10px] text-emerald-400 font-black">
                    Total: {formatTime(timingData.totalSeconds)}
                  </span>
                </div>
              )}

              {/* Transition Style Selector */}
              <div className="flex items-center justify-between text-xs pb-1 border-b border-zinc-800/80">
                <span className="text-zinc-400 font-medium">Modo de avance:</span>
                <div className="flex items-center bg-zinc-800/90 p-0.5 rounded-xl border border-zinc-700/80 text-[11px]">
                  <button
                    type="button"
                    onClick={() => setTransitionMode('jump')}
                    className={`px-2.5 py-1 rounded-lg font-bold transition cursor-pointer flex items-center gap-1 ${
                      transitionMode === 'jump'
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'text-zinc-400 hover:text-white'
                    }`}
                    title="Brinca directamente a cada sección al cumplirse su tiempo"
                  >
                    <span>⚡</span>
                    <span>Brinco</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setTransitionMode('continuous')}
                    className={`px-2.5 py-1 rounded-lg font-bold transition cursor-pointer flex items-center gap-1 ${
                      transitionMode === 'continuous'
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'text-zinc-400 hover:text-white'
                    }`}
                    title="Desplazamiento suave y continuo dentro de cada parte"
                  >
                    <span>🌊</span>
                    <span>Continuo</span>
                  </button>
                </div>
              </div>

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

              {/* Active Section Info Card */}
              <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-2.5">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[10px] text-emerald-400 uppercase font-black">
                      Sección en curso:
                    </span>
                    {currentActiveSection?.isRepeat && (
                      <span className="text-[9px] bg-amber-500/20 text-amber-300 font-bold px-1.5 py-0.2 rounded-full border border-amber-500/30">
                        ⤴ Repite {currentActiveSection.parentTitle}
                      </span>
                    )}
                    {currentActiveSection?.isExplicitDuration && !currentActiveSection.isRepeat && (
                      <span className="text-[9px] bg-emerald-500/30 text-emerald-300 font-mono font-bold px-1.5 py-0.2 rounded-full border border-emerald-400/40">
                        ⚡ {currentActiveSection.durationSec}s manual
                      </span>
                    )}
                  </div>
                  <span className="text-xs font-mono font-bold text-emerald-300">
                    {formatTime(elapsedSeconds)} / {formatTime(timingData.totalSeconds)}
                  </span>
                </div>

                <div className="flex items-baseline justify-between">
                  <div className="flex items-center gap-1.5">
                    {currentActiveSection?.isRepeat && <span className="text-emerald-400 text-xs">⤴</span>}
                    <span className="text-sm font-black text-white">
                      {currentActiveSection?.title || 'Inicio'}
                    </span>
                    {currentActiveSection?.isRepeat && (
                      <span className="text-[10px] text-zinc-400">
                        (en {currentActiveSection.parentTitle} arriba)
                      </span>
                    )}
                  </div>
                  <span className="text-[11px] font-mono text-zinc-300">
                    Quedan <strong className="text-emerald-400 font-bold">{Math.ceil(secTimeRemaining)}s</strong> (de {Math.round(currentActiveSection?.durationSec || 0)}s)
                  </span>
                </div>

                {/* Section Visibility & Scroll Status Hint */}
                <div className="mt-1 flex items-center justify-between text-[10px] text-zinc-400">
                  {sectionScrollStateRef.current?.isFullyVisible ? (
                    <span className="text-emerald-400 font-medium">✓ Sección completa visible en pantalla</span>
                  ) : sectionScrollStateRef.current ? (
                    <span className="text-amber-300/90 font-medium animate-pulse">📜 Ajustando scroll a 1x para ver completa</span>
                  ) : null}

                  {timingData.sections[currentActiveSection?.index + 1] && (
                    <span className="text-zinc-400 truncate max-w-[150px]">
                      Siguiente: <strong className="text-zinc-200">{timingData.sections[currentActiveSection.index + 1].title}</strong>
                    </span>
                  )}
                </div>

                {/* Section Progress Bar */}
                <div className="w-full bg-zinc-800/80 rounded-full h-1.5 overflow-hidden mt-1.5 border border-zinc-700/60">
                  <div
                    className="bg-emerald-400 h-full transition-all duration-150"
                    style={{ width: `${secProgressPct}%` }}
                  />
                </div>
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
                        className={`px-2 py-1 rounded-lg text-[11px] font-bold transition border cursor-pointer flex items-center gap-1 ${
                          isActive
                            ? 'bg-emerald-500 text-zinc-950 border-emerald-400 shadow-sm'
                            : sec.isRepeat
                            ? 'bg-zinc-800/90 text-emerald-300 border-zinc-700 hover:text-white hover:bg-zinc-700'
                            : 'bg-zinc-800 text-zinc-300 border-zinc-700 hover:text-white hover:bg-zinc-700'
                        }`}
                        title={`Saltar a ${sec.title} (${formatTime(sec.startSec)})${sec.isRepeat ? ` (Repite ${sec.parentTitle})` : ''}`}
                      >
                        {sec.isRepeat ? (
                          <span className="text-[10px] font-extrabold text-emerald-400">⤴</span>
                        ) : sec.isExplicitDuration ? (
                          <span className="text-[9px]">⚡</span>
                        ) : null}
                        <span>{sec.title}</span>
                        <span className="text-[10px] opacity-75 font-mono">({Math.round(sec.durationSec)}s)</span>
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
