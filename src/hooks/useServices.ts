import { useState, useEffect, useRef, useCallback } from 'react'
import type { ServiceItem } from '../types/service'

const SERVICES_STORAGE_KEY = 'chords_services_v1'
const ACTIVE_SERVICE_KEY = 'chords_active_service_id'

export function useServices() {
  const [services, setServices] = useState<ServiceItem[]>(() => {
    try {
      const stored = localStorage.getItem(SERVICES_STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored)
        if (Array.isArray(parsed)) return parsed
      }
    } catch (e) {
      console.error('Error reading services from localStorage:', e)
    }
    return []
  })

  const [activeServiceId, setActiveServiceId] = useState<string | null>(() => {
    try {
      return localStorage.getItem(ACTIVE_SERVICE_KEY) || null
    } catch {
      return null
    }
  })

  const isFetchingRef = useRef(false)

  // Persist services to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(SERVICES_STORAGE_KEY, JSON.stringify(services))
    } catch (e) {
      console.error('Error saving services to localStorage:', e)
    }
  }, [services])

  // Persist active service id
  useEffect(() => {
    try {
      if (activeServiceId) {
        localStorage.setItem(ACTIVE_SERVICE_KEY, activeServiceId)
      } else {
        localStorage.removeItem(ACTIVE_SERVICE_KEY)
      }
    } catch {}
  }, [activeServiceId])

  // Sync with cloud (Neon API) in background
  const pullCloudServices = useCallback(async () => {
    if (isFetchingRef.current) return
    isFetchingRef.current = true

    try {
      const res = await fetch('/api/services')
      if (!res.ok) return
      const data = await res.json()

      if (data.success && Array.isArray(data.services)) {
        setServices(prev => {
          // Merge by updated_at or include cloud services
          const map = new Map<string, ServiceItem>()
          data.services.forEach((s: ServiceItem) => map.set(s.id, s))
          prev.forEach(p => {
            const cloud = map.get(p.id)
            if (!cloud || p.updatedAt > cloud.updatedAt) {
              map.set(p.id, p)
            }
          })
          return Array.from(map.values()).sort((a, b) => (b.date || '').localeCompare(a.date || '') || b.updatedAt - a.updatedAt)
        })
      }
    } catch (e) {
      // Offline or network error - gracefully ignore
    } finally {
      isFetchingRef.current = false
    }
  }, [])

  // Initial cloud fetch
  useEffect(() => {
    pullCloudServices()
  }, [pullCloudServices])

  // Push service to cloud
  const pushServiceToCloud = async (service: ServiceItem) => {
    try {
      await fetch('/api/services', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ service })
      })
    } catch (e) {
      console.warn('Could not push service to cloud (offline):', e)
    }
  }

  // Save / Update service
  const saveService = (service: ServiceItem) => {
    const updated: ServiceItem = {
      ...service,
      updatedAt: Date.now()
    }

    setServices(prev => {
      const exists = prev.some(s => s.id === updated.id)
      if (exists) {
        return prev.map(s => (s.id === updated.id ? updated : s))
      }
      return [updated, ...prev]
    })

    pushServiceToCloud(updated)
  }

  // Delete service
  const deleteService = async (id: string) => {
    setServices(prev => prev.filter(s => s.id !== id))
    if (activeServiceId === id) {
      setActiveServiceId(null)
    }

    try {
      await fetch(`/api/services?id=${encodeURIComponent(id)}`, { method: 'DELETE' })
    } catch (e) {
      console.warn('Could not delete service from cloud (offline):', e)
    }
  }

  // Duplicate service
  const duplicateService = (id: string) => {
    const original = services.find(s => s.id === id)
    if (!original) return

    const newService: ServiceItem = {
      ...original,
      id: `service-${Date.now()}`,
      title: `${original.title} (Copia)`,
      createdAt: Date.now(),
      updatedAt: Date.now()
    }

    saveService(newService)
  }

  // Add song to service
  const addSongToService = (serviceId: string, songId: string) => {
    const service = services.find(s => s.id === serviceId)
    if (!service) return

    const updated: ServiceItem = {
      ...service,
      songIds: [...service.songIds, songId],
      updatedAt: Date.now()
    }
    saveService(updated)
  }

  // Remove song from service
  const removeSongFromService = (serviceId: string, songIndex: number) => {
    const service = services.find(s => s.id === serviceId)
    if (!service) return

    const updatedSongIds = [...service.songIds]
    updatedSongIds.splice(songIndex, 1)

    const updated: ServiceItem = {
      ...service,
      songIds: updatedSongIds,
      updatedAt: Date.now()
    }
    saveService(updated)
  }

  // Reorder songs in service
  const reorderSongsInService = (serviceId: string, newSongIds: string[]) => {
    const service = services.find(s => s.id === serviceId)
    if (!service) return

    const updated: ServiceItem = {
      ...service,
      songIds: newSongIds,
      updatedAt: Date.now()
    }
    saveService(updated)
  }

  const activeService = services.find(s => s.id === activeServiceId) || null

  return {
    services,
    activeService,
    activeServiceId,
    setActiveServiceId,
    saveService,
    deleteService,
    duplicateService,
    addSongToService,
    removeSongFromService,
    reorderSongsInService,
    refreshServices: pullCloudServices
  }
}
