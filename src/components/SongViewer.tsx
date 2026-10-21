import React, { useState, useMemo, useEffect } from 'react'
import {
  RotateCcw,
  ZoomIn,
  ZoomOut,
  Columns,
  Sparkles,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Menu,
  X,
  FileDown,
  Edit3,
  Maximize,
  Minimize,
  Sliders,
  BookOpen
} from 'lucide-react'
import type { Song, NotationSystem, ParsedLine } from '../types/song'
import { parseChordPro } from '../music/chordPro'
import { calculateSongTiming, type SectionTiming } from '../music/songTiming'
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
  onEdit?: () => void
  isPrintRequested?: boolean
  onClosePrint?: () => void
  onBackToLibrary?: () => void
  onOpenLibrary?: () => void
  activeSectionIndex?: number
}

interface SectionBlock {
  sectionIndex: number
  headerLine?: ParsedLine
  lines: ParsedLine[]
  isRepeat?: boolean
  timing?: SectionTiming
}

export const SongViewer: React.FC<SongViewerProps> = ({
  song,
  onUpdateSong,
  onEdit,
  isPrintRequested = false,
  onClosePrint,
  onBackToLibrary,
  onOpenLibrary,
  activeSectionIndex = -1
}) => {
  // Individual local capo for this user/device (stored locally per song)
  const [localCapo, setLocalCapo] = useState<number>(() => {
    try {
      const saved = localStorage.getItem(`chords_user_capo_${song.id}`)
      if (saved !== null) return Number(saved)
    } catch {}
    return song.capo || 0
  })

  // Individual local semitone shift for this user/device (stored locally per song)
  const [semitoneShift, setSemitoneShift] = useState<number>(() => {
    try {
      const saved = localStorage.getItem(`chords_user_shift_${song.id}`)
      if (saved !== null) return Number(saved)
    } catch {}
    return 0
  })

  const [notation, setNotation] = useState<NotationSystem>('anglo')
  const [fontSize, setFontSize] = useState<number>(18)
  const [numColumns, setNumColumns] = useState<1 | 2>(() => {
    if (typeof window !== 'undefined' && window.innerWidth >= 768) {
      return 2
    }
    return 1
  })
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
  const [isMenuOpen, setIsMenuOpen] = useState<boolean>(false)
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false)

  // Fullscreen event listener
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement)
    }
    document.addEventListener('fullscreenchange', handleFullscreenChange)
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange)
  }, [])

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {})
    } else {
      document.exitFullscreen().catch(() => {})
    }
  }

  // Reset guitar variation when modal chord changes
  useEffect(() => {
    setGuitarVarIndex(0)
  }, [activeChordModal])

  const guitarVariations = useMemo(() => {
    if (!activeChordModal) return []
    return getAllGuitarChordFingerings(activeChordModal)
  }, [activeChordModal])

  const currentGuitarVar = guitarVariations[guitarVarIndex] || guitarVariations[0]

  const isPrintModalOpen = isLocalPrintOpen || isPrintRequested

  // Sync individual preferences when song changes
  useEffect(() => {
    try {
      const savedCapo = localStorage.getItem(`chords_user_capo_${song.id}`)
      setLocalCapo(savedCapo !== null ? Number(savedCapo) : (song.capo || 0))
    } catch {
      setLocalCapo(song.capo || 0)
    }

    try {
      const savedShift = localStorage.getItem(`chords_user_shift_${song.id}`)
      setSemitoneShift(savedShift !== null ? Number(savedShift) : 0)
    } catch {
      setSemitoneShift(0)
    }
  }, [song.id, song.capo])

  const handleApplyCapo = (fret: number) => {
    setLocalCapo(fret)
    try {
      localStorage.setItem(`chords_user_capo_${song.id}`, String(fret))
    } catch {}
  }

  // Parse ChordPro text
  const parsed = useMemo(() => {
    return parseChordPro(song.content)
  }, [song.content])

  // Musical timing and repeat linkages
  const timingData = useMemo(() => {
    return calculateSongTiming(song.content, song.tempo, song.timeSignature)
  }, [song.content, song.tempo, song.timeSignature])

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
    try {
      localStorage.setItem(`chords_user_shift_${song.id}`, String(diff))
    } catch {}
  }

  const handleShift = (delta: number) => {
    const next = semitoneShift + delta
    setSemitoneShift(next)
    try {
      localStorage.setItem(`chords_user_shift_${song.id}`, String(next))
    } catch {}
  }

  const handleResetShift = () => {
    setSemitoneShift(0)
    try {
      localStorage.removeItem(`chords_user_shift_${song.id}`)
    } catch {}
  }

  // Instant Native Vector PDF Download
  const handleExportDirectPdf = async (opts: { columns: 1 | 2; size?: 'normal' }) => {
    generateDirectSongPdf({
      parsed,
      effectiveKey,
      capo: localCapo,
      tempo: song.tempo,
      semitoneShift,
      notation,
      preferFlats: accidental === 'flat',
      columns: opts.columns,
      size: 'normal',
      filename: `${song.title} - chordsLampei`
    })
  }

  // Browser Print Dialog
  const handleBrowserPrint = () => {
    setTimeout(() => {
      window.print()
    }, 50)
  }

  // Parse lines into logical section blocks
  const sectionBlocks = useMemo(() => {
    const blocks: SectionBlock[] = []
    let currentBlock: SectionBlock = {
      sectionIndex: -1,
      lines: []
    }
    let sectionCount = 0

    for (const line of parsed.lines) {
      if (line.type === 'directive') {
        continue
      }

      if (line.type === 'comment') {
        if (currentBlock.lines.length > 0 || currentBlock.headerLine) {
          blocks.push(currentBlock)
        }
        const sIdx = sectionCount++
        const secTiming = timingData.sections[sIdx]
        currentBlock = {
          sectionIndex: sIdx,
          headerLine: line,
          lines: [],
          isRepeat: secTiming?.isRepeat,
          timing: secTiming
        }
        continue
      }

      currentBlock.lines.push(line)
    }

    if (currentBlock.lines.length > 0 || currentBlock.headerLine) {
      blocks.push(currentBlock)
    }

    return blocks
  }, [parsed.lines, timingData.sections])

  // Partition section blocks into Left and Right columns when numColumns === 2
  const { leftBlocks, rightBlocks } = useMemo(() => {
    if (numColumns === 1) {
      return { leftBlocks: sectionBlocks, rightBlocks: [] }
    }

    // Single section with many lines: split lines between columns
    if (sectionBlocks.length === 1 && sectionBlocks[0].lines.length > 6) {
      const mid = Math.ceil(sectionBlocks[0].lines.length / 2)
      return {
        leftBlocks: [{ ...sectionBlocks[0], lines: sectionBlocks[0].lines.slice(0, mid) }],
        rightBlocks: [{ sectionIndex: -2, lines: sectionBlocks[0].lines.slice(mid) }]
      }
    }

    if (sectionBlocks.length <= 1) {
      return { leftBlocks: sectionBlocks, rightBlocks: [] }
    }

    // Weight blocks by lines to ensure a balanced 50/50 partition
    const blockWeights = sectionBlocks.map(b => {
      const lineWeight = b.lines.reduce((acc, l) => acc + (l.type === 'empty' ? 0.5 : 1), 0)
      return (b.headerLine ? 2 : 0) + lineWeight
    })

    const totalWeight = blockWeights.reduce((a, b) => a + b, 0)
    const targetHalf = totalWeight / 2

    let accumulated = 0
    let splitIdx = 1

    for (let i = 0; i < sectionBlocks.length - 1; i++) {
      accumulated += blockWeights[i]
      if (accumulated >= targetHalf) {
        const diffBefore = Math.abs(accumulated - blockWeights[i] - targetHalf)
        const diffAfter = Math.abs(accumulated - targetHalf)
        splitIdx = diffAfter <= diffBefore ? i + 1 : Math.max(1, i)
        break
      }
    }

    return {
      leftBlocks: sectionBlocks.slice(0, splitIdx),
      rightBlocks: sectionBlocks.slice(splitIdx)
    }
  }, [sectionBlocks, numColumns])

  // Render a section block with its header and lines
  const renderSectionBlock = (block: SectionBlock, bIdx: number) => {
    const sIdx = block.sectionIndex
    const secTiming = block.timing
    const currentActiveSec = activeSectionIndex >= 0 ? timingData.sections[activeSectionIndex] : null
    const isCurrentSec = sIdx >= 0 && activeSectionIndex === sIdx
    const isTargetOfActive = sIdx >= 0 && currentActiveSec?.targetSectionIndex === sIdx
    const isActive = isCurrentSec || isTargetOfActive

    if (block.isRepeat) {
      /* Repeat Section Banner (e.g. [Coro] repeating previous chorus) */
      return (
        <div
          key={`sec-block-${bIdx}-${sIdx}`}
          id={`song-section-${sIdx}`}
          data-section-index={sIdx}
          onClick={() => {
            const targetIdx = secTiming?.targetSectionIndex ?? sIdx
            const elem = document.getElementById(`song-section-${targetIdx}`)
            if (elem) elem.scrollIntoView({ behavior: 'smooth', block: 'center' })
          }}
          className={`my-2 sm:my-2.5 font-bold tracking-wide text-xs sm:text-sm pl-3 sm:pl-3.5 pr-2 py-1.5 select-none transition-colors duration-200 cursor-pointer ${
            isActive
              ? 'border-l-4 border-emerald-400 bg-gradient-to-r from-emerald-500/[0.15] via-emerald-500/[0.04] to-transparent text-emerald-300'
              : 'border-l-4 border-transparent text-zinc-400 hover:text-zinc-200'
          }`}
          title={`Repite ${secTiming?.parentTitle || 'sección anterior'} (clic para ver acordes)`}
        >
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="text-emerald-400 font-extrabold text-xs">⤴</span>
              <span className="uppercase font-black text-white">{block.headerLine?.comment}</span>
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                isActive ? 'text-emerald-300 bg-emerald-500/20' : 'text-zinc-500 bg-zinc-800/40'
              }`}>
                Repite {secTiming?.parentTitle || 'sección anterior'}
              </span>
              {isCurrentSec && (
                <span className="text-[10px] text-amber-300 font-bold animate-pulse flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 inline-block" />
                  En pantalla arriba ↑
                </span>
              )}
            </div>
            {secTiming?.durationSec ? (
              <span className={`text-[11px] font-mono font-bold px-2 py-0.5 rounded-full ${
                isActive ? 'text-emerald-300 bg-emerald-500/25' : 'text-zinc-500'
              }`}>
                ⏱ {secTiming.durationSec}s
              </span>
            ) : null}
          </div>
        </div>
      )
    }

    /* Regular Section Block: Strictly left bar + fondito when active; totally invisible/clean when inactive */
    return (
      <div
        key={`sec-block-${bIdx}-${sIdx}`}
        id={`song-section-${sIdx}`}
        data-section-index={sIdx}
        className={`my-2.5 sm:my-3 transition-colors duration-200 pl-3 sm:pl-3.5 pr-2 py-1.5 ${
          isActive
            ? 'border-l-4 border-emerald-400 bg-gradient-to-r from-emerald-500/[0.14] via-emerald-500/[0.04] to-transparent'
            : 'border-l-4 border-transparent'
        }`}
      >
        {/* Section Header */}
        {block.headerLine && (
          <div className="flex items-center justify-between gap-2 flex-wrap mb-1.5">
            <span className="flex items-center gap-2">
              {isActive ? (
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping inline-block shrink-0" />
              ) : (
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500/60 inline-block shrink-0" />
              )}
              <span className={`uppercase font-black tracking-wide text-xs sm:text-sm ${
                isActive ? 'text-emerald-300' : 'text-emerald-400/90'
              }`}>
                {block.headerLine.comment}
              </span>
              {isTargetOfActive && !isCurrentSec && (
                <span className="text-[10px] text-amber-300 font-bold animate-pulse flex items-center gap-1 bg-amber-500/10 px-2 py-0.5 rounded-full">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 inline-block" />
                  Repitiendo arriba
                </span>
              )}
            </span>
            {secTiming?.durationSec ? (
              <span
                className={`text-[11px] font-mono font-bold px-2 py-0.5 rounded-full transition flex items-center gap-1 ${
                  isActive
                    ? 'bg-emerald-500/25 text-emerald-300'
                    : 'text-zinc-500'
                }`}
              >
                ⏱ {secTiming.durationSec}s
              </span>
            ) : null}
          </div>
        )}

        {/* Lines inside this section */}
        {block.lines.map((line, lIdx) => {
          if (line.type === 'empty') {
            return <div key={lIdx} className="h-2.5 sm:h-3" />
          }

          const hasAnyChords = line.segments?.some(s => !!s.chord)
          const hasLyrics = line.segments?.some(s => (s.text || '').trim().length > 0)
          const isChordOnlyLine = hasAnyChords && !hasLyrics

          return (
            <div
              key={lIdx}
              className={`flex flex-wrap items-end my-0.5 sm:my-1 font-mono tracking-wide max-w-full ${
                isChordOnlyLine ? 'gap-3 sm:gap-4 py-0.5' : ''
              }`}
            >
              {line.segments?.map((seg, sSubIdx) => {
                const rawChord = seg.chord
                let chordDisplay = ''
                if (rawChord) {
                  chordDisplay = transposeChord(rawChord, semitoneShift, accidental === 'flat', notation)
                }

                return (
                  <span
                    key={sSubIdx}
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
        })}
      </div>
    )
  }

  return (
    <div
      className={`w-full min-h-screen transition-colors duration-300 overflow-x-hidden ${
        stageMode ? 'bg-[#050907] text-emerald-100' : 'bg-zinc-950 text-zinc-100'
      }`}
    >
      {/* 
        SINGLE UNIFIED TOP BAR (Ultra-clean, single header row)
      */}
      <header className="no-print sticky top-0 z-40 bg-zinc-900/95 backdrop-blur-md border-b border-zinc-800 text-zinc-100 shadow-md">
        <div className="max-w-6xl mx-auto px-3 sm:px-4 h-14 sm:h-16 flex items-center justify-between gap-2 sm:gap-4">
          {/* Left: Brand Logo & Transposition Controls */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {onBackToLibrary && (
              <button
                onClick={onBackToLibrary}
                className="cursor-pointer hover:opacity-90 transition-opacity flex items-center"
                title="Volver a Canciones"
              >
                <img
                  src="/logo.png"
                  alt="Logo Lampei"
                  className="h-8 sm:h-9 w-auto object-contain shrink-0 drop-shadow-[0_2px_10px_rgba(16,185,129,0.4)] transition-transform hover:scale-105"
                />
              </button>
            )}

            {/* Transposition Pill */}
            <div className="flex items-center gap-1 sm:gap-1.5 bg-zinc-800/90 p-1 rounded-xl border border-zinc-700/80">
              <button
                onClick={() => handleShift(-1)}
                title="Bajar 1 semitono (-1)"
                className="px-2 py-0.5 sm:py-1 bg-zinc-700/80 hover:bg-zinc-600 text-zinc-200 hover:text-emerald-400 font-bold text-xs rounded-lg transition"
              >
                -1
              </button>

              <div className="relative inline-block">
                <select
                  value={effectiveKey}
                  onChange={e => handleKeySelect(e.target.value)}
                  className="appearance-none bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs sm:text-sm px-2 sm:px-2.5 py-0.5 sm:py-1 pr-5 rounded-lg shadow cursor-pointer focus:outline-none"
                >
                  {keyOptions.map(k => (
                    <option key={k} value={k} className="bg-zinc-900 text-white">
                      {k}
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-3 h-3 text-white/90 absolute right-1 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>

              <button
                onClick={() => handleShift(1)}
                title="Subir 1 semitono (+1)"
                className="px-2 py-0.5 sm:py-1 bg-zinc-700/80 hover:bg-zinc-600 text-zinc-200 hover:text-emerald-400 font-bold text-xs rounded-lg transition"
              >
                +1
              </button>

              {semitoneShift !== 0 && (
                <div className="flex items-center gap-1 pl-1">
                  <span
                    className="text-[10px] font-mono font-bold px-1.5 py-0.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 rounded"
                    title="Transporte individual (solo en tu pantalla)"
                  >
                    {semitoneShift > 0 ? `+${semitoneShift}` : semitoneShift}
                  </span>
                  <button
                    onClick={handleResetShift}
                    title="Restablecer al tono original"
                    className="p-1 text-zinc-400 hover:text-white bg-zinc-700/80 rounded transition flex items-center gap-0.5 text-[10px]"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span className="hidden sm:inline">Orig</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Center: Song Title on larger screens */}
          <div className="hidden lg:flex items-center justify-center flex-1 min-w-0 px-2 truncate">
            <span className="text-sm font-bold text-zinc-300 truncate">
              {song.title}
            </span>
          </div>

          {/* Right: Guardar PDF, Editar & Menú Hamburguesa */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* Guardar PDF button */}
            <button
              onClick={() => setIsLocalPrintOpen(true)}
              title="Guardar como archivo PDF"
              className="px-2.5 sm:px-3 py-1.5 bg-emerald-600/20 hover:bg-emerald-600 hover:text-white text-emerald-300 border border-emerald-500/40 font-bold text-xs rounded-xl transition flex items-center gap-1.5"
            >
              <FileDown className="w-4 h-4 text-emerald-400" />
              <span className="hidden sm:inline">Guardar PDF</span>
            </button>

            {/* Editar button */}
            {onEdit && (
              <button
                onClick={onEdit}
                title="Editar acordes y letra"
                className="px-2.5 sm:px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-md shadow-emerald-600/20 transition flex items-center gap-1.5 border border-emerald-500"
              >
                <Edit3 className="w-4 h-4" />
                <span className="hidden sm:inline">Editar</span>
              </button>
            )}

            {/* Hamburger Menu Toggle Button */}
            <button
              onClick={() => setIsMenuOpen(true)}
              className="p-1.5 sm:p-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 hover:text-white rounded-xl border border-zinc-700 transition flex items-center justify-center"
              title="Ajustes y opciones de visualización"
            >
              <Menu className="w-5 h-5 text-emerald-400" />
            </button>
          </div>
        </div>
      </header>

      {/* Optional Collapsible Metronome Bar under the Header */}
      {showMetronome && (
        <div className="no-print sticky top-14 sm:top-16 z-30 bg-zinc-900/95 backdrop-blur-md border-b border-zinc-800 shadow-md px-3 sm:px-4 py-2">
          <div className="max-w-4xl mx-auto flex items-center justify-between gap-2">
            <div className="flex-1">
              <MetronomeBar
                initialBpm={song.tempo || 100}
                onBpmChange={newBpm => onUpdateSong({ tempo: newBpm })}
              />
            </div>
            <button
              onClick={() => setShowMetronome(false)}
              className="p-1.5 text-zinc-400 hover:text-white bg-zinc-800 hover:bg-zinc-700 rounded-lg transition"
              title="Ocultar metrónomo"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* 
        Main Screen Song Sheet Display
        - 1 Column mode: max-w-2xl mx-auto (Centered, elegant, eliminates empty black space)
        - 2 Column mode: max-w-5xl mx-auto (Balanced 2 columns with divider)
      */}
      <div
        className={`mx-auto px-3 sm:px-6 py-4 sm:py-6 pb-32 transition-all duration-300 ${
          numColumns === 2 ? 'max-w-5xl' : 'max-w-2xl'
        }`}
      >
        <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-3xl p-4 sm:p-7 shadow-2xl backdrop-blur-xs">
          {/* Song Title & Metadata Banner */}
          <div className="mb-5 pb-3 border-b border-zinc-800/80 flex items-center justify-between gap-3">
            <div>
              <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                {parsed.title || song.title}
              </h1>
              {(parsed.artist || song.artist) && (
                <p className="text-xs sm:text-sm text-emerald-400 font-medium mt-0.5">
                  {parsed.artist || song.artist}
                </p>
              )}
            </div>

            {/* Quick Badges: Key & Capo */}
            <div className="flex items-center gap-1.5 shrink-0">
              <span className="text-xs font-bold px-2.5 py-1 bg-zinc-800/90 text-emerald-400 border border-zinc-700 rounded-xl">
                {effectiveKey}
              </span>
              {localCapo > 0 && (
                <span className="text-xs font-bold px-2.5 py-1 bg-amber-500/20 text-amber-300 border border-amber-500/40 rounded-xl">
                  Capo {localCapo}
                </span>
              )}
            </div>
          </div>

          {/* Song Lyrics & Chords Body */}
          {numColumns === 2 && rightBlocks.length > 0 ? (
            <div
              id="song-content-container"
              className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-10 items-start leading-relaxed"
              style={{ fontSize: `${fontSize}px` }}
            >
              <div className="space-y-4">
                {leftBlocks.map(renderSectionBlock)}
              </div>
              <div className="space-y-4 md:border-l md:border-zinc-800/80 md:pl-6 lg:pl-10">
                {rightBlocks.map(renderSectionBlock)}
              </div>
            </div>
          ) : (
            <div
              id="song-content-container"
              className="space-y-4 leading-relaxed"
              style={{ fontSize: `${fontSize}px` }}
            >
              {leftBlocks.map(renderSectionBlock)}
            </div>
          )}
        </div>
      </div>

      {/* 
        HAMBURGER DRAWER (Slide-out menu for all secondary tools)
      */}
      {isMenuOpen && (
        <div className="fixed inset-0 z-50 flex justify-end animate-in fade-in duration-200">
          {/* Backdrop */}
          <div
            onClick={() => setIsMenuOpen(false)}
            className="fixed inset-0 bg-black/70 backdrop-blur-xs transition-opacity"
          />

          {/* Drawer Content */}
          <div className="relative w-full max-w-sm sm:max-w-md bg-zinc-900 border-l border-zinc-800 shadow-2xl flex flex-col justify-between h-full z-10 overflow-y-auto p-5 sm:p-6 text-zinc-100">
            <div className="space-y-6">
              {/* Drawer Header */}
              <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
                <div className="flex items-center gap-2">
                  <Sliders className="w-5 h-5 text-emerald-400" />
                  <div>
                    <h3 className="font-bold text-white text-base leading-tight">Ajustes de Canción</h3>
                    <p className="text-xs text-zinc-400">Herramientas y preferencias de lectura</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsMenuOpen(false)}
                  className="p-1.5 text-zinc-400 hover:text-white bg-zinc-800 hover:bg-zinc-700 rounded-xl transition"
                  title="Cerrar menú"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Group 1: Columns Layout */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-emerald-400 uppercase tracking-wider block">
                  Columnas en Pantalla
                </label>
                <div className="grid grid-cols-2 gap-2 bg-zinc-950 p-1 rounded-xl border border-zinc-800">
                  <button
                    onClick={() => setNumColumns(1)}
                    className={`py-2 px-3 text-xs font-bold rounded-lg transition flex items-center justify-center gap-1.5 ${
                      numColumns === 1
                        ? 'bg-emerald-600 text-white shadow-md'
                        : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    <span>1 Columna</span>
                  </button>
                  <button
                    onClick={() => setNumColumns(2)}
                    className={`py-2 px-3 text-xs font-bold rounded-lg transition flex items-center justify-center gap-1.5 ${
                      numColumns === 2
                        ? 'bg-emerald-600 text-white shadow-md'
                        : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    <Columns className="w-3.5 h-3.5" />
                    <span>2 Columnas</span>
                  </button>
                </div>
              </div>

              {/* Group 2: Font Zoom */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
                    Tamaño de Letra
                  </label>
                  <span className="text-xs font-mono font-bold text-zinc-400">{fontSize}px</span>
                </div>
                <div className="flex items-center gap-2 bg-zinc-950 p-1.5 rounded-xl border border-zinc-800 justify-between">
                  <button
                    onClick={() => setFontSize(s => Math.max(13, s - 1))}
                    className="flex-1 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 hover:text-white font-bold text-xs rounded-lg transition flex items-center justify-center gap-1"
                  >
                    <ZoomOut className="w-3.5 h-3.5" />
                    <span>Reducir</span>
                  </button>
                  <button
                    onClick={() => setFontSize(18)}
                    className="px-3 py-1.5 text-zinc-400 hover:text-white text-xs font-medium rounded-lg hover:bg-zinc-800 transition"
                    title="Restablecer a 18px"
                  >
                    Reset
                  </button>
                  <button
                    onClick={() => setFontSize(s => Math.min(28, s + 1))}
                    className="flex-1 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 hover:text-white font-bold text-xs rounded-lg transition flex items-center justify-center gap-1"
                  >
                    <ZoomIn className="w-3.5 h-3.5" />
                    <span>Aumentar</span>
                  </button>
                </div>
              </div>

              {/* Group 3: Capo & Metronome */}
              <div className="space-y-2.5">
                <label className="text-xs font-bold text-emerald-400 uppercase tracking-wider block">
                  Afinación y Ritmo
                </label>
                {/* Capo */}
                <div className="flex items-center justify-between p-3 bg-zinc-950 rounded-xl border border-zinc-800">
                  <div>
                    <div className="text-xs font-bold text-white flex items-center gap-1.5">
                      <span>🎸 Cejilla (Capo)</span>
                    </div>
                    <span className="text-[11px] text-zinc-400">
                      {localCapo > 0 ? `Traste ${localCapo} (Individual)` : 'Sin cejilla (0)'}
                    </span>
                  </div>
                  <button
                    onClick={() => {
                      setIsCapoModalOpen(true)
                      setIsMenuOpen(false)
                    }}
                    className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 hover:text-white text-xs font-bold rounded-lg border border-zinc-700 transition"
                  >
                    Cambiar Capo
                  </button>
                </div>

                {/* Metronome */}
                <div className="flex items-center justify-between p-3 bg-zinc-950 rounded-xl border border-zinc-800">
                  <div>
                    <div className="text-xs font-bold text-white flex items-center gap-1.5">
                      <span>⏱️ Metrónomo</span>
                    </div>
                    <span className="text-[11px] text-zinc-400">
                      {song.tempo ? `${song.tempo} BPM` : '100 BPM'}
                    </span>
                  </div>
                  <button
                    onClick={() => setShowMetronome(m => !m)}
                    className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition ${
                      showMetronome
                        ? 'bg-emerald-600 text-white border-emerald-500'
                        : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border-zinc-700'
                    }`}
                  >
                    {showMetronome ? 'Ocultar' : 'Mostrar'}
                  </button>
                </div>
              </div>

              {/* Group 4: Notation System */}
              <div className="space-y-2.5">
                <label className="text-xs font-bold text-emerald-400 uppercase tracking-wider block">
                  Notación Musical
                </label>
                {/* Notation System */}
                <div className="grid grid-cols-2 gap-2 bg-zinc-950 p-1 rounded-xl border border-zinc-800">
                  <button
                    onClick={() => setNotation('anglo')}
                    className={`py-2 px-2.5 text-xs font-bold rounded-lg transition ${
                      notation === 'anglo'
                        ? 'bg-emerald-600 text-white shadow-md'
                        : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    C D E (Americano)
                  </button>
                  <button
                    onClick={() => setNotation('latin')}
                    className={`py-2 px-2.5 text-xs font-bold rounded-lg transition ${
                      notation === 'latin'
                        ? 'bg-emerald-600 text-white shadow-md'
                        : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    Do Re Mi (Latino)
                  </button>
                </div>

                {/* Sharps vs Flats */}
                <div className="grid grid-cols-2 gap-2 bg-zinc-950 p-1 rounded-xl border border-zinc-800">
                  <button
                    onClick={() => setAccidental('sharp')}
                    className={`py-2 px-2.5 text-xs font-bold rounded-lg transition flex items-center justify-center gap-1 ${
                      accidental === 'sharp'
                        ? 'bg-emerald-600 text-white shadow-md'
                        : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    <span>♯ Sostenidos</span>
                  </button>
                  <button
                    onClick={() => setAccidental('flat')}
                    className={`py-2 px-2.5 text-xs font-bold rounded-lg transition flex items-center justify-center gap-1 ${
                      accidental === 'flat'
                        ? 'bg-emerald-600 text-white shadow-md'
                        : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    <span>♭ Bemoles</span>
                  </button>
                </div>
              </div>

              {/* Group 5: Stage Mode & Fullscreen */}
              <div className="space-y-2.5">
                <label className="text-xs font-bold text-emerald-400 uppercase tracking-wider block">
                  Pantalla y Atril
                </label>
                {/* Stage Mode */}
                <div className="flex items-center justify-between p-3 bg-zinc-950 rounded-xl border border-zinc-800">
                  <div>
                    <div className="text-xs font-bold text-white flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-lime-400" />
                      <span>Modo Escenario</span>
                    </div>
                    <span className="text-[11px] text-zinc-400">Alto contraste verde para poca luz</span>
                  </div>
                  <button
                    onClick={() => setStageMode(m => !m)}
                    className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition ${
                      stageMode
                        ? 'bg-lime-400 text-zinc-950 border-lime-300 font-black'
                        : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border-zinc-700'
                    }`}
                  >
                    {stageMode ? 'Activo' : 'Inactivo'}
                  </button>
                </div>

                {/* Fullscreen */}
                <div className="flex items-center justify-between p-3 bg-zinc-950 rounded-xl border border-zinc-800">
                  <div>
                    <div className="text-xs font-bold text-white flex items-center gap-1.5">
                      {isFullscreen ? (
                        <Minimize className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <Maximize className="w-3.5 h-3.5 text-emerald-400" />
                      )}
                      <span>Pantalla Completa</span>
                    </div>
                    <span className="text-[11px] text-zinc-400">Maximiza el espacio para atril</span>
                  </div>
                  <button
                    onClick={toggleFullscreen}
                    className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 hover:text-white text-xs font-bold rounded-lg border border-zinc-700 transition"
                  >
                    {isFullscreen ? 'Salir' : 'Activar'}
                  </button>
                </div>
              </div>

              {/* Group 6: Quick Link to Library */}
              {onOpenLibrary && (
                <div className="pt-2">
                  <button
                    onClick={() => {
                      setIsMenuOpen(false)
                      onOpenLibrary()
                    }}
                    className="w-full py-2.5 px-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 hover:text-white font-bold text-xs rounded-xl border border-zinc-700 transition flex items-center justify-center gap-2"
                  >
                    <BookOpen className="w-4 h-4 text-emerald-400" />
                    <span>Ver Catálogo de Canciones</span>
                  </button>
                </div>
              )}
            </div>

            {/* Drawer Footer */}
            <div className="pt-6 border-t border-zinc-800 mt-6">
              <button
                onClick={() => setIsMenuOpen(false)}
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl transition shadow-md"
              >
                Listo
              </button>
            </div>
          </div>
        </div>
      )}

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
                    try {
                      localStorage.setItem('chords_preferred_instrument', 'guitar')
                    } catch {}
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
                    try {
                      localStorage.setItem('chords_preferred_instrument', 'bass')
                    } catch {}
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
        currentCapo={localCapo}
        notation={notation}
        onApplyCapo={handleApplyCapo}
      />

      {/* PDF Export Modal */}
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
