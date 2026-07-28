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
  attachmentKey: string | null;
  createdAt: string;
}

const TEXT = {
  th: {
    title: 'แจ้งเตือน',
    none: 'ยังไม่มีการแจ้งเตือน',
    viewSlip: 'ดูสลิป',
    loadingSlip: 'กำลังโหลด...',
    slipError: 'เปิดสลิปไม่สำเร็จ',
    dateLocale: 'th-TH',
  },
  en: {
    title: 'Notifications',
    none: 'No notifications yet',
    viewSlip: 'View slip',
    loadingSlip: 'Loading...',
    slipError: 'Failed to open slip',
    dateLocale: 'en-US',
  },
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

  const [slipLoadingId, setSlipLoadingId] = useState<string | null>(null);
  const [slipError, setSlipError] = useState<string | null>(null);

  async function markRead(id: string) {
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, readAt: new Date().toISOString() } : n)));
    await apiClient.patch(`/notifications/${id}/read`).catch(() => {});
  }

  async function viewSlip(id: string) {
    setSlipLoadingId(id);
    setSlipError(null);
    try {
      const { url } = await apiClient.get<{ url: string }>(`/notifications/${id}/attachment`);
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch {
      setSlipError(t.slipError);
    } finally {
      setSlipLoadingId(null);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      {items.map((n) => {
        const isPayout = n.type === 'payout';
        return (
          <div
            key={n.id}
            onClick={() => !n.readAt && markRead(n.id)}
            className={`cursor-pointer rounded-card-lg border p-4 text-left shadow-card transition ${
              isPayout ? 'border-success/30 bg-success/5' : 'border-card-border bg-white'
            } ${n.readAt ? 'opacity-60' : ''}`}
          >
            <p className={`font-semibold ${isPayout ? 'text-success' : 'text-ink-strong'}`}>
              {isPayout && '💰 '}
              {n.title}
            </p>
            <p className="mt-1 text-sm text-ink-subtitle">{n.body}</p>
            <div className="mt-2 flex items-center justify-between">
              <span className="text-xs text-ink-faint">{new Date(n.createdAt).toLocaleString(t.dateLocale)}</span>
              {n.attachmentKey && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    viewSlip(n.id);
                  }}
                  disabled={slipLoadingId === n.id}
                  className="rounded-btn bg-success px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-60"
                >
                  {slipLoadingId === n.id ? t.loadingSlip : `🧾 ${t.viewSlip}`}
                </button>
              )}
            </div>
          </div>
        );
      })}
      {slipError && <p className="text-sm text-danger">{slipError}</p>}
      {items.length === 0 && <p className="text-ink-faint">{t.none}</p>}
    </div>
  );
}
