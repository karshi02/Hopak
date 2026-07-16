'use client';

import { useState } from 'react';
import { apiClient } from '@/lib/api-client';
import type { Room } from '@hopak/shared';

export default function PartnerRoomsPage() {
  const [dormId, setDormId] = useState('');
  const [rooms, setRooms] = useState<Room[]>([]);

  async function loadRooms() {
    if (!dormId) return;
    const data = await apiClient.get<Room[]>(`/dorms/${dormId}/rooms`);
    setRooms(data);
  }

  async function toggleStatus(roomId: string, current: string) {
    const next = current === 'available' ? 'OCCUPIED' : 'AVAILABLE';
    await apiClient.patch(`/rooms/${roomId}/status`, { status: next });
    loadRooms();
  }

  return (
    <div>
      <h1 className="text-xl font-bold">จัดการห้อง</h1>
      <div className="mt-4 flex gap-2">
        <input
          placeholder="Dorm ID"
          value={dormId}
          onChange={(e) => setDormId(e.target.value)}
          className="rounded border px-3 py-2"
        />
        <button onClick={loadRooms} className="rounded bg-green-600 px-4 py-2 text-white">
          โหลดห้อง
        </button>
      </div>
      <div className="mt-4 flex flex-col gap-2">
        {rooms.map((room) => (
          <div key={room.id} className="flex items-center justify-between rounded border p-3">
            <span>
              {room.type} — {room.pricePerMonth} บาท/เดือน — {room.status}
            </span>
            <button
              onClick={() => toggleStatus(room.id, room.status)}
              className="rounded border px-3 py-1"
            >
              สลับสถานะ
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
