'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api-client';
import type { Dorm, Room } from '@hopak/shared';

export default function DormDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [dorm, setDorm] = useState<(Dorm & { rooms: Room[] }) | null>(null);

  useEffect(() => {
    apiClient.get<Dorm & { rooms: Room[] }>(`/dorms/${id}`).then(setDorm);
  }, [id]);

  if (!dorm) return <main className="p-6">กำลังโหลด...</main>;

  return (
    <main className="mx-auto max-w-3xl p-6">
      <h1 className="text-2xl font-bold">{dorm.name}</h1>
      <p className="mt-1 text-gray-600">{dorm.province}</p>
      <p className="mt-4">{dorm.description}</p>
      <p className="mt-2 text-sm text-gray-500">
        พิกัด: {dorm.lat}, {dorm.lng}
      </p>
      <p className="mt-1 text-sm text-gray-500">
        ค่าน้ำ {dorm.waterRate} บาท · ค่าไฟ {dorm.electricRate} บาท · มัดจำ {dorm.deposit} บาท
      </p>

      <h2 className="mt-6 font-semibold">ห้องว่าง</h2>
      <div className="mt-2 flex flex-col gap-2">
        {dorm.rooms
          .filter((r) => r.status === 'available')
          .map((room) => (
            <div key={room.id} className="flex items-center justify-between rounded border p-3">
              <span>{room.type === 'air' ? 'แอร์' : 'พัดลม'} — {room.pricePerMonth} บาท/เดือน</span>
              <button
                onClick={() => router.push(`/bookings/new?roomId=${room.id}`)}
                className="rounded bg-green-600 px-3 py-1 text-white"
              >
                จอง
              </button>
            </div>
          ))}
      </div>
    </main>
  );
}
