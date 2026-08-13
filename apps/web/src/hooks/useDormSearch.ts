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
    const url = `/dorms?${params.toString()}`;

    // ยิงไม่ติด (API รีสตาร์ท/เน็ตสะดุด) ต้องไม่ปล่อย promise reject ลอย — เดิมทำให้หน้าค้างว่างจนกว่าจะรีเฟรชเอง
    // ลองซ้ำอีก 2 ครั้ง ห่างขึ้นเรื่อยๆ แล้วค่อยยอมแพ้เป็นลิสต์ว่าง
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;

    const load = (attempt: number) => {
      apiClient
        .get<DormWithRooms[]>(url)
        .then((data) => {
          if (cancelled) return;
          setDorms(data);
          setLoading(false);
        })
        .catch(() => {
          if (cancelled) return;
          if (attempt < 2) {
            timer = setTimeout(() => load(attempt + 1), 1500 * (attempt + 1));
            return;
          }
          setDorms([]);
          setLoading(false);
        });
    };
    load(0);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query.q, query.province, query.university]);

  return { dorms, loading };
}
