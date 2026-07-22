'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { apiClient } from '@/lib/api-client';
import { getToken } from '@/lib/auth';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useLang } from '@/hooks/useLang';
import type { Booking } from '@hopak/shared';
import { PageLoader } from '@/components/PageLoader';

const inputClass =
  'rounded-btn border border-card-border px-3.5 py-2.5 text-sm text-ink placeholder:text-ink-faint focus:border-tenant focus:outline-none dark:border-white/10 dark:bg-[#1a1a19] dark:text-white';

const TEXT = {
  th: {
    title: 'ส่งคำขอจอง',
    subtitle: 'กรอกข้อมูลติดต่อเพื่อยืนยันคำขอจอง',
    namePlaceholder: 'ชื่อผู้จอง',
    phonePlaceholder: 'เบอร์โทร',
    phoneHint: 'แก้ไขเบอร์ได้ถ้าต้องการใช้เบอร์อื่นสำหรับการจองนี้',
    checkInLabel: 'วันเข้าอยู่',
    notePlaceholder: 'หมายเหตุ (ถ้ามี)',
    submitting: 'กำลังส่งคำขอ...',
    submit: 'ส่งคำขอจอง',
    flowNote: 'ส่งคำขอ → รอเจ้าของหอยืนยัน → ชำระเงิน · ยกเลิกฟรีใน 1 วัน',
    error: 'ส่งคำขอจองไม่สำเร็จ',
  },
  en: {
    title: 'Submit Booking Request',
    subtitle: 'Fill in your contact info to confirm the booking request',
    namePlaceholder: 'Booker name',
    phonePlaceholder: 'Phone number',
    phoneHint: 'You can edit the number if you want to use a different one for this booking',
    checkInLabel: 'Check-in date',
    notePlaceholder: 'Note (optional)',
    submitting: 'Submitting...',
    submit: 'Submit request',
    flowNote: 'Request → owner confirms → payment · free cancellation within 1 day',
    error: 'Failed to submit booking request',
  },
};

function NewBookingForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const roomId = searchParams.get('roomId') ?? '';
  const { lang } = useLang();
  const t = TEXT[lang];

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
      setError(err instanceof Error ? err.message : t.error);
      setSubmitting(false);
    }
  }

  return (
    <main className="mx-auto max-w-md p-6">
      <h1 className="text-xl font-bold text-ink-strong dark:text-white">{t.title}</h1>
      <p className="mt-1 text-sm text-ink-subtitle">{t.subtitle}</p>

      <form
        onSubmit={handleSubmit}
        className="mt-5 flex flex-col gap-3 rounded-card border border-card-border bg-white p-5 shadow-sm dark:border-white/10 dark:bg-[#1a1a19]"
      >
        <input
          type="text"
          placeholder={t.namePlaceholder}
          value={contactName}
          onChange={(e) => setContactName(e.target.value)}
          className={inputClass}
          required
        />
        <div>
          <input
            type="tel"
            placeholder={t.phonePlaceholder}
            value={contactPhone}
            onChange={(e) => setContactPhone(e.target.value)}
            className={`${inputClass} w-full font-sans`}
            required
          />
          <p className="mt-1 text-xs text-ink-faint">{t.phoneHint}</p>
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-medium text-ink-subtitle">{t.checkInLabel}</label>
          <input
            type="date"
            value={checkInDate}
            onChange={(e) => setCheckInDate(e.target.value)}
            className={`${inputClass} w-full font-sans`}
            required
          />
        </div>
        <textarea
          placeholder={t.notePlaceholder}
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
          {submitting ? t.submitting : t.submit}
        </button>
        <p className="text-center text-xs leading-relaxed text-ink-faint">{t.flowNote}</p>
      </form>
    </main>
  );
}

export default function NewBookingPage() {
  return (
    <Suspense fallback={<PageLoader />}>
      <NewBookingForm />
    </Suspense>
  );
}
