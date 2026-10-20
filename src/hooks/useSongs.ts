import { useState, useEffect, useRef } from 'react'
import type { Song } from '../types/song'
import { DEFAULT_SONGS } from '../data/defaultSongs'

const STORAGE_KEY = 'acordes_pro_songs_v1'
const ACTIVE_SONG_KEY = 'acordes_pro_active_song_id'

const LEGACY_DEMO_IDS = new Set([
  'soda-stereo-de-musica-ligera',
  'ben-e-king-stand-by-me',
  'jarabe-de-palo-la-flaca',
  'the-beatles-let-it-be'
])

export type SyncStatus = 'idle' | 'syncing' | 'synced' | 'offline'

export function useSongs() {
  const [songs, setSongs] = useState<Song[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored)
        if (Array.isArray(parsed) && parsed.length > 0) {
          const cleaned = parsed.filter(s => !LEGACY_DEMO_IDS.has(s.id))
          if (cleaned.length > 0) {
            return cleaned
          }
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

  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle')
  const initialSyncDone = useRef(false)

  // Persist songs to localStorage
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

  // Automatic Background Cloud Sync with Neon via /api/songs
  useEffect(() => {
    if (initialSyncDone.current) return
    initialSyncDone.current = true

    let isMounted = true

    async function syncWithCloud() {
      try {
        setSyncStatus('syncing')
        const res = await fetch('/api/songs')
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const data = await res.json()

        if (!isMounted) return

        if (data.success && Array.isArray(data.songs)) {
          const cloudSongs: Song[] = data.songs.filter(
            (s: Song) => !LEGACY_DEMO_IDS.has(s.id)
          )

          if (cloudSongs.length > 0) {
            setSongs(prev => {
              // Merge: cloud songs + any local-only songs
              const cloudIds = new Set(cloudSongs.map(s => s.id))
              const localOnly = prev.filter(s => !cloudIds.has(s.id) && !LEGACY_DEMO_IDS.has(s.id))

              // If there are local-only songs, push them to cloud in background
              if (localOnly.length > 0) {
                fetch('/api/songs', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ songs: localOnly })
                }).catch(() => {})
              }

              // Merge maps by most recent updatedAt
              const map = new Map<string, Song>()
              cloudSongs.forEach(s => map.set(s.id, s))
              prev.forEach(s => {
                if (LEGACY_DEMO_IDS.has(s.id)) return
                const existing = map.get(s.id)
                if (!existing || (s.updatedAt && s.updatedAt > (existing.updatedAt || 0))) {
                  map.set(s.id, s)
                }
              })

              const merged = Array.from(map.values())
              return merged.length > 0 ? merged : cloudSongs
            })
          } else {
            // Cloud is empty: push initial local songs to Neon
            const cleanLocal = songs.filter(s => !LEGACY_DEMO_IDS.has(s.id))
            if (cleanLocal.length > 0) {
              await fetch('/api/songs', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ songs: cleanLocal })
              })
            }
          }
          setSyncStatus('synced')
        }
      } catch (err) {
        console.warn('Transparent cloud sync deferred (offline or dev mode):', err)
        if (isMounted) setSyncStatus('offline')
      }
    }

    syncWithCloud()

    return () => {
      isMounted = false
    }
  }, [])

  const activeSong = songs.find(s => s.id === activeSongId) || songs[0] || null

  const syncSongToCloud = (targetSong: Song) => {
    setSyncStatus('syncing')
    fetch('/api/songs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ song: targetSong })
    })
      .then(r => {
        if (r.ok) setSyncStatus('synced')
      })
      .catch(() => {
        setSyncStatus('offline')
      })
  }

  const saveSong = (songData: Partial<Song> & { id?: string }) => {
    const now = Date.now()
    if (songData.id && songs.some(s => s.id === songData.id)) {
      // Update existing
      let updatedSong: Song | null = null
      setSongs(prev =>
        prev.map(s => {
          if (s.id === songData.id) {
            updatedSong = {
              ...s,
              ...songData,
              updatedAt: now
            } as Song
            return updatedSong
          }
          return s
        })
      )
      if (updatedSong) {
        syncSongToCloud(updatedSong)
      }
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
        content:
          songData.content ||
          '{title: Nueva Canción}\n{artist: Artista}\n{key: C}\n\n[Intro]\n[C]  [G]  [Am]  [F]\n\n[Verso 1]\nEscribe aquí [C]tu letra con los a[G]cordes entre corchetes.',
        createdAt: now,
        updatedAt: now
      }
      setSongs(prev => [newSong, ...prev])
      setActiveSongId(newSong.id)
      syncSongToCloud(newSong)
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

    // Delete in cloud
    fetch(`/api/songs?id=${encodeURIComponent(id)}`, { method: 'DELETE' }).catch(() => {})
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
    syncSongToCloud(copy)
  }

  const resetToDefaults = () => {
    setSongs(DEFAULT_SONGS)
    setActiveSongId(DEFAULT_SONGS[0].id)
    setSyncStatus('syncing')
    fetch('/api/songs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ songs: DEFAULT_SONGS })
    })
      .then(r => {
        if (r.ok) setSyncStatus('synced')
      })
      .catch(() => setSyncStatus('offline'))
  }

  const importLibrary = (jsonData: string) => {
    try {
      const parsed = JSON.parse(jsonData)
      if (Array.isArray(parsed) && parsed.length > 0) {
        setSongs(parsed)
        setActiveSongId(parsed[0].id)
        setSyncStatus('syncing')
        fetch('/api/songs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ songs: parsed })
        })
          .then(r => {
            if (r.ok) setSyncStatus('synced')
          })
          .catch(() => setSyncStatus('offline'))
        return true
      }
    } catch (e) {
      console.error('Invalid JSON library file', e)
    }
    return false
  }

  const exportLibrary = () => {
    const dataStr =
      'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(songs, null, 2))
    const downloadAnchor = document.createElement('a')
    downloadAnchor.setAttribute('href', dataStr)
    downloadAnchor.setAttribute(
      'download',
      `chordsLampei-backup-${new Date().toISOString().split('T')[0]}.json`
    )
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
    exportLibrary,
    syncStatus
  }
}
