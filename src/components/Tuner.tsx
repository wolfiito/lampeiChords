import React, { useState, useEffect, useRef, useMemo } from 'react'
import {
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  HelpCircle,
  Radio,
  ArrowLeft,
  ArrowUp,
  ArrowDown,
  CheckCircle,
  Music
} from 'lucide-react'
import {
  TUNER_PRESETS,
  frequencyToPitch,
  detectPitchYIN,
  playReferenceTone,
  stopReferenceTone,
  type PitchResult,
  type InstrumentPreset,
  type InstrumentString
} from '../music/tunerAudio'
import { useTheme } from '../context/ThemeContext'
import type { NotationSystem } from '../types/song'

interface TunerProps {
  onBackToLibrary?: () => void
}

export const Tuner: React.FC<TunerProps> = ({ onBackToLibrary }) => {
  const { themeConfig } = useTheme()

  const [presetId, setPresetId] = useState<string>(() => {
    try {
      return localStorage.getItem('chords_tuner_preset') || 'guitar'
    } catch {
      return 'guitar'
    }
  })

  const [notation, setNotation] = useState<NotationSystem>('anglo')
  const [a4Frequency, setA4Frequency] = useState<number>(440)
  const [isListening, setIsListening] = useState<boolean>(false)
  const [isHolding, setIsHolding] = useState<boolean>(false)
  const [micError, setMicError] = useState<string | null>(null)
  const [currentPitch, setCurrentPitch] = useState<PitchResult | null>(null)
  const [activeToneString, setActiveToneString] = useState<number | null>(null)

  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const animationFrameRef = useRef<number | null>(null)
  const smoothedCentsRef = useRef<number>(0)
  const lastPitchRef = useRef<PitchResult | null>(null)
  const lastDetectedTimestampRef = useRef<number>(0)

  const currentPreset = useMemo<InstrumentPreset>(() => {
    return TUNER_PRESETS.find(p => p.id === presetId) || TUNER_PRESETS[0]
  }, [presetId])

  // Save selected preset
  const handleSelectPreset = (id: string) => {
    setPresetId(id)
    try {
      localStorage.setItem('chords_tuner_preset', id)
    } catch {}
  }

  // Start microphone and pitch analysis loop
  const startListening = async () => {
    setMicError(null)
    try {
      let stream: MediaStream
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: false,
            noiseSuppression: false,
            autoGainControl: false
          }
        })
      } catch {
        // Fallback for mobile browsers with strict constraint handling
        stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      }
      streamRef.current = stream

      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
      const audioCtx = new AudioCtx()
      audioContextRef.current = audioCtx

      // Crucial for iOS Safari & Android Chrome: explicitly resume audio context
      if (audioCtx.state === 'suspended') {
        await audioCtx.resume()
      }

      const analyser = audioCtx.createAnalyser()
      analyser.fftSize = 2048
      analyserRef.current = analyser

      const source = audioCtx.createMediaStreamSource(stream)
      source.connect(analyser)

      setIsListening(true)
      setIsHolding(false)

      const buffer = new Float32Array(analyser.fftSize)

      const analyzeLoop = () => {
        if (!analyserRef.current) return
        analyserRef.current.getFloatTimeDomainData(buffer)

        const result = detectPitchYIN(buffer, audioCtx.sampleRate, 0.15)
        if (result && result.probability > 0.52) {
          const pitch = frequencyToPitch(result.frequency, a4Frequency)

          // Smooth cents to avoid rapid jitter
          smoothedCentsRef.current = smoothedCentsRef.current * 0.7 + pitch.cents * 0.3
          pitch.cents = Math.round(smoothedCentsRef.current)
          pitch.inTune = Math.abs(pitch.cents) <= 3

          lastPitchRef.current = pitch
          lastDetectedTimestampRef.current = Date.now()
          setCurrentPitch(pitch)
          setIsHolding(false)

          if (pitch.inTune && typeof navigator !== 'undefined' && navigator.vibrate) {
            try {
              navigator.vibrate(30)
            } catch {}
          }
        } else {
          // If signal decays (between plucks), hold the last detected pitch for 2.5s
          const timeSinceDetection = Date.now() - lastDetectedTimestampRef.current
          if (lastPitchRef.current && timeSinceDetection < 2500) {
            setIsHolding(true)
          } else {
            setIsHolding(false)
            setCurrentPitch(null)
            lastPitchRef.current = null
          }
        }

        animationFrameRef.current = requestAnimationFrame(analyzeLoop)
      }

      animationFrameRef.current = requestAnimationFrame(analyzeLoop)
    } catch (err: unknown) {
      console.error('Error starting tuner mic:', err)
      const errorMsg = (err instanceof Error && err.name === 'NotAllowedError')
        ? 'Permiso de micrófono denegado. Permite el acceso al micrófono en tu navegador para afinar.'
        : 'No se pudo conectar al micrófono del dispositivo.'
      setMicError(errorMsg)
      setIsListening(false)
    }
  }

  // Stop microphone and cancel loops
  const stopListening = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current)
      animationFrameRef.current = null
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close().catch(() => {})
      audioContextRef.current = null
    }
    analyserRef.current = null
    setIsListening(false)
    setIsHolding(false)
    setCurrentPitch(null)
    lastPitchRef.current = null
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopListening()
      stopReferenceTone()
    }
  }, [])

  // Reference tone playback for strings
  const handlePlayStringTone = (targetString: InstrumentString) => {
    if (activeToneString === targetString.stringNumber) {
      stopReferenceTone()
      setActiveToneString(null)
    } else {
      playReferenceTone(targetString.frequency)
      setActiveToneString(targetString.stringNumber)
    }
  }

  // Gauge needle position (-50 to +50 cents)
  const displayCents = currentPitch ? Math.max(-50, Math.min(50, currentPitch.cents)) : 0

  // Check if detected note matches a string in the current preset
  const matchedString = useMemo(() => {
    if (!currentPitch || currentPreset.strings.length === 0) return null
    return currentPreset.strings.find(
      s => s.note === currentPitch.noteName && Math.abs(s.octave - currentPitch.octave) <= 1
    )
  }, [currentPitch, currentPreset])

  return (
    <div className="w-full max-w-4xl mx-auto px-3 sm:px-6 py-4 sm:py-8 font-sans">
      {/* Top Header Card */}
      <div className="bg-zinc-900/80 border border-zinc-800 rounded-3xl p-4 sm:p-6 mb-6 shadow-xl backdrop-blur-md">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-zinc-800">
          <div className="flex items-center gap-3">
            {onBackToLibrary && (
              <button
                type="button"
                onClick={onBackToLibrary}
                className="p-2 bg-zinc-950 hover:bg-zinc-800 text-zinc-300 hover:text-white rounded-xl border border-zinc-800 transition cursor-pointer"
                title="Volver al catálogo"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
            )}
            <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-2xl flex items-center justify-center ${themeConfig.primaryBadge} shadow-lg shrink-0`}>
              <Radio className={`w-5 h-5 sm:w-6 sm:h-6 ${themeConfig.primaryText}`} />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
                Afinador Digital
                <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${themeConfig.primaryBadge}`}>
                  En vivo
                </span>
              </h1>
              <p className="text-xs text-zinc-400">Guitarra, Bajo y Afinación Cromática por Micrófono</p>
            </div>
          </div>

          {/* Quick Controls: Mic Toggle + Notation + A4 */}
          <div className="flex items-center gap-2 w-full sm:w-auto justify-end flex-wrap">
            {/* A4 Frequency calibration toggle */}
            <button
              type="button"
              onClick={() => setA4Frequency(f => (f === 440 ? 432 : 440))}
              title="Cambiar frecuencia de referencia A4 (440 Hz estándar o 432 Hz)"
              className="px-2.5 py-1 text-xs font-mono font-bold bg-zinc-950 hover:bg-zinc-800 text-zinc-300 hover:text-white rounded-xl border border-zinc-800 transition cursor-pointer"
            >
              A4: {a4Frequency}Hz
            </button>
            {/* Notation system toggle */}
            <div className="flex items-center bg-zinc-950 p-1 rounded-xl border border-zinc-800">
              <button
                type="button"
                onClick={() => setNotation('anglo')}
                className={`px-2.5 py-1 text-xs font-bold rounded-lg transition ${
                  notation === 'anglo'
                    ? `${themeConfig.primaryBg} text-white shadow`
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                C D E
              </button>
              <button
                type="button"
                onClick={() => setNotation('latin')}
                className={`px-2.5 py-1 text-xs font-bold rounded-lg transition ${
                  notation === 'latin'
                    ? `${themeConfig.primaryBg} text-white shadow`
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                Do Re Mi
              </button>
            </div>

            {/* Mic Toggle Button */}
            <button
              onClick={isListening ? stopListening : startListening}
              className={`px-3.5 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition flex items-center gap-2 shadow-lg cursor-pointer active:scale-95 ${
                isListening
                  ? 'bg-rose-500 hover:bg-rose-600 text-white shadow-rose-500/20'
                  : `${themeConfig.primaryButton} shadow-emerald-600/20`
              }`}
            >
              {isListening ? (
                <>
                  <MicOff className="w-4 h-4" />
                  <span>Detener</span>
                </>
              ) : (
                <>
                  <Mic className="w-4 h-4 animate-pulse" />
                  <span>Activar Micrófono</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Instrument Presets Picker Tabs */}
        <div className="pt-4 flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
          {TUNER_PRESETS.map(preset => {
            const isSelected = preset.id === presetId
            return (
              <button
                key={preset.id}
                onClick={() => handleSelectPreset(preset.id)}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition cursor-pointer flex items-center gap-2 border ${
                  isSelected
                    ? `${themeConfig.primaryBadge} shadow-sm border-transparent`
                    : 'bg-zinc-950/80 text-zinc-400 hover:text-white hover:bg-zinc-800 border-zinc-800'
                }`}
              >
                <span>{preset.name}</span>
                {isSelected && <span className="text-[10px] font-black">✓</span>}
              </button>
            )
          })}
        </div>
      </div>

      {/* Main Tuner Centerpiece */}
      <div className="bg-gradient-to-b from-zinc-900 via-zinc-900/95 to-zinc-950 border border-zinc-800 rounded-3xl p-6 sm:p-10 mb-6 shadow-2xl relative overflow-hidden flex flex-col items-center justify-center min-h-[380px]">
        {/* Decorative background glow when in tune */}
        {currentPitch?.inTune && (
          <div className="absolute inset-0 bg-emerald-500/10 pointer-events-none transition-opacity duration-300 animate-pulse" />
        )}

        {/* Error message banner */}
        {micError && (
          <div className="w-full max-w-md bg-rose-500/15 border border-rose-500/40 text-rose-300 text-xs sm:text-sm p-4 rounded-2xl text-center mb-6">
            <p className="font-bold mb-1">¡Permiso de Micrófono Requerido!</p>
            <p className="text-rose-200/90 text-xs">{micError}</p>
          </div>
        )}

        {!isListening ? (
          /* Mic inactive state */
          <div className="text-center py-8 z-10 max-w-sm mx-auto">
            <div className={`w-20 h-20 mx-auto rounded-3xl flex items-center justify-center ${themeConfig.primaryBadge} mb-4 shadow-xl`}>
              <Mic className={`w-10 h-10 ${themeConfig.primaryText}`} />
            </div>
            <h2 className="text-lg sm:text-xl font-bold text-white mb-2">Micrófono en Pausa</h2>
            <p className="text-xs sm:text-sm text-zinc-400 mb-6 leading-relaxed">
              Presiona el botón para comenzar a afinar. Toca cualquier cuerda al aire y la app detectará la nota automáticamente.
            </p>
            <button
              onClick={startListening}
              className={`px-6 py-3 ${themeConfig.primaryButton} text-sm font-bold rounded-2xl shadow-xl transition flex items-center gap-2 mx-auto cursor-pointer active:scale-95`}
            >
              <Mic className="w-4 h-4" />
              <span>Comenzar a Afinar</span>
            </button>
          </div>
        ) : (
          /* Live Meter Display */
          <div className="w-full max-w-lg flex flex-col items-center z-10">
            {currentPitch ? (
              <>
                {/* 1. TOP HERO: Identified Note & String Header */}
                <div className="flex flex-col items-center text-center mb-3">
                  {matchedString && (
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-zinc-800/80 border border-zinc-700/60 text-zinc-300 text-xs font-bold mb-1 shadow-sm">
                      <Music className="w-3.5 h-3.5 text-zinc-400" />
                      <span>{currentPreset.name} • Cuerda {matchedString.stringNumber}</span>
                    </div>
                  )}

                  {/* Big Note Name */}
                  <div className="relative inline-flex items-baseline gap-2 my-0.5">
                    <span
                      className={`text-7xl sm:text-8xl font-black tracking-tight select-none transition-colors duration-150 ${
                        currentPitch.inTune
                          ? `${themeConfig.primaryText} drop-shadow-[0_0_24px_rgba(52,211,153,0.7)]`
                          : 'text-white'
                      }`}
                    >
                      {notation === 'latin' ? currentPitch.noteNameLatin : currentPitch.noteName}
                    </span>
                    <span className="text-2xl sm:text-3xl font-mono font-bold text-zinc-500 select-none">
                      {currentPitch.octave}
                    </span>
                    <span className="text-sm font-semibold text-zinc-500 select-none ml-1">
                      ({notation === 'latin' ? currentPitch.noteName : currentPitch.noteNameLatin})
                    </span>
                  </div>

                  {/* Big Actionable Directive Banner: APRETAR vs AFLOJAR vs ¡AFINADA! */}
                  <div className="mt-2 mb-1">
                    {currentPitch.inTune ? (
                      <div
                        className={`px-5 sm:px-6 py-2 rounded-2xl ${themeConfig.primaryButton} font-black text-sm sm:text-base shadow-xl flex items-center gap-2 animate-bounce`}
                      >
                        <CheckCircle className="w-5 h-5 stroke-[2.5]" />
                        <span>¡AFINADA!</span>
                        <span className="text-xs font-mono font-bold opacity-90">(Tono exacto)</span>
                      </div>
                    ) : currentPitch.cents < 0 ? (
                      <div className="px-5 sm:px-6 py-2 rounded-2xl bg-amber-500/20 border-2 border-amber-500/60 text-amber-300 font-black text-sm sm:text-base shadow-lg shadow-amber-500/10 flex items-center gap-2 animate-pulse">
                        <ArrowUp className="w-5 h-5 stroke-[3]" />
                        <span>APRETAR (Tensar clavija)</span>
                        <span className="text-xs font-mono font-bold text-amber-400/90 ml-1">
                          {Math.abs(currentPitch.cents)} cents bajo
                        </span>
                      </div>
                    ) : (
                      <div className="px-5 sm:px-6 py-2 rounded-2xl bg-rose-500/20 border-2 border-rose-500/60 text-rose-300 font-black text-sm sm:text-base shadow-lg shadow-rose-500/10 flex items-center gap-2 animate-pulse">
                        <ArrowDown className="w-5 h-5 stroke-[3]" />
                        <span>AFLOJAR (Destensar clavija)</span>
                        <span className="text-xs font-mono font-bold text-rose-400/90 ml-1">
                          +{currentPitch.cents} cents alto
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Hold persistence status pill */}
                  {isHolding && (
                    <span className="text-[10px] font-bold text-zinc-400 bg-zinc-950/80 px-2.5 py-0.5 rounded-full border border-zinc-800 mt-1">
                      Última nota capturada • Toca de nuevo
                    </span>
                  )}
                </div>

                {/* 2. Visual Gauge Scale Meter with APRETAR / AFLOJAR guides */}
                <div className="w-full relative px-2 pt-2 pb-4">
                  {/* Gauge labels on top of ticks: Left: APRETAR, Center: PERFECTO, Right: AFLOJAR */}
                  <div className="flex items-center justify-between text-[11px] font-black uppercase tracking-wider px-1 mb-1">
                    <span className="text-amber-400/90 flex items-center gap-1">
                      <ArrowUp className="w-3 h-3 stroke-[3]" />
                      <span>Apretar (Bajo)</span>
                    </span>
                    <span className={`text-[10px] font-black ${currentPitch.inTune ? themeConfig.primaryText : 'text-zinc-500'}`}>
                      Centro (0)
                    </span>
                    <span className="text-rose-400/90 flex items-center gap-1">
                      <span>Aflojar (Alto)</span>
                      <ArrowDown className="w-3 h-3 stroke-[3]" />
                    </span>
                  </div>

                  {/* Ticks and scale labels */}
                  <div className="relative h-12 flex items-end justify-between px-2">
                    {[-50, -40, -30, -20, -10, 0, 10, 20, 30, 40, 50].map(c => {
                      const isZero = c === 0
                      const isBig = c % 20 === 0
                      return (
                        <div key={c} className="flex flex-col items-center">
                          <span
                            className={`text-[10px] font-mono font-bold mb-1 select-none ${
                              isZero
                                ? currentPitch?.inTune
                                  ? `${themeConfig.primaryText} scale-125`
                                  : 'text-zinc-200'
                                : 'text-zinc-600'
                            }`}
                          >
                            {isZero ? '0' : Math.abs(c)}
                          </span>
                          <div
                            className={`w-0.5 rounded-full transition-colors ${
                              isZero
                                ? currentPitch?.inTune
                                  ? `${themeConfig.primaryBg} w-1.5 h-7`
                                  : 'bg-emerald-400 w-1 h-6'
                                : isBig
                                ? 'bg-zinc-600 h-4'
                                : 'bg-zinc-800 h-2.5'
                            }`}
                          />
                        </div>
                      )
                    })}
                  </div>

                  {/* Central In-Tune Target Track */}
                  <div className="w-full h-3 bg-zinc-950 rounded-full border border-zinc-800 relative mt-1.5 overflow-hidden shadow-inner">
                    {/* Center target safe zone */}
                    <div className="absolute left-1/2 -translate-x-1/2 w-5 h-full bg-emerald-500/30 border-x border-emerald-500/60" />

                    {/* Animated Needle Bar */}
                    <div
                      className={`absolute top-0 bottom-0 w-3 rounded-full transition-all duration-150 shadow-md ${
                        currentPitch.inTune
                          ? `${themeConfig.primaryBg} shadow-[0_0_12px_rgba(52,211,153,0.9)]`
                          : Math.abs(currentPitch.cents) < 15
                          ? 'bg-amber-400 shadow-amber-400/40'
                          : 'bg-rose-500 shadow-rose-500/40'
                      }`}
                      style={{
                        left: `calc(${50 + (displayCents / 50) * 48}% - 6px)`
                      }}
                    />
                  </div>
                </div>

                {/* 3. Frequency & Target Details at bottom */}
                <div className="flex items-center gap-3 text-xs font-mono text-zinc-400 mt-2 bg-zinc-950/60 px-3.5 py-1.5 rounded-xl border border-zinc-800/80">
                  <span>Actual: <strong className="text-zinc-200">{currentPitch.frequency.toFixed(1)} Hz</strong></span>
                  <span>•</span>
                  <span>Objetivo: <strong className="text-zinc-300">{currentPitch.targetFrequency.toFixed(1)} Hz</strong></span>
                </div>
              </>
            ) : (
              /* Idle listening state */
              <div className="py-12 flex flex-col items-center text-center z-10">
                <div className="w-16 h-16 rounded-2xl bg-zinc-800/60 border border-zinc-700/50 flex items-center justify-center mb-3 shadow-lg animate-pulse">
                  <Music className="w-8 h-8 text-zinc-400" />
                </div>
                <h3 className="text-lg sm:text-xl font-bold text-white mb-1.5">
                  Esperando que toques una cuerda...
                </h3>
                <p className="text-xs sm:text-sm text-zinc-400 max-w-sm leading-relaxed mb-4">
                  Toca cualquier cuerda al aire de tu {currentPreset.name.toLowerCase()}. La app te mostrará arriba la nota detectada y si debes{' '}
                  <strong className="text-amber-300">APRETAR</strong> o{' '}
                  <strong className="text-rose-300">AFLOJAR</strong> la clavija.
                </p>
                <div className="flex items-center gap-2 text-[11px] font-bold text-zinc-500 bg-zinc-950/80 px-3 py-1 rounded-full border border-zinc-800">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping inline-block" />
                  <span>Micrófono activo y calibrado a {a4Frequency} Hz</span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Preset Strings Visual Selector (For Guitar & Bass) */}
      {currentPreset.strings.length > 0 && (
        <div className="bg-zinc-900/80 border border-zinc-800 rounded-3xl p-4 sm:p-6 shadow-xl backdrop-blur-md">
          <div className="flex items-center justify-between mb-3 pb-2 border-b border-zinc-800">
            <div>
              <h3 className="text-xs sm:text-sm font-bold text-white uppercase tracking-wider">
                Cuerdas de {currentPreset.name}
              </h3>
              <p className="text-[11px] text-zinc-400">Toca para escuchar el tono de referencia puro</p>
            </div>
            {activeToneString !== null && (
              <button
                onClick={stopReferenceTone}
                className="px-2.5 py-1 text-xs font-bold bg-zinc-800 hover:bg-zinc-700 text-rose-400 rounded-lg transition flex items-center gap-1"
              >
                <VolumeX className="w-3.5 h-3.5" />
                <span>Silenciar</span>
              </button>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2 sm:gap-3">
            {currentPreset.strings.map(s => {
              const isTargetActive = matchedString?.stringNumber === s.stringNumber
              const isPlayingTone = activeToneString === s.stringNumber
              return (
                <button
                  key={s.stringNumber}
                  type="button"
                  onClick={() => handlePlayStringTone(s)}
                  className={`p-3 rounded-2xl border transition-all flex flex-col items-center justify-between text-center relative cursor-pointer active:scale-95 ${
                    isPlayingTone
                      ? `${themeConfig.primaryBg} text-white shadow-lg`
                      : isTargetActive
                      ? `${themeConfig.primaryBadge} border-emerald-500/60 shadow-md`
                      : 'bg-zinc-950/80 border-zinc-800/80 text-zinc-300 hover:bg-zinc-800 hover:border-zinc-700'
                  }`}
                >
                  <span className="text-[10px] font-bold text-zinc-400 block mb-1">
                    Cuerda {s.stringNumber}
                  </span>
                  <span className="text-lg sm:text-xl font-black text-white block">
                    {notation === 'latin' ? s.noteLatin : s.note}
                    <span className="text-xs font-mono font-medium text-zinc-400 ml-0.5">{s.octave}</span>
                  </span>
                  <span className="text-[10px] font-mono text-zinc-500 mt-1 block">
                    {s.frequency.toFixed(1)} Hz
                  </span>

                  <div className="mt-2 text-zinc-400 hover:text-white">
                    {isPlayingTone ? (
                      <VolumeX className="w-3.5 h-3.5 text-white" />
                    ) : (
                      <Volume2 className="w-3.5 h-3.5 opacity-60" />
                    )}
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Helpful Tips Footer */}
      <div className="mt-6 p-4 rounded-2xl bg-zinc-900/40 border border-zinc-800/60 flex items-start gap-3 text-xs text-zinc-400">
        <HelpCircle className={`w-4 h-4 shrink-0 mt-0.5 ${themeConfig.primaryText}`} />
        <div className="space-y-1">
          <p className="font-semibold text-zinc-300">Consejos para una afinación más rápida y precisa:</p>
          <p>• Silencia las cuerdas adyacentes con la mano para que el micrófono capte únicamente la cuerda deseada.</p>
          <p>• En bajo eléctrico, pulsa con la yema del pulgar suavemente sobre el traste 12 (armónico) para una lectura instantánea y sin ruido.</p>
        </div>
      </div>
    </div>
  )
}
