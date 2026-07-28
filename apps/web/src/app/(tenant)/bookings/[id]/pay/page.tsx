'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api-client';
import { getToken } from '@/lib/auth';
import { useLang } from '@/hooks/useLang';
import type { Booking } from '@hopak/shared';
import { PageLoader } from '@/components/PageLoader';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

const TEXT = {
  th: {
    title: 'ชำระเงิน',
    qrLine1: 'QR PromptPay',
    qrLine2: '(สแกนเพื่อชำระเงิน)',
    transferTo: 'โอนเข้าบัญชีส่วนกลาง Hopak',
    cutoffNote: 'ตัดยอดภายในเที่ยงคืน หลังชำระเงินระบบจะออกใบจองอัตโนมัติ',
    slipLabel: 'แนบสลิปโอนเงิน',
    needSlip: 'กรุณาแนบสลิปโอนเงินก่อนยืนยัน',
    confirming: 'กำลังยืนยัน...',
    confirm: 'ฉันชำระเงินแล้ว',
    error: 'ชำระเงินไม่สำเร็จ',
  },
  en: {
    title: 'Payment',
    qrLine1: 'PromptPay QR',
    qrLine2: '(scan to pay)',
    transferTo: 'Transfer to Hopak central account',
    cutoffNote: 'Cutoff at midnight — a booking slip is issued automatically after payment',
    slipLabel: 'Attach transfer slip',
    needSlip: 'Please attach your transfer slip before confirming',
    confirming: 'Confirming...',
    confirm: "I've paid",
    error: 'Payment failed',
  },
};

export default function PayBookingPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { lang } = useLang();
  const t = TEXT[lang];
  const [booking, setBooking] = useState<Booking | null>(null);
  const [slip, setSlip] = useState<File | null>(null);
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!getToken()) {
      router.replace('/login');
      return;
    }
    apiClient.get<Booking>(`/bookings/${id}`).then(setBooking).catch(() => router.replace('/login'));
  }, [id, router]);

  async function handleConfirmPayment() {
    if (!slip) {
      setError(t.needSlip);
      return;
    }
    setPaying(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append('method', 'promptpay');
      formData.append('slip', slip);
      const res = await fetch(`${API_URL}/bookings/${id}/payment`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${getToken()}` },
        body: formData,
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message ?? t.error);
      }
      router.push(`/bookings/${id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : t.error);
      setPaying(false);
    }
  }

  if (!booking) return <PageLoader />;

  return (
    <main className="mx-auto max-w-sm p-4 sm:p-6">
      <h1 className="text-xl font-bold text-[#0b0b0b] dark:text-white">{t.title}</h1>
      <p className="mt-1 text-3xl font-semibold tabular-nums text-[#0b0b0b] dark:text-white">
        {booking.amount.toLocaleString()} ฿
      </p>

      <div className="mt-6 flex flex-col items-center rounded-lg border border-black/10 p-6 dark:border-white/10">
        <div className="flex h-48 w-48 items-center justify-center rounded-lg border-2 border-dashed border-black/20 bg-[#f9f9f7] text-center text-xs text-[#898781] dark:border-white/20 dark:bg-[#1a1a19]">
          {t.qrLine1}
          <br />
          {t.qrLine2}
        </div>
        <p className="mt-4 text-sm text-[#898781]">{t.transferTo}</p>
        <p className="text-sm font-medium text-[#0b0b0b] dark:text-white">PromptPay: 099-123-4567</p>
      </div>

      <p className="mt-4 text-center text-xs text-[#898781]">{t.cutoffNote}</p>

      <div className="mt-5">
        <label className="mb-1.5 block text-sm font-medium text-[#0b0b0b] dark:text-white">{t.slipLabel}</label>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={(e) => {
            setSlip(e.target.files?.[0] ?? null);
            setError(null);
          }}
          className="w-full text-sm text-[#0b0b0b] dark:text-white"
        />
      </div>

      {error && <p className="mt-3 text-center text-sm text-red-600">{error}</p>}

      <button
        onClick={handleConfirmPayment}
        disabled={paying || !slip}
        className="mt-6 w-full rounded-lg bg-green-600 py-2.5 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
      >
        {paying ? t.confirming : t.confirm}
      </button>
    </main>
  );
}
