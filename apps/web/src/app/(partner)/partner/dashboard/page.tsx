'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { apiClient } from '@/lib/api-client';
import { getSocket } from '@/lib/ws';
import { normalizeStatus } from '@/lib/normalize';
import { useLang } from '@/hooks/useLang';
import { KpiCard } from '@/components/admin/KpiCard';
import { RevenueChart, Donut } from '@/components/admin/RevenueChart';
import { Badge, bookingStatusBadge } from '@/components/dashboard/Badge';
import { usePartnerMode } from '@/hooks/usePartnerMode';
import { calcPayout } from '@hopak/shared';
import { useFees } from '@/hooks/useFees';
import type { Booking, Dorm, Room } from '@hopak/shared';
import { RouteSkeleton } from '@/components/RouteSkeleton';

type DormWithRooms = Dorm & { rooms: Room[] };
type BookingWithRoom = Booking & { room?: { name?: string; dorm?: { name?: string } } };
type Mode = 'm' | 'd';

const MONTH_LABEL = {
  th: ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'],
  en: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
};

const DOW = {
  th: ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'],
  en: ['S', 'M', 'T', 'W', 'T', 'F', 'S'],
};

const TEXT = {
  th: {
    modeMonthly: 'รายเดือน',
    modeDaily: 'รายวัน',
    revenue: 'รายได้สุทธิเดือนนี้ (หลังหัก 20%)',
    revenueSub: 'ยอดรวมหลังหักคอม · ปี',
    occupancy: 'ห้องเข้าพัก',
    pending: 'รอยืนยันการจอง',
    newLabel: 'ใหม่',
    rating: 'คะแนนรีวิว',
    reviewCount: 'รีวิว',
    vsLastMonth: 'จากเดือนก่อน',
    exportExcel: 'สรุปเป็น Excel',
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
    todoConfirm: 'รอชำระเงิน',
    todoConfirmSub: 'ผู้เช่ายังไม่ได้ชำระ',
    noTodo: 'ไม่มีงานค้าง',
    noDorms: 'ยังไม่มีหอพักที่อนุมัติแล้ว',
    rejectedTitle: 'หอพักไม่ผ่านการตรวจสอบ',
    rejectedReason: 'เหตุผล / วิธีแก้',
    rejectedEdit: 'แก้ไขข้อมูลหอ',
    rejectedResubmit: 'ส่งอนุมัติใหม่',
    rejectedResubmitting: 'กำลังส่ง...',
    // รายวัน
    dailyRevenue: 'รายได้รายวันสุทธิเดือนนี้',
    nightsBooked: 'คืนที่จองเดือนนี้',
    nightsUnit: 'คืน',
    arrivalsToday: 'ขาเข้าวันนี้',
    arrivalsUnit: 'ราย',
    adr: 'ราคาเฉลี่ยต่อคืน (ADR)',
    calendarTitle: 'ปฏิทินคืนที่จอง',
    calendarSub: 'ตัวเลขในช่อง = จำนวนคืนที่ถูกจองในวันนั้น',
    upcomingTitle: 'การจองรายวันที่กำลังมาถึง',
    noUpcoming: 'ยังไม่มีการจองรายวันที่กำลังมาถึง',
    noDaily: 'ยังไม่มีข้อมูลการเช่ารายวัน',
    nightsShort: 'คืน',
    // CSV
    csvMonth: 'เดือน',
    csvRoom: 'ค่าเช่าห้อง',
    csvDeposit: 'ค่ามัดจำ',
    csvGross: 'รายรับรวม',
    csvCommission: 'ค่าคอมมิชชัน 20%',
    csvNet: 'รายได้สุทธิ',
    csvOccupancy: 'อัตราเข้าพัก (%)',
    csvTotal: 'รวมทั้งปี',
    csvFile: 'สรุปรายได้หอพัก',
  },
  en: {
    modeMonthly: 'Monthly',
    modeDaily: 'Daily',
    revenue: 'Net revenue this month (after 20%)',
    revenueSub: 'Total after commission · Year',
    occupancy: 'Occupied rooms',
    pending: 'Pending bookings',
    newLabel: 'new',
    rating: 'Review score',
    reviewCount: 'reviews',
    vsLastMonth: 'from last month',
    exportExcel: 'Export to Excel',
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
    todoConfirm: 'Awaiting payment',
    todoConfirmSub: 'Tenants have not paid yet',
    noTodo: 'Nothing pending',
    noDorms: 'No approved dorms yet',
    rejectedTitle: 'Dorm not approved',
    rejectedReason: 'Reason / how to fix',
    rejectedEdit: 'Edit dorm info',
    rejectedResubmit: 'Resubmit for review',
    rejectedResubmitting: 'Submitting...',
    dailyRevenue: 'Net daily revenue this month',
    nightsBooked: 'Nights booked this month',
    nightsUnit: 'nights',
    arrivalsToday: 'Arrivals today',
    arrivalsUnit: 'guests',
    adr: 'Average daily rate (ADR)',
    calendarTitle: 'Booked nights calendar',
    calendarSub: 'Number in each cell = nights booked that day',
    upcomingTitle: 'Upcoming daily bookings',
    noUpcoming: 'No upcoming daily bookings',
    noDaily: 'No daily rental data yet',
    nightsShort: 'nights',
    csvMonth: 'Month',
    csvRoom: 'Room rent',
    csvDeposit: 'Deposit',
    csvGross: 'Gross',
    csvCommission: 'Commission 20%',
    csvNet: 'Net revenue',
    csvOccupancy: 'Occupancy (%)',
    csvTotal: 'Year total',
    csvFile: 'dorm-revenue',
  },
};

// ตัดเวลาออก เหลือแค่วัน (เทียบวันตรงๆ ไม่ให้ timezone/เวลาทำให้เพี้ยน)
function dayKey(d: Date) {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

export default function PartnerDashboardPage() {
  const fees = useFees(); // อัตราค่าคอมจริงจากเซิร์ฟเวอร์ ใช้คิดคอลัมน์ค่าคอมในไฟล์ CSV
  const { lang } = useLang();
  const t = TEXT[lang];
  const [dorms, setDorms] = useState<DormWithRooms[]>([]);
  const [bookings, setBookings] = useState<BookingWithRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const [resubmitId, setResubmitId] = useState<string | null>(null);
  // โหมดมาจากสวิตช์กลางของคอนโซล — รายเดือน/รายวัน แยกข้อมูลกันทุกหน้า
  const { isDaily } = usePartnerMode();
  const mode: Mode = isDaily ? 'd' : 'm';

  // โหลดข้อมูล + อัปเดตสดผ่าน socket (จองใหม่ / จ่ายเงิน / สถานะเปลี่ยน) ไม่ต้องกดรีเฟรช
  function load() {
    return Promise.all([
      apiClient.get<DormWithRooms[]>('/dorms/mine'),
      apiClient.get<BookingWithRoom[]>('/bookings'),
    ])
      .then(([d, b]) => {
        setDorms(d);
        setBookings(b);
      })
      .catch(() => {});
  }

  useEffect(() => {
    load().finally(() => setLoading(false));
    const socket = getSocket();
    const refresh = () => {
      load();
    };
    socket.on('booking:new', refresh);
    socket.on('booking:updated', refresh);
    return () => {
      socket.off('booking:new', refresh);
      socket.off('booking:updated', refresh);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  // แยกข้อมูลตามโหมด — รายเดือนเห็นเฉพาะห้อง/การจองรายเดือน, รายวันเห็นเฉพาะรายวัน
  const rooms = useMemo(
    () => dorms.flatMap((d) => d.rooms).filter((r) => Boolean(r.allowDaily) === isDaily),
    [dorms, isDaily],
  );
  const modeBookings = useMemo(
    () => bookings.filter((b) => (b.rentalType === 'DAILY') === isDaily),
    [bookings, isDaily],
  );
  const paidBookings = useMemo(
    () => modeBookings.filter((b) => ['paid', 'completed'].includes(normalizeStatus(b.status))),
    [modeBookings],
  );

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();

  // ---- รายเดือน: ยอดต่อเดือนของปีนี้ -------------------------------------------------
  // ค่าคอมคิดจากค่าเช่าห้องเท่านั้น (มัดจำคืนเจ้าของเต็ม) → รวมทีละรายการ ไม่ใช่หัก 20% จากยอดรวม
  const monthly = useMemo(() => {
    const rows = Array.from({ length: 12 }, () => ({ room: 0, deposit: 0, gross: 0, net: 0 }));
    for (const b of paidBookings) {
      const d = new Date(b.createdAt);
      if (d.getFullYear() !== year) continue;
      const row = rows[d.getMonth()];
      row.room += b.roomPrice ?? 0;
      row.deposit += b.deposit ?? 0;
      row.gross += b.amount ?? 0;
      row.net += calcPayout({ amount: b.amount ?? 0, commissionBase: b.roomPrice ?? 0, rentalType: b.rentalType }).ownerPayout;
    }
    return rows;
  }, [paidBookings, year]);

  // ---- รายวัน --------------------------------------------------------------------------
  const daily = useMemo(() => {
    const dailyPaid = paidBookings.filter((b) => b.rentalType === 'DAILY');
    const monthStart = new Date(year, month, 1);
    const monthEnd = new Date(year, month + 1, 1);

    // นับ "คืน" ต่อวัน — คืนหนึ่งนับที่วันเข้าพัก (check-out ไม่นับเป็นคืน)
    const nightsPerDay = new Map<string, number>();
    let nightsThisMonth = 0;
    let rentThisMonth = 0;
    let netThisMonth = 0;
    let nightsAll = 0;
    let rentAll = 0;

    for (const b of dailyPaid) {
      const start = new Date(b.checkInDate);
      const end = b.checkOutDate ? new Date(b.checkOutDate) : null;
      const nights = b.nights ?? (end ? Math.max(1, Math.round((end.getTime() - start.getTime()) / 86400000)) : 1);
      nightsAll += nights;
      rentAll += b.roomPrice ?? 0;

      const perNightRent = nights > 0 ? (b.roomPrice ?? 0) / nights : 0;
      const perNightNet =
        nights > 0
          ? calcPayout({ amount: b.amount ?? 0, commissionBase: b.roomPrice ?? 0, rentalType: b.rentalType }).ownerPayout / nights
          : 0;

      for (let i = 0; i < nights; i++) {
        const d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
        const key = dayKey(d);
        nightsPerDay.set(key, (nightsPerDay.get(key) ?? 0) + 1);
        if (d >= monthStart && d < monthEnd) {
          nightsThisMonth += 1;
          rentThisMonth += perNightRent;
          netThisMonth += perNightNet;
        }
      }
    }

    const todayKey = dayKey(now);
    const arrivalsToday = dailyPaid.filter((b) => dayKey(new Date(b.checkInDate)) === todayKey).length;

    const upcoming = dailyPaid
      .filter((b) => new Date(b.checkInDate) >= new Date(now.getFullYear(), now.getMonth(), now.getDate()))
      .sort((a, b) => new Date(a.checkInDate).getTime() - new Date(b.checkInDate).getTime())
      .slice(0, 6);

    return {
      hasData: dailyPaid.length > 0,
      nightsPerDay,
      nightsThisMonth,
      netThisMonth,
      rentThisMonth,
      arrivalsToday,
      adr: nightsAll > 0 ? rentAll / nightsAll : 0,
      upcoming,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paidBookings, year, month]);

  // ปฏิทินเดือนปัจจุบัน — เติมช่องว่างหน้าวันที่ 1 ให้ตรงคอลัมน์วันในสัปดาห์
  const calendarCells = useMemo(() => {
    const first = new Date(year, month, 1);
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const cells: ({ day: number; nights: number } | null)[] = Array.from({ length: first.getDay() }, () => null);
    for (let day = 1; day <= daysInMonth; day++) {
      cells.push({ day, nights: daily.nightsPerDay.get(dayKey(new Date(year, month, day))) ?? 0 });
    }
    return cells;
  }, [year, month, daily]);

  if (loading) return <RouteSkeleton variant="console" />;

  const availableRooms = rooms.filter((r) => r.status.toUpperCase() === 'AVAILABLE');
  const occupiedRooms = rooms.length - availableRooms.length;
  const pendingBookings = modeBookings.filter((b) => normalizeStatus(b.status) === 'pending');

  const monthlyNet = monthly.map((r) => r.net);
  const thisMonthRevenue = monthlyNet[month];
  const lastMonthRevenue = month > 0 ? monthlyNet[month - 1] : 0;
  const momDelta = lastMonthRevenue > 0 ? ((thisMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100 : null;

  const totalReviews = dorms.reduce((sum, d) => sum + (d.reviewCount ?? 0), 0);
  const weightedRating = dorms.reduce((sum, d) => sum + (d.avgRating ?? 0) * (d.reviewCount ?? 0), 0);
  const avgRating = totalReviews > 0 ? weightedRating / totalReviews : null;

  const recentBookings = [...modeBookings]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 6);

  if (dorms.length === 0) return <p className="text-ink-faint">{t.noDorms}</p>;

  const rejectedDorms = dorms.filter((d) => String(d.status).toUpperCase() === 'REJECTED');
  const maxNights = Math.max(1, ...calendarCells.map((c) => c?.nights ?? 0));

  /**
   * ดาวน์โหลดสรุปรายได้ 12 เดือนเป็น CSV (เปิดใน Excel ได้)
   * ต้องนำหน้าด้วย BOM ﻿ ไม่งั้น Excel อ่านภาษาไทยเป็นตัวยึกยือ
   */
  function exportExcel() {
    const head = [t.csvMonth, t.csvRoom, t.csvDeposit, t.csvGross, t.csvCommission, t.csvNet, t.csvOccupancy];
    const occupancyPct = rooms.length > 0 ? Math.round((occupiedRooms / rooms.length) * 100) : 0;
    const lines = monthly.map((r, i) =>
      [
        MONTH_LABEL[lang][i],
        Math.round(r.room),
        Math.round(r.deposit),
        Math.round(r.gross),
        Math.round(r.room * fees.commissionRate),
        Math.round(r.net),
        i === month ? occupancyPct : '',
      ].join(','),
    );
    const total = monthly.reduce(
      (acc, r) => ({
        room: acc.room + r.room,
        deposit: acc.deposit + r.deposit,
        gross: acc.gross + r.gross,
        net: acc.net + r.net,
      }),
      { room: 0, deposit: 0, gross: 0, net: 0 },
    );
    lines.push(
      [
        t.csvTotal,
        Math.round(total.room),
        Math.round(total.deposit),
        Math.round(total.gross),
        Math.round(total.room * fees.commissionRate),
        Math.round(total.net),
        '',
      ].join(','),
    );

    const csv = '﻿' + [head.join(','), ...lines].join('\r\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `${t.csvFile}-${year}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

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

      {mode === 'm' ? (
        <>
          <div className="grid grid-cols-2 gap-3 sm:gap-[18px] lg:grid-cols-4">
            <KpiCard
              icon="money"
              iconBg="bg-tenant-tint"
              label={t.revenue}
              href="/partner/income"
              value={`฿${Math.round(thisMonthRevenue).toLocaleString()}`}
              delta={
                momDelta != null ? { label: `${Math.abs(momDelta).toFixed(1)}%`, positive: momDelta >= 0 } : undefined
              }
              sparkline={monthlyNet.slice(0, month + 1)}
            />
            <KpiCard
              icon="bed"
              iconBg="bg-success-tint"
              label={t.occupancy}
              href="/partner/rooms"
              value={`${occupiedRooms} / ${rooms.length}`}
              delta={
                rooms.length > 0
                  ? { label: `${Math.round((occupiedRooms / rooms.length) * 100)}%`, positive: true }
                  : undefined
              }
            />
            <KpiCard
              icon="book"
              iconBg="bg-accent-tint"
              label={t.pending}
              href="/partner/requests"
              value={`${pendingBookings.length}`}
              delta={pendingBookings.length > 0 ? { label: t.newLabel, positive: true } : undefined}
            />
            <KpiCard
              icon="star"
              iconBg="bg-admin-tint"
              label={t.rating}
              href="/partner/rooms"
              value={avgRating != null ? avgRating.toFixed(1) : '—'}
              delta={totalReviews > 0 ? { label: `${totalReviews} ${t.reviewCount}`, positive: true } : undefined}
            />
          </div>

          <div className="mt-[18px] grid grid-cols-1 gap-[18px] lg:grid-cols-[1.65fr_1fr]">
            <div className="rounded-card-lg border border-card-border bg-white p-4 shadow-card sm:p-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="text-base font-bold text-ink-strong">{t.revenue}</div>
                  <div className="mt-0.5 text-[12.5px] text-ink-muted">
                    {t.revenueSub} {year}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={exportExcel}
                  className="flex h-9 shrink-0 items-center gap-2 rounded-[11px] border border-card-border px-3 text-[13px] font-semibold text-ink-body hover:bg-surface-canvas"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <path
                      d="M12 3v12M7 11l5 5 5-5M4 20h16"
                      stroke="#12A150"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  {t.exportExcel}
                </button>
              </div>
              <div className="mt-2.5 flex items-baseline gap-2.5">
                <div className="text-[28px] font-bold tracking-tight">
                  ฿{Math.round(thisMonthRevenue).toLocaleString()}
                </div>
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
        </>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:gap-[18px] lg:grid-cols-4">
            <KpiCard
              icon="money"
              iconBg="bg-success-tint"
              label={t.dailyRevenue}
              href="/partner/income"
              value={`฿${Math.round(daily.netThisMonth).toLocaleString()}`}
            />
            <KpiCard
              icon="book"
              iconBg="bg-tenant-tint"
              label={t.nightsBooked}
              href="/partner/requests"
              value={`${daily.nightsThisMonth}`}
              delta={daily.nightsThisMonth > 0 ? { label: t.nightsUnit, positive: true } : undefined}
            />
            <KpiCard
              icon="bed"
              iconBg="bg-accent-tint"
              label={t.arrivalsToday}
              href="/partner/check-in"
              value={`${daily.arrivalsToday}`}
              delta={daily.arrivalsToday > 0 ? { label: t.arrivalsUnit, positive: true } : undefined}
            />
            <KpiCard
              icon="star"
              iconBg="bg-admin-tint"
              label={t.adr}
              href="/partner/rooms"
              value={daily.adr > 0 ? `฿${Math.round(daily.adr).toLocaleString()}` : '—'}
            />
          </div>

          <div className="mt-[18px] grid grid-cols-1 gap-[18px] xl:grid-cols-[1.35fr_1fr]">
            {/* ปฏิทินคืนที่จอง */}
            <div className="rounded-card-lg border border-card-border bg-white p-4 shadow-card sm:p-6">
              <div className="text-base font-bold text-ink-strong">
                {t.calendarTitle} · {MONTH_LABEL[lang][month]} {year}
              </div>
              <div className="mt-0.5 text-[12.5px] text-ink-muted">{t.calendarSub}</div>
              <div className="mt-4 grid grid-cols-7 gap-1.5">
                {DOW[lang].map((d, i) => (
                  <div key={`${d}-${i}`} className="pb-1 text-center text-[11.5px] font-semibold text-ink-faint">
                    {d}
                  </div>
                ))}
                {calendarCells.map((cell, i) => {
                  if (!cell) return <div key={`pad-${i}`} />;
                  const isToday = cell.day === now.getDate();
                  // เข้มขึ้นตามจำนวนคืนที่ถูกจอง — ว่าง = พื้นเทาอ่อน
                  const intensity = cell.nights / maxNights;
                  return (
                    <div
                      key={cell.day}
                      className="flex aspect-square flex-col items-center justify-center rounded-[10px] text-[12px] font-semibold"
                      style={{
                        background: cell.nights > 0 ? `rgba(18,161,80,${0.12 + intensity * 0.55})` : '#F4F6FA',
                        color: cell.nights > 0 && intensity > 0.55 ? '#fff' : '#161A22',
                        outline: isToday ? '2px solid #12A150' : 'none',
                        outlineOffset: '-2px',
                      }}
                    >
                      <span>{cell.day}</span>
                      {cell.nights > 0 && <span className="text-[10px] font-bold opacity-90">{cell.nights}</span>}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* การจองรายวันที่กำลังมาถึง */}
            <div className="rounded-card-lg border border-card-border bg-white p-4 shadow-card sm:p-6">
              <div className="flex items-center justify-between">
                <div className="text-base font-bold text-ink-strong">{t.upcomingTitle}</div>
                <Link href="/partner/requests" className="text-[13px] font-semibold text-seller">
                  {t.viewAll}
                </Link>
              </div>
              <div className="mt-3 flex flex-col gap-2.5">
                {daily.upcoming.map((b) => {
                  const badge = bookingStatusBadge(normalizeStatus(b.status), lang);
                  const start = new Date(b.checkInDate);
                  return (
                    <div key={b.id} className="rounded-xl border border-hairline p-3">
                      <div className="flex items-center justify-between gap-2">
                        <span className="min-w-0 flex-1 truncate font-semibold text-ink-strong">{b.contactName}</span>
                        <Badge label={badge.label} variant={badge.variant} />
                      </div>
                      <div className="mt-1 flex items-center justify-between gap-2 text-[13px]">
                        <span className="min-w-0 flex-1 truncate text-ink-muted">
                          {start.getDate()} {MONTH_LABEL[lang][start.getMonth()]} · {b.nights ?? 1} {t.nightsShort}
                          {b.room?.name ? ` · ${b.room.name}` : ''}
                        </span>
                        <span className="font-sans font-bold tabular-nums text-ink-strong">
                          ฿{(b.amount ?? 0).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  );
                })}
                {daily.upcoming.length === 0 && (
                  <p className="text-sm text-ink-faint">{daily.hasData ? t.noUpcoming : t.noDaily}</p>
                )}
              </div>
            </div>
          </div>
        </>
      )}

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
                      <td className="p-2 font-sans font-semibold tabular-nums">฿{(b.amount ?? 0).toLocaleString()}</td>
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
                    <span className="font-sans font-bold tabular-nums text-ink-strong">
                      ฿{(b.amount ?? 0).toLocaleString()}
                    </span>
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
                  <div className="text-[13.5px] font-semibold text-ink-strong">
                    {t.todoConfirm} {pendingBookings.length}
                  </div>
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
