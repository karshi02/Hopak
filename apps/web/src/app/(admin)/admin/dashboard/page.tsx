'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiClient } from '@/lib/api-client';
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

const QUICK_ACTIONS = [
  { href: '/admin/campaigns', label: 'เพิ่มโฆษณา / แคมเปญ', bg: 'bg-[#EAF1FD]', color: 'text-tenant' },
  { href: '/admin/admins', label: 'เพิ่มผู้ดูแล (Admin)', bg: 'bg-[#E9F7EF]', color: 'text-success' },
  { href: '/admin/finance', label: 'การเงิน & รวมบิล', bg: 'bg-[#FEF6E7]', color: 'text-warning-dark' },
  { href: '/admin/approvals', label: 'คิวรออนุมัติหอพัก', bg: 'bg-[#F3ECFB]', color: 'text-admin' },
  { href: '/admin/bookings', label: 'ดูการจองทั้งหมด', bg: 'bg-[#F1F3F6]', color: 'text-ink-subtitle' },
];

export default function AdminDashboardPage() {
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
        <h1 className="text-xl font-bold text-ink-strong dark:text-white">แดชบอร์ด</h1>
        <span className="rounded-btn border border-card-border px-3.5 py-2 text-sm text-ink-subtitle dark:border-white/10">
          เดือนนี้
        </span>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatTile label="รายได้แพลตฟอร์ม (ค่าคอมมิชชัน)" value={`฿${(summary?.totalRevenue ?? 0).toLocaleString()}`} />
        <StatTile label="การจองทั้งหมด" value={`${summary?.totalBookings ?? 0}`} />
        <StatTile label="หอพักในระบบ" value={`${summary?.totalDorms ?? 0}`} />
        <StatTile label="ผู้ใช้ทั้งหมด" value={`${summary?.totalUsers ?? 0}`} />
      </div>

      <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="rounded-card border border-card-border bg-white p-5 dark:border-white/10 dark:bg-[#1a1a19] lg:col-span-2">
          <h2 className="font-semibold text-ink-strong dark:text-white">สัดส่วนการจองต่อจังหวัด</h2>
          <div className="mt-4">
            <SplitBar data={provinceData} />
            {provinceData.length === 0 && <p className="text-sm text-ink-faint">ยังไม่มีข้อมูล</p>}
          </div>
        </div>

        <div className="rounded-card border border-card-border bg-white p-5 dark:border-white/10 dark:bg-[#1a1a19]">
          <h2 className="font-semibold text-ink-strong dark:text-white">ดำเนินการด่วน</h2>
          <div className="mt-3.5 flex flex-col gap-2">
            {QUICK_ACTIONS.map((action) => (
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
          <h2 className="font-semibold text-ink-strong dark:text-white">การจองล่าสุด &amp; สถานะ</h2>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="text-xs text-ink-faint">
                  <th className="p-2 font-normal">ผู้จอง</th>
                  <th className="p-2 font-normal">วันที่</th>
                  <th className="p-2 font-normal">ยอด</th>
                  <th className="p-2 font-normal">สถานะ</th>
                </tr>
              </thead>
              <tbody>
                {recentBookings.map((b) => {
                  const badge = bookingStatusBadge(normalizeStatus(b.status));
                  return (
                    <tr key={b.id} className="border-t border-card-border dark:border-white/10">
                      <td className="p-2 font-medium text-ink-strong dark:text-white">{b.contactName}</td>
                      <td className="p-2 text-ink-subtitle">{new Date(b.checkInDate).toLocaleDateString('th-TH')}</td>
                      <td className="p-2 font-sans font-semibold tabular-nums">฿{b.amount.toLocaleString()}</td>
                      <td className="p-2">
                        <Badge label={badge.label} variant={badge.variant} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {recentBookings.length === 0 && <p className="mt-2 text-ink-faint">ยังไม่มีการจอง</p>}
          </div>
        </div>

        <div className="rounded-card border border-card-border bg-white p-5 dark:border-white/10 dark:bg-[#1a1a19]">
          <h2 className="font-semibold text-ink-strong dark:text-white">ผู้ใช้ใหม่</h2>
          <div className="mt-3.5 flex flex-col gap-3">
            {recentUsers.map((u) => (
              <div key={u.id} className="flex items-center justify-between text-sm">
                <span className="truncate text-ink">{u.name}</span>
                <Badge label={u.role.toLowerCase() === 'owner' ? 'เจ้าของหอ' : 'ผู้เช่า'} variant="neutral" />
              </div>
            ))}
            {recentUsers.length === 0 && <p className="text-ink-faint">ยังไม่มีผู้ใช้</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
