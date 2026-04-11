'use client'

import { useRef, useState, useCallback } from 'react'
import { Request } from '@/types/database'

interface RequestCardProps {
  request: Request
  isActive?: boolean
  onTap: (request: Request) => void
}

function getTimeLabel(createdAt: string): string {
  const now = new Date()
  const created = new Date(createdAt)
  const diffMs = now.getTime() - created.getTime()
  const diffMin = Math.floor(diffMs / 60000)
  if (diffMin < 1) return 'NOW'
  return `${String(diffMin).padStart(2, '0')}M`
}

export default function RequestCard({ request, isActive = false, onTap }: RequestCardProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)

  const lastEntry = request.entries?.[request.entries.length - 1]
  const audioUrl = lastEntry?.audio_url || null

  const handlePlayToggle = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      if (!audioUrl) return

      if (!audioRef.current) {
        audioRef.current = new Audio(audioUrl)
        audioRef.current.addEventListener('ended', () => setIsPlaying(false))
      }

      if (isPlaying) {
        audioRef.current.pause()
        setIsPlaying(false)
      } else {
        audioRef.current.play()
        setIsPlaying(true)
      }
    },
    [audioUrl, isPlaying]
  )
  const title = lastEntry?.title || 'REQUEST'
  const transcript = lastEntry?.transcript || ''
  const category = lastEntry?.category || ''
  const severity = lastEntry?.severity || ''
  const bedLabel = request.bed?.label || '?'
  const timeLabel = getTimeLabel(request.created_at)

  return (
    <div
      onClick={() => onTap(request)}
      className="cursor-pointer overflow-hidden rounded-[16px] p-[17px] flex gap-[16px] bg-white"
      style={
        isActive
          ? {
              borderLeft: '5px solid #532AA8',
              border: '1px solid rgba(83,42,168,0.2)',
              borderLeftWidth: '5px',
              boxShadow: '0px 8px 20px rgba(83,42,168,0.06)',
            }
          : request.is_pinned
          ? {
              border: '3px solid #532AA8',
              boxShadow: '0px 1px 2px rgba(0,0,0,0.05)',
            }
          : {
              border: '1px solid rgba(203,195,213,0.1)',
              boxShadow: '0px 1px 2px rgba(0,0,0,0.05)',
            }
      }
    >
      {/* Left column */}
      <div className="flex flex-col items-center gap-1">
        <div
          className="w-[40px] h-[40px] rounded-full flex items-center justify-center"
          style={{ backgroundColor: isActive ? '#E9DDFF' : '#DEE8FF' }}
        >
          <span className="text-[12px] font-extrabold leading-none">{bedLabel}</span>
        </div>
        <span
          className="text-[9px] uppercase font-semibold tracking-wide"
          style={{ color: isActive ? '#532AA8' : '#7A7484' }}
        >
          {timeLabel}
        </span>
      </div>

      {/* Right column */}
      <div className="flex-1 flex flex-col gap-[6px] min-w-0">
        {/* Row 1: Title + pin + repeat badge */}
        <div className="flex items-center gap-2">
          {request.is_pinned && (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="#532AA8" className="shrink-0">
              <path d="M16 2L20.8 6.8C21.6 7.6 21.2 9 20.1 9.3L18 9.8L14.4 13.4L14.8 18.2C14.9 19.3 13.7 20 12.8 19.4L9.5 17.2L5.7 21L4.3 19.6L8.1 15.8L5.6 12.2C5 11.3 5.7 10.1 6.8 10.2L11.6 10.6L15.2 7L15.7 4.9C16 3.8 17.4 3.4 18.2 4.2L16 2Z" />
            </svg>
          )}
          <span className="text-[14px] font-extrabold uppercase tracking-tight leading-tight">
            {title}
          </span>
          {request.repeat_count > 1 && (
            <span
              className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[11px] font-bold"
              style={{ backgroundColor: '#FFDAD6', color: '#93000A' }}
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M6 1L6 7" stroke="#93000A" strokeWidth="1.5" strokeLinecap="round" />
                <circle cx="6" cy="9.5" r="0.75" fill="#93000A" />
              </svg>
              x{request.repeat_count}
            </span>
          )}
        </div>

        {/* Row 2: Transcript bubble */}
        {transcript && (
          <div
            className="flex items-center gap-1.5 rounded-full px-2.5 py-1 max-w-full"
            style={{ backgroundColor: '#F0F3FF' }}
          >
            {audioUrl && (
              <button
                onClick={handlePlayToggle}
                className="w-[20px] h-[20px] rounded-full flex items-center justify-center shrink-0"
                style={{ backgroundColor: '#532AA8' }}
              >
                {isPlaying ? (
                  <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                    <rect x="1" y="1" width="2" height="6" rx="0.5" fill="white" />
                    <rect x="5" y="1" width="2" height="6" rx="0.5" fill="white" />
                  </svg>
                ) : (
                  <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                    <path d="M2 1L7 4L2 7V1Z" fill="white" />
                  </svg>
                )}
              </button>
            )}
            <svg width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg" className="shrink-0">
              <path
                d="M2.5 5.5V9.5C2.5 10.0523 2.94772 10.5 3.5 10.5H4.5V13L7.5 10.5H11.5C12.0523 10.5 12.5 10.0523 12.5 9.5V5.5C12.5 4.94772 12.0523 4.5 11.5 4.5H3.5C2.94772 4.5 2.5 4.94772 2.5 5.5Z"
                stroke="#7A7484"
                strokeWidth="1.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <span className="text-[12px] truncate" style={{ color: '#7A7484' }}>
              {transcript}
            </span>
          </div>
        )}

        {/* Row 3: Category and severity tags */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {category && (
            <span
              className="text-[11px] font-medium rounded-full px-2 py-0.5"
              style={{ backgroundColor: 'rgba(109,72,181,0.1)', color: '#6D48B5' }}
            >
              {category}
            </span>
          )}
          {severity && (
            <span
              className="text-[11px] font-medium rounded-full px-2 py-0.5"
              style={{ backgroundColor: '#D8E3FA', color: '#7A7484' }}
            >
              {severity}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
