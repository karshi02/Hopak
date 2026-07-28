'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiClient } from '@/lib/api-client';
import { normalizeStatus } from '@/lib/normalize';
import { useLang } from '@/hooks/useLang';
import { KpiCard } from '@/components/admin/KpiCard';
import { RevenueChart, Donut } from '@/components/admin/RevenueChart';
import { Badge, bookingStatusBadge } from '@/components/dashboard/Badge';
import { calcOwnerPayout } from '@hopak/shared';
import type { Booking, Dorm, Room } from '@hopak/shared';
import { PageLoader } from '@/components/PageLoader';

type DormWithRooms = Dorm & { rooms: Room[] };
type BookingWithRoom = Booking & { room?: { dorm?: { name?: string } } };

const MONTH_LABEL = {
  th: ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'],
  en: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
};

const TEXT = {
  th: {
    revenue: 'รายได้เดือนนี้ (หลังหัก 20%)',
    revenueSub: 'ค่าเช่าสุทธิ · ปี',
    occupancy: 'ห้องเข้าพัก',
    pending: 'รอยืนยันการจอง',
    newLabel: 'ใหม่',
    rating: 'คะแนนรีวิว',
    noRating: 'ยังไม่มีรีวิว',
    reviewCount: (n: number) => `${n} รีวิว`,
    vsLastMonth: 'จากเดือนก่อน',
    occupancyTitle: 'อัตราการเข้าพัก',
    occupied: 'เข้าพักแล้ว',
    available: 'ว่าง',
    recentBookings: 'การจองล่าสุด',
    viewAll: 'ดูทั้งหมด →',
    tenant: 'ผู้เช่า',
    dorm: 'หอพัก',
    amount: 'ยอด',
    status: 'สถานะ',
    noBookings: 'ยังไม่มีการจอง',
    todoTitle: 'ต้องจัดการ',
    todoConfirm: (n: number) => `ยืนยันการจอง ${n} รายการ`,
    todoConfirmSub: 'ผู้เช่ารอการตอบรับ',
    noTodo: 'ไม่มีงานค้าง',
    noDorms: 'ยังไม่มีหอพักที่อนุมัติแล้ว',
  },
  en: {
    revenue: 'This month (after 20% cut)',
    revenueSub: 'Net rent · Year',
    occupancy: 'Occupied rooms',
    pending: 'Pending bookings',
    newLabel: 'new',
    rating: 'Review score',
    noRating: 'No reviews yet',
    reviewCount: (n: number) => `${n} reviews`,
    vsLastMonth: 'from last month',
    occupancyTitle: 'Occupancy rate',
    occupied: 'Occupied',
    available: 'Available',
    recentBookings: 'Recent bookings',
    viewAll: 'View all →',
    tenant: 'Tenant',
    dorm: 'Dorm',
    amount: 'Amount',
    status: 'Status',
    noBookings: 'No bookings yet',
    todoTitle: 'To do',
    todoConfirm: (n: number) => `Confirm ${n} bookings`,
    todoConfirmSub: 'Tenants waiting for a response',
    noTodo: 'Nothing pending',
    noDorms: 'No approved dorms yet',
  },
};

export default function PartnerDashboardPage() {
  const { lang } = useLang();
  const t = TEXT[lang];
  const [dorms, setDorms] = useState<DormWithRooms[]>([]);
  const [bookings, setBookings] = useState<BookingWithRoom[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([apiClient.get<DormWithRooms[]>('/dorms/mine'), apiClient.get<BookingWithRoom[]>('/bookings')])
      .then(([d, b]) => {
        setDorms(d);
        setBookings(b);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <PageLoader theme="seller" />;

  const rooms = dorms.flatMap((d) => d.rooms);
  const availableRooms = rooms.filter((r) => r.status.toUpperCase() === 'AVAILABLE');
  const occupiedRooms = rooms.length - availableRooms.length;
  const paidBookings = bookings.filter((b) => ['paid', 'completed'].includes(normalizeStatus(b.status)));
  const pendingBookings = bookings.filter((b) => normalizeStatus(b.status) === 'pending');

  const monthLabels = MONTH_LABEL[lang];
  const now = new Date();
  const monthlyGross = Array.from({ length: 12 }, (_, m) =>
    paidBookings
      .filter((b) => {
        const bd = new Date(b.createdAt);
        return bd.getFullYear() === now.getFullYear() && bd.getMonth() === m;
      })
      .reduce((sum, b) => sum + b.amount, 0),
  );
  const monthlyNet = monthlyGross.map((v) => calcOwnerPayout(v));
  const thisMonthRevenue = monthlyNet[now.getMonth()];
  const lastMonthRevenue = now.getMonth() > 0 ? monthlyNet[now.getMonth() - 1] : 0;
  const momDelta = lastMonthRevenue > 0 ? ((thisMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100 : null;

  const totalReviews = dorms.reduce((sum, d) => sum + (d.reviewCount ?? 0), 0);
  const weightedRating = dorms.reduce((sum, d) => sum + (d.avgRating ?? 0) * (d.reviewCount ?? 0), 0);
  const avgRating = totalReviews > 0 ? weightedRating / totalReviews : null;

  const recentBookings = [...bookings]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 6);

  if (dorms.length === 0) {
    return <p className="text-ink-faint">{t.noDorms}</p>;
  }

  return (
    <div>
      <div className="grid grid-cols-1 gap-[18px] sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          icon="money"
          iconBg="bg-tenant-tint"
          label={t.revenue}
          value={`฿${thisMonthRevenue.toLocaleString()}`}
          delta={momDelta != null ? { label: `${Math.abs(momDelta).toFixed(1)}%`, positive: momDelta >= 0 } : undefined}
          sparkline={monthlyNet.slice(0, now.getMonth() + 1)}
        />
        <KpiCard
          icon="bed"
          iconBg="bg-success-tint"
          label={t.occupancy}
          value={`${occupiedRooms} / ${rooms.length}`}
          delta={rooms.length > 0 ? { label: `${Math.round((occupiedRooms / rooms.length) * 100)}%`, positive: true } : undefined}
        />
        <KpiCard
          icon="book"
          iconBg="bg-accent-tint"
          label={t.pending}
          value={`${pendingBookings.length}`}
          delta={pendingBookings.length > 0 ? { label: t.newLabel, positive: true } : undefined}
        />
        <KpiCard
          icon="star"
          iconBg="bg-admin-tint"
          label={t.rating}
          value={avgRating != null ? avgRating.toFixed(1) : '—'}
          delta={totalReviews > 0 ? { label: t.reviewCount(totalReviews), positive: true } : undefined}
        />
      </div>

      <div className="mt-[18px] grid grid-cols-1 gap-[18px] lg:grid-cols-[1.65fr_1fr]">
        <div className="rounded-card-lg border border-card-border bg-white p-6 shadow-card">
          <div className="text-base font-bold text-ink-strong">{t.revenue}</div>
          <div className="mt-0.5 text-[12.5px] text-ink-muted">
            {t.revenueSub} {now.getFullYear()}
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
            <RevenueChart months={monthlyNet} lang={lang} />
          </div>
        </div>

        <div className="rounded-card-lg border border-card-border bg-white p-6 shadow-card">
          <div className="text-base font-bold text-ink-strong">{t.occupancyTitle}</div>
          <div className="mt-4 flex items-center gap-[18px]">
            <Donut value={occupiedRooms} total={rooms.length} label={t.occupied} />
            <div className="flex flex-1 flex-col gap-3">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-sm bg-success" />
                <span className="flex-1 text-[12.5px] text-ink-subtitle">{t.occupied}</span>
                <span className="font-sans text-sm font-bold">{occupiedRooms}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-sm bg-card-border" />
                <span className="flex-1 text-[12.5px] text-ink-subtitle">{t.available}</span>
                <span className="font-sans text-sm font-bold">{availableRooms.length}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-[18px] grid grid-cols-1 gap-[18px] xl:grid-cols-[1.55fr_1fr]">
        <div className="rounded-card-lg border border-card-border bg-white p-6 shadow-card">
          <div className="flex items-center justify-between">
            <div className="text-base font-bold text-ink-strong">{t.recentBookings}</div>
            <Link href="/partner/requests" className="text-[13px] font-semibold text-tenant">
              {t.viewAll}
            </Link>
          </div>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead>
                <tr className="border-b border-hairline text-xs text-ink-faint">
                  <th className="p-2 font-normal">{t.tenant}</th>
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
          <div className="text-base font-bold text-ink-strong">{t.todoTitle}</div>
          <div className="mt-3.5 flex flex-col gap-3">
            {pendingBookings.length > 0 && (
              <Link
                href="/partner/requests"
                className="flex items-center gap-3 rounded-[13px] border border-hairline p-3.5 hover:bg-surface-canvas"
              >
                <span className="flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-[10px] bg-accent-tint text-accent-dark">
                  ✓
                </span>
                <div className="min-w-0 flex-1">
                  <div className="text-[13.5px] font-semibold text-ink-strong">{t.todoConfirm(pendingBookings.length)}</div>
                  <div className="mt-0.5 text-xs text-ink-muted">{t.todoConfirmSub}</div>
                </div>
              </Link>
            )}
            {pendingBookings.length === 0 && <p className="text-sm text-ink-faint">{t.noTodo}</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
