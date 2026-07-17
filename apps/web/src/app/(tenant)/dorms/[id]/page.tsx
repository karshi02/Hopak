'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { useParams, useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api-client';
import type { Dorm, Room } from '@hopak/shared';
import { PageLoader } from '@/components/PageLoader';

const MapPicker = dynamic(() => import('@/components/map/MapPicker'), { ssr: false });

export default function DormDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [dorm, setDorm] = useState<(Dorm & { rooms: Room[] }) | null>(null);

  useEffect(() => {
    apiClient.get<Dorm & { rooms: Room[] }>(`/dorms/${id}`).then(setDorm);
  }, [id]);

  if (!dorm) return <PageLoader fullScreen />;

  const availableRooms = dorm.rooms.filter((r) => r.status.toUpperCase() === 'AVAILABLE');
  const cheapestRoom = [...availableRooms].sort((a, b) => a.pricePerMonth - b.pricePerMonth)[0];

  return (
    <main className="mx-auto max-w-6xl p-6">
      <p className="text-xs text-ink-faint">
        <a href="/search" className="hover:text-tenant">
          ค้นหา
        </a>{' '}
        › {dorm.province} › <span className="text-ink">{dorm.name}</span>
      </p>

      <div className="mt-4 grid grid-cols-2 grid-rows-2 gap-2.5 overflow-hidden rounded-card" style={{ height: 280 }}>
        <div className="col-span-1 row-span-2 flex items-center justify-center bg-surface-canvas font-mono text-xs text-ink-faint">
          รูปหลัก
        </div>
        <div className="flex items-center justify-center bg-surface-canvas font-mono text-xs text-ink-faint">รูป</div>
        <div className="flex items-center justify-center bg-surface-canvas font-mono text-xs text-ink-faint">
          {dorm.images.length > 2 ? `+${dorm.images.length - 2} รูป` : 'รูป'}
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-8 lg:grid-cols-[1.7fr_1fr]">
        <div>
          <div className="flex items-start justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold text-ink-strong dark:text-white">{dorm.name}</h1>
              <p className="mt-1.5 text-sm text-ink-subtitle">{dorm.province}</p>
            </div>
          </div>

          <div className="my-5 h-px bg-card-border" />

          <h2 className="mb-3 font-semibold text-ink-strong dark:text-white">สิ่งอำนวยความสะดวก</h2>
          <div className="flex flex-wrap gap-2">
            {dorm.amenities.map((a) => (
              <span key={a} className="rounded-lg bg-surface-canvas px-3 py-2 text-sm text-ink">
                {a}
              </span>
            ))}
            {dorm.amenities.length === 0 && <p className="text-sm text-ink-faint">ไม่มีข้อมูล</p>}
          </div>

          <div className="mt-6 flex gap-3.5">
            <div className="flex-1 rounded-xl border border-card-border bg-surface-web p-3.5">
              <p className="text-xs text-ink-faint">ค่าไฟ</p>
              <p className="mt-0.5 font-sans text-base font-bold text-ink-strong dark:text-white">
                ฿{dorm.electricRate} / หน่วย
              </p>
            </div>
            <div className="flex-1 rounded-xl border border-card-border bg-surface-web p-3.5">
              <p className="text-xs text-ink-faint">ค่าน้ำ</p>
              <p className="mt-0.5 font-sans text-base font-bold text-ink-strong dark:text-white">
                ฿{dorm.waterRate} / หน่วย
              </p>
            </div>
            <div className="flex-1 rounded-xl border border-card-border bg-surface-web p-3.5">
              <p className="text-xs text-ink-faint">ค่ามัดจำ</p>
              <p className="mt-0.5 font-sans text-base font-bold text-ink-strong dark:text-white">
                ฿{dorm.deposit.toLocaleString()}
              </p>
            </div>
          </div>

          <h2 className="mb-3 mt-6 font-semibold text-ink-strong dark:text-white">คำอธิบายจากเจ้าของหอ</h2>
          <p className="text-sm leading-relaxed text-ink-subtitle">{dorm.description}</p>

          <h2 className="mb-3 mt-6 font-semibold text-ink-strong dark:text-white">แผนที่</h2>
          <MapPicker lat={dorm.lat} lng={dorm.lng} readOnly />

          <h2 className="mb-3 mt-6 font-semibold text-ink-strong dark:text-white">ห้องว่าง</h2>
          <div className="flex flex-col gap-2">
            {availableRooms.map((room) => (
              <div
                key={room.id}
                className="flex items-center justify-between rounded-xl border border-card-border p-3.5"
              >
                <span className="text-sm text-ink">
                  {room.type.toUpperCase() === 'AIR' ? 'ห้องแอร์' : 'ห้องพัดลม'} —{' '}
                  <b className="font-sans">฿{room.pricePerMonth.toLocaleString()}</b>/เดือน
                </span>
                <button
                  onClick={() => router.push(`/bookings/new?roomId=${room.id}`)}
                  className="rounded-btn bg-tenant px-3.5 py-1.5 text-sm font-medium text-white hover:bg-tenant-dark"
                >
                  จอง
                </button>
              </div>
            ))}
            {availableRooms.length === 0 && <p className="text-sm text-ink-faint">ไม่มีห้องว่างตอนนี้</p>}
          </div>
        </div>

        <div className="h-fit rounded-card border border-card-border bg-white p-5 shadow-sm dark:bg-[#1a1a19] lg:sticky lg:top-6">
          {cheapestRoom ? (
            <>
              <div className="flex items-baseline gap-1.5">
                <span className="font-sans text-2xl font-bold text-ink-strong dark:text-white">
                  ฿{cheapestRoom.pricePerMonth.toLocaleString()}
                </span>
                <span className="text-sm text-ink-faint">/ เดือน</span>
              </div>
              <span className="mt-1.5 inline-block rounded-full bg-success/10 px-2.5 py-1 text-xs font-semibold text-success">
                ว่าง {availableRooms.length} ห้อง
              </span>
              <button
                onClick={() => router.push(`/bookings/new?roomId=${cheapestRoom.id}`)}
                className="mt-4 w-full rounded-btn bg-tenant py-3 text-sm font-semibold text-white hover:bg-tenant-dark"
              >
                จองเลย
              </button>
              <p className="mt-3.5 text-center text-xs leading-relaxed text-ink-faint">
                ส่งคำขอ → รอเจ้าของหอยืนยัน → ชำระเงิน · ยกเลิกฟรีใน 1 วัน
              </p>
            </>
          ) : (
            <p className="text-sm text-ink-faint">ไม่มีห้องว่างในขณะนี้</p>
          )}
        </div>
      </div>
    </main>
  );
}
