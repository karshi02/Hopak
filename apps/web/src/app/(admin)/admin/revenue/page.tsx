'use client';

import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api-client';
import { useLang } from '@/hooks/useLang';
import { downloadCsv } from '@/lib/csv';
import { PageLoader } from '@/components/PageLoader';

type Period = 'day' | 'month' | 'year';

interface Row {
  key: string;
  monthlyCommission: number;
  dailyCommission: number;
  monthlyGross: number;
  dailyGross: number;
}
interface Breakdown {
  period: Period;
  year: number;
  rows: Row[];
  totals: { monthlyCommission: number; dailyCommission: number; monthlyGross: number; dailyGross: number };
}

const MONTH_TH = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
const MONTH_EN = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// รายเดือน = น้ำเงิน, รายวัน = เขียว (โทนเดียวกับทั้งระบบ)
const MONTHLY = '#2F6FE0';
const DAILY = '#12A150';

const TEXT = {
  th: {
    title: 'รายได้แพลตฟอร์ม (แยกรายเดือน / รายวัน)',
    sub: 'ค่าคอมที่ Hoprak ได้รับ — รายเดือนหัก 20% จากค่าห้อง · รายวันหัก 10% จากยอดเต็ม',
    periodDay: 'รายวัน (30 วันล่าสุด)',
    periodMonth: 'รายเดือน',
    periodYear: 'รายปี',
    exportCsv: 'Export CSV',
    kpiTotal: 'รายได้แพลตฟอร์มรวม',
    kpiMonthly: 'จากหอรายเดือน',
    kpiDaily: 'จากหอรายวัน',
    kpiGross: 'ยอดรับรวมทั้งระบบ',
    share: 'สัดส่วน',
    thPeriod: 'ช่วงเวลา',
    thMonthlyGross: 'ยอดรับ (รายเดือน)',
    thMonthlyComm: 'คอมรายเดือน 20%',
    thDailyGross: 'ยอดรับ (รายวัน)',
    thDailyComm: 'คอมรายวัน 10%',
    thTotal: 'รวมรายได้แพลตฟอร์ม',
    total: 'รวม',
    none: 'ยังไม่มีข้อมูลในช่วงนี้',
    csvFile: 'รายได้แพลตฟอร์ม',
  },
  en: {
    title: 'Platform revenue (monthly vs daily)',
    sub: 'Commission Hoprak earns — monthly 20% of room rent · daily 10% of total',
    periodDay: 'Daily (last 30 days)',
    periodMonth: 'Monthly',
    periodYear: 'Yearly',
    exportCsv: 'Export CSV',
    kpiTotal: 'Total platform revenue',
    kpiMonthly: 'From monthly dorms',
    kpiDaily: 'From daily dorms',
    kpiGross: 'Gross received',
    share: 'Share',
    thPeriod: 'Period',
    thMonthlyGross: 'Gross (monthly)',
    thMonthlyComm: 'Monthly comm 20%',
    thDailyGross: 'Gross (daily)',
    thDailyComm: 'Daily comm 10%',
    thTotal: 'Platform total',
    total: 'Total',
    none: 'No data in this range',
    csvFile: 'platform-revenue',
  },
};

export default function AdminRevenuePage() {
  const { lang } = useLang();
  const t = TEXT[lang];
  const months = lang === 'th' ? MONTH_TH : MONTH_EN;
  const [period, setPeriod] = useState<Period>('month');
  const [data, setData] = useState<Breakdown | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    apiClient
      .get<Breakdown>(`/admin/finance/revenue-breakdown?period=${period}`)
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [period]);

  const baht = (n: number) => `฿${Math.round(n).toLocaleString()}`;
  const label = (key: string) => (period === 'month' ? months[Number(key) - 1] ?? key : key);

  if (loading) return <PageLoader />;
  if (!data) return <p className="text-ink-faint">—</p>;

  const totalCommission = data.totals.monthlyCommission + data.totals.dailyCommission;
  const totalGross = data.totals.monthlyGross + data.totals.dailyGross;
  const dailyShare = totalCommission > 0 ? (data.totals.dailyCommission / totalCommission) * 100 : 0;
  const maxRow = Math.max(1, ...data.rows.map((r) => r.monthlyCommission + r.dailyCommission));

  function exportCsv() {
    if (!data) return;
    downloadCsv(
      `${t.csvFile}-${period}`,
      [t.thPeriod, t.thMonthlyGross, t.thMonthlyComm, t.thDailyGross, t.thDailyComm, t.thTotal],
      [
        ...data.rows.map((r) => [
          label(r.key),
          Math.round(r.monthlyGross),
          Math.round(r.monthlyCommission),
          Math.round(r.dailyGross),
          Math.round(r.dailyCommission),
          Math.round(r.monthlyCommission + r.dailyCommission),
        ]),
        [
          t.total,
          Math.round(data.totals.monthlyGross),
          Math.round(data.totals.monthlyCommission),
          Math.round(data.totals.dailyGross),
          Math.round(data.totals.dailyCommission),
          Math.round(totalCommission),
        ],
      ],
    );
  }

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-[22px] font-bold tracking-tight text-ink-strong sm:text-[26px]">{t.title}</h1>
          <p className="mt-1 text-[13px] text-ink-muted">{t.sub}</p>
        </div>
        <button
          onClick={exportCsv}
          className="h-[38px] rounded-[10px] border border-card-border bg-white px-4 text-sm font-semibold text-ink-body hover:bg-surface-canvas"
        >
          {t.exportCsv}
        </button>
      </div>

      {/* ช่วงเวลา */}
      <div className="mt-4 inline-flex flex-wrap items-center gap-1 rounded-pill border border-card-border bg-surface-canvas p-1">
        {(
          [
            ['day', t.periodDay],
            ['month', t.periodMonth],
            ['year', t.periodYear],
          ] as const
        ).map(([key, text]) => (
          <button
            key={key}
            type="button"
            onClick={() => setPeriod(key)}
            className={`rounded-pill px-3.5 py-1.5 text-[12.5px] font-semibold transition ${
              period === key ? 'bg-admin text-white' : 'text-ink-muted hover:bg-white'
            }`}
          >
            {text}
          </button>
        ))}
      </div>

      {/* KPI */}
      <div className="mt-[18px] grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {(
          [
            [t.kpiTotal, baht(totalCommission), '#6D5AE0', '#EEECFB'],
            [t.kpiMonthly, baht(data.totals.monthlyCommission), MONTHLY, '#EAF1FD'],
            [t.kpiDaily, baht(data.totals.dailyCommission), DAILY, '#E7F7EF'],
            [t.kpiGross, baht(totalGross), '#111827', '#F1F3F6'],
          ] as const
        ).map(([title, value, color, bg]) => (
          <div key={title} className="rounded-[16px] border border-card-border bg-white p-4 shadow-card sm:p-5">
            <div className="text-[12.5px] text-ink-muted">{title}</div>
            <div className="mt-1.5 text-[26px] font-bold leading-none tracking-tight tabular-nums" style={{ color }}>
              {value}
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-pill" style={{ background: bg }} />
          </div>
        ))}
      </div>

      {/* สัดส่วนรายเดือน vs รายวัน */}
      <div className="mt-[18px] rounded-[16px] border border-card-border bg-white p-4 shadow-card sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="text-[15px] font-bold text-ink-strong">{t.share}</div>
          <div className="flex flex-wrap items-center gap-4 text-[12.5px] text-ink-body">
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-sm" style={{ background: MONTHLY }} />
              {t.kpiMonthly} {(100 - dailyShare).toFixed(0)}%
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-sm" style={{ background: DAILY }} />
              {t.kpiDaily} {dailyShare.toFixed(0)}%
            </span>
          </div>
        </div>
        <div className="mt-3 flex h-4 overflow-hidden rounded-pill bg-[#F1F3F6]">
          <span style={{ width: `${100 - dailyShare}%`, background: MONTHLY }} />
          <span style={{ width: `${dailyShare}%`, background: DAILY }} />
        </div>

        {/* แท่งซ้อนต่อช่วงเวลา */}
        <div className="mt-5 flex h-[150px] items-end gap-1.5">
          {data.rows.map((r) => {
            const total = r.monthlyCommission + r.dailyCommission;
            const h = (total / maxRow) * 100;
            const dailyPart = total > 0 ? (r.dailyCommission / total) * 100 : 0;
            return (
              <div key={r.key} className="flex min-w-0 flex-1 flex-col items-center gap-1">
                <div className="flex w-full flex-col justify-end" style={{ height: `${Math.max(2, h)}%` }}>
                  <span
                    className="w-full rounded-t-[4px]"
                    style={{ height: `${100 - dailyPart}%`, background: MONTHLY }}
                    title={`${label(r.key)} · ${t.kpiMonthly} ${baht(r.monthlyCommission)}`}
                  />
                  <span
                    style={{ height: `${dailyPart}%`, background: DAILY }}
                    title={`${label(r.key)} · ${t.kpiDaily} ${baht(r.dailyCommission)}`}
                  />
                </div>
                <span className="truncate text-[9.5px] text-ink-faint">{label(r.key)}</span>
              </div>
            );
          })}
          {data.rows.length === 0 && <p className="text-ink-faint">{t.none}</p>}
        </div>
      </div>

      {/* ตาราง */}
      <div className="mt-[18px] rounded-[16px] border border-card-border bg-white p-4 shadow-card sm:p-5">
        <div className="hidden overflow-hidden rounded-[12px] border border-card-border md:block">
          <table className="w-full table-fixed text-left text-[13px]">
            <colgroup>
              <col className="w-[16%]" />
              <col className="w-[17%]" />
              <col className="w-[17%]" />
              <col className="w-[17%]" />
              <col className="w-[17%]" />
              <col className="w-[16%]" />
            </colgroup>
            <thead>
              <tr className="border-b border-card-border bg-[#FAFBFD] text-[11.5px] font-semibold text-ink-faint">
                <th className="px-4 py-2.5">{t.thPeriod}</th>
                <th className="px-4 py-2.5 text-right">{t.thMonthlyGross}</th>
                <th className="px-4 py-2.5 text-right">{t.thMonthlyComm}</th>
                <th className="px-4 py-2.5 text-right">{t.thDailyGross}</th>
                <th className="px-4 py-2.5 text-right">{t.thDailyComm}</th>
                <th className="px-4 py-2.5 text-right">{t.thTotal}</th>
              </tr>
            </thead>
            <tbody>
              {data.rows.map((r) => (
                <tr key={r.key} className="border-b border-hairline last:border-0">
                  <td className="px-4 py-2.5 font-medium text-ink-strong">{label(r.key)}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums text-ink-subtitle">{baht(r.monthlyGross)}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums" style={{ color: MONTHLY }}>
                    {baht(r.monthlyCommission)}
                  </td>
                  <td className="px-4 py-2.5 text-right tabular-nums text-ink-subtitle">{baht(r.dailyGross)}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums" style={{ color: DAILY }}>
                    {baht(r.dailyCommission)}
                  </td>
                  <td className="px-4 py-2.5 text-right font-bold tabular-nums text-ink-strong">
                    {baht(r.monthlyCommission + r.dailyCommission)}
                  </td>
                </tr>
              ))}
              {data.rows.length > 0 && (
                <tr className="border-t-2 border-[#E7EAEF] bg-[#FAFBFC] text-[13.5px] font-bold">
                  <td className="px-4 py-3 text-ink-strong">{t.total}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-ink-strong">{baht(data.totals.monthlyGross)}</td>
                  <td className="px-4 py-3 text-right tabular-nums" style={{ color: MONTHLY }}>
                    {baht(data.totals.monthlyCommission)}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-ink-strong">{baht(data.totals.dailyGross)}</td>
                  <td className="px-4 py-3 text-right tabular-nums" style={{ color: DAILY }}>
                    {baht(data.totals.dailyCommission)}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-ink-strong">{baht(totalCommission)}</td>
                </tr>
              )}
            </tbody>
          </table>
          {data.rows.length === 0 && <p className="p-5 text-ink-faint">{t.none}</p>}
        </div>

        {/* มือถือ */}
        <div className="flex flex-col gap-2.5 md:hidden">
          {data.rows.map((r) => (
            <div key={r.key} className="rounded-[12px] border border-card-border p-3.5">
              <div className="flex items-center justify-between gap-2">
                <span className="font-semibold text-ink-strong">{label(r.key)}</span>
                <span className="font-sans text-[14px] font-bold tabular-nums text-ink-strong">
                  {baht(r.monthlyCommission + r.dailyCommission)}
                </span>
              </div>
              <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 rounded-[10px] bg-surface-canvas px-3 py-2 text-[12.5px]">
                <dt className="text-ink-muted">{t.thMonthlyComm}</dt>
                <dd className="text-right tabular-nums" style={{ color: MONTHLY }}>
                  {baht(r.monthlyCommission)}
                </dd>
                <dt className="text-ink-muted">{t.thDailyComm}</dt>
                <dd className="text-right tabular-nums" style={{ color: DAILY }}>
                  {baht(r.dailyCommission)}
                </dd>
              </dl>
            </div>
          ))}
          {data.rows.length === 0 && <p className="text-ink-faint">{t.none}</p>}
        </div>
      </div>
    </div>
  );
}
