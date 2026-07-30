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
    revenue: 'รายได้สุทธิเดือนนี้ (หลังหัก 20%)',
    revenueSub: 'ยอดรวมหลังหักคอม · ปี',
    occupancy: 'ห้องเข้าพัก',
    pending: 'รอยืนยันการจอง',
    newLabel: 'ใหม่',
    rating: 'คะแนนรีวิว',
    noRating: 'ยังไม่มีรีวิว',
    reviewCount: (n: number) => `${n} รีวิว`,
    vsLastMonth: 'จากเดือนก่อน',
    breakdownTitle: 'สรุปรายได้เดือนนี้ (แยกรายละเอียด)',
    bdRoom: 'ค่าห้อง (เต็ม)',
    bdDeposit: 'ค่ามัดจำ (เต็ม)',
    bdGross: 'ยอดเต็มเดือนนี้',
    bdCommission: 'หักค่าคอมมิชชัน 20%',
    bdNet: 'คงเหลือสุทธิ (หลังหัก 20%)',
    bdBonus: 'โบนัส',
    comingSoon: 'เร็วๆ นี้',
    ctaTitle: 'รายได้จากแอป Hoprak',
    ctaSub: 'ค่าห้องที่คุณได้รับจากการจองผ่านแอปนี้ · รอโอน / โอนแล้ว',
    ctaBtn: 'ดูรายได้ทั้งหมด',
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
    rejectedTitle: 'หอพักไม่ผ่านการตรวจสอบ',
    rejectedReason: 'เหตุผล / วิธีแก้',
    rejectedEdit: 'แก้ไขข้อมูลหอ',
    rejectedResubmit: 'ส่งอนุมัติใหม่',
    rejectedResubmitting: 'กำลังส่ง...',
  },
  en: {
    revenue: 'Net revenue this month (after 20%)',
    revenueSub: 'Total after commission · Year',
    occupancy: 'Occupied rooms',
    pending: 'Pending bookings',
    newLabel: 'new',
    rating: 'Review score',
    noRating: 'No reviews yet',
    reviewCount: (n: number) => `${n} reviews`,
    vsLastMonth: 'from last month',
    breakdownTitle: 'This month earnings breakdown',
    bdRoom: 'Room fee (full)',
    bdDeposit: 'Deposit (full)',
    bdGross: 'Gross this month',
    bdCommission: 'Commission 20%',
    bdNet: 'Net after 20%',
    bdBonus: 'Bonus',
    comingSoon: 'Coming soon',
    ctaTitle: 'Income from Hoprak app',
    ctaSub: 'Room income from bookings via this app · pending / transferred',
    ctaBtn: 'View all income',
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
    rejectedTitle: 'Dorm not approved',
    rejectedReason: 'Reason / how to fix',
    rejectedEdit: 'Edit dorm info',
    rejectedResubmit: 'Resubmit for review',
    rejectedResubmitting: 'Submitting...',
  },
};

export default function PartnerDashboardPage() {
  const { lang } = useLang();
  const t = TEXT[lang];
  const [dorms, setDorms] = useState<DormWithRooms[]>([]);
  const [bookings, setBookings] = useState<BookingWithRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const [resubmitId, setResubmitId] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([apiClient.get<DormWithRooms[]>('/dorms/mine'), apiClient.get<BookingWithRoom[]>('/bookings')])
      .then(([d, b]) => {
        setDorms(d);
        setBookings(b);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);


  async function resubmitDorm(id: string) {
    setResubmitId(id);
    try {
      await apiClient.patch(`/dorms/${id}/resubmit`);
      const d = await apiClient.get<DormWithRooms[]>('/dorms/mine');
      setDorms(d);
    } catch {
      // เงียบไว้ — ไม่ให้พังทั้งหน้า
    } finally {
      setResubmitId(null);
    }
  }

  if (loading) return <PageLoader theme="seller" />;

  const rooms = dorms.flatMap((d) => d.rooms);
  const availableRooms = rooms.filter((r) => r.status.toUpperCase() === 'AVAILABLE');
  const occupiedRooms = rooms.length - availableRooms.length;
  const paidBookings = bookings.filter((b) => ['paid', 'completed'].includes(normalizeStatus(b.status)));
  const pendingBookings = bookings.filter((b) => normalizeStatus(b.status) === 'pending');

  const monthLabels = MONTH_LABEL[lang];
  const now = new Date();
  // รายได้สุทธิเจ้าของหอต่อเดือน = ยอดรวมที่ผู้เช่าจ่าย (ค่าห้อง+มัดจำ) หลังหักคอม 20% = 80% ของยอดรวม
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

  const rejectedDorms = dorms.filter((d) => String(d.status).toUpperCase() === 'REJECTED');

  return (
    <div>
      {rejectedDorms.map((d) => (
        <div key={d.id} className="mb-4 rounded-card-lg border border-danger/40 bg-danger/5 p-4">
          <p className="font-semibold text-danger">
            {t.rejectedTitle}: {d.name}
          </p>
          {d.rejectionReason && (
            <p className="mt-1.5 whitespace-pre-line text-sm text-ink-body">
              <span className="font-medium">{t.rejectedReason}:</span> {d.rejectionReason}
            </p>
          )}
          <div className="mt-3 flex gap-2">
            <Link
              href={`/partner/dorms/${d.id}/edit`}
              className="rounded-lg border border-card-border px-4 py-2 text-sm font-semibold text-ink-body hover:bg-surface-canvas"
            >
              {t.rejectedEdit}
            </Link>
            <button
              onClick={() => resubmitDorm(d.id)}
              disabled={resubmitId === d.id}
              className="rounded-lg bg-tenant px-4 py-2 text-sm font-semibold text-white hover:bg-tenant-dark disabled:opacity-50"
            >
              {resubmitId === d.id ? t.rejectedResubmitting : t.rejectedResubmit}
            </button>
          </div>
        </div>
      ))}

      <div className="grid grid-cols-2 gap-3 sm:gap-[18px] lg:grid-cols-4">
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
        <div className="rounded-card-lg border border-card-border bg-white p-4 shadow-card sm:p-6">
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

        <div className="rounded-card-lg border border-card-border bg-white p-4 shadow-card sm:p-6">
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
        <div className="rounded-card-lg border border-card-border bg-white p-4 shadow-card sm:p-6">
          <div className="flex items-center justify-between">
            <div className="text-base font-bold text-ink-strong">{t.recentBookings}</div>
            <Link href="/partner/requests" className="text-[13px] font-semibold text-tenant">
              {t.viewAll}
            </Link>
          </div>
          {/* จอใหญ่: ตาราง */}
          <div className="mt-3 hidden sm:block">
            <table className="w-full text-left text-sm">
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
          </div>
          {/* มือถือ: การ์ดต่อรายการ */}
          <div className="mt-3 flex flex-col gap-2.5 sm:hidden">
            {recentBookings.map((b) => {
              const badge = bookingStatusBadge(normalizeStatus(b.status), lang);
              return (
                <div key={b.id} className="rounded-xl border border-hairline p-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="min-w-0 flex-1 truncate font-semibold text-ink-strong">{b.contactName}</span>
                    <Badge label={badge.label} variant={badge.variant} />
                  </div>
                  <div className="mt-1 flex items-center justify-between gap-2 text-[13px]">
                    <span className="min-w-0 flex-1 truncate text-ink-muted">{b.room?.dorm?.name ?? '—'}</span>
                    <span className="font-sans font-bold tabular-nums text-ink-strong">฿{b.amount.toLocaleString()}</span>
                  </div>
                </div>
              );
            })}
          </div>
          {recentBookings.length === 0 && <p className="mt-2 text-ink-faint">{t.noBookings}</p>}
        </div>

        <div className="rounded-card-lg border border-card-border bg-white p-4 shadow-card sm:p-5">
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

      {/* income CTA — ลิงก์ไปหน้ารายได้ (รอโอน/โอนแล้ว) */}
      <Link
        href="/partner/income"
        className="mt-[18px] flex flex-col gap-4 rounded-card-lg bg-[linear-gradient(120deg,#0F1115,#1B2A22)] p-5 shadow-[0_12px_30px_rgba(15,17,21,0.22)] transition-transform hover:-translate-y-0.5 sm:flex-row sm:items-center"
      >
        <div className="flex items-center gap-4">
          <div className="flex h-[50px] w-[50px] shrink-0 items-center justify-center rounded-[14px] bg-[rgba(31,181,110,0.18)]">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
              <path d="M3 17l6-6 4 4 7-8" stroke="#1FB56E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M14 7h6v6" stroke="#1FB56E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[17px] font-bold text-white">{t.ctaTitle}</div>
            <div className="mt-0.5 text-[13.5px] text-[#9BB3A6]">{t.ctaSub}</div>
          </div>
        </div>
        <div className="flex h-[46px] items-center justify-center gap-2 rounded-xl bg-[linear-gradient(135deg,#12A150,#1FB56E)] px-5 text-[14.5px] font-bold text-white shadow-[0_6px_16px_rgba(18,161,80,0.4)] sm:ml-auto sm:shrink-0">
          <span className="whitespace-nowrap">{t.ctaBtn}</span>
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none">
            <path d="M5 12h14M13 6l6 6-6 6" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </Link>
    </div>
  );
}
