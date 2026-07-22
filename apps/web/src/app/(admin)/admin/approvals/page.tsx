'use client';

import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api-client';
import { useLang } from '@/hooks/useLang';
import { Badge } from '@/components/dashboard/Badge';
import type { Dorm } from '@hopak/shared';

type PendingDorm = Dorm & { owner: { name: string; email?: string; phone?: string } };

const TEXT = {
  th: {
    title: 'หอพัก',
    pendingCount: (n: number) => `รออนุมัติ ${n}`,
    photoPlaceholder: 'รูปหอพัก',
    pending: 'รออนุมัติ',
    owner: 'เจ้าของ',
    coords: 'พิกัด',
    approve: 'อนุมัติ',
    reject: 'ปฏิเสธ',
    none: 'ไม่มีหอรออนุมัติ',
  },
  en: {
    title: 'Dorms',
    pendingCount: (n: number) => `${n} pending`,
    photoPlaceholder: 'Dorm photo',
    pending: 'Pending',
    owner: 'Owner',
    coords: 'Coordinates',
    approve: 'Approve',
    reject: 'Reject',
    none: 'No dorms pending approval',
  },
};

export default function AdminApprovalsPage() {
  const { lang } = useLang();
  const t = TEXT[lang];
  const [pending, setPending] = useState<PendingDorm[]>([]);

  function reload() {
    apiClient.get<PendingDorm[]>('/admin/approvals').then(setPending);
  }

  useEffect(reload, []);

  async function approve(id: string) {
    await apiClient.patch(`/admin/approvals/${id}/approve`);
    reload();
  }

  async function reject(id: string) {
    await apiClient.patch(`/admin/approvals/${id}/reject`);
    reload();
  }

  return (
    <div>
      <h1 className="text-xl font-bold text-ink-strong dark:text-white">{t.title}</h1>
      <div className="mt-3">
        <Badge label={t.pendingCount(pending.length)} variant="warning" />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
        {pending.map((dorm) => (
          <div
            key={dorm.id}
            className="overflow-hidden rounded-card border border-card-border bg-white dark:border-white/10 dark:bg-[#1a1a19]"
          >
            <div className="flex h-32 items-center justify-center bg-surface-canvas font-mono text-xs text-ink-faint dark:bg-[#2c2c2a]">
              {t.photoPlaceholder}
            </div>
            <div className="p-4">
              <div className="flex items-start justify-between gap-2">
                <h2 className="font-bold text-ink-strong dark:text-white">{dorm.name}</h2>
                <Badge label={t.pending} variant="warning" />
              </div>
              <p className="mt-1.5 text-sm text-ink-subtitle">
                {t.owner}: {dorm.owner.name} · {dorm.province}
                {dorm.owner.phone && ` · ${dorm.owner.phone}`}
              </p>
              <p className="mt-1 font-sans text-xs tabular-nums text-ink-faint">
                {t.coords}: {dorm.lat.toFixed(4)}, {dorm.lng.toFixed(4)}
              </p>
              <div className="mt-3.5 flex gap-2">
                <button
                  onClick={() => approve(dorm.id)}
                  className="flex-1 rounded-lg bg-success py-2 text-sm font-semibold text-white hover:opacity-90"
                >
                  {t.approve}
                </button>
                <button
                  onClick={() => reject(dorm.id)}
                  className="flex-1 rounded-lg border border-card-border py-2 text-sm font-semibold text-danger dark:border-white/10"
                >
                  {t.reject}
                </button>
              </div>
            </div>
          </div>
        ))}
        {pending.length === 0 && <p className="text-ink-faint">{t.none}</p>}
      </div>
    </div>
  );
}
