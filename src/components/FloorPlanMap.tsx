'use client'

import { useState, useEffect, useCallback } from 'react'
import type { Room, Bed, Request } from '@/types/database'

interface FloorPlanMapProps {
  rooms: Room[]
  beds: Bed[]
  requests: Request[]
  currentTask: Request | null
  onBedTap: (bedId: number) => void
  highlightedBedId: number | null
}

type BedState = 'none' | 'pending' | 'current' | 'critical'

function getBedState(
  bedId: number,
  requests: Request[],
  currentTask: Request | null
): BedState {
  if (currentTask && currentTask.bed_id === bedId) return 'current'

  const req = requests.find((r) => r.bed_id === bedId)
  if (!req) return 'none'

  const hasCritical = req.entries?.some((e) => e.severity === 'CRITICAL')
  if (hasCritical) return 'critical'

  return 'pending'
}

const bedStyles: Record<BedState, string> = {
  none: 'bg-[#E7EEFF] text-[#7A7484]',
  pending:
    'border border-[rgba(83,42,168,0.3)] bg-[rgba(83,42,168,0.05)] text-[#532AA8]',
  current:
    'border-2 border-[#532AA8] bg-[rgba(83,42,168,0.1)] text-[#532AA8] font-extrabold',
  critical:
    'border border-[rgba(186,26,26,0.3)] bg-[rgba(186,26,26,0.1)] text-[#BA1A1A]',
}

function BedMarker({
  bed,
  state,
  highlighted,
  onTap,
}: {
  bed: Bed
  state: BedState
  highlighted: boolean
  onTap: (bedId: number) => void
}) {
  const [pulse, setPulse] = useState(false)

  useEffect(() => {
    if (highlighted) {
      setPulse(true)
      const timer = setTimeout(() => setPulse(false), 2000)
      return () => clearTimeout(timer)
    }
    setPulse(false)
  }, [highlighted])

  return (
    <button
      onClick={() => onTap(bed.id)}
      className={`relative flex items-center justify-center w-[66px] h-full min-h-[48px] rounded-[12px] text-[10px] font-bold transition-transform duration-300 ${bedStyles[state]} ${pulse ? 'animate-pulse scale-105' : ''}`}
    >
      {bed.label}

      {state === 'pending' && (
        <span className="absolute top-1.5 right-1.5 w-[6px] h-[6px] rounded-full bg-[#532AA8]" />
      )}
      {state === 'current' && (
        <span className="absolute top-1 right-1 w-[10px] h-[10px] rounded-full bg-[#532AA8] border-2 border-white" />
      )}
      {state === 'critical' && (
        <span className="absolute top-1.5 right-1.5 w-[6px] h-[6px] rounded-full bg-[#BA1A1A]" />
      )}
    </button>
  )
}

function RoomContainer({
  room,
  beds,
  requests,
  currentTask,
  highlightedBedId,
  onBedTap,
  labelPosition,
}: {
  room: Room
  beds: Bed[]
  requests: Request[]
  currentTask: Request | null
  highlightedBedId: number | null
  onBedTap: (bedId: number) => void
  labelPosition: 'top' | 'bottom'
}) {
  const roomBeds = beds.filter((b) => b.room_id === room.id)

  const label = (
    <div className="bg-[#DEE8FF] rounded-[6px] py-1 px-2 text-center">
      <span className="text-[8px] font-extrabold uppercase tracking-wide text-[#7A7484]">
        {room.label}
      </span>
    </div>
  )

  return (
    <div className="flex-1 bg-[#F0F3FF] rounded-[32px] border border-[rgba(203,195,213,0.2)] p-[7px] flex flex-col gap-1.5">
      {labelPosition === 'top' && label}
      <div className="flex gap-[6px] flex-1">
        {roomBeds.map((bed) => (
          <BedMarker
            key={bed.id}
            bed={bed}
            state={getBedState(bed.id, requests, currentTask)}
            highlighted={highlightedBedId === bed.id}
            onTap={onBedTap}
          />
        ))}
      </div>
      {labelPosition === 'bottom' && label}
    </div>
  )
}

export default function FloorPlanMap({
  rooms,
  beds,
  requests,
  currentTask,
  onBedTap,
  highlightedBedId,
}: FloorPlanMapProps) {
  const currentBed = currentTask
    ? beds.find((b) => b.id === currentTask.bed_id)
    : null

  const topRooms = rooms.slice(0, 2)
  const bottomRooms = rooms.slice(2, 4)

  return (
    <section className="bg-[#F0F3FF] border-t border-[rgba(203,195,213,0.2)] px-[24px] pt-[25px] pb-[112px]">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-[16px] font-extrabold text-gray-900">
          Unit 4B Floor Plan
        </h2>
        {currentTask && currentBed && (
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#532AA8]" />
            <span className="text-[10px] font-extrabold tracking-wide uppercase text-[#532AA8]">
              ACTIVE: {currentBed.label}
            </span>
          </div>
        )}
      </div>

      {/* Map container */}
      <div
        className="relative bg-white rounded-[16px] border border-[rgba(203,195,213,0.2)] p-[13px] flex flex-col gap-[12px]"
        style={{ boxShadow: 'inset 0px 2px 4px rgba(0,0,0,0.05)' }}
      >
        {/* Top row */}
        <div className="flex gap-[12px]">
          {topRooms.map((room) => (
            <RoomContainer
              key={room.id}
              room={room}
              beds={beds}
              requests={requests}
              currentTask={currentTask}
              highlightedBedId={highlightedBedId}
              onBedTap={onBedTap}
              labelPosition="bottom"
            />
          ))}
        </div>

        {/* Corridor */}
        <div className="relative bg-[#E7EEFF] rounded-[24px] h-[12px] flex items-center justify-center border border-dashed border-[rgba(203,195,213,0.3)]">
          <span className="text-[8px] font-extrabold uppercase tracking-widest text-[#A8A0B4]">
            CORRIDOR 4B
          </span>
        </div>

        {/* Bottom row */}
        <div className="flex gap-[12px]">
          {bottomRooms.map((room) => (
            <RoomContainer
              key={room.id}
              room={room}
              beds={beds}
              requests={requests}
              currentTask={currentTask}
              highlightedBedId={highlightedBedId}
              onBedTap={onBedTap}
              labelPosition="top"
            />
          ))}
        </div>

        {/* Station indicator */}
        <div
          className="absolute right-0 top-1/2 -translate-y-1/2 w-[16px] h-[56px] rounded-l-[8px] flex items-center justify-center"
          style={{
            background: 'linear-gradient(180deg, #7C3AED 0%, #532AA8 100%)',
          }}
        >
          <span
            className="text-white text-[7px] font-extrabold tracking-wide"
            style={{ writingMode: 'vertical-rl', textOrientation: 'mixed' }}
          >
            STATION
          </span>
        </div>
      </div>
    </section>
  )
}
