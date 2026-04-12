"use client";

import { useState, useEffect, useCallback } from "react";
import type { Room, Bed, Request } from "@/types/database";

interface FloorPlanMapProps {
  rooms: Room[];
  beds: Bed[];
  requests: Request[];
  currentTask: Request | null;
  onBedTap: (bedId: number) => void;
  highlightedBedId: number | null;
}

type BedState = "none" | "pending" | "current" | "critical";

function getBedState(bedId: number, requests: Request[], currentTask: Request | null): BedState {
  if (currentTask && currentTask.bed_id === bedId) return "current";

  const req = requests.find((r) => r.bed_id === bedId);
  if (!req) return "none";

  const hasCritical = req.entries?.some((e) => e.severity === "CRITICAL");
  if (hasCritical) return "critical";

  return "pending";
}

/** Short bed label like "1A", "2B" */
function getBedShortLabel(bed: Bed, room: Room): string {
  const roomNum = room.label.replace(/\D/g, "");
  const bedLetter = bed.label.replace(/Bed\s*/i, "");
  return `${roomNum}${bedLetter}`;
}

const bedBaseStyle =
  "flex-1 flex items-center justify-center rounded-sm relative transition-all duration-200 min-h-[36px] cursor-pointer";

const bedStyles: Record<BedState, string> = {
  none: `${bedBaseStyle} bg-[#E8EDF8] text-[#6B7280] border border-[#D1D5DB]`,
  pending: `${bedBaseStyle} bg-[rgba(83,42,168,0.08)] border-2 border-[rgba(83,42,168,0.4)] text-[#532AA8]`,
  current: `${bedBaseStyle} bg-[#532AA8] text-white border-2 border-[#532AA8]`,
  critical: `${bedBaseStyle} bg-[rgba(186,26,26,0.12)] border-2 border-[rgba(186,26,26,0.5)] text-[#BA1A1A]`,
};

function BedCell({
  bed,
  room,
  state,
  selected,
  onTap,
}: {
  bed: Bed;
  room: Room;
  state: BedState;
  highlighted: boolean;
  onTap: (bedId: number) => void;
}) {
  const [pulse, setPulse] = useState(false);

  useEffect(() => {
    if (highlighted) {
      setPulse(true);
      const timer = setTimeout(() => setPulse(false), 2000);
      return () => clearTimeout(timer);
    }
    setPulse(false);
  }, [highlighted]);

  const label = getBedShortLabel(bed, room);

  return (
    <button
      onClick={() => onTap(bed.id)}
      className={`${bedStyles[state]} ${pulse ? "animate-pulse scale-105" : ""}`}
    >
      <span className={`text-[10px] ${state === "current" ? "font-extrabold" : "font-bold"}`}>
        {label}
      </span>

      {/* State indicator — square corner markers matching Figma */}
      {state === "current" && <div className="absolute top-0 right-0 w-2 h-2 bg-[#532AA8]" />}
      {state === "pending" && (
        <div className="absolute top-0.5 right-0.5 w-1.5 h-1.5 bg-[rgba(83,42,168,0.4)]" />
      )}
      {state === "critical" && (
        <div className="absolute top-0.5 right-0.5 w-1.5 h-1.5 bg-[#BA1A1A] animate-pulse" />
      )}
    </button>
  );
}

function RoomCell({
  room,
  beds,
  requests,
  currentTask,
  selectedBedId,
  onBedTap,
  labelPosition,
}: {
  room: Room;
  beds: Bed[];
  requests: Request[];
  currentTask: Request | null;
  highlightedBedId: number | null;
  onBedTap: (bedId: number) => void;
  labelPosition: "top" | "bottom";
}) {
  const roomBeds = beds.filter((b) => b.room_id === room.id);

  const label = (
    <div className="h-3.5 flex items-center justify-center bg-[#C8D5EC] rounded-sm">
      <span className="text-[8px] font-extrabold uppercase tracking-tight text-[#3B4252]">
        {room.label}
      </span>
    </div>
  );

  return (
    <div className="flex-1 bg-white rounded-md border border-[#A8A0B4] flex flex-col p-1 gap-1 shadow-sm">
      {labelPosition === "top" && label}
      <div className="flex gap-1 flex-1">
        {roomBeds.map((bed) => (
          <BedCell
            key={bed.id}
            bed={bed}
            room={room}
            state={getBedState(bed.id, requests, currentTask)}
            selected={selectedBedId === bed.id}
            onTap={onBedTap}
          />
        ))}
      </div>
      {labelPosition === "bottom" && label}
    </div>
  );
}

export default function FloorPlanMap({
  rooms,
  beds,
  requests,
  currentTask,
  onBedTap,
}: FloorPlanMapProps) {
  const currentBed = currentTask ? beds.find((b) => b.id === currentTask.bed_id) : null;
  const currentRoom = currentBed ? rooms.find((r) => r.id === currentBed.room_id) : null;

  const topRooms = rooms.slice(0, 2);
  const bottomRooms = rooms.slice(2, 4);

  const activeLabel = currentBed && currentRoom ? getBedShortLabel(currentBed, currentRoom) : null;

  const [minimized, setMinimized] = useState(false);

  return (
    <section
      className={`bg-[#F0F3FF] border-t border-[rgba(203,195,213,0.1)] px-4 pt-2 ${minimized ? "pb-[88px]" : "pb-[108px]"}`}
    >
      {/* Header */}
      <div className={`flex items-center justify-between px-1 ${minimized ? "mb-0" : "mb-2"}`}>
        <h2 className="text-[14px] font-extrabold text-gray-900">
          Northwestern Memorial Hospital - Ward 4B
        </h2>
        <div className="flex items-center gap-2">
          {activeLabel && (
            <div className="flex items-center gap-1.5 text-[10px] font-extrabold text-[#532AA8] uppercase tracking-widest">
              <span className="w-2 h-2 rounded-full bg-[#532AA8] animate-pulse" />
              ACTIVE: {activeLabel}
            </div>
          )}
          <button
            onClick={() => setMinimized((prev) => !prev)}
            className="w-6 h-6 rounded-md bg-[#D8E0F0] border border-[#B0B8CC] flex items-center justify-center"
          >
            <svg
              width="12"
              height="12"
              viewBox="0 0 12 12"
              fill="none"
              className={`transition-transform duration-200 ${minimized ? "rotate-180" : ""}`}
            >
              <path
                d="M2 4.5L6 8.5L10 4.5"
                stroke="#5A6275"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>
      </div>

      {/* Map container — architectural blueprint style */}
      <div
        className={`relative w-full bg-[#D8E0F0] rounded-lg p-2 flex flex-col gap-1.5 border border-[#B0B8CC] transition-all duration-300 overflow-hidden ${
          minimized ? "h-0 p-0 border-0 opacity-0" : "h-48 opacity-100"
        }`}
      >
        {/* Top row */}
        <div className="flex-1 flex gap-2">
          {topRooms.map((room) => (
            <RoomCell
              key={room.id}
              room={room}
              beds={beds}
              requests={requests}
              currentTask={currentTask}
              selectedBedId={selectedBedId}
              onBedTap={handleBedTap}
              labelPosition="bottom"
            />
          ))}
        </div>

        {/* Corridor */}
        <div className="h-5 flex items-center justify-center px-4 relative shrink-0">
          <div className="absolute inset-x-4 h-[1px] bg-[#9BA3B5]" />
          <span className="text-[8px] font-extrabold uppercase tracking-wider text-[#5A6275] bg-[#D8E0F0] px-2 relative z-10 italic">
            Main Corridor 4B
          </span>
        </div>

        {/* Bottom row */}
        <div className="flex-1 flex gap-2">
          {bottomRooms.map((room) => (
            <RoomCell
              key={room.id}
              room={room}
              beds={beds}
              requests={requests}
              currentTask={currentTask}
              selectedBedId={selectedBedId}
              onBedTap={handleBedTap}
              labelPosition="top"
            />
          ))}
        </div>

        {/* Nurse Station */}
        <div
          className="absolute right-0 top-1/2 -translate-y-1/2 h-14 w-3 rounded-l-md border-y border-l border-white/20 flex items-center justify-center shadow-lg"
          style={{ background: "linear-gradient(180deg, #6B46C1 0%, #532AA8 100%)" }}
        >
          <span
            className="text-white text-[6px] font-extrabold tracking-tight"
            style={{ writingMode: "vertical-lr" }}
          >
            STATION
          </span>
        </div>
      </div>
    </section>
  );
}
