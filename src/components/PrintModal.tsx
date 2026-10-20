import React, { useState } from 'react'
import { Download, X, Loader2 } from 'lucide-react'

interface PrintModalProps {
  isOpen: boolean
  onClose: () => void
  onExportPdf: (options: { columns: 1 | 2; size?: 'normal' }) => Promise<void>
  onPrintBrowser?: (options: { columns: 1 | 2; size?: 'normal' }) => void
  songTitle?: string
}

export const PrintModal: React.FC<PrintModalProps> = ({
  isOpen,
  onClose,
  onExportPdf
}) => {
  const [columns, setColumns] = useState<1 | 2>(2)
  const [isExporting, setIsExporting] = useState(false)

  if (!isOpen) return null

  const handleDownloadPdf = async () => {
    try {
      setIsExporting(true)
      await onExportPdf({ columns, size: 'normal' })
      setIsExporting(false)
      onClose()
    } catch (err) {
      console.error('Error al generar PDF', err)
      setIsExporting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
      <div className="relative w-full max-w-[94vw] sm:max-w-sm bg-zinc-900 border border-emerald-900/60 rounded-3xl shadow-2xl p-5 text-zinc-100">
        {/* Header */}
        <div className="flex items-center justify-between pb-3.5 border-b border-zinc-800">
          <div className="flex items-center gap-2.5">
            <img
              src="/logo.png"
              alt="Lampei"
              className="h-8 w-auto object-contain shrink-0 drop-shadow-[0_2px_10px_rgba(16,185,129,0.35)]"
            />
            <div>
              <h3 className="font-bold text-base sm:text-lg text-white">
                Guardar PDF
              </h3>
              <p className="text-[11px] text-zinc-400 font-medium">chords<strong className="text-emerald-400">Lampei</strong></p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-xl transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Columns Selector */}
        <div className="my-5">
          <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-2.5">
            Columnas:
          </label>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setColumns(2)}
              className={`py-3 px-4 rounded-2xl border text-center font-bold text-sm transition ${
                columns === 2
                  ? 'bg-emerald-600 border-emerald-400 text-white shadow-lg shadow-emerald-600/30'
                  : 'bg-zinc-800/80 border-zinc-700/80 text-zinc-300 hover:bg-zinc-800'
              }`}
            >
              2 Columnas
            </button>

            <button
              onClick={() => setColumns(1)}
              className={`py-3 px-4 rounded-2xl border text-center font-bold text-sm transition ${
                columns === 1
                  ? 'bg-emerald-600 border-emerald-400 text-white shadow-lg shadow-emerald-600/30'
                  : 'bg-zinc-800/80 border-zinc-700/80 text-zinc-300 hover:bg-zinc-800'
              }`}
            >
              1 Columna
            </button>
          </div>
        </div>

        {/* Action Button: Descargar */}
        <div className="pt-2">
          <button
            onClick={handleDownloadPdf}
            disabled={isExporting}
            className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-sm rounded-2xl shadow-lg shadow-emerald-600/30 transition flex items-center justify-center gap-2"
          >
            {isExporting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Descargando...</span>
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                <span>Descargar</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
