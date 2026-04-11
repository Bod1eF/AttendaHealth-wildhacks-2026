'use client'

import { useRef, useState, useEffect, useCallback } from 'react'

interface AudioPlayerProps {
  audioUrl: string | null
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${String(s).padStart(2, '0')}`
}

export default function AudioPlayer({ audioUrl }: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)

  useEffect(() => {
    // Reset state when URL changes
    setIsPlaying(false)
    setCurrentTime(0)
    setDuration(0)

    if (!audioUrl) {
      audioRef.current = null
      return
    }

    const audio = new Audio(audioUrl)
    audioRef.current = audio

    const onLoadedMetadata = () => setDuration(audio.duration)
    const onTimeUpdate = () => setCurrentTime(audio.currentTime)
    const onEnded = () => {
      setIsPlaying(false)
      setCurrentTime(0)
    }

    audio.addEventListener('loadedmetadata', onLoadedMetadata)
    audio.addEventListener('timeupdate', onTimeUpdate)
    audio.addEventListener('ended', onEnded)

    return () => {
      audio.pause()
      audio.removeEventListener('loadedmetadata', onLoadedMetadata)
      audio.removeEventListener('timeupdate', onTimeUpdate)
      audio.removeEventListener('ended', onEnded)
    }
  }, [audioUrl])

  const togglePlay = useCallback(() => {
    const audio = audioRef.current
    if (!audio) return

    if (isPlaying) {
      audio.pause()
      setIsPlaying(false)
    } else {
      audio.play()
      setIsPlaying(true)
    }
  }, [isPlaying])

  const handleSeek = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const audio = audioRef.current
      if (!audio || !duration) return

      const rect = e.currentTarget.getBoundingClientRect()
      const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
      audio.currentTime = ratio * duration
      setCurrentTime(audio.currentTime)
    },
    [duration]
  )

  const disabled = !audioUrl
  const progress = duration > 0 ? (currentTime / duration) * 100 : 0

  return (
    <div className="flex items-center gap-3">
      {/* Play/Pause button */}
      <button
        onClick={togglePlay}
        disabled={disabled}
        className="w-[40px] h-[40px] rounded-full flex items-center justify-center shrink-0 transition-opacity"
        style={{
          backgroundColor: disabled ? '#A099A8' : '#532AA8',
          opacity: disabled ? 0.5 : 1,
        }}
      >
        {isPlaying ? (
          <svg width="14" height="16" viewBox="0 0 14 16" fill="none">
            <rect x="1" y="1" width="4" height="14" rx="1" fill="white" />
            <rect x="9" y="1" width="4" height="14" rx="1" fill="white" />
          </svg>
        ) : (
          <svg width="14" height="16" viewBox="0 0 14 16" fill="none">
            <path d="M2 1.5L12 8L2 14.5V1.5Z" fill="white" />
          </svg>
        )}
      </button>

      {/* Progress bar + time */}
      <div className="flex-1 flex flex-col gap-1.5">
        <div
          className="h-[4px] rounded-full w-full"
          style={{
            backgroundColor: '#E8E0F0',
            cursor: disabled ? 'default' : 'pointer',
          }}
          onClick={disabled ? undefined : handleSeek}
        >
          <div
            className="h-full rounded-full transition-[width] duration-100"
            style={{
              backgroundColor: '#532AA8',
              width: `${progress}%`,
            }}
          />
        </div>
        <span className="text-[11px]" style={{ color: '#7A7484' }}>
          {formatTime(currentTime)} / {formatTime(duration)}
        </span>
      </div>
    </div>
  )
}
