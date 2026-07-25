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
    none: 'ไม่มีหอรออนุมัติ',
  },
  en: {
    title: 'Dorms',
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
            {dorm.images?.length ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={dorm.images[0]} alt="" className="h-32 w-full object-cover" />
            ) : (
              <div className="flex h-32 items-center justify-center bg-surface-canvas font-mono text-xs text-ink-faint dark:bg-[#2c2c2a]">
                {t.photoPlaceholder}
              </div>
            )}
            {dorm.images?.length > 1 && (
              <div className="flex gap-1.5 overflow-x-auto bg-surface-canvas p-1.5 dark:bg-[#2c2c2a]">
                {dorm.images.slice(1).map((url) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img key={url} src={url} alt="" className="h-10 w-10 shrink-0 rounded object-cover" />
                ))}
              </div>
            )}
            <div className="p-4">
              <div className="flex items-start justify-between gap-2">
                <h2 className="font-bold text-ink-strong dark:text-white">{dorm.name}</h2>
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
                        <a
                          href={url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-sm text-tenant underline"
                        >
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
