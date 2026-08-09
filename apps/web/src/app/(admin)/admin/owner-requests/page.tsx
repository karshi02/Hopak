'use client';

import { useEffect, useMemo, useState } from 'react';
import { apiClient } from '@/lib/api-client';
import { useLang } from '@/hooks/useLang';
import type { OwnerRequest } from '@hopak/shared';

const TEXT = {
  th: {
    title: 'คำขอเป็นเจ้าของหอ',
    subtitle: 'ตรวจสอบเอกสารและอนุมัติผู้สมัครเปิดหอพักใหม่',
    search: 'ค้นหาชื่อผู้สมัคร / หอพัก…',
    exportCsv: 'Export CSV',
    kPending: 'รอตรวจสอบ',
    kApprovedToday: 'อนุมัติวันนี้',
    kRejectedMonth: 'ปฏิเสธเดือนนี้',
    kOwners: 'เจ้าของหอทั้งหมด',
    tabPending: 'รอตรวจสอบ',
    tabApproved: 'อนุมัติแล้ว',
    tabRejected: 'ปฏิเสธ',
    tabAll: 'ทั้งหมด',
    ownerBy: 'เจ้าของ',
    sentAt: 'ส่งเมื่อ',
    docsLabel: 'เอกสารแนบ',
    docItem: (n: number) => `เอกสาร ${n}`,
    approve: 'อนุมัติ',
    reject: 'ปฏิเสธ',
    detail: 'รายละเอียด',
    hideDetail: 'ซ่อน',
    rejectPrompt: 'ระบุเหตุผลที่ปฏิเสธ (ผู้สมัครจะได้รับแจ้งเตือน):',
    address: 'ที่อยู่',
    note: 'หมายเหตุ',
    email: 'อีเมล',
    statusPending: 'รอตรวจสอบ',
    statusApproved: 'อนุมัติแล้ว',
    statusRejected: 'ปฏิเสธ',
    none: 'ไม่มีคำขอในหมวดนี้',
    dateLocale: 'th-TH',
  },
  en: {
    title: 'Owner Requests',
    subtitle: 'Review documents and approve new dorm-owner applicants',
    search: 'Search applicant / dorm…',
    exportCsv: 'Export CSV',
    kPending: 'Pending review',
    kApprovedToday: 'Approved today',
    kRejectedMonth: 'Rejected this month',
    kOwners: 'Total owners',
    tabPending: 'Pending',
    tabApproved: 'Approved',
    tabRejected: 'Rejected',
    tabAll: 'All',
    ownerBy: 'Owner',
    sentAt: 'Sent',
    docsLabel: 'Attached documents',
    docItem: (n: number) => `Document ${n}`,
    approve: 'Approve',
    reject: 'Reject',
    detail: 'Details',
    hideDetail: 'Hide',
    rejectPrompt: 'Reason for rejection (the applicant will be notified):',
    address: 'Address',
    note: 'Note',
    email: 'Email',
    statusPending: 'Pending',
    statusApproved: 'Approved',
    statusRejected: 'Rejected',
    none: 'No requests in this category',
    dateLocale: 'en-US',
  },
};

const AVATAR_BG = ['#2F6FE0', '#12A150', '#E0902F', '#6D5AE0'];
type Tab = 'pending' | 'approved' | 'rejected' | 'all';

// สี badge ตามสถานะ
const STATUS_STYLE: Record<string, { fg: string; bg: string }> = {
  pending: { fg: '#B4791A', bg: '#FEF6E7' },
  approved: { fg: '#12813F', bg: '#E9F7EF' },
  rejected: { fg: '#C0392B', bg: '#FDECEC' },
};

function isToday(d: Date) {
  const n = new Date();
  return d.getFullYear() === n.getFullYear() && d.getMonth() === n.getMonth() && d.getDate() === n.getDate();
}
function isThisMonth(d: Date) {
  const n = new Date();
  return d.getFullYear() === n.getFullYear() && d.getMonth() === n.getMonth();
}

export default function AdminOwnerRequestsPage() {
  const { lang } = useLang();
  const t = TEXT[lang];
  const [requests, setRequests] = useState<OwnerRequest[]>([]);
  const [totalOwners, setTotalOwners] = useState(0);
  const [tab, setTab] = useState<Tab>('pending');
  const [q, setQ] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [openDetail, setOpenDetail] = useState<Set<string>>(new Set());

  function reload() {
    apiClient.get<OwnerRequest[]>('/admin/owner-requests').then(setRequests).catch(() => setRequests([]));
    apiClient.get<{ totalOwners: number }>('/admin/owner-requests/stats').then((s) => setTotalOwners(s.totalOwners)).catch(() => {});
  }
  useEffect(reload, []);

  const st = (r: OwnerRequest) => r.status.toLowerCase();

  async function approve(id: string) {
    setBusyId(id);
    try {
      await apiClient.patch(`/admin/owner-requests/${id}/approve`);
      reload();
    } catch {
      /* เงียบไว้ */
    } finally {
      setBusyId(null);
    }
  }

  async function reject(id: string) {
    const reason = window.prompt(t.rejectPrompt, '');
    if (reason === null) return; // กดยกเลิก
    setBusyId(id);
    try {
      await apiClient.patch(`/admin/owner-requests/${id}/reject`, { reason });
      reload();
    } catch {
      /* เงียบไว้ */
    } finally {
      setBusyId(null);
    }
  }

  function toggleDetail(id: string) {
    setOpenDetail((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  // KPI คำนวณจากรายการจริง + totalOwners จาก backend
  const kpis = useMemo(() => {
    let pending = 0;
    let approvedToday = 0;
    let rejectedMonth = 0;
    for (const r of requests) {
      const s = r.status.toLowerCase();
      if (s === 'pending') pending += 1;
      else if (s === 'approved' && r.decidedAt && isToday(new Date(r.decidedAt))) approvedToday += 1;
      else if (s === 'rejected' && r.decidedAt && isThisMonth(new Date(r.decidedAt))) rejectedMonth += 1;
    }
    return { pending, approvedToday, rejectedMonth };
  }, [requests]);

  const counts = useMemo(() => {
    const c = { pending: 0, approved: 0, rejected: 0, all: requests.length };
    for (const r of requests) {
      const s = r.status.toLowerCase() as 'pending' | 'approved' | 'rejected';
      if (s in c) c[s] += 1;
    }
    return c;
  }, [requests]);

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    return requests.filter((r) => {
      if (tab !== 'all' && st(r) !== tab) return false;
      if (!query) return true;
      return (
        (r.dormName ?? '').toLowerCase().includes(query) || (r.user?.name ?? '').toLowerCase().includes(query)
      );
    });
  }, [requests, tab, q]);

  const fmtDate = (v: string) =>
    new Date(v).toLocaleDateString(t.dateLocale, { day: 'numeric', month: 'short', year: 'numeric' });

  function exportCsv() {
    const header = ['dorm', 'owner', 'province', 'phone', 'status', 'sentAt'];
    const rows = filtered.map((r) => [
      r.dormName ?? '',
      r.user?.name ?? '',
      r.province ?? '',
      r.phone ?? '',
      r.status,
      new Date(r.createdAt).toISOString().slice(0, 10),
    ]);
    const csv = [header, ...rows].map((row) => row.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const url = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `owner-requests-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const KPI = ({ label, value, color, bg, icon }: { label: string; value: number; color: string; bg: string; icon: React.ReactNode }) => (
    <div className="flex items-center gap-3.5 rounded-2xl border border-card-border bg-white px-5 py-[18px] shadow-card">
      <span className="flex h-[46px] w-[46px] shrink-0 items-center justify-center rounded-[13px]" style={{ background: bg }}>
        {icon}
      </span>
      <div>
        <div className="text-[13px] text-ink-muted">{label}</div>
        <div className="text-[26px] font-bold leading-tight" style={{ color }}>
          {value.toLocaleString()}
        </div>
      </div>
    </div>
  );

  return (
    <div>
      {/* topbar */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-[25px] font-bold tracking-tight text-ink-strong">{t.title}</h1>
          <p className="mt-1 text-[13.5px] text-ink-muted">{t.subtitle}</p>
        </div>
        <div className="flex items-center gap-2.5">
          <div className="flex h-10 items-center gap-2 rounded-[10px] border border-card-border bg-white px-3.5">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
              <circle cx="11" cy="11" r="7" stroke="#9AA0AB" strokeWidth="1.9" />
              <path d="M20 20l-3.5-3.5" stroke="#9AA0AB" strokeWidth="1.9" strokeLinecap="round" />
            </svg>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={t.search}
              className="w-[210px] bg-transparent text-[13.5px] outline-none placeholder:text-[#9AA0AB]"
            />
          </div>
          <button
            onClick={exportCsv}
            className="flex h-10 items-center gap-1.5 rounded-[10px] border border-card-border bg-white px-4 text-[13.5px] font-semibold text-[#3A3F49] hover:bg-surface-canvas"
          >
            {t.exportCsv}
          </button>
        </div>
      </div>

      {/* KPI row */}
      <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KPI
          label={t.kPending}
          value={kpis.pending}
          color="#B4791A"
          bg="#FEF6E7"
          icon={
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="9" stroke="#B4791A" strokeWidth="1.9" />
              <path d="M12 8v4l3 2" stroke="#B4791A" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          }
        />
        <KPI
          label={t.kApprovedToday}
          value={kpis.approvedToday}
          color="#12A150"
          bg="#E9F7EF"
          icon={
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <path d="M5 12l4 4 10-11" stroke="#12A150" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          }
        />
        <KPI
          label={t.kRejectedMonth}
          value={kpis.rejectedMonth}
          color="#C0392B"
          bg="#FDECEC"
          icon={
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <path d="M6 6l12 12M18 6L6 18" stroke="#C0392B" strokeWidth="1.9" strokeLinecap="round" />
            </svg>
          }
        />
        <KPI
          label={t.kOwners}
          value={totalOwners}
          color="#111827"
          bg="#EAF1FD"
          icon={
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <path d="M4 20V9l8-5 8 5v11" stroke="#2F6FE0" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M9 20v-6h6v6" stroke="#2F6FE0" strokeWidth="1.9" />
            </svg>
          }
        />
      </div>

      {/* filter tabs */}
      <div className="mt-[18px] flex flex-wrap gap-2">
        {(
          [
            ['pending', t.tabPending, counts.pending],
            ['approved', t.tabApproved, counts.approved],
            ['rejected', t.tabRejected, counts.rejected],
            ['all', t.tabAll, counts.all],
          ] as const
        ).map(([key, label, n]) => {
          const active = tab === key;
          const s = key === 'all' ? null : STATUS_STYLE[key];
          return (
            <button
              key={key}
              onClick={() => setTab(key)}
              className="rounded-[9px] px-4 py-2 text-[13px] font-semibold"
              style={
                active
                  ? { background: '#2F6FE0', color: '#fff' }
                  : s
                    ? { background: s.bg, color: s.fg }
                    : { background: '#F1F3F6', color: '#5B616C' }
              }
            >
              {label} {n}
            </button>
          );
        })}
      </div>

      {/* request cards */}
      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-2">
        {filtered.map((req, idx) => {
          const dorm = req.dormName || req.user?.name || '—';
          const init = (dorm.trim()[0] ?? '?').toUpperCase();
          const location = [req.province, req.address].filter(Boolean).join(' · ') || '—';
          const s = st(req);
          const badge = STATUS_STYLE[s] ?? STATUS_STYLE.pending;
          const statusLabel = s === 'approved' ? t.statusApproved : s === 'rejected' ? t.statusRejected : t.statusPending;
          const busy = busyId === req.id;
          const detailOpen = openDetail.has(req.id);
          return (
            <div key={req.id} className="overflow-hidden rounded-[18px] border border-card-border bg-white shadow-card">
              <div className="flex items-center gap-3.5 px-5 pb-3.5 pt-[18px]">
                <span
                  className="flex h-[50px] w-[50px] shrink-0 items-center justify-center rounded-[14px] font-sans text-[20px] font-bold text-white"
                  style={{ background: AVATAR_BG[idx % AVATAR_BG.length] }}
                >
                  {init}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[17px] font-bold text-ink-strong">{dorm}</div>
                  <div className="mt-0.5 truncate text-[13px] text-ink-subtitle">
                    {t.ownerBy}: {req.user?.name ?? '—'}
                  </div>
                </div>
                <span
                  className="whitespace-nowrap rounded-pill px-3 py-1 text-[11.5px] font-semibold"
                  style={{ background: badge.bg, color: badge.fg }}
                >
                  {statusLabel}
                </span>
              </div>

              <div className="grid grid-cols-1 gap-x-4 gap-y-2.5 px-5 sm:grid-cols-2">
                <div className="flex items-center gap-2 text-[13px] text-ink-body">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" className="shrink-0">
                    <path d="M12 22s7-6.5 7-12a7 7 0 10-14 0c0 5.5 7 12 7 12z" stroke="#0E9F8E" strokeWidth="1.8" strokeLinejoin="round" />
                    <circle cx="12" cy="10" r="2.2" stroke="#0E9F8E" strokeWidth="1.8" />
                  </svg>
                  <span className="truncate">{location}</span>
                </div>
                {req.phone && (
                  <div className="flex items-center gap-2 font-sans text-[13px] text-ink-body">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" className="shrink-0">
                      <path d="M5 4h4l2 5-3 2a12 12 0 005 5l2-3 5 2v4a2 2 0 01-2 2A16 16 0 013 6a2 2 0 012-2z" stroke="#9AA0AB" strokeWidth="1.8" strokeLinejoin="round" />
                    </svg>
                    {req.phone}
                  </div>
                )}
                <div className="flex items-center gap-2 text-[13px] text-ink-body">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" className="shrink-0">
                    <rect x="4" y="5" width="16" height="15" rx="2" stroke="#9AA0AB" strokeWidth="1.8" />
                    <path d="M8 3v4M16 3v4M4 10h16" stroke="#9AA0AB" strokeWidth="1.8" strokeLinecap="round" />
                  </svg>
                  {t.sentAt} {fmtDate(req.createdAt)}
                </div>
                {req.user?.email && (
                  <div className="flex items-center gap-2 truncate text-[13px] text-ink-body">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" className="shrink-0">
                      <rect x="3" y="5" width="18" height="14" rx="2" stroke="#9AA0AB" strokeWidth="1.8" />
                      <path d="M4 7l8 6 8-6" stroke="#9AA0AB" strokeWidth="1.8" />
                    </svg>
                    <span className="truncate">{req.user.email}</span>
                  </div>
                )}
              </div>

              {req.documents && req.documents.length > 0 && (
                <div className="px-5 pt-3.5">
                  <div className="mb-1.5 text-[12px] text-ink-muted">{t.docsLabel}</div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {req.documents.map((url, i) => (
                      <a
                        key={url}
                        href={url}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-1.5 rounded-lg bg-[#E9F7EF] px-2.5 py-1.5 text-[11.5px] font-medium text-[#12813F] hover:brightness-95"
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                          <path d="M5 12l4 4 10-11" stroke="#12A150" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                        {t.docItem(i + 1)}
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* detail (toggle) */}
              {detailOpen && (
                <div className="mx-5 mt-3 rounded-xl bg-surface-canvas px-4 py-3 text-[12.5px] text-ink-subtitle">
                  {req.address && <div>{t.address}: {req.address}</div>}
                  {req.note && <div className="mt-0.5">{t.note}: “{req.note}”</div>}
                  <div className="mt-0.5">{new Date(req.createdAt).toLocaleString(t.dateLocale)}</div>
                </div>
              )}

              {/* actions */}
              <div className="flex gap-2.5 px-5 pb-[18px] pt-4">
                {s === 'pending' && (
                  <>
                    <button
                      onClick={() => approve(req.id)}
                      disabled={busy}
                      className="flex h-[42px] flex-1 items-center justify-center gap-2 rounded-[11px] bg-[#12A150] text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                        <path d="M5 12l4 4 10-11" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                      {t.approve}
                    </button>
                    <button
                      onClick={() => reject(req.id)}
                      disabled={busy}
                      className="flex h-[42px] flex-1 items-center justify-center gap-2 rounded-[11px] border border-[#F0D3D0] bg-white text-sm font-semibold text-[#C0392B] hover:bg-danger-tint disabled:opacity-50"
                    >
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                        <path d="M6 6l12 12M18 6L6 18" stroke="#C0392B" strokeWidth="2.2" strokeLinecap="round" />
                      </svg>
                      {t.reject}
                    </button>
                  </>
                )}
                <button
                  onClick={() => toggleDetail(req.id)}
                  className={`flex h-[42px] items-center rounded-[11px] bg-[#F1F3F6] px-4 text-sm font-semibold text-[#4B515C] hover:bg-[#E7EAEF] ${s !== 'pending' ? 'flex-1 justify-center' : ''}`}
                >
                  {detailOpen ? t.hideDetail : t.detail}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {filtered.length === 0 && <p className="mt-6 text-ink-faint">{t.none}</p>}
    </div>
  );
}
