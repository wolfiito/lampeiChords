import React, { useState } from 'react'
import { X, Check } from 'lucide-react'
import { suggestCapo, transposeChord } from '../music/musicTheory'
import type { NotationSystem } from '../types/song'

interface CapoModalProps {
  isOpen: boolean
  onClose: () => void
  currentKey: string
  currentCapo: number
  notation: NotationSystem
  onApplyCapo: (fret: number) => void
}

export const CapoModal: React.FC<CapoModalProps> = ({
  isOpen,
  onClose,
  currentKey,
  currentCapo,
  notation,
  onApplyCapo
}) => {
  const [selectedFret, setSelectedFret] = useState<number>(currentCapo)

  if (!isOpen) return null

  const suggestions = suggestCapo(currentKey)
  const relativeKey = selectedFret > 0 
    ? transposeChord(currentKey, -selectedFret, false, notation)
    : currentKey

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-[94vw] sm:max-w-md bg-zinc-900 border border-emerald-900/60 rounded-3xl shadow-2xl p-4 sm:p-6 text-zinc-100 max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
          <div className="flex items-center gap-2">
            <div className="p-2.5 bg-emerald-500/20 text-emerald-400 rounded-2xl">
              <span className="text-xl">🎸</span>
            </div>
            <div>
              <h3 className="font-bold text-lg text-white">Calculadora de Cejilla / Capo</h3>
              <p className="text-xs text-zinc-400">Tono real: <strong className="text-emerald-400">{currentKey}</strong></p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-xl transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Fret selector */}
        <div className="my-5">
          <label className="block text-xs font-semibold uppercase text-zinc-400 tracking-wider mb-2">
            Selecciona el Traste del Capo:
          </label>
          <div className="grid grid-cols-4 gap-2">
            {[0, 1, 2, 3, 4, 5, 6, 7].map(fret => (
              <button
                key={fret}
                onClick={() => setSelectedFret(fret)}
                className={`py-2.5 px-3 rounded-2xl font-bold text-sm border transition flex flex-col items-center ${
                  selectedFret === fret
                    ? 'bg-emerald-600 border-emerald-400 text-white shadow-lg shadow-emerald-600/30'
                    : 'bg-zinc-800/80 border-zinc-700/80 text-zinc-300 hover:bg-zinc-800 hover:border-zinc-600'
                }`}
              >
                <span>{fret === 0 ? 'Sin Capo' : `Traste ${fret}`}</span>
                <span className="text-[10px] opacity-75 font-normal mt-0.5">
                  Pos: {transposeChord(currentKey, -fret, false, notation)}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Explanation Card */}
        <div className="bg-zinc-800/50 border border-zinc-700/60 rounded-2xl p-4 mb-5">
          <div className="flex items-center justify-between text-sm">
            <span className="text-zinc-400">Tono que suena:</span>
            <span className="font-black text-emerald-400 text-base">{currentKey}</span>
          </div>
          <div className="flex items-center justify-between text-sm mt-2">
            <span className="text-zinc-400">Posición de acordes a tocar:</span>
            <span className="font-black text-lime-400 text-base">
              {selectedFret === 0 ? currentKey : `${relativeKey} (Capo ${selectedFret})`}
            </span>
          </div>
          <p className="text-xs text-zinc-400 mt-3 pt-3 border-t border-zinc-700/50">
            {selectedFret === 0
              ? 'Tocando sin cejilla con las digitaciones naturales.'
              : `Al colocar la cejilla en el traste ${selectedFret}, pones la figura de ${relativeKey} y sonará en ${currentKey}.`}
          </p>
        </div>

        {/* Suggestions */}
        {suggestions.length > 0 && (
          <div className="mb-5">
            <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider block mb-2">
              Sugerencias para acordes más sencillos:
            </span>
            <div className="flex flex-wrap gap-2">
              {suggestions.slice(0, 3).map(s => (
                <button
                  key={s.fret}
                  onClick={() => setSelectedFret(s.fret)}
                  className={`text-xs px-2.5 py-1.5 rounded-xl border transition ${
                    selectedFret === s.fret
                      ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300 font-bold'
                      : 'bg-zinc-800 border-zinc-700 text-zinc-300 hover:border-zinc-500'
                  }`}
                >
                  Capo {s.fret} (Figura de {transposeChord(currentKey, -s.fret, false, notation)})
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-zinc-400 hover:text-white font-medium"
          >
            Cancelar
          </button>
          <button
            onClick={() => {
              onApplyCapo(selectedFret)
              onClose()
            }}
            className="px-5 py-2.5 text-sm bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-2xl shadow-lg shadow-emerald-600/30 transition flex items-center gap-1.5"
          >
            <Check className="w-4 h-4" />
            Aplicar Cejilla
          </button>
        </div>
      </div>
    </div>
  )
}
