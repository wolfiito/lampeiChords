export type AppTheme = 'green' | 'pink' | 'blue' | 'orange' | 'amber'

export interface ThemeConfig {
  id: AppTheme
  name: string
  label: string
  dotClass: string
  ringClass: string
  chordClass: string
  chordHoverClass: string
  activeBorderClass: string
  activeBgClass: string
  activeTextClass: string
  arrowClass: string
  badgeClass: string
  borderGlowClass: string
  pingClass: string
  // Full-App Styles
  primaryText: string
  primaryHoverText: string
  primaryBg: string
  primaryBgHover: string
  primaryBorder: string
  primaryBadge: string
  primaryButton: string
  cardButton: string
  selectionBg: string
}

export const THEMES: Record<AppTheme, ThemeConfig> = {
  green: {
    id: 'green',
    name: 'Verde Esmeralda (Matrix)',
    label: 'Verde',
    dotClass: 'bg-emerald-400',
    ringClass: 'ring-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.8)]',
    chordClass: 'text-emerald-400 font-black drop-shadow-[0_0_8px_rgba(52,211,153,0.5)]',
    chordHoverClass: 'hover:text-emerald-200 hover:bg-emerald-500/20',
    activeBorderClass: 'border-l-4 border-emerald-400',
    activeBgClass: 'bg-gradient-to-r from-emerald-500/[0.22] via-emerald-500/[0.06] to-transparent',
    activeTextClass: 'text-emerald-300 font-black',
    arrowClass: 'text-emerald-400 font-black drop-shadow-[0_0_6px_rgba(52,211,153,0.7)]',
    badgeClass: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50 shadow-[0_0_8px_rgba(52,211,153,0.3)]',
    borderGlowClass: 'border-emerald-500/50 shadow-[0_0_12px_rgba(52,211,153,0.25)]',
    pingClass: 'bg-emerald-400',
    primaryText: 'text-emerald-400',
    primaryHoverText: 'hover:text-emerald-400',
    primaryBg: 'bg-emerald-600',
    primaryBgHover: 'hover:bg-emerald-500',
    primaryBorder: 'border-emerald-500/40',
    primaryBadge: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40',
    primaryButton: 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/30',
    cardButton: 'bg-emerald-600/15 hover:bg-emerald-600 text-emerald-300 hover:text-white border-emerald-500/30',
    selectionBg: 'selection:bg-emerald-500'
  },
  pink: {
    id: 'pink',
    name: 'Rosa Neón (Cyberpunk)',
    label: 'Rosa',
    dotClass: 'bg-pink-400',
    ringClass: 'ring-pink-400 shadow-[0_0_10px_rgba(244,114,182,0.8)]',
    chordClass: 'text-pink-400 font-black drop-shadow-[0_0_8px_rgba(244,114,182,0.5)]',
    chordHoverClass: 'hover:text-pink-200 hover:bg-pink-500/20',
    activeBorderClass: 'border-l-4 border-pink-500',
    activeBgClass: 'bg-gradient-to-r from-pink-500/[0.22] via-pink-500/[0.06] to-transparent',
    activeTextClass: 'text-pink-300 font-black',
    arrowClass: 'text-pink-400 font-black drop-shadow-[0_0_6px_rgba(244,114,182,0.7)]',
    badgeClass: 'bg-pink-500/20 text-pink-300 border-pink-500/50 shadow-[0_0_8px_rgba(244,114,182,0.3)]',
    borderGlowClass: 'border-pink-500/50 shadow-[0_0_12px_rgba(244,114,182,0.25)]',
    pingClass: 'bg-pink-400',
    primaryText: 'text-pink-400',
    primaryHoverText: 'hover:text-pink-400',
    primaryBg: 'bg-pink-600',
    primaryBgHover: 'hover:bg-pink-500',
    primaryBorder: 'border-pink-500/40',
    primaryBadge: 'bg-pink-500/15 text-pink-300 border-pink-500/40',
    primaryButton: 'bg-pink-600 hover:bg-pink-500 text-white shadow-pink-600/30',
    cardButton: 'bg-pink-600/15 hover:bg-pink-600 text-pink-300 hover:text-white border-pink-500/30',
    selectionBg: 'selection:bg-pink-500'
  },
  blue: {
    id: 'blue',
    name: 'Azul Cyan (Tokyo Night)',
    label: 'Azul',
    dotClass: 'bg-cyan-400',
    ringClass: 'ring-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.8)]',
    chordClass: 'text-cyan-400 font-black drop-shadow-[0_0_8px_rgba(34,211,238,0.5)]',
    chordHoverClass: 'hover:text-cyan-200 hover:bg-cyan-500/20',
    activeBorderClass: 'border-l-4 border-cyan-400',
    activeBgClass: 'bg-gradient-to-r from-cyan-500/[0.22] via-cyan-500/[0.06] to-transparent',
    activeTextClass: 'text-cyan-300 font-black',
    arrowClass: 'text-cyan-400 font-black drop-shadow-[0_0_6px_rgba(34,211,238,0.7)]',
    badgeClass: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50 shadow-[0_0_8px_rgba(34,211,238,0.3)]',
    borderGlowClass: 'border-cyan-500/50 shadow-[0_0_12px_rgba(34,211,238,0.25)]',
    pingClass: 'bg-cyan-400',
    primaryText: 'text-cyan-400',
    primaryHoverText: 'hover:text-cyan-400',
    primaryBg: 'bg-cyan-600',
    primaryBgHover: 'hover:bg-cyan-500',
    primaryBorder: 'border-cyan-500/40',
    primaryBadge: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/40',
    primaryButton: 'bg-cyan-600 hover:bg-cyan-500 text-white shadow-cyan-600/30',
    cardButton: 'bg-cyan-600/15 hover:bg-cyan-600 text-cyan-300 hover:text-white border-cyan-500/30',
    selectionBg: 'selection:bg-cyan-500'
  },
  orange: {
    id: 'orange',
    name: 'Naranja Neón (Sunset)',
    label: 'Naranja',
    dotClass: 'bg-orange-400',
    ringClass: 'ring-orange-400 shadow-[0_0_10px_rgba(251,146,60,0.8)]',
    chordClass: 'text-orange-400 font-black drop-shadow-[0_0_8px_rgba(251,146,60,0.5)]',
    chordHoverClass: 'hover:text-orange-200 hover:bg-orange-500/20',
    activeBorderClass: 'border-l-4 border-orange-400',
    activeBgClass: 'bg-gradient-to-r from-orange-500/[0.22] via-orange-500/[0.06] to-transparent',
    activeTextClass: 'text-orange-300 font-black',
    arrowClass: 'text-orange-400 font-black drop-shadow-[0_0_6px_rgba(251,146,60,0.7)]',
    badgeClass: 'bg-orange-500/20 text-orange-300 border-orange-500/50 shadow-[0_0_8px_rgba(251,146,60,0.3)]',
    borderGlowClass: 'border-orange-500/50 shadow-[0_0_12px_rgba(251,146,60,0.25)]',
    pingClass: 'bg-orange-400',
    primaryText: 'text-orange-400',
    primaryHoverText: 'hover:text-orange-400',
    primaryBg: 'bg-orange-600',
    primaryBgHover: 'hover:bg-orange-500',
    primaryBorder: 'border-orange-500/40',
    primaryBadge: 'bg-orange-500/15 text-orange-300 border-orange-500/40',
    primaryButton: 'bg-orange-600 hover:bg-orange-500 text-white shadow-orange-600/30',
    cardButton: 'bg-orange-600/15 hover:bg-orange-600 text-orange-300 hover:text-white border-orange-500/30',
    selectionBg: 'selection:bg-orange-500'
  },
  amber: {
    id: 'amber',
    name: 'Ámbar Oro (Clásico Escenario)',
    label: 'Ámbar',
    dotClass: 'bg-amber-400',
    ringClass: 'ring-amber-400 shadow-[0_0_10px_rgba(251,191,36,0.8)]',
    chordClass: 'text-amber-300 font-black drop-shadow-[0_0_8px_rgba(251,191,36,0.5)]',
    chordHoverClass: 'hover:text-amber-100 hover:bg-amber-400/20',
    activeBorderClass: 'border-l-4 border-amber-400',
    activeBgClass: 'bg-gradient-to-r from-amber-500/[0.22] via-amber-500/[0.06] to-transparent',
    activeTextClass: 'text-amber-300 font-black',
    arrowClass: 'text-amber-400 font-black drop-shadow-[0_0_6px_rgba(251,191,36,0.7)]',
    badgeClass: 'bg-amber-500/20 text-amber-300 border-amber-500/50 shadow-[0_0_8px_rgba(251,191,36,0.3)]',
    borderGlowClass: 'border-amber-500/50 shadow-[0_0_12px_rgba(251,191,36,0.25)]',
    pingClass: 'bg-amber-400',
    primaryText: 'text-amber-400',
    primaryHoverText: 'hover:text-amber-400',
    primaryBg: 'bg-amber-600',
    primaryBgHover: 'hover:bg-amber-500',
    primaryBorder: 'border-amber-500/40',
    primaryBadge: 'bg-amber-500/15 text-amber-300 border-amber-500/40',
    primaryButton: 'bg-amber-600 hover:bg-amber-500 text-white shadow-amber-600/30',
    cardButton: 'bg-amber-600/15 hover:bg-amber-600 text-amber-300 hover:text-white border-amber-500/30',
    selectionBg: 'selection:bg-amber-500'
  }
}
