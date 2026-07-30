'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
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

type Category = 'booking' | 'money' | 'chat' | 'warn';

const TEXT = {
  th: {
    none: 'ยังไม่มีการแจ้งเตือน',
    viewSlip: 'ดูสลิป',
    loadingSlip: 'กำลังโหลด...',
    slipError: 'เปิดสลิปไม่สำเร็จ',
    viewBooking: 'ดูการจอง',
    goFix: 'ไปแก้ไข',
    dateLocale: 'th-TH',
    tabs: { all: 'ทั้งหมด', booking: 'การจอง', money: 'การเงิน', chat: 'ข้อความ', warn: 'เตือน' },
  },
  en: {
    none: 'No notifications yet',
    viewSlip: 'View slip',
    loadingSlip: 'Loading...',
    slipError: 'Failed to open slip',
    viewBooking: 'View booking',
    goFix: 'Fix it',
    dateLocale: 'en-US',
    tabs: { all: 'All', booking: 'Bookings', money: 'Payments', chat: 'Messages', warn: 'Alerts' },
  },
};

// map notification type → หมวด (สี/ไอคอน/ปุ่ม)
function categoryOf(type: string): Category {
  const t = type.toLowerCase();
  if (t === 'payout' || t === 'payment') return 'money';
  if (t === 'booking') return 'booking';
  if (t === 'chat' || t === 'message') return 'chat';
  return 'warn'; // warning, dorm_rejected, อื่นๆ
}

const CAT: Record<Category, { accent: string; icBg: string; stroke: string; icon: string[] }> = {
  booking: { accent: '#2F6FE0', icBg: '#EAF1FF', stroke: '#2F6FE0', icon: ['M8 3v4M16 3v4M3 9h18', 'M3 5h18v16H3zM7 13h4'] },
  money: { accent: '#12A150', icBg: '#E7F7EF', stroke: '#12A150', icon: ['M3 7h18v12H3zM3 11h18M7 15h4'] },
  chat: { accent: '#7A4E8A', icBg: '#F1EAFB', stroke: '#7A4E8A', icon: ['M21 11.5a8.5 8.5 0 01-12 7.7L3 21l1.8-6a8.5 8.5 0 1116.2-3.5z'] },
  warn: { accent: '#E0902F', icBg: '#FFF3E0', stroke: '#E0902F', icon: ['M12 9v4M12 17h.01M10.3 3.9L2.4 18a2 2 0 001.7 3h15.8a2 2 0 001.7-3L13.7 3.9a2 2 0 00-3.4 0z'] },
};

function CatIcon({ cat }: { cat: Category }) {
  const c = CAT[cat];
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      {c.icon.map((d, i) => (
        <path key={i} d={d} stroke={c.stroke} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      ))}
    </svg>
  );
}

export default function PartnerNotificationsPage() {
  const { lang } = useLang();
  const t = TEXT[lang];
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [tab, setTab] = useState<'all' | Category>('all');
  const [slipLoadingId, setSlipLoadingId] = useState<string | null>(null);
  const [slipError, setSlipError] = useState<string | null>(null);

  useEffect(() => {
    apiClient.get<NotificationItem[]>('/notifications').then(setItems).catch(() => {});
    // เรียลไทม์ — แจ้งเตือนใหม่ (แอดมินโอนเงิน ฯลฯ) โผล่ทันทีไม่ต้องรีเฟรช
    const socket = getSocket();
    const onNew = (n: NotificationItem) =>
      setItems((prev) => (prev.some((x) => x.id === n.id) ? prev : [n, ...prev]));
    socket.on('notification:new', onNew);
    return () => {
      socket.off('notification:new', onNew);
    };
  }, []);

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

  const counts: Record<'all' | Category, number> = { all: items.length, booking: 0, money: 0, chat: 0, warn: 0 };
  for (const n of items) counts[categoryOf(n.type)] += 1;

  const tabs: ('all' | Category)[] = ['all', 'booking', 'money', 'chat', 'warn'];
  const visible = tab === 'all' ? items : items.filter((n) => categoryOf(n.type) === tab);

  return (
    <div>
      {/* filter tabs */}
      <div className="mb-5 flex gap-2 overflow-x-auto pb-1">
        {tabs.map((k) => {
          const active = tab === k;
          return (
            <button
              key={k}
              onClick={() => setTab(k)}
              className={`flex h-10 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-pill border px-4 text-sm font-semibold transition ${
                active
                  ? 'border-transparent bg-[#12A150] text-white'
                  : 'border-card-border bg-white text-ink-body hover:bg-surface-canvas'
              }`}
            >
              {t.tabs[k]}
              {counts[k] > 0 && (
                <span className={`text-xs ${active ? 'text-white/80' : 'text-ink-faint'}`}>{counts[k]}</span>
              )}
            </button>
          );
        })}
      </div>

      {/* cards */}
      <div className="flex max-w-[840px] flex-col gap-3">
        {visible.map((n) => {
          const cat = categoryOf(n.type);
          const c = CAT[cat];
          const unread = !n.readAt;
          return (
            <div
              key={n.id}
              onClick={() => unread && markRead(n.id)}
              className={`relative cursor-pointer overflow-hidden rounded-card-lg border border-card-border bg-white shadow-card ${
                unread ? '' : 'opacity-70'
              }`}
            >
              {unread && <div className="absolute bottom-0 left-0 top-0 w-1" style={{ background: c.accent }} />}
              <div className="flex gap-3.5 p-4">
                <div
                  className="flex h-[46px] w-[46px] shrink-0 items-center justify-center rounded-xl"
                  style={{ background: c.icBg }}
                >
                  <CatIcon cat={cat} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[15px] font-bold text-ink-strong">{n.title}</span>
                    <span className="ml-auto shrink-0 text-xs text-ink-faint">
                      {new Date(n.createdAt).toLocaleString(t.dateLocale)}
                    </span>
                  </div>
                  <div className="mt-1.5 text-[13.5px] leading-relaxed text-ink-subtitle">{n.body}</div>

                  {/* action per type */}
                  {n.attachmentKey ? (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        viewSlip(n.id);
                      }}
                      disabled={slipLoadingId === n.id}
                      className="mt-3 inline-flex h-[38px] items-center gap-2 rounded-[10px] px-4 text-[13.5px] font-bold text-white disabled:opacity-60"
                      style={{ background: '#12A150' }}
                    >
                      {slipLoadingId === n.id ? t.loadingSlip : t.viewSlip}
                    </button>
                  ) : cat === 'booking' ? (
                    <Link
                      href="/partner/requests"
                      onClick={(e) => e.stopPropagation()}
                      className="mt-3 inline-flex h-[38px] items-center gap-2 rounded-[10px] px-4 text-[13.5px] font-bold text-white"
                      style={{ background: c.accent }}
                    >
                      {t.viewBooking}
                    </Link>
                  ) : n.type.toLowerCase() === 'dorm_rejected' ? (
                    <Link
                      href="/partner/dashboard"
                      onClick={(e) => e.stopPropagation()}
                      className="mt-3 inline-flex h-[38px] items-center gap-2 rounded-[10px] px-4 text-[13.5px] font-bold text-white"
                      style={{ background: c.accent }}
                    >
                      {t.goFix}
                    </Link>
                  ) : null}
                </div>
              </div>
            </div>
          );
        })}
        {slipError && <p className="text-sm text-danger">{slipError}</p>}
        {visible.length === 0 && <p className="py-6 text-ink-faint">{t.none}</p>}
      </div>
    </div>
  );
}
