'use client';

import { Fragment, useEffect, useMemo, useState } from 'react';
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
    rejectReasonPrompt: 'ระบุเหตุผลที่ปฏิเสธ + วิธีแก้ไข (เจ้าของหอจะได้รับแจ้งเตือน แก้แล้วส่งใหม่ได้):',
    rejectedTimes: (n: number) => `ถูกปฏิเสธมาแล้ว ${n} ครั้ง`,
    prevReason: 'เหตุผลครั้งก่อน',
    suspendNow: 'ระงับหอนี้ทันที',
    over3: 'ปฏิเสธครบ 3 ครั้ง — ระงับได้ทันที',
    edit: 'แก้ไขข้อมูล',
    none: 'ไม่มีหอรออนุมัติ',

    roomsTitle: 'ห้องพักรอตรวจสอบ',
    roomsNone: 'ไม่มีห้องรอตรวจสอบ',
    roomsCountUnit: (n: number) => `${n} ห้อง`,
    approveAll: 'อนุมัติทั้งกลุ่ม',
    rejectAll: 'ปฏิเสธทั้งกลุ่ม',
    confirmRejectGroup: (n: number) => `ยืนยันปฏิเสธทั้ง ${n} ห้องในกลุ่มนี้? ข้อมูลห้องจะถูกลบถาวร (ระบบเก็บ log ไว้)`,
    room: 'ห้อง',
    dorm: 'หอพัก',
    price: 'ราคา',

    allDormsTitle: 'หอพักทั้งหมด',
    status: 'สถานะ',
    autoApprove: 'อนุมัติห้องอัตโนมัติ',
    deleteDorm: 'ลบถาวร',
    deleteOwner: 'ลบบัญชีเจ้าของหอ',
    deleteOwnerConfirm: (name: string, dorm: string) =>
      `ลบบัญชีเจ้าของหอ "${name}" ถาวร?\n\nหอ "${dorm}" และห้อง/รีวิว/รายการโปรดทั้งหมดจะถูกลบไปด้วย กู้คืนไม่ได้\n(ทำได้เฉพาะเมื่อระงับหอทุกแห่งแล้วและไม่มีการจองผูกอยู่)`,
    deleteConfirm: (name: string) => `ลบหอ "${name}" ถาวร? ข้อมูลหอ ห้อง รีวิว และรายการโปรดจะถูกลบทั้งหมด กู้คืนไม่ได้`,
    deleteFailed: 'ลบไม่สำเร็จ',
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
      DELETED: 'ลบถาวร',
    } as Record<string, string>,
    logEntity: { DORM: 'หอพัก', ROOM: 'ห้องพัก', USER: 'บัญชีเจ้าของหอ' } as Record<string, string>,

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
    rejectReasonPrompt: 'Reason for rejection + how to fix (the owner is notified and can fix & resubmit):',
    rejectedTimes: (n: number) => `Rejected ${n} time(s)`,
    prevReason: 'Previous reason',
    suspendNow: 'Suspend this dorm now',
    over3: 'Rejected 3 times — can suspend now',
    edit: 'Edit info',
    none: 'No dorms pending approval',

    roomsTitle: 'Rooms pending review',
    roomsNone: 'No rooms pending review',
    roomsCountUnit: (n: number) => `${n} room${n > 1 ? 's' : ''}`,
    approveAll: 'Approve all',
    rejectAll: 'Reject all',
    confirmRejectGroup: (n: number) => `Reject all ${n} rooms in this group? Their data will be permanently deleted (a log is kept).`,
    room: 'Room',
    dorm: 'Dorm',
    price: 'Price',

    allDormsTitle: 'All dorms',
    status: 'Status',
    autoApprove: 'Auto-approve rooms',
    deleteDorm: 'Delete',
    deleteOwner: 'Delete owner account',
    deleteOwnerConfirm: (name: string, dorm: string) =>
      `Permanently delete owner "${name}"?\n\nDorm "${dorm}" and its rooms/reviews/favorites are removed too. This cannot be undone.`,
    deleteConfirm: (name: string) => `Permanently delete "${name}"? Its rooms, reviews and favorites are removed too. This cannot be undone.`,
    deleteFailed: 'Delete failed',
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
      DELETED: 'Deleted',
    } as Record<string, string>,
    logEntity: { DORM: 'Dorm', ROOM: 'Room', USER: 'Owner account' } as Record<string, string>,

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
  const [expandedRoomGroups, setExpandedRoomGroups] = useState<Set<string>>(new Set());
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

  // ลบบัญชีเจ้าของหอถาวร — backend อนุญาตเฉพาะเมื่อหอทุกแห่งถูกระงับ/ปฏิเสธ และไม่มีการจองผูกอยู่
  async function removeOwner(dorm: AllDorm) {
    if (!window.confirm(t.deleteOwnerConfirm(dorm.owner.name, dorm.name))) return;
    setBusyId(dorm.id);
    try {
      await apiClient.delete(`/admin/approvals/owners/${dorm.owner.id}`);
      reload();
    } catch (err) {
      window.alert(err instanceof Error ? err.message : t.deleteFailed);
    } finally {
      setBusyId(null);
    }
  }

  // ลบหอถาวร — backend อนุญาตเฉพาะหอที่ถูกปฏิเสธและไม่มีการจองผูกอยู่
  async function removeDorm(dorm: AllDorm) {
    if (!window.confirm(t.deleteConfirm(dorm.name))) return;
    setBusyId(dorm.id);
    try {
      await apiClient.delete(`/admin/approvals/dorms/${dorm.id}`);
      reload();
    } catch (err) {
      window.alert(err instanceof Error ? err.message : t.deleteFailed);
    } finally {
      setBusyId(null);
    }
  }

  async function reject(id: string) {
    const reason = window.prompt(t.rejectReasonPrompt)?.trim();
    if (!reason) return; // ยกเลิก/ไม่กรอกเหตุผล = ไม่ปฏิเสธ
    setBusyId(id);
    try {
      await apiClient.patch(`/admin/approvals/${id}/reject`, { reason });
      reload();
    } catch {
      // เงียบไว้ก่อน — ไม่ให้พังทั้งหน้า
    } finally {
      setBusyId(null);
    }
  }

  // อนุมัติ/ปฏิเสธรายห้อง (ใช้ตอนกดแตกกลุ่มดูรายห้อง)
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

  // อนุมัติ/ปฏิเสธห้องทั้งกลุ่มครั้งเดียว — ยิงทีละห้องขนานกัน (backend มี endpoint รายห้อง)
  async function approveGroup(key: string, ids: string[]) {
    setBusyId(key);
    try {
      await Promise.all(ids.map((id) => apiClient.patch(`/admin/approvals/rooms/${id}/approve`)));
      reload();
    } catch {
      // เงียบไว้ก่อน
    } finally {
      setBusyId(null);
    }
  }

  async function rejectGroup(key: string, ids: string[]) {
    if (!window.confirm(t.confirmRejectGroup(ids.length))) return;
    setBusyId(key);
    try {
      await Promise.all(ids.map((id) => apiClient.patch(`/admin/approvals/rooms/${id}/reject`)));
      reload();
    } catch {
      // เงียบไว้ก่อน
    } finally {
      setBusyId(null);
    }
  }

  function toggleExpand(key: string) {
    setExpandedRoomGroups((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
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

  // รวมห้องเหมือนกันของหอเดียวกัน (ประเภท+ราคา+มัดจำ) เป็นกลุ่ม — ใช้ทั้งตารางจอใหญ่และการ์ดมือถือ
  const roomGroups = useMemo(() => {
    const map = new Map<
      string,
      { key: string; dormName: string; ownerName: string; type: string; price: number; ids: string[]; rooms: PendingRoom[] }
    >();
    for (const r of pendingRooms) {
      const key = `${r.dormId}|${r.type}|${r.pricePerMonth}|${r.deposit ?? 0}`;
      const g = map.get(key);
      if (g) {
        g.ids.push(r.id);
        g.rooms.push(r);
      } else {
        map.set(key, {
          key,
          dormName: r.dorm.name,
          ownerName: r.dorm.owner.name,
          type: r.type,
          price: r.pricePerMonth,
          ids: [r.id],
          rooms: [r],
        });
      }
    }
    return [...map.values()];
  }, [pendingRooms]);

  // แยกหอตามสถานะ ไม่ให้ "ปฏิเสธ/ระงับ" ปนกับ "อนุมัติแล้ว"
  const dormGroups = useMemo(() => {
    const order = ['PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'SUSPENDED'];
    return order
      .map((status) => ({ status, dorms: allDorms.filter((d) => d.status.toUpperCase() === status) }))
      .filter((g) => g.dorms.length > 0);
  }, [allDorms]);

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

              {(dorm.rejectionCount ?? 0) > 0 && (
                <div className="mt-2.5 rounded-lg border border-[#E0902F]/40 bg-[#E0902F]/10 p-2.5">
                  <p className="text-xs font-semibold text-[#B4791A]">
                    {t.rejectedTimes(dorm.rejectionCount ?? 0)}
                    {(dorm.rejectionCount ?? 0) >= 3 && ` · ${t.over3}`}
                  </p>
                  {dorm.rejectionReason && (
                    <p className="mt-1 whitespace-pre-line text-xs text-ink-subtitle">
                      {t.prevReason}: {dorm.rejectionReason}
                    </p>
                  )}
                </div>
              )}

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
                {(dorm.rejectionCount ?? 0) >= 3 && (
                  <button
                    onClick={() => toggleSuspend(dorm.id, false)}
                    disabled={busyId === dorm.id}
                    className="flex-1 rounded-lg bg-danger py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
                  >
                    {t.suspendNow}
                  </button>
                )}
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
        {/* จอ md ขึ้นไป: ตารางพอดีความกว้าง ไม่ต้องเลื่อนแนวนอน */}
        <div className="mt-3 hidden rounded-card-lg border border-card-border bg-white px-2 shadow-card md:block">
          <table className="w-full table-fixed text-left text-[13px]">
            <colgroup>
              <col className="w-[22%]" />
              <col className="w-[22%]" />
              <col className="w-[18%]" />
              <col className="w-[13%]" />
              <col className="w-[25%]" />
            </colgroup>
            <thead>
              <tr className="border-b border-hairline text-[11.5px] text-ink-faint">
                <th className="p-2.5 font-normal">{t.room}</th>
                <th className="p-2.5 font-normal">{t.dorm}</th>
                <th className="p-2.5 font-normal">{t.owner}</th>
                <th className="p-2.5 text-right font-normal">{t.price}</th>
                <th className="p-2.5 font-normal"></th>
              </tr>
            </thead>
            <tbody>
              {(() => {
                return roomGroups.map((g) => {
                  const open = expandedRoomGroups.has(g.key);
                  const busy = busyId === g.key;
                  return (
                    <Fragment key={g.key}>
                      <tr className="border-b border-hairline">
                        <td className="p-2.5 font-medium text-ink-strong">
                          <button onClick={() => toggleExpand(g.key)} className="inline-flex max-w-full items-center gap-1.5 hover:text-tenant">
                            <svg
                              width="14"
                              height="14"
                              viewBox="0 0 24 24"
                              fill="none"
                              className={`transition-transform ${open ? 'rotate-90' : ''}`}
                            >
                              <path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                            {g.type} · {t.roomsCountUnit(g.ids.length)}
                          </button>
                        </td>
                        <td className="truncate p-2.5 text-ink-subtitle" title={g.dormName}>
                          {g.dormName}
                        </td>
                        <td className="truncate p-2.5 text-ink-subtitle" title={g.ownerName}>
                          {g.ownerName}
                        </td>
                        <td className="p-2.5 text-right font-sans tabular-nums">฿{g.price.toLocaleString()}</td>
                        <td className="p-2.5 text-right">
                          <div className="flex flex-wrap justify-end gap-1.5">
                            <button
                              onClick={() => approveGroup(g.key, g.ids)}
                              disabled={busy}
                              className="rounded-lg bg-success px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
                            >
                              {g.ids.length > 1 ? t.approveAll : t.approve}
                            </button>
                            <button
                              onClick={() => rejectGroup(g.key, g.ids)}
                              disabled={busy}
                              className="rounded-lg bg-danger-tint px-3 py-1.5 text-xs font-semibold text-danger disabled:opacity-50"
                            >
                              {g.ids.length > 1 ? t.rejectAll : t.reject}
                            </button>
                          </div>
                        </td>
                      </tr>
                      {open &&
                        g.rooms.map((r) => (
                          <tr key={r.id} className="border-b border-hairline bg-surface-canvas/40 last:border-0">
                            <td className="truncate py-2 pl-8 pr-2 text-[12.5px] font-medium text-ink-strong">
                              {r.name || r.type}
                            </td>
                            <td className="truncate py-2 pr-2 text-[12.5px] text-ink-subtitle">
                              {r.type}
                              {(r.deposit ?? 0) > 0 && ` · ${lang === 'th' ? 'มัดจำ' : 'Deposit'} ฿${(r.deposit ?? 0).toLocaleString()}`}
                            </td>
                            <td className="truncate py-2 pr-2 text-[12.5px] text-ink-subtitle">
                              {(r.amenities ?? []).slice(0, 3).join(', ')}
                            </td>
                            <td className="py-2 pr-2 text-right font-sans text-[12.5px] tabular-nums">
                              ฿{r.pricePerMonth.toLocaleString()}
                            </td>
                            <td className="py-2 pr-2 text-right">
                              <div className="flex flex-wrap justify-end gap-1.5">
                                <button
                                  onClick={() => approveRoom(r.id)}
                                  disabled={busyId === r.id}
                                  className="rounded-lg bg-success px-2.5 py-1 text-[11px] font-semibold text-white disabled:opacity-50"
                                >
                                  {t.approve}
                                </button>
                                <button
                                  onClick={() => rejectRoom(r.id)}
                                  disabled={busyId === r.id}
                                  className="rounded-lg bg-danger-tint px-2.5 py-1 text-[11px] font-semibold text-danger disabled:opacity-50"
                                >
                                  {t.reject}
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                    </Fragment>
                  );
                });
              })()}
            </tbody>
          </table>
          {pendingRooms.length === 0 && <p className="p-4 text-ink-faint">{t.roomsNone}</p>}
        </div>

        {/* มือถือ: การ์ดต่อกลุ่มห้อง — กดหัวการ์ดเพื่อแตกดูรายห้อง */}
        <div className="mt-3 flex flex-col gap-2.5 md:hidden">
          {roomGroups.map((g) => {
            const open = expandedRoomGroups.has(g.key);
            const busy = busyId === g.key;
            return (
              <div key={g.key} className="rounded-card-lg border border-card-border bg-white p-3.5 shadow-card">
                <button onClick={() => toggleExpand(g.key)} className="flex w-full items-center gap-2 text-left">
                  <svg
                    width="15"
                    height="15"
                    viewBox="0 0 24 24"
                    fill="none"
                    className={`shrink-0 text-ink-faint transition-transform ${open ? 'rotate-90' : ''}`}
                  >
                    <path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold text-ink-strong">
                      {g.type} · {t.roomsCountUnit(g.ids.length)}
                    </span>
                    <span className="block truncate text-[12.5px] text-ink-muted">
                      {g.dormName} · {g.ownerName}
                    </span>
                  </span>
                  <span className="shrink-0 font-sans text-[14px] font-bold tabular-nums text-ink-strong">
                    ฿{g.price.toLocaleString()}
                  </span>
                </button>

                <div className="mt-2.5 flex gap-2">
                  <button
                    onClick={() => approveGroup(g.key, g.ids)}
                    disabled={busy}
                    className="flex-1 rounded-lg bg-success py-2 text-xs font-semibold text-white disabled:opacity-50"
                  >
                    {g.ids.length > 1 ? t.approveAll : t.approve}
                  </button>
                  <button
                    onClick={() => rejectGroup(g.key, g.ids)}
                    disabled={busy}
                    className="flex-1 rounded-lg bg-danger-tint py-2 text-xs font-semibold text-danger disabled:opacity-50"
                  >
                    {g.ids.length > 1 ? t.rejectAll : t.reject}
                  </button>
                </div>

                {open && (
                  <div className="mt-2.5 flex flex-col gap-2 border-t border-hairline pt-2.5">
                    {g.rooms.map((r) => (
                      <div key={r.id} className="rounded-[11px] bg-surface-canvas p-2.5">
                        <div className="flex items-center justify-between gap-2">
                          <span className="min-w-0 flex-1 truncate text-[13px] font-semibold text-ink-strong">
                            {r.name || r.type}
                          </span>
                          <span className="shrink-0 font-sans text-[12.5px] tabular-nums text-ink-body">
                            ฿{r.pricePerMonth.toLocaleString()}
                          </span>
                        </div>
                        <div className="mt-0.5 truncate text-[11.5px] text-ink-muted">
                          {(r.deposit ?? 0) > 0 &&
                            `${lang === 'th' ? 'มัดจำ' : 'Deposit'} ฿${(r.deposit ?? 0).toLocaleString()}`}
                          {(r.amenities ?? []).length > 0 && ` · ${(r.amenities ?? []).slice(0, 3).join(', ')}`}
                        </div>
                        <div className="mt-2 flex gap-2">
                          <button
                            onClick={() => approveRoom(r.id)}
                            disabled={busyId === r.id}
                            className="flex-1 rounded-lg bg-success py-1.5 text-[11.5px] font-semibold text-white disabled:opacity-50"
                          >
                            {t.approve}
                          </button>
                          <button
                            onClick={() => rejectRoom(r.id)}
                            disabled={busyId === r.id}
                            className="flex-1 rounded-lg bg-danger-tint py-1.5 text-[11.5px] font-semibold text-danger disabled:opacity-50"
                          >
                            {t.reject}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
          {pendingRooms.length === 0 && <p className="text-ink-faint">{t.roomsNone}</p>}
        </div>
      </div>

      {/* ===== ALL DORMS ===== */}
      <div className="mt-8">
        <h2 className="text-base font-bold text-ink-strong">{t.allDormsTitle}</h2>
        {/* จอ md ขึ้นไป: ตาราง (ไม่ต้องเลื่อนแนวนอน) */}
        <div className="mt-3 hidden rounded-card-lg border border-card-border bg-white px-2 shadow-card md:block">
          <table className="w-full table-fixed text-left text-[13px]">
            <colgroup>
              <col className="w-[22%]" />
              <col className="w-[16%]" />
              <col className="w-[13%]" />
              <col className="w-[12%]" />
              <col className="w-[37%]" />
            </colgroup>
            <thead>
              <tr className="border-b border-hairline text-[11.5px] text-ink-faint">
                <th className="p-2.5 font-normal">{t.dorm}</th>
                <th className="p-2.5 font-normal">{t.owner}</th>
                <th className="p-2.5 font-normal">{t.status}</th>
                <th className="p-2.5 font-normal">{t.autoApprove}</th>
                <th className="p-2.5 font-normal"></th>
              </tr>
            </thead>
            <tbody>
              {dormGroups.flatMap((group) => [
                <tr key={`h-${group.status}`} className="border-b border-hairline bg-surface-canvas">
                  <td colSpan={5} className="px-2.5 py-2 text-[11.5px] font-bold uppercase tracking-wide text-ink-muted">
                    {t.statusLabel[group.status] ?? group.status} · {group.dorms.length}
                  </td>
                </tr>,
                ...group.dorms.map((dorm) => {
                const isSuspended = dorm.status.toUpperCase() === 'SUSPENDED';
                const isRejected = dorm.status.toUpperCase() === 'REJECTED';
                return (
                <tr key={dorm.id} className="border-b border-hairline last:border-0">
                  <td className="truncate p-2.5 font-medium text-ink-strong" title={dorm.name}>
                    {dorm.name}
                  </td>
                  <td className="truncate p-2.5 text-ink-subtitle" title={dorm.owner.name}>
                    {dorm.owner.name}
                  </td>
                  <td className="p-2.5">
                    <Badge
                      label={t.statusLabel[dorm.status.toUpperCase()] ?? dorm.status}
                      variant={dorm.status.toUpperCase() === 'APPROVED' ? 'good' : dorm.status.toUpperCase() === 'REJECTED' || isSuspended ? 'critical' : 'warning'}
                    />
                  </td>
                  <td className="p-2.5">
                    {/* เปิด = เขียว ปุ่มชิดขวา · ปิด = เทา ปุ่มชิดซ้าย (ใช้ left ตรงๆ ไม่ใช้ translate กันตำแหน่งเพี้ยน) */}
                    <button
                      onClick={() => toggleAutoApprove(dorm.id, !dorm.autoApproveRooms)}
                      aria-pressed={!!dorm.autoApproveRooms}
                      className={`relative block h-6 w-11 rounded-pill transition-colors ${
                        dorm.autoApproveRooms ? 'bg-success' : 'bg-card-border'
                      }`}
                    >
                      <span
                        className={`absolute top-0.5 h-5 w-5 rounded-pill bg-white shadow transition-all ${
                          dorm.autoApproveRooms ? 'left-[22px]' : 'left-0.5'
                        }`}
                      />
                    </button>
                  </td>
                  <td className="p-2.5 text-right">
                    <div className="flex flex-wrap items-center justify-end gap-x-3 gap-y-1">
                      {/* หอที่ถูกปฏิเสธ อนุมัติย้อนหลังได้ (คืนสิทธิ์เจ้าของหอ + ล้างเหตุผลปฏิเสธ) */}
                      {isRejected && (
                        <button
                          onClick={() => approve(dorm.id)}
                          disabled={busyId === dorm.id}
                          className="rounded-lg bg-success px-2.5 py-1 text-[12px] font-semibold text-white disabled:opacity-50"
                        >
                          {t.approve}
                        </button>
                      )}
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
                      {isRejected && (
                        <button
                          onClick={() => removeDorm(dorm)}
                          disabled={busyId === dorm.id}
                          className="text-sm font-semibold text-danger hover:underline disabled:opacity-40"
                        >
                          {t.deleteDorm}
                        </button>
                      )}
                      {/* ระงับหอแล้วถึงจะตัดบัญชีเจ้าของออกจากระบบได้ */}
                      {isSuspended && (
                        <button
                          onClick={() => removeOwner(dorm)}
                          disabled={busyId === dorm.id}
                          className="rounded-[8px] bg-[#C0392B] px-2.5 py-1 text-[12px] font-semibold text-white disabled:opacity-40"
                        >
                          {t.deleteOwner}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
                );
              }),
              ])}
            </tbody>
          </table>
        </div>

        {/* มือถือ: การ์ดต่อหอ — แยกหัวข้อตามสถานะ */}
        <div className="mt-3 flex flex-col gap-4 md:hidden">
          {dormGroups.map((group) => (
            <div key={group.status} className="flex flex-col gap-2.5">
              <div className="text-[11.5px] font-bold uppercase tracking-wide text-ink-muted">
                {t.statusLabel[group.status] ?? group.status} · {group.dorms.length}
              </div>
              {group.dorms.map((dorm) => {
            const isSuspended = dorm.status.toUpperCase() === 'SUSPENDED';
            const isRejected = dorm.status.toUpperCase() === 'REJECTED';
            return (
              <div key={dorm.id} className="rounded-card-lg border border-card-border bg-white p-3.5 shadow-card">
                <div className="flex items-start justify-between gap-2">
                  <span className="min-w-0 flex-1 truncate font-semibold text-ink-strong">{dorm.name}</span>
                  <Badge
                    label={t.statusLabel[dorm.status.toUpperCase()] ?? dorm.status}
                    variant={
                      dorm.status.toUpperCase() === 'APPROVED'
                        ? 'good'
                        : dorm.status.toUpperCase() === 'REJECTED' || isSuspended
                          ? 'critical'
                          : 'warning'
                    }
                  />
                </div>
                <div className="mt-0.5 truncate text-[12.5px] text-ink-muted">{dorm.owner.name}</div>

                <div className="mt-2.5 flex items-center justify-between gap-2 rounded-[10px] bg-surface-canvas px-3 py-2">
                  <span className="text-[12.5px] text-ink-body">{t.autoApprove}</span>
                  <button
                    onClick={() => toggleAutoApprove(dorm.id, !dorm.autoApproveRooms)}
                    aria-pressed={!!dorm.autoApproveRooms}
                    className={`relative block h-6 w-11 shrink-0 rounded-pill transition-colors ${
                      dorm.autoApproveRooms ? 'bg-success' : 'bg-card-border'
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 h-5 w-5 rounded-pill bg-white shadow transition-all ${
                        dorm.autoApproveRooms ? 'left-[22px]' : 'left-0.5'
                      }`}
                    />
                  </button>
                </div>

                <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[13px] font-semibold">
                  {isRejected && (
                    <button
                      onClick={() => approve(dorm.id)}
                      disabled={busyId === dorm.id}
                      className="rounded-lg bg-success px-3 py-1 text-[12.5px] text-white disabled:opacity-50"
                    >
                      {t.approve}
                    </button>
                  )}
                  <button onClick={() => setEditTarget(dorm)} className="text-tenant">
                    {t.edit}
                  </button>
                  <button onClick={() => openRoomsModal(dorm)} className="text-tenant">
                    {t.manageRooms}
                  </button>
                  <button
                    onClick={() => toggleSuspend(dorm.id, isSuspended)}
                    disabled={busyId === dorm.id || dorm.status.toUpperCase() === 'PENDING_APPROVAL'}
                    className={`disabled:opacity-40 ${isSuspended ? 'text-success' : 'text-danger'}`}
                  >
                    {isSuspended ? t.unsuspend : t.suspend}
                  </button>
                  <Link href={`/admin/users?ownerId=${dorm.owner.id}`} className="text-ink-subtitle underline">
                    {t.viewOwner}
                  </Link>
                  {isRejected && (
                    <button
                      onClick={() => removeDorm(dorm)}
                      disabled={busyId === dorm.id}
                      className="text-danger disabled:opacity-40"
                    >
                      {t.deleteDorm}
                    </button>
                  )}
                  {isSuspended && (
                    <button
                      onClick={() => removeOwner(dorm)}
                      disabled={busyId === dorm.id}
                      className="rounded-[9px] bg-[#C0392B] px-3 py-1 text-[12.5px] text-white disabled:opacity-40"
                    >
                      {t.deleteOwner}
                    </button>
                  )}
                </div>
              </div>
            );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* ===== APPROVAL HISTORY ===== */}
      <div className="mt-8">
        <h2 className="text-base font-bold text-ink-strong">{t.logTitle}</h2>
        {/* จอ md ขึ้นไป: ตาราง */}
        <div className="mt-3 hidden rounded-card-lg border border-card-border bg-white px-2 shadow-card md:block">
          <table className="w-full table-fixed text-left text-[13px]">
            <colgroup>
              <col className="w-[16%]" />
              <col className="w-[30%]" />
              <col className="w-[24%]" />
              <col className="w-[30%]" />
            </colgroup>
            <thead>
              <tr className="border-b border-hairline text-[11.5px] text-ink-faint">
                <th className="p-2.5 font-normal">{t.status}</th>
                <th className="p-2.5 font-normal">{t.dorm}/{t.room}</th>
                <th className="p-2.5 font-normal">{t.owner}</th>
                <th className="p-2.5 font-normal"></th>
              </tr>
            </thead>
            <tbody>
              {log.map((entry) => (
                <tr key={entry.id} className="border-b border-hairline last:border-0">
                  <td className="p-2.5">
                    <Badge
                      label={t.logAction[entry.action] ?? entry.action}
                      variant={entry.action === 'APPROVED' || entry.action === 'UNSUSPENDED' ? 'good' : entry.action === 'REJECTED' || entry.action === 'SUSPENDED' || entry.action === 'DELETED' ? 'critical' : 'warning'}
                    />
                  </td>
                  <td className="p-2.5 text-ink-subtitle">
                    <span className="block truncate">
                      {t.logEntity[entry.entityType] ?? entry.entityType} · {entry.entityId.slice(0, 8)}
                    </span>
                    {entry.note && (
                      <span className="mt-0.5 block truncate text-[11.5px] text-ink-faint" title={entry.note}>
                        {entry.note}
                      </span>
                    )}
                  </td>
                  <td className="truncate p-2.5 text-ink-subtitle">{entry.admin.name}</td>
                  <td className="p-2.5 text-right font-sans text-[11.5px] tabular-nums text-ink-faint">
                    {new Date(entry.createdAt).toLocaleString(lang === 'th' ? 'th-TH' : 'en-US')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {log.length === 0 && <p className="p-4 text-ink-faint">{t.logNone}</p>}
        </div>

        {/* มือถือ: การ์ดต่อรายการ */}
        <div className="mt-3 flex flex-col gap-2.5 md:hidden">
          {log.map((entry) => (
            <div key={entry.id} className="rounded-card-lg border border-card-border bg-white p-3.5 shadow-card">
              <div className="flex items-center justify-between gap-2">
                <Badge
                  label={t.logAction[entry.action] ?? entry.action}
                  variant={
                    entry.action === 'APPROVED' || entry.action === 'UNSUSPENDED'
                      ? 'good'
                      : entry.action === 'REJECTED' || entry.action === 'SUSPENDED' || entry.action === 'DELETED'
                        ? 'critical'
                        : 'warning'
                  }
                />
                <span className="shrink-0 font-sans text-[11.5px] tabular-nums text-ink-faint">
                  {new Date(entry.createdAt).toLocaleString(lang === 'th' ? 'th-TH' : 'en-US')}
                </span>
              </div>
              <div className="mt-1.5 truncate text-[13px] text-ink-body">
                {t.logEntity[entry.entityType] ?? entry.entityType} · {entry.entityId.slice(0, 8)}
              </div>
              <div className="truncate text-[12.5px] text-ink-muted">{entry.admin.name}</div>
              {entry.note && <div className="mt-1 text-[11.5px] leading-relaxed text-ink-faint">{entry.note}</div>}
            </div>
          ))}
          {log.length === 0 && <p className="text-ink-faint">{t.logNone}</p>}
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 sm:p-6">
          <div className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-card-lg border border-card-border bg-white p-5 shadow-card">
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 sm:p-6">
      <div className="max-h-[85vh] w-full max-w-sm overflow-y-auto rounded-card-lg border border-card-border bg-white p-5 shadow-card">
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 sm:p-6">
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
