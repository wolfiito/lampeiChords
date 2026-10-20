import React, { useState, useMemo } from 'react'
import {
  RotateCcw,
  ZoomIn,
  ZoomOut,
  Columns,
  Sparkles,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  FileDown,
  ArrowLeft
} from 'lucide-react'
import type { Song, NotationSystem } from '../types/song'
import { parseChordPro, isSectionHeader } from '../music/chordPro'
import {
  transposeChord,
  CHROMATIC_SHARPS_ANGLO,
  CHROMATIC_SHARPS_LATIN,
  CHROMATIC_FLATS_ANGLO,
  CHROMATIC_FLATS_LATIN,
  getDistanceBetweenKeys
} from '../music/musicTheory'
import { ChordDiagram } from './ChordDiagram'
import { getAllGuitarChordFingerings } from '../music/guitarChords'
import { BassChordDiagram } from './BassChordDiagram'
import { CapoModal } from './CapoModal'
import { MetronomeBar } from './MetronomeBar'
import { PrintModal } from './PrintModal'
import { generateDirectSongPdf } from '../utils/pdfGenerator'

interface SongViewerProps {
  song: Song
  onUpdateSong: (updated: Partial<Song>) => void
  onEdit: () => void
  isPrintRequested?: boolean
  onClosePrint?: () => void
  onBackToLibrary?: () => void
  activeSectionIndex?: number
}

export const SongViewer: React.FC<SongViewerProps> = ({
  song,
  onUpdateSong,
  onEdit,
  isPrintRequested = false,
  onClosePrint,
  onBackToLibrary,
  activeSectionIndex = -1
}) => {
  const [semitoneShift, setSemitoneShift] = useState<number>(0)
  const [notation, setNotation] = useState<NotationSystem>('anglo')
  const [fontSize, setFontSize] = useState<number>(18)
  const [numColumns, setNumColumns] = useState<1 | 2>(1)
  const [stageMode, setStageMode] = useState<boolean>(false)
  const [activeChordModal, setActiveChordModal] = useState<string | null>(null)
  const [preferredInstrument, setPreferredInstrument] = useState<'guitar' | 'bass'>(() => {
    try {
      return (localStorage.getItem('chords_preferred_instrument') as 'guitar' | 'bass') || 'guitar'
    } catch {
      return 'guitar'
    }
  })
  const [guitarVarIndex, setGuitarVarIndex] = useState<number>(0)
  const [isCapoModalOpen, setIsCapoModalOpen] = useState<boolean>(false)
  const [showMetronome, setShowMetronome] = useState<boolean>(false)
  const [isLocalPrintOpen, setIsLocalPrintOpen] = useState<boolean>(false)

  // Reset guitar variation when modal chord changes
  React.useEffect(() => {
    setGuitarVarIndex(0)
  }, [activeChordModal])

  const guitarVariations = useMemo(() => {
    if (!activeChordModal) return []
    return getAllGuitarChordFingerings(activeChordModal)
  }, [activeChordModal])

  const currentGuitarVar = guitarVariations[guitarVarIndex] || guitarVariations[0]

  const isPrintModalOpen = isLocalPrintOpen || isPrintRequested

  // Reset shift when song changes
  React.useEffect(() => {
    setSemitoneShift(0)
  }, [song.id])

  // Parse ChordPro text
  const parsed = useMemo(() => {
    return parseChordPro(song.content)
  }, [song.content])

  // User preference: sharps (#) vs flats (b)
  const [accidental, setAccidental] = useState<'sharp' | 'flat'>(() => {
    const baseKey = song.currentKey || song.originalKey || 'C'
    return baseKey.includes('b') || ['F', 'Bb', 'Eb', 'Ab', 'Db', 'Gb'].includes(baseKey)
      ? 'flat'
      : 'sharp'
  })

  // Current key calculated with transposition
  const effectiveKey = useMemo(() => {
    const baseKey = song.currentKey || song.originalKey || 'C'
    return transposeChord(baseKey, semitoneShift, accidental === 'flat', notation)
  }, [song.currentKey, song.originalKey, semitoneShift, accidental, notation])

  const keyOptions = useMemo(() => {
    if (notation === 'latin') {
      return accidental === 'flat' ? CHROMATIC_FLATS_LATIN : CHROMATIC_SHARPS_LATIN
    }
    return accidental === 'flat' ? CHROMATIC_FLATS_ANGLO : CHROMATIC_SHARPS_ANGLO
  }, [notation, accidental])

  const handleKeySelect = (targetKey: string) => {
    const baseKey = song.currentKey || song.originalKey || 'C'
    const diff = getDistanceBetweenKeys(baseKey, targetKey)
    setSemitoneShift(diff)
  }

  const handleShift = (delta: number) => {
    const next = semitoneShift + delta
    setSemitoneShift(next)
  }

  const handleSaveTransposed = () => {
    if (semitoneShift === 0) return
    const newContent = song.content.replace(/\[([^\]]+)\]/g, (match, chord) => {
      if (isSectionHeader(chord)) return match
      const transposed = transposeChord(chord, semitoneShift, accidental === 'flat', notation)
      return `[${transposed}]`
    })
    onUpdateSong({
      currentKey: effectiveKey,
      content: newContent
    })
    setSemitoneShift(0)
  }

  // Instant Native Vector PDF Download (Guaranteed 1 Page, NEVER freezes!)
  const handleExportDirectPdf = async (opts: { columns: 1 | 2 | 3; size: 'compact' | 'normal' | 'large' }) => {
    // Generate immediately using jsPDF native engine
    generateDirectSongPdf({
      parsed,
      effectiveKey,
      capo: song.capo || 0,
      tempo: song.tempo,
      semitoneShift,
      notation,
      preferFlats: accidental === 'flat',
      columns: opts.columns,
      size: opts.size,
      filename: `${song.title} - chordsLampei`
    })
  }

  // Browser Print Dialog
  const handleBrowserPrint = () => {
    setTimeout(() => {
      window.print()
    }, 50)
  }

  return (
    <div className={`w-full min-h-screen transition-colors duration-300 overflow-x-hidden ${
      stageMode ? 'bg-[#050907] text-emerald-100' : 'bg-zinc-950 text-zinc-100'
    }`}>
      {/* 
        RESPONSIVE STICKY TOOLBAR:
        Clean, two-row mobile-friendly layout with horizontal touch scrolling
      */}
      <div className="no-print sticky top-14 sm:top-16 z-30 bg-zinc-900/95 backdrop-blur-md border-b border-zinc-800 shadow-md px-3 sm:px-4 py-2.5">
        <div className="max-w-6xl mx-auto flex flex-col gap-2">
          {/* Row 1: Tonalidad y Transposición */}
          <div className="flex items-center justify-between gap-2 overflow-x-auto scrollbar-none pb-0.5">
            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
              {onBackToLibrary && (
                <button
                  onClick={onBackToLibrary}
                  title="Volver al Repertorio"
                  className="px-2 py-1 text-xs font-bold text-zinc-300 hover:text-white bg-zinc-800 hover:bg-zinc-700 rounded-xl border border-zinc-700 flex items-center gap-1 transition shrink-0"
                >
                  <ArrowLeft className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="hidden sm:inline">Repertorio</span>
                </button>
              )}

              <span className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-emerald-400">
                Tono:
              </span>

              {/* Minus buttons */}
              <div className="flex items-center rounded-xl bg-zinc-800 border border-zinc-700 p-0.5">
                <button
                  onClick={() => handleShift(-1)}
                  title="Bajar 1 semitono (-1)"
                  className="px-2 py-1 text-xs sm:text-sm font-bold text-zinc-200 hover:text-emerald-400 hover:bg-zinc-700/60 rounded-lg transition"
                >
                  -1
                </button>
                <div className="w-px h-3.5 bg-zinc-700 mx-0.5" />
                <button
                  onClick={() => handleShift(-2)}
                  title="Bajar 1 tono (-2)"
                  className="px-1.5 py-1 text-[11px] font-semibold text-zinc-400 hover:text-emerald-400 hover:bg-zinc-700/60 rounded-lg transition"
                >
                  -2
                </button>
              </div>

              {/* Key Selector Dropdown */}
              <div className="relative inline-block">
                <select
                  value={effectiveKey}
                  onChange={e => handleKeySelect(e.target.value)}
                  className="appearance-none bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs sm:text-sm px-2.5 sm:px-3 py-1 sm:py-1.5 pr-7 rounded-xl shadow-md border border-emerald-400 cursor-pointer focus:outline-none"
                >
                  {keyOptions.map(k => (
                    <option key={k} value={k} className="bg-zinc-900 text-white">
                      {k}
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-white/80 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>

              {/* Plus buttons */}
              <div className="flex items-center rounded-xl bg-zinc-800 border border-zinc-700 p-0.5">
                <button
                  onClick={() => handleShift(1)}
                  title="Subir 1 semitono (+1)"
                  className="px-2 py-1 text-xs sm:text-sm font-bold text-zinc-200 hover:text-emerald-400 hover:bg-zinc-700/60 rounded-lg transition"
                >
                  +1
                </button>
                <div className="w-px h-3.5 bg-zinc-700 mx-0.5" />
                <button
                  onClick={() => handleShift(2)}
                  title="Subir 1 tono (+2)"
                  className="px-1.5 py-1 text-[11px] font-semibold text-zinc-400 hover:text-emerald-400 hover:bg-zinc-700/60 rounded-lg transition"
                >
                  +2
                </button>
              </div>

              {/* Semitone shift indicator & Reset */}
              {semitoneShift !== 0 && (
                <div className="flex items-center gap-1">
                  <span className="text-[10px] sm:text-xs font-mono font-bold px-1.5 py-0.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 rounded-lg">
                    {semitoneShift > 0 ? `+${semitoneShift}` : semitoneShift}
                  </span>
                  <button
                    onClick={() => setSemitoneShift(0)}
                    title="Restablecer al tono original"
                    className="p-1 text-zinc-400 hover:text-white bg-zinc-800 rounded-lg transition"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={handleSaveTransposed}
                    title="Fijar este tono permanentemente"
                    className="text-[10px] sm:text-xs bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-2 py-0.5 rounded-lg transition"
                  >
                    Fijar
                  </button>
                </div>
              )}
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              {/* Notation switch */}
              <button
                onClick={() => setNotation(n => (n === 'anglo' ? 'latin' : 'anglo'))}
                title="Cambiar cifrado entre C D E y Do Re Mi"
                className="px-2.5 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-bold rounded-xl border border-zinc-700 transition"
              >
                {notation === 'anglo' ? 'C D E' : 'Do Re Mi'}
              </button>

              {/* Accidental switch: ♯ / ♭ */}
              <button
                onClick={() => setAccidental(a => (a === 'sharp' ? 'flat' : 'sharp'))}
                title="Alternar entre sostenidos (#) y bemoles (♭)"
                className="px-2.5 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-bold rounded-xl border border-zinc-700 transition flex items-center gap-1"
              >
                <span className={accidental === 'sharp' ? 'text-emerald-400 font-black' : 'text-zinc-500'}>♯</span>
                <span className="text-zinc-600">/</span>
                <span className={accidental === 'flat' ? 'text-emerald-400 font-black' : 'text-zinc-500'}>♭</span>
              </button>
            </div>
          </div>

          {/* Row 2: Herramientas secundarias (Guardar PDF, Cejilla, Metrónomo, Zoom, Columnas) */}
          <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto scrollbar-none pb-0.5">
            {/* Quick Export 1 Page PDF */}
            <button
              onClick={() => setIsLocalPrintOpen(true)}
              className="px-3 py-1 text-xs font-bold rounded-xl border bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-500 transition flex items-center gap-1.5 shadow-md shadow-emerald-600/20 shrink-0"
              title="Descargar canción en PDF ajustada a 1 página"
            >
              <FileDown className="w-3.5 h-3.5" />
              <span>Guardar PDF (1 Hoja)</span>
            </button>

            {/* Capo Button */}
            <button
              onClick={() => setIsCapoModalOpen(true)}
              className={`px-2.5 py-1 text-xs font-bold rounded-xl border transition flex items-center gap-1 shrink-0 ${
                song.capo > 0
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/50'
                  : 'bg-zinc-800 text-zinc-300 border-zinc-700 hover:text-white'
              }`}
            >
              <span>🎸 Capo:</span>
              <span className="text-white font-black">{song.capo > 0 ? song.capo : '0'}</span>
            </button>

            {/* Metronome toggle */}
            <button
              onClick={() => setShowMetronome(m => !m)}
              className={`px-2.5 py-1 text-xs font-bold rounded-xl border transition flex items-center gap-1 shrink-0 ${
                showMetronome
                  ? 'bg-emerald-600 border-emerald-400 text-white'
                  : 'bg-zinc-800 text-zinc-300 border-zinc-700 hover:text-white'
              }`}
            >
              ⏱️ {song.tempo ? `${song.tempo} BPM` : 'Tempo'}
            </button>

            {/* Font size adjustments */}
            <div className="flex items-center bg-zinc-800 border border-zinc-700 rounded-xl p-0.5 shrink-0">
              <button
                onClick={() => setFontSize(s => Math.max(13, s - 1))}
                title="Reducir letra"
                className="p-1 text-zinc-300 hover:text-white rounded-lg transition"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <span className="text-[11px] font-mono font-bold px-1 text-zinc-400">
                {fontSize}
              </span>
              <button
                onClick={() => setFontSize(s => Math.min(28, s + 1))}
                title="Aumentar letra"
                className="p-1 text-zinc-300 hover:text-white rounded-lg transition"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* 1 / 2 Column Toggle */}
            <button
              onClick={() => setNumColumns(c => (c === 1 ? 2 : 1))}
              title="Alternar 1 o 2 columnas en pantalla"
              className={`p-1.5 rounded-xl border transition shrink-0 ${
                numColumns === 2
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50'
                  : 'bg-zinc-800 text-zinc-300 border-zinc-700 hover:text-white'
              }`}
            >
              <Columns className="w-3.5 h-3.5" />
            </button>

            {/* Stage Mode */}
            <button
              onClick={() => setStageMode(m => !m)}
              title="Modo Escenario"
              className={`p-1.5 rounded-xl border transition shrink-0 ${
                stageMode
                  ? 'bg-lime-400 text-zinc-950 border-lime-300 shadow-lg shadow-lime-400/20'
                  : 'bg-zinc-800 text-zinc-300 border-zinc-700 hover:text-white'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Collapsible Metronome Drawer */}
        {showMetronome && (
          <div className="max-w-4xl mx-auto mt-2.5 pt-2.5 border-t border-zinc-800">
            <MetronomeBar
              initialBpm={song.tempo || 100}
              onBpmChange={newBpm => onUpdateSong({ tempo: newBpm })}
            />
          </div>
        )}
      </div>

      {/* Main Screen Song Sheet Display */}
      <div className="max-w-5xl mx-auto px-3 sm:px-6 py-5 sm:py-8 pb-32">
        {/* Screen Song Header */}
        <div className="mb-6 sm:mb-8 pb-3 sm:pb-4 border-b border-zinc-800 flex flex-wrap items-end justify-between gap-3">
          <div className="min-w-0 max-w-full">
            <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-white mb-1 truncate">
              {parsed.title || song.title}
            </h1>
            <p className="text-sm sm:text-base text-emerald-400/80 font-medium truncate">
              {parsed.artist || song.artist}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl px-2.5 py-1 flex items-center gap-1.5 text-xs">
              <span className="text-zinc-400 uppercase font-semibold">Tono:</span>
              <span className="font-black text-emerald-400">{effectiveKey}</span>
            </div>

            {song.capo > 0 && (
              <div className="bg-zinc-900 border border-amber-500/30 rounded-xl px-2.5 py-1 flex items-center gap-1.5 text-xs">
                <span className="text-amber-400 uppercase font-semibold">Capo:</span>
                <span className="font-black text-amber-300">{song.capo}</span>
              </div>
            )}

            {song.tempo && (
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl px-2.5 py-1 flex items-center gap-1.5 text-xs">
                <span className="text-zinc-400 uppercase font-semibold">BPM:</span>
                <span className="font-black text-emerald-300">{song.tempo}</span>
              </div>
            )}

            <button
              onClick={onEdit}
              className="px-3 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-bold rounded-xl border border-zinc-700 transition"
            >
              Editar
            </button>
          </div>
        </div>

        {/* Screen Lyrics & Chords Body */}
        <div
          className={`transition-all duration-150 leading-relaxed ${
            numColumns === 2 ? 'md:columns-2 gap-8 sm:gap-10' : 'columns-1'
          }`}
          style={{ fontSize: `${fontSize}px` }}
        >
          {(() => {
            let sectionCount = 0
            return parsed.lines.map((line, idx) => {
              if (line.type === 'empty') {
                return <div key={idx} className="h-3 sm:h-4" />
              }

              if (line.type === 'comment') {
                const sIdx = sectionCount++
                const isActive = activeSectionIndex === sIdx
                return (
                  <div
                    key={idx}
                    id={`song-section-${sIdx}`}
                    data-section-index={sIdx}
                    className={`break-inside-avoid mt-5 mb-2 font-bold tracking-wide uppercase text-xs sm:text-sm pl-2.5 select-none transition-all duration-300 ${
                      isActive
                        ? 'border-l-4 border-emerald-400 bg-emerald-500/15 py-1.5 pr-3 rounded-r-xl text-emerald-300 font-black shadow-[0_0_20px_rgba(16,185,129,0.3)] ring-1 ring-emerald-500/30'
                        : 'border-l-4 border-emerald-400 text-emerald-400'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <span className="flex items-center gap-2">
                        {isActive && <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping inline-block" />}
                        <span>{line.comment}</span>
                      </span>
                      {line.sectionDuration ? (
                        <span
                          className={`text-[11px] font-mono font-bold px-2 py-0.5 rounded-full border transition flex items-center gap-1 ${
                            isActive
                              ? 'bg-emerald-500/25 text-emerald-300 border-emerald-400/60 shadow-sm'
                              : 'bg-zinc-800/80 text-zinc-400 border-zinc-700/80'
                          }`}
                        >
                          ⏱ {line.sectionDuration}s
                        </span>
                      ) : null}
                    </div>
                  </div>
                )
              }

            if (line.type === 'directive') {
              return null
            }

            const hasAnyChords = line.segments?.some(s => !!s.chord)
            const hasLyrics = line.segments?.some(s => (s.text || '').trim().length > 0)
            const isChordOnlyLine = hasAnyChords && !hasLyrics

            return (
              <div
                key={idx}
                className={`break-inside-avoid flex flex-wrap items-end my-0.5 sm:my-1 font-mono tracking-wide max-w-full ${
                  isChordOnlyLine ? 'gap-3 sm:gap-4 py-0.5' : ''
                }`}
              >
                {line.segments?.map((seg, sIdx) => {
                  const rawChord = seg.chord
                  let chordDisplay = ''
                  if (rawChord) {
                    chordDisplay = transposeChord(rawChord, semitoneShift, accidental === 'flat', notation)
                  }

                  return (
                    <span
                      key={sIdx}
                      className="inline-flex flex-col items-start mr-0 leading-none whitespace-pre-wrap break-words relative group"
                    >
                      {chordDisplay ? (
                        <button
                          type="button"
                          onClick={() => setActiveChordModal(chordDisplay)}
                          title={`Ver digitación de ${chordDisplay}`}
                          className={`font-sans font-black text-xs sm:text-sm px-1 py-0.5 rounded cursor-pointer transition select-none ${
                            stageMode
                              ? 'text-lime-300 hover:bg-lime-400/20'
                              : 'text-emerald-400 hover:bg-emerald-500/20 hover:text-emerald-300'
                          }`}
                        >
                          {chordDisplay}
                        </button>
                      ) : (
                        <span className="h-3.5 select-none opacity-0 text-xs">.</span>
                      )}

                      <span className={`font-sans whitespace-pre ${stageMode ? 'text-emerald-50' : 'text-zinc-100'}`}>
                        {seg.text || (chordDisplay ? ' ' : '')}
                      </span>
                    </span>
                  )
                })}
              </div>
            )
          })})()}
        </div>
      </div>

      {/* Interactive Chord Diagram Modal when user clicks any chord */}
      {activeChordModal && (
        <div
          onClick={() => setActiveChordModal(null)}
          className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/80 backdrop-blur-sm animate-in fade-in"
        >
          <div
            onClick={e => e.stopPropagation()}
            className="bg-zinc-900 border border-emerald-900/60 rounded-3xl p-4 sm:p-5 shadow-2xl flex flex-col items-center max-w-sm w-full text-center max-h-[92vh] overflow-y-auto scrollbar-none"
          >
            {/* Header: Chord Name + Instrument Selector Tabs */}
            <div className="flex items-center justify-between w-full mb-3 pb-2 border-b border-zinc-800">
              <div className="text-left">
                <span className="text-lg sm:text-xl font-black text-white block leading-tight">
                  {activeChordModal}
                </span>
                <span className="text-[11px] text-emerald-400 font-semibold">
                  {preferredInstrument === 'guitar' ? 'Guitarra (6 cuerdas)' : 'Bajo Eléctrico'}
                </span>
              </div>

              {/* Instrument Toggle */}
              <div className="flex items-center bg-zinc-800 p-0.5 rounded-xl border border-zinc-700">
                <button
                  type="button"
                  onClick={() => {
                    setPreferredInstrument('guitar')
                    try { localStorage.setItem('chords_preferred_instrument', 'guitar') } catch {}
                  }}
                  className={`px-2.5 py-1 text-xs font-bold rounded-lg transition ${
                    preferredInstrument === 'guitar'
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  🎸 Guitarra
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPreferredInstrument('bass')
                    try { localStorage.setItem('chords_preferred_instrument', 'bass') } catch {}
                  }}
                  className={`px-2.5 py-1 text-xs font-bold rounded-lg transition ${
                    preferredInstrument === 'bass'
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  🎸 Bajo
                </button>
              </div>
            </div>

            {/* Instrument Diagram Content */}
            {preferredInstrument === 'guitar' ? (
              <div className="flex flex-col items-center py-1 w-full">
                {/* Variations Carousel for Guitar */}
                {guitarVariations.length > 1 && (
                  <div className="flex items-center justify-between w-full bg-zinc-800/90 px-2.5 py-1.5 rounded-xl border border-zinc-700/80 mb-2.5 text-xs shadow-sm">
                    <button
                      type="button"
                      onClick={() => setGuitarVarIndex(i => Math.max(0, i - 1))}
                      disabled={guitarVarIndex === 0}
                      className="p-1 text-zinc-300 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed rounded-lg hover:bg-zinc-700 transition"
                      title="Posición anterior"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>

                    <div className="text-center px-1">
                      <span className="font-bold text-white text-xs block leading-tight">
                        {currentGuitarVar?.label || 'Posición Estándar'}
                      </span>
                      <span className="text-[10px] text-emerald-400 font-medium">
                        {currentGuitarVar?.description || ''} · ({guitarVarIndex + 1} de {guitarVariations.length})
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => setGuitarVarIndex(i => Math.min(guitarVariations.length - 1, i + 1))}
                      disabled={guitarVarIndex === guitarVariations.length - 1}
                      className="p-1 text-zinc-300 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed rounded-lg hover:bg-zinc-700 transition"
                      title="Siguiente posición"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                )}

                <ChordDiagram
                  chord={activeChordModal}
                  fingering={currentGuitarVar?.fingering}
                  width={180}
                  height={210}
                  showName={false}
                />

                {currentGuitarVar && (
                  <div className="mt-2.5 text-center">
                    <span className="text-xs font-bold px-2.5 py-0.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                      {currentGuitarVar.fretRange}
                    </span>
                  </div>
                )}
              </div>
            ) : (
              <div className="w-full flex flex-col items-center">
                <BassChordDiagram
                  chord={activeChordModal}
                  notation={notation}
                  preferFlats={accidental === 'flat'}
                />
              </div>
            )}

            <button
              onClick={() => setActiveChordModal(null)}
              className="mt-3.5 w-full py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-bold text-xs sm:text-sm rounded-xl border border-zinc-700 transition"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}

      {/* Capo Assistant Modal */}
      <CapoModal
        isOpen={isCapoModalOpen}
        onClose={() => setIsCapoModalOpen(false)}
        currentKey={effectiveKey}
        currentCapo={song.capo || 0}
        notation={notation}
        onApplyCapo={fret => onUpdateSong({ capo: fret })}
      />

      {/* PDF Export / Print Modal */}
      <PrintModal
        isOpen={isPrintModalOpen}
        onClose={() => {
          setIsLocalPrintOpen(false)
          onClosePrint?.()
        }}
        onExportPdf={handleExportDirectPdf}
        onPrintBrowser={handleBrowserPrint}
        songTitle={song.title}
      />
    </div>
  )
}
