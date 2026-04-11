'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import type { Room, Bed } from '@/types/database';
import { useAuth } from '@/context/AuthContext';

interface UseRoomsReturn {
  rooms: Room[];
  beds: Bed[];
  loading: boolean;
  error: string | null;
}

export function useRooms(): UseRoomsReturn {
  const { nurse } = useAuth();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [beds, setBeds] = useState<Bed[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!nurse || nurse.assigned_rooms.length === 0) {
      setRooms([]);
      setBeds([]);
      setLoading(false);
      return;
    }

    async function fetchRoomsAndBeds() {
      setLoading(true);
      setError(null);

      try {
        const assignedRoomIds = nurse!.assigned_rooms;

        const [roomsResult, bedsResult] = await Promise.all([
          supabase
            .from('rooms')
            .select('*')
            .in('id', assignedRoomIds),
          supabase
            .from('beds')
            .select('*, room:rooms(*)')
            .in('room_id', assignedRoomIds),
        ]);

        if (roomsResult.error) throw roomsResult.error;
        if (bedsResult.error) throw bedsResult.error;

        setRooms(roomsResult.data as Room[]);
        setBeds(bedsResult.data as Bed[]);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to fetch rooms';
        setError(message);
      } finally {
        setLoading(false);
      }
    }

    fetchRoomsAndBeds();
  }, [nurse]);

  return { rooms, beds, loading, error };
}
