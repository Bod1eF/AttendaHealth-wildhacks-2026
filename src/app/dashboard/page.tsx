'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import { useRequests } from '@/hooks/useRequests'
import { useRooms } from '@/hooks/useRooms'
import { acceptRequest, resolveRequest, togglePin } from '@/lib/actions'
import CurrentTaskBar from '@/components/CurrentTaskBar'
import RequestQueue from '@/components/RequestQueue'
import FloorPlanMap from '@/components/FloorPlanMap'
import RequestModal from '@/components/RequestModal'
import type { Request } from '@/types/database'

export default function DashboardHome() {
  const router = useRouter()
  const { nurse, isAuthenticated } = useAuth()
  const { requests, currentTask, loading: requestsLoading, refetch } = useRequests()
  const { rooms, beds, loading: roomsLoading } = useRooms()

  // Store only the ID — derive the full object from the requests list
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null)
  const [highlightedRequestId, setHighlightedRequestId] = useState<string | null>(null)

  // Derive selected request from the list so it always has fresh data
  const selectedRequest = useMemo(() => {
    if (!selectedRequestId) return null
    const all = currentTask ? [currentTask, ...requests] : requests
    return all.find((r) => r.id === selectedRequestId) ?? null
  }, [selectedRequestId, requests, currentTask])

  const isCurrentTask = useMemo(
    () => selectedRequest !== null && currentTask !== null && selectedRequest.id === currentTask.id,
    [selectedRequest, currentTask]
  )

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login')
    }
  }, [isAuthenticated, router])

  const handleCurrentTaskTap = useCallback((request: Request) => {
    setSelectedRequestId(request.id)
  }, [])

  const handleCardTap = useCallback((request: Request) => {
    setSelectedRequestId(request.id)
  }, [])

  const handleBedTap = useCallback(
    (bedId: number) => {
      const request = requests.find((r) => r.bed_id === bedId)
      if (request) {
        // Toggle: if same request is highlighted, clear it; otherwise set it
        setHighlightedRequestId((prev) => {
          const prevId = prev?.split('::')[0]
          return prevId === request.id ? null : request.id
        })
      } else {
        setHighlightedRequestId(null)
      }
    },
    [requests]
  )

  const handleAccept = useCallback(
    async (id: string) => {
      await acceptRequest(id)
      setSelectedRequestId(null)
      refetch()
    },
    [refetch]
  )

  const handleResolve = useCallback(
    async (id: string) => {
      await resolveRequest(id)
      setSelectedRequestId(null)
      refetch()
    },
    [refetch]
  )

  // Pin: fire-and-forget, no refetch — realtime handles the in-place update
  const handlePin = useCallback(
    async (id: string, isPinned: boolean) => {
      await togglePin(id, isPinned)
    },
    []
  )

  const handleCloseModal = useCallback(() => {
    setSelectedRequestId(null)
  }, [])

  const loading = requestsLoading || roomsLoading

  if (!isAuthenticated) return null

  if (loading) {
    return (
      <div className="animate-pulse space-y-4 p-6">
        <div className="h-24 bg-gray-200 rounded-2xl" />
        <div className="h-8 bg-gray-200 rounded-lg w-1/3" />
        <div className="h-32 bg-gray-200 rounded-2xl" />
        <div className="h-32 bg-gray-200 rounded-2xl" />
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <CurrentTaskBar currentTask={currentTask} onTap={handleCurrentTaskTap} />

      <div className="flex-1 min-h-0 overflow-y-auto">
        <RequestQueue
          requests={requests}
          onCardTap={handleCardTap}
          highlightedRequestId={highlightedRequestId}
        />
      </div>

      <div className="shrink-0">
        <FloorPlanMap
          rooms={rooms}
          beds={beds}
          requests={requests}
          currentTask={currentTask}
          onBedTap={handleBedTap}
        />
      </div>

      <RequestModal
        request={selectedRequest}
        isCurrentTask={isCurrentTask}
        hasCurrentTask={currentTask !== null}
        onClose={handleCloseModal}
        onAccept={handleAccept}
        onResolve={handleResolve}
        onPin={handlePin}
      />
    </div>
  )
}
