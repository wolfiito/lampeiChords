import React, { useState, useEffect, useRef } from 'react'
import { Play, Pause, Volume2, VolumeX, Plus, Minus } from 'lucide-react'
import { WebMetronome } from '../music/metronome'

interface MetronomeBarProps {
  initialBpm?: number
  onBpmChange?: (bpm: number) => void
}

export const MetronomeBar: React.FC<MetronomeBarProps> = ({ initialBpm = 100, onBpmChange }) => {
  const [bpm, setBpm] = useState<number>(initialBpm)
  const [isPlaying, setIsPlaying] = useState<boolean>(false)
  const [isMuted, setIsMuted] = useState<boolean>(false)
  const [currentBeat, setCurrentBeat] = useState<number>(-1)
  const [beatsPerMeasure, setBeatsPerMeasure] = useState<number>(4)

  const metronomeRef = useRef<WebMetronome | null>(null)
  const tapTimesRef = useRef<number[]>([])

  useEffect(() => {
    const met = new WebMetronome(bpm, beatsPerMeasure)
    met.setOnBeat(beat => {
      setCurrentBeat(beat)
    })
    metronomeRef.current = met

    return () => {
      met.stop()
    }
  }, [beatsPerMeasure])

  useEffect(() => {
    if (metronomeRef.current) {
      metronomeRef.current.setBpm(bpm)
    }
    if (onBpmChange) {
      onBpmChange(bpm)
    }
  }, [bpm, onBpmChange])

  useEffect(() => {
    if (metronomeRef.current) {
      metronomeRef.current.setMuted(isMuted)
    }
  }, [isMuted])

  const togglePlay = () => {
    if (!metronomeRef.current) return
    const running = metronomeRef.current.toggle()
    setIsPlaying(running)
    if (!running) setCurrentBeat(-1)
  }

  const handleTap = () => {
    const now = performance.now()
    const taps = tapTimesRef.current

    if (taps.length > 0 && now - taps[taps.length - 1] > 2000) {
      tapTimesRef.current = [now]
      return
    }

    taps.push(now)
    if (taps.length > 5) taps.shift()

    if (taps.length >= 2) {
      const intervals = []
      for (let i = 1; i < taps.length; i++) {
        intervals.push(taps[i] - taps[i - 1])
      }
      const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length
      const calculatedBpm = Math.round(60000 / avgInterval)
      if (calculatedBpm >= 40 && calculatedBpm <= 240) {
        setBpm(calculatedBpm)
      }
    }
  }

  return (
    <div className="no-print bg-zinc-900/95 border border-zinc-800 rounded-3xl p-3.5 flex flex-wrap items-center justify-between gap-4 shadow-xl">
      {/* Play/Pause & Beat Indicator */}
      <div className="flex items-center gap-3">
        <button
          onClick={togglePlay}
          className={`p-3 rounded-2xl font-bold flex items-center justify-center transition shadow-md ${
            isPlaying
              ? 'bg-amber-500 hover:bg-amber-600 text-zinc-950'
              : 'bg-emerald-600 hover:bg-emerald-500 text-white'
          }`}
          title={isPlaying ? 'Detener Metrónomo' : 'Iniciar Metrónomo'}
        >
          {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current" />}
        </button>

        {/* Visual Beats */}
        <div className="flex items-center gap-1.5 bg-zinc-950 px-3.5 py-2.5 rounded-2xl border border-zinc-800">
          {Array.from({ length: beatsPerMeasure }).map((_, idx) => {
            const isActive = currentBeat === idx
            const isFirst = idx === 0
            return (
              <div
                key={idx}
                className={`w-3.5 h-3.5 rounded-full transition-all duration-75 ${
                  isActive
                    ? isFirst
                      ? 'bg-rose-500 scale-125 shadow-lg shadow-rose-500/50'
                      : 'bg-emerald-400 scale-125 shadow-lg shadow-emerald-400/50'
                    : 'bg-zinc-800'
                }`}
              />
            )
          })}
        </div>
      </div>

      {/* BPM Adjuster */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => setBpm(b => Math.max(30, b - 1))}
          className="p-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl transition"
        >
          <Minus className="w-4 h-4" />
        </button>

        <div className="flex flex-col items-center min-w-16">
          <span className="text-xl font-black font-mono text-emerald-400 leading-none">
            {bpm}
          </span>
          <span className="text-[10px] text-zinc-400 uppercase font-semibold">BPM</span>
        </div>

        <button
          onClick={() => setBpm(b => Math.min(260, b + 1))}
          className="p-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl transition"
        >
          <Plus className="w-4 h-4" />
        </button>

        <input
          type="range"
          min="40"
          max="220"
          value={bpm}
          onChange={e => setBpm(Number(e.target.value))}
          className="w-24 sm:w-32 accent-emerald-500 h-2 bg-zinc-800 rounded-lg cursor-pointer"
        />
      </div>

      {/* Tap Tempo & Time Signature */}
      <div className="flex items-center gap-2">
        <button
          onClick={handleTap}
          className="px-3.5 py-1.5 bg-zinc-800 hover:bg-zinc-700 active:scale-95 text-xs font-bold text-zinc-200 border border-zinc-700 rounded-xl transition"
        >
          TAP
        </button>

        <select
          value={beatsPerMeasure}
          onChange={e => setBeatsPerMeasure(Number(e.target.value))}
          className="bg-zinc-800 text-zinc-200 text-xs font-bold border border-zinc-700 rounded-xl px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-emerald-500"
        >
          <option value="4">4/4</option>
          <option value="3">3/4</option>
          <option value="2">2/4</option>
          <option value="6">6/8</option>
        </select>

        <button
          onClick={() => setIsMuted(m => !m)}
          title={isMuted ? 'Activar sonido' : 'Silenciar sonido (solo visual)'}
          className={`p-2 rounded-xl transition ${
            isMuted ? 'text-rose-400 bg-rose-500/10' : 'text-zinc-400 hover:text-white bg-zinc-800'
          }`}
        >
          {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
        </button>
      </div>
    </div>
  )
}
