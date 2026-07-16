'use client';

import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api-client';
import type { Dorm, Room } from '@hopak/shared';

type DormWithRooms = Dorm & { rooms: Room[] };

export function useDormSearch(query: { province?: string; university?: string }) {
  const [dorms, setDorms] = useState<DormWithRooms[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams(query as Record<string, string>);
    apiClient
      .get<DormWithRooms[]>(`/dorms?${params.toString()}`)
      .then(setDorms)
      .finally(() => setLoading(false));
  }, [query.province, query.university]);

  return { dorms, loading };
}
