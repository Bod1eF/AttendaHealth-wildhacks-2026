'use client'

import { useState, useEffect, useCallback } from 'react'
import { getSupabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import type { Patient, Bed, Room } from '@/types/database'

const supabase = getSupabase()

interface PatientWithLocation extends Patient {
  bed?: Bed & { room?: Room }
}

export default function PatientsPage() {
  const { nurse } = useAuth()
  const [patients, setPatients] = useState<PatientWithLocation[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedPatient, setSelectedPatient] = useState<PatientWithLocation | null>(null)

  useEffect(() => {
    if (!nurse || nurse.assigned_rooms.length === 0) {
      setLoading(false)
      return
    }

    async function fetchPatients() {
      const { data: beds } = await supabase
        .from('beds')
        .select('id')
        .in('room_id', nurse!.assigned_rooms)

      if (!beds?.length) {
        setLoading(false)
        return
      }

      const bedIds = beds.map((b) => b.id)

      const { data } = await supabase
        .from('patients')
        .select('*, bed:beds(*, room:rooms(*))')
        .in('bed_id', bedIds)
        .order('name')

      setPatients((data as PatientWithLocation[]) || [])
      setLoading(false)
    }

    fetchPatients()
  }, [nurse])

  const handleClose = useCallback(() => setSelectedPatient(null), [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-[#7A7484] text-sm">Loading...</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col px-5 pt-6 h-full overflow-hidden">
      <div className="mb-5">
        <h1 className="text-[28px] font-extrabold tracking-tight text-gray-900">
          My Patients
        </h1>
        <p className="text-[#7A7484] text-sm font-medium mt-1">
          {patients.length} patient{patients.length !== 1 ? 's' : ''} assigned to you
        </p>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto pb-[88px] space-y-3">
        {patients.length === 0 ? (
          <p className="text-[#7A7484] text-sm text-center py-8">No patients assigned.</p>
        ) : (
          patients.map((patient) => {
            const roomLabel = patient.bed?.room?.label ?? '—'
            const bedLabel = patient.bed?.label ?? '—'

            return (
              <div
                key={patient.id}
                onClick={() => setSelectedPatient(patient)}
                className="bg-white rounded-2xl p-4 shadow-sm border border-[rgba(203,195,213,0.1)] flex items-center gap-4 cursor-pointer active:scale-[0.98] transition-transform"
              >
                <div className="w-11 h-11 rounded-full bg-[#E9DDFF] flex items-center justify-center shrink-0">
                  <span className="text-[14px] font-extrabold text-[#532AA8]">
                    {patient.name.split(' ').map((n) => n[0]).join('').slice(0, 2)}
                  </span>
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-[14px] font-bold text-gray-900 truncate">
                    {patient.name}
                  </p>
                  <p className="text-[12px] text-[#7A7484] mt-0.5">
                    {roomLabel} · {bedLabel}
                  </p>
                </div>

                <span className="px-2.5 py-1 bg-[#F0F3FF] rounded-lg text-[10px] font-bold text-[#494453] uppercase tracking-wide border border-[rgba(203,195,213,0.15)] shrink-0">
                  {roomLabel}
                </span>
              </div>
            )
          })
        )}
      </div>

      {/* Patient Detail Modal */}
      {selectedPatient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4" onClick={handleClose}>
          <div className="absolute inset-0 bg-black/50" />
          <div
            className="relative w-full max-w-[420px] bg-white rounded-[24px] overflow-y-auto animate-slide-up"
            style={{ maxHeight: '85vh' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="px-6 pt-5 pb-3">
              <button
                onClick={handleClose}
                className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full"
                style={{ backgroundColor: '#F3F0F5' }}
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M1 1L13 13M13 1L1 13" stroke="#49454F" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </button>

              {/* Avatar + Name */}
              <div className="flex items-center gap-4 mb-4">
                <div className="w-14 h-14 rounded-full bg-[#E9DDFF] flex items-center justify-center shrink-0">
                  <span className="text-[18px] font-extrabold text-[#532AA8]">
                    {selectedPatient.name.split(' ').map((n) => n[0]).join('').slice(0, 2)}
                  </span>
                </div>
                <div>
                  <h2 className="text-[20px] font-extrabold text-gray-900">{selectedPatient.name}</h2>
                  <p className="text-[12px] text-[#7A7484]">
                    {selectedPatient.bed?.room?.label ?? '—'} · {selectedPatient.bed?.label ?? '—'}
                  </p>
                </div>
              </div>
            </div>

            {/* Demographics */}
            <div className="px-6 pb-4">
              <div className="rounded-2xl border border-[#CBC3D5]/30 bg-[#F8F5FA] p-4">
                <span className="text-[10px] font-bold uppercase tracking-widest text-[#532AA8] block mb-3">
                  Patient Information
                </span>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-[9px] font-bold uppercase tracking-wider text-[#7A7484] mb-0.5">Age</p>
                    <p className="text-[14px] font-bold text-gray-900">{selectedPatient.age ?? '—'}</p>
                  </div>
                  <div>
                    <p className="text-[9px] font-bold uppercase tracking-wider text-[#7A7484] mb-0.5">Sex</p>
                    <p className="text-[14px] font-bold text-gray-900">{selectedPatient.sex ?? '—'}</p>
                  </div>
                  <div>
                    <p className="text-[9px] font-bold uppercase tracking-wider text-[#7A7484] mb-0.5">Blood Type</p>
                    <p className="text-[14px] font-bold text-gray-900">{selectedPatient.blood_type ?? '—'}</p>
                  </div>
                  <div>
                    <p className="text-[9px] font-bold uppercase tracking-wider text-[#7A7484] mb-0.5">Room</p>
                    <p className="text-[14px] font-bold text-gray-900">{selectedPatient.bed?.room?.label ?? '—'}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Diagnosis */}
            <div className="px-6 pb-4">
              <div className="rounded-2xl border border-[#CBC3D5]/20 bg-[#F0F3FF] p-4">
                <span className="text-[10px] font-bold uppercase tracking-widest text-[#7A7484] block mb-2">
                  Diagnosis
                </span>
                <p className="text-[13px] text-gray-900 font-medium">
                  {selectedPatient.diagnosis ?? 'No diagnosis recorded'}
                </p>
              </div>
            </div>

            {/* Allergies */}
            <div className="px-6 pb-4">
              <div className="rounded-2xl border border-[#CBC3D5]/20 bg-[#F0F3FF] p-4">
                <span className="text-[10px] font-bold uppercase tracking-widest text-[#7A7484] block mb-2">
                  Allergies
                </span>
                {selectedPatient.allergies && selectedPatient.allergies.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {selectedPatient.allergies.map((a) => (
                      <span
                        key={a}
                        className="px-2.5 py-1 bg-[#FFDAD6] text-[#93000A] text-[11px] font-bold rounded-full"
                      >
                        {a}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-[13px] text-gray-900 font-medium">No known allergies</p>
                )}
              </div>
            </div>

            {/* Emergency Contact */}
            <div className="px-6 pb-6">
              <div className="rounded-2xl border border-[#CBC3D5]/20 bg-[#F0F3FF] p-4">
                <span className="text-[10px] font-bold uppercase tracking-widest text-[#7A7484] block mb-2">
                  Emergency Contact
                </span>
                <p className="text-[13px] text-gray-900 font-medium">
                  {selectedPatient.emergency_contact ?? 'Not listed'}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
