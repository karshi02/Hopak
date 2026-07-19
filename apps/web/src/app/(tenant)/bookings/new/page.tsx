'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { apiClient } from '@/lib/api-client';
import { getToken } from '@/lib/auth';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import type { Booking } from '@hopak/shared';
import { PageLoader } from '@/components/PageLoader';

const inputClass =
  'rounded-btn border border-card-border px-3.5 py-2.5 text-sm text-ink placeholder:text-ink-faint focus:border-tenant focus:outline-none dark:border-white/10 dark:bg-[#1a1a19] dark:text-white';

function NewBookingForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const roomId = searchParams.get('roomId') ?? '';

  const { user } = useCurrentUser();
  const [contactName, setContactName] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [checkInDate, setCheckInDate] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!getToken()) router.replace('/login');
  }, [router]);

  useEffect(() => {
    if (!user) return;
    setContactName((prev) => prev || user.name);
    setContactPhone((prev) => prev || user.phone || '');
  }, [user]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
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
      setSubmitting(false);
    }
  }

  return (
    <main className="mx-auto max-w-md p-6">
      <h1 className="text-xl font-bold text-ink-strong dark:text-white">ส่งคำขอจอง</h1>
      <p className="mt-1 text-sm text-ink-subtitle">กรอกข้อมูลติดต่อเพื่อยืนยันคำขอจอง</p>

      <form
        onSubmit={handleSubmit}
        className="mt-5 flex flex-col gap-3 rounded-card border border-card-border bg-white p-5 shadow-sm dark:border-white/10 dark:bg-[#1a1a19]"
      >
        <input
          type="text"
          placeholder="ชื่อผู้จอง"
          value={contactName}
          onChange={(e) => setContactName(e.target.value)}
          className={inputClass}
          required
        />
        <div>
          <input
            type="tel"
            placeholder="เบอร์โทร"
            value={contactPhone}
            onChange={(e) => setContactPhone(e.target.value)}
            className={`${inputClass} w-full font-sans`}
            required
          />
          <p className="mt-1 text-xs text-ink-faint">แก้ไขเบอร์ได้ถ้าต้องการใช้เบอร์อื่นสำหรับการจองนี้</p>
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-medium text-ink-subtitle">วันเข้าอยู่</label>
          <input
            type="date"
            value={checkInDate}
            onChange={(e) => setCheckInDate(e.target.value)}
            className={`${inputClass} w-full font-sans`}
            required
          />
        </div>
        <textarea
          placeholder="หมายเหตุ (ถ้ามี)"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          className={`${inputClass} resize-none`}
          rows={3}
        />
        {error && <p className="text-sm text-danger">{error}</p>}
        <button
          type="submit"
          disabled={submitting}
          className="mt-1 rounded-btn bg-tenant py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-tenant-dark disabled:opacity-60"
        >
          {submitting ? 'กำลังส่งคำขอ...' : 'ส่งคำขอจอง'}
        </button>
        <p className="text-center text-xs leading-relaxed text-ink-faint">
          ส่งคำขอ → รอเจ้าของหอยืนยัน → ชำระเงิน · ยกเลิกฟรีใน 1 วัน
        </p>
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
