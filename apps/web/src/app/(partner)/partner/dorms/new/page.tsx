'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api-client';
import { PROVINCES } from '@hopak/shared';

export default function NewDormPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    name: '',
    description: '',
    province: PROVINCES[0] as string,
    lat: 0,
    lng: 0,
    waterRate: 0,
    electricRate: 0,
    deposit: 0,
  });
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      const dorm = await apiClient.post<{ id: string }>('/dorms', {
        ...form,
        amenities: [],
        images: [],
      });
      router.push(`/partner/dorms/${dorm.id}/edit`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'เพิ่มหอพักไม่สำเร็จ');
    }
  }

  return (
    <div className="max-w-lg">
      <h1 className="text-xl font-bold">เพิ่มหอพัก</h1>
      <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-3">
        <input
          placeholder="ชื่อหอพัก"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          className="rounded border px-3 py-2"
          required
        />
        <textarea
          placeholder="คำอธิบาย"
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          className="rounded border px-3 py-2"
          required
        />
        <select
          value={form.province}
          onChange={(e) => setForm({ ...form, province: e.target.value })}
          className="rounded border px-3 py-2"
        >
          {PROVINCES.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
        <div className="flex gap-2">
          <input
            type="number"
            placeholder="lat"
            value={form.lat}
            onChange={(e) => setForm({ ...form, lat: Number(e.target.value) })}
            className="w-1/2 rounded border px-3 py-2"
          />
          <input
            type="number"
            placeholder="lng"
            value={form.lng}
            onChange={(e) => setForm({ ...form, lng: Number(e.target.value) })}
            className="w-1/2 rounded border px-3 py-2"
          />
        </div>
        <input
          type="number"
          placeholder="ค่าน้ำ"
          value={form.waterRate}
          onChange={(e) => setForm({ ...form, waterRate: Number(e.target.value) })}
          className="rounded border px-3 py-2"
        />
        <input
          type="number"
          placeholder="ค่าไฟ"
          value={form.electricRate}
          onChange={(e) => setForm({ ...form, electricRate: Number(e.target.value) })}
          className="rounded border px-3 py-2"
        />
        <input
          type="number"
          placeholder="มัดจำ"
          value={form.deposit}
          onChange={(e) => setForm({ ...form, deposit: Number(e.target.value) })}
          className="rounded border px-3 py-2"
        />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button type="submit" className="rounded bg-green-600 px-4 py-2 text-white">
          บันทึก
        </button>
      </form>
    </div>
  );
}
