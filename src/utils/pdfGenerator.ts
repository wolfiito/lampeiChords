import { jsPDF } from 'jspdf'
import type { ParsedSong, ParsedLine, NotationSystem } from '../types/song'
import { transposeChord, convertNotation } from '../music/musicTheory'
import { LOGO_GREEN_BASE64 } from './logoBase64'

export interface GenerateSongPdfOptions {
  parsed: ParsedSong
  effectiveKey: string
  capo: number
  tempo?: number
  semitoneShift: number
  notation: NotationSystem
  preferFlats?: boolean
  columns: 1 | 2 | 3
  size?: 'compact' | 'normal' | 'large'
  filename?: string
}

export interface SectionBox {
  id: number
  title?: string
  isRepeat?: boolean
  repeatTargetTitle?: string
  lines: ParsedLine[]
}

interface TypographyParams {
  scale: number
  baseSize: number
  lyricSize: number
  chordSize: number
  lineStep: number
  chordOffset: number
  chordOnlyStep: number
  lyricOnlyStep: number
  emptyStep: number
  headerHeight: number
  repeatBadgeHeight: number
  boxMarginBottom: number
}

interface ColumnPlacement {
  colIndex: number
  box: SectionBox
  linesToRender: ParsedLine[]
  includeHeader: boolean
  isContinuation?: boolean
  estimatedHeight: number
}

interface DistributionResult {
  fits: boolean
  columns: ColumnPlacement[][]
}

function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/[()[\]{}:/\\-]/g, '')
    .replace(/\b(1|2|3|4|5|i|ii|iii)\b/g, '')
    .trim()
}

function isRepeatNoteText(line: ParsedLine): boolean {
  const fullText = (line.segments || []).map(s => s.text).join('').trim().toLowerCase()
  return (
    fullText.length > 0 &&
    (fullText.includes('repite') ||
      fullText.includes('repeat') ||
      fullText.includes('volver a') ||
      fullText.startsWith('x') ||
      fullText.endsWith('x') ||
      fullText === '(coro)' ||
      fullText === 'coro' ||
      fullText === '(puente)' ||
      fullText === 'puente')
  )
}

function buildSectionBoxes(lines: ParsedLine[]): SectionBox[] {
  const boxes: SectionBox[] = []
  let currentBox: SectionBox = {
    id: 0,
    lines: []
  }

  for (const line of lines) {
    if (line.type === 'directive') continue

    if (line.type === 'comment') {
      if (currentBox.title || currentBox.lines.length > 0) {
        boxes.push(currentBox)
      }
      currentBox = {
        id: boxes.length,
        title: (line.comment || '').trim(),
        lines: []
      }
      continue
    }

    currentBox.lines.push(line)
  }

  if (currentBox.title || currentBox.lines.length > 0) {
    boxes.push(currentBox)
  }

  // Detect repeated sections (e.g. empty [Coro] after an earlier [Coro])
  const seenSections = new Map<string, string>()

  for (const box of boxes) {
    if (!box.title) continue
    const norm = normalizeTitle(box.title)
    const lyricLines = box.lines.filter(l => l.type === 'lyric')
    const hasLyrics = lyricLines.length > 0
    const isSingleRepeatNote = lyricLines.length === 1 && isRepeatNoteText(lyricLines[0])

    if (seenSections.has(norm) && (!hasLyrics || isSingleRepeatNote)) {
      box.isRepeat = true
      box.repeatTargetTitle = seenSections.get(norm)
    } else if (hasLyrics) {
      if (!seenSections.has(norm)) {
        seenSections.set(norm, box.title)
      }
    }
  }

  return boxes
}

function getTypographyParams(baseSize: number, scale: number): TypographyParams {
  const lyricSize = baseSize * scale
  const chordSize = Math.max(6.5, lyricSize * 0.88)
  const lineStep = lyricSize * 2.0 // at 12pt -> 24 pt
  const chordOffset = lyricSize * 0.90 // at 12pt -> 10.8 pt
  const chordOnlyStep = lyricSize * 1.45 // at 12pt -> 17.4 pt
  const lyricOnlyStep = lyricSize * 1.35 // at 12pt -> 16.2 pt
  const emptyStep = Math.max(3, 5 * scale)
  const headerHeight = 16 * scale
  const repeatBadgeHeight = 16 * scale
  const boxMarginBottom = Math.max(4, 9 * scale)

  return {
    scale,
    baseSize,
    lyricSize,
    chordSize,
    lineStep,
    chordOffset,
    chordOnlyStep,
    lyricOnlyStep,
    emptyStep,
    headerHeight,
    repeatBadgeHeight,
    boxMarginBottom
  }
}

function getLineHeight(line: ParsedLine, params: TypographyParams): number {
  if (line.type === 'empty') {
    return params.emptyStep
  }
  const hasChords = (line.segments || []).some(s => !!s.chord)
  const hasLyrics = (line.segments || []).some(s => (s.text || '').trim().length > 0)
  if (hasChords && hasLyrics) {
    return params.lineStep
  } else if (hasChords) {
    return params.chordOnlyStep
  } else {
    return params.lyricOnlyStep
  }
}

function calculateBoxHeight(box: SectionBox, params: TypographyParams): number {
  if (box.isRepeat) {
    return params.repeatBadgeHeight + params.boxMarginBottom
  }

  let h = box.title ? params.headerHeight : 0
  for (const line of box.lines) {
    h += getLineHeight(line, params)
  }
  h += params.boxMarginBottom
  return h
}

function tryDistributeBoxes(
  boxes: SectionBox[],
  numCols: number,
  params: TypographyParams,
  usableHeight: number
): DistributionResult {
  if (numCols === 1) {
    let totalH = 0
    const colPlacements: ColumnPlacement[] = []
    for (const box of boxes) {
      const h = calculateBoxHeight(box, params)
      totalH += h
      colPlacements.push({
        colIndex: 0,
        box,
        linesToRender: box.lines,
        includeHeader: !box.isRepeat && !!box.title,
        estimatedHeight: h
      })
    }
    return {
      fits: totalH <= usableHeight,
      columns: [colPlacements]
    }
  }

  // Multi-column distribution (2 or 3 columns)
  const totalH = boxes.reduce((sum, b) => sum + calculateBoxHeight(b, params), 0)
  const targetPerCol = totalH / numCols

  const cols: ColumnPlacement[][] = Array.from({ length: numCols }, () => [])
  const colHeights = new Array(numCols).fill(0)

  let currentCol = 0

  for (let bIdx = 0; bIdx < boxes.length; bIdx++) {
    const box = boxes[bIdx]
    const boxH = calculateBoxHeight(box, params)

    const fitsInCurrent = colHeights[currentCol] + boxH <= usableHeight
    const reachesTarget =
      colHeights[currentCol] > 0 &&
      colHeights[currentCol] + boxH * 0.5 >= targetPerCol &&
      currentCol < numCols - 1

    if ((!fitsInCurrent || reachesTarget) && currentCol < numCols - 1) {
      let remainingH = 0
      for (let r = bIdx; r < boxes.length; r++) {
        remainingH += calculateBoxHeight(boxes[r], params)
      }
      const remainingCols = numCols - (currentCol + 1)
      const maxRemainingCapacity = remainingCols * usableHeight

      if (remainingH <= maxRemainingCapacity || !fitsInCurrent) {
        currentCol++
      }
    }

    if (colHeights[currentCol] + boxH <= usableHeight) {
      cols[currentCol].push({
        colIndex: currentCol,
        box,
        linesToRender: box.lines,
        includeHeader: !box.isRepeat && !!box.title,
        estimatedHeight: boxH
      })
      colHeights[currentCol] += boxH
    } else {
      // Split single box across columns if too tall
      const headerH = box.title ? params.headerHeight : 0
      const spaceLeft = usableHeight - colHeights[currentCol]

      if (spaceLeft < headerH + params.lineStep && currentCol < numCols - 1) {
        currentCol++
        bIdx--
        continue
      }

      const col1Lines: ParsedLine[] = []
      const col2Lines: ParsedLine[] = []
      let accH = box.title ? headerH : 0

      for (const line of box.lines) {
        const lineH = getLineHeight(line, params)
        if (accH + lineH + params.boxMarginBottom <= spaceLeft) {
          col1Lines.push(line)
          accH += lineH
        } else {
          col2Lines.push(line)
        }
      }

      if (col1Lines.length > 0) {
        cols[currentCol].push({
          colIndex: currentCol,
          box,
          linesToRender: col1Lines,
          includeHeader: !box.isRepeat && !!box.title,
          estimatedHeight: accH
        })
        colHeights[currentCol] += accH
      }

      if (currentCol < numCols - 1 && col2Lines.length > 0) {
        currentCol++
        let col2H = 0
        for (const l of col2Lines) col2H += getLineHeight(l, params)
        col2H += params.boxMarginBottom

        cols[currentCol].push({
          colIndex: currentCol,
          box,
          linesToRender: col2Lines,
          includeHeader: false,
          isContinuation: true,
          estimatedHeight: col2H
        })
        colHeights[currentCol] += col2H
      } else if (col2Lines.length > 0) {
        return { fits: false, columns: cols }
      }
    }
  }

  const allFit = colHeights.every(h => h <= usableHeight)
  return { fits: allFit, columns: cols }
}

const CANDIDATE_SCALES = [
  1.0,   // Arial 12.0 pt (Base)
  0.96,  // Arial 11.5 pt
  0.92,  // Arial 11.0 pt
  0.88,  // Arial 10.5 pt
  0.84,  // Arial 10.0 pt
  0.80,  // Arial 9.6 pt
  0.75,  // Arial 9.0 pt
  0.70,  // Arial 8.4 pt
  0.65,  // Arial 7.8 pt
  0.60   // Arial 7.2 pt
]

export function generateDirectSongPdf(options: GenerateSongPdfOptions): void {
  const {
    parsed,
    effectiveKey,
    capo,
    tempo,
    semitoneShift,
    notation,
    preferFlats,
    columns = 2,
    size = 'normal',
    filename
  } = options

  // Always Standard A4: 210 x 297 mm (595.28 x 841.89 pt)
  const doc = new jsPDF({
    unit: 'pt',
    format: 'a4',
    orientation: 'portrait',
    compress: true
  })

  const pageWidth = doc.internal.pageSize.getWidth()   // 595.28 pt
  const pageHeight = doc.internal.pageSize.getHeight() // 841.89 pt
  const leftMargin = 28
  const rightMargin = 28
  const availableWidth = pageWidth - leftMargin - rightMargin // 539.28 pt

  // ==========================================
  // HEADER
  // ==========================================
  const headerTop = 22

  // 1. Logo Lampei (left)
  try {
    doc.addImage(LOGO_GREEN_BASE64, 'PNG', leftMargin, headerTop, 22, 26)
  } catch (e) {
    console.warn('Could not add logo to PDF', e)
  }

  // 2. Brand Name (Arial / Helvetica Bold)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(12)
  doc.setTextColor(24, 24, 27) // zinc-900
  doc.text('chords', leftMargin + 30, headerTop + 14)

  const chordsWidth = doc.getTextWidth('chords')
  doc.setTextColor(5, 150, 105) // emerald-600
  doc.text('Lampei', leftMargin + 30 + chordsWidth, headerTop + 14)

  // 3. Song Title & Artist (Center)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(14)
  doc.setTextColor(15, 23, 42)
  doc.text(parsed.title || 'Sin Título', pageWidth / 2, headerTop + 13, { align: 'center' })

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8.5)
  doc.setTextColor(100, 116, 139)
  doc.text(parsed.artist || '', pageWidth / 2, headerTop + 24, { align: 'center' })

  // 4. Meta Badges (Right: Tempo, Capo, Tono)
  const metaY = headerTop + 15
  let metaRightX = pageWidth - rightMargin

  if (tempo) {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(113, 113, 122)
    doc.text(`${tempo} BPM`, metaRightX, metaY, { align: 'right' })
    metaRightX -= doc.getTextWidth(`${tempo} BPM`) + 8
  }

  if (capo > 0) {
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8.5)
    doc.setTextColor(180, 83, 9) // amber-700
    doc.text(`Capo ${capo}`, metaRightX, metaY, { align: 'right' })
    metaRightX -= doc.getTextWidth(`Capo ${capo}`) + 8
  }

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.setTextColor(5, 150, 105) // emerald-600
  doc.text(`Tono: ${effectiveKey}`, metaRightX, metaY, { align: 'right' })

  // 5. Divider Line
  const dividerY = headerTop + 33
  doc.setDrawColor(5, 150, 105)
  doc.setLineWidth(1.5)
  doc.line(leftMargin, dividerY, pageWidth - rightMargin, dividerY)

  // ==========================================
  // SECTION BOX MODEL & AUTO-FIT (ARIAL 12 BASE)
  // ==========================================
  const startY = dividerY + 12
  const maxY = pageHeight - 22
  const usableHeight = maxY - startY

  // Base font size: 12pt by default (as proposed), 10.5pt if compact, 14pt if large
  const baseSize = size === 'compact' ? 10.5 : size === 'large' ? 14 : 12.0

  // Column geometry
  const colGap = columns === 3 ? 12 : columns === 2 ? 18 : 0
  const totalGaps = (columns - 1) * colGap
  const colWidth = (availableWidth - totalGaps) / columns

  const getColX = (colIndex: number) => leftMargin + colIndex * (colWidth + colGap)

  // Build section boxes
  const boxes = buildSectionBoxes(parsed.lines)

  // Find optimal scale starting from 1.0 (Arial 12) down to fit exactly on 1 page
  let selectedParams = getTypographyParams(baseSize, 1.0)
  let distribution = tryDistributeBoxes(boxes, columns, selectedParams, usableHeight)

  for (const s of CANDIDATE_SCALES) {
    const candidateParams = getTypographyParams(baseSize, s)
    const candDist = tryDistributeBoxes(boxes, columns, candidateParams, usableHeight)
    if (candDist.fits) {
      selectedParams = candidateParams
      distribution = candDist
      break
    }
    // If we reach the last scale and still doesn't fit, use this smallest one
    selectedParams = candidateParams
    distribution = candDist
  }

  // Draw vertical column separators
  if (columns > 1) {
    doc.setDrawColor(228, 228, 231) // zinc-200
    doc.setLineWidth(0.5)
    for (let c = 1; c < columns; c++) {
      const sepX = getColX(c) - colGap / 2
      doc.line(sepX, startY, sepX, maxY)
    }
  }

  // ==========================================
  // RENDER COLUMNS & SECTION BOXES
  // ==========================================
  for (let c = 0; c < distribution.columns.length; c++) {
    const placements = distribution.columns[c]
    const colX = getColX(c)
    let currentY = startY

    for (const placement of placements) {
      const box = placement.box

      // Case A: Repeated section compact badge
      if (box.isRepeat) {
        const badgeH = selectedParams.repeatBadgeHeight
        doc.setFillColor(240, 253, 244) // emerald-50
        doc.setDrawColor(167, 243, 208) // emerald-200
        doc.setLineWidth(0.75)
        doc.roundedRect(colX, currentY, colWidth, badgeH, 3, 3, 'FD')

        doc.setFont('helvetica', 'bold')
        doc.setFontSize(Math.max(7.5, 9 * selectedParams.scale))
        doc.setTextColor(4, 120, 87) // emerald-700
        const badgeTitle = (box.repeatTargetTitle || box.title || 'CORO').toUpperCase()
        doc.text(
          `[ ${badgeTitle} ]  -  (Repite ${badgeTitle} anterior)`,
          colX + 8 * selectedParams.scale,
          currentY + badgeH * 0.68
        )

        currentY += badgeH + selectedParams.boxMarginBottom
        continue
      }

      // Case B: Regular section header
      if (placement.includeHeader && box.title) {
        const headerY = currentY + 9 * selectedParams.scale
        const secTitle = box.title.toUpperCase()

        // Little vertical accent bar
        doc.setDrawColor(5, 150, 105)
        doc.setLineWidth(2.5 * selectedParams.scale)
        doc.line(colX, headerY - 7.5 * selectedParams.scale, colX, headerY + 1.5 * selectedParams.scale)

        doc.setFont('helvetica', 'bold')
        doc.setFontSize(Math.max(8, 9.5 * selectedParams.scale))
        doc.setTextColor(4, 120, 87) // emerald-700
        doc.text(secTitle, colX + 5 * selectedParams.scale, headerY)

        currentY += selectedParams.headerHeight
      } else if (placement.isContinuation && box.title) {
        const headerY = currentY + 8 * selectedParams.scale
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(Math.max(7, 8 * selectedParams.scale))
        doc.setTextColor(113, 113, 122)
        doc.text(`${box.title.toUpperCase()} (cont.)`, colX + 2, headerY)
        currentY += selectedParams.headerHeight * 0.75
      }

      // Render lines within this section box
      for (const line of placement.linesToRender) {
        if (line.type === 'empty') {
          currentY += selectedParams.emptyStep
          continue
        }

        if (line.type === 'directive') continue

        const hasAnyChords = (line.segments || []).some(s => !!s.chord)
        const hasLyrics = (line.segments || []).some(s => (s.text || '').trim().length > 0)

        if (hasAnyChords && !hasLyrics) {
          // Line has ONLY chords (e.g. Intro or Solo)
          let curX = colX
          for (const seg of line.segments || []) {
            if (!seg.chord) continue
            let chordText = transposeChord(seg.chord, semitoneShift, preferFlats, notation)
            chordText = convertNotation(chordText, notation)

            doc.setFont('helvetica', 'bold')
            doc.setFontSize(selectedParams.chordSize)
            doc.setTextColor(4, 120, 87) // emerald-700
            doc.text(chordText, curX, currentY + selectedParams.chordSize)

            const cWidth = doc.getTextWidth(chordText)
            const spaceCount = (seg.text || '').replace(/[^\s]/g, '').length
            const gap = Math.max(20 * selectedParams.scale, (spaceCount || 1) * 14 * selectedParams.scale)
            curX += cWidth + gap
          }
          currentY += selectedParams.chordOnlyStep
        } else if (hasAnyChords && hasLyrics) {
          // Line has BOTH chords and lyrics
          let curX = colX
          const chordY = currentY + selectedParams.chordSize * 0.95
          const lyricY = currentY + selectedParams.chordOffset + selectedParams.lyricSize * 0.95

          for (const seg of line.segments || []) {
            let chordWidth = 0
            const hasWords = (seg.text || '').trim().length > 0

            if (seg.chord) {
              let chordText = transposeChord(seg.chord, semitoneShift, preferFlats, notation)
              chordText = convertNotation(chordText, notation)

              doc.setFont('helvetica', 'bold')
              doc.setFontSize(selectedParams.chordSize)
              doc.setTextColor(4, 120, 87) // emerald-700
              const chordDrawX = !hasWords ? curX + 1 : curX
              doc.text(chordText, chordDrawX, chordY)
              chordWidth = doc.getTextWidth(chordText)
            }

            let textWidth = 0
            if (seg.text) {
              doc.setFont('helvetica', 'normal')
              doc.setFontSize(selectedParams.lyricSize)
              doc.setTextColor(17, 24, 39) // zinc-900
              doc.text(seg.text, curX, lyricY)
              textWidth = doc.getTextWidth(seg.text)
            }

            // Step forward without collision
            if (seg.chord) {
              if (hasWords) {
                curX += Math.max(chordWidth + 4 * selectedParams.scale, textWidth)
              } else {
                const spaceCount = (seg.text || '').replace(/[^\s]/g, '').length
                const whitespaceGap = Math.max(12 * selectedParams.scale, (spaceCount || 1) * 8 * selectedParams.scale)
                curX += chordWidth + whitespaceGap
              }
            } else {
              curX += textWidth
            }
          }
          currentY += selectedParams.lineStep
        } else {
          // Pure lyric line without chords
          const lineText = line.segments?.map(s => s.text).join('') || ''
          if (lineText.trim()) {
            doc.setFont('helvetica', 'normal')
            doc.setFontSize(selectedParams.lyricSize)
            doc.setTextColor(17, 24, 39)
            doc.text(lineText, colX, currentY + selectedParams.lyricSize)
            currentY += selectedParams.lyricOnlyStep
          }
        }
      }

      currentY += selectedParams.boxMarginBottom
    }
  }

  // ==========================================
  // FOOTER (A4 / Arial Notice)
  // ==========================================
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7)
  doc.setTextColor(161, 161, 170) // zinc-400
  doc.text('chordsLampei · Hoja A4', leftMargin, pageHeight - 10)
  doc.text(
    `Arial ${selectedParams.lyricSize.toFixed(1)}pt · 1 Página`,
    pageWidth - rightMargin,
    pageHeight - 10,
    { align: 'right' }
  )

  // Save PDF immediately
  const cleanFilename = (filename || `${parsed.title || 'Cancion'} - chordsLampei`).replace(/[\\/:*?"<>|]/g, '')
  doc.save(`${cleanFilename}.pdf`)
}
