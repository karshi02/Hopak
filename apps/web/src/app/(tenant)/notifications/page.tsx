'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api-client';
import { getToken } from '@/lib/auth';
import { useLang } from '@/hooks/useLang';

interface NotificationItem {
  id: string;
  type: string;
  title: string;
  body: string;
  readAt: string | null;
}

const TEXT = {
  th: { title: 'แจ้งเตือน', none: 'ยังไม่มีการแจ้งเตือน' },
  en: { title: 'Notifications', none: 'No notifications yet' },
};

export default function NotificationsPage() {
  const router = useRouter();
  const { lang } = useLang();
  const t = TEXT[lang];
  const [items, setItems] = useState<NotificationItem[]>([]);

  useEffect(() => {
    if (!getToken()) {
      router.replace('/login');
      return;
    }
    apiClient.get<NotificationItem[]>('/notifications').then(setItems).catch(() => {});
  }, [router]);

  async function markRead(id: string) {
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, readAt: new Date().toISOString() } : n)));
    await apiClient.patch(`/notifications/${id}/read`).catch(() => {});
  }

  return (
    <main className="mx-auto max-w-2xl p-6">
      <h1 className="text-xl font-bold text-ink-strong dark:text-white">{t.title}</h1>
      <div className="mt-4 flex flex-col gap-2">
        {items.map((n) => {
          const isWarning = n.type === 'warning';
          return (
            <button
              key={n.id}
              onClick={() => !n.readAt && markRead(n.id)}
              className={`rounded-card border p-4 text-left transition ${
                isWarning
                  ? 'border-danger/30 bg-danger/5'
                  : 'border-card-border bg-white dark:border-white/10 dark:bg-[#1a1a19]'
              } ${n.readAt ? 'opacity-60' : ''}`}
            >
              <p className={`font-semibold ${isWarning ? 'text-danger' : 'text-ink-strong dark:text-white'}`}>
                {isWarning && '⚠️ '}
                {n.title}
              </p>
              <p className="mt-1 text-sm text-ink-subtitle">{n.body}</p>
            </button>
          );
        })}
        {items.length === 0 && <p className="text-ink-faint">{t.none}</p>}
      </div>
    </main>
  );
}
