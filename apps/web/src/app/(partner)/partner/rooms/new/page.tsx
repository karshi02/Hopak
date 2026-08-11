'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { apiClient } from '@/lib/api-client';
import { getToken } from '@/lib/auth';
import { useLang } from '@/hooks/useLang';
import { usePartnerMode } from '@/hooks/usePartnerMode';
import { COMMISSION_RATE } from '@hopak/shared';
import type { Dorm } from '@hopak/shared';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

const AMENITY_ICON: Record<string, string> = {
  ac: 'M4 6h16v9H4zM8 17v1M12 17v2M16 17v1',
  fan: 'M12 12m-2 0a2 2 0 104 0 2 2 0 10-4 0M12 10c0-4 1-6 3-6s2 3-1 5M14 12c4 0 6 1 6 3s-3 2-5-1M12 14c0 4-1 6-3 6s-2-3 1-5M10 12c-4 0-6-1-6-3s3-2 5 1',
  bath: 'M4 12h16v3a4 4 0 01-4 4H8a4 4 0 01-4-4v-3zM6 12V6a2 2 0 012-2 2 2 0 012 2',
  heater: 'M6 3h12v18H6zM12 7v3M9 14h6',
  fridge: 'M6 3h12v18H6zM6 11h12M10 6v2M10 14v3',
  bed: 'M3 18v-6a2 2 0 012-2h14a2 2 0 012 2v6M3 14h18M7 10V8a1 1 0 011-1h3v3',
  desk: 'M3 8h18M5 8v11M19 8v11M5 8V5h14v3M8 12h8',
  wardrobe: 'M6 3h12v18H6zM12 3v18M10 9h.01M14 9h.01',
  wifi: 'M5 12a10 10 0 0114 0M8 15a6 6 0 018 0M12 18h.01',
  park: 'M12 12m-9 0a9 9 0 1018 0 9 9 0 10-18 0M10 16V8h3a2.5 2.5 0 010 5h-3',
  tv: 'M3 5h18v12H3zM8 21h8',
  security: 'M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6l7-3z',
};

const AMENITY_LABEL: Record<string, { th: string; en: string }> = {
  ac: { th: 'แอร์', en: 'AC' },
  fan: { th: 'พัดลม', en: 'Fan' },
  bath: { th: 'ห้องน้ำในตัว', en: 'Private bathroom' },
  heater: { th: 'เครื่องทำน้ำอุ่น', en: 'Water heater' },
  fridge: { th: 'ตู้เย็น', en: 'Fridge' },
  bed: { th: 'เตียง', en: 'Bed' },
  desk: { th: 'โต๊ะ+เก้าอี้', en: 'Desk + chair' },
  wardrobe: { th: 'ตู้เสื้อผ้า', en: 'Wardrobe' },
  wifi: { th: 'WiFi', en: 'WiFi' },
  park: { th: 'ที่จอดรถ', en: 'Parking' },
  tv: { th: 'ทีวี', en: 'TV' },
  security: { th: 'รปภ. 24 ชม.', en: '24h security' },
};

const AMENITY_KEYS = Object.keys(AMENITY_LABEL);

function AmenityIcon({ name, size = 22 }: { name: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d={AMENITY_ICON[name]} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const TEXT = {
  th: {
    dormLabel: 'หอพัก',
    photos: 'รูปภาพห้องพัก',
    photosSub: 'รูปแรกจะเป็นรูปปกที่ผู้เช่าเห็น · แนะนำ 4–8 รูป',
    addPhoto: 'เพิ่มรูป',
    inheritedTitle: 'รูปจากหอพัก (ใช้อัตโนมัติ)',
    inheritedNote: 'ถ้าไม่อัปรูปเฉพาะห้อง ห้องนี้จะใช้รูปหอพักด้านบน และอัปเดตตามหอแบบเรียลไทม์ (ไม่กระทบโปรไฟล์หอ)',
    cover: 'ปก',
    basicInfo: 'ข้อมูลห้องพัก',
    name: 'ชื่อห้อง (ไม่บังคับ)',
    namePlaceholder: 'เว้นว่าง = สุ่มชื่อให้อัตโนมัติ',
    quantity: 'จำนวนห้องประเภทนี้',
    roomKind: 'ประเภทห้อง',
    air: 'แอร์',
    fan: 'พัดลม',
    description: 'คำอธิบายห้อง (แสดงในหน้าผู้เช่า)',
    descriptionPlaceholder: 'ห้องกว้าง ชั้น 3 วิวสระน้ำ ใกล้มหาลัย เดินทางสะดวก...',
    pricing: 'ราคา & ค่าสาธารณูปโภค',
    pricingSub: 'กำหนดค่าเช่า เงินมัดจำ และเรตค่าน้ำค่าไฟต่อหน่วย',
    pricingDaily: 'ราคาต่อคืน',
    pricingDailySub: 'ห้องรายวันคิดเป็นรายคืน ไม่มีมัดจำและค่าน้ำค่าไฟ',
    netPerNight: 'เจ้าของได้รับ / คืน (หลังหัก 20%)',
    titleMonthly: 'เพิ่มห้องพักรายเดือน',
    titleDaily: 'เพิ่มห้องพักรายวัน',
    submitDaily: 'เปิดจองรายวัน',
    rent: 'ค่าเช่า / เดือน',
    deposit: 'เงินมัดจำ',
    water: 'ค่าน้ำ / หน่วย',
    electric: 'ค่าไฟ / หน่วย',
    dailySection: 'เช่ารายวัน',
    dailySectionSub: 'เปิดให้ผู้เช่าจองเป็นรายคืน (แบบโรงแรม) นอกเหนือจากรายเดือน — ไม่เก็บมัดจำ',
    allowDailyLabel: 'เปิดให้เช่ารายวัน',
    pricePerDay: 'ราคา / คืน',
    perNight: '/คืน',
    amenities: 'สิ่งอำนวยความสะดวก & เฟอร์นิเจอร์',
    amenitiesSub: 'เลือกสิ่งที่มีในห้อง — จะแสดงเป็นไอคอนในหน้าผู้เช่า',
    saveDraft: 'ยกเลิก',
    submit: 'โพสต์ให้ผู้เช่าเห็น',
    submitting: 'กำลังบันทึก...',
    error: 'เพิ่มห้องพักไม่สำเร็จ',
    needDorm: 'ยังไม่มีหอพักที่อนุมัติแล้ว — ต้องสมัครเปิดหอพักและรอแอดมินอนุมัติก่อน',
    previewLabel: 'ตัวอย่างที่ผู้เช่าเห็น',
    previewAir: 'ห้องแอร์',
    previewFan: 'ห้องพัดลม',
    changeImage: 'คลิกเพื่อเปลี่ยนรูป',
    perMonth: '/ด.',
    bookBtn: 'จองห้องนี้',
  },
  en: {
    dormLabel: 'Dorm',
    photos: 'Room photos',
    photosSub: 'First photo is the cover tenants see · 4–8 recommended',
    addPhoto: 'Add photo',
    inheritedTitle: 'Photos from the dorm (used automatically)',
    inheritedNote: 'If you don’t upload room-specific photos, this room uses the dorm photos above and updates in realtime (does not affect the dorm profile)',
    cover: 'Cover',
    basicInfo: 'Room info',
    name: 'Room name (optional)',
    namePlaceholder: 'Leave blank to auto-generate',
    quantity: 'How many rooms of this type',
    roomKind: 'Room kind',
    air: 'Air-conditioned',
    fan: 'Fan',
    description: 'Room description (shown to tenants)',
    descriptionPlaceholder: 'Spacious room, 3rd floor, pool view, near university...',
    pricing: 'Pricing & Utilities',
    pricingSub: 'Set rent, deposit, and per-unit water/electricity rates',
    pricingDaily: 'Nightly price',
    pricingDailySub: 'Daily rooms are charged per night — no deposit or utility rates',
    netPerNight: 'You receive / night (after 20%)',
    titleMonthly: 'Add monthly room',
    titleDaily: 'Add daily room',
    submitDaily: 'Open for daily booking',
    rent: 'Rent / month',
    deposit: 'Deposit',
    water: 'Water / unit',
    electric: 'Electricity / unit',
    dailySection: 'Daily rental',
    dailySectionSub: 'Allow per-night booking (hotel-style) besides monthly — no deposit',
    allowDailyLabel: 'Enable daily rental',
    pricePerDay: 'Price / night',
    perNight: '/night',
    amenities: 'Amenities & Furniture',
    amenitiesSub: "Select what's in the room — shown as icons to tenants",
    saveDraft: 'Cancel',
    submit: 'Post for tenants to see',
    submitting: 'Saving...',
    error: 'Failed to add room',
    needDorm: 'No approved dorm yet — register and wait for admin approval first',
    previewLabel: 'Tenant preview',
    previewAir: 'Air-con room',
    previewFan: 'Fan room',
    perMonth: '/mo',
    bookBtn: 'Book this room',
  },
};

export default function NewRoomPage() {
  const router = useRouter();
  const { lang } = useLang();
  const t = TEXT[lang];
  const searchParams = useSearchParams();
  const { isDaily } = usePartnerMode();
  const [dorms, setDorms] = useState<Dorm[]>([]);
  const [dormId, setDormId] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [roomType, setRoomType] = useState<'AIR' | 'FAN'>('AIR');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState(3500);
  const [deposit, setDeposit] = useState(7000);
  const [waterRate, setWaterRate] = useState(18);
  const [electricRate, setElectricRate] = useState(8);
  // โหมดห้อง — มาจาก ?mode=daily หรือสวิตช์กลางของคอนโซล ; ห้องเป็นรายเดือน "หรือ" รายวัน อย่างใดอย่างหนึ่ง
  const allowDaily = searchParams.get('mode') === 'daily' || (!searchParams.get('mode') && isDaily);
  const [pricePerDay, setPricePerDay] = useState(590);
  const [amenities, setAmenities] = useState<Set<string>>(new Set(['ac', 'bath', 'wifi', 'bed']));
  const [photos, setPhotos] = useState<File[]>([]);
  const [photoUrls, setPhotoUrls] = useState<string[]>([]);
  const [previewIdx, setPreviewIdx] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    apiClient
      .get<Dorm[]>('/dorms/mine')
      .then((list) => {
        setDorms(list);
        if (list.length) setDormId(list[0].id);
      })
      .catch(() => setDorms([]));
  }, []);

  function toggleAmenity(key: string) {
    setAmenities((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    setPhotos((prev) => [...prev, ...files]);
    setPhotoUrls((prev) => [...prev, ...files.map((f) => URL.createObjectURL(f))]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  function removePhoto(i: number) {
    setPhotos((prev) => prev.filter((_, idx) => idx !== i));
    setPhotoUrls((prev) => prev.filter((_, idx) => idx !== i));
  }

  async function handleSubmit() {
    if (!dormId) return;
    setSubmitting(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append('type', roomType);
      // ห้องรายวันไม่มีค่าเช่ารายเดือน/มัดจำ/ค่าน้ำค่าไฟ — ส่ง 0 ไปเพื่อไม่ให้ไปโผล่ฝั่งรายเดือน
      formData.append('pricePerMonth', String(allowDaily ? 0 : price));
      formData.append('name', ''); // เว้นว่างเสมอ — backend สุ่มชื่อห้องให้อัตโนมัติ
      formData.append('description', description);
      formData.append('deposit', String(allowDaily ? 0 : deposit));
      formData.append('waterRate', String(allowDaily ? 0 : waterRate));
      formData.append('electricRate', String(allowDaily ? 0 : electricRate));
      formData.append('allowDaily', String(allowDaily));
      formData.append('pricePerDay', String(allowDaily ? pricePerDay : 0));
      formData.append('amenities', JSON.stringify(Array.from(amenities)));
      formData.append('quantity', String(quantity));
      photos.forEach((f) => formData.append('photos', f));

      const res = await fetch(`${API_URL}/dorms/${dormId}/rooms`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${getToken()}` },
        body: formData,
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message ?? t.error);
      }
      router.push('/partner/rooms');
    } catch (err) {
      setError(err instanceof Error ? err.message : t.error);
    } finally {
      setSubmitting(false);
    }
  }

  const inputClass = 'h-[46px] w-full rounded-[11px] border border-card-border px-3.5 text-sm text-ink outline-none focus:border-tenant';
  const selectedDorm = dorms.find((d) => d.id === dormId);
  // รูปที่ผู้เช่าเห็นจริงในตัวอย่าง: รูปเฉพาะห้อง (ถ้าอัป) ไม่งั้นรูปหอ
  const previewImages = photoUrls.length ? photoUrls : selectedDorm?.images ?? [];

  if (dorms.length === 0) {
    return <p className="text-ink-faint">{t.needDorm}</p>;
  }

  return (
    <div className="grid grid-cols-1 items-start gap-5 xl:grid-cols-[1fr_360px]">
      {/* ===== FORM ===== */}
      <div className="flex flex-col gap-[18px]">
        {dorms.length > 1 && (
          <div className="rounded-card-lg border border-card-border bg-white p-5 shadow-card">
            <label className="mb-1.5 block text-xs font-medium text-ink-muted">{t.dormLabel}</label>
            <select value={dormId} onChange={(e) => setDormId(e.target.value)} className={inputClass}>
              {dorms.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* photos */}
        <div className="rounded-card-lg border border-card-border bg-white p-[22px] shadow-card">
          <div className="text-[15.5px] font-bold text-ink-strong">{t.photos}</div>
          <p className="mb-4 mt-1 text-[12.5px] text-ink-muted">{t.photosSub}</p>

          {/* รูปหอพัก (ดึงมาอัตโนมัติ) — ใช้เมื่อไม่อัปรูปเฉพาะห้อง อัปเดตตามหอแบบเรียลไทม์ */}
          {selectedDorm?.images && selectedDorm.images.length > 0 && photos.length === 0 && (
            <div className="mb-4 rounded-[13px] border border-dashed border-tenant/40 bg-tenant-tint/40 p-3">
              <div className="mb-2 flex items-center gap-1.5 text-[12.5px] font-semibold text-tenant-dark">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                  <path d="M3 10l9-6 9 6M5 9v10h14V9M9 19v-6h6v6" stroke="#1E4FB0" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                {t.inheritedTitle}
              </div>
              <div className="grid grid-cols-4 gap-2">
                {selectedDorm.images.slice(0, 8).map((url) => (
                  <div key={url} className="relative aspect-square overflow-hidden rounded-lg bg-surface-canvas">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={url} alt="" className="h-full w-full object-cover" />
                  </div>
                ))}
              </div>
              <p className="mt-2 text-[11.5px] leading-snug text-ink-muted">{t.inheritedNote}</p>
            </div>
          )}

          <div className="grid grid-cols-4 gap-3">
            {photoUrls.map((url, i) => (
              <div key={url} className="relative aspect-square overflow-hidden rounded-xl bg-surface-canvas">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={url} alt="" className="h-full w-full object-cover" />
                {i === 0 && (
                  <span className="absolute bottom-2 left-2 rounded-md bg-black/50 px-2 py-0.5 text-[10.5px] font-semibold text-white">
                    {t.cover}
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => removePhoto(i)}
                  className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-black/50 text-xs text-white"
                >
                  ✕
                </button>
              </div>
            ))}
            <label className="flex aspect-square cursor-pointer flex-col items-center justify-center gap-1.5 rounded-xl border-[1.5px] border-dashed border-card-border text-ink-faint">
              <input ref={fileInputRef} type="file" accept="image/*" multiple onChange={handlePhotoChange} className="hidden" />
              <span className="text-2xl leading-none">+</span>
              <span className="text-[11px]">{t.addPhoto}</span>
            </label>
          </div>
        </div>

        {/* basic info */}
        <div className="rounded-card-lg border border-card-border bg-white p-[22px] shadow-card">
          <div className="mb-4 text-[15.5px] font-bold text-ink-strong">{t.basicInfo}</div>
          <div>
            <label className="mb-1.5 block text-xs text-ink-muted">{t.quantity}</label>
            <input
              type="number"
              min={1}
              max={50}
              value={quantity}
              onChange={(e) => setQuantity(Math.max(1, Number(e.target.value)))}
              className={`${inputClass} font-sans`}
            />
          </div>
          <div className="mt-3.5">
            <label className="mb-1.5 block text-xs text-ink-muted">{t.roomKind}</label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setRoomType('AIR')}
                className={`flex-1 rounded-[11px] py-2.5 text-sm font-semibold ${roomType === 'AIR' ? 'bg-tenant text-white' : 'bg-surface-canvas text-ink-body'}`}
              >
                {t.air}
              </button>
              <button
                type="button"
                onClick={() => setRoomType('FAN')}
                className={`flex-1 rounded-[11px] py-2.5 text-sm font-semibold ${roomType === 'FAN' ? 'bg-tenant text-white' : 'bg-surface-canvas text-ink-body'}`}
              >
                {t.fan}
              </button>
            </div>
          </div>
          <div className="mt-3.5">
            <label className="mb-1.5 block text-xs text-ink-muted">{t.description}</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t.descriptionPlaceholder}
              rows={3}
              className="w-full rounded-[11px] border border-card-border p-3.5 text-[13.5px] text-ink-body outline-none focus:border-tenant"
            />
          </div>
        </div>

        {/* pricing */}
        <div className="rounded-card-lg border border-card-border bg-white p-[22px] shadow-card">
          <div className="text-[15.5px] font-bold text-ink-strong">{allowDaily ? t.pricingDaily : t.pricing}</div>
          <p className="mb-4 mt-1 text-[12.5px] text-ink-muted">{allowDaily ? t.pricingDailySub : t.pricingSub}</p>
          {allowDaily ? (
            // โหมดรายวัน — คิดต่อคืนอย่างเดียว ไม่มีค่าเช่ารายเดือน/มัดจำ/ค่าน้ำค่าไฟ
            <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
              <div className="rounded-[13px] border border-hairline p-3.5">
                <div className="mb-2 text-xs text-ink-muted">{t.pricePerDay}</div>
                <div className="flex items-center gap-1">
                  <span className="font-sans text-lg font-bold">฿</span>
                  <input
                    type="number"
                    min={0}
                    value={pricePerDay}
                    onChange={(e) => setPricePerDay(Math.max(0, Number(e.target.value)))}
                    className="w-full font-sans text-2xl font-bold text-ink-strong outline-none"
                  />
                  <span className="shrink-0 text-sm font-medium text-ink-muted">{t.perNight}</span>
                </div>
              </div>
              {/* ยอดที่เจ้าของได้รับจริงต่อคืน หลังหักค่าคอม 20% */}
              <div className="rounded-[13px] border border-hairline bg-success-tint p-3.5">
                <div className="mb-2 text-xs font-semibold text-success">{t.netPerNight}</div>
                <div className="font-sans text-2xl font-bold text-success">
                  ฿{Math.round(pricePerDay * (1 - COMMISSION_RATE)).toLocaleString()}
                </div>
                <div className="mt-1 text-[11.5px] text-ink-muted">
                  ฿{pricePerDay.toLocaleString()} − ฿{Math.round(pricePerDay * COMMISSION_RATE).toLocaleString()} (20%)
                </div>
              </div>
            </div>
          ) : (
          <div className="grid grid-cols-2 gap-3.5">
            <div className="rounded-[13px] border border-hairline p-3.5">
              <div className="mb-2 text-xs text-ink-muted">{t.rent}</div>
              <div className="flex items-center gap-1">
                <span className="font-sans text-lg font-bold">฿</span>
                <input
                  type="number"
                  value={price}
                  onChange={(e) => setPrice(Number(e.target.value))}
                  className="w-full font-sans text-2xl font-bold text-ink-strong outline-none"
                />
              </div>
            </div>
            <div className="rounded-[13px] border border-hairline p-3.5">
              <div className="mb-2 text-xs text-ink-muted">{t.deposit}</div>
              <div className="flex items-center gap-1">
                <span className="font-sans text-lg font-bold">฿</span>
                <input
                  type="number"
                  value={deposit}
                  onChange={(e) => setDeposit(Number(e.target.value))}
                  className="w-full font-sans text-2xl font-bold text-ink-strong outline-none"
                />
              </div>
            </div>
            <div className="rounded-[13px] border border-hairline bg-accent-tint p-3.5">
              <div className="mb-2 text-xs font-semibold text-accent-dark">{t.water}</div>
              <div className="flex items-center gap-1">
                <span className="font-sans text-lg font-bold text-accent-dark">฿</span>
                <input
                  type="number"
                  value={waterRate}
                  onChange={(e) => setWaterRate(Number(e.target.value))}
                  className="w-full bg-transparent font-sans text-2xl font-bold text-accent-dark outline-none"
                />
              </div>
            </div>
            <div className="rounded-[13px] border border-hairline bg-accent-tint p-3.5">
              <div className="mb-2 text-xs font-semibold text-accent-dark">{t.electric}</div>
              <div className="flex items-center gap-1">
                <span className="font-sans text-lg font-bold text-accent-dark">฿</span>
                <input
                  type="number"
                  value={electricRate}
                  onChange={(e) => setElectricRate(Number(e.target.value))}
                  className="w-full bg-transparent font-sans text-2xl font-bold text-accent-dark outline-none"
                />
              </div>
            </div>
          </div>
          )}
        </div>

        {/* amenities */}
        <div className="rounded-card-lg border border-card-border bg-white p-[22px] shadow-card">
          <div className="text-[15.5px] font-bold text-ink-strong">{t.amenities}</div>
          <p className="mb-4 mt-1 text-[12.5px] text-ink-muted">{t.amenitiesSub}</p>
          <div className="grid grid-cols-4 gap-2.5">
            {AMENITY_KEYS.map((key) => {
              const on = amenities.has(key);
              return (
                <button
                  type="button"
                  key={key}
                  onClick={() => toggleAmenity(key)}
                  className={`flex flex-col items-center gap-2 rounded-[13px] border-[1.5px] px-2 py-3.5 ${
                    on ? 'border-tenant bg-tenant-tint text-tenant' : 'border-hairline text-ink-faint'
                  }`}
                >
                  <AmenityIcon name={key} />
                  <span className={`text-center text-[12.5px] font-semibold ${on ? 'text-ink-strong' : 'text-ink-muted'}`}>
                    {AMENITY_LABEL[key][lang]}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {error && <p className="text-sm text-danger">{error}</p>}

        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => router.push('/partner/rooms')}
            className="flex-1 rounded-[13px] border border-card-border bg-white py-3 text-[14.5px] font-semibold text-ink-subtitle"
          >
            {t.saveDraft}
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting || !dormId}
            className="flex-[1.6] rounded-[13px] py-3 text-[14.5px] font-bold text-white disabled:opacity-50"
            style={{ background: allowDaily ? '#12A150' : '#2F6FE0' }}
          >
            {submitting ? t.submitting : allowDaily ? t.submitDaily : t.submit}
          </button>
        </div>
      </div>

      {/* ===== LIVE PREVIEW ===== */}
      <div className="sticky top-0 hidden xl:block">
        <div className="mb-3 flex items-center gap-1.5 text-[12.5px] font-semibold text-ink-muted">{t.previewLabel}</div>
        <div className="w-full overflow-hidden rounded-[26px] border-8 border-admin-sidebar bg-white shadow-[0_20px_50px_rgba(0,0,0,0.2)]">
          {/* รูปตัวอย่าง = แกลเลอรี่ที่ผู้เช่าเห็นจริง (รูปเฉพาะห้องถ้าอัป / ไม่งั้นรูปหอ) — คลิกเลื่อนดูรูปอื่นได้ */}
          <div className="relative h-[180px] overflow-hidden bg-gradient-to-br from-tenant-tint to-tenant/30">
            {previewImages.length > 0 ? (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={previewImages[previewIdx % previewImages.length]}
                  alt=""
                  onClick={() => setPreviewIdx((i) => (i + 1) % previewImages.length)}
                  className="h-full w-full cursor-pointer object-cover"
                />
                {previewImages.length > 1 && (
                  <>
                    <button
                      type="button"
                      onClick={() => setPreviewIdx((i) => (i - 1 + previewImages.length) % previewImages.length)}
                      className="absolute left-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-black/45 text-white hover:bg-black/60"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M15 6l-6 6 6 6" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                    </button>
                    <button
                      type="button"
                      onClick={() => setPreviewIdx((i) => (i + 1) % previewImages.length)}
                      className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-black/45 text-white hover:bg-black/60"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M9 6l6 6-6 6" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                    </button>
                    <div className="absolute bottom-2.5 left-1/2 flex -translate-x-1/2 gap-1.5">
                      {previewImages.map((_, i) => (
                        <span key={i} className={`h-1.5 rounded-full transition-all ${i === previewIdx % previewImages.length ? 'w-4 bg-white' : 'w-1.5 bg-white/60'}`} />
                      ))}
                    </div>
                  </>
                )}
              </>
            ) : null}
          </div>
          <div className="p-[18px]">
            <div className="flex items-baseline justify-between">
              <div className="text-[17px] font-bold text-ink-strong">{roomType === 'AIR' ? t.previewAir : t.previewFan}</div>
              <div className="text-right">
                {allowDaily ? (
                  <div className="font-sans text-lg font-bold text-success">
                    ฿{pricePerDay.toLocaleString()}
                    <span className="text-xs font-medium text-ink-muted">{t.perNight}</span>
                  </div>
                ) : (
                  <div className="font-sans text-lg font-bold text-tenant">
                    ฿{price.toLocaleString()}
                    <span className="text-xs font-medium text-ink-muted">{t.perMonth}</span>
                  </div>
                )}
              </div>
            </div>
            <div className="mt-1 text-[12.5px] text-ink-muted">
              {selectedDorm?.name} · {selectedDorm?.province}
            </div>
            <div className="my-3.5 h-px bg-hairline" />
            <div className="flex flex-wrap gap-1.5">
              {Array.from(amenities).map((key) => (
                <span key={key} className="flex items-center gap-1.5 rounded-lg bg-surface-canvas px-2.5 py-1.5 text-[11.5px] text-ink-body">
                  <span className="text-tenant">
                    <AmenityIcon name={key} size={14} />
                  </span>
                  {AMENITY_LABEL[key][lang]}
                </span>
              ))}
            </div>
            <div className="mt-3.5 flex flex-wrap gap-x-2 gap-y-1 text-[11.5px] text-ink-muted">
              <span>
                {t.water} ฿{waterRate}
              </span>
              <span>·</span>
              <span>
                {t.electric} ฿{electricRate}
              </span>
              <span>·</span>
              <span>
                {t.deposit} ฿{deposit.toLocaleString()}
              </span>
            </div>
            <div className="mt-4 rounded-xl bg-tenant py-2.5 text-center text-sm font-bold text-white">{t.bookBtn}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
