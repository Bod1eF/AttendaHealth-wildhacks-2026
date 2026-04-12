'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'

interface PatientSession {
  id: string
  name: string
  bed_id: number
  bed?: { label?: string; room?: { label?: string } }
}

export default function PatientPortal() {
  const router = useRouter()
  const [patient, setPatient] = useState<PatientSession | null>(null)
  const [recording, setRecording] = useState(false)
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null)
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')
  const [elapsed, setElapsed] = useState(0)
  const [fileName, setFileName] = useState<string | null>(null)
  const [dragging, setDragging] = useState(false)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    const stored = localStorage.getItem('patient_session')
    if (!stored) {
      router.replace('/login')
      return
    }
    setPatient(JSON.parse(stored))
  }, [router])

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mediaRecorder = new MediaRecorder(stream)
      mediaRecorderRef.current = mediaRecorder
      chunksRef.current = []

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
        setAudioBlob(blob)
        setAudioUrl(URL.createObjectURL(blob))
        stream.getTracks().forEach((t) => t.stop())
      }

      mediaRecorder.start()
      setRecording(true)
      setElapsed(0)
      setAudioBlob(null)
      setAudioUrl(null)
      setSubmitted(false)
      setError('')

      timerRef.current = setInterval(() => {
        setElapsed((prev) => prev + 1)
      }, 1000)
    } catch {
      setError('Microphone access denied. Please allow microphone access.')
    }
  }, [])

  const stopRecording = useCallback(() => {
    mediaRecorderRef.current?.stop()
    setRecording(false)
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
  }, [])

  const discardRecording = useCallback(() => {
    setAudioBlob(null)
    setAudioUrl(null)
    setFileName(null)
    setElapsed(0)
  }, [])

  const handleFileSelect = useCallback((file: File) => {
    setAudioBlob(file)
    setAudioUrl(URL.createObjectURL(file))
    setFileName(file.name)
    setSubmitted(false)
    setError('')
    setElapsed(0)
  }, [])

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleFileSelect(file)
  }, [handleFileSelect])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files?.[0]
    if (file) handleFileSelect(file)
  }, [handleFileSelect])

  const submitRequest = useCallback(async () => {
    if (!audioBlob || !patient) return

    setSubmitting(true)
    setError('')

    try {
      const formData = new FormData()
      formData.append('audio', audioBlob, 'recording.webm')
      formData.append('patient', patient.name)

      const res = await fetch('/api/ingest', {
        method: 'POST',
        body: formData,
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to submit')
      }

      setSubmitted(true)
      setAudioBlob(null)
      setAudioUrl(null)
      setElapsed(0)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit request')
    } finally {
      setSubmitting(false)
    }
  }, [audioBlob, patient])

  const handleLogout = () => {
    localStorage.removeItem('patient_session')
    router.push('/login')
  }

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60)
    const sec = s % 60
    return `${m}:${sec.toString().padStart(2, '0')}`
  }

  if (!patient) return null

  const roomLabel = patient.bed?.room?.label ?? '—'
  const bedLabel = patient.bed?.label ?? '—'

  return (
    <div className="flex min-h-dvh items-center justify-center bg-bg-main px-4">
      <div className="w-full max-w-[420px] flex flex-col items-center">
        {/* Header */}
        <div className="w-full flex items-center justify-between mb-8">
          <div>
            <h1 className="text-[22px] font-extrabold text-gray-900">Hello, {patient.name.split(' ')[0]}</h1>
            <p className="text-[12px] text-[#7A7484] mt-0.5">{roomLabel} · {bedLabel}</p>
          </div>
          <button
            onClick={handleLogout}
            className="text-[12px] font-bold text-[#BA1A1A] px-3 py-1.5 rounded-full border border-[#BA1A1A]/20"
          >
            Sign Out
          </button>
        </div>

        {/* Instructions */}
        <div className="w-full bg-[#F8F5FA] rounded-2xl border border-[#CBC3D5]/30 p-5 mb-6">
          <span className="text-[10px] font-bold uppercase tracking-widest text-[#532AA8] block mb-2">
            How it works
          </span>
          <p className="text-[13px] text-[#3B3347] leading-relaxed">
            Record a message or upload an audio file. Your request will be sent to your nurse automatically.
          </p>
        </div>

        {/* Recording area */}
        <div className="flex flex-col items-center gap-6 mb-8">
          {/* Timer */}
          {(recording || audioBlob) && (
            <div className="text-[32px] font-extrabold text-gray-900 tabular-nums">
              {formatTime(elapsed)}
            </div>
          )}

          {/* Record button */}
          {!audioBlob && (
            <button
              onClick={recording ? stopRecording : startRecording}
              className={`w-24 h-24 rounded-full flex items-center justify-center transition-all active:scale-95 ${
                recording
                  ? 'bg-[#BA1A1A] shadow-[0_0_0_8px_rgba(186,26,26,0.15)]'
                  : 'bg-[#532AA8] shadow-[0_0_0_8px_rgba(83,42,168,0.1)]'
              }`}
            >
              {recording ? (
                <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
                  <rect x="6" y="6" width="16" height="16" rx="3" fill="white" />
                </svg>
              ) : (
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                  <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                  <line x1="12" y1="19" x2="12" y2="23" />
                  <line x1="8" y1="23" x2="16" y2="23" />
                </svg>
              )}
            </button>
          )}

          <p className="text-[12px] text-[#7A7484] font-medium">
            {recording
              ? 'Recording... tap to stop'
              : audioBlob
              ? (fileName ? `File: ${fileName}` : 'Review your recording')
              : 'Tap to start recording'}
          </p>
        </div>

        {/* File upload drop zone */}
        {!audioBlob && !recording && (
          <div className="w-full mb-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="flex-1 h-px bg-[#CBC3D5]/30" />
              <span className="text-[11px] font-bold text-[#7A7484] uppercase">or upload a file</span>
              <div className="flex-1 h-px bg-[#CBC3D5]/30" />
            </div>
            <div
              onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`w-full rounded-2xl border-2 border-dashed p-6 flex flex-col items-center gap-2 cursor-pointer transition-all ${
                dragging
                  ? 'border-[#532AA8] bg-[rgba(83,42,168,0.05)]'
                  : 'border-[#CBC3D5]/50 hover:border-[#532AA8]/40'
              }`}
            >
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#532AA8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
              <p className="text-[13px] font-medium text-[#3B3347]">
                {dragging ? 'Drop file here' : 'Drag & drop or tap to browse'}
              </p>
              <p className="text-[10px] text-[#7A7484]">.m4a, .mp3, .mp4, .wav, .webm</p>
              <input
                ref={fileInputRef}
                type="file"
                accept="audio/*,.m4a,.mp3,.mp4,.wav,.webm"
                onChange={handleFileInput}
                className="hidden"
              />
            </div>
          </div>
        )}

        {/* Playback + actions */}
        {audioBlob && audioUrl && !submitted && (
          <div className="w-full space-y-4">
            <div className="bg-white rounded-2xl p-4 border border-[rgba(203,195,213,0.1)] shadow-sm">
              <audio src={audioUrl} controls className="w-full" />
            </div>

            <div className="flex gap-3">
              <button
                onClick={discardRecording}
                className="flex-1 h-[48px] rounded-full text-[14px] font-bold border-2 border-[#7A7484] text-[#7A7484]"
              >
                Discard
              </button>
              <button
                onClick={submitRequest}
                disabled={submitting}
                className="flex-1 h-[48px] rounded-full text-[14px] font-bold text-white disabled:opacity-60"
                style={{ background: 'linear-gradient(135deg, #532AA8, #6B46C1)' }}
              >
                {submitting ? 'Sending...' : 'Send to Nurse'}
              </button>
            </div>
          </div>
        )}

        {/* Success message */}
        {submitted && (
          <div className="w-full bg-[#E8F5E9] rounded-2xl p-5 text-center border border-[#A5D6A7]/30">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" className="mx-auto mb-3">
              <circle cx="12" cy="12" r="10" fill="#4CAF50" />
              <path d="M8 12l3 3 5-5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <p className="text-[16px] font-bold text-[#2E7D32] mb-1">Request Sent!</p>
            <p className="text-[13px] text-[#4CAF50]">Your nurse has been notified and will respond shortly.</p>
            <button
              onClick={() => setSubmitted(false)}
              className="mt-4 px-6 py-2 rounded-full text-[13px] font-bold text-[#532AA8] border-2 border-[#532AA8]"
            >
              Send Another Request
            </button>
          </div>
        )}

        {error && (
          <p className="text-center text-sm text-red-600 mt-4">{error}</p>
        )}
      </div>
    </div>
  )
}
