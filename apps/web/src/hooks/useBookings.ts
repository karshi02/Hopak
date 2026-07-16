'use client';

import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api-client';
import type { Booking } from '@hopak/shared';

export function useBookings() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiClient
      .get<Booking[]>('/bookings')
      .then(setBookings)
      .finally(() => setLoading(false));
  }, []);

  return { bookings, loading };
}
