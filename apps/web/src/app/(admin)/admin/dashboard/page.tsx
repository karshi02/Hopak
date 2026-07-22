'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiClient } from '@/lib/api-client';
import { useLang } from '@/hooks/useLang';
import { StatTile } from '@/components/dashboard/StatTile';
import { SplitBar } from '@/components/dashboard/SplitBar';
import { Badge, bookingStatusBadge } from '@/components/dashboard/Badge';
import { normalizeStatus } from '@/lib/normalize';
import type { Booking, User } from '@hopak/shared';

type UserWithCreatedAt = User & { createdAt: string };

interface Summary {
  totalUsers: number;
  totalDorms: number;
  totalBookings: number;
  totalRevenue: number;
}

const TEXT = {
  th: {
    title: 'แดชบอร์ด',
    thisMonth: 'เดือนนี้',
    revenue: 'รายได้แพลตฟอร์ม (ค่าคอมมิชชัน)',
    totalBookings: 'การจองทั้งหมด',
    totalDorms: 'หอพักในระบบ',
    totalUsers: 'ผู้ใช้ทั้งหมด',
    bookingsByProvince: 'สัดส่วนการจองต่อจังหวัด',
    noData: 'ยังไม่มีข้อมูล',
    quickActions: 'ดำเนินการด่วน',
    recentBookings: 'การจองล่าสุด & สถานะ',
    booker: 'ผู้จอง',
    date: 'วันที่',
    amount: 'ยอด',
    status: 'สถานะ',
    noBookings: 'ยังไม่มีการจอง',
    newUsers: 'ผู้ใช้ใหม่',
    owner: 'เจ้าของหอ',
    tenant: 'ผู้เช่า',
    noUsers: 'ยังไม่มีผู้ใช้',
    actions: [
      { href: '/admin/campaigns', label: 'เพิ่มโฆษณา / แคมเปญ', bg: 'bg-[#EAF1FD]', color: 'text-tenant' },
      { href: '/admin/admins', label: 'เพิ่มผู้ดูแล (Admin)', bg: 'bg-[#E9F7EF]', color: 'text-success' },
      { href: '/admin/finance', label: 'การเงิน & รวมบิล', bg: 'bg-[#FEF6E7]', color: 'text-warning-dark' },
      { href: '/admin/approvals', label: 'คิวรออนุมัติหอพัก', bg: 'bg-[#F3ECFB]', color: 'text-admin' },
      { href: '/admin/owner-requests', label: 'คำขอเป็นเจ้าของหอ', bg: 'bg-[#FEEAEA]', color: 'text-danger' },
      { href: '/admin/bookings', label: 'ดูการจองทั้งหมด', bg: 'bg-[#F1F3F6]', color: 'text-ink-subtitle' },
    ],
    dateLocale: 'th-TH',
  },
  en: {
    title: 'Dashboard',
    thisMonth: 'This month',
    revenue: 'Platform revenue (commission)',
    totalBookings: 'Total bookings',
    totalDorms: 'Dorms in system',
    totalUsers: 'Total users',
    bookingsByProvince: 'Bookings by province',
    noData: 'No data yet',
    quickActions: 'Quick actions',
    recentBookings: 'Recent bookings & status',
    booker: 'Booker',
    date: 'Date',
    amount: 'Amount',
    status: 'Status',
    noBookings: 'No bookings yet',
    newUsers: 'New users',
    owner: 'Owner',
    tenant: 'Tenant',
    noUsers: 'No users yet',
    actions: [
      { href: '/admin/campaigns', label: 'Add ad / campaign', bg: 'bg-[#EAF1FD]', color: 'text-tenant' },
      { href: '/admin/admins', label: 'Add admin', bg: 'bg-[#E9F7EF]', color: 'text-success' },
      { href: '/admin/finance', label: 'Finance & payouts', bg: 'bg-[#FEF6E7]', color: 'text-warning-dark' },
      { href: '/admin/approvals', label: 'Dorm approval queue', bg: 'bg-[#F3ECFB]', color: 'text-admin' },
      { href: '/admin/owner-requests', label: 'Owner requests', bg: 'bg-[#FEEAEA]', color: 'text-danger' },
      { href: '/admin/bookings', label: 'View all bookings', bg: 'bg-[#F1F3F6]', color: 'text-ink-subtitle' },
    ],
    dateLocale: 'en-US',
  },
};

export default function AdminDashboardPage() {
  const { lang } = useLang();
  const t = TEXT[lang];
  const [summary, setSummary] = useState<Summary | null>(null);
  const [byProvince, setByProvince] = useState<Record<string, number>>({});
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [users, setUsers] = useState<UserWithCreatedAt[]>([]);

  useEffect(() => {
    apiClient.get<Summary>('/admin/analytics/summary').then(setSummary);
    apiClient.get<Record<string, number>>('/admin/analytics/bookings-by-province').then(setByProvince);
    apiClient.get<Booking[]>('/bookings').then(setBookings);
    apiClient.get<UserWithCreatedAt[]>('/admin/users').then(setUsers);
  }, []);

  const recentBookings = [...bookings]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 6);
  const recentUsers = [...users]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5);
  const provinceData = Object.entries(byProvince).map(([label, value]) => ({ label, value }));

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-ink-strong dark:text-white">{t.title}</h1>
        <span className="rounded-btn border border-card-border px-3.5 py-2 text-sm text-ink-subtitle dark:border-white/10">
          {t.thisMonth}
        </span>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatTile label={t.revenue} value={`฿${(summary?.totalRevenue ?? 0).toLocaleString()}`} />
        <StatTile label={t.totalBookings} value={`${summary?.totalBookings ?? 0}`} />
        <StatTile label={t.totalDorms} value={`${summary?.totalDorms ?? 0}`} />
        <StatTile label={t.totalUsers} value={`${summary?.totalUsers ?? 0}`} />
      </div>

      <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="rounded-card border border-card-border bg-white p-5 dark:border-white/10 dark:bg-[#1a1a19] lg:col-span-2">
          <h2 className="font-semibold text-ink-strong dark:text-white">{t.bookingsByProvince}</h2>
          <div className="mt-4">
            <SplitBar data={provinceData} />
            {provinceData.length === 0 && <p className="text-sm text-ink-faint">{t.noData}</p>}
          </div>
        </div>

        <div className="rounded-card border border-card-border bg-white p-5 dark:border-white/10 dark:bg-[#1a1a19]">
          <h2 className="font-semibold text-ink-strong dark:text-white">{t.quickActions}</h2>
          <div className="mt-3.5 flex flex-col gap-2">
            {t.actions.map((action) => (
              <Link
                key={action.href}
                href={action.href}
                className="flex items-center gap-3 rounded-xl border border-card-border px-3.5 py-3 text-sm text-ink hover:bg-black/[0.02] dark:border-white/10 dark:text-white dark:hover:bg-white/5"
              >
                <span className={`flex h-8 w-8 items-center justify-center rounded-lg font-bold ${action.bg} ${action.color}`}>
                  +
                </span>
                {action.label}
              </Link>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="rounded-card border border-card-border bg-white p-5 dark:border-white/10 dark:bg-[#1a1a19] lg:col-span-2">
          <h2 className="font-semibold text-ink-strong dark:text-white">{t.recentBookings}</h2>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="text-xs text-ink-faint">
                  <th className="p-2 font-normal">{t.booker}</th>
                  <th className="p-2 font-normal">{t.date}</th>
                  <th className="p-2 font-normal">{t.amount}</th>
                  <th className="p-2 font-normal">{t.status}</th>
                </tr>
              </thead>
              <tbody>
                {recentBookings.map((b) => {
                  const badge = bookingStatusBadge(normalizeStatus(b.status), lang);
                  return (
                    <tr key={b.id} className="border-t border-card-border dark:border-white/10">
                      <td className="p-2 font-medium text-ink-strong dark:text-white">{b.contactName}</td>
                      <td className="p-2 text-ink-subtitle">{new Date(b.checkInDate).toLocaleDateString(t.dateLocale)}</td>
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

        <div className="rounded-card border border-card-border bg-white p-5 dark:border-white/10 dark:bg-[#1a1a19]">
          <h2 className="font-semibold text-ink-strong dark:text-white">{t.newUsers}</h2>
          <div className="mt-3.5 flex flex-col gap-3">
            {recentUsers.map((u) => (
              <div key={u.id} className="flex items-center justify-between text-sm">
                <span className="truncate text-ink">{u.name}</span>
                <Badge label={u.role.toLowerCase() === 'owner' ? t.owner : t.tenant} variant="neutral" />
              </div>
            ))}
            {recentUsers.length === 0 && <p className="text-ink-faint">{t.noUsers}</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
