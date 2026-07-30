'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiClient } from '@/lib/api-client';
import { useLang } from '@/hooks/useLang';
import { getSocket } from '@/lib/ws';
import { PageLoader } from '@/components/PageLoader';

interface IncomeRow {
  paymentId: string;
  bookingId: string;
  ref: string;
  tenantName: string;
  dormName: string;
  roomType: string;
  roomPrice: number;
  deposit: number;
  ownerPayout: number;
  status: 'transferred' | 'pending';
  transferredAt: string | null;
  transferSlipUrl: string | null;
}
interface OwnerIncome {
  received: number;
  pending: number;
  rows: IncomeRow[];
}

const TEXT = {
  th: {
    back: 'กลับแดชบอร์ด',
    receivedTitle: 'ค่าห้องที่ได้รับแล้ว (บันทึกในระบบ)',
    receivedSub: 'โอนเข้าบัญชีเรียบร้อย · เต็มจำนวน',
    pendingTitle: 'รอโอนจากแอดมิน',
    pendingSub: 'จะบันทึกเป็นรายได้อัตโนมัติเมื่อเงินเข้า',
    tableTitle: 'ค่าห้องแยกตามการจอง',
    thRef: 'เลขที่',
    thTenant: 'ผู้เช่า',
    thRoom: 'ห้อง',
    thRent: 'ค่าห้อง (สุทธิ)',
    thStatus: 'สถานะ',
    transferred: 'โอนแล้ว',
    pending: 'รอโอนจากแอดมิน',
    viewSlip: 'ดูสลิป',
    totalReceived: 'รวมที่ได้รับแล้ว',
    none: 'ยังไม่มีรายการ',
    note: 'แสดงเฉพาะค่าห้องที่เจ้าของหอได้รับจากการจองผ่านแอป Hoprak · รายการที่ “รอโอนจากแอดมิน” จะถูกบันทึกเป็นรายได้เมื่อเงินเข้าบัญชีแล้วเท่านั้น',
  },
  en: {
    back: 'Back to dashboard',
    receivedTitle: 'Room income received (recorded)',
    receivedSub: 'Transferred to your account · in full',
    pendingTitle: 'Awaiting admin transfer',
    pendingSub: 'Auto-recorded as income once the money arrives',
    tableTitle: 'Room income by booking',
    thRef: 'Ref',
    thTenant: 'Tenant',
    thRoom: 'Room',
    thRent: 'Payout (net)',
    thStatus: 'Status',
    transferred: 'Transferred',
    pending: 'Awaiting transfer',
    viewSlip: 'View slip',
    totalReceived: 'Total received',
    none: 'No items yet',
    note: 'Shows the room income the owner receives from Hoprak bookings · items “awaiting admin transfer” are recorded as income only once the money is in your account.',
  },
};

const ROOM_TYPE: Record<string, { th: string; en: string }> = {
  AIR: { th: 'ห้องแอร์', en: 'AC' },
  FAN: { th: 'ห้องพัดลม', en: 'Fan' },
};

export default function PartnerIncomePage() {
  const { lang } = useLang();
  const t = TEXT[lang];
  const [income, setIncome] = useState<OwnerIncome | null>(null);

  useEffect(() => {
    const load = () => apiClient.get<OwnerIncome>('/partner/income').then(setIncome).catch(() => setIncome({ received: 0, pending: 0, rows: [] }));
    load();
    const socket = getSocket();
    socket.on('notification:new', load); // แอดมินโอน → เด้งเป็นโอนแล้วอัตโนมัติ
    return () => {
      socket.off('notification:new', load);
    };
  }, []);

  if (!income) return <PageLoader theme="seller" />;

  const roomTypeLabel = (type: string) => ROOM_TYPE[type]?.[lang] ?? type;

  return (
    <div>
      <Link
        href="/partner/dashboard"
        className="mb-4 inline-flex items-center gap-1.5 text-[13.5px] font-semibold text-ink-body hover:text-ink-strong"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
          <path d="M19 12H5M11 6l-6 6 6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        {t.back}
      </Link>

      {/* headline totals */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-card-lg border-0 bg-[linear-gradient(120deg,#0F1115,#1B2A22)] p-6 shadow-card">
          <div className="text-[13.5px] text-[#9BB3A6]">{t.receivedTitle}</div>
          <div className="mt-1.5 font-sans text-[36px] font-bold tracking-tight text-[#3DDC97]">
            ฿{income.received.toLocaleString()}
          </div>
          <div className="mt-1 text-[12.5px] text-[#7E9689]">{t.receivedSub}</div>
        </div>
        <div className="rounded-card-lg border-[1.5px] border-[#F5E4C3] bg-[#FFFBF3] p-6 shadow-card">
          <div className="flex items-center gap-2">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="9" stroke="#C77B14" strokeWidth="1.8" />
              <path d="M12 7v5l3 3" stroke="#C77B14" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
            <span className="text-[13.5px] font-semibold text-[#C77B14]">{t.pendingTitle}</span>
          </div>
          <div className="mt-1.5 font-sans text-[36px] font-bold tracking-tight text-[#C77B14]">
            ฿{income.pending.toLocaleString()}
          </div>
          <div className="mt-1 text-[12.5px] text-[#B08A4A]">{t.pendingSub}</div>
        </div>
      </div>

      {/* per-booking table */}
      <div className="mt-[18px] rounded-card-lg border border-card-border bg-white p-6 shadow-card">
        <div className="mb-3.5 text-[17px] font-bold text-ink-strong">{t.tableTitle}</div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr className="border-b border-hairline text-xs font-semibold text-ink-faint">
                <th className="py-2.5 pr-3 font-semibold">{t.thRef}</th>
                <th className="py-2.5 pr-3 font-semibold">{t.thTenant}</th>
                <th className="py-2.5 pr-3 font-semibold">{t.thRoom}</th>
                <th className="py-2.5 pr-3 font-semibold">{t.thRent}</th>
                <th className="py-2.5 font-semibold">{t.thStatus}</th>
              </tr>
            </thead>
            <tbody>
              {income.rows.map((r) => (
                <tr key={r.paymentId} className="border-b border-hairline last:border-0">
                  <td className="py-3.5 pr-3 font-sans font-bold text-tenant">#{r.ref}</td>
                  <td className="py-3.5 pr-3 text-ink-subtitle">{r.tenantName}</td>
                  <td className="py-3.5 pr-3 text-ink-subtitle">{roomTypeLabel(r.roomType)}</td>
                  <td className="py-3.5 pr-3 font-sans font-bold tabular-nums text-ink-strong">
                    ฿{r.ownerPayout.toLocaleString()}
                  </td>
                  <td className="py-3.5">
                    <div className="flex flex-wrap items-center gap-2">
                      {r.status === 'transferred' ? (
                        <span className="inline-flex items-center gap-1.5 rounded-pill bg-[#E7F7EF] px-3 py-1 text-[12px] font-bold text-[#12704A]">
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                            <path d="M5 12l5 5L20 6" stroke="#12704A" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                          {t.transferred}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 rounded-pill bg-[#FFF3E0] px-3 py-1 text-[12px] font-bold text-[#C77B14]">
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                            <circle cx="12" cy="12" r="9" stroke="#C77B14" strokeWidth="2" />
                            <path d="M12 8v4l3 2" stroke="#C77B14" strokeWidth="2" strokeLinecap="round" />
                          </svg>
                          {t.pending}
                        </span>
                      )}
                      {r.transferSlipUrl && (
                        <a
                          href={r.transferSlipUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1.5 rounded-lg border border-card-border px-3 py-1 text-[12px] font-semibold text-ink-body hover:bg-surface-canvas"
                        >
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                            <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" stroke="currentColor" strokeWidth="1.8" />
                            <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.8" />
                          </svg>
                          {t.viewSlip}
                        </a>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {income.rows.length > 0 && (
                <tr>
                  <td className="py-4 pr-3 font-bold text-ink-strong" colSpan={3}>
                    {t.totalReceived}
                  </td>
                  <td className="py-4 pr-3 font-sans text-[17px] font-bold text-[#12A150]" colSpan={2}>
                    ฿{income.received.toLocaleString()}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {income.rows.length === 0 && <p className="py-4 text-ink-faint">{t.none}</p>}
        <p className="mt-3.5 text-[12.5px] leading-relaxed text-ink-faint">{t.note}</p>
      </div>
    </div>
  );
}
