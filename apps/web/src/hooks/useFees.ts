'use client';

import { useEffect, useState } from 'react';
import { COMMISSION_RATE, DAILY_COMMISSION_RATE, CHAMBER_RATE } from '@hopak/shared';
import { apiClient } from '@/lib/api-client';

export interface Fees {
  commissionRate: number;
  dailyCommissionRate: number;
  chamberRate: number;
}

/**
 * อัตราค่าคอมที่ระบบใช้คิดเงินจริง — แอดมินปรับได้ที่ /admin/finance เก็บใน SiteSettings
 *
 * ค่าคงที่ใน packages/shared ใช้เป็นค่าเริ่มต้นระหว่างรอ API ตอบ (และตอน API ล่ม)
 * ทุกหน้าที่แสดง % ให้ผู้ใช้เห็นต้องใช้ hook นี้ ไม่ใช่ import ค่าคงที่มาโชว์ตรงๆ
 * ไม่งั้นแอดมินแก้เรตแล้วหน้าเว็บยังโฆษณาเลขเก่า
 */
export function useFees(): Fees {
  const [fees, setFees] = useState<Fees>({
    commissionRate: COMMISSION_RATE,
    dailyCommissionRate: DAILY_COMMISSION_RATE,
    chamberRate: CHAMBER_RATE,
  });

  useEffect(() => {
    let alive = true;
    apiClient
      .get<Fees>('/settings/fees')
      .then((data) => {
        if (alive && data) setFees(data);
      })
      // ดึงไม่ได้ = คงค่าเริ่มต้นไว้ ห้าม throw ทิ้ง (หน้าจะพังทั้งหน้าเพราะ unhandled rejection)
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  return fees;
}

export const toPct = (rate: number) => Math.round(rate * 1000) / 10;
