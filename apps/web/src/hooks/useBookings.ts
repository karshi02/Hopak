'use client';

import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api-client';
import { getToken } from '@/lib/auth';
import { getSocket } from '@/lib/ws';
import type { Booking } from '@hopak/shared';

export function useBookings() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiClient
      .get<Booking[]>('/bookings')
      .then(setBookings)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!getToken()) return;
    const socket = getSocket();
    const onUpdated = (updated: Booking) => {
      setBookings((prev) => prev.map((b) => (b.id === updated.id ? updated : b)));
    };
    socket.on('booking:updated', onUpdated);
    return () => {
      socket.off('booking:updated', onUpdated);
    };
  }, []);

  return { bookings, loading };
}
