'use client';

import { useEffect, useMemo, useState } from 'react';
import { apiClient } from '@/lib/api-client';
import { useLang } from '@/hooks/useLang';
import { RevenueChart } from '@/components/admin/RevenueChart';

interface Summary {
  totalUsers: number;
  totalDorms: number;
  totalBookings: number;
  totalRevenue: number;
}
interface MonthlyRevenue {
  year: number;
  months: number[];
}
interface FinanceSummary {
  totalCommission: number;
  totalChamberShare: number;
  totalPlatformShare: number;
  totalPayout: number;
  totalPending: number;
  totalTransferred: number;
  count: number;
}
interface PaymentRow {
  id: string;
  dormName: string;
  ownerName: string;
  amount: number;
  commission: number;
  ownerPayout: number;
  status: string; // PENDING | SETTLED | TRANSFERRED
}
interface Period {
  year: number;
  month: number;
}

const MONTH_TH = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
const MONTH_TH_FULL = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];
const MONTH_EN = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const TEXT = {
  th: {
    title: 'ภาพรวมระบบ',
    sub: (m: string) => `สรุปประจำเดือน ${m}`,
    exportReport: 'ออกรายงานเดือนนี้ (PDF)',
    exportCsv: 'Export CSV',
    kRevenue: 'รายได้แพลตฟอร์ม',
    kBookings: 'ยอดการจอง',
    kDorms: 'หอพักในระบบ',
    kUsers: 'ผู้ใช้ทั้งหมด',
    vsLast: 'จากเดือนก่อน',
    pendingApprove: (n: number) => `${n} รออนุมัติ`,
    chartTitle: 'รายได้แพลตฟอร์มรายเดือน',
    chartSub: (y: number) => `ค่าคอมมิชชั่น · ปี ${y}`,
    thisMonth: 'เดือนนี้',
    sourcesTitle: 'รายได้แยกตามแหล่ง',
    srcPlatform: 'รายได้แพลตฟอร์ม (90% ของคอม)',
    srcChamber: 'ส่วนหอการค้า (10% ของคอม)',
    totalRevMonth: 'รวมรายได้เดือนนี้',
    reportTitle: (m: string) => `สรุปงานประจำเดือน · ${m}`,
    reportSub: 'ข้อมูลพร้อมส่งออกเป็นเอกสาร PDF / Excel',
    stBookingsOk: 'การจองสำเร็จ',
    stCancelled: 'ยกเลิก / คืนเงิน',
    stNewDorms: 'หออนุมัติใหม่',
    stPending: 'รอโอนเจ้าของหอ',
    ofAll: (p: number) => `${p}% ของทั้งหมด`,
    thisMonthNote: 'เดือนนี้',
    itemsNote: (n: number) => `${n} รายการ`,
    colItem: 'รายการ',
    colGross: 'ยอดขายรวม',
    colComm: 'ค่าคอม',
    colPayout: 'โอนให้หอ',
    colStatus: 'สถานะ',
    stTransferred: 'โอนแล้ว',
    stWaiting: 'รอโอน',
    totalAll: 'รวมทั้งหมด',
    noData: 'ยังไม่มีข้อมูลในเดือนนี้',
    locale: 'th-TH',
  },
  en: {
    title: 'System Overview',
    sub: (m: string) => `Monthly summary · ${m}`,
    exportReport: 'Export report (PDF)',
    exportCsv: 'Export CSV',
    kRevenue: 'Platform revenue',
    kBookings: 'Bookings',
    kDorms: 'Dorms',
    kUsers: 'Total users',
    vsLast: 'vs last month',
    pendingApprove: (n: number) => `${n} pending`,
    chartTitle: 'Monthly platform revenue',
    chartSub: (y: number) => `Commission · ${y}`,
    thisMonth: 'This month',
    sourcesTitle: 'Revenue by source',
    srcPlatform: 'Platform (90% of comm.)',
    srcChamber: 'Chamber share (10%)',
    totalRevMonth: 'Total revenue this month',
    reportTitle: (m: string) => `Monthly report · ${m}`,
    reportSub: 'Ready to export as PDF / Excel',
    stBookingsOk: 'Successful bookings',
    stCancelled: 'Cancelled / refund',
    stNewDorms: 'New dorms approved',
    stPending: 'Pending owner payout',
    ofAll: (p: number) => `${p}% of total`,
    thisMonthNote: 'this month',
    itemsNote: (n: number) => `${n} items`,
    colItem: 'Item',
    colGross: 'Gross',
    colComm: 'Commission',
    colPayout: 'Payout',
    colStatus: 'Status',
    stTransferred: 'Transferred',
    stWaiting: 'Pending',
    totalAll: 'Total',
    noData: 'No data this month',
    locale: 'en-US',
  },
};

export default function AdminDashboardPage() {
  const { lang } = useLang();
  const t = TEXT[lang];
  const now = new Date();
  const [summary, setSummary] = useState<Summary | null>(null);
  const [monthly, setMonthly] = useState<MonthlyRevenue | null>(null);
  const [fin, setFin] = useState<FinanceSummary | null>(null);
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [periods, setPeriods] = useState<Period[]>([]);
  const [pendingDorms, setPendingDorms] = useState(0);
  const [sel, setSel] = useState<Period>({ year: now.getFullYear(), month: now.getMonth() + 1 });

  // ข้อมูลรวม (cumulative) โหลดครั้งเดียว
  useEffect(() => {
    apiClient.get<Summary>('/admin/analytics/summary').then(setSummary).catch(() => {});
    apiClient.get<MonthlyRevenue>('/admin/analytics/monthly-revenue').then(setMonthly).catch(() => {});
    apiClient.get<Period[]>('/admin/finance/periods').then(setPeriods).catch(() => setPeriods([]));
    apiClient.get<{ id: string }[]>('/admin/approvals').then((d) => setPendingDorms(d.length)).catch(() => {});
  }, []);

  // ข้อมูลการเงินตามเดือนที่เลือก
  useEffect(() => {
    const qs = `?year=${sel.year}&month=${sel.month}`;
    apiClient.get<FinanceSummary>(`/admin/finance/summary${qs}`).then(setFin).catch(() => setFin(null));
    apiClient.get<PaymentRow[]>(`/admin/finance/payments${qs}`).then(setPayments).catch(() => setPayments([]));
  }, [sel]);

  const monthLabel = `${lang === 'th' ? MONTH_TH_FULL[sel.month - 1] : MONTH_EN[sel.month - 1]} ${sel.year}`;

  // KPI trend: เทียบรายได้ platform เดือนนี้ vs เดือนก่อน (จากกราฟ commission — ประมาณ)
  const monthsData = monthly?.months ?? [];
  const revThis = monthsData[sel.month - 1] ?? 0;
  const revPrev = sel.month > 1 ? monthsData[sel.month - 2] ?? 0 : 0;
  const momDelta = revPrev > 0 ? ((revThis - revPrev) / revPrev) * 100 : null;

  // รวม payment เป็นรายหอ สำหรับตาราง payout
  const payoutRows = useMemo(() => {
    const map = new Map<string, { dorm: string; gross: number; commission: number; payout: number; transferred: boolean }>();
    for (const p of payments) {
      const g = map.get(p.dormName) ?? { dorm: p.dormName, gross: 0, commission: 0, payout: 0, transferred: true };
      g.gross += p.amount;
      g.commission += p.commission;
      g.payout += p.ownerPayout;
      if (p.status !== 'TRANSFERRED') g.transferred = false; // มีตัวใดยังไม่โอน = รอโอน
      map.set(p.dormName, g);
    }
    return [...map.values()].sort((a, b) => b.gross - a.gross);
  }, [payments]);
  const payTotal = payoutRows.reduce(
    (acc, r) => ({ gross: acc.gross + r.gross, commission: acc.commission + r.commission, payout: acc.payout + r.payout }),
    { gross: 0, commission: 0, payout: 0 },
  );

  const platformShare = fin?.totalPlatformShare ?? 0;
  const chamberShare = fin?.totalChamberShare ?? 0;
  const srcTotal = platformShare + chamberShare;
  const pct = (v: number) => (srcTotal > 0 ? Math.round((v / srcTotal) * 100) : 0);

  const baht = (n: number) => `฿${Math.round(n).toLocaleString()}`;

  function exportCsv() {
    const header = [t.colItem, 'gross', 'commission', 'payout', t.colStatus];
    const rows = payoutRows.map((r) => [r.dorm, r.gross, r.commission, r.payout, r.transferred ? t.stTransferred : t.stWaiting]);
    rows.push([t.totalAll, payTotal.gross, payTotal.commission, payTotal.payout, '']);
    const csv = [header, ...rows].map((row) => row.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const url = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `hopak-report-${sel.year}-${sel.month}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div>
      {/* topbar */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-[26px] font-bold tracking-tight text-ink-strong">{t.title}</h1>
          <p className="mt-1 text-[13.5px] text-ink-muted">{t.sub(monthLabel)}</p>
        </div>
        <div className="flex items-center gap-2.5 print:hidden">
          <select
            value={`${sel.year}-${sel.month}`}
            onChange={(e) => {
              const [y, m] = e.target.value.split('-').map(Number);
              setSel({ year: y, month: m });
            }}
            className="h-[42px] rounded-[11px] border border-card-border bg-white px-3.5 text-sm font-semibold text-[#3A3F49] outline-none"
          >
            <option value={`${now.getFullYear()}-${now.getMonth() + 1}`}>
              {(lang === 'th' ? MONTH_TH_FULL : MONTH_EN)[now.getMonth()]} {now.getFullYear()}
            </option>
            {periods
              .filter((p) => !(p.year === now.getFullYear() && p.month === now.getMonth() + 1))
              .map((p) => (
                <option key={`${p.year}-${p.month}`} value={`${p.year}-${p.month}`}>
                  {(lang === 'th' ? MONTH_TH_FULL : MONTH_EN)[p.month - 1]} {p.year}
                </option>
              ))}
          </select>
          <button
            onClick={() => window.print()}
            className="flex h-[42px] items-center gap-2 rounded-[11px] bg-gradient-to-br from-tenant to-tenant-dark px-[18px] text-sm font-bold text-white shadow-[0_8px_18px_rgba(47,111,224,0.28)] hover:brightness-105"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M12 3v12m0 0l-4-4m4 4l4-4M4 17v2a2 2 0 002 2h12a2 2 0 002-2v-2" stroke="#fff" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            {t.exportReport}
          </button>
        </div>
      </div>

      {/* KPI row */}
      <div className="mt-[18px] grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiTile bg="#E9F7EF" label={t.kRevenue} value={baht(platformShare)}
          icon={<path d="M4 18l5-5 3 3 8-8" stroke="#12A150" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />}
          trend={momDelta != null ? { pct: momDelta, fg: momDelta >= 0 ? '#12813F' : '#C0392B', bg: momDelta >= 0 ? '#E9F7EF' : '#FDECEC' } : undefined}
          trendNote={t.vsLast}
        />
        <KpiTile bg="#EAF1FD" label={t.kBookings} value={(summary?.totalBookings ?? 0).toLocaleString()}
          icon={<path d="M6 4h12v16l-6-3-6 3V4z" stroke="#2F6FE0" strokeWidth="1.9" strokeLinejoin="round" />}
        />
        <KpiTile bg="#F3ECFB" label={t.kDorms} value={(summary?.totalDorms ?? 0).toLocaleString()}
          icon={<><path d="M4 20V9l8-5 8 5v11" stroke="#6D5AE0" strokeWidth="1.9" strokeLinejoin="round" /><path d="M9 20v-6h6v6" stroke="#6D5AE0" strokeWidth="1.9" /></>}
          badge={pendingDorms > 0 ? { text: t.pendingApprove(pendingDorms), fg: '#B4791A', bg: '#FEF6E7' } : undefined}
        />
        <KpiTile bg="#FEF6E7" label={t.kUsers} value={(summary?.totalUsers ?? 0).toLocaleString()}
          icon={<><circle cx="9" cy="8" r="3" stroke="#E0902F" strokeWidth="1.9" /><path d="M3 20v-1a5 5 0 015-5h2a5 5 0 015 5v1M16 11a3 3 0 000-6" stroke="#E0902F" strokeWidth="1.9" strokeLinecap="round" /></>}
        />
      </div>

      {/* chart + sources */}
      <div className="mt-[18px] grid grid-cols-1 gap-4 lg:grid-cols-[1.7fr_1fr]">
        <div className="rounded-[18px] border border-card-border bg-white p-6 shadow-card">
          <div className="flex items-start justify-between">
            <div>
              <div className="text-[17px] font-bold text-ink-strong">{t.chartTitle}</div>
              <div className="mt-0.5 text-[12.5px] text-ink-muted">{t.chartSub(monthly?.year ?? now.getFullYear())}</div>
            </div>
            <div className="text-right">
              <div className="text-[22px] font-bold tabular-nums text-[#12A150]">{baht(revThis)}</div>
              <div className="text-[12px] text-ink-muted">{t.thisMonth}</div>
            </div>
          </div>
          <div className="mt-3">
            <RevenueChart months={monthsData.length ? monthsData : Array(12).fill(0)} lang={lang} />
          </div>
        </div>

        <div className="rounded-[18px] border border-card-border bg-white p-6 shadow-card">
          <div className="text-[17px] font-bold text-ink-strong">{t.sourcesTitle}</div>
          <div className="mt-4 flex h-[14px] overflow-hidden rounded-pill bg-surface-canvas">
            <span style={{ width: `${pct(platformShare)}%`, background: '#12A150' }} />
            <span style={{ width: `${pct(chamberShare)}%`, background: '#E0902F' }} />
          </div>
          <div className="mt-4 flex flex-col gap-3">
            {[
              { c: '#12A150', label: t.srcPlatform, v: platformShare },
              { c: '#E0902F', label: t.srcChamber, v: chamberShare },
            ].map((s) => (
              <div key={s.label} className="flex items-center gap-2.5">
                <span className="h-[11px] w-[11px] shrink-0 rounded-[3px]" style={{ background: s.c }} />
                <span className="flex-1 text-[13.5px] text-ink-body">{s.label}</span>
                <span className="text-[14px] font-bold tabular-nums text-ink-strong">{baht(s.v)}</span>
              </div>
            ))}
          </div>
          <div className="mt-4 flex items-center justify-between border-t border-[#EFF1F4] pt-3.5">
            <span className="text-[14px] font-bold text-ink-strong">{t.totalRevMonth}</span>
            <span className="text-[19px] font-bold tabular-nums text-[#12A150]">{baht(srcTotal)}</span>
          </div>
        </div>
      </div>

      {/* monthly report summary */}
      <div className="mt-[18px] rounded-[18px] border border-card-border bg-white p-6 shadow-card">
        <div className="flex flex-wrap items-center gap-3">
          <span className="flex h-[42px] w-[42px] items-center justify-center rounded-[12px] bg-[#EAF1FD]">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <path d="M7 3h7l5 5v13H7z" stroke="#2F6FE0" strokeWidth="1.8" strokeLinejoin="round" />
              <path d="M14 3v5h5M9 13h6M9 17h6" stroke="#2F6FE0" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </span>
          <div className="flex-1">
            <div className="text-[18px] font-bold text-ink-strong">{t.reportTitle(monthLabel)}</div>
            <div className="text-[12.5px] text-ink-muted">{t.reportSub}</div>
          </div>
          <div className="flex gap-2 print:hidden">
            <button onClick={exportCsv} className="flex h-[38px] items-center gap-1.5 rounded-[10px] border border-card-border bg-white px-3.5 text-[13.5px] font-semibold text-[#3A3F49] hover:bg-surface-canvas">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><rect x="4" y="4" width="16" height="16" rx="2" stroke="#12A150" strokeWidth="1.8" /><path d="M9 9v6M12 9v6M15 9v6" stroke="#12A150" strokeWidth="1.8" strokeLinecap="round" /></svg>
              {t.exportCsv}
            </button>
            <button onClick={() => window.print()} className="flex h-[38px] items-center gap-1.5 rounded-[10px] bg-[#111827] px-3.5 text-[13.5px] font-semibold text-white hover:opacity-90">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M12 3v12m0 0l-4-4m4 4l4-4M4 17v2a2 2 0 002 2h12a2 2 0 002-2v-2" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
              PDF
            </button>
          </div>
        </div>

        {/* stat strip */}
        <div className="mt-5 grid grid-cols-2 overflow-hidden rounded-[14px] border border-[#EEF1F4] xl:grid-cols-4">
          <Stat label={t.stBookingsOk} value={(fin?.count ?? 0).toLocaleString()} color="#111827" note={t.itemsNote(fin?.count ?? 0)} />
          <Stat label={t.stPending} value={baht(fin?.totalPending ?? 0)} color="#B4791A" note={t.itemsNote(payoutRows.filter((r) => !r.transferred).length)} />
          <Stat label={t.stTransferred} value={baht(fin?.totalTransferred ?? 0)} color="#12A150" note={t.thisMonthNote} />
          <Stat label={t.kRevenue} value={baht(platformShare)} color="#2F6FE0" note={t.thisMonthNote} last />
        </div>

        {/* payout table */}
        <div className="mt-5 overflow-hidden rounded-[14px] border border-[#EEF1F4]">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px] text-left text-[13.5px]">
              <thead>
                <tr className="bg-[#F8F9FB] text-[12.5px] font-semibold text-ink-muted">
                  <th className="px-5 py-3 font-semibold">{t.colItem}</th>
                  <th className="px-5 py-3 text-right font-semibold">{t.colGross}</th>
                  <th className="px-5 py-3 text-right font-semibold">{t.colComm}</th>
                  <th className="px-5 py-3 text-right font-semibold">{t.colPayout}</th>
                  <th className="px-5 py-3 font-semibold">{t.colStatus}</th>
                </tr>
              </thead>
              <tbody>
                {payoutRows.map((r) => (
                  <tr key={r.dorm} className="border-t border-[#F1F3F6]">
                    <td className="px-5 py-3.5 font-medium text-ink-strong">{r.dorm}</td>
                    <td className="px-5 py-3.5 text-right tabular-nums text-ink-body">{baht(r.gross)}</td>
                    <td className="px-5 py-3.5 text-right font-semibold tabular-nums text-[#12A150]">{baht(r.commission)}</td>
                    <td className="px-5 py-3.5 text-right font-semibold tabular-nums text-ink-strong">{baht(r.payout)}</td>
                    <td className="px-5 py-3.5">
                      <span
                        className="rounded-pill px-2.5 py-1 text-[11.5px] font-semibold"
                        style={r.transferred ? { color: '#12813F', background: '#E9F7EF' } : { color: '#B4791A', background: '#FEF6E7' }}
                      >
                        {r.transferred ? t.stTransferred : t.stWaiting}
                      </span>
                    </td>
                  </tr>
                ))}
                {payoutRows.length > 0 && (
                  <tr className="border-t-2 border-[#E7EAEF] bg-[#FAFBFC] font-bold">
                    <td className="px-5 py-4 text-ink-strong">{t.totalAll}</td>
                    <td className="px-5 py-4 text-right tabular-nums">{baht(payTotal.gross)}</td>
                    <td className="px-5 py-4 text-right tabular-nums text-[#12A150]">{baht(payTotal.commission)}</td>
                    <td className="px-5 py-4 text-right tabular-nums">{baht(payTotal.payout)}</td>
                    <td className="px-5 py-4" />
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          {payoutRows.length === 0 && <p className="p-5 text-ink-faint">{t.noData}</p>}
        </div>
      </div>
    </div>
  );
}

function KpiTile({
  bg,
  label,
  value,
  icon,
  trend,
  trendNote,
  badge,
}: {
  bg: string;
  label: string;
  value: string;
  icon: React.ReactNode;
  trend?: { pct: number; fg: string; bg: string };
  trendNote?: string;
  badge?: { text: string; fg: string; bg: string };
}) {
  return (
    <div className="rounded-[18px] border border-card-border bg-white p-5 shadow-card">
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-[12px]" style={{ background: bg }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">{icon}</svg>
        </span>
        <span className="text-[13.5px] text-ink-muted">{label}</span>
      </div>
      <div className="mt-3.5 text-[30px] font-bold leading-none tracking-tight text-ink-strong tabular-nums">{value}</div>
      <div className="mt-2.5 flex items-center gap-1.5">
        {trend && (
          <span className="inline-flex items-center gap-1 rounded-pill px-2 py-0.5 text-[12.5px] font-bold" style={{ color: trend.fg, background: trend.bg }}>
            {trend.pct >= 0 ? '▲' : '▼'} {Math.abs(trend.pct).toFixed(1)}%
          </span>
        )}
        {trend && trendNote && <span className="text-[12px] text-ink-faint">{trendNote}</span>}
        {badge && (
          <span className="inline-flex items-center rounded-pill px-2.5 py-0.5 text-[12px] font-semibold" style={{ color: badge.fg, background: badge.bg }}>
            {badge.text}
          </span>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value, color, note, last }: { label: string; value: string; color: string; note: string; last?: boolean }) {
  return (
    <div className={`px-5 py-[18px] ${last ? '' : 'border-[#EEF1F4] xl:border-r'}`}>
      <div className="text-[13px] text-ink-muted">{label}</div>
      <div className="mt-1 text-[23px] font-bold tabular-nums" style={{ color }}>{value}</div>
      <div className="mt-0.5 text-[12px] text-ink-faint">{note}</div>
    </div>
  );
}
