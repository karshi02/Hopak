'use client';

import { useEffect, useState } from 'react';
import { getToken } from '@/lib/auth';
import { getSocket } from '@/lib/ws';

interface ToastItem {
  id: number;
  title?: string;
  body?: string;
}

/**
 * แจ้งเตือนเรียลไทม์สำหรับคอนโซล (แอดมิน / เจ้าของหอ)
 * ฟัง notification:new จาก socket แล้วเด้ง toast ทันที ไม่ต้องรีเฟรชหน้า
 * (ฝั่งผู้เช่าใช้ตัวใน Navbar อยู่แล้ว จึงไม่ต้องซ้อนอีก)
 */
export function RealtimeToasts({ accent = '#6D5AE0' }: { accent?: string }) {
  const [items, setItems] = useState<ToastItem[]>([]);

  useEffect(() => {
    if (!getToken()) return;
    const socket = getSocket();
    let seq = 0;

    const onNew = (n?: { title?: string; body?: string }) => {
      if (!n || (!n.title && !n.body)) return;
      const id = ++seq;
      setItems((prev) => [...prev, { id, title: n.title, body: n.body }].slice(-4));
      // หายเองใน 6 วินาที
      setTimeout(() => setItems((prev) => prev.filter((x) => x.id !== id)), 6000);
    };

    socket.on('notification:new', onNew);
    return () => {
      socket.off('notification:new', onNew);
    };
  }, []);

  if (items.length === 0) return null;

  return (
    <div className="pointer-events-none fixed bottom-20 right-4 z-[60] flex w-[min(340px,calc(100vw-2rem))] flex-col gap-2 lg:bottom-6">
      {items.map((it) => (
        <div
          key={it.id}
          className="pointer-events-auto animate-[fadeIn_.2s_ease-out] rounded-[13px] border border-card-border bg-white p-3.5 shadow-[0_10px_28px_rgba(16,24,40,0.16)]"
          role="status"
        >
          <div className="flex gap-2.5">
            <span
              className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px]"
              style={{ background: `${accent}1A` }}
            >
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none">
                <path
                  d="M18 8a6 6 0 10-12 0c0 7-3 9-3 9h18s-3-2-3-9zM10.5 21a2 2 0 003 0"
                  stroke={accent}
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </span>
            <div className="min-w-0 flex-1">
              {it.title && <div className="text-[13.5px] font-bold text-ink-strong">{it.title}</div>}
              {it.body && <div className="mt-0.5 text-[12.5px] leading-relaxed text-ink-muted">{it.body}</div>}
            </div>
            <button
              type="button"
              onClick={() => setItems((prev) => prev.filter((x) => x.id !== it.id))}
              aria-label="close"
              className="shrink-0 text-ink-faint hover:text-ink-body"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
