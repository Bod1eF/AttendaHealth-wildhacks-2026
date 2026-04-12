'use client'

import { useState, useCallback } from 'react'
import { useHistory } from '@/hooks/useHistory'
import RequestModal from '@/components/RequestModal'
import type { Request } from '@/types/database'

function FilterIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M3 5H17M6 10H14M9 15H11" stroke="#7C3AED" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

function formatTime(isoString: string): string {
  const date = new Date(isoString)
  const hours = date.getHours()
  const minutes = date.getMinutes().toString().padStart(2, '0')
  const period = hours >= 12 ? 'PM' : 'AM'
  const displayHour = hours.toString().padStart(2, '0')
  return `${displayHour}:${minutes} ${period}`
}

export default function HistoryPage() {
  const { stats, recentResolutions, resolvedRequests, loading } = useHistory()
  const [selectedRequest, setSelectedRequest] = useState<Request | null>(null)

  const handleCardTap = useCallback(
    (requestId: string) => {
      const req = resolvedRequests.find((r) => r.id === requestId) ?? null
      setSelectedRequest(req)
    },
    [resolvedRequests]
  )

  const handleCloseModal = useCallback(() => {
    setSelectedRequest(null)
  }, [])

  // No-ops for resolved requests — actions aren't available
  const noop = useCallback(async () => {}, [])
  const noopPin = useCallback(async (_id: string, _pinned: boolean) => {}, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-text-secondary text-sm">Loading...</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col px-5 pt-6 bg-bg-primary h-full overflow-hidden">
      {/* Page title */}
      <div className="mb-6">
        <h1 className="text-[28px] font-extrabold tracking-tight text-gray-900">
          Request History
        </h1>
        <p className="text-[#7A7484] text-sm font-medium mt-1">Review completed interactions.</p>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 gap-2 mb-4">
        <div className="col-span-2 bg-purple-600 rounded-xl p-3.5 shadow-md relative overflow-hidden">
          <div className="absolute top-0 right-0 w-20 h-20 bg-purple-500 rounded-full -mr-6 -mt-6 opacity-30" />
          <p className="text-purple-200 text-[9px] font-bold uppercase tracking-wider mb-0.5">Total Today</p>
          <p className="text-white text-[24px] font-extrabold leading-tight">
            {stats.totalToday}
          </p>
          <span className="inline-block mt-1 px-2 py-0.5 bg-green-400/20 text-green-300 text-[10px] font-bold rounded-full">
            {stats.percentChange}
          </span>
        </div>

        <div className="bg-white rounded-xl p-3 shadow-sm">
          <p className="text-text-muted text-[9px] font-bold uppercase tracking-wider mb-1">
            Avg. Response
          </p>
          <p className="text-text-primary text-[16px] font-extrabold">
            {stats.avgResponseTime}
          </p>
        </div>

        <div className="bg-white rounded-xl p-3 shadow-sm">
          <p className="text-text-muted text-[9px] font-bold uppercase tracking-wider mb-1">
            Success Rate
          </p>
          <p className="text-text-primary text-[16px] font-extrabold">
            {stats.successRate}
          </p>
        </div>
      </div>

      {/* Recent Resolutions */}
      <div className="flex-1 min-h-0 flex flex-col pb-[88px]">
        <div className="flex items-center justify-between mb-4 shrink-0">
          <h3 className="text-lg font-extrabold text-text-primary font-[family-name:var(--font-manrope)]">
            Recent Resolutions
          </h3>
          <button className="w-9 h-9 rounded-full bg-white flex items-center justify-center shadow-sm">
            <FilterIcon />
          </button>
        </div>

        <div className="flex flex-col gap-3 overflow-y-auto flex-1 min-h-0">
          {recentResolutions.length === 0 ? (
            <p className="text-text-muted text-sm text-center py-8">No resolved requests yet.</p>
          ) : (
            recentResolutions.map((item) => (
              <div
                key={item.requestId}
                onClick={() => handleCardTap(item.requestId)}
                className="bg-white rounded-2xl p-4 shadow-sm flex items-center justify-between cursor-pointer active:scale-[0.98] transition-transform"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-[14px] font-bold text-text-primary truncate">
                      {item.patientName}
                    </p>
                    <span className="text-text-muted text-xs ml-2 whitespace-nowrap">
                      {item.roomLabel}
                    </span>
                  </div>
                  <p className="text-text-muted text-xs mb-2">{item.category}</p>
                  <div className="flex items-center justify-between">
                    <span className="inline-block px-2 py-0.5 bg-green-100 text-green-700 text-[10px] font-bold uppercase rounded-full">
                      Resolved
                    </span>
                    <span className="text-text-muted text-xs">{formatTime(item.resolvedAt)}</span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Request Modal */}
      <RequestModal
        request={selectedRequest}
        isCurrentTask={false}
        hasCurrentTask={false}
        onClose={handleCloseModal}
        onAccept={noop}
        onResolve={noop}
        onPin={noopPin}
      />
    </div>
  )
}
