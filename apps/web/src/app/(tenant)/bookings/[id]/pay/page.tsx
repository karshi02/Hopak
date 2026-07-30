'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api-client';
import { getToken } from '@/lib/auth';
import { useLang } from '@/hooks/useLang';
import type { Booking } from '@hopak/shared';
import { PageLoader } from '@/components/PageLoader';
import { BookingStepper } from '@/components/booking/BookingStepper';
import { BookingSummary } from '@/components/booking/BookingSummary';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';
const BANK_NAME = 'ธนาคารกสิกรไทย · Hoprak Escrow';
const BANK_ACCOUNT = '123-4-56789-0';

const TEXT = {
  th: {
    title: 'ชำระเงิน',
    sub: 'โอนเงินและแนบสลิปเพื่อให้แอดมินตรวจสอบ',
    transferTitle: 'โอนเงินและแนบสลิป',
    transferSub: (amt: string) => `โอนยอด ฿${amt} มาที่บัญชีด้านล่าง แล้วแนบสลิปเพื่อให้แอดมินตรวจสอบ`,
    copy: 'คัดลอก',
    copied: 'คัดลอกแล้ว',
    slipLabel: 'แนบสลิปการโอนเงิน',
    drop: 'ลากไฟล์มาวาง หรือ ',
    pick: 'เลือกรูปสลิป',
    formats: 'รองรับ JPG, PNG ขนาดไม่เกิน 5MB',
    needSlip: 'กรุณาแนบสลิปโอนเงินก่อนยืนยัน',
    confirming: 'กำลังยืนยัน...',
    confirm: 'ยืนยันการโอน + ส่งสลิป',
    error: 'ชำระเงินไม่สำเร็จ',
    changeFile: 'เปลี่ยนรูป',
    hint: 'แอดมินจะตรวจสอบสลิปภายใน 24 ชม.',
  },
  en: {
    title: 'Payment',
    sub: 'Transfer and attach your slip for admin review',
    transferTitle: 'Transfer & attach slip',
    transferSub: (amt: string) => `Transfer ฿${amt} to the account below, then attach the slip for admin review`,
    copy: 'Copy',
    copied: 'Copied',
    slipLabel: 'Attach transfer slip',
    drop: 'Drag a file here or ',
    pick: 'choose a slip image',
    formats: 'Supports JPG, PNG up to 5MB',
    needSlip: 'Please attach your transfer slip before confirming',
    confirming: 'Confirming...',
    confirm: 'Confirm transfer + send slip',
    error: 'Payment failed',
    changeFile: 'Change image',
    hint: 'Admin will review your slip within 24 hours',
  },
};

export default function PayBookingPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { lang } = useLang();
  const t = TEXT[lang];
  const [booking, setBooking] = useState<Booking | null>(null);
  const [slip, setSlip] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [paying, setPaying] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!getToken()) {
      router.replace('/login');
      return;
    }
    apiClient
      .get<Booking>(`/bookings/${id}`)
      .then((b) => {
        // จ่ายได้เฉพาะที่เจ้าของหอยืนยันแล้ว (CONFIRMED) และยังไม่เคยแนบสลิป
        // สถานะอื่น (จ่ายแล้ว/เคลียร์แล้ว/ยกเลิก) เด้งกลับหน้า detail ให้เห็นสถานะที่ถูก
        // ใช้ window.location.replace (hard nav) — router.replace บางครั้งไม่ navigate ใน App Router
        if (b.status.toUpperCase() !== 'CONFIRMED' || b.payment) {
          window.location.replace(`/bookings/${id}`);
          return;
        }
        setBooking(b);
      })
      .catch(() => window.location.replace(`/bookings/${id}`));
  }, [id, router]);

  function pickFile(f: File | null) {
    setSlip(f);
    setPreview(f ? URL.createObjectURL(f) : null);
  }

  function copyAccount() {
    navigator.clipboard?.writeText(BANK_ACCOUNT).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleSubmit() {
    setError(null);
    if (!slip) {
      setError(t.needSlip);
      return;
    }
    setPaying(true);
    try {
      const fd = new FormData();
      fd.append('method', 'promptpay');
      fd.append('slip', slip);
      const res = await fetch(`${API_URL}/bookings/${id}/payment`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${getToken()}` },
        body: fd,
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
    <main className="min-h-[calc(100vh-65px)] bg-[#F2F4F8]">
      <div className="mx-auto max-w-[1120px] px-4 py-6 sm:px-6">
        {/* header */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push(`/bookings/${id}`)}
            className="flex h-[38px] w-[38px] items-center justify-center rounded-xl border border-[#E4E7EC] bg-white"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M15 6l-6 6 6 6" stroke="#3A4050" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <div>
            <div className="text-[22px] font-bold tracking-tight text-ink-strong sm:text-[25px]">{t.title}</div>
            <div className="mt-0.5 text-[13.5px] text-[#8A909F]">{t.sub}</div>
          </div>
        </div>

        <BookingStepper current={4} lang={lang} />

        <div className="mt-6 grid grid-cols-1 items-start gap-6 lg:grid-cols-[1fr_400px]">
          {/* LEFT · transfer + slip */}
          <div className="rounded-[20px] border border-[#EAEDF2] bg-white p-6 shadow-[0_2px_8px_rgba(16,24,40,0.05)] sm:p-[30px]">
            <div className="text-[17px] font-bold text-ink-strong">{t.transferTitle}</div>
            <div className="mt-1.5 text-[13.5px] text-[#8A909F]">{t.transferSub(booking.amount.toLocaleString())}</div>

            {/* bank card */}
            <div className="mt-4 flex items-center gap-4 rounded-2xl border border-[#D5E4FF] bg-gradient-to-br from-[#EAF1FF] to-[#F3F7FE] p-[18px]">
              <div className="flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-[13px] bg-white shadow-[0_4px_10px_rgba(16,24,40,0.08)]">
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
                  <path d="M3 10l9-6 9 6M5 9v10h14V9M9 19v-6h6v6" stroke="#2F6FE0" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-[12.5px] text-[#8A909F]">{BANK_NAME}</div>
                <div className="mt-0.5 text-xl font-bold tracking-[0.5px] text-ink-strong">{BANK_ACCOUNT}</div>
              </div>
              <button
                onClick={copyAccount}
                className="flex h-[38px] shrink-0 items-center gap-1.5 rounded-[10px] border border-[#B9CEF5] bg-white px-3.5 text-[13px] font-bold text-tenant"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                  <rect x="9" y="9" width="11" height="11" rx="2" stroke="#2F6FE0" strokeWidth="1.7" />
                  <path d="M5 15V5a2 2 0 012-2h8" stroke="#2F6FE0" strokeWidth="1.7" />
                </svg>
                {copied ? t.copied : t.copy}
              </button>
            </div>

            {/* slip dropzone */}
            <div className="mt-[18px]">
              <div className="mb-2 text-[13px] font-semibold text-[#3A4050]">{t.slipLabel}</div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => pickFile(e.target.files?.[0] ?? null)}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex w-full flex-col items-center rounded-2xl border-2 border-dashed border-[#C4D3EC] bg-[#F7F9FC] p-[30px] text-center hover:border-tenant"
              >
                {preview ? (
                  <>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={preview} alt="slip" className="max-h-52 rounded-xl object-contain" />
                    <div className="mt-3 text-[13px] font-semibold text-tenant">{t.changeFile}</div>
                  </>
                ) : (
                  <>
                    <div className="flex h-[52px] w-[52px] items-center justify-center rounded-[14px] bg-tenant-tint">
                      <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
                        <path d="M12 16V4m0 0L8 8m4-4l4 4M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2" stroke="#2F6FE0" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </div>
                    <div className="mt-3 text-[14.5px] font-bold text-ink-strong">
                      {t.drop}
                      <span className="text-tenant">{t.pick}</span>
                    </div>
                    <div className="mt-1 text-xs text-[#9AA0AB]">{t.formats}</div>
                  </>
                )}
              </button>
              {error && <p className="mt-3 text-sm text-danger">{error}</p>}
            </div>
          </div>

          {/* RIGHT · summary */}
          <BookingSummary booking={booking} lang={lang}>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={paying}
              className="mt-[18px] flex h-[52px] w-full items-center justify-center gap-2 rounded-[13px] bg-gradient-to-br from-tenant to-[#5B9DFF] text-base font-bold text-white shadow-[0_10px_22px_rgba(47,111,224,0.3)] hover:brightness-105 disabled:opacity-60"
            >
              {paying ? t.confirming : t.confirm}
            </button>
            <p className="mt-2 text-center text-[11.5px] text-[#9AA0AB]">{t.hint}</p>
          </BookingSummary>
        </div>
      </div>
    </main>
  );
}
