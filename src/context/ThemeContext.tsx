import React, { createContext, useContext, useState, useEffect } from 'react'
import { type AppTheme, type ThemeConfig, THEMES } from '../types/theme'

interface ThemeContextType {
  theme: AppTheme
  setTheme: (theme: AppTheme) => void
  themeConfig: ThemeConfig
}

const THEME_STORAGE_KEY = 'chords_app_theme_v1'
const LEGACY_STAGE_COLOR_KEY = 'chords_stage_color'

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<AppTheme>(() => {
    try {
      const stored = localStorage.getItem(THEME_STORAGE_KEY) as AppTheme
      if (stored && THEMES[stored]) return stored

      const legacy = localStorage.getItem(LEGACY_STAGE_COLOR_KEY) as AppTheme
      if (legacy && THEMES[legacy]) return legacy
    } catch {}
    return 'green'
  })

  const setTheme = (newTheme: AppTheme) => {
    setThemeState(newTheme)
    try {
      localStorage.setItem(THEME_STORAGE_KEY, newTheme)
      localStorage.setItem(LEGACY_STAGE_COLOR_KEY, newTheme)
    } catch {}
  }

  useEffect(() => {
    try {
      document.documentElement.setAttribute('data-theme', theme)
    } catch {}
  }, [theme])

  const themeConfig = THEMES[theme] || THEMES.green

  return (
    <ThemeContext.Provider value={{ theme, setTheme, themeConfig }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme(): ThemeContextType {
  const context = useContext(ThemeContext)
  if (!context) {
    // Fallback if rendered outside provider
    return {
      theme: 'green',
      setTheme: () => {},
      themeConfig: THEMES.green
    }
  }
  return context
}
