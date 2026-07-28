'use client';

import { useState } from 'react';
import { apiClient } from '@/lib/api-client';
import { useLang } from '@/hooks/useLang';
import type { CheckInResult } from '@hopak/shared';

const TEXT = {
  th: {
    heading: 'ยืนยันการเข้าพัก',
    desc: 'ให้ผู้เช่าแสดงโค้ดจากใบเสร็จในแอป แล้วกรอกโค้ดที่นี่เพื่อยืนยันตัวตนและปิดงานการจอง',
    label: 'โค้ดยืนยันการเข้าพัก',
    submit: 'ยืนยันการเข้าพัก',
    submitting: 'กำลังตรวจสอบ...',
    empty: 'กรุณากรอกโค้ด',
    genericError: 'ยืนยันไม่สำเร็จ',
    successTitle: 'ยืนยันการเข้าพักสำเร็จ',
    successDesc: 'การจองนี้ปิดงานเรียบร้อยแล้ว มอบกุญแจให้ผู้เช่าได้เลย',
    rowTenant: 'ผู้เช่า',
    rowPhone: 'เบอร์โทร',
    rowDorm: 'หอพัก',
    rowCheckInDate: 'วันเข้าอยู่',
    rowAmount: 'ยอดที่ชำระแล้ว',
    rowCheckedInAt: 'ยืนยันเมื่อ',
    again: 'ยืนยันรายการถัดไป',
    note: 'โค้ดใช้ได้ครั้งเดียว · ระบบออกโค้ดให้หลังแอดมินตรวจสลิปเรียบร้อยแล้วเท่านั้น',
    roomAir: 'ห้องแอร์',
    roomFan: 'ห้องพัดลม',
    dateLocale: 'th-TH',
  },
  en: {
    heading: 'Confirm check-in',
    desc: 'Ask the tenant to show the code on their receipt, then enter it here to verify them and close the booking.',
    label: 'Check-in code',
    submit: 'Confirm check-in',
    submitting: 'Verifying...',
    empty: 'Please enter the code',
    genericError: 'Verification failed',
    successTitle: 'Check-in confirmed',
    successDesc: 'This booking is now complete. You can hand over the key.',
    rowTenant: 'Tenant',
    rowPhone: 'Phone',
    rowDorm: 'Dorm',
    rowCheckInDate: 'Move-in date',
    rowAmount: 'Amount paid',
    rowCheckedInAt: 'Confirmed at',
    again: 'Verify another',
    note: 'Each code works once · codes are only issued after the admin verifies the payment slip.',
    roomAir: 'Air-conditioned room',
    roomFan: 'Fan room',
    dateLocale: 'en-US',
  },
};

export default function PartnerCheckInPage() {
  const { lang } = useLang();
  const t = TEXT[lang];
  const [token, setToken] = useState('');
  const [result, setResult] = useState<CheckInResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!token.trim()) {
      setError(t.empty);
      return;
    }
    setLoading(true);
    try {
      const res = await apiClient.post<CheckInResult>('/bookings/check-in', { token: token.trim() });
      setResult(res);
      setToken('');
    } catch (err) {
      setError(err instanceof Error ? err.message : t.genericError);
    } finally {
      setLoading(false);
    }
  }

  const fmtDate = (v: string) =>
    new Date(v).toLocaleDateString(t.dateLocale, { day: 'numeric', month: 'short', year: 'numeric' });
  const fmtDateTime = (v: string) =>
    new Date(v).toLocaleString(t.dateLocale, {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

  if (result) {
    const roomLabel = result.roomName || (result.roomType.toUpperCase() === 'AIR' ? t.roomAir : t.roomFan);
    return (
      <div className="mx-auto max-w-md">
        <div className="rounded-card-lg border border-card-border bg-white p-6 shadow-card">
          <div className="flex flex-col items-center text-center">
            <div className="flex h-[72px] w-[72px] items-center justify-center rounded-pill bg-success-tint">
              <svg width="38" height="38" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" fill="#1FB56E" />
                <path d="M7.5 12.5l3 3 6-7" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <h2 className="mt-4 text-lg font-bold text-ink-strong">{t.successTitle}</h2>
            <p className="mt-1.5 text-sm leading-relaxed text-ink-muted">{t.successDesc}</p>
          </div>

          <div className="mt-5 overflow-hidden rounded-xl border border-card-border">
            {[
              { label: t.rowTenant, value: result.tenantName },
              { label: t.rowPhone, value: result.tenantPhone },
              { label: t.rowDorm, value: `${result.dormName} · ${roomLabel}` },
              { label: t.rowCheckInDate, value: fmtDate(result.checkInDate) },
              { label: t.rowAmount, value: `฿${result.amount.toLocaleString()}` },
              { label: t.rowCheckedInAt, value: fmtDateTime(result.checkedInAt) },
            ].map((r, i) => (
              <div
                key={r.label}
                className={`flex items-center justify-between gap-3 px-4 py-2.5 ${i > 0 ? 'border-t border-hairline' : ''}`}
              >
                <span className="shrink-0 text-[13px] text-ink-muted">{r.label}</span>
                <span className="text-right text-[13.5px] font-semibold text-ink-strong">{r.value}</span>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={() => setResult(null)}
            className="mt-5 w-full rounded-btn border border-card-border py-2.5 text-sm font-semibold text-ink-body hover:bg-surface-canvas"
          >
            {t.again}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md">
      <div className="rounded-card-lg border border-card-border bg-white p-6 shadow-card">
        <div className="flex items-center gap-3">
          <span className="flex h-[46px] w-[46px] shrink-0 items-center justify-center rounded-xl bg-tenant-tint">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M12 3l7 4v5c0 4-3 7-7 9-4-2-7-5-7-9V7l7-4z" stroke="#2F6FE0" strokeWidth="1.7" strokeLinejoin="round" />
              <path d="M9 12l2 2 4-4" stroke="#2F6FE0" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
          <div>
            <h2 className="text-[17px] font-bold text-ink-strong">{t.heading}</h2>
          </div>
        </div>
        <p className="mt-2.5 text-[13.5px] leading-relaxed text-ink-muted">{t.desc}</p>

        <form onSubmit={handleSubmit} className="mt-5">
          <label className="mb-1.5 block text-[13px] font-semibold text-ink-body">{t.label}</label>
          <input
            value={token}
            onChange={(e) => setToken(e.target.value.toUpperCase())}
            placeholder="HPK-XXXX-XXXX"
            autoComplete="off"
            spellCheck={false}
            className="h-14 w-full rounded-xl border-[1.5px] border-card-border bg-white px-4 text-center font-sans text-lg font-bold tracking-[3px] text-ink-strong outline-none placeholder:tracking-[2px] placeholder:text-ink-faint focus:border-tenant focus:shadow-[0_0_0_3px_rgba(47,111,224,0.1)]"
          />

          {error && <p className="mt-3 text-sm text-danger">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="mt-4 w-full rounded-xl bg-tenant py-3 text-[15px] font-bold text-white shadow-btn-tenant hover:bg-tenant-dark disabled:opacity-60"
          >
            {loading ? t.submitting : t.submit}
          </button>
        </form>

        <p className="mt-3.5 text-center text-[11.5px] leading-relaxed text-ink-faint">{t.note}</p>
      </div>
    </div>
  );
}
