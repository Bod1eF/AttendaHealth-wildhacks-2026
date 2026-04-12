'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import type { Request } from '@/types/database'
import RequestCard from '@/components/RequestCard'

interface RequestQueueProps {
  requests: Request[]
  onCardTap: (request: Request) => void
  highlightedRequestId: string | null
}

export default function RequestQueue({
  requests,
  onCardTap,
  highlightedRequestId,
}: RequestQueueProps) {
  const [filter, setFilter] = useState<'all' | 'critical'>('all')
  const cardRefs = useRef<Map<string, HTMLDivElement>>(new Map())

  const getLatestSeverity = (request: Request): string => {
    if (!request.entries || request.entries.length === 0) return ''
    const sorted = [...request.entries].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )
    return sorted[0].severity
  }

  const criticalRequests = requests.filter((r) => {
    const severity = getLatestSeverity(r)
    return severity === 'CRITICAL' || severity === 'NEEDS ATTENTION'
  })

  const filteredRequests = filter === 'all' ? requests : criticalRequests

  const setCardRef = useCallback((id: string, el: HTMLDivElement | null) => {
    if (el) {
      cardRefs.current.set(id, el)
    } else {
      cardRefs.current.delete(id)
    }
  }, [])

  useEffect(() => {
    if (!highlightedRequestId) return

    const el = cardRefs.current.get(highlightedRequestId)
    if (!el) return

    el.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    el.classList.add('ring-highlight')

    const timeout = setTimeout(() => {
      el.classList.remove('ring-highlight')
    }, 2000)

    return () => clearTimeout(timeout)
  }, [highlightedRequestId])

  return (
    <div className="flex flex-col px-[24px] py-[12px]">
      {/* Header */}
      <div className="pb-[8px]">
        <div className="flex items-center justify-between">
          <h2 className="text-[16px] font-extrabold">Request Queue</h2>
          <div className="flex gap-[4px]">
            <button
              onClick={() => setFilter('all')}
              className={`rounded-full px-[13px] py-[5px] text-[10px] font-extrabold transition-all ${
                filter === 'all'
                  ? 'bg-gradient-to-r from-purple-500 to-purple-600 text-white shadow'
                  : 'bg-[#DEE8FF] text-[#494453]'
              }`}
            >
              All ({requests.length})
            </button>
            <button
              onClick={() => setFilter('critical')}
              className={`rounded-full px-[13px] py-[5px] text-[10px] font-extrabold transition-all ${
                filter === 'critical'
                  ? 'bg-gradient-to-r from-purple-500 to-purple-600 text-white shadow'
                  : 'bg-[#DEE8FF] text-[#494453]'
              }`}
            >
              Critical ({criticalRequests.length})
            </button>
          </div>
        </div>
      </div>

      {/* Scrollable list */}
      <div className="overflow-y-auto flex-1 space-y-3">
        {filteredRequests.map((request, index) => (
          <div
            key={request.id}
            ref={(el) => setCardRef(request.id, el)}
            className="transition-all duration-300"
          >
            <RequestCard
              request={request}
              isActive={false}
              onTap={() => onCardTap(request)}
            />
          </div>
        ))}
      </div>

      <style jsx>{`
        .ring-highlight {
          animation: highlightRing 2s ease-out;
        }
        @keyframes highlightRing {
          0% {
            box-shadow: 0 0 0 0 rgba(147, 51, 234, 0.5);
          }
          20% {
            box-shadow: 0 0 0 4px rgba(147, 51, 234, 0.4);
          }
          100% {
            box-shadow: 0 0 0 0 rgba(147, 51, 234, 0);
          }
        }
      `}</style>
    </div>
  )
}
