'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { apiClient } from '@/lib/api-client';
import type { Booking } from '@hopak/shared';
import { PageLoader } from '@/components/PageLoader';

function NewBookingForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const roomId = searchParams.get('roomId') ?? '';

  const [contactName, setContactName] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [checkInDate, setCheckInDate] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      const booking = await apiClient.post<Booking>('/bookings', {
        roomId,
        contactName,
        contactPhone,
        checkInDate,
        note: note || undefined,
      });
      router.push(`/bookings/${booking.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ส่งคำขอจองไม่สำเร็จ');
    }
  }

  return (
    <main className="mx-auto max-w-md p-6">
      <h1 className="text-xl font-bold">ส่งคำขอจอง</h1>
      <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-3">
        <input
          type="text"
          placeholder="ชื่อผู้จอง"
          value={contactName}
          onChange={(e) => setContactName(e.target.value)}
          className="rounded border px-3 py-2"
          required
        />
        <input
          type="tel"
          placeholder="เบอร์โทร"
          value={contactPhone}
          onChange={(e) => setContactPhone(e.target.value)}
          className="rounded border px-3 py-2"
          required
        />
        <input
          type="date"
          value={checkInDate}
          onChange={(e) => setCheckInDate(e.target.value)}
          className="rounded border px-3 py-2"
          required
        />
        <textarea
          placeholder="หมายเหตุ (ถ้ามี)"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          className="rounded border px-3 py-2"
        />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button type="submit" className="rounded bg-green-600 px-4 py-2 text-white">
          ส่งคำขอจอง
        </button>
      </form>
    </main>
  );
}

export default function NewBookingPage() {
  return (
    <Suspense fallback={<PageLoader fullScreen />}>
      <NewBookingForm />
    </Suspense>
  );
}
