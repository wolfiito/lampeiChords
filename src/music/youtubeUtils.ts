/**
 * YouTube Utility functions for parsing URLs, video IDs, and generating embed URLs.
 */

export interface YouTubeInfo {
  videoId: string | null
  startTime?: number
  cleanUrl?: string
}

/**
 * Extracts YouTube video ID and optional start time (in seconds) from diverse URL formats:
 * - https://www.youtube.com/watch?v=VIDEO_ID
 * - https://youtu.be/VIDEO_ID?t=45
 * - https://www.youtube.com/embed/VIDEO_ID
 * - https://music.youtube.com/watch?v=VIDEO_ID
 * - Raw 11-char ID
 */
export function parseYouTubeUrl(url: string | undefined | null): YouTubeInfo {
  if (!url || typeof url !== 'string') {
    return { videoId: null }
  }

  const trimmed = url.trim()
  if (!trimmed) return { videoId: null }

  // 1. Direct 11-character video ID
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) {
    return {
      videoId: trimmed,
      cleanUrl: `https://www.youtube.com/watch?v=${trimmed}`
    }
  }

  // 2. Extract start time (t= or start=)
  let startTime: number | undefined
  const timeMatch = trimmed.match(/[?&#](?:t|start)=([0-9hms]+)/i)
  if (timeMatch && timeMatch[1]) {
    const rawTime = timeMatch[1]
    if (/^\d+$/.test(rawTime)) {
      startTime = parseInt(rawTime, 10)
    } else {
      let seconds = 0
      const hoursMatch = rawTime.match(/(\d+)h/i)
      const minutesMatch = rawTime.match(/(\d+)m/i)
      const secondsMatch = rawTime.match(/(\d+)s?/i)
      if (hoursMatch) seconds += parseInt(hoursMatch[1], 10) * 3600
      if (minutesMatch) seconds += parseInt(minutesMatch[1], 10) * 60
      if (secondsMatch && !hoursMatch && !minutesMatch) {
        seconds += parseInt(secondsMatch[1], 10)
      }
      startTime = seconds > 0 ? seconds : undefined
    }
  }

  // 3. Regular Expression to capture 11-character video ID
  const regExp = /(?:youtube\.com\/(?:[^\/\n\s]+\/\S+\/|(?:v|e(?:mbed)?)\/|\S*?[?&]v=)|youtu\.be\/|youtube-nocookie\.com\/embed\/)([a-zA-Z0-9_-]{11})/i
  const match = trimmed.match(regExp)

  if (match && match[1]) {
    const videoId = match[1]
    return {
      videoId,
      startTime,
      cleanUrl: `https://www.youtube.com/watch?v=${videoId}`
    }
  }

  return { videoId: null }
}

/**
 * Builds the embed iframe URL with safe privacy and player options.
 */
export function buildYouTubeEmbedUrl(
  videoId: string,
  options: {
    autoplay?: boolean
    startTime?: number
  } = {}
): string {
  const params = new URLSearchParams()
  params.set('rel', '0')
  params.set('modestbranding', '1')
  params.set('enablejsapi', '1')
  params.set('playsinline', '1')

  if (options.autoplay) {
    params.set('autoplay', '1')
  }

  if (options.startTime && options.startTime > 0) {
    params.set('start', String(options.startTime))
  }

  return `https://www.youtube-nocookie.com/embed/${videoId}?${params.toString()}`
}

/**
 * Returns the high quality thumbnail URL for a YouTube video ID.
 */
export function getYouTubeThumbnailUrl(videoId: string): string {
  return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`
}
