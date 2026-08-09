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

// รูปการ์ดห้อง — คลิกที่รูป (หรือลูกศร) เลื่อนดูรูปอื่นได้ วนไปเรื่อยๆ
function RoomCover({ images }: { images: string[] }) {
  const [idx, setIdx] = useState(0);
  if (!images.length) return null;
  const cur = idx % images.length;
  return (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={images[cur]}
        alt=""
        onClick={() => setIdx((i) => (i + 1) % images.length)}
        className="h-full w-full cursor-pointer object-cover"
      />
      {images.length > 1 && (
        <>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); setIdx((i) => (i - 1 + images.length) % images.length); }}
            className="absolute left-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full bg-black/40 text-white hover:bg-black/60"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M15 6l-6 6 6 6" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </button>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); setIdx((i) => (i + 1) % images.length); }}
            className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full bg-black/40 text-white hover:bg-black/60"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M9 6l6 6-6 6" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </button>
          <div className="absolute bottom-1.5 left-1/2 flex -translate-x-1/2 gap-1">
            {images.map((_, i) => (
              <span key={i} className={`h-1.5 rounded-full transition-all ${i === cur ? 'w-3.5 bg-white' : 'w-1.5 bg-white/60'}`} />
            ))}
          </div>
        </>
      )}
    </>
  );
}

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
    totalRooms: (n: number) => `รวม ${n} ห้อง`,
    editAll: 'แก้ไขทั้งกลุ่ม',
    addRoom: 'เพิ่มห้อง',
    deleteGroup: 'ลบ',
    addQtyPrompt: 'เพิ่มกี่ห้อง? (1-50)',
    confirmDeleteGroup: (n: number) => `ลบห้องในกลุ่มนี้? (${n} ห้อง) — ลบได้เฉพาะห้องที่ไม่มีการจอง ห้องที่มีคนจองจะคงไว้`,
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
    totalRooms: (n: number) => `${n} room${n > 1 ? 's' : ''} total`,
    editAll: 'Edit all',
    addRoom: 'Add rooms',
    deleteGroup: 'Delete',
    addQtyPrompt: 'How many rooms to add? (1-50)',
    confirmDeleteGroup: (n: number) => `Delete rooms in this group? (${n}) — only rooms without bookings are removed; booked ones are kept`,
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
  const [editTarget, setEditTarget] = useState<{ room: Room; ids: string[] } | null>(null);

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

  // ลบทั้งกลุ่ม — ลบได้เฉพาะห้องที่ไม่มีการจอง (backend กัน) ห้องที่มีคนจองจะข้ามไป
  async function deleteGroup(ids: string[]) {
    if (!window.confirm(t.confirmDeleteGroup(ids.length))) return;
    await Promise.allSettled(ids.map((id) => apiClient.delete(`/rooms/${id}`)));
    reload();
  }

  // เพิ่มห้องเข้ากลุ่มเดิม (spec เดียวกัน) โดยไม่ต้องตั้งโพสใหม่
  async function addRooms(rep: Room) {
    const input = window.prompt(t.addQtyPrompt, '1');
    if (!input) return;
    const qty = Math.max(1, Math.min(50, Math.floor(Number(input)) || 0));
    if (qty < 1) return;
    const fd = new FormData();
    fd.append('type', rep.type.toUpperCase());
    fd.append('pricePerMonth', String(rep.pricePerMonth));
    fd.append('pricePerDay', String(rep.pricePerDay ?? 0));
    fd.append('allowDaily', String(!!rep.allowDaily));
    fd.append('deposit', String(rep.deposit ?? 0));
    fd.append('waterRate', String(rep.waterRate ?? 0));
    fd.append('electricRate', String(rep.electricRate ?? 0));
    fd.append('description', rep.description ?? '');
    fd.append('amenities', JSON.stringify(rep.amenities ?? []));
    fd.append('quantity', String(qty));
    await fetch(`${API_URL}/dorms/${rep.dormId}/rooms`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${getToken()}` },
      body: fd,
    });
    reload();
  }

  const selectedDorm = dorms.find((d) => d.id === selectedDormId);
  const rooms = selectedDorm?.rooms ?? [];
  const available = rooms.filter((r) => r.status.toUpperCase() === 'AVAILABLE').length;
  const occupied = rooms.length - available;

  // รวมห้องเหมือนกัน (ประเภท+ราคา+มัดจำ+รายวัน) เป็นกลุ่มเดียว โชว์จำนวน — ไม่รวม name (สุ่มต่อห้อง)
  const groups = (() => {
    const map = new Map<
      string,
      { key: string; rep: Room; ids: string[]; total: number; available: number; occupied: number; pending: boolean }
    >();
    for (const r of rooms) {
      const key = `${r.type}|${r.pricePerMonth}|${r.deposit ?? 0}|${r.pricePerDay ?? 0}|${r.allowDaily ? 1 : 0}`;
      const isAvail = r.status.toUpperCase() === 'AVAILABLE';
      const g = map.get(key);
      if (g) {
        g.ids.push(r.id);
        g.total += 1;
        g[isAvail ? 'available' : 'occupied'] += 1;
        if (r.approved === false) g.pending = true;
        if (!isAvail && g.rep.status.toUpperCase() !== 'AVAILABLE') g.rep = r; // ตัวแทนควรเป็นห้องว่างถ้ามี
      } else {
        map.set(key, {
          key,
          rep: r,
          ids: [r.id],
          total: 1,
          available: isAvail ? 1 : 0,
          occupied: isAvail ? 0 : 1,
          pending: r.approved === false,
        });
      }
    }
    let list = [...map.values()];
    if (statusFilter === 'available') list = list.filter((g) => g.available > 0);
    else if (statusFilter === 'occupied') list = list.filter((g) => g.occupied > 0);
    return list;
  })();

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
        {groups.map((g) => {
          const room = g.rep;
          const coverImages = room.images?.length ? room.images : selectedDorm?.images ?? [];
          return (
            <div
              key={g.key}
              className={`overflow-hidden rounded-card-lg border bg-white shadow-card ${
                g.pending ? 'border-warning' : 'border-card-border'
              }`}
            >
              <div className="relative h-[130px] overflow-hidden bg-gradient-to-br from-tenant-tint to-tenant/25">
                <RoomCover images={coverImages} />
                {/* สรุปว่าง/ไม่ว่างของทั้งกลุ่ม */}
                <span
                  className={`absolute left-3 top-3 rounded-pill px-2.5 py-1 text-[11.5px] font-semibold ${
                    g.available > 0 ? 'bg-success-tint text-success' : 'bg-danger-tint text-danger'
                  }`}
                >
                  {t.available} {g.available}/{g.total}
                </span>
                <span className="absolute right-3 top-3 rounded-pill bg-black/35 px-2.5 py-1 text-[11px] font-semibold text-white">
                  {room.type.toUpperCase() === 'AIR' ? t.air : t.fan}
                </span>
                {g.pending && (
                  <span className="absolute inset-x-0 bottom-0 bg-warning/90 px-3 py-1.5 text-center text-[11.5px] font-semibold text-white">
                    {t.pendingReview}
                  </span>
                )}
              </div>
              <div className="p-[18px]">
                <div className="flex items-baseline justify-between gap-2">
                  <div className="truncate text-[16px] font-bold text-ink-strong">
                    {room.type.toUpperCase() === 'AIR' ? t.air : t.fan}
                  </div>
                  <div className="shrink-0 text-[17px] font-bold text-tenant">
                    ฿{room.pricePerMonth.toLocaleString()}
                    <span className="text-xs font-medium text-ink-muted">{t.perMonth}</span>
                  </div>
                </div>
                {/* จำนวนห้องในกลุ่ม: รวม N · ว่าง X · ไม่ว่าง Y */}
                <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[12px]">
                  <span className="rounded-md bg-surface-canvas px-2 py-0.5 font-semibold text-ink-body">
                    {t.totalRooms(g.total)}
                  </span>
                  <span className="rounded-md bg-success-tint px-2 py-0.5 font-semibold text-success">
                    {t.available} {g.available}
                  </span>
                  {g.occupied > 0 && (
                    <span className="rounded-md bg-danger-tint px-2 py-0.5 font-semibold text-danger">
                      {t.occupied} {g.occupied}
                    </span>
                  )}
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
                <div className="mt-3.5 flex flex-wrap gap-2">
                  <button
                    onClick={() => setEditTarget({ room, ids: g.ids })}
                    className="flex-1 rounded-[9px] bg-surface-canvas py-2 text-[13px] font-semibold text-ink-body"
                  >
                    {g.total > 1 ? t.editAll : t.edit}
                  </button>
                  <Link
                    href={`/dorms/${room.dormId}`}
                    className="flex-1 rounded-[9px] bg-tenant-tint py-2 text-center text-[13px] font-semibold text-tenant"
                  >
                    {t.viewPost}
                  </Link>
                  <button
                    onClick={() => addRooms(room)}
                    className="flex-1 rounded-[9px] bg-success-tint py-2 text-[13px] font-semibold text-success"
                  >
                    + {t.addRoom}
                  </button>
                  <button
                    onClick={() => deleteGroup(g.ids)}
                    className="flex-1 rounded-[9px] border border-danger py-2 text-[13px] font-semibold text-danger hover:bg-danger-tint"
                  >
                    {t.deleteGroup}
                  </button>
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

      {groups.length === 0 && rooms.length > 0 && <p className="mt-4 text-ink-faint">{t.noRooms}</p>}

      {editTarget && (
        <EditRoomModal
          room={editTarget.room}
          groupIds={editTarget.ids}
          dormImages={selectedDorm?.images ?? []}
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
  groupIds,
  dormImages,
  t,
  lang,
  onClose,
  onSaved,
}: {
  room: Room;
  groupIds: string[];
  dormImages: string[];
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
  // โชว์รูปที่ผู้เช่าเห็นจริง: รูปเฉพาะห้อง (ถ้ามี) ไม่งั้นรูปหอ — เพิ่ม/ลบแล้ว backend จะ materialize ให้
  const [images, setImages] = useState(room.images?.length ? room.images : dormImages);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      // แก้ทั้งกลุ่ม: อัปเดตทุกห้องที่เหมือนกันให้ค่าตรงกัน (ราคา/ประเภท/มัดจำ/ค่าน้ำไฟ) — ยกเว้น name (คงชื่อเฉพาะห้อง)
      const body = { type, description, pricePerMonth: price, deposit, waterRate, electricRate };
      await Promise.all(groupIds.map((rid) => apiClient.patch(`/rooms/${rid}`, rid === room.id ? { ...body, name } : body)));
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 sm:p-6">
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
