'use client';

import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api-client';
import type { Dorm, Room } from '@hopak/shared';

type DormWithRooms = Dorm & { rooms: Room[] };

export function useDormSearch(query: { q?: string; province?: string; university?: string }) {
  const [dorms, setDorms] = useState<DormWithRooms[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (query.q) params.set('q', query.q);
    if (query.province) params.set('province', query.province);
    if (query.university) params.set('university', query.university);
    apiClient
      .get<DormWithRooms[]>(`/dorms?${params.toString()}`)
      .then(setDorms)
      .finally(() => setLoading(false));
  }, [query.q, query.province, query.university]);

  return { dorms, loading };
}
