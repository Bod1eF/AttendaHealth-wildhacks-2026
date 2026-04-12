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
  const [activeHighlight, setActiveHighlight] = useState<string | null>(null)
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

  // When parent sets a new highlightedRequestId, scroll to it and activate highlight
  useEffect(() => {
    if (!highlightedRequestId) {
      setActiveHighlight(null)
      return
    }

    const requestId = highlightedRequestId.split('::')[0]

    const el = cardRefs.current.get(requestId)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    }

    setActiveHighlight(requestId)
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
      <div className="overflow-y-auto flex-1 space-y-3 p-2">
        {filteredRequests.map((request) => {
          const isHighlighted = activeHighlight === request.id
          return (
            <div
              key={request.id}
              ref={(el) => setCardRef(request.id, el)}
              className="rounded-[16px]"
              style={{
                boxShadow: isHighlighted
                  ? '0 0 0 3px #532AA8, 0 0 16px rgba(83,42,168,0.3)'
                  : '0 0 0 0px transparent, 0 0 0px transparent',
                transition: 'box-shadow 0.8s ease-out',
              }}
            >
              <RequestCard
                request={request}
                isActive={false}
                onTap={() => onCardTap(request)}
              />
            </div>
          )
        })}
      </div>
    </div>
  )
}
