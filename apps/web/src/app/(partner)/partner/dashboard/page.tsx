'use client';

import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api-client';
import { normalizeStatus } from '@/lib/normalize';
import { StatTile } from '@/components/dashboard/StatTile';
import { BarList } from '@/components/dashboard/BarList';
import { Badge, bookingStatusBadge } from '@/components/dashboard/Badge';
import type { Booking, Dorm, Room } from '@hopak/shared';
import { PageLoader } from '@/components/PageLoader';

type DormWithRooms = Dorm & { rooms: Room[] };

const MONTH_LABEL = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];

export default function PartnerDashboardPage() {
  const [dorms, setDorms] = useState<DormWithRooms[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      apiClient.get<DormWithRooms[]>('/dorms/mine'),
      apiClient.get<Booking[]>('/bookings'),
    ])
      .then(([d, b]) => {
        setDorms(d);
        setBookings(b);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <PageLoader />;

  const rooms = dorms.flatMap((d) => d.rooms);
  const availableRooms = rooms.filter((r) => r.status.toUpperCase() === 'AVAILABLE');
  const paidBookings = bookings.filter((b) => ['paid', 'completed'].includes(normalizeStatus(b.status)));
  const pendingBookings = bookings.filter((b) => normalizeStatus(b.status) === 'pending');
  const revenue = paidBookings.reduce((sum, b) => sum + b.amount, 0);

  const now = new Date();
  const monthlyRevenue = Array.from({ length: 6 }).map((_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
    const total = paidBookings
      .filter((b) => {
        const bd = new Date(b.createdAt);
        return bd.getFullYear() === d.getFullYear() && bd.getMonth() === d.getMonth();
      })
      .reduce((sum, b) => sum + b.amount, 0);
    return { label: MONTH_LABEL[d.getMonth()], value: total };
  });

  const recentBookings = [...bookings]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 6);

  const commission = revenue * 0.1;
  const transferred = revenue - commission;

  return (
    <div>
      <h1 className="text-xl font-bold text-ink-strong dark:text-white">แดชบอร์ด</h1>

      <div className="mt-4 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatTile accent="seller" label="รายได้สะสม (ก่อนหักค่าบริการ)" value={`฿${revenue.toLocaleString()}`} />
        <StatTile label="ห้องทั้งหมด" value={`${rooms.length}`} />
        <StatTile label="ห้องว่าง" value={`${availableRooms.length}`} />
        <StatTile label="คำขอจองรอยืนยัน" value={`${pendingBookings.length}`} />
      </div>

      <div className="mt-5 rounded-card border border-card-border bg-white p-5 dark:border-white/10 dark:bg-[#1a1a19]">
        <h2 className="font-semibold text-ink-strong dark:text-white">รายได้รายเดือน (ยอดขายผ่านระบบ)</h2>
        <div className="mt-4">
          <BarList data={monthlyRevenue} />
        </div>
      </div>

      <div className="mt-5 rounded-card border border-card-border bg-white p-2 px-5 dark:border-white/10 dark:bg-[#1a1a19]">
        <div className="flex justify-between border-b border-card-border py-3.5 text-sm dark:border-white/10">
          <span className="text-ink-subtitle">ยอดขายผ่านระบบสะสม</span>
          <span className="font-sans font-bold text-ink-strong dark:text-white">฿{revenue.toLocaleString()}</span>
        </div>
        <div className="flex justify-between py-3.5 text-sm">
          <span className="text-ink-subtitle">โอนเข้าบัญชีแล้ว (หลังหัก 10%)</span>
          <span className="font-sans font-bold text-seller">฿{transferred.toLocaleString()}</span>
        </div>
      </div>

      <div className="mt-5 rounded-card border border-card-border bg-white p-5 dark:border-white/10 dark:bg-[#1a1a19]">
        <h2 className="font-semibold text-ink-strong dark:text-white">การจองล่าสุด</h2>
        <div className="mt-3 flex flex-col gap-2">
          {recentBookings.map((b) => {
            const badge = bookingStatusBadge(normalizeStatus(b.status));
            return (
              <div key={b.id} className="flex items-center justify-between text-sm">
                <span className="truncate">{b.contactName}</span>
                <Badge label={badge.label} variant={badge.variant} />
              </div>
            );
          })}
          {recentBookings.length === 0 && <p className="text-ink-faint">ยังไม่มีการจอง</p>}
        </div>
      </div>

      {dorms.length === 0 && (
        <div className="mt-5 rounded-card border border-card-border bg-white p-4 dark:border-white/10 dark:bg-[#1a1a19]">
          <p className="text-sm text-ink-faint">
            ยังไม่มีหอพัก — เริ่มจากเมนู &quot;เพิ่มหอพัก&quot; ด้านซ้าย
          </p>
        </div>
      )}
    </div>
  );
}
