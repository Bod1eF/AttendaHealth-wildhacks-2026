'use client'

import { useHistory } from '@/hooks/useHistory'

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
  const { stats, recentResolutions, loading } = useHistory()

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-text-secondary text-sm">Loading...</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col px-5 pt-6 pb-[120px] bg-bg-primary min-h-full">
      {/* Page title */}
      <div className="mb-6">
        <h1 className="text-[28px] font-extrabold tracking-tight text-gray-900">
          Request History
        </h1>
        <p className="text-[#7A7484] text-sm font-medium mt-1">Review completed interactions.</p>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        {/* Total Today - spans full width on first row or 2 cols */}
        <div className="col-span-2 bg-purple-600 rounded-2xl p-5 shadow-md relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500 rounded-full -mr-8 -mt-8 opacity-30" />
          <p className="text-purple-200 text-xs font-bold uppercase tracking-wider mb-1">Total Today</p>
          <p className="text-white text-[32px] font-extrabold font-[family-name:var(--font-manrope)] leading-tight">
            {stats.totalToday}
          </p>
          <span className="inline-block mt-2 px-2 py-0.5 bg-green-400/20 text-green-300 text-xs font-bold rounded-full">
            {stats.percentChange}
          </span>
        </div>

        {/* Avg Response */}
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <p className="text-text-muted text-[10px] font-bold uppercase tracking-wider mb-2">
            Avg. Response
          </p>
          <p className="text-text-primary text-[20px] font-extrabold font-[family-name:var(--font-manrope)]">
            {stats.avgResponseTime}
          </p>
        </div>

        {/* Success Rate */}
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <p className="text-text-muted text-[10px] font-bold uppercase tracking-wider mb-2">
            Success Rate
          </p>
          <p className="text-text-primary text-[20px] font-extrabold font-[family-name:var(--font-manrope)]">
            {stats.successRate}
          </p>
        </div>
      </div>

      {/* Recent Resolutions */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-extrabold text-text-primary font-[family-name:var(--font-manrope)]">
            Recent Resolutions
          </h3>
          <button className="w-9 h-9 rounded-full bg-white flex items-center justify-center shadow-sm">
            <FilterIcon />
          </button>
        </div>

        <div className="flex flex-col gap-3">
          {recentResolutions.length === 0 ? (
            <p className="text-text-muted text-sm text-center py-8">No resolved requests yet.</p>
          ) : (
            recentResolutions.map((item, index) => (
              <div
                key={index}
                className="bg-white rounded-2xl p-4 shadow-sm flex items-center justify-between"
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
    </div>
  )
}
