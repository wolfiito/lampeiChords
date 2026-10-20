import type { NotationSystem, ParsedLine, ParsedSong, ChordSegment } from '../types/song'
import { parseChord, transposeChord, convertNotation } from './musicTheory'

function stripAccents(str: string): string {
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
}

// Common section tags that shouldn't be treated as musical chords
const SECTION_KEYWORDS = new Set([
  'INTRO', 'INTRODUCCION', 'ENTRADA',
  'VERSO', 'VERSO 1', 'VERSO 2', 'VERSO 3', 'VERSO 4', 'VERSO 5',
  'VERSE', 'VERSE 1', 'VERSE 2', 'VERSE 3', 'VERSE 4',
  'ESTROFA', 'ESTROFA 1', 'ESTROFA 2', 'ESTROFA 3',
  'CORO', 'CORO 1', 'CORO 2', 'CORO FINAL', 'CHORUS', 'CHORUS 1', 'CHORUS 2',
  'ESTRIBILLO', 'PRE-CORO', 'PRECORO', 'PRE-CHORUS', 'PRECHORUS',
  'POST-CORO', 'POSTCORO', 'POST-CHORUS', 'POSTCHORUS',
  'PUENTE', 'PUENTE 1', 'PUENTE 2', 'PUENTE 3', 'BRIDGE', 'BRIDGE 1', 'BRIDGE 2',
  'TRANSICION', 'TRANSICION 1', 'TRANSICION 2', 'TRANSITION',
  'INTERLUDIO', 'INTERLUDE',
  'INSTRUMENTAL', 'INSTRU',
  'SOLO', 'SOLO DE GUITARRA', 'GUITAR SOLO',
  'OUTRO', 'FINAL', 'FIN', 'CODA', 'TERMINACION',
  'ESPONTANEO', 'SPONTANEOUS',
  'MEDLEY', 'TAB', 'RIFF', 'HOOK', 'VAMP',
  'PARTE', 'PARTE A', 'PARTE B', 'PARTE C', 'PARTE 1', 'PARTE 2',
  'PART', 'PART A', 'PART B', 'PART 1', 'PART 2',
  'SECCION', 'SECTION', 'CANTO', 'CLIMAX', 'SUBIDA', 'BAJADA'
])

const SECTION_PREFIXES = [
  'VERSO', 'VERSE', 'ESTROFA', 'CORO', 'CHORUS', 'ESTRIBILLO',
  'PRE-CORO', 'PRECORO', 'PRE-CHORUS', 'PRECHORUS',
  'POST-CORO', 'POSTCORO', 'POST-CHORUS', 'POSTCHORUS',
  'PUENTE', 'BRIDGE', 'TRANSICION', 'TRANSITION',
  'INTERLUDIO', 'INTERLUDE', 'INSTRUMENTAL', 'INSTRU',
  'INTRO', 'ENTRADA', 'SOLO', 'OUTRO', 'FINAL', 'FIN', 'CODA',
  'ESPONTANEO', 'SPONTANEOUS', 'PARTE', 'PART', 'SECCION', 'SECTION',
  'MEDLEY', 'TAB', 'RIFF', 'HOOK', 'VAMP'
]

export function isSectionHeader(text: string): boolean {
  if (!text) return false
  const unaccented = stripAccents(text).trim()

  // Clean explicit duration markers only (e.g. {30}, {30s}, 30s, : 30s, - 30s)
  // CRITICAL: NEVER strip bare digits without unit/symbol so "VERSO 2" is not turned into "VERSO"
  const clean = unaccented
    .replace(/\{[^}]*\}$/, '')
    .replace(/(?:[:\-]\s*|\s*[({])\s*\d+\s*(?:s|seg|segs|segundos|seconds)?\s*[)}]?$/i, '')
    .replace(/\s+\d+\s*(?:s|seg|segs|segundos|seconds)$/i, '')
    .trim()
    .toUpperCase()

  if (SECTION_KEYWORDS.has(clean)) return true
  if (SECTION_PREFIXES.some(p => clean.startsWith(p))) return true

  // If text is bracketed alone, contains spaces or words, and is NOT a musical chord
  if (!parseChord(clean) && (clean.includes(' ') || clean.length > 3)) {
    return true
  }

  return false
}

/**
 * Parses a section header line and extracts title and optional explicit duration in seconds.
 * Supports:
 *   [Intro 28s]
 *   [Transición 7s]
 *   [Instrumental 27s]
 *   [Puente 1 29s]
 *   [Verso 2 27s]
 *   [Verso 2]
 *   [Coro]
 *   [Intro]{30}
 *   [Verso 1]{25}
 *   [Intro: 30s]
 *   [Intro - 30s]
 *   {comment: Intro 30s}
 */
export function parseSectionLine(rawLine: string): { title: string; explicitSec?: number } | null {
  const trimmed = rawLine.trim()
  if (!trimmed) return null

  // Helper to extract duration from title string
  const extractDuration = (rawTitle: string): { title: string; sec?: number } => {
    let title = rawTitle.trim()
    let sec: number | undefined

    // Pattern A: Trailing units, e.g. "Transición 7s", "Verso 2 27s", "Intro 28 s", "Intro 28seg"
    const unitMatch = title.match(/(?:[:\s-]\s*|\s*\{)\s*(\d+)\s*(?:s|seg|segs|segundos|seconds)\}?$/i)
    if (unitMatch && unitMatch.index !== undefined) {
      sec = parseInt(unitMatch[1], 10)
      title = title.substring(0, unitMatch.index).trim()
      return { title, sec }
    }

    // Pattern B: Trailing colon, hyphen, paren, or brace with digits, e.g. "Intro: 30", "Intro - 30", "Intro (30)"
    const symbolMatch = title.match(/(?:[:\-]\s*|\s*[({])\s*(\d+)\s*(?:s|seg|segs|segundos|seconds)?\s*[)}]?$/i)
    if (symbolMatch && symbolMatch.index !== undefined) {
      sec = parseInt(symbolMatch[1], 10)
      title = title.substring(0, symbolMatch.index).trim()
      return { title, sec }
    }

    return { title, sec: undefined }
  }

  // Pattern 1: [Intro]{30} or [Transición 7s] or [Verso 2 27s] or [Verso 2]
  const bracketMatch = trimmed.match(/^\[([^\]]+)\](?:\s*\{(\d+)(?:s|seg)?\})?$/i)
  if (bracketMatch) {
    let title = bracketMatch[1].trim()
    let sec = bracketMatch[2] ? parseInt(bracketMatch[2], 10) : undefined

    if (sec === undefined) {
      const extracted = extractDuration(title)
      title = extracted.title
      sec = extracted.sec
    }

    if (isSectionHeader(title) || sec !== undefined || (!parseChord(title) && title.includes(' '))) {
      return {
        title: title.replace(/[:/]/g, '').trim(),
        explicitSec: sec
      }
    }
  }

  // Pattern 2: {comment: Intro 30s} or {c: Transición 7s} or {comment: Intro}{30}
  const commentMatch = trimmed.match(/^\{c(?:omment)?:\s*([^}]+)\}(?:\s*\{(\d+)(?:s|seg)?\})?$/i)
  if (commentMatch) {
    let title = commentMatch[1].trim()
    let sec = commentMatch[2] ? parseInt(commentMatch[2], 10) : undefined

    if (sec === undefined) {
      const extracted = extractDuration(title)
      title = extracted.title
      sec = extracted.sec
    }

    return {
      title: title.replace(/[:/]/g, '').trim(),
      explicitSec: sec
    }
  }

  return null
}

/**
 * Parses a ChordPro formatted string into structured song data
 */
export function parseChordPro(chordProContent: string): ParsedSong {
  const lines = chordProContent.split(/\r?\n/)
  const parsedLines: ParsedLine[] = []

  let title = 'Sin título'
  let artist = 'Artista desconocido'
  let key = 'C'
  let capo = 0
  let tempo: number | undefined

  for (const rawLine of lines) {
    const trimmed = rawLine.trim()

    // 1. Directives like {title: Song Name} or {t: Song Name}
    const directiveMatch = trimmed.match(/^\{([a-zA-Z0-9_-]+)(?::\s*(.*))?\}$/)
    if (directiveMatch) {
      const dKey = directiveMatch[1].toLowerCase()
      const dVal = (directiveMatch[2] || '').trim()

      if (dKey === 'title' || dKey === 't') title = dVal
      else if (dKey === 'artist' || dKey === 'a' || dKey === 'subtitle' || dKey === 'st') artist = dVal
      else if (dKey === 'key' || dKey === 'k') key = dVal
      else if (dKey === 'capo') capo = parseInt(dVal, 10) || 0
      else if (dKey === 'tempo' || dKey === 'bpm') tempo = parseInt(dVal, 10) || undefined
      else if (dKey === 'comment' || dKey === 'c') {
        const secInfo = parseSectionLine(`{comment: ${dVal}}`)
        parsedLines.push({
          type: 'comment',
          comment: secInfo ? secInfo.title : dVal,
          sectionDuration: secInfo?.explicitSec
        })
        continue
      }

      parsedLines.push({
        type: 'directive',
        directiveKey: dKey,
        directiveValue: dVal
      })
      continue
    }

    // 2. Empty lines
    if (trimmed === '') {
      parsedLines.push({ type: 'empty' })
      continue
    }

    // 3. Section header alone in square brackets, e.g. [Coro], [Intro], [Verso 1], [Intro]{30}
    const secParsed = parseSectionLine(trimmed)
    if (secParsed) {
      parsedLines.push({
        type: 'comment',
        comment: secParsed.title,
        sectionDuration: secParsed.explicitSec
      })
      continue
    }

    // 4. Regular lyric line with inline chords [C] [Am] etc.
    const segments: ChordSegment[] = []
    const chordRegex = /\[([^\]]+)\]/g
    let lastIndex = 0
    let currentChord: string | undefined = undefined

    const pushSegment = (chord: string | undefined, text: string) => {
      if (chord) {
        // If text starts with spaces and has subsequent non-space characters (e.g. " para ti"):
        // The chord is placed above the space, and the following word is a separate lyric segment.
        const leadingSpaceMatch = text.match(/^(\s+)(\S.*)$/s)
        if (leadingSpaceMatch) {
          // 1. Chord over the whitespace
          segments.push({
            chord,
            text: leadingSpaceMatch[1]
          })
          // 2. Following lyrics without chord
          segments.push({
            chord: undefined,
            text: leadingSpaceMatch[2]
          })
          return
        }
      }

      segments.push({ chord, text })
    }

    // Check if the line has chord brackets
    let match: RegExpExecArray | null
    while ((match = chordRegex.exec(rawLine)) !== null) {
      const chordText = match[1]
      const textBefore = rawLine.substring(lastIndex, match.index)

      // If text before chord exists, save previous segment
      if (textBefore.length > 0 || currentChord !== undefined) {
        pushSegment(currentChord, textBefore)
        currentChord = undefined
      }

      // If the bracketed item is actually a musical chord
      if (parseChord(chordText)) {
        currentChord = chordText
      } else if (isSectionHeader(chordText)) {
        // Section header embedded inside line
        segments.push({
          chord: undefined,
          text: `[${chordText}]`
        })
      } else {
        // Other bracketed text
        currentChord = chordText
      }

      lastIndex = match.index + match[0].length
    }

    // Trailing text after the last chord
    const remainingText = rawLine.substring(lastIndex)
    if (remainingText.length > 0 || currentChord !== undefined) {
      pushSegment(currentChord, remainingText)
    }

    // If no segments were parsed (e.g., line without any chords)
    if (segments.length === 0) {
      segments.push({ text: rawLine })
    }

    parsedLines.push({
      type: 'lyric',
      segments
    })
  }

  return {
    title,
    artist,
    key,
    capo,
    tempo,
    lines: parsedLines
  }
}

/**
 * Transpose all chords inside a ChordPro string by semitones
 * Also optionally adjusts the {key: X} directive if present
 */
export function transposeChordPro(
  content: string,
  semitones: number,
  preferFlats?: boolean,
  targetNotation?: NotationSystem
): string {
  if (semitones === 0 && !targetNotation) return content

  return content.replace(/\[([^\]]+)\]/g, (match, chordInside) => {
    // If it's a section header, don't transpose
    if (isSectionHeader(chordInside)) return match

    const transposed = transposeChord(chordInside, semitones, preferFlats, targetNotation)
    return `[${transposed}]`
  }).replace(/\{(key|k):\s*([^}]+)\}/gi, (_match, directive, keyVal) => {
    const cleanKey = keyVal.trim()
    const transposedKey = transposeChord(cleanKey, semitones, preferFlats, targetNotation)
    return `{${directive}: ${transposedKey}}`
  })
}

/**
 * Switch chord notation (Anglo <-> Latin) in a ChordPro string
 */
export function changeChordProNotation(content: string, targetNotation: NotationSystem): string {
  return content.replace(/\[([^\]]+)\]/g, (match, chordInside) => {
    if (isSectionHeader(chordInside)) return match
    return `[${convertNotation(chordInside, targetNotation)}]`
  }).replace(/\{(key|k):\s*([^}]+)\}/gi, (_match, directive, keyVal) => {
    const cleanKey = keyVal.trim()
    return `{${directive}: ${convertNotation(cleanKey, targetNotation)}}`
  })
}
