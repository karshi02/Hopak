'use client';

import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api-client';

interface Campaign {
  id: string;
  dormId: string;
  kind: string;
  startAt: string;
  endAt: string;
  price: number;
}

export default function AdminCampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);

  useEffect(() => {
    apiClient.get<Campaign[]>('/promotions/sponsored').then(setCampaigns).catch(() => setCampaigns([]));
  }, []);

  return (
    <div>
      <h1 className="text-xl font-bold">โฆษณา & แคมเปญ</h1>
      <div className="mt-4 flex flex-col gap-2">
        {campaigns.map((c) => (
          <div key={c.id} className="rounded border p-3">
            {c.kind} — {c.price} ฿ ({c.startAt} ถึง {c.endAt})
          </div>
        ))}
        {campaigns.length === 0 && <p className="text-gray-500">ไม่มีแคมเปญที่ใช้งานอยู่</p>}
      </div>
    </div>
  );
}
