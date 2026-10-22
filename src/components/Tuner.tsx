import React, { useState, useEffect, useRef, useMemo } from 'react'
import {
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  HelpCircle,
  Radio,
  ArrowLeft
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
  const [micError, setMicError] = useState<string | null>(null)
  const [currentPitch, setCurrentPitch] = useState<PitchResult | null>(null)
  const [activeToneString, setActiveToneString] = useState<number | null>(null)

  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const animationFrameRef = useRef<number | null>(null)
  const smoothedCentsRef = useRef<number>(0)

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
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false
        }
      })
      streamRef.current = stream

      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
      const audioCtx = new AudioCtx()
      audioContextRef.current = audioCtx

      const analyser = audioCtx.createAnalyser()
      analyser.fftSize = 2048
      analyserRef.current = analyser

      const source = audioCtx.createMediaStreamSource(stream)
      source.connect(analyser)

      setIsListening(true)

      const buffer = new Float32Array(analyser.fftSize)

      const analyzeLoop = () => {
        if (!analyserRef.current) return
        analyserRef.current.getFloatTimeDomainData(buffer)

        const result = detectPitchYIN(buffer, audioCtx.sampleRate, 0.15)
        if (result && result.probability > 0.6) {
          const pitch = frequencyToPitch(result.frequency, a4Frequency)

          // Smooth cents to avoid rapid jitter
          smoothedCentsRef.current = smoothedCentsRef.current * 0.7 + pitch.cents * 0.3
          pitch.cents = Math.round(smoothedCentsRef.current)
          pitch.inTune = Math.abs(pitch.cents) <= 3

          setCurrentPitch(pitch)

          if (pitch.inTune && typeof navigator !== 'undefined' && navigator.vibrate) {
            try {
              navigator.vibrate(30)
            } catch {}
          }
        } else {
          // Slowly decay towards null when signal is quiet
          setCurrentPitch(prev => (prev ? { ...prev, clarity: prev.clarity * 0.85 } : null))
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
    setCurrentPitch(null)
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
            {/* Visual Gauge Scale Meter */}
            <div className="w-full relative px-4 pt-2 pb-6">
              {/* Ticks and scale labels */}
              <div className="relative h-14 flex items-end justify-between px-2">
                {[-50, -40, -30, -20, -10, 0, 10, 20, 30, 40, 50].map(c => {
                  const isZero = c === 0
                  const isBig = c % 20 === 0
                  return (
                    <div key={c} className="flex flex-col items-center">
                      <span className={`text-[10px] font-mono font-bold mb-1 select-none ${
                        isZero
                          ? currentPitch?.inTune ? `${themeConfig.primaryText} scale-125` : 'text-zinc-200'
                          : 'text-zinc-600'
                      }`}>
                        {isZero ? '0' : Math.abs(c)}
                      </span>
                      <div
                        className={`w-0.5 rounded-full transition-colors ${
                          isZero
                            ? currentPitch?.inTune ? `${themeConfig.primaryBg} w-1.5 h-8` : 'bg-emerald-400 w-1 h-7'
                            : isBig
                            ? 'bg-zinc-600 h-5'
                            : 'bg-zinc-800 h-3'
                        }`}
                      />
                    </div>
                  )
                })}
              </div>

              {/* Central In-Tune Target Track */}
              <div className="w-full h-2.5 bg-zinc-950 rounded-full border border-zinc-800 relative mt-2 overflow-hidden shadow-inner">
                {/* Center target safe zone */}
                <div className="absolute left-1/2 -translate-x-1/2 w-4 h-full bg-emerald-500/30 border-x border-emerald-500/50" />

                {/* Animated Needle Bar */}
                {currentPitch && (
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
                )}
              </div>
            </div>

            {/* Note & Frequency Central Box */}
            <div className="flex flex-col items-center my-4 text-center">
              {currentPitch ? (
                <>
                  {/* Note Name Display */}
                  <div className="relative inline-flex items-baseline gap-1 my-1">
                    <span className={`text-6xl sm:text-7xl font-black tracking-tight select-none transition-colors ${
                      currentPitch.inTune
                        ? `${themeConfig.primaryText} drop-shadow-[0_0_20px_rgba(52,211,153,0.6)]`
                        : 'text-white'
                    }`}>
                      {notation === 'latin' ? currentPitch.noteNameLatin : currentPitch.noteName}
                    </span>
                    <span className="text-xl font-mono font-bold text-zinc-500 select-none">
                      {currentPitch.octave}
                    </span>
                  </div>

                  {/* Status Indicator Badge */}
                  <div className="my-2">
                    {currentPitch.inTune ? (
                      <span className={`px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-wider inline-flex items-center gap-1.5 shadow-lg ${themeConfig.primaryButton} animate-bounce`}>
                        <span>✓</span> ¡Afinado Perfecto!
                      </span>
                    ) : currentPitch.cents < 0 ? (
                      <span className="px-3.5 py-1.5 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 inline-flex items-center gap-1.5">
                        <span>↑</span> Sube la clavija ({Math.abs(currentPitch.cents)} cents bajo)
                      </span>
                    ) : (
                      <span className="px-3.5 py-1.5 rounded-full text-xs font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40 inline-flex items-center gap-1.5">
                        <span>↓</span> Baja la clavija (+{currentPitch.cents} cents alto)
                      </span>
                    )}
                  </div>

                  {/* Frequency & Target Details */}
                  <div className="flex items-center gap-3 text-xs font-mono text-zinc-400 mt-2">
                    <span>{currentPitch.frequency.toFixed(1)} Hz</span>
                    <span>•</span>
                    <span>Obj: {currentPitch.targetFrequency.toFixed(1)} Hz</span>
                  </div>
                </>
              ) : (
                <div className="py-8 text-center text-zinc-500 animate-pulse">
                  <p className="text-base font-bold text-zinc-400 mb-1">Escuchando instrumento...</p>
                  <p className="text-xs">Toca una cuerda con fuerza para comenzar</p>
                </div>
              )}
            </div>
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
