'use client';

import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api-client';
import { normalizeStatus } from '@/lib/normalize';
import { useLang } from '@/hooks/useLang';
import { Badge, bookingStatusBadge } from '@/components/dashboard/Badge';
import { FilterTabs } from '@/components/dashboard/FilterTabs';
import type { Booking } from '@hopak/shared';

type BookingWithDorm = Booking & { roomId: string; room?: { status?: string; dorm?: { name?: string } } };

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
    dorm: 'หอพัก',
    checkIn: 'วันเข้าอยู่',
    amount: 'ยอด',
    status: 'สถานะ',
    noData: 'ไม่มีข้อมูล',
    csvHeader: 'รหัส,ผู้จอง,เบอร์โทร,วันที่,ยอด,สถานะ',
    dateLocale: 'th-TH',
    cancel: 'ยกเลิก',
    cancelling: 'กำลังยกเลิก...',
    restore: 'กู้คืน',
    restoring: 'กำลังกู้คืน...',
    refundCancel: 'คืนห้อง (คืนเงิน)',
    room: 'ห้อง',
    roomFree: 'ว่าง',
    roomOccupied: 'ไม่ว่าง',
    cutRoom: 'ตัดห้อง',
    returnRoom: 'คืนห้อง',
    confirmRefund: 'ยืนยันคืนห้อง + ยกเลิกการจองนี้? (คืนเงินทำเบื้องหลัง)',
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
    dorm: 'Dorm',
    checkIn: 'Check-in date',
    amount: 'Amount',
    status: 'Status',
    noData: 'No data',
    csvHeader: 'ID,Booker,Phone,Date,Amount,Status',
    dateLocale: 'en-US',
    cancel: 'Cancel',
    cancelling: 'Cancelling...',
    restore: 'Restore',
    restoring: 'Restoring...',
    refundCancel: 'Release (refund)',
    room: 'Room',
    roomFree: 'Free',
    roomOccupied: 'Occupied',
    cutRoom: 'Cut',
    returnRoom: 'Release',
    confirmRefund: 'Confirm release + cancel this booking? (refund handled manually)',
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
  const [bookings, setBookings] = useState<BookingWithDorm[]>([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);

  function reload() {
    apiClient.get<BookingWithDorm[]>('/bookings').then(setBookings).catch(() => setBookings([]));
  }

  useEffect(reload, []);

  async function handleCancel(id: string, needConfirm = false) {
    if (needConfirm && !window.confirm(t.confirmRefund)) return;
    setBusyId(id);
    try {
      await apiClient.patch(`/bookings/${id}/admin-cancel`);
      reload();
    } catch {
      // เงียบไว้ก่อน — ปุ่มจะกลับมากดใหม่ได้ปกติ ไม่ต้องพังทั้งหน้า
    } finally {
      setBusyId(null);
    }
  }

  // ตัด/คืนห้องด้วยมือ (admin) — สะท้อนบนเว็บทันที ไม่แตะสถานะการจอง
  async function handleRoomStatus(roomId: string, next: 'AVAILABLE' | 'OCCUPIED') {
    setBusyId(roomId);
    try {
      await apiClient.patch(`/rooms/${roomId}/status`, { status: next });
      reload();
    } catch {
      // เงียบไว้ก่อน
    } finally {
      setBusyId(null);
    }
  }

  async function handleRestore(id: string) {
    setBusyId(id);
    try {
      await apiClient.patch(`/bookings/${id}/admin-restore`);
      reload();
    } catch {
      // เงียบไว้ก่อน — ปุ่มจะกลับมากดใหม่ได้ปกติ ไม่ต้องพังทั้งหน้า
    } finally {
      setBusyId(null);
    }
  }

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
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <FilterTabs options={FILTERS} value={statusFilter} onChange={setStatusFilter} />
        <button
          onClick={handleExport}
          className="shrink-0 rounded-btn border border-card-border bg-white px-4 py-2 text-sm font-semibold text-ink-body"
        >
          {t.export}
        </button>
      </div>

      <div className="mt-4 overflow-x-auto rounded-card-lg border border-card-border bg-white px-2 shadow-card">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead>
            <tr className="border-b border-hairline text-xs text-ink-faint">
              <th className="p-3 font-normal">{t.bookingId}</th>
              <th className="p-3 font-normal">{t.booker}</th>
              <th className="p-3 font-normal">{t.dorm}</th>
              <th className="p-3 font-normal">{t.checkIn}</th>
              <th className="p-3 font-normal">{t.amount}</th>
              <th className="p-3 font-normal">{t.status}</th>
              <th className="p-3 font-normal">{t.room}</th>
              <th className="p-3 font-normal"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((b) => {
              const status = normalizeStatus(b.status);
              const badge = bookingStatusBadge(status, lang);
              const isPaid = status === 'paid';
              const canCancel = status === 'pending' || status === 'confirmed' || isPaid;
              const canRestore = status === 'cancelled';
              const roomOccupied = (b.room?.status ?? '').toUpperCase() === 'OCCUPIED';
              return (
                <tr key={b.id} className="border-b border-hairline last:border-0">
                  <td className="p-3 font-sans text-ink-subtitle">#{b.id.slice(0, 8).toUpperCase()}</td>
                  <td className="p-3 font-medium text-ink-strong">{b.contactName}</td>
                  <td className="p-3 text-ink-subtitle">{b.room?.dorm?.name ?? '—'}</td>
                  <td className="p-3 text-ink-subtitle">{new Date(b.checkInDate).toLocaleDateString(t.dateLocale)}</td>
                  <td className="p-3 font-sans font-semibold tabular-nums">฿{b.amount.toLocaleString()}</td>
                  <td className="p-3">
                    <Badge label={badge.label} variant={badge.variant} />
                  </td>
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      <Badge
                        label={roomOccupied ? t.roomOccupied : t.roomFree}
                        variant={roomOccupied ? 'critical' : 'good'}
                      />
                      <button
                        onClick={() => handleRoomStatus(b.roomId, roomOccupied ? 'AVAILABLE' : 'OCCUPIED')}
                        disabled={busyId === b.roomId}
                        className="text-xs font-semibold text-tenant hover:underline disabled:opacity-50"
                      >
                        {roomOccupied ? t.returnRoom : t.cutRoom}
                      </button>
                    </div>
                  </td>
                  <td className="p-3">
                    {canCancel && (
                      <button
                        onClick={() => handleCancel(b.id, isPaid)}
                        disabled={busyId === b.id}
                        className="text-sm font-semibold text-danger hover:underline disabled:opacity-50"
                      >
                        {busyId === b.id ? t.cancelling : isPaid ? t.refundCancel : t.cancel}
                      </button>
                    )}
                    {canRestore && (
                      <button
                        onClick={() => handleRestore(b.id)}
                        disabled={busyId === b.id}
                        className="text-sm font-semibold text-success hover:underline disabled:opacity-50"
                      >
                        {busyId === b.id ? t.restoring : t.restore}
                      </button>
                    )}
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
