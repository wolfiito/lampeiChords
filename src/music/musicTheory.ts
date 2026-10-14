import type { NotationSystem } from '../types/song'

// Chromatic scales
export const CHROMATIC_SHARPS_ANGLO = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'] as const
export const CHROMATIC_FLATS_ANGLO  = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'] as const

export const CHROMATIC_SHARPS_LATIN = ['Do', 'Do#', 'Re', 'Re#', 'Mi', 'Fa', 'Fa#', 'Sol', 'Sol#', 'La', 'La#', 'Si'] as const
export const CHROMATIC_FLATS_LATIN  = ['Do', 'Reb', 'Re', 'Mib', 'Mi', 'Fa', 'Solb', 'Sol', 'Lab', 'La', 'Sib', 'Si'] as const

// Map note names to semitone index (0 to 11)
const NOTE_TO_SEMITONE: Record<string, number> = {
  // Anglo
  'C': 0, 'B#': 0, 'C#': 1, 'DB': 1, 'D': 2, 'D#': 3, 'EB': 3, 'E': 4, 'FB': 4,
  'F': 5, 'E#': 5, 'F#': 6, 'GB': 6, 'G': 7, 'G#': 8, 'AB': 8, 'A': 9, 'A#': 10, 'BB': 10, 'B': 11, 'CB': 11,
  // Latin
  'DO': 0, 'DO#': 1, 'REB': 1, 'RE': 2, 'RE#': 3, 'MIB': 3, 'MI': 4,
  'FA': 5, 'FA#': 6, 'SOLB': 6, 'SOL': 7, 'SOL#': 8, 'LAB': 8, 'LA': 9, 'LA#': 10, 'SIB': 10, 'SI': 11
}

// Keys that naturally use flats
const FLAT_KEYS = new Set(['F', 'BB', 'EB', 'AB', 'DB', 'GB', 'DM', 'GM', 'CM', 'FM', 'BBM', 'EBM'])

/**
 * Normalizes a note string to uppercase without spaces
 */
export function normalizeNote(note: string): string {
  return note.trim().toUpperCase()
}

/**
 * Returns semitone value (0-11) of a note or -1 if invalid
 */
export function getSemitone(note: string): number {
  const norm = normalizeNote(note)
  return NOTE_TO_SEMITONE[norm] ?? -1
}

/**
 * Determines whether a key or note prefers flats
 */
export function prefersFlats(keyOrChord: string): boolean {
  const norm = normalizeNote(keyOrChord)
  if (norm.includes('B') && !norm.startsWith('B') && !norm.startsWith('SI')) return true
  return FLAT_KEYS.has(norm)
}

/**
 * Converts a note from semitone number to name in Anglo or Latin
 */
export function semitoneToNote(semitone: number, useFlats = false, notation: NotationSystem = 'anglo'): string {
  const normalized = ((semitone % 12) + 12) % 12
  if (notation === 'latin') {
    return useFlats ? CHROMATIC_FLATS_LATIN[normalized] : CHROMATIC_SHARPS_LATIN[normalized]
  }
  return useFlats ? CHROMATIC_FLATS_ANGLO[normalized] : CHROMATIC_SHARPS_ANGLO[normalized]
}

/**
 * Converts any note or root between Anglo and Latin notation
 */
export function convertNotation(noteOrChord: string, targetNotation: NotationSystem): string {
  const parsed = parseChord(noteOrChord)
  if (!parsed) return noteOrChord

  const { root, quality, bass } = parsed
  const rootSemi = getSemitone(root)
  if (rootSemi === -1) return noteOrChord

  const isFlat = root.includes('b') || root.includes('B')
  const newRoot = semitoneToNote(rootSemi, isFlat, targetNotation)
  
  let newBass = ''
  if (bass) {
    const bassSemi = getSemitone(bass)
    if (bassSemi !== -1) {
      const bassFlat = bass.includes('b') || bass.includes('B')
      newBass = '/' + semitoneToNote(bassSemi, bassFlat, targetNotation)
    }
  }

  return `${newRoot}${quality}${newBass}`
}

export interface ParsedChord {
  root: string
  quality: string
  bass?: string
}

/**
 * Regex to extract Latin and Anglo chord components
 * Group 1: Root note (e.g. Sol#, Do, C#, Bb, Fa)
 * Group 2: Quality/Extension (e.g. m, maj7, sus4, 7b5)
 * Group 3: Optional Bass note (e.g. /Sol, /F#)
 */
const CHORD_REGEX = /^([A-Ga-g](?:#|b)?|Do|Re|Mi|Fa|Sol|La|Si|DO|RE|MI|FA|SOL|LA|SI)(?:#|b)?([^\s/]*)(?:\/([A-Ga-g](?:#|b)?|Do|Re|Mi|Fa|Sol|La|Si|DO|RE|MI|FA|SOL|LA|SI)(?:#|b)?)?$/

export function parseChord(chordStr: string): ParsedChord | null {
  const clean = chordStr.trim()
  if (!clean) return null

  // Detailed regex matching roots
  const latinRoots = ['Sol#', 'Solb', 'Do#', 'Dob', 'Re#', 'Reb', 'Fa#', 'Fab', 'La#', 'Lab', 'Si#', 'Sib', 'Sol', 'Do', 'Re', 'Mi', 'Fa', 'La', 'Si',
                      'SOL#', 'SOLB', 'DO#', 'DOB', 'RE#', 'REB', 'FA#', 'FAB', 'LA#', 'LAB', 'SI#', 'SIB', 'SOL', 'DO', 'RE', 'MI', 'FA', 'LA', 'SI']
  const angloRoots = ['C#', 'Db', 'D#', 'Eb', 'F#', 'Gb', 'G#', 'Ab', 'A#', 'Bb', 'B#', 'Cb', 'C', 'D', 'E', 'F', 'G', 'A', 'B']

  const allRoots = [...latinRoots, ...angloRoots]

  // Check if string starts with any known root
  for (const r of allRoots) {
    if (clean.startsWith(r)) {
      const remaining = clean.slice(r.length)
      if (remaining.includes('/')) {
        const [qual, bassPart] = remaining.split('/')
        return {
          root: r,
          quality: qual,
          bass: bassPart
        }
      }
      return {
        root: r,
        quality: remaining
      }
    }
  }

  // Fallback regex match
  const match = clean.match(CHORD_REGEX)
  if (!match) return null

  return {
    root: match[1],
    quality: match[2] || '',
    bass: match[3]
  }
}

/**
 * Transpose a single chord by semitones
 */
export function transposeChord(
  chordStr: string,
  semitones: number,
  preferFlatsFlag?: boolean,
  targetNotation?: NotationSystem
): string {
  const parsed = parseChord(chordStr)
  if (!parsed) return chordStr // Not a valid recognized chord, return as is

  const rootSemi = getSemitone(parsed.root)
  if (rootSemi === -1) return chordStr

  const isLatin = /^(Do|Re|Mi|Fa|Sol|La|Si)/i.test(parsed.root)
  const notation = targetNotation || (isLatin ? 'latin' : 'anglo')
  const useFlats = preferFlatsFlag !== undefined ? preferFlatsFlag : parsed.root.includes('b')

  const newRoot = semitoneToNote(rootSemi + semitones, useFlats, notation)

  let newBass = ''
  if (parsed.bass) {
    const bassSemi = getSemitone(parsed.bass)
    if (bassSemi !== -1) {
      const bassFlats = parsed.bass.includes('b') || useFlats
      newBass = '/' + semitoneToNote(bassSemi + semitones, bassFlats, notation)
    } else {
      newBass = '/' + parsed.bass
    }
  }

  return `${newRoot}${parsed.quality}${newBass}`
}

/**
 * Calculate semitones between two musical keys
 */
export function getDistanceBetweenKeys(fromKey: string, toKey: string): number {
  const semiFrom = getSemitone(fromKey)
  const semiTo = getSemitone(toKey)
  if (semiFrom === -1 || semiTo === -1) return 0
  let diff = semiTo - semiFrom
  if (diff > 6) diff -= 12
  if (diff < -6) diff += 12
  return diff
}

/**
 * Capo helper:
 * When you place a capo on fret N, you play chords transposed by -N semitones
 * to produce the original song pitch.
 */
export function getCapoChords(chord: string, capoFret: number, notation?: NotationSystem): string {
  if (capoFret <= 0) return chord
  return transposeChord(chord, -capoFret, false, notation)
}

/**
 * Suggest optimal Capo positions (0 to 6) based on easiest open chords
 */
export function suggestCapo(key: string): { fret: number; chordShapeKey: string; score: number }[] {
  const keySemi = getSemitone(key)
  if (keySemi === -1) return []

  const easyKeyScores: Record<string, number> = {
    'G': 10, 'C': 9, 'D': 9, 'Em': 10, 'Am': 9, 'A': 8, 'E': 8, 'Dm': 7
  }

  const suggestions = []
  for (let fret = 0; fret <= 7; fret++) {
    const shapeSemi = ((keySemi - fret) % 12 + 12) % 12
    const shapeKey = semitoneToNote(shapeSemi, false, 'anglo')
    const score = easyKeyScores[shapeKey] || 3
    suggestions.push({
      fret,
      chordShapeKey: shapeKey,
      score: score - (fret * 0.5) // slight penalty for high frets
    })
  }

  return suggestions.sort((a, b) => b.score - a.score)
}
