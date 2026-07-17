'use client';

import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api-client';
import { normalizeStatus } from '@/lib/normalize';
import { Badge, bookingStatusBadge } from '@/components/dashboard/Badge';
import { FilterTabs } from '@/components/dashboard/FilterTabs';
import type { Booking } from '@hopak/shared';

function toCsv(bookings: Booking[]): string {
  const header = 'รหัส,ผู้จอง,เบอร์โทร,วันที่,ยอด,สถานะ';
  const rows = bookings.map((b) =>
    [b.id, b.contactName, b.contactPhone, b.checkInDate, b.amount, normalizeStatus(b.status)].join(','),
  );
  return [header, ...rows].join('\n');
}

export default function AdminBookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [statusFilter, setStatusFilter] = useState('');

  useEffect(() => {
    apiClient.get<Booking[]>('/bookings').then(setBookings);
  }, []);

  const filtered = statusFilter
    ? bookings.filter((b) => normalizeStatus(b.status) === statusFilter)
    : bookings;

  const count = (status: string) =>
    status ? bookings.filter((b) => normalizeStatus(b.status) === status).length : bookings.length;

  const FILTERS = [
    { value: '', label: 'ทั้งหมด', count: count(''), tone: 'total' as const },
    { value: 'pending', label: 'รอยืนยัน', count: count('pending'), tone: 'warning' as const },
    { value: 'confirmed', label: 'ยืนยันแล้ว', count: count('confirmed'), tone: 'good' as const },
    { value: 'cancelled', label: 'ยกเลิก', count: count('cancelled'), tone: 'critical' as const },
    { value: 'completed', label: 'เสร็จสิ้น', count: count('completed'), tone: 'neutral' as const },
  ];

  function handleExport() {
    const blob = new Blob([toCsv(filtered)], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'bookings.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-ink-strong dark:text-white">การจอง &amp; สถานะ</h1>
        <button
          onClick={handleExport}
          className="rounded-btn bg-[#111827] px-4 py-2 text-sm font-semibold text-white"
        >
          Export CSV
        </button>
      </div>

      <div className="mt-4">
        <FilterTabs options={FILTERS} value={statusFilter} onChange={setStatusFilter} />
      </div>

      <div className="mt-4 overflow-x-auto rounded-card border border-card-border dark:border-white/10">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-card-border text-xs text-ink-faint dark:border-white/10">
              <th className="p-3 font-normal">เลขที่จอง</th>
              <th className="p-3 font-normal">ผู้จอง</th>
              <th className="p-3 font-normal">วันเข้าอยู่</th>
              <th className="p-3 font-normal">ยอด</th>
              <th className="p-3 font-normal">สถานะ</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((b) => {
              const badge = bookingStatusBadge(normalizeStatus(b.status));
              return (
                <tr key={b.id} className="border-t border-card-border dark:border-white/10">
                  <td className="p-3 font-sans text-ink-subtitle">#{b.id.slice(0, 8).toUpperCase()}</td>
                  <td className="p-3 font-medium text-ink-strong dark:text-white">{b.contactName}</td>
                  <td className="p-3 text-ink-subtitle">{new Date(b.checkInDate).toLocaleDateString('th-TH')}</td>
                  <td className="p-3 font-sans font-semibold tabular-nums">฿{b.amount.toLocaleString()}</td>
                  <td className="p-3">
                    <Badge label={badge.label} variant={badge.variant} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {filtered.length === 0 && <p className="p-4 text-ink-faint">ไม่มีข้อมูล</p>}
      </div>
    </div>
  );
}
