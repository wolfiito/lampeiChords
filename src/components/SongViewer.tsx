import React, { useState, useMemo, useEffect, useRef } from 'react'
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
  BookOpen,
  Play,
  Pause
} from 'lucide-react'
import type { Song, NotationSystem, ParsedLine, ChordSegment } from '../types/song'
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

// Splits trailing lyrics into individual words so long lines wrap smoothly at natural word boundaries
export const splitSegmentsIntoWords = (segments: ChordSegment[]): ChordSegment[] => {
  const result: ChordSegment[] = []

  for (const seg of segments) {
    const rawText = seg.text || ''

    // If there is no chord, split text into individual words with their trailing whitespace
    if (!seg.chord) {
      if (!rawText) continue
      const words = rawText.match(/\S+\s*|\s+/g)
      if (words && words.length > 0) {
        for (const w of words) {
          result.push({ chord: undefined, text: w })
        }
      } else {
        result.push(seg)
      }
      continue
    }

    // If there is a chord:
    // Case 1: Text starts with leading spaces (e.g. chord placed over whitespace)
    const leadingSpaceMatch = rawText.match(/^(\s+)(.*)$/s)
    if (leadingSpaceMatch) {
      result.push({ chord: seg.chord, text: leadingSpaceMatch[1] })
      const rest = leadingSpaceMatch[2]
      if (rest) {
        const words = rest.match(/\S+\s*|\s+/g)
        if (words) {
          for (const w of words) {
            result.push({ chord: undefined, text: w })
          }
        }
      }
      continue
    }

    // Case 2: Chord is over the first word (or syllable)
    const firstWordMatch = rawText.match(/^(\S+\s*)(.*)$/s)
    if (firstWordMatch && firstWordMatch[2]) {
      result.push({ chord: seg.chord, text: firstWordMatch[1] })
      const restWords = firstWordMatch[2].match(/\S+\s*|\s+/g)
      if (restWords) {
        for (const w of restWords) {
          result.push({ chord: undefined, text: w })
        }
      }
    } else {
      result.push(seg)
    }
  }

  return result
}

export type StageColor = 'pink' | 'blue' | 'orange' | 'amber' | 'green'

export interface StageColorConfig {
  id: StageColor
  name: string
  label: string
  dotClass: string
  ringClass: string
  chordClass: string
  chordHoverClass: string
  activeBorderClass: string
  activeBgClass: string
  activeTextClass: string
  arrowClass: string
  badgeClass: string
  borderGlowClass: string
  pingClass: string
}

export const STAGE_COLORS: Record<StageColor, StageColorConfig> = {
  pink: {
    id: 'pink',
    name: 'Rosa Neón (Cyberpunk)',
    label: 'Rosa',
    dotClass: 'bg-pink-400',
    ringClass: 'ring-pink-400 shadow-[0_0_10px_rgba(244,114,182,0.8)]',
    chordClass: 'text-pink-400 font-black drop-shadow-[0_0_8px_rgba(244,114,182,0.5)]',
    chordHoverClass: 'hover:text-pink-200 hover:bg-pink-500/20',
    activeBorderClass: 'border-l-4 border-pink-500',
    activeBgClass: 'bg-gradient-to-r from-pink-500/[0.22] via-pink-500/[0.06] to-transparent',
    activeTextClass: 'text-pink-300 font-black',
    arrowClass: 'text-pink-400 font-black drop-shadow-[0_0_6px_rgba(244,114,182,0.7)]',
    badgeClass: 'bg-pink-500/20 text-pink-300 border-pink-500/50 shadow-[0_0_8px_rgba(244,114,182,0.3)]',
    borderGlowClass: 'border-pink-500/50 shadow-[0_0_12px_rgba(244,114,182,0.25)]',
    pingClass: 'bg-pink-400'
  },
  blue: {
    id: 'blue',
    name: 'Azul Cyan (Tokyo Night)',
    label: 'Azul',
    dotClass: 'bg-cyan-400',
    ringClass: 'ring-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.8)]',
    chordClass: 'text-cyan-400 font-black drop-shadow-[0_0_8px_rgba(34,211,238,0.5)]',
    chordHoverClass: 'hover:text-cyan-200 hover:bg-cyan-500/20',
    activeBorderClass: 'border-l-4 border-cyan-400',
    activeBgClass: 'bg-gradient-to-r from-cyan-500/[0.22] via-cyan-500/[0.06] to-transparent',
    activeTextClass: 'text-cyan-300 font-black',
    arrowClass: 'text-cyan-400 font-black drop-shadow-[0_0_6px_rgba(34,211,238,0.7)]',
    badgeClass: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50 shadow-[0_0_8px_rgba(34,211,238,0.3)]',
    borderGlowClass: 'border-cyan-500/50 shadow-[0_0_12px_rgba(34,211,238,0.25)]',
    pingClass: 'bg-cyan-400'
  },
  orange: {
    id: 'orange',
    name: 'Naranja Neón (Dracula / Sunset)',
    label: 'Naranja',
    dotClass: 'bg-orange-400',
    ringClass: 'ring-orange-400 shadow-[0_0_10px_rgba(251,146,60,0.8)]',
    chordClass: 'text-orange-400 font-black drop-shadow-[0_0_8px_rgba(251,146,60,0.5)]',
    chordHoverClass: 'hover:text-orange-200 hover:bg-orange-500/20',
    activeBorderClass: 'border-l-4 border-orange-400',
    activeBgClass: 'bg-gradient-to-r from-orange-500/[0.22] via-orange-500/[0.06] to-transparent',
    activeTextClass: 'text-orange-300 font-black',
    arrowClass: 'text-orange-400 font-black drop-shadow-[0_0_6px_rgba(251,146,60,0.7)]',
    badgeClass: 'bg-orange-500/20 text-orange-300 border-orange-500/50 shadow-[0_0_8px_rgba(251,146,60,0.3)]',
    borderGlowClass: 'border-orange-500/50 shadow-[0_0_12px_rgba(251,146,60,0.25)]',
    pingClass: 'bg-orange-400'
  },
  amber: {
    id: 'amber',
    name: 'Ámbar Oro (Clásico Escenario)',
    label: 'Ámbar',
    dotClass: 'bg-amber-400',
    ringClass: 'ring-amber-400 shadow-[0_0_10px_rgba(251,191,36,0.8)]',
    chordClass: 'text-amber-300 font-black drop-shadow-[0_0_8px_rgba(251,191,36,0.5)]',
    chordHoverClass: 'hover:text-amber-100 hover:bg-amber-400/20',
    activeBorderClass: 'border-l-4 border-amber-400',
    activeBgClass: 'bg-gradient-to-r from-amber-500/[0.22] via-amber-500/[0.06] to-transparent',
    activeTextClass: 'text-amber-300 font-black',
    arrowClass: 'text-amber-400 font-black drop-shadow-[0_0_6px_rgba(251,191,36,0.7)]',
    badgeClass: 'bg-amber-500/20 text-amber-300 border-amber-500/50 shadow-[0_0_8px_rgba(251,191,36,0.3)]',
    borderGlowClass: 'border-amber-500/50 shadow-[0_0_12px_rgba(251,191,36,0.25)]',
    pingClass: 'bg-amber-400'
  },
  green: {
    id: 'green',
    name: 'Verde Esmeralda (Matrix)',
    label: 'Verde',
    dotClass: 'bg-emerald-400',
    ringClass: 'ring-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.8)]',
    chordClass: 'text-emerald-400 font-black drop-shadow-[0_0_8px_rgba(52,211,153,0.5)]',
    chordHoverClass: 'hover:text-emerald-200 hover:bg-emerald-500/20',
    activeBorderClass: 'border-l-4 border-emerald-400',
    activeBgClass: 'bg-gradient-to-r from-emerald-500/[0.22] via-emerald-500/[0.06] to-transparent',
    activeTextClass: 'text-emerald-300 font-black',
    arrowClass: 'text-emerald-400 font-black drop-shadow-[0_0_6px_rgba(52,211,153,0.7)]',
    badgeClass: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50 shadow-[0_0_8px_rgba(52,211,153,0.3)]',
    borderGlowClass: 'border-emerald-500/50 shadow-[0_0_12px_rgba(52,211,153,0.25)]',
    pingClass: 'bg-emerald-400'
  }
}

interface LyricLineProps {
  line: ParsedLine
  semitoneShift: number
  accidental: 'flat' | 'sharp'
  notation: NotationSystem
  stageMode: boolean
  stageColor: StageColor
  fontSize: number
  onChordClick: (chord: string) => void
}

const LyricLine: React.FC<LyricLineProps> = React.memo(({
  line,
  semitoneShift,
  accidental,
  notation,
  stageMode,
  stageColor,
  fontSize,
  onChordClick
}) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const [wrappedIndices, setWrappedIndices] = useState<Set<number>>(new Set())

  const colorConfig = STAGE_COLORS[stageColor] || STAGE_COLORS.pink

  const hasAnyChords = line.segments?.some(s => !!s.chord)
  const hasLyrics = line.segments?.some(s => (s.text || '').trim().length > 0)
  const isChordOnlyLine = hasAnyChords && !hasLyrics

  const renderedSegments = useMemo(() => {
    return isChordOnlyLine
      ? (line.segments || [])
      : splitSegmentsIntoWords(line.segments || [])
  }, [line.segments, isChordOnlyLine])

  useEffect(() => {
    if (isChordOnlyLine) {
      setWrappedIndices(prev => (prev.size === 0 ? prev : new Set()))
      return
    }

    const container = containerRef.current
    if (!container) return

    const updateWrapped = () => {
      const children = container.children
      if (!children || children.length === 0) {
        setWrappedIndices(prev => (prev.size === 0 ? prev : new Set()))
        return
      }

      const firstChild = children[0] as HTMLElement
      const baseBottom = firstChild.offsetTop + firstChild.offsetHeight
      const newWrapped = new Set<number>()
      let lastBottom = baseBottom

      for (let i = 1; i < children.length; i++) {
        const child = children[i] as HTMLElement
        const childBottom = child.offsetTop + child.offsetHeight
        // If this child dropped to a subsequent row (bottom increased by > 12px)
        if (childBottom > lastBottom + 12) {
          newWrapped.add(i)
          lastBottom = childBottom
        }
      }

      setWrappedIndices(prev => {
        if (prev.size !== newWrapped.size) return newWrapped
        for (const idx of newWrapped) {
          if (!prev.has(idx)) return newWrapped
        }
        return prev
      })
    }

    updateWrapped()

    if (typeof ResizeObserver !== 'undefined') {
      const observer = new ResizeObserver(() => {
        updateWrapped()
      })
      observer.observe(container)
      return () => observer.disconnect()
    }
  }, [renderedSegments, fontSize, isChordOnlyLine])

  return (
    <div
      ref={containerRef}
      className={`flex flex-wrap items-end my-0.5 sm:my-1 font-mono tracking-wide max-w-full ${
        isChordOnlyLine ? 'gap-3 sm:gap-4 py-0.5' : 'pl-5 sm:pl-6'
      }`}
    >
      {renderedSegments.map((seg, sSubIdx) => {
        const isFirstItem = sSubIdx === 0
        const isWrappedRowStart = wrappedIndices.has(sSubIdx)
        const rawChord = seg.chord
        let chordDisplay = ''
        if (rawChord) {
          chordDisplay = transposeChord(rawChord, semitoneShift, accidental === 'flat', notation)
        }

        return (
          <span
            key={sSubIdx}
            className={`inline-flex flex-col items-start mr-0 leading-none whitespace-pre relative group ${
              !isChordOnlyLine && isFirstItem ? '-ml-5 sm:-ml-6' : ''
            }`}
          >
            {/* Visual Continuation Arrow ↳ for wrapped lines */}
            {isWrappedRowStart && !isChordOnlyLine && (
              <span
                className={`absolute -left-5 sm:-left-6 bottom-0.5 sm:bottom-1 font-black text-xs sm:text-sm select-none pointer-events-none transition-colors ${
                  stageMode ? colorConfig.arrowClass : 'text-emerald-400'
                }`}
                title="Continuación de renglón"
                aria-hidden="true"
              >
                ↳
              </span>
            )}

            {chordDisplay ? (
              <button
                type="button"
                onClick={() => onChordClick(chordDisplay)}
                title={`Ver digitación de ${chordDisplay}`}
                className={`font-sans font-black text-xs sm:text-sm px-1 py-0.5 leading-tight rounded cursor-pointer transition select-none ${
                  stageMode
                    ? `${colorConfig.chordClass} ${colorConfig.chordHoverClass}`
                    : 'text-emerald-400 hover:bg-emerald-500/20 hover:text-emerald-300'
                }`}
              >
                {chordDisplay}
              </button>
            ) : (
              <span
                className="font-sans text-xs sm:text-sm px-1 py-0.5 leading-tight select-none opacity-0 pointer-events-none"
                aria-hidden="true"
              >
                &nbsp;
              </span>
            )}

            <span
              className={`font-sans whitespace-pre transition-colors ${
                stageMode ? 'text-white font-medium' : 'text-zinc-100'
              }`}
            >
              {seg.text || (chordDisplay ? ' ' : '')}
            </span>
          </span>
        )
      })}
    </div>
  )
})

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
  const [stageMode, setStageMode] = useState<boolean>(() => {
    try {
      return localStorage.getItem('chords_stage_mode') === 'true'
    } catch {
      return false
    }
  })

  const handleToggleStageMode = () => {
    setStageMode(prev => {
      const next = !prev
      try {
        localStorage.setItem('chords_stage_mode', String(next))
      } catch {}
      return next
    })
  }

  const [stageColor, setStageColor] = useState<StageColor>(() => {
    try {
      const saved = localStorage.getItem('chords_stage_color') as StageColor
      if (saved && STAGE_COLORS[saved]) return saved
    } catch {}
    return 'pink'
  })

  const handleSelectStageColor = (color: StageColor) => {
    setStageColor(color)
    try {
      localStorage.setItem('chords_stage_color', color)
    } catch {}
  }

  const [isStageScrolling, setIsStageScrolling] = useState<boolean>(false)
  const [stageScrollSpeed, setStageScrollSpeed] = useState<number>(1.0)

  // Sync body class for stage mode and auto-scroll cleanup
  useEffect(() => {
    if (stageMode) {
      document.body.classList.add('stage-mode-active')
    } else {
      document.body.classList.remove('stage-mode-active')
      setIsStageScrolling(false)
    }
    return () => {
      document.body.classList.remove('stage-mode-active')
    }
  }, [stageMode])

  // Smooth continuous requestAnimationFrame auto-scroll for Stage Mode (no BPM)
  useEffect(() => {
    if (!stageMode || !isStageScrolling) return

    let animId: number
    let lastTime = performance.now()
    // Base speed: 28 px/s at 1.0x
    const baseSpeed = 28

    const step = (now: number) => {
      const dt = (now - lastTime) / 1000
      lastTime = now

      const maxScroll = Math.max(
        0,
        document.documentElement.scrollHeight - window.innerHeight
      )

      if (window.scrollY >= maxScroll - 2) {
        setIsStageScrolling(false)
        return
      }

      window.scrollBy({ top: baseSpeed * stageScrollSpeed * dt, behavior: 'instant' as ScrollBehavior })
      animId = requestAnimationFrame(step)
    }

    animId = requestAnimationFrame(step)
    return () => cancelAnimationFrame(animId)
  }, [stageMode, isStageScrolling, stageScrollSpeed])

  // Spacebar toggles scroll in Stage Mode
  useEffect(() => {
    if (!stageMode) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && e.target === document.body) {
        e.preventDefault()
        setIsStageScrolling(prev => !prev)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [stageMode])

  // Escape key exits Stage Mode
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && stageMode) {
        setStageMode(false)
        try {
          localStorage.setItem('chords_stage_mode', 'false')
        } catch {}
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [stageMode])

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
    const colorConfig = STAGE_COLORS[stageColor] || STAGE_COLORS.pink

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
              ? stageMode
                ? `${colorConfig.activeBorderClass} ${colorConfig.activeBgClass} ${colorConfig.activeTextClass}`
                : 'border-l-4 border-emerald-400 bg-gradient-to-r from-emerald-500/[0.15] via-emerald-500/[0.04] to-transparent text-emerald-300'
              : 'border-l-4 border-transparent text-zinc-400 hover:text-zinc-200'
          }`}
          title={`Repite ${secTiming?.parentTitle || 'sección anterior'} (clic para ver acordes)`}
        >
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              <span className={`font-extrabold text-xs ${stageMode ? colorConfig.activeTextClass : 'text-emerald-400'}`}>⤴</span>
              <span className="uppercase font-black text-white">{block.headerLine?.comment}</span>
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                isActive
                  ? stageMode
                    ? `${colorConfig.activeTextClass} bg-white/10`
                    : 'text-emerald-300 bg-emerald-500/20'
                  : 'text-zinc-500 bg-zinc-800/40'
              }`}>
                Repite {secTiming?.parentTitle || 'sección anterior'}
              </span>
              {isCurrentSec && (
                <span className={`text-[10px] font-bold animate-pulse flex items-center gap-1 ${
                  stageMode ? colorConfig.activeTextClass : 'text-amber-300'
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full inline-block ${stageMode ? colorConfig.pingClass : 'bg-amber-400'}`} />
                  En pantalla arriba ↑
                </span>
              )}
            </div>
            {secTiming?.durationSec ? (
              <span className={`text-[11px] font-mono font-bold px-2 py-0.5 rounded-full ${
                isActive
                  ? stageMode
                    ? colorConfig.badgeClass
                    : 'text-emerald-300 bg-emerald-500/25'
                  : 'text-zinc-500'
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
            ? stageMode
              ? `${colorConfig.activeBorderClass} ${colorConfig.activeBgClass}`
              : 'border-l-4 border-emerald-400 bg-gradient-to-r from-emerald-500/[0.14] via-emerald-500/[0.04] to-transparent'
            : 'border-l-4 border-transparent'
        }`}
      >
        {/* Section Header */}
        {block.headerLine && (
          <div className="flex items-center justify-between gap-2 flex-wrap mb-1.5">
            <span className="flex items-center gap-2">
              {isActive ? (
                <span className={`w-2 h-2 rounded-full animate-ping inline-block shrink-0 ${
                  stageMode ? colorConfig.pingClass : 'bg-emerald-400'
                }`} />
              ) : (
                <span className={`w-1.5 h-1.5 rounded-full inline-block shrink-0 ${
                  stageMode ? `${colorConfig.pingClass} opacity-60` : 'bg-emerald-500/60'
                }`} />
              )}
              <span className={`uppercase font-black tracking-wide text-xs sm:text-sm ${
                isActive
                  ? stageMode ? colorConfig.activeTextClass : 'text-emerald-300'
                  : stageMode ? 'text-zinc-300' : 'text-emerald-400/90'
              }`}>
                {block.headerLine.comment}
              </span>
              {isTargetOfActive && !isCurrentSec && (
                <span className={`text-[10px] font-bold animate-pulse flex items-center gap-1 px-2 py-0.5 rounded-full ${
                  stageMode ? `${colorConfig.activeTextClass} bg-white/10` : 'text-amber-300 bg-amber-500/10'
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full inline-block ${stageMode ? colorConfig.pingClass : 'bg-amber-400'}`} />
                  Repitiendo arriba
                </span>
              )}
            </span>
            {secTiming?.durationSec ? (
              <span
                className={`text-[11px] font-mono font-bold px-2 py-0.5 rounded-full transition flex items-center gap-1 ${
                  isActive
                    ? stageMode
                      ? colorConfig.badgeClass
                      : 'bg-emerald-500/25 text-emerald-300'
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

          return (
            <LyricLine
              key={lIdx}
              line={line}
              semitoneShift={semitoneShift}
              accidental={accidental}
              notation={notation}
              stageMode={stageMode}
              stageColor={stageColor}
              fontSize={fontSize}
              onChordClick={setActiveChordModal}
            />
          )
        })}
      </div>
    )
  }

  const colorConfig = STAGE_COLORS[stageColor] || STAGE_COLORS.pink

  return (
    <div
      className={`w-full min-h-screen transition-colors duration-300 overflow-x-hidden ${
        stageMode ? 'bg-black text-white' : 'bg-zinc-950 text-zinc-100'
      }`}
    >
      {/* 
        SINGLE UNIFIED TOP BAR
        - Stage Mode / Zen: Cero distracciones (oculta Editar, Guardar PDF y Menús; solo Tono, Compás, Colores y Salir)
        - Normal Mode: Barra completa con edición, catálogo, PDF y menú de ajustes
      */}
      <header className={`no-print sticky top-0 z-40 backdrop-blur-md border-b transition-colors shadow-md ${
        stageMode ? 'bg-black/95 border-zinc-800/80 text-white shadow-xl' : 'bg-zinc-900/95 border-zinc-800 text-zinc-100'
      }`}>
        {stageMode ? (
          /* =================================================== */
          /* MODO ESCENARIO: CERO DISTRACCIONES (SOLO SCROLL Y ✕)*/
          /* =================================================== */
          <div className="max-w-6xl mx-auto px-2 sm:px-4 h-13 sm:h-14 flex items-center justify-between gap-2 sm:gap-3">
            {/* Left: Botón ✕ para regresar */}
            <div className="flex items-center shrink-0">
              <button
                onClick={handleToggleStageMode}
                title="Regresar (o pulsa Escape)"
                className="px-2.5 sm:px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white text-xs font-bold rounded-xl border border-zinc-800 transition-all flex items-center gap-1.5 cursor-pointer select-none active:scale-95"
              >
                <X className="w-4 h-4 text-rose-400" />
                <span className="font-semibold text-xs">Regresar</span>
              </button>
            </div>

            {/* Center: Song Title */}
            <div className="flex items-center justify-center flex-1 min-w-0 px-2 truncate">
              <span className="text-sm sm:text-base font-extrabold text-zinc-200 truncate tracking-tight">
                {song.title}
              </span>
            </div>

            {/* Right: Scroll (sin BPM) + Colores + Pantalla Completa */}
            <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
              {/* Botón Auto-Scroll Integrado (Sin BPM) */}
              <div className="flex items-center bg-zinc-900/90 p-0.5 sm:p-1 rounded-xl border border-zinc-800">
                <button
                  onClick={() => setIsStageScrolling(s => !s)}
                  title={isStageScrolling ? 'Pausar auto-scroll (Espacio)' : 'Iniciar auto-scroll (Espacio)'}
                  className={`px-2.5 sm:px-3 py-1 rounded-lg text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer select-none ${
                    isStageScrolling
                      ? 'bg-amber-500 text-zinc-950 shadow-md shadow-amber-500/30 animate-pulse'
                      : `${colorConfig.badgeClass} hover:brightness-125`
                  }`}
                >
                  {isStageScrolling ? (
                    <>
                      <Pause className="w-3.5 h-3.5 fill-current" />
                      <span>Pausar</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>Scroll</span>
                    </>
                  )}
                </button>

                {/* Velocidad: - 1.0x + (Sin BPM) */}
                <div className="flex items-center pl-1 pr-0.5 gap-0.5">
                  <button
                    type="button"
                    onClick={() => setStageScrollSpeed(s => Math.max(0.3, Math.round((s - 0.2) * 10) / 10))}
                    title="Reducir velocidad de scroll"
                    className="w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center text-xs font-bold text-zinc-400 hover:text-white hover:bg-zinc-800 rounded transition cursor-pointer"
                  >
                    -
                  </button>
                  <span className="text-[10px] sm:text-[11px] font-mono font-bold text-zinc-300 min-w-[2rem] sm:min-w-[2.2rem] text-center select-none">
                    {stageScrollSpeed.toFixed(1)}x
                  </span>
                  <button
                    type="button"
                    onClick={() => setStageScrollSpeed(s => Math.min(4.0, Math.round((s + 0.2) * 10) / 10))}
                    title="Aumentar velocidad de scroll"
                    className="w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center text-xs font-bold text-zinc-400 hover:text-white hover:bg-zinc-800 rounded transition cursor-pointer"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Selector Rápido de Colores */}
              <div
                className="flex items-center gap-1 sm:gap-1.5 bg-zinc-900/90 px-1.5 sm:px-2 py-1 rounded-xl border border-zinc-800"
                title="Color de acordes para escenario"
              >
                {(Object.keys(STAGE_COLORS) as StageColor[]).map(cKey => {
                  const cfg = STAGE_COLORS[cKey]
                  const isSelected = stageColor === cKey
                  return (
                    <button
                      key={cKey}
                      onClick={() => handleSelectStageColor(cKey)}
                      title={`Tema ${cfg.name}`}
                      className={`w-4 h-4 sm:w-5 sm:h-5 rounded-full transition-all duration-150 cursor-pointer ${cfg.dotClass} ${
                        isSelected
                          ? `scale-125 ring-2 ring-white ${cfg.ringClass}`
                          : 'opacity-40 hover:opacity-100 hover:scale-110'
                      }`}
                    />
                  )
                })}
              </div>

              {/* Pantalla Completa */}
              <button
                onClick={toggleFullscreen}
                title={isFullscreen ? 'Salir de pantalla completa' : 'Pantalla completa para atril'}
                className="p-1.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white rounded-xl border border-zinc-800 transition cursor-pointer"
              >
                {isFullscreen ? <Minimize className="w-4 h-4 text-white" /> : <Maximize className="w-4 h-4 text-white" />}
              </button>
            </div>
          </div>
        ) : (
          /* =================================================== */
          /* MODO NORMAL: Con Editar, Guardar PDF, Menú, etc.    */
          /* =================================================== */
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

              {/* Botón para entrar al Modo Escenario Zen */}
              <button
                onClick={handleToggleStageMode}
                title="Entrar en Modo Escenario Zen (Cero distracciones)"
                className="px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 border bg-zinc-800 hover:bg-zinc-700 text-zinc-200 hover:text-white border-zinc-700 cursor-pointer select-none"
              >
                <Sparkles className="w-3.5 h-3.5 text-pink-400" />
                <span className="hidden sm:inline">Modo Escenario</span>
              </button>
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
                className="px-2.5 sm:px-3 py-1.5 bg-emerald-600/20 hover:bg-emerald-600 hover:text-white text-emerald-300 border border-emerald-500/40 font-bold text-xs rounded-xl transition flex items-center gap-1.5 cursor-pointer"
              >
                <FileDown className="w-4 h-4 text-emerald-400" />
                <span className="hidden sm:inline">Guardar PDF</span>
              </button>

              {/* Editar button */}
              {onEdit && (
                <button
                  onClick={onEdit}
                  title="Editar acordes y letra"
                  className="px-2.5 sm:px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-md shadow-emerald-600/20 transition flex items-center gap-1.5 border border-emerald-500 cursor-pointer"
                >
                  <Edit3 className="w-4 h-4" />
                  <span className="hidden sm:inline">Editar</span>
                </button>
              )}

              {/* Hamburger Menu Toggle Button */}
              <button
                onClick={() => setIsMenuOpen(true)}
                className="p-1.5 sm:p-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 hover:text-white rounded-xl border border-zinc-700 transition flex items-center justify-center cursor-pointer"
                title="Ajustes y opciones de visualización"
              >
                <Menu className="w-5 h-5 text-emerald-400" />
              </button>
            </div>
          </div>
        )}
      </header>

      {/* Optional Collapsible Metronome Bar under the Header */}
      {showMetronome && !stageMode && (
        <div className={`no-print sticky top-13 sm:top-14 z-30 backdrop-blur-md border-b shadow-md px-3 sm:px-4 py-2 ${
          stageMode ? 'bg-black/95 border-zinc-800/80 text-white' : 'bg-zinc-900/95 border-zinc-800 text-zinc-100'
        }`}>
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
        <div className="w-full">
          {/* Song Title & Metadata Banner */}
          <div className="mb-5 pb-3 border-b border-zinc-800/60 flex items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                  {parsed.title || song.title}
                </h1>
              </div>
              {(parsed.artist || song.artist) && (
                <p className={`text-xs sm:text-sm font-medium mt-0.5 ${
                  stageMode ? colorConfig.activeTextClass : 'text-emerald-400'
                }`}>
                  {parsed.artist || song.artist}
                </p>
              )}
            </div>

            {/* Quick Badges: Key & Capo */}
            <div className="flex items-center gap-1.5 shrink-0">
              <span className={`text-xs font-bold px-2.5 py-1 rounded-xl border ${
                stageMode
                  ? colorConfig.badgeClass
                  : 'bg-zinc-800/90 text-emerald-400 border border-zinc-700'
              }`}>
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
                <div className="p-3 bg-zinc-950 rounded-xl border border-zinc-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xs font-bold text-white flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-pink-400" />
                        <span>Modo Escenario Zen</span>
                      </div>
                      <span className="text-[11px] text-zinc-400">Cero distracciones y pantalla completa</span>
                    </div>
                    <button
                      onClick={handleToggleStageMode}
                      className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition cursor-pointer ${
                        stageMode
                          ? `${colorConfig.badgeClass} font-black`
                          : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border-zinc-700'
                      }`}
                    >
                      {stageMode ? 'Activo' : 'Entrar'}
                    </button>
                  </div>

                  {/* Stage color selector */}
                  <div>
                    <span className="text-[11px] font-bold text-zinc-400 block mb-1.5">
                      Color de acordes:
                    </span>
                    <div className="grid grid-cols-5 gap-1.5">
                      {(Object.keys(STAGE_COLORS) as StageColor[]).map(cKey => {
                        const cfg = STAGE_COLORS[cKey]
                        const isSelected = stageColor === cKey
                        return (
                          <button
                            key={cKey}
                            onClick={() => handleSelectStageColor(cKey)}
                            className={`flex flex-col items-center gap-1 py-1.5 px-1 rounded-xl border text-[10px] font-bold transition cursor-pointer ${
                              isSelected
                                ? 'bg-zinc-800 border-zinc-600 text-white shadow'
                                : 'bg-zinc-900/60 border-zinc-800/80 text-zinc-400 hover:text-zinc-200'
                            }`}
                          >
                            <span className={`w-3.5 h-3.5 rounded-full ${cfg.dotClass} ${isSelected ? 'scale-110 ring-2 ring-white' : ''}`} />
                            <span className="truncate w-full text-center">{cfg.label}</span>
                          </button>
                        )
                      })}
                    </div>
                  </div>
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
            className={`rounded-3xl p-4 sm:p-5 shadow-2xl flex flex-col items-center max-w-sm w-full text-center max-h-[92vh] overflow-y-auto scrollbar-none border ${
              stageMode ? `bg-zinc-950 ${colorConfig.borderGlowClass}` : 'bg-zinc-900 border-emerald-900/60'
            }`}
          >
            {/* Header: Chord Name + Instrument Selector Tabs */}
            <div className="flex items-center justify-between w-full mb-3 pb-2 border-b border-zinc-800">
              <div className="text-left">
                <span className={`text-lg sm:text-xl font-black block leading-tight ${
                  stageMode ? colorConfig.activeTextClass : 'text-white'
                }`}>
                  {activeChordModal}
                </span>
                <span className={`text-[11px] font-semibold ${
                  stageMode ? colorConfig.activeTextClass : 'text-emerald-400'
                }`}>
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
