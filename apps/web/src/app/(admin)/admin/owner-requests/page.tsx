'use client';

import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api-client';
import { Badge } from '@/components/dashboard/Badge';
import type { OwnerRequest } from '@hopak/shared';

export default function AdminOwnerRequestsPage() {
  const [pending, setPending] = useState<OwnerRequest[]>([]);

  function reload() {
    apiClient.get<OwnerRequest[]>('/admin/owner-requests').then(setPending);
  }

  useEffect(reload, []);

  async function approve(id: string) {
    await apiClient.patch(`/admin/owner-requests/${id}/approve`);
    reload();
  }

  async function reject(id: string) {
    await apiClient.patch(`/admin/owner-requests/${id}/reject`);
    reload();
  }

  return (
    <div>
      <h1 className="text-xl font-bold text-ink-strong dark:text-white">คำขอเป็นเจ้าของหอ</h1>
      <div className="mt-3">
        <Badge label={`รออนุมัติ ${pending.length}`} variant="warning" />
      </div>

      <div className="mt-4 flex flex-col gap-3">
        {pending.map((req) => (
          <div
            key={req.id}
            className="flex items-center justify-between rounded-card border border-card-border bg-white p-4 dark:border-white/10 dark:bg-[#1a1a19]"
          >
            <div>
              <p className="font-semibold text-ink-strong dark:text-white">{req.user?.name}</p>
              <p className="mt-0.5 text-sm text-ink-subtitle">
                {req.user?.email}
                {req.user?.phone && ` · ${req.user.phone}`}
              </p>
              <p className="mt-1 text-xs text-ink-faint">
                ขอเมื่อ {new Date(req.createdAt).toLocaleString('th-TH')}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => approve(req.id)}
                className="rounded-lg bg-success px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
              >
                อนุมัติ
              </button>
              <button
                onClick={() => reject(req.id)}
                className="rounded-lg border border-card-border px-4 py-2 text-sm font-semibold text-danger dark:border-white/10"
              >
                ปฏิเสธ
              </button>
            </div>
          </div>
        ))}
        {pending.length === 0 && <p className="text-ink-faint">ไม่มีคำขอรออนุมัติ</p>}
      </div>
    </div>
  );
}
