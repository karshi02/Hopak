'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiClient } from '@/lib/api-client';
import { getSocket } from '@/lib/ws';
import { useLang } from '@/hooks/useLang';
import { KpiCard } from '@/components/admin/KpiCard';
import { RevenueChart } from '@/components/admin/RevenueChart';
import { SplitBar } from '@/components/dashboard/SplitBar';
import { Badge, bookingStatusBadge } from '@/components/dashboard/Badge';
import { normalizeStatus } from '@/lib/normalize';
import type { Booking, Dorm } from '@hopak/shared';

type PendingDorm = Dorm & { owner: { name: string } };
type BookingWithDorm = Booking & { room?: { dorm?: { name?: string } } };

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

const TEXT = {
  th: {
    title: 'แดชบอร์ด',
    thisMonth: 'เดือนนี้',
    revenue: 'รายได้แพลตฟอร์ม',
    revenueSub: 'ค่าคอมมิชชันสะสม · ปี',
    totalBookings: 'การจองทั้งหมด',
    totalDorms: 'หอพักในระบบ',
    totalUsers: 'ผู้ใช้ทั้งหมด',
    vsLastMonth: 'จากเดือนก่อน',
    bookingsByProvince: 'สัดส่วนการจองต่อจังหวัด',
    noData: 'ยังไม่มีข้อมูล',
    recentBookings: 'การจองล่าสุด',
    viewAll: 'ดูทั้งหมด →',
    booker: 'ผู้เช่า',
    dorm: 'หอพัก',
    amount: 'ยอด',
    status: 'สถานะ',
    noBookings: 'ยังไม่มีการจอง',
    pendingApprovals: 'รออนุมัติหอพัก',
    items: (n: number) => `${n} รายการ`,
    viewDocs: 'ดูเอกสาร',
    approve: 'อนุมัติ',
    noPending: 'ไม่มีหอรออนุมัติ',
  },
  en: {
    title: 'Dashboard',
    thisMonth: 'This month',
    revenue: 'Platform revenue',
    revenueSub: 'Cumulative commission ·',
    totalBookings: 'Total bookings',
    totalDorms: 'Dorms in system',
    totalUsers: 'Total users',
    vsLastMonth: 'from last month',
    bookingsByProvince: 'Bookings by province',
    noData: 'No data yet',
    recentBookings: 'Recent bookings',
    viewAll: 'View all →',
    booker: 'Tenant',
    dorm: 'Dorm',
    amount: 'Amount',
    status: 'Status',
    noBookings: 'No bookings yet',
    pendingApprovals: 'Pending dorm approvals',
    items: (n: number) => `${n} items`,
    viewDocs: 'View docs',
    approve: 'Approve',
    noPending: 'No dorms pending approval',
  },
};

export default function AdminDashboardPage() {
  const { lang } = useLang();
  const t = TEXT[lang];
  const [summary, setSummary] = useState<Summary | null>(null);
  const [byProvince, setByProvince] = useState<Record<string, number>>({});
  const [monthly, setMonthly] = useState<MonthlyRevenue | null>(null);
  const [bookings, setBookings] = useState<BookingWithDorm[]>([]);
  const [pending, setPending] = useState<PendingDorm[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);

  function reloadPending() {
    apiClient.get<PendingDorm[]>('/admin/approvals').then(setPending).catch(() => setPending([]));
  }

  useEffect(() => {
    apiClient.get<Summary>('/admin/analytics/summary').then(setSummary).catch(() => {});
    apiClient
      .get<Record<string, number>>('/admin/analytics/bookings-by-province')
      .then(setByProvince)
      .catch(() => setByProvince({}));
    apiClient.get<MonthlyRevenue>('/admin/analytics/monthly-revenue').then(setMonthly).catch(() => {});
    apiClient.get<BookingWithDorm[]>('/bookings').then(setBookings).catch(() => setBookings([]));
    reloadPending();

    const socket = getSocket();
    socket.on('dorm:new', reloadPending);
    socket.on('room:new', reloadPending);
    return () => {
      socket.off('dorm:new', reloadPending);
      socket.off('room:new', reloadPending);
    };
  }, []);

  async function approve(id: string) {
    setBusyId(id);
    try {
      await apiClient.patch(`/admin/approvals/${id}/approve`);
      reloadPending();
    } catch {
      // เงียบไว้ก่อน — ไม่ให้พังทั้งหน้า
    } finally {
      setBusyId(null);
    }
  }

  const recentBookings = [...bookings]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 6);
  const provinceData = Object.entries(byProvince).map(([label, value]) => ({ label, value }));

  const now = new Date();
  const thisMonthIdx = now.getMonth();
  const monthsData = monthly?.months ?? [];
  const thisMonthRevenue = monthsData[thisMonthIdx] ?? 0;
  const lastMonthRevenue = thisMonthIdx > 0 ? monthsData[thisMonthIdx - 1] ?? 0 : 0;
  const momDelta =
    lastMonthRevenue > 0 ? ((thisMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100 : null;
  const sparklineData = monthsData.slice(0, thisMonthIdx + 1);

  return (
    <div>
      <div className="grid grid-cols-1 gap-[18px] sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          icon="money"
          iconBg="bg-tenant-tint"
          label={t.revenue}
          value={`฿${(summary?.totalRevenue ?? 0).toLocaleString()}`}
          delta={momDelta != null ? { label: `${Math.abs(momDelta).toFixed(1)}%`, positive: momDelta >= 0 } : undefined}
          sparkline={sparklineData}
        />
        <KpiCard icon="book" iconBg="bg-admin-tint" label={t.totalBookings} value={`${summary?.totalBookings ?? 0}`} />
        <KpiCard icon="home" iconBg="bg-success-tint" label={t.totalDorms} value={`${summary?.totalDorms ?? 0}`} />
        <KpiCard icon="user" iconBg="bg-accent-tint" label={t.totalUsers} value={`${summary?.totalUsers ?? 0}`} />
      </div>

      <div className="mt-[18px] grid grid-cols-1 gap-[18px] lg:grid-cols-[1.65fr_1fr]">
        <div className="rounded-card-lg border border-card-border bg-white p-6 shadow-card">
          <div className="flex items-start justify-between">
            <div>
              <div className="text-base font-bold text-ink-strong">{t.revenue}</div>
              <div className="mt-0.5 text-[12.5px] text-ink-muted">
                {t.revenueSub} {monthly?.year ?? now.getFullYear()}
              </div>
            </div>
          </div>
          <div className="mt-2.5 flex items-baseline gap-2.5">
            <div className="text-[28px] font-bold tracking-tight">฿{thisMonthRevenue.toLocaleString()}</div>
            {momDelta != null && (
              <div className={`text-[13px] font-semibold ${momDelta >= 0 ? 'text-success' : 'text-danger'}`}>
                {momDelta >= 0 ? '▲' : '▼'} {Math.abs(momDelta).toFixed(1)}% {t.vsLastMonth}
              </div>
            )}
          </div>
          <div className="mt-2">
            <RevenueChart months={monthsData.length ? monthsData : Array(12).fill(0)} lang={lang} />
          </div>
        </div>

        <div className="rounded-card-lg border border-card-border bg-white p-6 shadow-card">
          <div className="text-base font-bold text-ink-strong">{t.bookingsByProvince}</div>
          <div className="mt-4">
            <SplitBar data={provinceData} />
            {provinceData.length === 0 && <p className="text-sm text-ink-faint">{t.noData}</p>}
          </div>
        </div>
      </div>

      <div className="mt-[18px] grid grid-cols-1 gap-[18px] lg:grid-cols-[1.55fr_1fr]">
        <div className="rounded-card-lg border border-card-border bg-white p-6 shadow-card">
          <div className="flex items-center justify-between">
            <div className="text-base font-bold text-ink-strong">{t.recentBookings}</div>
            <Link href="/admin/bookings" className="text-[13px] font-semibold text-tenant">
              {t.viewAll}
            </Link>
          </div>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-hairline text-xs text-ink-faint">
                  <th className="p-2 font-normal">{t.booker}</th>
                  <th className="p-2 font-normal">{t.dorm}</th>
                  <th className="p-2 font-normal">{t.amount}</th>
                  <th className="p-2 font-normal">{t.status}</th>
                </tr>
              </thead>
              <tbody>
                {recentBookings.map((b) => {
                  const badge = bookingStatusBadge(normalizeStatus(b.status), lang);
                  return (
                    <tr key={b.id} className="border-b border-hairline last:border-0">
                      <td className="p-2 font-medium text-ink-strong">{b.contactName}</td>
                      <td className="p-2 text-ink-subtitle">{b.room?.dorm?.name ?? '—'}</td>
                      <td className="p-2 font-sans font-semibold tabular-nums">฿{b.amount.toLocaleString()}</td>
                      <td className="p-2">
                        <Badge label={badge.label} variant={badge.variant} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {recentBookings.length === 0 && <p className="mt-2 text-ink-faint">{t.noBookings}</p>}
          </div>
        </div>

        <div className="rounded-card-lg border border-card-border bg-white p-5 shadow-card">
          <div className="flex items-center gap-2">
            <div className="text-base font-bold text-ink-strong">{t.pendingApprovals}</div>
            {pending.length > 0 && <Badge label={t.items(pending.length)} variant="warning" />}
          </div>
          <div className="mt-3.5 flex flex-col gap-3">
            {pending.slice(0, 3).map((dorm) => (
              <div key={dorm.id} className="rounded-[14px] border border-hairline p-3.5">
                <div className="flex items-center gap-2.5">
                  {dorm.images?.[0] ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={dorm.images[0]} alt="" className="h-11 w-11 shrink-0 rounded-[10px] object-cover" />
                  ) : (
                    <span className="h-11 w-11 shrink-0 rounded-[10px] bg-surface-canvas" />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-bold text-ink-strong">{dorm.name}</div>
                    <div className="truncate text-xs text-ink-muted">
                      {dorm.owner.name} · {dorm.province}
                    </div>
                  </div>
                </div>
                <div className="mt-2.5 flex gap-2">
                  <button
                    onClick={() => approve(dorm.id)}
                    disabled={busyId === dorm.id}
                    className="flex-1 rounded-[9px] bg-success py-2 text-center text-[13px] font-semibold text-white disabled:opacity-50"
                  >
                    {t.approve}
                  </button>
                  <Link
                    href={`/admin/approvals?dormId=${dorm.id}`}
                    className="flex-1 rounded-[9px] bg-surface-canvas py-2 text-center text-[13px] font-semibold text-ink-subtitle"
                  >
                    {t.viewDocs}
                  </Link>
                </div>
              </div>
            ))}
            {pending.length === 0 && <p className="text-sm text-ink-faint">{t.noPending}</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
