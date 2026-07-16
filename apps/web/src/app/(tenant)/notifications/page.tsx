'use client';

import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api-client';

interface NotificationItem {
  id: string;
  title: string;
  body: string;
  readAt: string | null;
}

export default function NotificationsPage() {
  const [items, setItems] = useState<NotificationItem[]>([]);

  useEffect(() => {
    apiClient.get<NotificationItem[]>('/notifications').then(setItems);
  }, []);

  return (
    <main className="mx-auto max-w-2xl p-6">
      <h1 className="text-xl font-bold">แจ้งเตือน</h1>
      <div className="mt-4 flex flex-col gap-2">
        {items.map((n) => (
          <div key={n.id} className={`rounded border p-3 ${n.readAt ? 'opacity-60' : ''}`}>
            <p className="font-medium">{n.title}</p>
            <p className="text-sm text-gray-600">{n.body}</p>
          </div>
        ))}
        {items.length === 0 && <p className="text-gray-500">ยังไม่มีการแจ้งเตือน</p>}
      </div>
    </main>
  );
}
