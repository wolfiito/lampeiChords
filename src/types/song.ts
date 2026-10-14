export type NotationSystem = 'anglo' | 'latin' // C, D, E vs Do, Re, Mi

export interface Song {
  id: string
  title: string
  artist: string
  originalKey: string
  currentKey: string
  capo: number // Fret number (0 = no capo)
  tempo?: number // BPM
  timeSignature?: string // e.g. '4/4', '3/4', '6/8'
  tags: string[]
  content: string // ChordPro formatted text
  createdAt: number
  updatedAt: number
}

export interface ChordSegment {
  chord?: string
  text: string
}

export interface ParsedLine {
  type: 'lyric' | 'directive' | 'comment' | 'empty'
  segments?: ChordSegment[]
  directiveKey?: string
  directiveValue?: string
  comment?: string
}

export interface ParsedSong {
  title: string
  artist: string
  key: string
  capo: number
  tempo?: number
  lines: ParsedLine[]
}

export interface ChordFingering {
  frets: number[] // 6 strings from low E (6th) to high E (1st). -1 = mute (X), 0 = open
  fingers?: number[] // finger numbers 1, 2, 3, 4, 0
  barres?: { fromString: number; toString: number; fret: number }[]
  baseFret?: number // Default 1
}
