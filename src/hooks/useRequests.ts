'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import type { Request, Bed } from '@/types/database';
import { useAuth } from '@/context/AuthContext';

interface UseRequestsReturn {
  requests: Request[];
  currentTask: Request | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useRequests(): UseRequestsReturn {
  const { nurse } = useAuth();
  const [requests, setRequests] = useState<Request[]>([]);
  const [currentTask, setCurrentTask] = useState<Request | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRequests = useCallback(async () => {
    if (!nurse || nurse.assigned_rooms.length === 0) {
      setRequests([]);
      setCurrentTask(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const assignedRoomIds = nurse.assigned_rooms;

      // First fetch beds for assigned rooms
      const { data: bedsData, error: bedsError } = await supabase
        .from('beds')
        .select('*')
        .in('room_id', assignedRoomIds);

      if (bedsError) throw bedsError;

      const bedIds = (bedsData as Bed[]).map((b) => b.id);

      if (bedIds.length === 0) {
        setRequests([]);
        setCurrentTask(null);
        setLoading(false);
        return;
      }

      // Fetch non-resolved requests with their entries, bed, and room
      const { data: requestsData, error: requestsError } = await supabase
        .from('requests')
        .select('*, entries:request_entries(*), bed:beds(*, room:rooms(*))')
        .in('bed_id', bedIds)
        .neq('status', 'resolved')
        .order('created_at', { ascending: false });

      if (requestsError) throw requestsError;

      const allRequests = requestsData as Request[];

      // Separate current task (on_the_way) from the rest
      const onTheWay = allRequests.find((r) => r.status === 'on_the_way') ?? null;
      setCurrentTask(onTheWay);

      // Remaining requests (excluding current task), sorted: pinned first (chronological), then non-pinned (newest first)
      const remaining = allRequests.filter((r) => r.status !== 'on_the_way');

      const pinned = remaining
        .filter((r) => r.is_pinned)
        .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

      const nonPinned = remaining
        .filter((r) => !r.is_pinned)
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      setRequests([...pinned, ...nonPinned]);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch requests';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [nurse]);

  // Fetch on mount and when nurse changes
  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  // Set up Supabase Realtime subscriptions
  useEffect(() => {
    if (!nurse || nurse.assigned_rooms.length === 0) return;

    const channel = supabase
      .channel('requests-realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'requests' },
        () => {
          fetchRequests();
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'requests' },
        (payload) => {
          const updated = payload.new as Record<string, unknown>;
          // If only is_pinned or updated_at changed, skip full refetch
          const old = payload.old as Record<string, unknown>;
          if (
            old &&
            updated.status === old.status &&
            updated.repeat_count === old.repeat_count &&
            updated.accepted_at === old.accepted_at &&
            updated.resolved_at === old.resolved_at
          ) {
            // Pin-only change — update in place
            setRequests((prev) =>
              prev.map((r) =>
                r.id === updated.id ? { ...r, is_pinned: updated.is_pinned as boolean } : r
              )
            );
            setCurrentTask((prev) =>
              prev && prev.id === updated.id ? { ...prev, is_pinned: updated.is_pinned as boolean } : prev
            );
            return;
          }
          fetchRequests();
        }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'request_entries' },
        () => {
          fetchRequests();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [nurse, fetchRequests]);

  return { requests, currentTask, loading, error, refetch: fetchRequests };
}
