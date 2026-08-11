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
  commission: number;
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
interface DayIncome {
  date: string;
  received: number;
  pending: number;
  count: number;
  daily: number;
  monthly: number;
}
interface OwnerDailyIncome {
  days: DayIncome[];
  totalReceived: number;
  totalPending: number;
}

const TEXT = {
  th: {
    back: 'กลับแดชบอร์ด',
    receivedTitle: 'ค่าห้องที่ได้รับแล้ว (บันทึกในระบบ)',
    receivedSub: 'โอนเข้าบัญชีเรียบร้อย · เต็มจำนวน',
    pendingTitle: 'รอโอนจากแอดมิน',
    pendingSub: 'จะบันทึกเป็นรายได้อัตโนมัติเมื่อเงินเข้า',
    commTitle: 'ค่าคอมมิชชั่นของแอป',
    commSub: 'Hoprak หัก 20% จากค่าห้อง (มัดจำไม่โดนหัก)',
    tableTitle: 'รายได้แยกตามการจอง',
    thRef: 'เลขที่',
    thTenant: 'ผู้เช่า',
    thRoom: 'ห้อง',
    thRoomPrice: 'ค่าห้อง',
    thDeposit: 'มัดจำ (เต็ม)',
    thComm: 'คอม 20%',
    thRent: 'โอนสุทธิ',
    thStatus: 'สถานะ',
    breakdownNote: 'คอม 20% หักจาก “ค่าห้อง” เท่านั้น · ค่ามัดจำคืนเจ้าของหอเต็มจำนวน · โอนสุทธิ = ค่าห้อง − คอม + มัดจำ',
    transferred: 'โอนแล้ว',
    pending: 'รอโอนจากแอดมิน',
    viewSlip: 'ดูสลิป',
    totalReceived: 'รวมที่ได้รับแล้ว',
    none: 'ยังไม่มีรายการ',
    note: 'แสดงเฉพาะค่าห้องที่เจ้าของหอได้รับจากการจองผ่านแอป Hoprak · รายการที่ “รอโอนจากแอดมิน” จะถูกบันทึกเป็นรายได้เมื่อเงินเข้าบัญชีแล้วเท่านั้น',
    tabBooking: 'ตามการจอง',
    tabDaily: 'รายวัน',
    fromLabel: 'ตั้งแต่',
    toLabel: 'ถึง',
    thDate: 'วันที่',
    thReceived: 'ได้รับแล้ว',
    thPending: 'รอโอน',
    thCount: 'จำนวนจอง',
    dailyBadge: 'รายวัน',
    monthlyBadge: 'รายเดือน',
    dailyNote: 'ยอดจัดกลุ่มตามวันที่ผู้เช่าชำระเงิน',
    clearFilter: 'ล้างตัวกรอง',
  },
  en: {
    back: 'Back to dashboard',
    receivedTitle: 'Room income received (recorded)',
    receivedSub: 'Transferred to your account · in full',
    pendingTitle: 'Awaiting admin transfer',
    pendingSub: 'Auto-recorded as income once the money arrives',
    commTitle: 'App commission',
    commSub: 'Hoprak takes 20% of room rent (deposit exempt)',
    tableTitle: 'Income by booking',
    thRef: 'Ref',
    thTenant: 'Tenant',
    thRoom: 'Room',
    thRoomPrice: 'Room rent',
    thDeposit: 'Deposit (full)',
    thComm: 'Comm 20%',
    thRent: 'Net payout',
    thStatus: 'Status',
    breakdownNote: 'The 20% commission is deducted from the room rent only · the deposit is returned in full · net payout = room rent − commission + deposit',
    transferred: 'Transferred',
    pending: 'Awaiting transfer',
    viewSlip: 'View slip',
    totalReceived: 'Total received',
    none: 'No items yet',
    note: 'Shows the room income the owner receives from Hoprak bookings · items “awaiting admin transfer” are recorded as income only once the money is in your account.',
    tabBooking: 'By booking',
    tabDaily: 'Daily',
    fromLabel: 'From',
    toLabel: 'To',
    thDate: 'Date',
    thReceived: 'Received',
    thPending: 'Pending',
    thCount: 'Bookings',
    dailyBadge: 'Daily',
    monthlyBadge: 'Monthly',
    dailyNote: 'Grouped by the date the tenant paid',
    clearFilter: 'Clear filter',
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
  const [view, setView] = useState<'booking' | 'daily'>('booking');
  const [daily, setDaily] = useState<OwnerDailyIncome | null>(null);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  useEffect(() => {
    const load = () => apiClient.get<OwnerIncome>('/partner/income').then(setIncome).catch(() => setIncome({ received: 0, pending: 0, rows: [] }));
    load();
    const socket = getSocket();
    socket.on('notification:new', load); // แอดมินโอน → เด้งเป็นโอนแล้วอัตโนมัติ
    return () => {
      socket.off('notification:new', load);
    };
  }, []);

  // มุมมองรายวัน — โหลดใหม่เมื่อสลับแท็บหรือเปลี่ยนช่วงวัน
  useEffect(() => {
    if (view !== 'daily') return;
    const qs = new URLSearchParams();
    if (from) qs.set('from', from);
    if (to) qs.set('to', to);
    const url = `/partner/income/daily${qs.toString() ? `?${qs.toString()}` : ''}`;
    apiClient
      .get<OwnerDailyIncome>(url)
      .then(setDaily)
      .catch(() => setDaily({ days: [], totalReceived: 0, totalPending: 0 }));
  }, [view, from, to]);

  if (!income) return <PageLoader theme="seller" />;

  const roomTypeLabel = (type: string) => ROOM_TYPE[type]?.[lang] ?? type;
  // คอมรวมที่แอปหักไปทั้งหมด (ทุกการจอง ไม่ว่าโอนแล้วหรือรอโอน) — คอมถูกหักตั้งแต่จ่ายเงิน
  const totalCommission = income.rows.reduce((s, r) => s + r.commission, 0);

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
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
        {/* ยอดหักค่าคอม (แอปหักไปทั้งหมด) — หัก 20% จากค่าห้องเท่านั้น */}
        <div className="rounded-card-lg border-[1.5px] border-[#E5DAF5] bg-[#FAF7FE] p-6 shadow-card">
          <div className="flex items-center gap-2">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M19 5L5 19M8 6a2 2 0 11-4 0 2 2 0 014 0zm12 12a2 2 0 11-4 0 2 2 0 014 0z" stroke="#7C4DB8" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span className="text-[13.5px] font-semibold text-[#7C4DB8]">{t.commTitle}</span>
          </div>
          <div className="mt-1.5 font-sans text-[36px] font-bold tracking-tight text-[#7C4DBB]">
            ฿{totalCommission.toLocaleString()}
          </div>
          <div className="mt-1 text-[12.5px] text-[#9578B5]">{t.commSub}</div>
        </div>
      </div>

      {/* tab: ตามการจอง / รายวัน */}
      <div className="mt-[18px] flex items-center gap-2">
        {(['booking', 'daily'] as const).map((v) => (
          <button
            key={v}
            type="button"
            onClick={() => setView(v)}
            className={`rounded-lg px-4 py-2 text-sm font-semibold ${
              view === v ? 'bg-ink-strong text-white' : 'border border-card-border bg-white text-ink-body'
            }`}
          >
            {v === 'booking' ? t.tabBooking : t.tabDaily}
          </button>
        ))}
      </div>

      {/* มุมมองรายวัน */}
      {view === 'daily' && (
        <div className="mt-3.5 rounded-card-lg border border-card-border bg-white p-6 shadow-card">
          <div className="mb-4 flex flex-wrap items-end gap-3">
            <div>
              <label className="mb-1 block text-xs text-ink-muted">{t.fromLabel}</label>
              <input
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                className="h-[42px] rounded-[11px] border border-card-border px-3 text-sm outline-none focus:border-tenant"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-ink-muted">{t.toLabel}</label>
              <input
                type="date"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                className="h-[42px] rounded-[11px] border border-card-border px-3 text-sm outline-none focus:border-tenant"
              />
            </div>
            {(from || to) && (
              <button
                type="button"
                onClick={() => {
                  setFrom('');
                  setTo('');
                }}
                className="h-[42px] rounded-[11px] border border-card-border px-3 text-sm font-medium text-ink-body hover:bg-surface-canvas"
              >
                {t.clearFilter}
              </button>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead>
                <tr className="border-b border-hairline text-xs font-semibold text-ink-faint">
                  <th className="py-2.5 pr-3 font-semibold">{t.thDate}</th>
                  <th className="py-2.5 pr-3 font-semibold">{t.thCount}</th>
                  <th className="py-2.5 pr-3 text-right font-semibold">{t.thReceived}</th>
                  <th className="py-2.5 text-right font-semibold">{t.thPending}</th>
                </tr>
              </thead>
              <tbody>
                {(daily?.days ?? []).map((d) => (
                  <tr key={d.date} className="border-b border-hairline last:border-0">
                    <td className="py-3.5 pr-3 font-sans font-medium text-ink-strong">
                      {new Date(d.date).toLocaleDateString(lang === 'th' ? 'th-TH' : 'en-US', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </td>
                    <td className="py-3.5 pr-3">
                      <span className="mr-1.5 rounded-md bg-success-tint px-1.5 py-0.5 text-[11px] font-semibold text-success">
                        {d.daily} {t.dailyBadge}
                      </span>
                      <span className="rounded-md bg-tenant-tint px-1.5 py-0.5 text-[11px] font-semibold text-tenant">
                        {d.monthly} {t.monthlyBadge}
                      </span>
                    </td>
                    <td className="py-3.5 pr-3 text-right font-sans font-bold tabular-nums text-[#12A150]">
                      ฿{d.received.toLocaleString()}
                    </td>
                    <td className="py-3.5 text-right font-sans font-bold tabular-nums text-[#C77B14]">
                      ฿{d.pending.toLocaleString()}
                    </td>
                  </tr>
                ))}
                {daily && daily.days.length > 0 && (
                  <tr>
                    <td className="py-4 pr-3 font-bold text-ink-strong" colSpan={2}>
                      {t.totalReceived}
                    </td>
                    <td className="py-4 pr-3 text-right font-sans text-[16px] font-bold text-[#12A150]">
                      ฿{daily.totalReceived.toLocaleString()}
                    </td>
                    <td className="py-4 text-right font-sans text-[16px] font-bold text-[#C77B14]">
                      ฿{daily.totalPending.toLocaleString()}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          {daily && daily.days.length === 0 && <p className="py-4 text-ink-faint">{t.none}</p>}
          <p className="mt-3.5 text-[12.5px] leading-relaxed text-ink-faint">{t.dailyNote}</p>
        </div>
      )}

      {/* per-booking table */}
      {view === 'booking' && (
      <div className="mt-3.5 rounded-card-lg border border-card-border bg-white p-6 shadow-card">
        <div className="mb-3.5 text-[17px] font-bold text-ink-strong">{t.tableTitle}</div>
        {/* จอกลางขึ้นไป: ตารางเต็มความกว้าง ไม่ต้องเลื่อนแนวนอน (ตัด min-width ออก + บีบ padding/ฟอนต์) */}
        <div className="hidden md:block">
          <table className="w-full table-fixed text-left text-[13px]">
            <colgroup>
              <col className="w-[9%]" />
              <col className="w-[18%]" />
              <col className="w-[11%]" />
              <col className="w-[12%]" />
              <col className="w-[11%]" />
              <col className="w-[11%]" />
              <col className="w-[12%]" />
              <col className="w-[16%]" />
            </colgroup>
            <thead>
              <tr className="border-b border-hairline text-[11.5px] font-semibold text-ink-faint">
                <th className="py-2.5 pr-2 font-semibold">{t.thRef}</th>
                <th className="py-2.5 pr-2 font-semibold">{t.thTenant}</th>
                <th className="py-2.5 pr-2 font-semibold">{t.thRoom}</th>
                <th className="py-2.5 pr-2 text-right font-semibold">{t.thRoomPrice}</th>
                <th className="py-2.5 pr-2 text-right font-semibold">{t.thDeposit}</th>
                <th className="py-2.5 pr-2 text-right font-semibold">{t.thComm}</th>
                <th className="py-2.5 pr-2 text-right font-semibold">{t.thRent}</th>
                <th className="py-2.5 font-semibold">{t.thStatus}</th>
              </tr>
            </thead>
            <tbody>
              {income.rows.map((r) => (
                <tr key={r.paymentId} className="border-b border-hairline last:border-0">
                  <td className="py-3 pr-2 truncate font-sans font-bold text-tenant">#{r.ref}</td>
                  <td className="py-3 pr-2 truncate text-ink-subtitle" title={r.tenantName}>
                    {r.tenantName}
                  </td>
                  <td className="py-3 pr-2 truncate text-ink-subtitle">{roomTypeLabel(r.roomType)}</td>
                  <td className="py-3 pr-2 text-right font-sans tabular-nums text-ink-subtitle">
                    ฿{r.roomPrice.toLocaleString()}
                  </td>
                  <td className="py-3 pr-2 text-right font-sans tabular-nums text-[#12A150]">
                    ฿{r.deposit.toLocaleString()}
                  </td>
                  <td className="py-3 pr-2 text-right font-sans tabular-nums text-danger">
                    ฿{r.commission.toLocaleString()}
                  </td>
                  <td className="py-3 pr-2 text-right font-sans font-bold tabular-nums text-ink-strong">
                    ฿{r.ownerPayout.toLocaleString()}
                  </td>
                  <td className="py-3">
                    <div className="flex flex-wrap items-center gap-1.5">
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
                  <td className="py-4 pr-3 font-bold text-ink-strong" colSpan={6}>
                    {t.totalReceived}
                  </td>
                  <td className="py-4 pr-3 text-right font-sans text-[17px] font-bold text-[#12A150]" colSpan={2}>
                    ฿{income.received.toLocaleString()}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {/* มือถือ: การ์ดต่อรายการ แทนตาราง (ไม่ต้องเลื่อนแนวนอน) */}
        <div className="flex flex-col gap-2.5 md:hidden">
          {income.rows.map((r) => (
            <div key={r.paymentId} className="rounded-[13px] border border-hairline p-3.5">
              <div className="flex items-center justify-between gap-2">
                <span className="font-sans text-[13px] font-bold text-tenant">#{r.ref}</span>
                {r.status === 'transferred' ? (
                  <span className="rounded-pill bg-[#E7F7EF] px-2.5 py-0.5 text-[11.5px] font-bold text-[#12704A]">
                    {t.transferred}
                  </span>
                ) : (
                  <span className="rounded-pill bg-[#FFF3E0] px-2.5 py-0.5 text-[11.5px] font-bold text-[#C77B14]">
                    {t.pending}
                  </span>
                )}
              </div>
              <div className="mt-1 truncate text-[13.5px] font-semibold text-ink-strong">{r.tenantName}</div>
              <div className="text-[12px] text-ink-muted">{roomTypeLabel(r.roomType)}</div>

              <dl className="mt-2.5 grid grid-cols-2 gap-x-3 gap-y-1.5 text-[12.5px]">
                <dt className="text-ink-muted">{t.thRoomPrice}</dt>
                <dd className="text-right font-sans tabular-nums text-ink-subtitle">
                  ฿{r.roomPrice.toLocaleString()}
                </dd>
                <dt className="text-ink-muted">{t.thDeposit}</dt>
                <dd className="text-right font-sans tabular-nums text-[#12A150]">฿{r.deposit.toLocaleString()}</dd>
                <dt className="text-ink-muted">{t.thComm}</dt>
                <dd className="text-right font-sans tabular-nums text-danger">฿{r.commission.toLocaleString()}</dd>
                <dt className="font-semibold text-ink-body">{t.thRent}</dt>
                <dd className="text-right font-sans font-bold tabular-nums text-ink-strong">
                  ฿{r.ownerPayout.toLocaleString()}
                </dd>
              </dl>

              {r.transferSlipUrl && (
                <a
                  href={r.transferSlipUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-2.5 inline-flex items-center gap-1.5 rounded-lg border border-card-border px-3 py-1 text-[12px] font-semibold text-ink-body"
                >
                  {t.viewSlip}
                </a>
              )}
            </div>
          ))}
          {income.rows.length > 0 && (
            <div className="flex items-center justify-between rounded-[13px] bg-surface-canvas px-3.5 py-3">
              <span className="text-[13px] font-bold text-ink-strong">{t.totalReceived}</span>
              <span className="font-sans text-[16px] font-bold text-[#12A150]">
                ฿{income.received.toLocaleString()}
              </span>
            </div>
          )}
        </div>

        {income.rows.length === 0 && <p className="py-4 text-ink-faint">{t.none}</p>}
      </div>
      )}
    </div>
  );
}
