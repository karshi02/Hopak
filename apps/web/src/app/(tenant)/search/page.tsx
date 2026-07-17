'use client';

import { useState } from 'react';
import Link from 'next/link';
import { PROVINCES } from '@hopak/shared';
import { useDormSearch } from '@/hooks/useDormSearch';
import { PageLoader } from '@/components/PageLoader';

export default function SearchPage() {
  const [province, setProvince] = useState<string>('');
  const { dorms, loading } = useDormSearch({ province: province || undefined });

  return (
    <main className="mx-auto max-w-6xl p-6">
      <h1 className="text-xl font-bold text-ink-strong dark:text-white">ค้นหาหอพัก</h1>

      <div className="mt-4 flex flex-wrap items-center gap-2.5">
        <button
          onClick={() => setProvince('')}
          className={`rounded-full px-4 py-2 text-sm font-semibold ${
            province === '' ? 'bg-tenant text-white' : 'border border-card-border text-ink'
          }`}
        >
          ทั้งหมด
        </button>
        {PROVINCES.map((p) => (
          <button
            key={p}
            onClick={() => setProvince(p)}
            className={`rounded-full px-4 py-2 text-sm font-medium ${
              province === p ? 'bg-tenant text-white' : 'border border-card-border text-ink'
            }`}
          >
            {p}
          </button>
        ))}
      </div>

      {loading ? (
        <PageLoader fullScreen />
      ) : (
        <>
          <div className="mt-6 flex items-baseline justify-between">
            <h2 className="font-semibold text-ink-strong dark:text-white">
              หอพักทั้งหมด{province ? `ใน${province}` : ''}
            </h2>
            <span className="text-sm text-ink-faint">{dorms.length} แห่ง</span>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {dorms.map((dorm) => {
              const availableRooms = dorm.rooms?.filter((r) => r.status.toUpperCase() === 'AVAILABLE') ?? [];
              const startingRoom = [...availableRooms].sort((a, b) => a.pricePerMonth - b.pricePerMonth)[0];

              return (
                <Link
                  key={dorm.id}
                  href={`/dorms/${dorm.id}`}
                  className="block overflow-hidden rounded-card border border-card-border bg-white hover:shadow-md dark:border-white/10 dark:bg-[#1a1a19]"
                >
                  <div className="relative flex h-36 items-center justify-center bg-surface-canvas font-mono text-xs text-ink-faint dark:bg-[#2c2c2a]">
                    รูปหอพัก
                    {availableRooms.length > 0 && (
                      <span className="absolute right-3 top-3 rounded-full bg-white/95 px-2.5 py-1 text-xs font-semibold text-success">
                        ว่าง {availableRooms.length} ห้อง
                      </span>
                    )}
                  </div>
                  <div className="p-4">
                    <h3 className="truncate font-semibold text-ink-strong dark:text-white">{dorm.name}</h3>
                    <p className="mt-0.5 text-sm text-ink-subtitle">{dorm.province}</p>
                    {dorm.amenities.length > 0 && (
                      <div className="mt-2.5 flex flex-wrap gap-1.5">
                        {dorm.amenities.slice(0, 3).map((a) => (
                          <span key={a} className="rounded-md bg-surface-canvas px-2 py-1 text-xs text-ink-subtitle">
                            {a}
                          </span>
                        ))}
                      </div>
                    )}
                    <p className="mt-3 text-sm">
                      {startingRoom ? (
                        <>
                          <span className="font-sans text-lg font-bold text-ink-strong dark:text-white">
                            ฿{startingRoom.pricePerMonth.toLocaleString()}
                          </span>
                          <span className="text-ink-faint"> / เดือน</span>
                        </>
                      ) : (
                        <span className="text-ink-faint">ห้องเต็ม</span>
                      )}
                    </p>
                  </div>
                </Link>
              );
            })}
            {dorms.length === 0 && <p className="text-ink-faint">ไม่พบหอพัก</p>}
          </div>
        </>
      )}
    </main>
  );
}
