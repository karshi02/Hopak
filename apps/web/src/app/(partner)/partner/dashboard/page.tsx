'use client';

import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api-client';

interface Summary {
  totalCommission: number;
  totalPayout: number;
  count: number;
}

export default function PartnerDashboardPage() {
  const [summary, setSummary] = useState<Summary | null>(null);

  useEffect(() => {
    apiClient.get<Summary>('/admin/finance/summary').then(setSummary).catch(() => setSummary(null));
  }, []);

  return (
    <div>
      <h1 className="text-xl font-bold">แดชบอร์ด</h1>
      <div className="mt-4 grid grid-cols-3 gap-4">
        <div className="rounded border p-4">
          <p className="text-sm text-gray-500">รายได้ที่โอนแล้ว</p>
          <p className="text-2xl font-bold">{summary?.totalPayout ?? 0} ฿</p>
        </div>
        <div className="rounded border p-4">
          <p className="text-sm text-gray-500">จำนวนการจอง</p>
          <p className="text-2xl font-bold">{summary?.count ?? 0}</p>
        </div>
      </div>
    </div>
  );
}
