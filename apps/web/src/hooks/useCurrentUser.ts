'use client';

import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api-client';
import { getToken, clearToken } from '@/lib/auth';
import type { User } from '@hopak/shared';

export function useCurrentUser() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!getToken()) {
      setLoading(false);
      return;
    }
    apiClient
      .get<User>('/users/me')
      .then(setUser)
      .catch(() => clearToken())
      .finally(() => setLoading(false));
  }, []);

  return { user, loading };
}
