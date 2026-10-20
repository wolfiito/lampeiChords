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
  const lastCloudMaxUpdateRef = useRef<number>(0)
  const lastCloudCountRef = useRef<number>(0)
  const isFetchingRef = useRef<boolean>(false)

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

  // Pull full song catalog from Neon cloud
  const pullFullSongs = async () => {
    if (isFetchingRef.current) return
    isFetchingRef.current = true

    try {
      setSyncStatus('syncing')
      const res = await fetch('/api/songs')
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()

      if (data.success && Array.isArray(data.songs)) {
        const cloudSongs: Song[] = data.songs.filter(
          (s: Song) => !LEGACY_DEMO_IDS.has(s.id)
        )

        if (cloudSongs.length > 0) {
          const maxTime = Math.max(...cloudSongs.map(s => s.updatedAt || 0))
          lastCloudMaxUpdateRef.current = Math.max(lastCloudMaxUpdateRef.current, maxTime)
          lastCloudCountRef.current = cloudSongs.length

          // Authoritative Cloud Sync: Cloud is the single source of truth!
          // NEVER resurrect deleted songs or re-upload local items in a background GET!
          setSongs(cloudSongs)
        }
        setSyncStatus('synced')
      }
    } catch (err) {
      console.warn('Cloud sync error or offline mode:', err)
      setSyncStatus('offline')
    } finally {
      isFetchingRef.current = false
    }
  }

  // Lightweight check (<10ms) to detect if songs were edited or deleted by other devices
  const checkCloudUpdates = async () => {
    if (typeof document !== 'undefined' && document.hidden) return
    if (isFetchingRef.current) return

    try {
      const res = await fetch('/api/songs?check=1')
      if (!res.ok) return
      const data = await res.json()
      if (data.success) {
        const cloudMax = Number(data.maxUpdatedAt || 0)
        const cloudCount = Number(data.count || 0)

        if (
          cloudMax > lastCloudMaxUpdateRef.current ||
          cloudCount !== lastCloudCountRef.current
        ) {
          await pullFullSongs()
        }
      }
    } catch {
      // Quiet fail if network hiccups
    }
  }

  // Real-Time Background Synchronization
  useEffect(() => {
    let isMounted = true

    // 1. Initial full fetch
    pullFullSongs()

    // 2. BroadcastChannel for instant 0ms sync across tabs on same device
    let channel: BroadcastChannel | null = null
    try {
      if (typeof BroadcastChannel !== 'undefined') {
        channel = new BroadcastChannel('chords_lampei_realtime_sync')
        channel.onmessage = e => {
          if (e.data?.type === 'SONG_UPDATED' || e.data?.type === 'SYNC_REQUEST') {
            pullFullSongs()
          }
        }
      }
    } catch {}

    // 3. Fast Polling interval (every 4 seconds) so all band devices update "al momento"
    const intervalId = setInterval(() => {
      if (isMounted) {
        checkCloudUpdates()
      }
    }, 4000)

    // 4. Instant sync on visibility, window focus or back online
    const handleImmediateSync = () => {
      if (isMounted && typeof document !== 'undefined' && !document.hidden) {
        checkCloudUpdates()
      }
    }
    document.addEventListener('visibilitychange', handleImmediateSync)
    window.addEventListener('focus', handleImmediateSync)
    window.addEventListener('online', handleImmediateSync)

    return () => {
      isMounted = false
      clearInterval(intervalId)
      channel?.close()
      document.removeEventListener('visibilitychange', handleImmediateSync)
      window.removeEventListener('focus', handleImmediateSync)
      window.removeEventListener('online', handleImmediateSync)
    }
  }, [])

  const activeSong = songs.find(s => s.id === activeSongId) || songs[0] || null

  const notifyBroadcast = () => {
    try {
      if (typeof BroadcastChannel !== 'undefined') {
        const bc = new BroadcastChannel('chords_lampei_realtime_sync')
        bc.postMessage({ type: 'SONG_UPDATED' })
        bc.close()
      }
    } catch {}
  }

  const syncSongToCloud = (targetSong: Song) => {
    setSyncStatus('syncing')
    fetch('/api/songs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ song: targetSong })
    })
      .then(r => {
        if (r.ok) {
          setSyncStatus('synced')
          lastCloudMaxUpdateRef.current = Math.max(
            lastCloudMaxUpdateRef.current,
            targetSong.updatedAt || Date.now()
          )
          notifyBroadcast()
        }
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
    fetch(`/api/songs?id=${encodeURIComponent(id)}`, { method: 'DELETE' })
      .then(() => {
        lastCloudCountRef.current = Math.max(0, lastCloudCountRef.current - 1)
        notifyBroadcast()
      })
      .catch(() => {})
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
