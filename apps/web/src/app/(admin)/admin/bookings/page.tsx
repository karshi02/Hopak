'use client';

import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api-client';
import { normalizeStatus } from '@/lib/normalize';
import { useLang } from '@/hooks/useLang';
import { Badge, bookingStatusBadge } from '@/components/dashboard/Badge';
import { FilterTabs } from '@/components/dashboard/FilterTabs';
import type { Booking } from '@hopak/shared';

const TEXT = {
  th: {
    title: 'การจอง & สถานะ',
    export: 'Export CSV',
    filters: [
      { value: '', label: 'ทั้งหมด' },
      { value: 'pending', label: 'รอยืนยัน' },
      { value: 'confirmed', label: 'ยืนยันแล้ว' },
      { value: 'cancelled', label: 'ยกเลิก' },
      { value: 'completed', label: 'เสร็จสิ้น' },
    ],
    bookingId: 'เลขที่จอง',
    booker: 'ผู้จอง',
    checkIn: 'วันเข้าอยู่',
    amount: 'ยอด',
    status: 'สถานะ',
    noData: 'ไม่มีข้อมูล',
    csvHeader: 'รหัส,ผู้จอง,เบอร์โทร,วันที่,ยอด,สถานะ',
    dateLocale: 'th-TH',
  },
  en: {
    title: 'Bookings & Status',
    export: 'Export CSV',
    filters: [
      { value: '', label: 'All' },
      { value: 'pending', label: 'Pending' },
      { value: 'confirmed', label: 'Confirmed' },
      { value: 'cancelled', label: 'Cancelled' },
      { value: 'completed', label: 'Completed' },
    ],
    bookingId: 'Booking ID',
    booker: 'Booker',
    checkIn: 'Check-in date',
    amount: 'Amount',
    status: 'Status',
    noData: 'No data',
    csvHeader: 'ID,Booker,Phone,Date,Amount,Status',
    dateLocale: 'en-US',
  },
};

function toCsv(bookings: Booking[], header: string): string {
  const rows = bookings.map((b) =>
    [b.id, b.contactName, b.contactPhone, b.checkInDate, b.amount, normalizeStatus(b.status)].join(','),
  );
  return [header, ...rows].join('\n');
}

export default function AdminBookingsPage() {
  const { lang } = useLang();
  const t = TEXT[lang];
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

  const tones = ['total', 'warning', 'good', 'critical', 'neutral'] as const;
  const FILTERS = t.filters.map((f, i) => ({ ...f, count: count(f.value), tone: tones[i] }));

  function handleExport() {
    const blob = new Blob([toCsv(filtered, t.csvHeader)], { type: 'text/csv;charset=utf-8;' });
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
        <h1 className="text-xl font-bold text-ink-strong dark:text-white">{t.title}</h1>
        <button
          onClick={handleExport}
          className="rounded-btn bg-[#111827] px-4 py-2 text-sm font-semibold text-white"
        >
          {t.export}
        </button>
      </div>

      <div className="mt-4">
        <FilterTabs options={FILTERS} value={statusFilter} onChange={setStatusFilter} />
      </div>

      <div className="mt-4 overflow-x-auto rounded-card border border-card-border dark:border-white/10">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-card-border text-xs text-ink-faint dark:border-white/10">
              <th className="p-3 font-normal">{t.bookingId}</th>
              <th className="p-3 font-normal">{t.booker}</th>
              <th className="p-3 font-normal">{t.checkIn}</th>
              <th className="p-3 font-normal">{t.amount}</th>
              <th className="p-3 font-normal">{t.status}</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((b) => {
              const badge = bookingStatusBadge(normalizeStatus(b.status), lang);
              return (
                <tr key={b.id} className="border-t border-card-border dark:border-white/10">
                  <td className="p-3 font-sans text-ink-subtitle">#{b.id.slice(0, 8).toUpperCase()}</td>
                  <td className="p-3 font-medium text-ink-strong dark:text-white">{b.contactName}</td>
                  <td className="p-3 text-ink-subtitle">{new Date(b.checkInDate).toLocaleDateString(t.dateLocale)}</td>
                  <td className="p-3 font-sans font-semibold tabular-nums">฿{b.amount.toLocaleString()}</td>
                  <td className="p-3">
                    <Badge label={badge.label} variant={badge.variant} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {filtered.length === 0 && <p className="p-4 text-ink-faint">{t.noData}</p>}
      </div>
    </div>
  );
}
