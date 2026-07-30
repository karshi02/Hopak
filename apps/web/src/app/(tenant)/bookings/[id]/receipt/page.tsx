'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { apiClient } from '@/lib/api-client';
import { Receipt } from '@/components/Receipt';
import { PageLoader } from '@/components/PageLoader';
import type { Booking } from '@hopak/shared';

// ใบเสร็จ/ใบจอง ฉบับผู้เช่า — API ส่ง checkInToken มาด้วย (เจ้าของการจอง) → โชว์รหัสยืนยัน
export default function TenantReceiptPage() {
  const { id } = useParams<{ id: string }>();
  const [booking, setBooking] = useState<Booking | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    apiClient.get<Booking>(`/bookings/${id}`).then(setBooking).catch(() => setError(true));
  }, [id]);

  if (error) return <p className="p-6 text-ink-faint">ไม่พบใบจอง</p>;
  if (!booking) return <PageLoader />;
  return <Receipt booking={booking} />;
}
