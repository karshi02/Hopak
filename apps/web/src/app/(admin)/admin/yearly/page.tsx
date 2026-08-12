'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiClient } from '@/lib/api-client';
import { useLang } from '@/hooks/useLang';
import { downloadCsv } from '@/lib/csv';
import { PageLoader } from '@/components/PageLoader';
import { YearlyRevenueChart } from '@/components/admin/YearlyRevenueChart';

interface MonthRow {
  month: number;
  gross: number;
  commission: number;
  ownerPayout: number;
  bookings: number;
}
interface OwnerRow {
  ownerId: string;
  name: string;
  email: string | null;
  phone: string | null;
  suspended: boolean;
  dormCount: number;
  gross: number;
  payout: number;
  transferred: number;
  pending: number;
}
interface YearlySummary {
  year: number;
  years: number[];
  months: MonthRow[];
  totals: {
    gross: number;
    commission: number;
    ownerPayout: number;
    bookings: number;
    transferredOut: number;
    balance: number;
  };
  members: { total: number; newThisYear: number; tenants: number; owners: number; admins: number; suspended: number };
  owners: OwnerRow[];
  dorms: { total: number; approved: number; suspended: number; rejected: number };
}

const MONTH_TH = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
const MONTH_EN = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const TEXT = {
  th: {
    title: 'สรุปรายปี',
    sub: (y: number) => `ภาพรวมทั้งระบบ ปี ${y}`,
    yearLabel: 'ปี',
    exportCsv: 'Export CSV',
    kpiGross: 'ยอดรับรวมทั้งปี',
    kpiGrossSub: 'เงินที่ผู้เช่าจ่ายเข้าระบบ',
    kpiComm: 'ค่าคอมมิชชัน 20%',
    kpiCommSub: 'รายได้ของแพลตฟอร์ม',
    kpiOut: 'เงินที่โอนออกให้เจ้าของหอ',
    kpiOutSub: 'ยอดที่จ่ายออกจริงในปีนี้',
    kpiBalance: 'ยอดคงเหลือในบัญชีกลาง',
    kpiBalanceSub: 'เงินเข้า − เงินโอนออก (ปีนี้)',
    membersTitle: 'สมาชิก',
    mTotal: 'สมาชิกทั้งหมด',
    mNew: 'สมัครใหม่ปีนี้',
    mTenant: 'ผู้เช่า',
    mOwner: 'เจ้าของหอ',
    mAdmin: 'แอดมิน',
    mSuspended: 'ถูกระงับ',
    dormsTitle: 'หอพัก',
    dTotal: 'ทั้งหมด',
    dApproved: 'อนุมัติแล้ว',
    dSuspended: 'ระงับ',
    dRejected: 'ปฏิเสธ',
    monthTitle: 'รายได้รายเดือน',
    thMonth: 'เดือน',
    thBookings: 'จอง',
    thGross: 'ยอดรับ',
    thComm: 'คอม 20%',
    thPayout: 'ยอดเจ้าของหอ',
    ownersTitle: 'เจ้าของหอ (ยอดปีนี้)',
    thOwner: 'เจ้าของ',
    thContact: 'ติดต่อ',
    thDorms: 'จำนวนหอ',
    thTransferred: 'โอนแล้ว',
    thPending: 'รอโอน',
    thStatus: 'สถานะ',
    active: 'ปกติ',
    suspended: 'ระงับ',
    noOwners: 'ยังไม่มีรายได้จากเจ้าของหอในปีนี้',
    total: 'รวมทั้งปี',
    backToFinance: 'ไปหน้าการเงิน & รวมบิล →',
    csvFile: 'สรุปรายปี',
  },
  en: {
    title: 'Yearly Summary',
    sub: (y: number) => `System-wide overview for ${y}`,
    yearLabel: 'Year',
    exportCsv: 'Export CSV',
    kpiGross: 'Gross received this year',
    kpiGrossSub: 'Paid in by tenants',
    kpiComm: 'Commission 20%',
    kpiCommSub: 'Platform revenue',
    kpiOut: 'Transferred to owners',
    kpiOutSub: 'Actually paid out this year',
    kpiBalance: 'Central account balance',
    kpiBalanceSub: 'In − out (this year)',
    membersTitle: 'Members',
    mTotal: 'Total members',
    mNew: 'New this year',
    mTenant: 'Tenants',
    mOwner: 'Owners',
    mAdmin: 'Admins',
    mSuspended: 'Suspended',
    dormsTitle: 'Dorms',
    dTotal: 'Total',
    dApproved: 'Approved',
    dSuspended: 'Suspended',
    dRejected: 'Rejected',
    monthTitle: 'Revenue by month',
    thMonth: 'Month',
    thBookings: 'Bookings',
    thGross: 'Gross',
    thComm: 'Comm 20%',
    thPayout: 'Owner payout',
    ownersTitle: 'Owners (this year)',
    thOwner: 'Owner',
    thContact: 'Contact',
    thDorms: 'Dorms',
    thTransferred: 'Transferred',
    thPending: 'Pending',
    thStatus: 'Status',
    active: 'Active',
    suspended: 'Suspended',
    noOwners: 'No owner revenue this year',
    total: 'Year total',
    backToFinance: 'Go to Finance & Payouts →',
    csvFile: 'yearly-summary',
  },
};

export default function AdminYearlyPage() {
  const { lang } = useLang();
  const t = TEXT[lang];
  const months = lang === 'th' ? MONTH_TH : MONTH_EN;
  const [year, setYear] = useState(new Date().getFullYear());
  const [data, setData] = useState<YearlySummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    apiClient
      .get<YearlySummary>(`/admin/finance/yearly?year=${year}`)
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [year]);

  const baht = (n: number) => `฿${Math.round(n).toLocaleString()}`;

  function exportCsv() {
    if (!data) return;
    downloadCsv(
      `${t.csvFile}-${data.year}`,
      [t.thMonth, t.thBookings, t.thGross, t.thComm, t.thPayout],
      [
        ...data.months.map((m) => [
          months[m.month - 1],
          m.bookings,
          Math.round(m.gross),
          Math.round(m.commission),
          Math.round(m.ownerPayout),
        ]),
        [
          t.total,
          data.totals.bookings,
          Math.round(data.totals.gross),
          Math.round(data.totals.commission),
          Math.round(data.totals.ownerPayout),
        ],
      ],
    );
  }

  if (loading) return <PageLoader />;
  if (!data) return <p className="text-ink-faint">—</p>;


  const KPIS = [
    { label: t.kpiGross, sub: t.kpiGrossSub, value: baht(data.totals.gross), color: '#111827', bg: '#F1F3F6' },
    { label: t.kpiComm, sub: t.kpiCommSub, value: baht(data.totals.commission), color: '#6D5AE0', bg: '#EEECFB' },
    { label: t.kpiOut, sub: t.kpiOutSub, value: baht(data.totals.transferredOut), color: '#12813F', bg: '#E9F7EF' },
    { label: t.kpiBalance, sub: t.kpiBalanceSub, value: baht(data.totals.balance), color: '#B4791A', bg: '#FEF3E2' },
  ];

  return (
    <div>
      {/* header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-[24px] font-bold tracking-tight text-ink-strong sm:text-[26px]">{t.title}</h1>
          <p className="mt-1 text-[13.5px] text-ink-muted">{t.sub(data.year)}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <label className="flex items-center gap-2 text-sm text-ink-subtitle">
            {t.yearLabel}
            <select
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              className="h-[38px] rounded-[10px] border border-card-border bg-white px-3 text-sm font-semibold text-ink-strong outline-none"
            >
              {data.years.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </label>
          <button
            onClick={exportCsv}
            className="h-[38px] rounded-[10px] border border-card-border bg-white px-4 text-sm font-semibold text-ink-body hover:bg-surface-canvas"
          >
            {t.exportCsv}
          </button>
        </div>
      </div>

      {/* KPI */}
      <div className="mt-[18px] grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {KPIS.map((k) => (
          <div key={k.label} className="rounded-[16px] border border-card-border bg-white p-4 shadow-card sm:p-5">
            <div className="text-[12.5px] text-ink-muted">{k.label}</div>
            <div className="mt-1.5 text-[26px] font-bold leading-none tracking-tight tabular-nums" style={{ color: k.color }}>
              {k.value}
            </div>
            <div className="mt-1.5 inline-block rounded-pill px-2 py-0.5 text-[11.5px]" style={{ background: k.bg, color: k.color }}>
              {k.sub}
            </div>
          </div>
        ))}
      </div>

      {/* members + dorms */}
      <div className="mt-[18px] grid grid-cols-1 gap-3 lg:grid-cols-2">
        <div className="rounded-[16px] border border-card-border bg-white p-4 shadow-card sm:p-5">
          <div className="text-[16px] font-bold text-ink-strong">{t.membersTitle}</div>
          <div className="mt-3 grid grid-cols-2 gap-2.5 sm:grid-cols-3">
            {(
              [
                [t.mTotal, data.members.total, '#111827'],
                [t.mNew, data.members.newThisYear, '#6D5AE0'],
                [t.mTenant, data.members.tenants, '#2456B8'],
                [t.mOwner, data.members.owners, '#B4791A'],
                [t.mAdmin, data.members.admins, '#12813F'],
                [t.mSuspended, data.members.suspended, '#C0392B'],
              ] as const
            ).map(([label, value, color]) => (
              <div key={label} className="rounded-[11px] bg-surface-canvas px-3 py-2.5">
                <div className="text-[11.5px] text-ink-muted">{label}</div>
                <div className="mt-0.5 font-sans text-[20px] font-bold tabular-nums" style={{ color }}>
                  {value}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-[16px] border border-card-border bg-white p-4 shadow-card sm:p-5">
          <div className="flex items-center justify-between gap-2">
            <div className="text-[16px] font-bold text-ink-strong">{t.dormsTitle}</div>
            <Link href="/admin/finance" className="text-[12.5px] font-semibold text-admin hover:underline">
              {t.backToFinance}
            </Link>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
            {(
              [
                [t.dTotal, data.dorms.total, '#111827'],
                [t.dApproved, data.dorms.approved, '#12813F'],
                [t.dSuspended, data.dorms.suspended, '#C0392B'],
                [t.dRejected, data.dorms.rejected, '#B4791A'],
              ] as const
            ).map(([label, value, color]) => (
              <div key={label} className="rounded-[11px] bg-surface-canvas px-3 py-2.5">
                <div className="text-[11.5px] text-ink-muted">{label}</div>
                <div className="mt-0.5 font-sans text-[20px] font-bold tabular-nums" style={{ color }}>
                  {value}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* รายเดือน */}
      <div className="mt-[18px] rounded-[16px] border border-card-border bg-white p-4 shadow-card sm:p-5">
        <div className="text-[16px] font-bold text-ink-strong">{t.monthTitle}</div>

        {/* กราฟรายเดือน — สลับรูปแบบได้ (แท่ง / เส้น / พื้นที่ / แยกส่วน) */}
        <div className="mt-4">
          <YearlyRevenueChart
            months={data.months}
            monthLabels={months}
            lang={lang}
            labels={{ gross: t.thGross, payout: t.thPayout, commission: t.thComm }}
          />
        </div>

        {/* ตาราง (จอ md ขึ้นไป) */}
        <div className="mt-4 hidden overflow-hidden rounded-[12px] border border-card-border md:block">
          <table className="w-full table-fixed text-left text-[13px]">
            <colgroup>
              <col className="w-[18%]" />
              <col className="w-[14%]" />
              <col className="w-[23%]" />
              <col className="w-[22%]" />
              <col className="w-[23%]" />
            </colgroup>
            <thead>
              <tr className="border-b border-card-border bg-[#FAFBFD] text-[11.5px] font-semibold text-ink-faint">
                <th className="px-4 py-2.5">{t.thMonth}</th>
                <th className="px-4 py-2.5 text-right">{t.thBookings}</th>
                <th className="px-4 py-2.5 text-right">{t.thGross}</th>
                <th className="px-4 py-2.5 text-right">{t.thComm}</th>
                <th className="px-4 py-2.5 text-right">{t.thPayout}</th>
              </tr>
            </thead>
            <tbody>
              {data.months.map((m) => (
                <tr key={m.month} className="border-b border-hairline last:border-0">
                  <td className="px-4 py-2.5 font-medium text-ink-strong">{months[m.month - 1]}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums text-ink-subtitle">{m.bookings}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums text-ink-strong">{baht(m.gross)}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums text-admin">{baht(m.commission)}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums text-[#12813F]">{baht(m.ownerPayout)}</td>
                </tr>
              ))}
              <tr className="border-t-2 border-[#E7EAEF] bg-[#FAFBFC] text-[13.5px] font-bold">
                <td className="px-4 py-3 text-ink-strong">{t.total}</td>
                <td className="px-4 py-3 text-right tabular-nums text-ink-strong">{data.totals.bookings}</td>
                <td className="px-4 py-3 text-right tabular-nums text-ink-strong">{baht(data.totals.gross)}</td>
                <td className="px-4 py-3 text-right tabular-nums text-admin">{baht(data.totals.commission)}</td>
                <td className="px-4 py-3 text-right tabular-nums text-[#12813F]">{baht(data.totals.ownerPayout)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* มือถือ: เฉพาะเดือนที่มียอด */}
        <div className="mt-4 flex flex-col gap-2 md:hidden">
          {data.months
            .filter((m) => m.bookings > 0)
            .map((m) => (
              <div key={m.month} className="rounded-[11px] border border-hairline p-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold text-ink-strong">{months[m.month - 1]}</span>
                  <span className="font-sans text-[13px] font-bold tabular-nums text-ink-strong">{baht(m.gross)}</span>
                </div>
                <div className="mt-1 flex flex-wrap gap-x-3 text-[12px] text-ink-muted">
                  <span>
                    {t.thBookings} <b className="font-sans tabular-nums">{m.bookings}</b>
                  </span>
                  <span className="text-admin">
                    {t.thComm} {baht(m.commission)}
                  </span>
                  <span className="text-[#12813F]">
                    {t.thPayout} {baht(m.ownerPayout)}
                  </span>
                </div>
              </div>
            ))}
          <div className="flex items-center justify-between rounded-[11px] bg-[#FAFBFC] px-3 py-2.5 text-[13.5px] font-bold">
            <span className="text-ink-strong">{t.total}</span>
            <span className="tabular-nums text-ink-strong">{baht(data.totals.gross)}</span>
          </div>
        </div>
      </div>

      {/* เจ้าของหอ */}
      <div className="mt-[18px] rounded-[16px] border border-card-border bg-white p-4 shadow-card sm:p-5">
        <div className="text-[16px] font-bold text-ink-strong">{t.ownersTitle}</div>

        <div className="mt-3 hidden overflow-hidden rounded-[12px] border border-card-border md:block">
          <table className="w-full table-fixed text-left text-[13px]">
            <colgroup>
              <col className="w-[20%]" />
              <col className="w-[22%]" />
              <col className="w-[9%]" />
              <col className="w-[17%]" />
              <col className="w-[17%]" />
              <col className="w-[15%]" />
            </colgroup>
            <thead>
              <tr className="border-b border-card-border bg-[#FAFBFD] text-[11.5px] font-semibold text-ink-faint">
                <th className="px-4 py-2.5">{t.thOwner}</th>
                <th className="px-4 py-2.5">{t.thContact}</th>
                <th className="px-4 py-2.5 text-right">{t.thDorms}</th>
                <th className="px-4 py-2.5 text-right">{t.thTransferred}</th>
                <th className="px-4 py-2.5 text-right">{t.thPending}</th>
                <th className="px-4 py-2.5">{t.thStatus}</th>
              </tr>
            </thead>
            <tbody>
              {data.owners.map((o) => (
                <tr key={o.ownerId} className="border-b border-hairline last:border-0">
                  <td className="truncate px-4 py-3 font-semibold text-ink-strong" title={o.name}>
                    {o.name}
                  </td>
                  <td className="truncate px-4 py-3 font-sans text-ink-subtitle" title={o.email ?? o.phone ?? ''}>
                    {o.email ?? o.phone ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-ink-subtitle">{o.dormCount}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-[#12813F]">{baht(o.transferred)}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-[#B4791A]">{baht(o.pending)}</td>
                  <td className="px-4 py-3">
                    <span
                      className="rounded-pill px-2.5 py-1 text-[11.5px] font-semibold"
                      style={
                        o.suspended
                          ? { background: '#FDECEC', color: '#C0392B' }
                          : { background: '#E9F7EF', color: '#12813F' }
                      }
                    >
                      {o.suspended ? t.suspended : t.active}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {data.owners.length === 0 && <p className="p-5 text-ink-faint">{t.noOwners}</p>}
        </div>

        {/* มือถือ */}
        <div className="mt-3 flex flex-col gap-2.5 md:hidden">
          {data.owners.map((o) => (
            <div key={o.ownerId} className="rounded-[12px] border border-card-border p-3.5">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="truncate font-semibold text-ink-strong">{o.name}</div>
                  <div className="truncate font-sans text-[12.5px] text-ink-muted">{o.email ?? o.phone ?? '—'}</div>
                </div>
                <span
                  className="shrink-0 rounded-pill px-2.5 py-1 text-[11.5px] font-semibold"
                  style={
                    o.suspended ? { background: '#FDECEC', color: '#C0392B' } : { background: '#E9F7EF', color: '#12813F' }
                  }
                >
                  {o.suspended ? t.suspended : t.active}
                </span>
              </div>
              <dl className="mt-2.5 grid grid-cols-2 gap-x-3 gap-y-1 rounded-[10px] bg-surface-canvas px-3 py-2 text-[12.5px]">
                <dt className="text-ink-muted">{t.thDorms}</dt>
                <dd className="text-right tabular-nums text-ink-body">{o.dormCount}</dd>
                <dt className="text-ink-muted">{t.thTransferred}</dt>
                <dd className="text-right tabular-nums text-[#12813F]">{baht(o.transferred)}</dd>
                <dt className="text-ink-muted">{t.thPending}</dt>
                <dd className="text-right tabular-nums text-[#B4791A]">{baht(o.pending)}</dd>
              </dl>
            </div>
          ))}
          {data.owners.length === 0 && <p className="text-ink-faint">{t.noOwners}</p>}
        </div>
      </div>
    </div>
  );
}
