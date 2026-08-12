'use client';

import { useEffect, useState } from 'react';
import { downloadCsv } from '@/lib/csv';
import { apiClient } from '@/lib/api-client';
import { getSocket } from '@/lib/ws';
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
      { value: 'pending', label: 'รอชำระเงิน' },
      { value: 'paid', label: 'ชำระเงินแล้ว' },
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
      { value: 'pending', label: 'Awaiting payment' },
      { value: 'paid', label: 'Paid' },
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

// ปุ่ม action — สีตามความหมาย: ตัด/คืนห้อง=น้ำเงิน · ยกเลิก(คืนเงิน)=แดง · กู้คืน=เขียว
const ACT = 'rounded-[8px] px-2.5 py-1 text-[12px] font-semibold transition hover:brightness-95 disabled:opacity-50';
const ACT_MOBILE = 'rounded-[9px] px-3 py-1.5 text-[12.5px] font-semibold transition hover:brightness-95 disabled:opacity-50';
const ACT_STYLE: Record<string, React.CSSProperties> = {
  room: { background: '#EAF1FD', color: '#2456B8' },
  cancel: { background: '#FDECEC', color: '#C0392B' },
  restore: { background: '#E9F7EF', color: '#12813F' },
};

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

  // อัปเดตสดเมื่อมีการจองใหม่/สถานะเปลี่ยน — ไม่ต้องกดรีเฟรช
  useEffect(() => {
    const socket = getSocket();
    socket.on('booking:new', reload);
    socket.on('booking:updated', reload);
    return () => {
      socket.off('booking:new', reload);
      socket.off('booking:updated', reload);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = statusFilter
    ? bookings.filter((b) => normalizeStatus(b.status) === statusFilter)
    : bookings;

  const count = (status: string) =>
    status ? bookings.filter((b) => normalizeStatus(b.status) === status).length : bookings.length;

  const tones = ['total', 'warning', 'good', 'critical', 'neutral'] as const;
  const FILTERS = t.filters.map((f, i) => ({ ...f, count: count(f.value), tone: tones[i] }));

  function handleExport() {
    downloadCsv(
      'bookings',
      t.csvHeader.split(','),
      filtered.map((b) => [b.id, b.contactName, b.contactPhone, b.checkInDate, b.amount, normalizeStatus(b.status)]),
    );
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

      {/* จอ md ขึ้นไป: ตารางพอดีความกว้าง ไม่ต้องเลื่อนแนวนอน */}
      <div className="mt-4 hidden rounded-card-lg border border-card-border bg-white px-2 shadow-card md:block">
        <table className="w-full table-fixed text-left text-[13px]">
          <colgroup>
            <col className="w-[11%]" />
            <col className="w-[14%]" />
            <col className="w-[15%]" />
            <col className="w-[10%]" />
            <col className="w-[10%]" />
            <col className="w-[11%]" />
            <col className="w-[16%]" />
            <col className="w-[13%]" />
          </colgroup>
          <thead>
            <tr className="border-b border-hairline text-[11.5px] text-ink-faint">
              <th className="p-2.5 font-normal">{t.bookingId}</th>
              <th className="p-2.5 font-normal">{t.booker}</th>
              <th className="p-2.5 font-normal">{t.dorm}</th>
              <th className="p-2.5 font-normal">{t.checkIn}</th>
              <th className="p-2.5 text-right font-normal">{t.amount}</th>
              <th className="p-2.5 font-normal">{t.status}</th>
              <th className="p-2.5 font-normal">{t.room}</th>
              <th className="p-2.5 font-normal"></th>
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
                  <td className="truncate p-2.5 font-sans font-bold text-admin">#{b.id.slice(0, 8).toUpperCase()}</td>
                  <td className="truncate p-2.5 font-medium text-ink-strong" title={b.contactName}>
                    {b.contactName}
                  </td>
                  <td className="truncate p-2.5 text-ink-subtitle" title={b.room?.dorm?.name ?? ''}>
                    {b.room?.dorm?.name ?? '—'}
                  </td>
                  <td className="truncate p-2.5 text-ink-subtitle">
                    {new Date(b.checkInDate).toLocaleDateString(t.dateLocale)}
                  </td>
                  <td className="p-2.5 text-right font-sans font-semibold tabular-nums">
                    ฿{b.amount.toLocaleString()}
                  </td>
                  <td className="p-2.5">
                    <Badge label={badge.label} variant={badge.variant} />
                  </td>
                  <td className="p-2.5">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <Badge
                        label={roomOccupied ? t.roomOccupied : t.roomFree}
                        variant={roomOccupied ? 'critical' : 'good'}
                      />
                      <button
                        onClick={() => handleRoomStatus(b.roomId, roomOccupied ? 'AVAILABLE' : 'OCCUPIED')}
                        disabled={busyId === b.roomId}
                        className={ACT}
                        style={ACT_STYLE.room}
                      >
                        {roomOccupied ? t.returnRoom : t.cutRoom}
                      </button>
                    </div>
                  </td>
                  <td className="p-2.5">
                    {canCancel && (
                      <button
                        onClick={() => handleCancel(b.id, isPaid)}
                        disabled={busyId === b.id}
                        className={ACT}
                        style={ACT_STYLE.cancel}
                      >
                        {busyId === b.id ? t.cancelling : isPaid ? t.refundCancel : t.cancel}
                      </button>
                    )}
                    {canRestore && (
                      <button
                        onClick={() => handleRestore(b.id)}
                        disabled={busyId === b.id}
                        className={ACT}
                        style={ACT_STYLE.restore}
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

      {/* มือถือ: การ์ดต่อการจอง */}
      <div className="mt-4 flex flex-col gap-2.5 md:hidden">
        {filtered.map((b) => {
          const status = normalizeStatus(b.status);
          const badge = bookingStatusBadge(status, lang);
          const isPaid = status === 'paid';
          const canCancel = status === 'pending' || status === 'confirmed' || isPaid;
          const canRestore = status === 'cancelled';
          const roomOccupied = (b.room?.status ?? '').toUpperCase() === 'OCCUPIED';
          return (
            <div key={b.id} className="rounded-card-lg border border-card-border bg-white p-3.5 shadow-card">
              <div className="flex items-center justify-between gap-2">
                <span className="font-sans text-[12.5px] font-bold text-admin">#{b.id.slice(0, 8).toUpperCase()}</span>
                <Badge label={badge.label} variant={badge.variant} />
              </div>

              <div className="mt-1.5 truncate text-[14px] font-semibold text-ink-strong">{b.contactName}</div>
              <div className="truncate text-[12.5px] text-ink-muted">{b.room?.dorm?.name ?? '—'}</div>

              <div className="mt-2 flex items-center justify-between gap-2 rounded-[10px] bg-surface-canvas px-3 py-2 text-[12.5px]">
                <span className="text-ink-body">{new Date(b.checkInDate).toLocaleDateString(t.dateLocale)}</span>
                <span className="font-sans font-bold tabular-nums text-ink-strong">฿{b.amount.toLocaleString()}</span>
              </div>

              <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                <Badge
                  label={roomOccupied ? t.roomOccupied : t.roomFree}
                  variant={roomOccupied ? 'critical' : 'good'}
                />
                <button
                  onClick={() => handleRoomStatus(b.roomId, roomOccupied ? 'AVAILABLE' : 'OCCUPIED')}
                  disabled={busyId === b.roomId}
                  className={ACT_MOBILE}
                  style={ACT_STYLE.room}
                >
                  {roomOccupied ? t.returnRoom : t.cutRoom}
                </button>
                {canCancel && (
                  <button
                    onClick={() => handleCancel(b.id, isPaid)}
                    disabled={busyId === b.id}
                    className={ACT_MOBILE}
                    style={ACT_STYLE.cancel}
                  >
                    {busyId === b.id ? t.cancelling : isPaid ? t.refundCancel : t.cancel}
                  </button>
                )}
                {canRestore && (
                  <button
                    onClick={() => handleRestore(b.id)}
                    disabled={busyId === b.id}
                    className={ACT_MOBILE}
                    style={ACT_STYLE.restore}
                  >
                    {busyId === b.id ? t.restoring : t.restore}
                  </button>
                )}
              </div>
            </div>
          );
        })}
        {filtered.length === 0 && <p className="text-ink-faint">{t.noData}</p>}
      </div>
    </div>
  );
}
