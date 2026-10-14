import { useState, useEffect } from 'react'
import type { Song } from '../types/song'
import { DEFAULT_SONGS } from '../data/defaultSongs'

const STORAGE_KEY = 'acordes_pro_songs_v1'
const ACTIVE_SONG_KEY = 'acordes_pro_active_song_id'

export function useSongs() {
  const [songs, setSongs] = useState<Song[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored)
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed
        }
      }
    } catch (e) {
      console.error('Error loading songs from localStorage', e)
    }
    return DEFAULT_SONGS
  })

  const [activeSongId, setActiveSongId] = useState<string>(() => {
    const storedId = localStorage.getItem(ACTIVE_SONG_KEY)
    if (storedId && songs.some(s => s.id === storedId)) {
      return storedId
    }
    return songs[0]?.id || ''
  })

  // Persist songs
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(songs))
    } catch (e) {
      console.error('Error saving songs to localStorage', e)
    }
  }, [songs])

  // Persist active song ID
  useEffect(() => {
    if (activeSongId) {
      localStorage.setItem(ACTIVE_SONG_KEY, activeSongId)
    }
  }, [activeSongId])

  const activeSong = songs.find(s => s.id === activeSongId) || songs[0] || null

  const saveSong = (songData: Partial<Song> & { id?: string }) => {
    const now = Date.now()
    if (songData.id && songs.some(s => s.id === songData.id)) {
      // Update existing
      setSongs(prev => prev.map(s => {
        if (s.id === songData.id) {
          return {
            ...s,
            ...songData,
            updatedAt: now
          } as Song
        }
        return s
      }))
    } else {
      // Create new
      const newSong: Song = {
        id: songData.id || `song-${now}-${Math.random().toString(36).substring(2, 7)}`,
        title: songData.title || 'Nueva Canción',
        artist: songData.artist || 'Artista',
        originalKey: songData.originalKey || 'C',
        currentKey: songData.currentKey || songData.originalKey || 'C',
        capo: songData.capo ?? 0,
        tempo: songData.tempo || 100,
        timeSignature: songData.timeSignature || '4/4',
        tags: songData.tags || [],
        content: songData.content || '{title: Nueva Canción}\n{artist: Artista}\n{key: C}\n\n[Intro]\n[C]  [G]  [Am]  [F]\n\n[Verso 1]\nEscribe aquí [C]tu letra con los a[G]cordes entre corchetes.',
        createdAt: now,
        updatedAt: now
      }
      setSongs(prev => [newSong, ...prev])
      setActiveSongId(newSong.id)
    }
  }

  const deleteSong = (id: string) => {
    setSongs(prev => {
      const filtered = prev.filter(s => s.id !== id)
      if (activeSongId === id && filtered.length > 0) {
        setActiveSongId(filtered[0].id)
      }
      return filtered
    })
  }

  const duplicateSong = (id: string) => {
    const target = songs.find(s => s.id === id)
    if (!target) return
    const now = Date.now()
    const copy: Song = {
      ...target,
      id: `copy-${now}-${Math.random().toString(36).substring(2, 6)}`,
      title: `${target.title} (Copia)`,
      createdAt: now,
      updatedAt: now
    }
    setSongs(prev => [copy, ...prev])
    setActiveSongId(copy.id)
  }

  const resetToDefaults = () => {
    setSongs(DEFAULT_SONGS)
    setActiveSongId(DEFAULT_SONGS[0].id)
  }

  const importLibrary = (jsonData: string) => {
    try {
      const parsed = JSON.parse(jsonData)
      if (Array.isArray(parsed) && parsed.length > 0) {
        setSongs(parsed)
        setActiveSongId(parsed[0].id)
        return true
      }
    } catch (e) {
      console.error('Invalid JSON library file', e)
    }
    return false
  }

  const exportLibrary = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(songs, null, 2))
    const downloadAnchor = document.createElement('a')
    downloadAnchor.setAttribute('href', dataStr)
    downloadAnchor.setAttribute('download', `acordes-pro-backup-${new Date().toISOString().split('T')[0]}.json`)
    document.body.appendChild(downloadAnchor)
    downloadAnchor.click()
    downloadAnchor.remove()
  }

  return {
    songs,
    activeSong,
    activeSongId,
    setActiveSongId,
    saveSong,
    deleteSong,
    duplicateSong,
    resetToDefaults,
    importLibrary,
    exportLibrary
  }
}
