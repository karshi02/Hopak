'use client';

import { useState } from 'react';
import Link from 'next/link';
import { PROVINCES } from '@hopak/shared';
import { useDormSearch } from '@/hooks/useDormSearch';

export default function SearchPage() {
  const [province, setProvince] = useState<string>('');
  const { dorms, loading } = useDormSearch({ province: province || undefined });

  return (
    <main className="mx-auto max-w-5xl p-6">
      <h1 className="text-xl font-bold">ค้นหาหอพัก</h1>

      <select
        value={province}
        onChange={(e) => setProvince(e.target.value)}
        className="mt-4 rounded border px-3 py-2"
      >
        <option value="">ทุกจังหวัด</option>
        {PROVINCES.map((p) => (
          <option key={p} value={p}>
            {p}
          </option>
        ))}
      </select>

      {loading ? (
        <p className="mt-6 text-gray-500">กำลังโหลด...</p>
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
          {dorms.map((dorm) => (
            <Link
              key={dorm.id}
              href={`/dorms/${dorm.id}`}
              className="block rounded border p-4 hover:shadow"
            >
              <h2 className="font-semibold">{dorm.name}</h2>
              <p className="text-sm text-gray-600">{dorm.province}</p>
              <p className="mt-2 text-sm">
                {dorm.rooms?.[0] ? `เริ่มต้น ${dorm.rooms[0].pricePerMonth} บาท/เดือน` : ''}
              </p>
            </Link>
          ))}
          {dorms.length === 0 && <p className="text-gray-500">ไม่พบหอพัก</p>}
        </div>
      )}
    </main>
  );
}
