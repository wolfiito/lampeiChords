import type { NotationSystem, ParsedLine, ParsedSong, ChordSegment } from '../types/song'
import { parseChord, transposeChord, convertNotation } from './musicTheory'

// Common section tags that shouldn't be treated as musical chords
const SECTION_KEYWORDS = new Set([
  'INTRO', 'CORO', 'VERSO', 'VERSO 1', 'VERSO 2', 'VERSO 3', 'VERSE', 'VERSE 1', 'VERSE 2', 'CHORUS',
  'PUENTE', 'BRIDGE', 'SOLO', 'OUTRO', 'FINAL', 'PRE-CORO', 'PRE-CHORUS', 'ESTRIBILLO', 'INTERLUDIO',
  'INTERLUDE', 'TAB', 'RIFF'
])

export function isSectionHeader(text: string): boolean {
  const norm = text.trim().toUpperCase()
  if (SECTION_KEYWORDS.has(norm)) return true
  const prefixes = [
    'VERSO', 'VERSE', 'PARTE', 'PART', 'CORO', 'CHORUS',
    'ESTRIBILLO', 'PUENTE', 'BRIDGE', 'INTRO', 'INTERLUDIO',
    'INTERLUDE', 'SOLO', 'OUTRO', 'FINAL', 'PRE-CORO', 'PRE-CHORUS', 'TAB', 'RIFF'
  ]
  return prefixes.some(p => norm.startsWith(p))
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
        parsedLines.push({
          type: 'comment',
          comment: dVal
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

    // 3. Section header alone in square brackets, e.g. [Coro], [Intro], [Verso 1]
    const singleBracketMatch = trimmed.match(/^\[([^\]]+)\]$/)
    if (singleBracketMatch && isSectionHeader(singleBracketMatch[1])) {
      parsedLines.push({
        type: 'comment',
        comment: singleBracketMatch[1]
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
