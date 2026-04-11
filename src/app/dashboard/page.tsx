'use client'

import { useState, useEffect, useCallback } from 'react'
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

  const [selectedRequest, setSelectedRequest] = useState<Request | null>(null)
  const [highlightedBedId, setHighlightedBedId] = useState<number | null>(null)
  const [highlightedRequestId, setHighlightedRequestId] = useState<string | null>(null)

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login')
    }
  }, [isAuthenticated, router])

  // Auto-clear highlighted bed after 2s
  useEffect(() => {
    if (highlightedBedId === null) return
    const timer = setTimeout(() => setHighlightedBedId(null), 2000)
    return () => clearTimeout(timer)
  }, [highlightedBedId])

  // Auto-clear highlighted request after 2s
  useEffect(() => {
    if (highlightedRequestId === null) return
    const timer = setTimeout(() => setHighlightedRequestId(null), 2000)
    return () => clearTimeout(timer)
  }, [highlightedRequestId])

  // CurrentTaskBar tap -> open modal for current task
  const handleCurrentTaskTap = useCallback((request: Request) => {
    setSelectedRequest(request)
  }, [])

  // RequestQueue card tap -> open modal + highlight bed on map
  const handleCardTap = useCallback((request: Request) => {
    setSelectedRequest(request)
    if (request.bed_id) {
      setHighlightedBedId(request.bed_id)
    }
  }, [])

  // FloorPlanMap bed tap -> highlight corresponding request card
  const handleBedTap = useCallback(
    (bedId: number) => {
      const request = requests.find((r) => r.bed_id === bedId)
      if (request) {
        setHighlightedRequestId(request.id)
      }
    },
    [requests]
  )

  // Modal actions
  const handleAccept = useCallback(
    async (id: string) => {
      await acceptRequest(id)
      setSelectedRequest(null)
      refetch()
    },
    [refetch]
  )

  const handleResolve = useCallback(
    async (id: string) => {
      await resolveRequest(id)
      setSelectedRequest(null)
      refetch()
    },
    [refetch]
  )

  const handlePin = useCallback(
    async (id: string, isPinned: boolean) => {
      await togglePin(id, isPinned)
      refetch()
    },
    [refetch]
  )

  const handleCloseModal = useCallback(() => {
    setSelectedRequest(null)
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
    <div className="flex flex-col h-full">
      <CurrentTaskBar currentTask={currentTask} onTap={handleCurrentTaskTap} />

      <div className="flex-1 overflow-y-auto pb-[120px]">
        <RequestQueue
          requests={requests}
          onCardTap={handleCardTap}
          highlightedRequestId={highlightedRequestId}
        />
      </div>

      <FloorPlanMap
        rooms={rooms}
        beds={beds}
        requests={requests}
        currentTask={currentTask}
        onBedTap={handleBedTap}
        highlightedBedId={highlightedBedId}
      />

      <RequestModal
        request={selectedRequest}
        isCurrentTask={
          selectedRequest !== null &&
          currentTask !== null &&
          selectedRequest.id === currentTask.id
        }
        hasCurrentTask={currentTask !== null}
        onClose={handleCloseModal}
        onAccept={handleAccept}
        onResolve={handleResolve}
        onPin={handlePin}
      />
    </div>
  )
}
