'use client';

import { useEffect, useState } from 'react';
import { useLang } from '@/hooks/useLang';
import { apiClient } from '@/lib/api-client';
import { getSocket } from '@/lib/ws';

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

export default function PartnerNotificationsPage() {
  const { lang } = useLang();
  const t = TEXT[lang];
  const [items, setItems] = useState<NotificationItem[]>([]);

  useEffect(() => {
    apiClient.get<NotificationItem[]>('/notifications').then(setItems).catch(() => {});

    // ฟัง event เรียลไทม์จาก server — แจ้งเตือนใหม่ (เช่นแอดมินโอนเงิน) โผล่ทันทีไม่ต้องรีเฟรชหน้า
    const socket = getSocket();
    function onNew(notification: NotificationItem) {
      setItems((prev) => (prev.some((n) => n.id === notification.id) ? prev : [notification, ...prev]));
    }
    socket.on('notification:new', onNew);
    return () => {
      socket.off('notification:new', onNew);
    };
  }, []);

  async function markRead(id: string) {
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, readAt: new Date().toISOString() } : n)));
    await apiClient.patch(`/notifications/${id}/read`).catch(() => {});
  }

  return (
    <div className="flex flex-col gap-2">
      {items.map((n) => {
        const isPayout = n.type === 'payout';
        return (
          <button
            key={n.id}
            onClick={() => !n.readAt && markRead(n.id)}
            className={`rounded-card-lg border p-4 text-left shadow-card transition ${
              isPayout ? 'border-success/30 bg-success/5' : 'border-card-border bg-white'
            } ${n.readAt ? 'opacity-60' : ''}`}
          >
            <p className={`font-semibold ${isPayout ? 'text-success' : 'text-ink-strong'}`}>
              {isPayout && '💰 '}
              {n.title}
            </p>
            <p className="mt-1 text-sm text-ink-subtitle">{n.body}</p>
          </button>
        );
      })}
      {items.length === 0 && <p className="text-ink-faint">{t.none}</p>}
    </div>
  );
}
