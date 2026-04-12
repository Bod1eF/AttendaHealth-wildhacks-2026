"use client";

import { useEffect, useState } from "react";
import { Request, Patient } from "@/types/database";
import { getSupabase } from "@/lib/supabase";
import { useToast } from "@/context/ToastContext";
import AudioPlayer from "@/components/AudioPlayer";

const supabase = getSupabase();

interface RequestModalProps {
  request: Request | null;
  isCurrentTask: boolean;
  hasCurrentTask: boolean;
  onClose: () => void;
  onAccept: (id: string) => void;
  onResolve: (id: string) => void;
  onPin: (id: string, isPinned: boolean) => void;
}

function timeAgo(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  return `${Math.floor(diffHr / 24)}d ago`;
}

function severityColor(severity: string): string {
  const s = severity.toLowerCase();
  if (s === "critical" || s === "high") return "#BA1A1A";
  if (s === "medium" || s === "moderate" || s === "needs attention") return "#E8810C";
  return "#3A7D34";
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
  const { showToast } = useToast();

  const [patient, setPatient] = useState<Patient | null>(null);
  const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null);
  const [showTranslated, setShowTranslated] = useState(true);

  // Lock body scroll when modal is open
  useEffect(() => {
    if (!request) return;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [request]);

  // Reset selected entry when request changes
  useEffect(() => {
    setSelectedEntryId(null);
  }, [request]);

  // Fetch patient for this bed
  useEffect(() => {
    if (!request) {
      setPatient(null);
      return;
    }
    supabase
      .from("patients")
      .select("*")
      .eq("bed_id", request.bed_id)
      .single()
      .then(({ data }) => setPatient(data as Patient | null));
  }, [request]);

  if (!request) return null;

  const roomLabel = request.bed?.room?.label || "?";
  const bedLabel = request.bed?.label || "?";
  const entries = request.entries || [];
  const latestEntry = entries.length > 0 ? entries[entries.length - 1] : null;
  const sortedEntries = [...entries].reverse();

  // The entry whose audio is currently playing — defaults to latest
  const activeEntry = selectedEntryId
    ? entries.find((e) => e.id === selectedEntryId) ?? latestEntry
    : latestEntry;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4" onClick={onClose}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" />

      {/* Modal */}
      <div
        className="relative w-full max-w-[420px] bg-white rounded-[24px] overflow-y-auto animate-slide-up"
        style={{ maxHeight: "85vh" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 pt-5 pb-3">
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full"
            style={{ backgroundColor: "#F3F0F5" }}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path
                d="M1 1L13 13M13 1L1 13"
                stroke="#49454F"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </button>

          {/* Current task label */}
          {isCurrentTask && (
            <span
              className="text-[10px] font-bold uppercase tracking-widest"
              style={{ color: "#532AA8" }}
            >
              Current Task
            </span>
          )}

          {/* Room + Bed title */}
          <h2 className="text-[22px] font-extrabold mt-1">
            {roomLabel}, {bedLabel}
          </h2>

          {/* Patient info summary */}
          {patient ? (
            <div className="flex items-center gap-3 mt-2">
              <p className="text-[13px] font-semibold text-gray-900">{patient.name}</p>
              <span className="text-[11px] text-[#7A7484]">
                {patient.age ? `${patient.age}${patient.sex ? `/${patient.sex[0]}` : ''}` : ''}
                {patient.blood_type ? ` · ${patient.blood_type}` : ''}
              </span>
            </div>
          ) : (
            <p className="text-[12px] mt-1" style={{ color: "#7A7484" }}>
              Patient info available at bedside
            </p>
          )}

          {/* Allergies warning */}
          {patient?.allergies && patient.allergies.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {patient.allergies.map((a) => (
                <span key={a} className="px-2 py-0.5 bg-[#FFDAD6] text-[#93000A] text-[10px] font-bold rounded-full">
                  ⚠ {a}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Voice Request Transcript Container */}
        <div className="px-6 pb-4">
          <div className="rounded-2xl border border-[#CBC3D5]/30 bg-[#F8F5FA] p-4">
            {/* Label row */}
            <div className="flex items-center justify-between mb-3">
              <span
                className="text-[10px] font-bold uppercase tracking-widest"
                style={{ color: "#532AA8" }}
              >
                Voice Request{entries.length > 1 ? `s (${entries.length})` : ''}
              </span>
              {activeEntry && (
                <span
                  className="text-[10px] font-medium uppercase tracking-wide"
                  style={{ color: "#7A7484" }}
                >
                  {timeAgo(activeEntry.created_at)}
                </span>
              )}
            </div>

            {/* Language toggle — show if any entry is non-English */}
            {sortedEntries.some((e) => e.language && !e.language.startsWith('en') && e.original_transcript) && (
              <div className="flex rounded-lg bg-[#E7EEFF] p-0.5 mb-3">
                <button
                  onClick={() => setShowTranslated(true)}
                  className={`flex-1 py-1.5 rounded-md text-[10px] font-bold transition-all ${
                    showTranslated ? 'bg-white text-[#532AA8] shadow-sm' : 'text-[#7A7484]'
                  }`}
                >
                  English
                </button>
                <button
                  onClick={() => setShowTranslated(false)}
                  className={`flex-1 py-1.5 rounded-md text-[10px] font-bold transition-all ${
                    !showTranslated ? 'bg-white text-[#532AA8] shadow-sm' : 'text-[#7A7484]'
                  }`}
                >
                  Original
                </button>
              </div>
            )}

            {/* Audio Player — switches between original and translated audio */}
            <div className="mb-3">
              {(() => {
                const isNonEnglish = activeEntry?.language && !activeEntry.language.startsWith('en') && activeEntry.original_transcript
                const playUrl = isNonEnglish && showTranslated && activeEntry?.translated_audio_url
                  ? activeEntry.translated_audio_url
                  : activeEntry?.audio_url ?? null
                return <AudioPlayer audioUrl={playUrl} />
              })()}
            </div>

            {/* Transcript list — tap to select */}
            <div className="space-y-2">
              {sortedEntries.map((entry) => {
                const isActive = activeEntry?.id === entry.id
                const isNonEnglish = entry.language && !entry.language.startsWith('en') && entry.original_transcript
                const displayText = isNonEnglish
                  ? (showTranslated ? (entry.translated_transcript || entry.transcript) : entry.original_transcript!)
                  : entry.transcript

                return (
                  <button
                    key={entry.id}
                    onClick={() => setSelectedEntryId(entry.id)}
                    className={`w-full text-left rounded-xl p-2.5 transition-all border ${
                      isActive
                        ? 'border-[#532AA8]/40 bg-[rgba(83,42,168,0.08)]'
                        : 'border-transparent hover:bg-white/50'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      {entries.length > 1 && (
                        <span
                          className="text-[9px] font-medium uppercase tracking-wide"
                          style={{ color: isActive ? '#532AA8' : '#7A7484' }}
                        >
                          {timeAgo(entry.created_at)}
                        </span>
                      )}
                      {isNonEnglish && (
                        <span className="text-[8px] font-bold uppercase px-1.5 py-0.5 rounded bg-[#E7EEFF] text-[#532AA8]">
                          {entry.language.toUpperCase()}
                        </span>
                      )}
                    </div>
                    <p className={`text-[13px] leading-relaxed italic ${isActive ? 'text-[#532AA8]' : 'text-[#3B3347]'}`}>
                      &ldquo;{displayText}&rdquo;
                    </p>
                  </button>
                )
              })}
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
              style={{ backgroundColor: "#F0F3FF" }}
            >
              <span
                className="text-[10px] font-bold uppercase tracking-widest block mb-3"
                style={{ color: "#7A7484" }}
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
                  <span
                    className="text-[13px] font-bold uppercase"
                    style={{ color: severityColor(latestEntry.severity) }}
                  >
                    {latestEntry.severity}
                  </span>
                </div>
              )}

              {/* Category pills */}
              {latestEntry.category && (
                <div className="flex flex-wrap gap-1.5">
                  {latestEntry.category.split(', ').map((cat) => (
                    <span
                      key={cat}
                      className="inline-block text-[11px] font-medium rounded-full px-3 py-1"
                      style={{ backgroundColor: "rgba(109,72,181,0.1)", color: "#6D48B5" }}
                    >
                      {cat.trim()}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Action buttons */}
        <div
          className="sticky bottom-0 px-6 pt-3 pb-6 bg-white rounded-b-[24px]"
          style={{ boxShadow: "0 -4px 12px rgba(0,0,0,0.05)" }}
        >
          <div className="flex gap-3">
            {/* Pin button */}
            <button
              onClick={() => onPin(request.id, !request.is_pinned)}
              className="flex-1 h-[48px] rounded-full text-[14px] font-bold border-2 transition-colors"
              style={{
                borderColor: "#532AA8",
                color: "#532AA8",
                backgroundColor: "transparent",
              }}
            >
              {request.is_pinned ? "Unpin Patient" : "Pin Patient"}
            </button>

            {/* On the Way / Mark Resolved */}
            {isCurrentTask ? (
              <button
                onClick={() => onResolve(request.id)}
                className="flex-1 h-[48px] rounded-full text-[14px] font-bold text-white transition-colors"
                style={{ backgroundColor: "#1aba62" }}
              >
                Mark Resolved
              </button>
            ) : (
              <button
                onClick={() => {
                  if (hasCurrentTask) {
                    showToast("You already have an active task. Please resolve it first.", "error");
                    return;
                  }
                  onAccept(request.id);
                }}
                disabled={hasCurrentTask}
                className="flex-1 h-[48px] rounded-full text-[14px] font-bold text-white transition-colors disabled:opacity-50"
                style={{
                  background: hasCurrentTask
                    ? "#A099A8"
                    : "linear-gradient(135deg, #6D48B5, #532AA8)",
                }}
              >
                On the Way
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
