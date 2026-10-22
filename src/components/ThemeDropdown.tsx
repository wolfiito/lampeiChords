import React, { useState, useRef, useEffect } from 'react'
import { ChevronDown, Palette } from 'lucide-react'
import { useTheme } from '../context/ThemeContext'
import { type AppTheme, THEMES } from '../types/theme'

interface ThemeDropdownProps {
  className?: string
  showLabel?: boolean
  align?: 'left' | 'right'
}

export const ThemeDropdown: React.FC<ThemeDropdownProps> = ({
  className = '',
  showLabel = true,
  align = 'right'
}) => {
  const { theme, setTheme, themeConfig } = useTheme()
  const [isOpen, setIsOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isOpen) return

    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    window.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen])

  return (
    <div className={`relative ${className}`} ref={menuRef}>
      <button
        type="button"
        onClick={() => setIsOpen(o => !o)}
        title="Cambiar tema de color de la aplicación"
        className="flex items-center gap-1.5 bg-zinc-900/90 hover:bg-zinc-800 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl border border-zinc-800 text-xs font-bold text-zinc-300 hover:text-white transition cursor-pointer select-none active:scale-95 shadow-sm"
      >
        <span className={`w-3.5 h-3.5 rounded-full shrink-0 ${themeConfig.dotClass} ${themeConfig.ringClass}`} />
        {showLabel && (
          <span className="hidden sm:inline text-xs font-semibold text-zinc-200">
            {themeConfig.label}
          </span>
        )}
        <ChevronDown className="w-3.5 h-3.5 text-zinc-400" />
      </button>

      {isOpen && (
        <div
          className={`absolute top-full mt-2 w-56 sm:w-64 bg-zinc-900/95 backdrop-blur-xl border border-zinc-700/80 rounded-2xl shadow-2xl p-1.5 z-50 animate-in fade-in zoom-in-95 duration-150 ${
            align === 'right' ? 'right-0' : 'left-0'
          }`}
        >
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 text-[10px] font-black uppercase tracking-wider text-zinc-400 border-b border-zinc-800/80 mb-1">
            <Palette className="w-3.5 h-3.5 text-zinc-400" />
            <span>Temas de Color</span>
          </div>

          {(Object.keys(THEMES) as AppTheme[]).map(key => {
            const cfg = THEMES[key]
            const isSelected = theme === key
            return (
              <button
                key={key}
                type="button"
                onClick={() => {
                  setTheme(key)
                  setIsOpen(false)
                }}
                className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                  isSelected
                    ? 'bg-zinc-800 text-white shadow-sm'
                    : 'text-zinc-300 hover:bg-zinc-800/60 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <span
                    className={`w-3.5 h-3.5 rounded-full shrink-0 ${cfg.dotClass} ${
                      isSelected ? cfg.ringClass : ''
                    }`}
                  />
                  <span className="truncate">{cfg.name}</span>
                </div>
                {isSelected && <span className="text-xs text-white font-bold ml-1">✓</span>}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
