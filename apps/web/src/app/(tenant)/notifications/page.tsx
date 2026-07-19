'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api-client';
import { getToken } from '@/lib/auth';

interface NotificationItem {
  id: string;
  title: string;
  body: string;
  readAt: string | null;
}

export default function NotificationsPage() {
  const router = useRouter();
  const [items, setItems] = useState<NotificationItem[]>([]);

  useEffect(() => {
    if (!getToken()) {
      router.replace('/login');
      return;
    }
    apiClient.get<NotificationItem[]>('/notifications').then(setItems).catch(() => {});
  }, [router]);

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
