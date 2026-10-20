import React, { useState, useEffect } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import type { NotationSystem } from '../types/song'
import { getBassChordInfo } from '../music/bassChords'

interface BassChordDiagramProps {
  chord: string
  notation?: NotationSystem
  preferFlats?: boolean
  width?: number
  height?: number
}

export const BassChordDiagram: React.FC<BassChordDiagramProps> = ({
  chord,
  notation = 'anglo',
  preferFlats = false,
  width = 230,
  height = 240
}) => {
  const [numStrings, setNumStrings] = useState<4 | 5>(4)
  const [selectedVarIndex, setSelectedVarIndex] = useState(0)

  // Reset variation when chord or strings change
  useEffect(() => {
    setSelectedVarIndex(0)
  }, [chord, numStrings])

  const bassInfo = getBassChordInfo(chord, preferFlats, notation, numStrings)

  if (!bassInfo) {
    return (
      <div className="flex flex-col items-center justify-center p-4 text-xs text-zinc-400 bg-zinc-900/60 rounded-xl border border-zinc-800">
        <span className="font-bold text-amber-400 mb-1">{chord}</span>
        <span>Sin digitación de bajo disponible</span>
      </div>
    )
  }

  const variations = bassInfo.variations || []
  const activeVariation = variations[selectedVarIndex] || variations[0] || {
    primaryPosition: bassInfo.primaryPosition,
    recommendedPositions: bassInfo.recommendedPositions,
    label: 'Posición Estándar',
    description: `Cuerda ${bassInfo.primaryPosition.stringName} · Traste ${bassInfo.primaryPosition.fret}`,
    patternDescription: bassInfo.patternDescription,
    playingTip: bassInfo.playingTip
  }

  const { primaryPosition, recommendedPositions } = activeVariation
  const { primaryBassNote, isSlashChord } = bassInfo

  // Determine fret window (4 frets to show based on active variation)
  const allFrets = recommendedPositions.map(p => p.fret).filter(f => f > 0)
  const minFret = allFrets.length > 0 ? Math.min(...allFrets) : 0
  const maxFret = allFrets.length > 0 ? Math.max(...allFrets) : 4

  let baseFret = 1
  if (minFret > 2 && maxFret > 4) {
    baseFret = minFret
  }

  const numFrets = 4
  const startX = 38
  const endX = width - 24
  const startY = 32
  const endY = height - 28

  const stringCount = numStrings
  const stringSpacing = (endX - startX) / (stringCount - 1)
  const fretSpacing = (endY - startY) / numFrets

  // Strings ordered left to right:
  // 4 strings: String 4 (E, thickest), String 3 (A), String 2 (D), String 1 (G, thinnest)
  // 5 strings: String 5 (B, thickest), String 4 (E), String 3 (A), String 2 (D), String 1 (G)
  const stringNames = numStrings === 5
    ? [{ num: 5, name: 'B', strokeWidth: 3.8 },
       { num: 4, name: 'E', strokeWidth: 3.2 },
       { num: 3, name: 'A', strokeWidth: 2.5 },
       { num: 2, name: 'D', strokeWidth: 1.8 },
       { num: 1, name: 'G', strokeWidth: 1.2 }]
    : [{ num: 4, name: 'E', strokeWidth: 3.4 },
       { num: 3, name: 'A', strokeWidth: 2.6 },
       { num: 2, name: 'D', strokeWidth: 1.8 },
       { num: 1, name: 'G', strokeWidth: 1.2 }]

  const getStringX = (stringNum: number) => {
    const idx = stringNames.findIndex(s => s.num === stringNum)
    return startX + (idx >= 0 ? idx : 0) * stringSpacing
  }

  return (
    <div className="flex flex-col items-center select-none w-full max-w-sm">
      {/* 4 vs 5 Strings Selector */}
      <div className="flex items-center gap-1.5 mb-2 bg-zinc-800/80 p-1 rounded-xl border border-zinc-700/80">
        <button
          type="button"
          onClick={() => setNumStrings(4)}
          className={`px-3 py-1 text-xs font-bold rounded-lg transition ${
            numStrings === 4
              ? 'bg-emerald-600 text-white shadow-sm'
              : 'text-zinc-400 hover:text-white'
          }`}
        >
          Bajo 4 Cuerdas
        </button>
        <button
          type="button"
          onClick={() => setNumStrings(5)}
          className={`px-3 py-1 text-xs font-bold rounded-lg transition ${
            numStrings === 5
              ? 'bg-emerald-600 text-white shadow-sm'
              : 'text-zinc-400 hover:text-white'
          }`}
        >
          Bajo 5 Cuerdas
        </button>
      </div>

      {/* Variations Carousel */}
      {variations.length > 1 && (
        <div className="flex items-center justify-between w-full bg-zinc-800/90 px-2.5 py-1.5 rounded-xl border border-zinc-700/80 mb-2.5 text-xs shadow-sm">
          <button
            type="button"
            onClick={() => setSelectedVarIndex(i => Math.max(0, i - 1))}
            disabled={selectedVarIndex === 0}
            className="p-1 text-zinc-300 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed rounded-lg hover:bg-zinc-700 transition"
            title="Posición anterior"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <div className="text-center px-1">
            <span className="font-bold text-white text-xs block leading-tight">
              {activeVariation.label}
            </span>
            <span className="text-[10px] text-emerald-400 font-medium">
              {activeVariation.description} · ({selectedVarIndex + 1} de {variations.length})
            </span>
          </div>

          <button
            type="button"
            onClick={() => setSelectedVarIndex(i => Math.min(variations.length - 1, i + 1))}
            disabled={selectedVarIndex === variations.length - 1}
            className="p-1 text-zinc-300 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed rounded-lg hover:bg-zinc-700 transition"
            title="Siguiente posición"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* SVG Fretboard */}
      <div className="bg-zinc-950/70 p-3 rounded-2xl border border-emerald-900/40 shadow-inner flex flex-col items-center w-full">
        <svg width={width} height={height} className="overflow-visible">
          {/* String Labels at top */}
          {stringNames.map((s, idx) => {
            const x = startX + idx * stringSpacing
            return (
              <text
                key={`label-${s.num}`}
                x={x}
                y={startY - 14}
                fill="#a1a1aa"
                fontSize="11"
                fontWeight="900"
                fontFamily="system-ui"
                textAnchor="middle"
              >
                {s.name}
              </text>
            )
          })}

          {/* Nut or Base Fret line */}
          {baseFret === 1 ? (
            <line
              x1={startX}
              y1={startY}
              x2={endX}
              y2={startY}
              stroke="#e4e4e7"
              strokeWidth="4.5"
              strokeLinecap="round"
            />
          ) : (
            <>
              <line
                x1={startX}
                y1={startY}
                x2={endX}
                y2={startY}
                stroke="#71717a"
                strokeWidth="2"
              />
              <text
                x={startX - 10}
                y={startY + fretSpacing * 0.7}
                fill="#10b981"
                fontSize="12"
                fontWeight="900"
                fontFamily="system-ui"
                textAnchor="end"
              >
                {baseFret}fr
              </text>
            </>
          )}

          {/* Frets (horizontal lines) */}
          {Array.from({ length: numFrets + 1 }).map((_, i) => {
            if (i === 0 && baseFret === 1) return null
            const y = startY + i * fretSpacing
            return (
              <line
                key={`fret-${i}`}
                x1={startX}
                y1={y}
                x2={endX}
                y2={y}
                stroke="#52525b"
                strokeWidth="1.5"
              />
            )
          })}

          {/* Fret marker inlays (dots at frets 3, 5, 7, 9, 12) */}
          {Array.from({ length: numFrets }).map((_, i) => {
            const currentFretNumber = baseFret + i
            const midX = (startX + endX) / 2
            const midY = startY + i * fretSpacing + fretSpacing / 2

            if ([3, 5, 7, 9].includes(currentFretNumber)) {
              return (
                <circle
                  key={`dot-${currentFretNumber}`}
                  cx={midX}
                  cy={midY}
                  r="4.5"
                  fill="#3f3f46"
                  opacity="0.65"
                />
              )
            }
            if (currentFretNumber === 12) {
              return (
                <g key={`double-dot-${currentFretNumber}`}>
                  <circle cx={midX - 10} cy={midY} r="4" fill="#3f3f46" opacity="0.65" />
                  <circle cx={midX + 10} cy={midY} r="4" fill="#3f3f46" opacity="0.65" />
                </g>
              )
            }
            return null
          })}

          {/* Strings (vertical lines with realistic gauges) */}
          {stringNames.map((s, idx) => {
            const x = startX + idx * stringSpacing
            return (
              <line
                key={`string-${s.num}`}
                x1={x}
                y1={startY}
                x2={x}
                y2={endY}
                stroke="#a1a1aa"
                strokeWidth={s.strokeWidth}
              />
            )
          })}

          {/* Render Notes & Markers */}
          {recommendedPositions.map((pos, pIdx) => {
            const x = getStringX(pos.stringNumber)

            // If open string (fret 0)
            if (pos.fret === 0) {
              const isOpenPrimary = pos.degree === 'root'
              return (
                <g key={`open-${pIdx}`}>
                  <circle
                    cx={x}
                    y={startY - 6}
                    r="6.5"
                    fill={isOpenPrimary ? '#059669' : '#d97706'}
                    stroke="#ffffff"
                    strokeWidth="1.5"
                  />
                  <text
                    x={x}
                    y={startY - 3}
                    fill="#ffffff"
                    fontSize="8.5"
                    fontWeight="bold"
                    textAnchor="middle"
                  >
                    O
                  </text>
                </g>
              )
            }

            // If fretted note falls within current visible window
            const fretRelative = pos.fret - baseFret
            if (fretRelative < 0 || fretRelative >= numFrets) return null

            const y = startY + fretRelative * fretSpacing + fretSpacing / 2
            const isRoot = pos.degree === 'root'
            const isFifth = pos.degree === 'fifth'
            const isThird = pos.degree === 'third'

            const circleFill = isRoot
              ? '#059669' // emerald-600
              : isFifth
              ? '#d97706' // amber-600
              : isThird
              ? '#2563eb' // blue-600
              : '#7c3aed' // violet

            const circleRadius = isRoot ? 11 : 9.5

            return (
              <g key={`note-${pIdx}`} className="transition-transform">
                <circle
                  cx={x}
                  cy={y}
                  r={circleRadius}
                  fill={circleFill}
                  stroke="#ffffff"
                  strokeWidth={isRoot ? 2 : 1.2}
                  filter="drop-shadow(0px 2px 4px rgba(0,0,0,0.5))"
                />
                <text
                  x={x}
                  y={y + 3.5}
                  fill="#ffffff"
                  fontSize={isRoot ? '9.5' : '8.5'}
                  fontWeight="900"
                  fontFamily="system-ui"
                  textAnchor="middle"
                >
                  {pos.noteName}
                </text>
              </g>
            )
          })}
        </svg>

        {/* Legend */}
        <div className="flex items-center justify-center gap-3 mt-2 text-[11px] font-bold">
          <div className="flex items-center gap-1 text-emerald-400">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
            <span>Tónica ({primaryBassNote})</span>
          </div>
          <div className="flex items-center gap-1 text-amber-400">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" />
            <span>5ª Justa ({bassInfo.fifthNote})</span>
          </div>
          <div className="flex items-center gap-1 text-blue-400">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-500 inline-block" />
            <span>3ª ({bassInfo.thirdNote})</span>
          </div>
        </div>
      </div>

      {/* Guide Cards */}
      <div className="mt-2.5 w-full bg-zinc-900 border border-zinc-800 rounded-2xl p-3 text-left">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs text-zinc-400 font-bold uppercase tracking-wider">
            Posición:
          </span>
          <span className="text-xs font-black px-2 py-0.5 bg-emerald-500/20 text-emerald-300 rounded-md border border-emerald-500/40">
            Cuerda {primaryPosition.stringName} · Traste {primaryPosition.fret}
          </span>
        </div>

        {isSlashChord && (
          <div className="mb-2 p-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs">
            <strong>Bajo Invertido:</strong> Toca la nota <strong>{primaryBassNote}</strong> (no la tónica del acorde).
          </div>
        )}

        <div className="text-xs text-zinc-300 space-y-1">
          <p className="font-semibold text-emerald-400">
            {activeVariation.patternDescription}
          </p>
          <p className="text-zinc-400 text-[11px] leading-relaxed">
            {activeVariation.playingTip}
          </p>
        </div>
      </div>
    </div>
  )
}
