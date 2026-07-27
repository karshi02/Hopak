'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiClient } from '@/lib/api-client';
import { getToken } from '@/lib/auth';
import { normalizeStatus } from '@/lib/normalize';
import { useLang, type Lang } from '@/hooks/useLang';
import { Badge } from '@/components/dashboard/Badge';
import { AdminIcon } from '@/components/admin/AdminIcon';
import type { Dorm, Room } from '@hopak/shared';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

type DormWithRooms = Dorm & { rooms: Room[] };

const ROOM_TYPE_OPTIONS: Record<Lang, { value: 'AIR' | 'FAN'; label: string }[]> = {
  th: [
    { value: 'AIR', label: 'ห้องแอร์' },
    { value: 'FAN', label: 'ห้องพัดลม' },
  ],
  en: [
    { value: 'AIR', label: 'Air-conditioned' },
    { value: 'FAN', label: 'Fan room' },
  ],
};

const TEXT = {
  th: {
    noDorms: 'ยังไม่มีหอพัก',
    all: 'ทั้งหมด',
    available: 'ว่าง',
    occupied: 'ไม่ว่าง',
    air: 'ห้องแอร์',
    fan: 'ห้องพัดลม',
    markOccupied: 'ตัดห้อง',
    markAvailable: 'เปิดว่าง',
    noRooms: 'หอนี้ยังไม่มีห้อง',
    addNew: 'เพิ่มห้องพักใหม่',
    viewPost: 'ดูโพสต์',
    perMonth: '/ด.',
    pendingReview: 'รอแอดมินตรวจสอบ',
    edit: 'แก้ไข',
    editTitle: 'แก้ไขห้องพัก',
    name: 'ชื่อห้อง',
    roomKind: 'ประเภทห้อง',
    description: 'คำอธิบาย',
    rent: 'ค่าเช่า/เดือน',
    deposit: 'มัดจำ',
    water: 'ค่าน้ำ/หน่วย',
    electric: 'ค่าไฟ/หน่วย',
    images: 'รูปภาพ',
    addImages: 'เพิ่มรูป',
    uploadingImages: 'กำลังอัปโหลด...',
    removeImageConfirm: 'ลบรูปนี้?',
    save: 'บันทึก',
    saving: 'กำลังบันทึก...',
    cancel: 'ปิด',
    saveError: 'บันทึกไม่สำเร็จ',
  },
  en: {
    noDorms: 'No dorms yet',
    all: 'All',
    available: 'Available',
    occupied: 'Occupied',
    air: 'Air-conditioned',
    fan: 'Fan room',
    markOccupied: 'Mark occupied',
    markAvailable: 'Mark available',
    noRooms: 'This dorm has no rooms yet',
    addNew: 'Add a new room',
    viewPost: 'View post',
    perMonth: '/mo',
    pendingReview: 'Pending admin review',
    edit: 'Edit',
    editTitle: 'Edit room',
    name: 'Room name',
    roomKind: 'Room type',
    description: 'Description',
    rent: 'Rent/month',
    deposit: 'Deposit',
    water: 'Water/unit',
    electric: 'Electric/unit',
    images: 'Photos',
    addImages: 'Add photos',
    uploadingImages: 'Uploading...',
    removeImageConfirm: 'Remove this photo?',
    save: 'Save',
    saving: 'Saving...',
    cancel: 'Close',
    saveError: 'Save failed',
  },
};

export default function PartnerRoomsPage() {
  const { lang } = useLang();
  const t = TEXT[lang];
  const [dorms, setDorms] = useState<DormWithRooms[]>([]);
  const [selectedDormId, setSelectedDormId] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'available' | 'occupied'>('all');
  const [editTarget, setEditTarget] = useState<Room | null>(null);

  function reload() {
    apiClient
      .get<DormWithRooms[]>('/dorms/mine')
      .then((data) => {
        setDorms(data);
        setSelectedDormId((prev) => prev || data[0]?.id || '');
      })
      .catch(() => setDorms([]));
  }

  useEffect(reload, []);

  const selectedDorm = dorms.find((d) => d.id === selectedDormId);
  const rooms = selectedDorm?.rooms ?? [];
  const available = rooms.filter((r) => r.status.toUpperCase() === 'AVAILABLE').length;
  const occupied = rooms.length - available;
  const filteredRooms = rooms.filter((r) => {
    if (statusFilter === 'all') return true;
    return normalizeStatus(r.status) === statusFilter;
  });

  async function toggleStatus(roomId: string, current: string) {
    const next = normalizeStatus(current) === 'available' ? 'OCCUPIED' : 'AVAILABLE';
    try {
      await apiClient.patch(`/rooms/${roomId}/status`, { status: next });
      reload();
    } catch {
      // เงียบไว้ก่อน — ไม่ให้พังทั้งหน้า
    }
  }

  if (dorms.length === 0) {
    return <p className="text-ink-faint">{t.noDorms}</p>;
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2.5">
        {dorms.length > 1 && (
          <select
            value={selectedDormId}
            onChange={(e) => setSelectedDormId(e.target.value)}
            className="rounded-btn border border-card-border bg-white px-3.5 py-2 text-sm"
          >
            {dorms.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        )}
        {(
          [
            ['all', `${t.all} ${rooms.length}`],
            ['available', `${t.available} ${available}`],
            ['occupied', `${t.occupied} ${occupied}`],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setStatusFilter(key)}
            className={`rounded-[10px] px-4 py-2 text-sm font-semibold ${
              statusFilter === key ? 'bg-tenant text-white' : 'bg-white text-ink-body border border-card-border'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="mt-[18px] grid grid-cols-1 gap-[18px] sm:grid-cols-2 lg:grid-cols-3">
        {filteredRooms.map((room) => {
          const isAvailable = normalizeStatus(room.status) === 'available';
          const cover = room.images?.[0];
          const pendingReview = room.approved === false;
          return (
            <div
              key={room.id}
              className={`overflow-hidden rounded-card-lg border bg-white shadow-card ${
                pendingReview ? 'border-warning' : 'border-card-border'
              }`}
            >
              <div className="relative h-[130px] bg-gradient-to-br from-tenant-tint to-tenant/25">
                {cover && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={cover} alt="" className="h-full w-full object-cover" />
                )}
                <span
                  className={`absolute left-3 top-3 rounded-pill px-2.5 py-1 text-[11.5px] font-semibold ${
                    isAvailable ? 'bg-success-tint text-success' : 'bg-danger-tint text-danger'
                  }`}
                >
                  {isAvailable ? t.available : t.occupied}
                </span>
                <span className="absolute right-3 top-3 rounded-pill bg-black/35 px-2.5 py-1 text-[11px] font-semibold text-white">
                  {room.type.toUpperCase() === 'AIR' ? t.air : t.fan}
                </span>
                {pendingReview && (
                  <span className="absolute inset-x-0 bottom-0 bg-warning/90 px-3 py-1.5 text-center text-[11.5px] font-semibold text-white">
                    {t.pendingReview}
                  </span>
                )}
              </div>
              <div className="p-[18px]">
                <div className="flex items-baseline justify-between gap-2">
                  <div className="truncate text-[16px] font-bold text-ink-strong">
                    {room.name || (room.type.toUpperCase() === 'AIR' ? t.air : t.fan)}
                  </div>
                  <div className="shrink-0 text-[17px] font-bold text-tenant">
                    ฿{room.pricePerMonth.toLocaleString()}
                    <span className="text-xs font-medium text-ink-muted">{t.perMonth}</span>
                  </div>
                </div>
                {room.amenities && room.amenities.length > 0 && (
                  <div className="mt-2.5 flex flex-wrap gap-1.5">
                    {room.amenities.slice(0, 3).map((a) => (
                      <span key={a} className="rounded-md bg-surface-canvas px-2 py-1 text-[11px] text-ink-subtitle">
                        {a}
                      </span>
                    ))}
                  </div>
                )}
                <div className="mt-3.5 flex gap-2">
                  <button
                    onClick={() => toggleStatus(room.id, room.status)}
                    className={`flex-1 rounded-[9px] py-2 text-[13px] font-semibold ${
                      isAvailable ? 'bg-surface-canvas text-danger' : 'bg-surface-canvas text-success'
                    }`}
                  >
                    {isAvailable ? t.markOccupied : t.markAvailable}
                  </button>
                  <button
                    onClick={() => setEditTarget(room)}
                    className="flex-1 rounded-[9px] bg-surface-canvas py-2 text-[13px] font-semibold text-ink-body"
                  >
                    {t.edit}
                  </button>
                  <Link
                    href={`/dorms/${room.dormId}`}
                    className="flex-1 rounded-[9px] bg-tenant-tint py-2 text-center text-[13px] font-semibold text-tenant"
                  >
                    {t.viewPost}
                  </Link>
                </div>
              </div>
            </div>
          );
        })}

        <Link
          href="/partner/rooms/new"
          className="flex min-h-[250px] flex-col items-center justify-center gap-2.5 rounded-card-lg border-[1.5px] border-dashed border-card-border text-ink-muted hover:border-tenant hover:text-tenant"
        >
          <span className="flex h-[52px] w-[52px] items-center justify-center rounded-2xl bg-tenant-tint text-tenant">
            <AdminIcon name="plus" size={24} />
          </span>
          <div className="text-sm font-semibold text-ink-body">{t.addNew}</div>
        </Link>
      </div>

      {filteredRooms.length === 0 && rooms.length > 0 && <p className="mt-4 text-ink-faint">{t.noRooms}</p>}

      {editTarget && (
        <EditRoomModal
          room={editTarget}
          t={t}
          lang={lang}
          onClose={() => setEditTarget(null)}
          onSaved={() => {
            setEditTarget(null);
            reload();
          }}
        />
      )}
    </div>
  );
}

function EditRoomModal({
  room,
  t,
  lang,
  onClose,
  onSaved,
}: {
  room: Room;
  t: (typeof TEXT)['th'];
  lang: Lang;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(room.name ?? '');
  const [type, setType] = useState<'AIR' | 'FAN'>(room.type.toUpperCase() as 'AIR' | 'FAN');
  const [description, setDescription] = useState(room.description ?? '');
  const [price, setPrice] = useState(room.pricePerMonth);
  const [deposit, setDeposit] = useState(room.deposit);
  const [waterRate, setWaterRate] = useState(room.waterRate);
  const [electricRate, setElectricRate] = useState(room.electricRate);
  const [images, setImages] = useState(room.images ?? []);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      await apiClient.patch(`/rooms/${room.id}`, {
        name,
        type,
        description,
        pricePerMonth: price,
        deposit,
        waterRate,
        electricRate,
      });
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : t.saveError);
      setSaving(false);
    }
  }

  async function handleAddImages(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    setUploadingImages(true);
    try {
      const formData = new FormData();
      files.forEach((f) => formData.append('photos', f));
      const res = await fetch(`${API_URL}/rooms/${room.id}/images`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${getToken()}` },
        body: formData,
      });
      if (res.ok) {
        const updated: Room = await res.json();
        setImages(updated.images ?? []);
      }
    } finally {
      setUploadingImages(false);
      e.target.value = '';
    }
  }

  async function handleRemoveImage(index: number) {
    if (!window.confirm(t.removeImageConfirm)) return;
    const res = await fetch(`${API_URL}/rooms/${room.id}/images/${index}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${getToken()}` },
    });
    if (res.ok) {
      const updated: Room = await res.json();
      setImages(updated.images ?? []);
    }
  }

  const inputClass = 'h-11 w-full rounded-lg border border-card-border px-3.5 text-sm outline-none focus:border-tenant';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-6">
      <div className="max-h-[85vh] w-full max-w-md overflow-y-auto rounded-card-lg border border-card-border bg-white p-5 shadow-card">
        <h2 className="font-bold text-ink-strong">{t.editTitle}</h2>
        <div className="mt-4 flex flex-col gap-3">
          <div>
            <label className="mb-1.5 block text-xs text-ink-muted">{t.name}</label>
            <input value={name} onChange={(e) => setName(e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className="mb-1.5 block text-xs text-ink-muted">{t.roomKind}</label>
            <div className="flex gap-2">
              {ROOM_TYPE_OPTIONS[lang].map((o) => (
                <button
                  key={o.value}
                  type="button"
                  onClick={() => setType(o.value)}
                  className={`flex-1 rounded-lg py-2 text-sm font-semibold ${
                    type === o.value ? 'bg-tenant text-white' : 'bg-surface-canvas text-ink-body'
                  }`}
                >
                  {o.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="mb-1.5 block text-xs text-ink-muted">{t.description}</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full rounded-lg border border-card-border p-3 text-sm outline-none focus:border-tenant"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-xs text-ink-muted">{t.rent}</label>
              <input type="number" value={price} onChange={(e) => setPrice(Number(e.target.value))} className={`${inputClass} font-sans`} />
            </div>
            <div>
              <label className="mb-1.5 block text-xs text-ink-muted">{t.deposit}</label>
              <input type="number" value={deposit} onChange={(e) => setDeposit(Number(e.target.value))} className={`${inputClass} font-sans`} />
            </div>
            <div>
              <label className="mb-1.5 block text-xs text-ink-muted">{t.water}</label>
              <input type="number" value={waterRate} onChange={(e) => setWaterRate(Number(e.target.value))} className={`${inputClass} font-sans`} />
            </div>
            <div>
              <label className="mb-1.5 block text-xs text-ink-muted">{t.electric}</label>
              <input type="number" value={electricRate} onChange={(e) => setElectricRate(Number(e.target.value))} className={`${inputClass} font-sans`} />
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-xs text-ink-muted">{t.images}</label>
            <div className="grid grid-cols-4 gap-1.5">
              {images.map((url, i) => (
                <div key={url} className="group relative h-16 overflow-hidden rounded-md border border-card-border">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={url} alt="" className="h-full w-full object-cover" />
                  <button
                    type="button"
                    onClick={() => handleRemoveImage(i)}
                    className="absolute right-0.5 top-0.5 flex h-4 w-4 items-center justify-center rounded-pill bg-black/60 text-[10px] font-bold text-white opacity-0 transition-opacity group-hover:opacity-100"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
            <label className="mt-2 inline-block cursor-pointer text-xs font-semibold text-tenant">
              {uploadingImages ? t.uploadingImages : `+ ${t.addImages}`}
              <input type="file" accept="image/*" multiple className="hidden" onChange={handleAddImages} disabled={uploadingImages} />
            </label>
          </div>
        </div>

        {error && <p className="mt-3 text-sm text-danger">{error}</p>}

        <div className="mt-4 flex gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="flex-1 rounded-btn border border-card-border py-2.5 text-sm font-semibold text-ink-subtitle disabled:opacity-50"
          >
            {t.cancel}
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="flex-1 rounded-btn bg-tenant py-2.5 text-sm font-semibold text-white disabled:opacity-60"
          >
            {saving ? t.saving : t.save}
          </button>
        </div>
      </div>
    </div>
  );
}
