'use client'

import { useEffect } from 'react'
import { Request } from '@/types/database'
import { useToast } from '@/context/ToastContext'
import AudioPlayer from '@/components/AudioPlayer'

interface RequestModalProps {
  request: Request | null
  isCurrentTask: boolean
  hasCurrentTask: boolean
  onClose: () => void
  onAccept: (id: string) => void
  onResolve: (id: string) => void
  onPin: (id: string, isPinned: boolean) => void
}

function timeAgo(dateStr: string): string {
  const now = new Date()
  const date = new Date(dateStr)
  const diffMs = now.getTime() - date.getTime()
  const diffMin = Math.floor(diffMs / 60000)
  if (diffMin < 1) return 'just now'
  if (diffMin < 60) return `${diffMin}m ago`
  const diffHr = Math.floor(diffMin / 60)
  if (diffHr < 24) return `${diffHr}h ago`
  return `${Math.floor(diffHr / 24)}d ago`
}

function severityColor(severity: string): string {
  const s = severity.toLowerCase()
  if (s === 'critical' || s === 'high') return '#BA1A1A'
  if (s === 'medium' || s === 'moderate' || s === 'needs attention') return '#E8810C'
  return '#3A7D34'
}

export default function RequestModal({
  request,
  isCurrentTask,
  hasCurrentTask,
  onClose,
  onAccept,
  onResolve,
  onPin,
}: RequestModalProps) {
  const { showToast } = useToast()

  // Lock body scroll when modal is open
  useEffect(() => {
    if (!request) return
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = ''
    }
  }, [request])

  if (!request) return null

  const roomLabel = request.bed?.room?.label || '?'
  const bedLabel = request.bed?.label || '?'
  const entries = request.entries || []
  const latestEntry = entries.length > 0 ? entries[entries.length - 1] : null
  const sortedEntries = [...entries].reverse()

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" />

      {/* Modal */}
      <div
        className="relative w-full max-w-[420px] bg-white rounded-[24px] overflow-y-auto animate-slide-up"
        style={{ maxHeight: '85vh' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 pt-5 pb-3">
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full"
            style={{ backgroundColor: '#F3F0F5' }}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M1 1L13 13M13 1L1 13" stroke="#49454F" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>

          {/* Current task label */}
          {isCurrentTask && (
            <span
              className="text-[10px] font-bold uppercase tracking-widest"
              style={{ color: '#532AA8' }}
            >
              Current Task
            </span>
          )}

          {/* Room + Bed title */}
          <h2 className="text-[22px] font-extrabold mt-1">
            Room {roomLabel}, Bed {bedLabel}
          </h2>

          {/* Patient info */}
          <p className="text-[12px] mt-1" style={{ color: '#7A7484' }}>
            Patient info available at bedside
          </p>
        </div>

        {/* Voice Request Transcript Container */}
        <div className="px-6 pb-4">
          <div className="rounded-2xl border border-[#CBC3D5]/30 bg-[#F8F5FA] p-4">
            {/* Label row */}
            <div className="flex items-center justify-between mb-3">
              <span
                className="text-[10px] font-bold uppercase tracking-widest"
                style={{ color: '#532AA8' }}
              >
                Voice Request
              </span>
              {latestEntry && (
                <span className="text-[10px] font-medium uppercase tracking-wide" style={{ color: '#7A7484' }}>
                  {timeAgo(latestEntry.created_at)}
                </span>
              )}
            </div>

            {/* Audio Player */}
            <div className="mb-3">
              <AudioPlayer audioUrl={latestEntry?.audio_url ?? null} />
            </div>

            {/* Transcript text — styled as quotation */}
            <div className="border-l-[3px] border-[#532AA8]/30 pl-3">
              {sortedEntries.map((entry) => (
                <div key={entry.id} className="mb-3 last:mb-0">
                  {entries.length > 1 && (
                    <span className="text-[9px] font-medium uppercase tracking-wide mb-1 block" style={{ color: '#7A7484' }}>
                      {timeAgo(entry.created_at)}
                    </span>
                  )}
                  <p className="text-[13px] leading-relaxed italic text-[#3B3347]">
                    &ldquo;{entry.transcript}&rdquo;
                  </p>
                </div>
              ))}
              {sortedEntries.length === 0 && (
                <p className="text-[13px] italic text-[#7A7484]">No transcript available</p>
              )}
            </div>
          </div>
        </div>

        {/* AI Analysis section */}
        {latestEntry && (
          <div className="px-6 pb-4">
            <div
              className="rounded-2xl p-4 border border-[#CBC3D5]/20"
              style={{ backgroundColor: '#F0F3FF' }}
            >
              <span
                className="text-[10px] font-bold uppercase tracking-widest block mb-3"
                style={{ color: '#7A7484' }}
              >
                AI Analysis
              </span>

              {/* Severity */}
              {latestEntry.severity && (
                <div className="flex items-center gap-2 mb-2">
                  <span
                    className="w-2.5 h-2.5 rounded-full inline-block shrink-0"
                    style={{ backgroundColor: severityColor(latestEntry.severity) }}
                  />
                  <span className="text-[13px] font-bold uppercase" style={{ color: severityColor(latestEntry.severity) }}>
                    {latestEntry.severity}
                  </span>
                </div>
              )}

              {/* Category pill */}
              {latestEntry.category && (
                <span
                  className="inline-block text-[11px] font-medium rounded-full px-3 py-1"
                  style={{ backgroundColor: 'rgba(109,72,181,0.1)', color: '#6D48B5' }}
                >
                  {latestEntry.category}
                </span>
              )}
            </div>
          </div>
        )}

        {/* Action buttons */}
        <div
          className="sticky bottom-0 px-6 pt-3 pb-6 bg-white rounded-b-[24px]"
          style={{ boxShadow: '0 -4px 12px rgba(0,0,0,0.05)' }}
        >
          <div className="flex gap-3">
            {/* Pin button */}
            <button
              onClick={() => onPin(request.id, !request.is_pinned)}
              className="flex-1 h-[48px] rounded-full text-[14px] font-bold border-2 transition-colors"
              style={{
                borderColor: '#532AA8',
                color: '#532AA8',
                backgroundColor: 'transparent',
              }}
            >
              {request.is_pinned ? 'Unpin Patient' : 'Pin Patient'}
            </button>

            {/* On the Way / Mark Resolved */}
            {isCurrentTask ? (
              <button
                onClick={() => onResolve(request.id)}
                className="flex-1 h-[48px] rounded-full text-[14px] font-bold text-white transition-colors"
                style={{ backgroundColor: '#BA1A1A' }}
              >
                Mark Resolved
              </button>
            ) : (
              <button
                onClick={() => {
                  if (hasCurrentTask) {
                    showToast('You already have an active task. Please resolve it first.', 'error')
                    return
                  }
                  onAccept(request.id)
                }}
                disabled={hasCurrentTask}
                className="flex-1 h-[48px] rounded-full text-[14px] font-bold text-white transition-colors disabled:opacity-50"
                style={{
                  background: hasCurrentTask
                    ? '#A099A8'
                    : 'linear-gradient(135deg, #6D48B5, #532AA8)',
                }}
              >
                On the Way
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
