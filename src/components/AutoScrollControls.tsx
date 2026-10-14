import React, { useEffect, useRef } from 'react'
import { Play, Pause, ArrowUp, FastForward } from 'lucide-react'

interface AutoScrollControlsProps {
  scrollContainerRef?: React.RefObject<HTMLElement | null>
}

export const AutoScrollControls: React.FC<AutoScrollControlsProps> = ({ scrollContainerRef }) => {
  const [isPlaying, setIsPlaying] = React.useState(false)
  const [speed, setSpeed] = React.useState(3)
  const animationFrameRef = useRef<number | null>(null)
  const lastTimeRef = useRef<number>(0)

  useEffect(() => {
    if (!isPlaying) {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
      return
    }

    const scrollElement = scrollContainerRef?.current || document.documentElement || document.body

    const scrollStep = (currentTime: number) => {
      if (!lastTimeRef.current) lastTimeRef.current = currentTime
      const delta = currentTime - lastTimeRef.current

      const pxPerMs = (speed * 12 + 10) / 1000
      const move = delta * pxPerMs

      if (scrollElement) {
        scrollElement.scrollTop += move
        if (scrollElement.scrollTop + scrollElement.clientHeight >= scrollElement.scrollHeight - 5) {
          setIsPlaying(false)
          return
        }
      }

      lastTimeRef.current = currentTime
      animationFrameRef.current = requestAnimationFrame(scrollStep)
    }

    lastTimeRef.current = performance.now()
    animationFrameRef.current = requestAnimationFrame(scrollStep)

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [isPlaying, speed, scrollContainerRef])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeTag = document.activeElement?.tagName.toLowerCase()
      if (activeTag === 'input' || activeTag === 'textarea' || (document.activeElement as HTMLElement)?.isContentEditable) {
        return
      }

      if (e.code === 'Space') {
        e.preventDefault()
        setIsPlaying(prev => !prev)
      } else if (e.key === 'ArrowUp' && e.altKey) {
        e.preventDefault()
        setSpeed(s => Math.min(10, s + 1))
      } else if (e.key === 'ArrowDown' && e.altKey) {
        e.preventDefault()
        setSpeed(s => Math.max(1, s - 1))
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  const scrollToTop = () => {
    const scrollElement = scrollContainerRef?.current || document.documentElement || document.body
    scrollElement.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <aside
      aria-label="Controles de desplazamiento"
      className="no-print fixed bottom-3 right-3 sm:bottom-5 sm:right-5 z-40 bg-zinc-900/95 backdrop-blur-md border border-zinc-800 rounded-2xl sm:rounded-3xl shadow-2xl p-1.5 sm:p-2.5 flex items-center gap-1.5 sm:gap-3 transition-all hover:border-emerald-500/50 max-w-[94vw]"
    >
      {/* Scroll to Top */}
      <button
        onClick={scrollToTop}
        title="Volver arriba"
        className="p-1.5 sm:p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-xl transition"
      >
        <ArrowUp className="w-4 h-4 sm:w-5 sm:h-5" />
      </button>

      {/* Play / Pause */}
      <button
        onClick={() => setIsPlaying(p => !p)}
        title={isPlaying ? 'Pausar auto-scroll (Espacio)' : 'Iniciar auto-scroll (Espacio)'}
        className={`px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-xl sm:rounded-2xl font-bold flex items-center gap-1.5 sm:gap-2 shadow-lg transition-all ${
          isPlaying
            ? 'bg-amber-500 hover:bg-amber-600 text-zinc-950 animate-pulse'
            : 'bg-emerald-500 hover:bg-emerald-600 text-zinc-950 shadow-emerald-500/20'
        }`}
      >
        {isPlaying ? (
          <>
            <Pause className="w-4 h-4 sm:w-5 sm:h-5 fill-current" />
            <span className="text-[10px] sm:text-xs uppercase tracking-wider">Pausar</span>
          </>
        ) : (
          <>
            <Play className="w-4 h-4 sm:w-5 sm:h-5 fill-current" />
            <span className="text-[10px] sm:text-xs uppercase tracking-wider">Scroll</span>
          </>
        )}
      </button>

      {/* Speed Controls */}
      <div className="flex items-center gap-1 sm:gap-2 bg-zinc-800/80 px-2 sm:px-2.5 py-1 sm:py-1.5 rounded-xl sm:rounded-2xl border border-zinc-700/50">
        <FastForward className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-400" />
        <span className="text-[10px] sm:text-xs font-mono font-bold text-emerald-400 min-w-4 sm:min-w-6 text-center">
          {speed}x
        </span>
        <input
          type="range"
          min="1"
          max="10"
          value={speed}
          onChange={e => setSpeed(Number(e.target.value))}
          className="w-14 sm:w-20 accent-emerald-500 h-1.5 bg-zinc-700 rounded-lg cursor-pointer"
          title={`Velocidad: ${speed}x`}
        />
      </div>
    </aside>
  )
}
