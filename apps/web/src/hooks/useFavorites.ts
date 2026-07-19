'use client';

import { useCallback, useEffect, useState } from 'react';
import { apiClient } from '@/lib/api-client';
import { getToken } from '@/lib/auth';
import type { Dorm, Room } from '@hopak/shared';

type DormWithRooms = Dorm & { rooms: Room[] };

export function useFavorites() {
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());
  const [favorites, setFavorites] = useState<DormWithRooms[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!getToken()) {
      setLoaded(true);
      return;
    }
    apiClient
      .get<DormWithRooms[]>('/favorites')
      .then((dorms) => {
        setFavorites(dorms);
        setFavoriteIds(new Set(dorms.map((d) => d.id)));
      })
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, []);

  const toggle = useCallback(async (dormId: string) => {
    try {
      const res = await apiClient.post<{ favorited: boolean }>(`/favorites/${dormId}/toggle`);
      setFavoriteIds((prev) => {
        const next = new Set(prev);
        if (res.favorited) next.add(dormId);
        else next.delete(dormId);
        return next;
      });
      return res.favorited;
    } catch {
      return null;
    }
  }, []);

  return { favoriteIds, favorites, loaded, toggle };
}
