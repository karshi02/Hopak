'use client';

import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api-client';
import { getSocket } from '@/lib/ws';
import type { Dorm } from '@hopak/shared';

/**
 * สถานะการอนุมัติหอของเจ้าของหอที่ล็อกอินอยู่
 * เจ้าของหอที่เพิ่งสมัคร เข้าคอนโซลได้เลย แต่ฟังก์ชันจัดการทั้งหมดถูกล็อกจนกว่าแอดมินจะอนุมัติ
 * ปลดล็อกอัตโนมัติเมื่อได้รับอนุมัติ (ฟัง notification:new แล้วโหลดสถานะใหม่ ไม่ต้องรีเฟรชเอง)
 */
export function usePartnerApproval() {
  const [dorms, setDorms] = useState<Dorm[] | null>(null);

  useEffect(() => {
    const load = () =>
      apiClient
        .get<Dorm[]>('/dorms/mine')
        .then(setDorms)
        .catch(() => setDorms([]));

    load();
    const socket = getSocket();
    socket.on('notification:new', load);
    return () => {
      socket.off('notification:new', load);
    };
  }, []);

  const loading = dorms === null;
  const list = dorms ?? [];
  const approved = list.filter((d) => String(d.status).toUpperCase() === 'APPROVED');
  const rejected = list.filter((d) => String(d.status).toUpperCase() === 'REJECTED');
  const suspended = list.filter((d) => String(d.status).toUpperCase() === 'SUSPENDED');

  return {
    loading,
    dorms: list,
    /** ปลดล็อกคอนโซลเมื่อมีหออย่างน้อย 1 แห่งที่อนุมัติแล้ว */
    unlocked: approved.length > 0,
    pending: list.filter((d) => String(d.status).toUpperCase() === 'PENDING_APPROVAL'),
    rejected,
    suspended,
  };
}
