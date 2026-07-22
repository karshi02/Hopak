'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api-client';
import { PROVINCES } from '@hopak/shared';
import { useLang } from '@/hooks/useLang';

const MapPicker = dynamic(() => import('@/components/map/MapPicker'), { ssr: false });

const MAHASARAKHAM = { lat: 16.246, lng: 103.252 };

const PROVINCE_LABEL = {
  th: { มหาสารคาม: 'มหาสารคาม', ขอนแก่น: 'ขอนแก่น', เชียงใหม่: 'เชียงใหม่' } as Record<string, string>,
  en: { มหาสารคาม: 'Mahasarakham', ขอนแก่น: 'Khon Kaen', เชียงใหม่: 'Chiang Mai' } as Record<string, string>,
};

const TEXT = {
  th: {
    title: 'เพิ่มหอพัก',
    namePlaceholder: 'ชื่อหอพัก',
    descPlaceholder: 'คำอธิบาย',
    pinInstruction: 'ปักหมุดตำแหน่งหอพัก (คลิกหรือลากหมุด)',
    coords: 'พิกัด',
    waterPlaceholder: 'ค่าน้ำ',
    electricPlaceholder: 'ค่าไฟ',
    depositPlaceholder: 'มัดจำ',
    save: 'บันทึก',
    createError: 'เพิ่มหอพักไม่สำเร็จ',
  },
  en: {
    title: 'Add Dorm',
    namePlaceholder: 'Dorm name',
    descPlaceholder: 'Description',
    pinInstruction: 'Pin the dorm location (click or drag the pin)',
    coords: 'Coordinates',
    waterPlaceholder: 'Water rate',
    electricPlaceholder: 'Electricity rate',
    depositPlaceholder: 'Deposit',
    save: 'Save',
    createError: 'Failed to add dorm',
  },
};

export default function NewDormPage() {
  const router = useRouter();
  const { lang } = useLang();
  const t = TEXT[lang];
  const [form, setForm] = useState({
    name: '',
    description: '',
    province: PROVINCES[0] as string,
    lat: MAHASARAKHAM.lat,
    lng: MAHASARAKHAM.lng,
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
      setError(err instanceof Error ? err.message : t.createError);
    }
  }

  return (
    <div className="max-w-lg">
      <h1 className="text-xl font-bold text-ink-strong dark:text-white">{t.title}</h1>
      <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-3">
        <input
          placeholder={t.namePlaceholder}
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          className="rounded-lg border border-card-border px-3 py-2 dark:border-white/10 dark:bg-[#1a1a19]"
          required
        />
        <textarea
          placeholder={t.descPlaceholder}
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          className="rounded-lg border border-card-border px-3 py-2 dark:border-white/10 dark:bg-[#1a1a19]"
          required
        />
        <select
          value={form.province}
          onChange={(e) => setForm({ ...form, province: e.target.value })}
          className="rounded-lg border border-card-border px-3 py-2 dark:border-white/10 dark:bg-[#1a1a19]"
        >
          {PROVINCES.map((p) => (
            <option key={p} value={p}>
              {PROVINCE_LABEL[lang][p] ?? p}
            </option>
          ))}
        </select>

        <div>
          <p className="mb-1.5 text-sm text-ink-faint">{t.pinInstruction}</p>
          <MapPicker
            lat={form.lat}
            lng={form.lng}
            onChange={(lat, lng) => setForm({ ...form, lat, lng })}
          />
          <p className="mt-1 text-xs tabular-nums text-ink-faint">
            {t.coords}: {form.lat.toFixed(5)}, {form.lng.toFixed(5)}
          </p>
        </div>

        <input
          type="number"
          placeholder={t.waterPlaceholder}
          value={form.waterRate}
          onChange={(e) => setForm({ ...form, waterRate: Number(e.target.value) })}
          className="rounded-lg border border-card-border px-3 py-2 dark:border-white/10 dark:bg-[#1a1a19]"
        />
        <input
          type="number"
          placeholder={t.electricPlaceholder}
          value={form.electricRate}
          onChange={(e) => setForm({ ...form, electricRate: Number(e.target.value) })}
          className="rounded-lg border border-card-border px-3 py-2 dark:border-white/10 dark:bg-[#1a1a19]"
        />
        <input
          type="number"
          placeholder={t.depositPlaceholder}
          value={form.deposit}
          onChange={(e) => setForm({ ...form, deposit: Number(e.target.value) })}
          className="rounded-lg border border-card-border px-3 py-2 dark:border-white/10 dark:bg-[#1a1a19]"
        />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button type="submit" className="rounded-lg bg-seller py-2.5 text-sm font-medium text-white hover:bg-seller-dark">
          {t.save}
        </button>
      </form>
    </div>
  );
}
