import React from 'react'
import { getGuitarChordFingering } from '../music/guitarChords'

import type { ChordFingering } from '../types/song'

interface ChordDiagramProps {
  chord: string
  fingering?: ChordFingering
  width?: number
  height?: number
  showName?: boolean
}

export const ChordDiagram: React.FC<ChordDiagramProps> = ({
  chord,
  fingering: passedFingering,
  width = 130,
  height = 150,
  showName = true,
}) => {
  const fingering = passedFingering || getGuitarChordFingering(chord)

  if (!fingering) {
    return (
      <div className="flex flex-col items-center justify-center p-3 text-xs text-zinc-400 bg-zinc-900/60 rounded-xl border border-zinc-800">
        <span className="font-bold text-amber-400 mb-1">{chord}</span>
        <span>Sin diagrama</span>
      </div>
    )
  }

  const { frets, fingers, barres } = fingering
  const minFret = Math.min(...frets.filter(f => f > 0))
  const maxFret = Math.max(...frets.filter(f => f > 0))
  
  let baseFret = fingering.baseFret || 1
  if (baseFret === 1 && maxFret > 4 && minFret > 1) {
    baseFret = minFret
  }

  const numFrets = 4
  const startX = 24
  const endX = width - 24
  const startY = showName ? 34 : 22
  const endY = height - 20
  const stringSpacing = (endX - startX) / 5
  const fretSpacing = (endY - startY) / numFrets

  return (
    <div className="inline-flex flex-col items-center select-none bg-zinc-900/90 rounded-2xl p-2.5 border border-emerald-900/40 shadow-xl">
      {showName && (
        <span className="font-black text-sm text-emerald-400 mb-0.5 tracking-wide">{chord}</span>
      )}
      <svg width={width} height={height} className="overflow-visible">
        {/* Nut (thick if baseFret === 1) */}
        {baseFret === 1 ? (
          <line
            x1={startX}
            y1={startY}
            x2={endX}
            y2={startY}
            stroke="#a1a1aa"
            strokeWidth="4"
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
              strokeWidth="1.5"
            />
            {/* Base fret indicator */}
            <text
              x={startX - 10}
              y={startY + fretSpacing * 0.7}
              fill="#10b981"
              fontSize="11"
              fontWeight="bold"
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
              strokeWidth="1.2"
            />
          )
        })}

        {/* Strings (vertical lines: String 6 low E on left to String 1 high E on right) */}
        {Array.from({ length: 6 }).map((_, i) => {
          const x = startX + i * stringSpacing
          return (
            <line
              key={`string-${i}`}
              x1={x}
              y1={startY}
              x2={x}
              y2={endY}
              stroke="#71717a"
              strokeWidth={1.8 - i * 0.2}
            />
          )
        })}

        {/* Barre indicators */}
        {barres?.map((barre, idx) => {
          const relativeFret = barre.fret - (baseFret - 1)
          if (relativeFret >= 1 && relativeFret <= numFrets) {
            const y = startY + (relativeFret - 0.5) * fretSpacing
            const x1 = startX + (6 - barre.fromString) * stringSpacing
            const x2 = startX + (6 - barre.toString) * stringSpacing
            return (
              <line
                key={`barre-${idx}`}
                x1={x1}
                y1={y}
                x2={x2}
                y2={y}
                stroke="#10b981"
                strokeWidth="10"
                strokeLinecap="round"
                opacity="0.9"
              />
            )
          }
          return null
        })}

        {/* Finger dots, X and O */}
        {frets.map((fretVal, strIdx) => {
          const x = startX + strIdx * stringSpacing

          // Muted string (X)
          if (fretVal === -1) {
            return (
              <text
                key={`mute-${strIdx}`}
                x={x}
                y={startY - 6}
                fill="#ef4444"
                fontSize="12"
                fontWeight="bold"
                textAnchor="middle"
              >
                ×
              </text>
            )
          }

          // Open string (O)
          if (fretVal === 0) {
            return (
              <circle
                key={`open-${strIdx}`}
                cx={x}
                cy={startY - 8}
                r="3.5"
                fill="none"
                stroke="#22c55e"
                strokeWidth="1.8"
              />
            )
          }

          // Pressed string
          const relativeFret = fretVal - (baseFret - 1)
          if (relativeFret >= 1 && relativeFret <= numFrets) {
            const y = startY + (relativeFret - 0.5) * fretSpacing
            const fingerNum = fingers ? fingers[strIdx] : undefined
            return (
              <g key={`dot-${strIdx}`}>
                <circle cx={x} cy={y} r="6" fill="#10b981" />
                {fingerNum && fingerNum > 0 && (
                  <text
                    x={x}
                    y={y + 3.5}
                    fill="#052e16"
                    fontSize="9"
                    fontWeight="black"
                    textAnchor="middle"
                  >
                    {fingerNum}
                  </text>
                )}
              </g>
            )
          }

          return null
        })}
      </svg>
    </div>
  )
}
