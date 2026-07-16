'use client';

import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api-client';
import type { Dorm } from '@hopak/shared';

export default function AdminApprovalsPage() {
  const [pending, setPending] = useState<Dorm[]>([]);

  function reload() {
    apiClient.get<Dorm[]>('/admin/approvals').then(setPending);
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
      <h1 className="text-xl font-bold">คิวรออนุมัติหอพัก</h1>
      <div className="mt-4 flex flex-col gap-2">
        {pending.map((dorm) => (
          <div key={dorm.id} className="flex items-center justify-between rounded border p-3">
            <span>
              {dorm.name} — {dorm.province} ({dorm.lat}, {dorm.lng})
            </span>
            <div className="flex gap-2">
              <button onClick={() => approve(dorm.id)} className="rounded bg-green-600 px-3 py-1 text-white">
                รับ
              </button>
              <button onClick={() => reject(dorm.id)} className="rounded border border-red-500 px-3 py-1 text-red-600">
                ไม่รับ
              </button>
            </div>
          </div>
        ))}
        {pending.length === 0 && <p className="text-gray-500">ไม่มีหอรออนุมัติ</p>}
      </div>
    </div>
  );
}
