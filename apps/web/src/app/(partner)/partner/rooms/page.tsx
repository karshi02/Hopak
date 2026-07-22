'use client';

import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api-client';
import { normalizeStatus } from '@/lib/normalize';
import { useLang } from '@/hooks/useLang';
import { Badge, roomStatusBadge } from '@/components/dashboard/Badge';
import { StatTile } from '@/components/dashboard/StatTile';
import type { Dorm, Room } from '@hopak/shared';

type DormWithRooms = Dorm & { rooms: Room[] };

const TEXT = {
  th: {
    title: 'จัดการห้อง',
    noDorms: 'ยังไม่มีหอพัก',
    total: 'ทั้งหมด',
    available: 'ว่าง',
    occupied: 'ไม่ว่าง',
    roomType: 'ประเภทห้อง',
    pricePerMonth: 'ราคา/เดือน',
    status: 'สถานะ',
    air: 'ห้องแอร์',
    fan: 'ห้องพัดลม',
    markOccupied: 'ตัดห้อง',
    markAvailable: 'เปิดว่าง',
    noRooms: 'หอนี้ยังไม่มีห้อง',
  },
  en: {
    title: 'Manage Rooms',
    noDorms: 'No dorms yet',
    total: 'Total',
    available: 'Available',
    occupied: 'Occupied',
    roomType: 'Room type',
    pricePerMonth: 'Price / month',
    status: 'Status',
    air: 'Air-conditioned',
    fan: 'Fan room',
    markOccupied: 'Mark occupied',
    markAvailable: 'Mark available',
    noRooms: 'This dorm has no rooms yet',
  },
};

export default function PartnerRoomsPage() {
  const { lang } = useLang();
  const t = TEXT[lang];
  const [dorms, setDorms] = useState<DormWithRooms[]>([]);
  const [selectedDormId, setSelectedDormId] = useState('');

  function reload() {
    apiClient.get<DormWithRooms[]>('/dorms/mine').then((data) => {
      setDorms(data);
      setSelectedDormId((prev) => prev || data[0]?.id || '');
    });
  }

  useEffect(reload, []);

  const selectedDorm = dorms.find((d) => d.id === selectedDormId);
  const rooms = selectedDorm?.rooms ?? [];
  const available = rooms.filter((r) => r.status.toUpperCase() === 'AVAILABLE').length;

  async function toggleStatus(roomId: string, current: string) {
    const next = normalizeStatus(current) === 'available' ? 'OCCUPIED' : 'AVAILABLE';
    await apiClient.patch(`/rooms/${roomId}/status`, { status: next });
    reload();
  }

  return (
    <div>
      <h1 className="text-xl font-bold text-ink-strong dark:text-white">{t.title}</h1>

      {dorms.length === 0 ? (
        <p className="mt-4 text-ink-faint">{t.noDorms}</p>
      ) : (
        <>
          <div className="mt-4 flex items-center justify-between">
            <select
              value={selectedDormId}
              onChange={(e) => setSelectedDormId(e.target.value)}
              className="rounded-btn border border-card-border px-3.5 py-2 text-sm dark:border-white/10 dark:bg-[#1a1a19]"
            >
              {dorms.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>

          <div className="mt-4 grid grid-cols-3 gap-4">
            <StatTile label={t.total} value={`${rooms.length}`} />
            <div className="rounded-card bg-seller-tint p-4">
              <p className="text-sm text-seller">{t.available}</p>
              <p className="mt-1.5 font-sans text-2xl font-bold text-seller">{available}</p>
            </div>
            <StatTile label={t.occupied} value={`${rooms.length - available}`} />
          </div>

          <div className="mt-4 overflow-x-auto rounded-card border border-card-border dark:border-white/10">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-card-border text-xs text-ink-faint dark:border-white/10">
                  <th className="p-3 font-normal">{t.roomType}</th>
                  <th className="p-3 font-normal">{t.pricePerMonth}</th>
                  <th className="p-3 font-normal">{t.status}</th>
                  <th className="p-3 font-normal"></th>
                </tr>
              </thead>
              <tbody>
                {rooms.map((room) => {
                  const badge = roomStatusBadge(room.status, lang);
                  const isAvailable = normalizeStatus(room.status) === 'available';
                  return (
                    <tr key={room.id} className="border-t border-card-border dark:border-white/10">
                      <td className="p-3 font-medium text-ink-strong dark:text-white">
                        {room.type.toUpperCase() === 'AIR' ? t.air : t.fan}
                      </td>
                      <td className="p-3 font-sans tabular-nums">฿{room.pricePerMonth.toLocaleString()}</td>
                      <td className="p-3">
                        <Badge label={badge.label} variant={badge.variant} />
                      </td>
                      <td className="p-3 text-right">
                        <button
                          onClick={() => toggleStatus(room.id, room.status)}
                          className={`text-sm font-semibold ${isAvailable ? 'text-danger' : 'text-seller'}`}
                        >
                          {isAvailable ? t.markOccupied : t.markAvailable}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {rooms.length === 0 && <p className="p-4 text-ink-faint">{t.noRooms}</p>}
          </div>
        </>
      )}
    </div>
  );
}
