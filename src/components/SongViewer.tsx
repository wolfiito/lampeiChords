import React, { useState, useMemo } from 'react'
import {
  RotateCcw,
  ZoomIn,
  ZoomOut,
  Columns,
  Sparkles,
  ChevronDown,
  FileDown
} from 'lucide-react'
import type { Song, NotationSystem } from '../types/song'
import { parseChordPro } from '../music/chordPro'
import {
  transposeChord,
  convertNotation,
  CHROMATIC_SHARPS_ANGLO,
  CHROMATIC_SHARPS_LATIN,
  getDistanceBetweenKeys
} from '../music/musicTheory'
import { ChordDiagram } from './ChordDiagram'
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
}

export const SongViewer: React.FC<SongViewerProps> = ({
  song,
  onUpdateSong,
  onEdit,
  isPrintRequested = false,
  onClosePrint
}) => {
  const [semitoneShift, setSemitoneShift] = useState<number>(0)
  const [notation, setNotation] = useState<NotationSystem>('anglo')
  const [fontSize, setFontSize] = useState<number>(18)
  const [numColumns, setNumColumns] = useState<1 | 2>(1)
  const [stageMode, setStageMode] = useState<boolean>(false)
  const [activeChordModal, setActiveChordModal] = useState<string | null>(null)
  const [isCapoModalOpen, setIsCapoModalOpen] = useState<boolean>(false)
  const [showMetronome, setShowMetronome] = useState<boolean>(false)
  const [isLocalPrintOpen, setIsLocalPrintOpen] = useState<boolean>(false)

  const isPrintModalOpen = isLocalPrintOpen || isPrintRequested

  // Reset shift when song changes
  React.useEffect(() => {
    setSemitoneShift(0)
  }, [song.id])

  // Parse ChordPro text
  const parsed = useMemo(() => {
    return parseChordPro(song.content)
  }, [song.content])

  // Current key calculated with transposition
  const effectiveKey = useMemo(() => {
    const baseKey = song.currentKey || song.originalKey || 'C'
    return transposeChord(baseKey, semitoneShift, undefined, notation)
  }, [song.currentKey, song.originalKey, semitoneShift, notation])

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
    const newContent = song.content.replace(/\[([^\]]+)\]/g, (_match, chord) => {
      const transposed = transposeChord(chord, semitoneShift, undefined, notation)
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
                  {(notation === 'latin' ? CHROMATIC_SHARPS_LATIN : CHROMATIC_SHARPS_ANGLO).map(k => (
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

            {/* Notation switch */}
            <button
              onClick={() => setNotation(n => (n === 'anglo' ? 'latin' : 'anglo'))}
              title="Cambiar cifrado entre C D E y Do Re Mi"
              className="px-2.5 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-bold rounded-xl border border-zinc-700 transition shrink-0"
            >
              {notation === 'anglo' ? 'C D E' : 'Do Re Mi'}
            </button>
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
          {parsed.lines.map((line, idx) => {
            if (line.type === 'empty') {
              return <div key={idx} className="h-3 sm:h-4" />
            }

            if (line.type === 'comment') {
              return (
                <div
                  key={idx}
                  className="break-inside-avoid mt-4 mb-1.5 font-bold tracking-wide uppercase text-xs sm:text-sm border-l-4 border-emerald-400 pl-2.5 text-emerald-400 select-none"
                >
                  {line.comment}
                </div>
              )
            }

            if (line.type === 'directive') {
              return null
            }

            return (
              <div
                key={idx}
                className="break-inside-avoid flex flex-wrap items-end my-0.5 sm:my-1 font-mono tracking-wide max-w-full"
              >
                {line.segments?.map((seg, sIdx) => {
                  const rawChord = seg.chord
                  let chordDisplay = ''
                  if (rawChord) {
                    chordDisplay = transposeChord(rawChord, semitoneShift, undefined, notation)
                    chordDisplay = convertNotation(chordDisplay, notation)
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

                      <span className={`font-sans ${stageMode ? 'text-emerald-50' : 'text-zinc-100'}`}>
                        {seg.text || (chordDisplay ? ' ' : '')}
                      </span>
                    </span>
                  )
                })}
              </div>
            )
          })}
        </div>
      </div>

      {/* Interactive Chord Diagram Modal when user clicks any chord */}
      {activeChordModal && (
        <div
          onClick={() => setActiveChordModal(null)}
          className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/75 backdrop-blur-sm animate-in fade-in"
        >
          <div
            onClick={e => e.stopPropagation()}
            className="bg-zinc-900 border border-emerald-900/60 rounded-3xl p-5 sm:p-6 shadow-2xl flex flex-col items-center max-w-xs w-full text-center"
          >
            <h4 className="text-lg sm:text-xl font-black text-white mb-0.5">Digitación de Acorde</h4>
            <p className="text-xs text-emerald-400 mb-3 sm:mb-4">Guitarra Estándar (6 cuerdas)</p>

            <ChordDiagram chord={activeChordModal} width={170} height={200} showName={true} />

            <button
              onClick={() => setActiveChordModal(null)}
              className="mt-4 sm:mt-5 w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm rounded-xl transition"
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
