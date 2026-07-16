'use client';

import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api-client';

interface Summary {
  totalCommission: number;
  totalPayout: number;
  count: number;
}

export default function AdminFinancePage() {
  const [summary, setSummary] = useState<Summary | null>(null);

  function reload() {
    apiClient.get<Summary>('/admin/finance/summary').then(setSummary);
  }

  useEffect(reload, []);

  async function transfer() {
    await apiClient.post('/admin/finance/transfer');
    reload();
  }

  return (
    <div>
      <h1 className="text-xl font-bold">การเงิน & รวมบิล</h1>
      <div className="mt-4 grid grid-cols-2 gap-4">
        <div className="rounded border p-4">
          <p className="text-sm text-gray-500">ค่าคอมมิชชันรวม</p>
          <p className="text-2xl font-bold">{summary?.totalCommission ?? 0} ฿</p>
        </div>
        <div className="rounded border p-4">
          <p className="text-sm text-gray-500">ยอดโอนให้หอพัก</p>
          <p className="text-2xl font-bold">{summary?.totalPayout ?? 0} ฿</p>
        </div>
      </div>
      <button onClick={transfer} className="mt-4 rounded bg-green-600 px-4 py-2 text-white">
        โอนให้เจ้าของหอ
      </button>
    </div>
  );
}
