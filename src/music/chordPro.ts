import type { NotationSystem, ParsedLine, ParsedSong, ChordSegment } from '../types/song'
import { parseChord, transposeChord, convertNotation } from './musicTheory'

// Common section tags that shouldn't be treated as musical chords
const SECTION_KEYWORDS = new Set([
  'INTRO', 'CORO', 'VERSO', 'VERSO 1', 'VERSO 2', 'VERSO 3', 'VERSE', 'VERSE 1', 'VERSE 2', 'CHORUS',
  'PUENTE', 'BRIDGE', 'SOLO', 'OUTRO', 'FINAL', 'PRE-CORO', 'PRE-CHORUS', 'ESTRIBILLO', 'INTERLUDIO',
  'INTERLUDE', 'TAB', 'RIFF'
])

export function isSectionHeader(text: string): boolean {
  // Strip trailing duration markers like {30}, {30s}, 30s, : 30s
  const clean = text
    .replace(/\{[^}]*\}$/, '')
    .replace(/(?:[:\s-]|\s*\{)\s*\d+\s*(?:s|seg)?\}?$/i, '')
    .trim()
    .toUpperCase()
  if (SECTION_KEYWORDS.has(clean)) return true
  const prefixes = [
    'VERSO', 'VERSE', 'PARTE', 'PART', 'CORO', 'CHORUS',
    'ESTRIBILLO', 'PUENTE', 'BRIDGE', 'INTRO', 'INTERLUDIO',
    'INTERLUDE', 'SOLO', 'OUTRO', 'FINAL', 'PRE-CORO', 'PRE-CHORUS', 'TAB', 'RIFF'
  ]
  return prefixes.some(p => clean.startsWith(p))
}

/**
 * Parses a section header line and extracts title and optional explicit duration in seconds.
 * Supports:
 *   [Intro]{30}
 *   [Verso 1]{25}
 *   [Intro] {30s}
 *   [Intro: 30s]
 *   [Intro - 30s]
 *   {comment: Intro}{30}
 */
export function parseSectionLine(rawLine: string): { title: string; explicitSec?: number } | null {
  const trimmed = rawLine.trim()
  if (!trimmed) return null

  // Pattern 1: [Intro]{30} or [Verso 1]{25} or [Intro] {30} or [Intro]{30s} or [Intro]
  const bracketMatch = trimmed.match(/^\[([^\]]+)\](?:\s*\{(\d+)(?:s|seg)?\})?$/i)
  if (bracketMatch) {
    let title = bracketMatch[1].trim()
    let sec = bracketMatch[2] ? parseInt(bracketMatch[2], 10) : undefined

    // Also support [Intro 30s] or [Intro: 30s] or [Intro - 30s]
    if (sec === undefined) {
      const innerMatch = title.match(/(?:[:\s-]|\s*\{)\s*(\d+)\s*(?:s|seg)?\}?$/i)
      if (innerMatch && innerMatch.index !== undefined) {
        const candidateTitle = title.substring(0, innerMatch.index).trim()
        if (isSectionHeader(candidateTitle)) {
          title = candidateTitle
          sec = parseInt(innerMatch[1], 10)
        }
      }
    }

    if (isSectionHeader(title)) {
      return {
        title: title.replace(/[:/]/g, '').trim(),
        explicitSec: sec
      }
    }
  }

  // Pattern 2: {comment: Intro}{30} or {c: Intro 30s}
  const commentMatch = trimmed.match(/^\{c(?:omment)?:\s*([^}]+)\}(?:\s*\{(\d+)(?:s|seg)?\})?$/i)
  if (commentMatch) {
    let title = commentMatch[1].trim()
    let sec = commentMatch[2] ? parseInt(commentMatch[2], 10) : undefined

    if (sec === undefined) {
      const innerMatch = title.match(/(?:[:\s-]|\s*\{)\s*(\d+)\s*(?:s|seg)?\}?$/i)
      if (innerMatch && innerMatch.index !== undefined) {
        sec = parseInt(innerMatch[1], 10)
        title = title.substring(0, innerMatch.index).trim()
      }
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
