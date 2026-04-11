'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import type { Bed, Request, Patient, RequestEntry } from '@/types/database'

interface HistoryStats {
  totalToday: number
  percentChange: string
  avgResponseTime: string
  successRate: string
}

interface RecentResolution {
  patientName: string
  roomLabel: string
  category: string
  resolvedAt: string
}

interface UseHistoryReturn {
  stats: HistoryStats
  recentResolutions: RecentResolution[]
  loading: boolean
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = Math.round(seconds % 60)
  return `${m}m ${s}s`
}

export function useHistory(): UseHistoryReturn {
  const { nurse } = useAuth()
  const [stats, setStats] = useState<HistoryStats>({
    totalToday: 0,
    percentChange: '+0%',
    avgResponseTime: '0m 0s',
    successRate: '0%',
  })
  const [recentResolutions, setRecentResolutions] = useState<RecentResolution[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!nurse || nurse.assigned_rooms.length === 0) {
      setLoading(false)
      return
    }

    async function fetchHistory() {
      setLoading(true)

      try {
        const assignedRoomIds = nurse!.assigned_rooms

        // Fetch beds for assigned rooms
        const { data: bedsData, error: bedsError } = await supabase
          .from('beds')
          .select('*, room:rooms(*)')
          .in('room_id', assignedRoomIds)

        if (bedsError) throw bedsError

        const beds = bedsData as Bed[]
        const bedIds = beds.map((b) => b.id)

        if (bedIds.length === 0) {
          setLoading(false)
          return
        }

        // Fetch resolved requests with entries
        const { data: resolvedData, error: resolvedError } = await supabase
          .from('requests')
          .select('*, entries:request_entries(*), bed:beds(*, room:rooms(*))')
          .in('bed_id', bedIds)
          .eq('status', 'resolved')
          .order('resolved_at', { ascending: false })

        if (resolvedError) throw resolvedError

        const resolvedRequests = resolvedData as Request[]

        // Fetch patients for beds
        const { data: patientsData, error: patientsError } = await supabase
          .from('patients')
          .select('*')
          .in('bed_id', bedIds)

        if (patientsError) throw patientsError

        const patients = patientsData as Patient[]
        const patientByBedId = new Map(patients.map((p) => [p.bed_id, p]))

        // Compute date boundaries
        const now = new Date()
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
        const startOfYesterday = new Date(startOfToday)
        startOfYesterday.setDate(startOfYesterday.getDate() - 1)

        // Resolved today
        const resolvedToday = resolvedRequests.filter(
          (r) => r.resolved_at && new Date(r.resolved_at) >= startOfToday
        )

        // Resolved yesterday
        const resolvedYesterday = resolvedRequests.filter(
          (r) =>
            r.resolved_at &&
            new Date(r.resolved_at) >= startOfYesterday &&
            new Date(r.resolved_at) < startOfToday
        )

        const totalToday = resolvedToday.length
        const totalYesterday = resolvedYesterday.length

        // Percent change
        let percentChange = '+0%'
        if (totalYesterday > 0) {
          const change = Math.round(((totalToday - totalYesterday) / totalYesterday) * 100)
          percentChange = change >= 0 ? `+${change}%` : `${change}%`
        } else if (totalToday > 0) {
          percentChange = '+100%'
        }

        // Average response time for resolved requests
        let avgResponseTime = '0m 0s'
        const responseTimes = resolvedRequests
          .filter((r) => r.resolved_at && r.created_at)
          .map((r) => {
            const resolved = new Date(r.resolved_at!).getTime()
            const created = new Date(r.created_at).getTime()
            return (resolved - created) / 1000
          })
          .filter((t) => t > 0)

        if (responseTimes.length > 0) {
          const avg = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
          avgResponseTime = formatDuration(avg)
        }

        // Success rate: resolved today / total requests today (all statuses)
        const { count: totalRequestsToday, error: countError } = await supabase
          .from('requests')
          .select('*', { count: 'exact', head: true })
          .in('bed_id', bedIds)
          .gte('created_at', startOfToday.toISOString())

        if (countError) throw countError

        let successRate = '0%'
        if (totalRequestsToday && totalRequestsToday > 0) {
          successRate = ((totalToday / totalRequestsToday) * 100).toFixed(1) + '%'
        }

        setStats({
          totalToday,
          percentChange,
          avgResponseTime,
          successRate,
        })

        // Build recent resolutions
        const recent: RecentResolution[] = resolvedRequests.slice(0, 20).map((r) => {
          const patient = patientByBedId.get(r.bed_id)
          const roomLabel = r.bed?.room?.label ?? 'Unknown'
          const entries = (r.entries ?? []) as RequestEntry[]
          const latestEntry = entries.sort(
            (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          )[0]

          return {
            patientName: patient?.name ?? 'Unknown Patient',
            roomLabel,
            category: latestEntry?.category ?? 'General',
            resolvedAt: r.resolved_at ?? r.updated_at,
          }
        })

        setRecentResolutions(recent)
      } catch (err) {
        console.error('Failed to fetch history:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchHistory()
  }, [nurse])

  return { stats, recentResolutions, loading }
}
