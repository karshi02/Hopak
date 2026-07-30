'use client';

import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api-client';
import { useLang } from '@/hooks/useLang';
import { Badge } from '@/components/dashboard/Badge';
import type { OwnerRequest } from '@hopak/shared';

const TEXT = {
  th: {
    title: 'คำขอเป็นเจ้าของหอ',
    pendingCount: (n: number) => `รออนุมัติ ${n}`,
    requestedAt: 'ขอเมื่อ',
    approve: 'อนุมัติ',
    reject: 'ปฏิเสธ',
    none: 'ไม่มีคำขอรออนุมัติ',
    dormName: 'ชื่อหอพัก',
    address: 'ที่อยู่',
    note: 'หมายเหตุ',
    docItem: (n: number) => `เอกสาร ${n}`,
    dateLocale: 'th-TH',
  },
  en: {
    title: 'Owner Requests',
    pendingCount: (n: number) => `${n} pending`,
    requestedAt: 'Requested at',
    approve: 'Approve',
    reject: 'Reject',
    none: 'No requests pending',
    dormName: 'Dorm name',
    address: 'Address',
    note: 'Note',
    docItem: (n: number) => `Document ${n}`,
    dateLocale: 'en-US',
  },
};

export default function AdminOwnerRequestsPage() {
  const { lang } = useLang();
  const t = TEXT[lang];
  const [pending, setPending] = useState<OwnerRequest[]>([]);

  function reload() {
    apiClient.get<OwnerRequest[]>('/admin/owner-requests').then(setPending).catch(() => setPending([]));
  }

  useEffect(reload, []);

  async function approve(id: string) {
    try {
      await apiClient.patch(`/admin/owner-requests/${id}/approve`);
      reload();
    } catch {
      // เงียบไว้ก่อน — ไม่ให้พังทั้งหน้า
    }
  }

  async function reject(id: string) {
    try {
      await apiClient.patch(`/admin/owner-requests/${id}/reject`);
      reload();
    } catch {
      // เงียบไว้ก่อน — ไม่ให้พังทั้งหน้า
    }
  }

  return (
    <div>
      <Badge label={t.pendingCount(pending.length)} variant="warning" />

      <div className="mt-4 flex flex-col gap-3">
        {pending.map((req) => (
          <div
            key={req.id}
            className="flex items-center justify-between rounded-card-lg border border-card-border bg-white p-4 shadow-card"
          >
            <div>
              <p className="font-semibold text-ink-strong">{req.user?.name}</p>
              <p className="mt-0.5 text-sm text-ink-subtitle">
                {req.user?.email}
                {req.phone && ` · ${req.phone}`}
              </p>
              {req.dormName && (
                <p className="mt-1.5 text-sm text-ink-body">
                  <span className="font-semibold">{t.dormName}:</span> {req.dormName}
                  {req.province && ` · ${req.province}`}
                </p>
              )}
              {req.address && (
                <p className="mt-0.5 text-sm text-ink-subtitle">
                  {t.address}: {req.address}
                </p>
              )}
              {req.note && (
                <p className="mt-0.5 text-sm text-ink-subtitle">
                  {t.note}: {req.note}
                </p>
              )}
              {req.documents && req.documents.length > 0 && (
                <div className="mt-1.5 flex flex-wrap gap-2">
                  {req.documents.map((url, i) => (
                    <a key={url} href={url} target="_blank" rel="noreferrer" className="text-sm text-tenant underline">
                      {t.docItem(i + 1)}
                    </a>
                  ))}
                </div>
              )}
              <p className="mt-1 text-xs text-ink-faint">
                {t.requestedAt} {new Date(req.createdAt).toLocaleString(t.dateLocale)}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => approve(req.id)}
                className="rounded-lg bg-success px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
              >
                {t.approve}
              </button>
              <button
                onClick={() => reject(req.id)}
                className="rounded-lg border border-card-border px-4 py-2 text-sm font-semibold text-danger"
              >
                {t.reject}
              </button>
            </div>
          </div>
        ))}
        {pending.length === 0 && <p className="text-ink-faint">{t.none}</p>}
      </div>
    </div>
  );
}
