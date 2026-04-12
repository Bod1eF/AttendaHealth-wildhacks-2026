'use client';

import { useEffect, useState } from 'react';
import type { Request } from '@/types/database';

interface CurrentTaskBarProps {
  currentTask: Request | null;
  onTap: (request: Request) => void;
}

function formatElapsed(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}m ${s}s`;
}

export default function CurrentTaskBar({ currentTask, onTap }: CurrentTaskBarProps) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!currentTask?.accepted_at) {
      setElapsed(0);
      return;
    }

    const compute = () =>
      Math.floor((Date.now() - new Date(currentTask.accepted_at!).getTime()) / 1000);

    setElapsed(compute());

    const interval = setInterval(() => {
      setElapsed(compute());
    }, 1000);

    return () => clearInterval(interval);
  }, [currentTask?.accepted_at]);

  const title =
    currentTask?.entries?.[0]?.title ??
    currentTask?.entries?.[currentTask.entries!.length - 1]?.title ??
    'Untitled Request';

  const roomLabel = currentTask?.bed?.room?.label ?? '?';
  const bedLabel = currentTask?.bed?.label ?? '?';

  if (!currentTask) {
    return (
      <section className="bg-bg-queue px-5 py-3">
        <span className="text-primary text-[10px] font-extrabold uppercase tracking-[1px]">
          CURRENT TASK
        </span>
      </section>
    );
  }

  return (
    <section className="bg-bg-queue px-5 pt-3 pb-4">
      {/* Header row */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-primary text-[10px] font-extrabold uppercase tracking-[1px]">
          CURRENT TASK
        </span>
        <div className="flex items-center gap-1.5">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-primary" />
          </span>
          <span className="text-primary text-xs font-semibold">
            Active {formatElapsed(elapsed)}
          </span>
        </div>
      </div>

      {/* Card */}
      <button
        type="button"
        onClick={() => onTap(currentTask)}
        className="w-full flex items-center gap-4 p-4 text-left"
        style={{
          background: 'linear-gradient(135deg, #532AA8, #6B46C1)',
          borderRadius: 32,
          boxShadow: '0 8px 24px rgba(83,42,168,0.25)',
        }}
      >
        {/* Icon in frosted glass circle */}
        <div
          className="flex-shrink-0 flex items-center justify-center w-11 h-11 rounded-full backdrop-blur-md"
          style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="white"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
          </svg>
        </div>

        {/* Center text */}
        <div className="flex-1 min-w-0">
          <p className="text-[10px] uppercase tracking-[1px] font-semibold text-white/70">
            {roomLabel}, {bedLabel}
          </p>
          <p className="text-white font-bold text-lg leading-tight truncate">
            {title}
          </p>
        </div>

        {/* Chevron */}
        <svg
          className="flex-shrink-0"
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="white"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="9 18 15 12 9 6" />
        </svg>
      </button>
    </section>
  );
}
