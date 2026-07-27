'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiClient } from '@/lib/api-client';
import { getSocket } from '@/lib/ws';
import { getToken } from '@/lib/auth';
import { useLang } from '@/hooks/useLang';
import { Badge } from '@/components/dashboard/Badge';
import { PROVINCES } from '@hopak/shared';
import type { Dorm, Room } from '@hopak/shared';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

type PendingDorm = Dorm & { owner: { name: string; email?: string; phone?: string } };
type AllDorm = Dorm & { owner: { id: string; name: string; email?: string } };
type PendingRoom = Room & { dorm: { name: string; owner: { name: string } } };
interface LogEntry {
  id: string;
  entityType: string;
  entityId: string;
  action: string;
  note?: string | null;
  createdAt: string;
  admin: { name: string };
}

const TEXT = {
  th: {
    pendingCount: (n: number) => `รออนุมัติ ${n}`,
    photoPlaceholder: 'ไม่มีรูปหอพัก',
    pending: 'รออนุมัติ',
    owner: 'เจ้าของ',
    address: 'ที่อยู่',
    coords: 'พิกัด',
    documents: (n: number) => `เอกสารแนบ (${n})`,
    documentItem: (n: number) => `เอกสาร ${n}`,
    noDocuments: 'ยังไม่มีเอกสารแนบ',
    approve: 'อนุมัติ',
    reject: 'ปฏิเสธ',
    edit: 'แก้ไขข้อมูล',
    none: 'ไม่มีหอรออนุมัติ',

    roomsTitle: 'ห้องพักรอตรวจสอบ',
    roomsNone: 'ไม่มีห้องรอตรวจสอบ',
    room: 'ห้อง',
    dorm: 'หอพัก',
    price: 'ราคา',

    allDormsTitle: 'หอพักทั้งหมด',
    status: 'สถานะ',
    autoApprove: 'อนุมัติห้องอัตโนมัติ',
    statusLabel: {
      PENDING_APPROVAL: 'รออนุมัติ',
      APPROVED: 'อนุมัติแล้ว',
      REJECTED: 'ปฏิเสธ',
      SUSPENDED: 'ระงับ',
    } as Record<string, string>,

    modalTitle: 'แก้ไขข้อมูลหอพัก',
    name: 'ชื่อหอพัก',
    province: 'จังหวัด',
    save: 'บันทึก',
    saving: 'กำลังบันทึก...',
    cancel: 'ยกเลิก',
    saveError: 'บันทึกไม่สำเร็จ',

    manage: 'จัดการเจ้าของหอ',
    suspend: 'ระงับหอนี้',
    unsuspend: 'ยกเลิกระงับ',
    viewOwner: 'ดูบัญชีเจ้าของหอ →',
    confirmRejectRoom: 'ยืนยันปฏิเสธห้องนี้? ข้อมูลห้องจะถูกลบถาวร (ระบบเก็บ log ไว้ตรวจสอบย้อนหลังได้)',

    logTitle: 'ประวัติการอนุมัติ',
    logNone: 'ยังไม่มีประวัติ',
    logAction: {
      APPROVED: 'อนุมัติ',
      REJECTED: 'ปฏิเสธ',
      EDITED: 'แก้ไขข้อมูล',
      SUSPENDED: 'ระงับ',
      UNSUSPENDED: 'ยกเลิกระงับ',
    } as Record<string, string>,
    logEntity: { DORM: 'หอพัก', ROOM: 'ห้องพัก' } as Record<string, string>,

    imagesLabel: 'รูปหอพัก',
    addImages: 'เพิ่มรูป',
    uploadingImages: 'กำลังอัปโหลด...',
    removeImageConfirm: 'ลบรูปนี้?',

    manageRooms: 'ห้องพัก',
    roomsModalTitle: (name: string) => `ห้องพักของ ${name}`,
    roomsNoneInDorm: 'หอนี้ยังไม่มีห้อง',
    editRoomTitle: 'แก้ไขห้องพัก',
    roomName: 'ชื่อห้อง',
    roomKind: 'ประเภทห้อง',
    roomDescription: 'คำอธิบาย',
    rent: 'ค่าเช่า/เดือน',
    roomDeposit: 'มัดจำ',
    roomWater: 'ค่าน้ำ/หน่วย',
    roomElectric: 'ค่าไฟ/หน่วย',
    roomAir: 'ห้องแอร์',
    roomFan: 'ห้องพัดลม',
    close: 'ปิด',
  },
  en: {
    pendingCount: (n: number) => `${n} pending`,
    photoPlaceholder: 'No dorm photo',
    pending: 'Pending',
    owner: 'Owner',
    address: 'Address',
    coords: 'Coordinates',
    documents: (n: number) => `Attached documents (${n})`,
    documentItem: (n: number) => `Document ${n}`,
    noDocuments: 'No documents attached',
    approve: 'Approve',
    reject: 'Reject',
    edit: 'Edit info',
    none: 'No dorms pending approval',

    roomsTitle: 'Rooms pending review',
    roomsNone: 'No rooms pending review',
    room: 'Room',
    dorm: 'Dorm',
    price: 'Price',

    allDormsTitle: 'All dorms',
    status: 'Status',
    autoApprove: 'Auto-approve rooms',
    statusLabel: {
      PENDING_APPROVAL: 'Pending',
      APPROVED: 'Approved',
      REJECTED: 'Rejected',
      SUSPENDED: 'Suspended',
    } as Record<string, string>,

    modalTitle: 'Edit dorm info',
    name: 'Dorm name',
    province: 'Province',
    save: 'Save',
    saving: 'Saving...',
    cancel: 'Cancel',
    saveError: 'Save failed',

    manage: 'Manage owner',
    suspend: 'Suspend this dorm',
    unsuspend: 'Unsuspend',
    viewOwner: 'View owner account →',
    confirmRejectRoom: 'Reject this room? Its data will be permanently deleted (a log entry is kept for audit).',

    logTitle: 'Approval history',
    logNone: 'No history yet',
    logAction: {
      APPROVED: 'Approved',
      REJECTED: 'Rejected',
      EDITED: 'Edited',
      SUSPENDED: 'Suspended',
      UNSUSPENDED: 'Unsuspended',
    } as Record<string, string>,
    logEntity: { DORM: 'Dorm', ROOM: 'Room' } as Record<string, string>,

    imagesLabel: 'Dorm photos',
    addImages: 'Add photos',
    uploadingImages: 'Uploading...',
    removeImageConfirm: 'Remove this photo?',

    manageRooms: 'Rooms',
    roomsModalTitle: (name: string) => `${name}'s rooms`,
    roomsNoneInDorm: 'This dorm has no rooms yet',
    editRoomTitle: 'Edit room',
    roomName: 'Room name',
    roomKind: 'Room type',
    roomDescription: 'Description',
    rent: 'Rent/month',
    roomDeposit: 'Deposit',
    roomWater: 'Water/unit',
    roomElectric: 'Electric/unit',
    roomAir: 'Air-conditioned',
    roomFan: 'Fan room',
    close: 'Close',
  },
};

export default function AdminApprovalsPage() {
  const { lang } = useLang();
  const t = TEXT[lang];
  const [pending, setPending] = useState<PendingDorm[]>([]);
  const [allDorms, setAllDorms] = useState<AllDorm[]>([]);
  const [pendingRooms, setPendingRooms] = useState<PendingRoom[]>([]);
  const [log, setLog] = useState<LogEntry[]>([]);
  const [editTarget, setEditTarget] = useState<Dorm | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [roomsModalDorm, setRoomsModalDorm] = useState<AllDorm | null>(null);
  const [dormRooms, setDormRooms] = useState<Room[]>([]);
  const [editRoomTarget, setEditRoomTarget] = useState<Room | null>(null);

  function reload() {
    apiClient.get<PendingDorm[]>('/admin/approvals').then(setPending).catch(() => setPending([]));
    apiClient.get<AllDorm[]>('/admin/approvals/dorms').then(setAllDorms).catch(() => setAllDorms([]));
    apiClient.get<PendingRoom[]>('/admin/approvals/rooms').then(setPendingRooms).catch(() => setPendingRooms([]));
    apiClient.get<LogEntry[]>('/admin/approvals/log').then(setLog).catch(() => setLog([]));
  }

  useEffect(() => {
    reload();

    const socket = getSocket();
    socket.on('dorm:new', reload);
    socket.on('room:new', reload);
    return () => {
      socket.off('dorm:new', reload);
      socket.off('room:new', reload);
    };
  }, []);

  async function approve(id: string) {
    setBusyId(id);
    try {
      await apiClient.patch(`/admin/approvals/${id}/approve`);
      reload();
    } catch {
      // เงียบไว้ก่อน — ไม่ให้พังทั้งหน้า
    } finally {
      setBusyId(null);
    }
  }

  async function reject(id: string) {
    setBusyId(id);
    try {
      await apiClient.patch(`/admin/approvals/${id}/reject`);
      reload();
    } catch {
      // เงียบไว้ก่อน — ไม่ให้พังทั้งหน้า
    } finally {
      setBusyId(null);
    }
  }

  async function approveRoom(id: string) {
    setBusyId(id);
    try {
      await apiClient.patch(`/admin/approvals/rooms/${id}/approve`);
      reload();
    } catch {
      // เงียบไว้ก่อน
    } finally {
      setBusyId(null);
    }
  }

  async function rejectRoom(id: string) {
    if (!window.confirm(t.confirmRejectRoom)) return;
    setBusyId(id);
    try {
      await apiClient.patch(`/admin/approvals/rooms/${id}/reject`);
      reload();
    } catch {
      // เงียบไว้ก่อน
    } finally {
      setBusyId(null);
    }
  }

  async function toggleAutoApprove(dormId: string, enabled: boolean) {
    try {
      await apiClient.patch(`/admin/approvals/${dormId}/auto-approve-rooms`, { enabled });
      reload();
    } catch {
      // เงียบไว้ก่อน
    }
  }

  function openRoomsModal(dorm: AllDorm) {
    setRoomsModalDorm(dorm);
    setDormRooms([]);
    apiClient
      .get<Room[]>(`/admin/approvals/dorms/${dorm.id}/rooms`)
      .then(setDormRooms)
      .catch(() => setDormRooms([]));
  }

  function reloadDormRooms() {
    if (!roomsModalDorm) return;
    apiClient
      .get<Room[]>(`/admin/approvals/dorms/${roomsModalDorm.id}/rooms`)
      .then(setDormRooms)
      .catch(() => setDormRooms([]));
  }

  async function toggleSuspend(dormId: string, suspended: boolean) {
    setBusyId(dormId);
    try {
      await apiClient.patch(`/admin/approvals/${dormId}/${suspended ? 'unsuspend' : 'suspend'}`);
      reload();
    } catch {
      // เงียบไว้ก่อน
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div>
      <Badge label={t.pendingCount(pending.length)} variant="warning" />

      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
        {pending.map((dorm) => (
          <div key={dorm.id} className="overflow-hidden rounded-card-lg border border-card-border bg-white shadow-card">
            {dorm.images?.length ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={dorm.images[0]} alt="" className="h-32 w-full object-cover" />
            ) : (
              <div className="flex h-32 items-center justify-center bg-surface-canvas font-mono text-xs text-ink-faint">
                {t.photoPlaceholder}
              </div>
            )}
            {dorm.images?.length > 1 && (
              <div className="flex gap-1.5 overflow-x-auto bg-surface-canvas p-1.5">
                {dorm.images.slice(1).map((url) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img key={url} src={url} alt="" className="h-10 w-10 shrink-0 rounded object-cover" />
                ))}
              </div>
            )}
            <div className="p-4">
              <div className="flex items-start justify-between gap-2">
                <h2 className="font-bold text-ink-strong">{dorm.name}</h2>
                <Badge label={t.pending} variant="warning" />
              </div>
              <p className="mt-1.5 text-sm text-ink-subtitle">
                {t.owner}: {dorm.owner.name} · {dorm.province}
                {dorm.owner.phone && ` · ${dorm.owner.phone}`}
              </p>
              {dorm.address && (
                <p className="mt-1 text-sm text-ink-subtitle">
                  {t.address}: {dorm.address}
                </p>
              )}
              <p className="mt-1 font-sans text-xs tabular-nums text-ink-faint">
                {t.coords}: {dorm.lat.toFixed(4)}, {dorm.lng.toFixed(4)}
              </p>

              <div className="mt-2.5">
                <p className="text-xs font-medium text-ink-subtitle">{t.documents(dorm.documents?.length ?? 0)}</p>
                {dorm.documents?.length ? (
                  <ul className="mt-1 flex flex-col gap-0.5">
                    {dorm.documents.map((url, i) => (
                      <li key={url}>
                        <a href={url} target="_blank" rel="noreferrer" className="text-sm text-tenant underline">
                          {t.documentItem(i + 1)}
                        </a>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-1 text-xs text-ink-faint">{t.noDocuments}</p>
                )}
              </div>

              <div className="mt-3.5 flex gap-2">
                <button
                  onClick={() => approve(dorm.id)}
                  disabled={busyId === dorm.id}
                  className="flex-1 rounded-lg bg-success py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
                >
                  {t.approve}
                </button>
                <button
                  onClick={() => reject(dorm.id)}
                  disabled={busyId === dorm.id}
                  className="flex-1 rounded-lg border border-card-border py-2 text-sm font-semibold text-danger disabled:opacity-50"
                >
                  {t.reject}
                </button>
                <button
                  onClick={() => setEditTarget(dorm)}
                  className="flex-1 rounded-lg bg-surface-canvas py-2 text-sm font-semibold text-ink-body"
                >
                  {t.edit}
                </button>
              </div>
            </div>
          </div>
        ))}
        {pending.length === 0 && <p className="text-ink-faint">{t.none}</p>}
      </div>

      {/* ===== ROOMS PENDING REVIEW ===== */}
      <div className="mt-8">
        <div className="flex items-center gap-2">
          <h2 className="text-base font-bold text-ink-strong">{t.roomsTitle}</h2>
          {pendingRooms.length > 0 && <Badge label={`${pendingRooms.length}`} variant="warning" />}
        </div>
        <div className="mt-3 overflow-x-auto rounded-card-lg border border-card-border bg-white px-2 shadow-card">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-hairline text-xs text-ink-faint">
                <th className="p-3 font-normal">{t.room}</th>
                <th className="p-3 font-normal">{t.dorm}</th>
                <th className="p-3 font-normal">{t.owner}</th>
                <th className="p-3 font-normal">{t.price}</th>
                <th className="p-3 font-normal"></th>
              </tr>
            </thead>
            <tbody>
              {pendingRooms.map((r) => (
                <tr key={r.id} className="border-b border-hairline last:border-0">
                  <td className="p-3 font-medium text-ink-strong">{r.name || r.type}</td>
                  <td className="p-3 text-ink-subtitle">{r.dorm.name}</td>
                  <td className="p-3 text-ink-subtitle">{r.dorm.owner.name}</td>
                  <td className="p-3 font-sans tabular-nums">฿{r.pricePerMonth.toLocaleString()}</td>
                  <td className="p-3 text-right">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => approveRoom(r.id)}
                        disabled={busyId === r.id}
                        className="rounded-lg bg-success px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
                      >
                        {t.approve}
                      </button>
                      <button
                        onClick={() => rejectRoom(r.id)}
                        disabled={busyId === r.id}
                        className="rounded-lg bg-danger-tint px-3 py-1.5 text-xs font-semibold text-danger disabled:opacity-50"
                      >
                        {t.reject}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {pendingRooms.length === 0 && <p className="p-4 text-ink-faint">{t.roomsNone}</p>}
        </div>
      </div>

      {/* ===== ALL DORMS ===== */}
      <div className="mt-8">
        <h2 className="text-base font-bold text-ink-strong">{t.allDormsTitle}</h2>
        <div className="mt-3 overflow-x-auto rounded-card-lg border border-card-border bg-white px-2 shadow-card">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-hairline text-xs text-ink-faint">
                <th className="p-3 font-normal">{t.dorm}</th>
                <th className="p-3 font-normal">{t.owner}</th>
                <th className="p-3 font-normal">{t.status}</th>
                <th className="p-3 font-normal">{t.autoApprove}</th>
                <th className="p-3 font-normal"></th>
              </tr>
            </thead>
            <tbody>
              {allDorms.map((dorm) => {
                const isSuspended = dorm.status.toUpperCase() === 'SUSPENDED';
                return (
                <tr key={dorm.id} className="border-b border-hairline last:border-0">
                  <td className="p-3 font-medium text-ink-strong">{dorm.name}</td>
                  <td className="p-3 text-ink-subtitle">{dorm.owner.name}</td>
                  <td className="p-3">
                    <Badge
                      label={t.statusLabel[dorm.status.toUpperCase()] ?? dorm.status}
                      variant={dorm.status.toUpperCase() === 'APPROVED' ? 'good' : dorm.status.toUpperCase() === 'REJECTED' || isSuspended ? 'critical' : 'warning'}
                    />
                  </td>
                  <td className="p-3">
                    <button
                      onClick={() => toggleAutoApprove(dorm.id, !dorm.autoApproveRooms)}
                      className={`relative h-6 w-11 rounded-pill transition-colors ${dorm.autoApproveRooms ? 'bg-success' : 'bg-card-border'}`}
                    >
                      <span
                        className={`absolute top-0.5 h-5 w-5 rounded-pill bg-white shadow transition-transform ${
                          dorm.autoApproveRooms ? 'translate-x-[22px]' : 'translate-x-0.5'
                        }`}
                      />
                    </button>
                  </td>
                  <td className="p-3 text-right">
                    <div className="flex items-center justify-end gap-3">
                      <button onClick={() => setEditTarget(dorm)} className="text-sm font-semibold text-tenant">
                        {t.edit}
                      </button>
                      <button onClick={() => openRoomsModal(dorm)} className="text-sm font-semibold text-tenant">
                        {t.manageRooms}
                      </button>
                      <button
                        onClick={() => toggleSuspend(dorm.id, isSuspended)}
                        disabled={busyId === dorm.id || dorm.status.toUpperCase() === 'PENDING_APPROVAL'}
                        className={`text-sm font-semibold disabled:opacity-40 ${isSuspended ? 'text-success' : 'text-danger'}`}
                      >
                        {isSuspended ? t.unsuspend : t.suspend}
                      </button>
                      <Link href={`/admin/users?ownerId=${dorm.owner.id}`} className="text-sm font-semibold text-ink-subtitle hover:underline">
                        {t.viewOwner}
                      </Link>
                    </div>
                  </td>
                </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ===== APPROVAL HISTORY ===== */}
      <div className="mt-8">
        <h2 className="text-base font-bold text-ink-strong">{t.logTitle}</h2>
        <div className="mt-3 overflow-x-auto rounded-card-lg border border-card-border bg-white px-2 shadow-card">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-hairline text-xs text-ink-faint">
                <th className="p-3 font-normal">{t.status}</th>
                <th className="p-3 font-normal">{t.dorm}/{t.room}</th>
                <th className="p-3 font-normal">{t.owner}</th>
                <th className="p-3 font-normal"></th>
              </tr>
            </thead>
            <tbody>
              {log.map((entry) => (
                <tr key={entry.id} className="border-b border-hairline last:border-0">
                  <td className="p-3">
                    <Badge
                      label={t.logAction[entry.action] ?? entry.action}
                      variant={entry.action === 'APPROVED' || entry.action === 'UNSUSPENDED' ? 'good' : entry.action === 'REJECTED' || entry.action === 'SUSPENDED' ? 'critical' : 'warning'}
                    />
                  </td>
                  <td className="p-3 text-ink-subtitle">
                    {t.logEntity[entry.entityType] ?? entry.entityType} · {entry.entityId.slice(0, 8)}
                  </td>
                  <td className="p-3 text-ink-subtitle">{entry.admin.name}</td>
                  <td className="p-3 text-right font-sans text-xs tabular-nums text-ink-faint">
                    {new Date(entry.createdAt).toLocaleString(lang === 'th' ? 'th-TH' : 'en-US')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {log.length === 0 && <p className="p-4 text-ink-faint">{t.logNone}</p>}
        </div>
      </div>

      {editTarget && (
        <EditDormModal
          dorm={editTarget}
          t={t}
          onClose={() => setEditTarget(null)}
          onSaved={() => {
            setEditTarget(null);
            reload();
          }}
          onImagesChanged={reload}
        />
      )}

      {roomsModalDorm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-6">
          <div className="w-full max-w-lg rounded-card-lg border border-card-border bg-white p-5 shadow-card">
            <h2 className="font-bold text-ink-strong">{t.roomsModalTitle(roomsModalDorm.name)}</h2>
            <div className="mt-3 flex max-h-96 flex-col gap-2 overflow-y-auto">
              {dormRooms.map((r) => (
                <div key={r.id} className="flex items-center justify-between gap-3 rounded-lg border border-card-border p-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-ink-strong">{r.name || (r.type.toUpperCase() === 'AIR' ? t.roomAir : t.roomFan)}</p>
                    <p className="text-xs text-ink-muted">฿{r.pricePerMonth.toLocaleString()}</p>
                  </div>
                  <button
                    onClick={() => setEditRoomTarget(r)}
                    className="shrink-0 text-sm font-semibold text-tenant"
                  >
                    {t.edit}
                  </button>
                </div>
              ))}
              {dormRooms.length === 0 && <p className="text-sm text-ink-faint">{t.roomsNoneInDorm}</p>}
            </div>
            <button
              onClick={() => setRoomsModalDorm(null)}
              className="mt-4 w-full rounded-btn bg-tenant py-2.5 text-sm font-semibold text-white hover:bg-tenant-dark"
            >
              {t.close}
            </button>
          </div>
        </div>
      )}

      {editRoomTarget && (
        <EditRoomModal
          room={editRoomTarget}
          t={t}
          onClose={() => setEditRoomTarget(null)}
          onSaved={() => {
            setEditRoomTarget(null);
            reloadDormRooms();
          }}
        />
      )}
    </div>
  );
}

function EditDormModal({
  dorm,
  t,
  onClose,
  onSaved,
  onImagesChanged,
}: {
  dorm: Dorm;
  t: (typeof TEXT)['th'];
  onClose: () => void;
  onSaved: () => void;
  onImagesChanged: () => void;
}) {
  const [name, setName] = useState(dorm.name);
  const [address, setAddress] = useState(dorm.address ?? '');
  const [province, setProvince] = useState(dorm.province);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [images, setImages] = useState(dorm.images ?? []);
  const [uploadingImages, setUploadingImages] = useState(false);

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      await apiClient.patch(`/admin/approvals/${dorm.id}/edit`, { name, address, province });
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
      const res = await fetch(`${API_URL}/admin/approvals/${dorm.id}/images`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${getToken()}` },
        body: formData,
      });
      if (res.ok) {
        const updated: Dorm = await res.json();
        setImages(updated.images);
        onImagesChanged();
      }
    } finally {
      setUploadingImages(false);
      e.target.value = '';
    }
  }

  async function handleRemoveImage(index: number) {
    if (!window.confirm(t.removeImageConfirm)) return;
    try {
      const res = await fetch(`${API_URL}/admin/approvals/${dorm.id}/images/${index}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (res.ok) {
        const updated: Dorm = await res.json();
        setImages(updated.images);
        onImagesChanged();
      }
    } catch {
      // เงียบไว้ก่อน
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-6">
      <div className="w-full max-w-sm rounded-card-lg border border-card-border bg-white p-5 shadow-card">
        <h2 className="font-bold text-ink-strong">{t.modalTitle}</h2>
        <div className="mt-4 flex flex-col gap-3">
          <div>
            <label className="mb-1.5 block text-xs text-ink-muted">{t.name}</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-11 w-full rounded-lg border border-card-border px-3.5 text-sm"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs text-ink-muted">{t.address}</label>
            <input
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="h-11 w-full rounded-lg border border-card-border px-3.5 text-sm"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs text-ink-muted">{t.province}</label>
            <select
              value={province}
              onChange={(e) => setProvince(e.target.value)}
              className="h-11 w-full rounded-lg border border-card-border px-3.5 text-sm"
            >
              {PROVINCES.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1.5 block text-xs text-ink-muted">{t.imagesLabel}</label>
            <div className="grid grid-cols-4 gap-1.5">
              {images.map((url, i) => (
                <div key={url} className="group relative h-14 overflow-hidden rounded-md border border-card-border">
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

function EditRoomModal({
  room,
  t,
  onClose,
  onSaved,
}: {
  room: Room;
  t: (typeof TEXT)['th'];
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
      await apiClient.patch(`/admin/approvals/rooms/${room.id}/edit`, {
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
      const res = await fetch(`${API_URL}/admin/approvals/rooms/${room.id}/images`, {
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
    const res = await fetch(`${API_URL}/admin/approvals/rooms/${room.id}/images/${index}`, {
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
        <h2 className="font-bold text-ink-strong">{t.editRoomTitle}</h2>
        <div className="mt-4 flex flex-col gap-3">
          <div>
            <label className="mb-1.5 block text-xs text-ink-muted">{t.roomName}</label>
            <input value={name} onChange={(e) => setName(e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className="mb-1.5 block text-xs text-ink-muted">{t.roomKind}</label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setType('AIR')}
                className={`flex-1 rounded-lg py-2 text-sm font-semibold ${type === 'AIR' ? 'bg-tenant text-white' : 'bg-surface-canvas text-ink-body'}`}
              >
                {t.roomAir}
              </button>
              <button
                type="button"
                onClick={() => setType('FAN')}
                className={`flex-1 rounded-lg py-2 text-sm font-semibold ${type === 'FAN' ? 'bg-tenant text-white' : 'bg-surface-canvas text-ink-body'}`}
              >
                {t.roomFan}
              </button>
            </div>
          </div>
          <div>
            <label className="mb-1.5 block text-xs text-ink-muted">{t.roomDescription}</label>
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
              <label className="mb-1.5 block text-xs text-ink-muted">{t.roomDeposit}</label>
              <input type="number" value={deposit} onChange={(e) => setDeposit(Number(e.target.value))} className={`${inputClass} font-sans`} />
            </div>
            <div>
              <label className="mb-1.5 block text-xs text-ink-muted">{t.roomWater}</label>
              <input type="number" value={waterRate} onChange={(e) => setWaterRate(Number(e.target.value))} className={`${inputClass} font-sans`} />
            </div>
            <div>
              <label className="mb-1.5 block text-xs text-ink-muted">{t.roomElectric}</label>
              <input type="number" value={electricRate} onChange={(e) => setElectricRate(Number(e.target.value))} className={`${inputClass} font-sans`} />
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-xs text-ink-muted">{t.imagesLabel}</label>
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
            {t.close}
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
