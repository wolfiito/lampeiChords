import { parseChord } from './musicTheory'

/**
 * Checks if a token is a valid chord (stripping parentheses/brackets if any)
 */
function isValidChordToken(token: string): boolean {
  const clean = token.replace(/^[([<{]+|[)\]}>,.:]+$/g, '').trim()
  if (!clean) return false
  return parseChord(clean) !== null
}

/**
 * Checks if a line consists predominantly of chords and spaces
 */
export function isChordLine(line: string): boolean {
  const trimmed = line.trim()
  if (!trimmed) return false

  // Section markers like "[Coro]" or "Intro:"
  if (/^\[?[a-zA-ZáéíóúÁÉÍÓÚ\s]+\]?:?$/.test(trimmed)) {
    const withoutSymbols = trimmed.replace(/[[\]:]/g, '').trim().toUpperCase()
    if (['CORO', 'CHORUS', 'VERSO', 'VERSE', 'INTRO', 'PUENTE', 'BRIDGE', 'OUTRO', 'SOLO'].includes(withoutSymbols)) {
      return false
    }
  }

  // Tokens separated by spaces
  const tokens = trimmed.split(/\s+/).filter(t => t.length > 0)
  if (tokens.length === 0) return false

  let chordCount = 0
  for (const token of tokens) {
    if (isValidChordToken(token)) {
      chordCount++
    }
  }

  // If more than 60% of tokens are valid chords, or if it's 1 token and that token is a chord
  return (chordCount / tokens.length) >= 0.6 || (tokens.length === 1 && chordCount === 1)
}

interface ChordPosition {
  chord: string
  index: number
}

function extractChordsWithPositions(line: string): ChordPosition[] {
  const result: ChordPosition[] = []
  // Match contiguous non-whitespace words
  const regex = /\S+/g
  let match: RegExpExecArray | null

  while ((match = regex.exec(line)) !== null) {
    const rawWord = match[0]
    const cleanChord = rawWord.replace(/^[([<{]+|[)\]}>,.:]+$/g, '').trim()
    if (isValidChordToken(cleanChord)) {
      result.push({
        chord: cleanChord,
        index: match.index
      })
    }
  }

  return result
}

/**
 * Converts traditional 2-line chord/lyric text (from LaCuerda, Ultimate-Guitar, TXT)
 * into standard ChordPro format.
 */
export function convertTraditionalToChordPro(rawText: string, metadata?: { title?: string; artist?: string; key?: string }): string {
  const lines = rawText.split(/\r?\n/)
  const outputLines: string[] = []

  if (metadata?.title) {
    outputLines.push(`{title: ${metadata.title}}`)
  }
  if (metadata?.artist) {
    outputLines.push(`{artist: ${metadata.artist}}`)
  }
  if (metadata?.key) {
    outputLines.push(`{key: ${metadata.key}}`)
  }
  if (metadata?.title || metadata?.artist || metadata?.key) {
    outputLines.push('')
  }

  let i = 0
  while (i < lines.length) {
    const line = lines[i]
    const trimmed = line.trim()

    // Detect section header: e.g. "Intro:", "[Coro]", "Verso 1:"
    const sectionMatch = trimmed.match(/^\[?([A-Za-z0-9áéíóúÁÉÍÓÚ\s-]+)\]?:?$/)
    if (sectionMatch && !isChordLine(trimmed)) {
      const sectionName = sectionMatch[1].trim()
      const upper = sectionName.toUpperCase()
      if (['INTRO', 'CORO', 'CHORUS', 'VERSO', 'VERSO 1', 'VERSO 2', 'VERSO 3', 'VERSE', 'VERSE 1', 'VERSE 2', 'PUENTE', 'BRIDGE', 'SOLO', 'OUTRO', 'FINAL'].includes(upper)) {
        outputLines.push(`\n[${sectionName}]`)
        i++
        continue
      }
    }

    if (isChordLine(line)) {
      const chords = extractChordsWithPositions(line)
      const nextLine = (i + 1 < lines.length) ? lines[i + 1] : ''

      // If next line is a lyric line (not empty, not another chord line, not a section header)
      if (nextLine.trim() && !isChordLine(nextLine) && !nextLine.trim().match(/^\[?[A-Za-z0-9áéíóúÁÉÍÓÚ\s-]+\]?:?$/)) {
        let merged = nextLine
        // Insert chords from right to left to keep string indices stable
        const reversedChords = [...chords].sort((a, b) => b.index - a.index)

        for (const { chord, index } of reversedChords) {
          if (index >= merged.length) {
            // Pad spaces if the lyric line is shorter than chord position
            merged = merged.padEnd(index, ' ') + `[${chord}]`
          } else {
            merged = merged.slice(0, index) + `[${chord}]` + merged.slice(index)
          }
        }

        outputLines.push(merged)
        i += 2 // skip both chord line and lyric line
        continue
      } else {
        // Standalone chord line (e.g. Intro with chords only: "C G Am F")
        const chordProLine = chords.map(c => `[${c.chord}]`).join(' ')
        outputLines.push(chordProLine)
        i++
        continue
      }
    } else {
      outputLines.push(line)
      i++
    }
  }

  return outputLines.join('\n')
}
