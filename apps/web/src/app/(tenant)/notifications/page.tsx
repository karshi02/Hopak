'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api-client';
import { getToken } from '@/lib/auth';
import { useLang } from '@/hooks/useLang';
import { getSocket } from '@/lib/ws';

interface NotificationItem {
  id: string;
  type: string;
  title: string;
  body: string;
  readAt: string | null;
  createdAt: string;
}

const TEXT = {
  th: {
    title: 'การแจ้งเตือน',
    unreadCount: (n: number) => (
      <>
        คุณมี <b className="text-tenant">{n}</b> รายการที่ยังไม่ได้อ่าน
      </>
    ),
    allRead: 'อ่านทั้งหมดแล้ว',
    tabs: { all: 'ทั้งหมด', booking: 'การจอง', payment: 'การชำระเงิน', system: 'ระบบ' } as Record<string, string>,
    groups: { today: 'วันนี้', yesterday: 'เมื่อวาน', earlier: 'ก่อนหน้า' } as Record<string, string>,
    emptyTitle: 'ไม่มีการแจ้งเตือนในหมวดนี้',
    emptySub: 'การแจ้งเตือนใหม่จะปรากฏที่นี่',
    action: { booking: 'ดูการจอง', payment: 'ดูใบเสร็จ' } as Record<string, string>,
    justNow: 'เมื่อสักครู่',
    minsAgo: (n: number) => `${n} นาทีที่แล้ว`,
    hrsAgo: (n: number) => `${n} ชั่วโมงที่แล้ว`,
    dateLocale: 'th-TH',
  },
  en: {
    title: 'Notifications',
    unreadCount: (n: number) => (
      <>
        You have <b className="text-tenant">{n}</b> unread
      </>
    ),
    allRead: 'Mark all as read',
    tabs: { all: 'All', booking: 'Bookings', payment: 'Payments', system: 'System' } as Record<string, string>,
    groups: { today: 'Today', yesterday: 'Yesterday', earlier: 'Earlier' } as Record<string, string>,
    emptyTitle: 'No notifications in this category',
    emptySub: 'New notifications will show up here',
    action: { booking: 'View booking', payment: 'View receipt' } as Record<string, string>,
    justNow: 'Just now',
    minsAgo: (n: number) => `${n} min ago`,
    hrsAgo: (n: number) => `${n} hr ago`,
    dateLocale: 'en-US',
  },
};

const TABS = ['all', 'booking', 'payment', 'system'] as const;
type Tab = (typeof TABS)[number];

// map ชนิด notification จริงในระบบ (booking/payment/warning/payout) เข้ากลุ่ม filter
// warning + payout ถือเป็นหมวด "ระบบ" — chat/promo ใน design ยังไม่มีในระบบจริง จึงไม่ทำ (ไม่สร้างข้อมูลปลอม)
function tabOf(type: string): Exclude<Tab, 'all'> {
  if (type === 'booking') return 'booking';
  if (type === 'payment') return 'payment';
  return 'system';
}

function iconFor(type: string) {
  const t = tabOf(type);
  const map = {
    booking: { bg: 'bg-tenant-tint', stroke: '#2F6FE0', d: 'M9 11l3 3 8-8M20 12v6a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h9' },
    payment: { bg: 'bg-success-tint', stroke: '#12A150', d: 'M3 10h18M3 7a2 2 0 012-2h14a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2z' },
    system: { bg: 'bg-warning-tint', stroke: '#C77B14', d: 'M12 9v4M12 17h.01M10.3 3.9L2.4 18a2 2 0 001.7 3h15.8a2 2 0 001.7-3L13.7 3.9a2 2 0 00-3.4 0z' },
  }[t];
  return (
    <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${map.bg}`}>
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
        <path d={map.d} stroke={map.stroke} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  );
}

function groupOf(createdAt: string): 'today' | 'yesterday' | 'earlier' {
  const d = new Date(createdAt);
  const now = new Date();
  const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const t = d.getTime();
  if (t >= startToday) return 'today';
  if (t >= startToday - 86400000) return 'yesterday';
  return 'earlier';
}

export default function NotificationsPage() {
  const router = useRouter();
  const { lang } = useLang();
  const t = TEXT[lang];
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [filter, setFilter] = useState<Tab>('all');

  useEffect(() => {
    if (!getToken()) {
      router.replace('/login');
      return;
    }
    apiClient.get<NotificationItem[]>('/notifications').then(setItems).catch(() => {});

    const socket = getSocket();
    function onNew(notification: NotificationItem) {
      setItems((prev) => (prev.some((n) => n.id === notification.id) ? prev : [notification, ...prev]));
    }
    socket.on('notification:new', onNew);
    return () => {
      socket.off('notification:new', onNew);
    };
  }, [router]);

  const unreadCount = items.filter((n) => !n.readAt).length;

  const tabCounts = useMemo(() => {
    const c: Record<Tab, number> = { all: 0, booking: 0, payment: 0, system: 0 };
    for (const n of items) {
      if (n.readAt) continue;
      c.all += 1;
      c[tabOf(n.type)] += 1;
    }
    return c;
  }, [items]);

  const filtered = filter === 'all' ? items : items.filter((n) => tabOf(n.type) === filter);

  const groups = (['today', 'yesterday', 'earlier'] as const)
    .map((key) => ({ key, items: filtered.filter((n) => groupOf(n.createdAt) === key) }))
    .filter((g) => g.items.length > 0);

  function fmtTime(createdAt: string) {
    const diff = Date.now() - new Date(createdAt).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return t.justNow;
    if (mins < 60) return t.minsAgo(mins);
    if (mins < 1440) return t.hrsAgo(Math.floor(mins / 60));
    return new Date(createdAt).toLocaleDateString(t.dateLocale, { day: 'numeric', month: 'short', year: 'numeric' });
  }

  // แจ้ง navbar (กระดิ่ง) ให้รีเฟรชตัวนับทันทีเมื่ออ่านในหน้านี้ ไม่ต้องรอเปลี่ยนหน้า
  function notifyRead() {
    window.dispatchEvent(new Event('hopak:notif-read'));
  }

  async function markRead(id: string) {
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, readAt: new Date().toISOString() } : n)));
    await apiClient.patch(`/notifications/${id}/read`).catch(() => {});
    notifyRead();
  }

  async function markAll() {
    setItems((prev) => prev.map((n) => (n.readAt ? n : { ...n, readAt: new Date().toISOString() })));
    await apiClient.patch('/notifications/read-all').catch(() => {});
    notifyRead();
  }

  function openRow(n: NotificationItem) {
    if (!n.readAt) markRead(n.id);
    // booking/payment โยงไปหน้าการจองของฉัน — ไม่มี id การจองผูกในตัว notification จึงไปหน้ารวม
    if (n.type === 'booking' || n.type === 'payment') router.push('/bookings');
  }

  return (
    <main className="mx-auto max-w-[820px] p-4 sm:p-6">
      {/* header */}
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-ink-strong sm:text-[27px]">{t.title}</h1>
          <p className="mt-1 text-sm text-ink-muted">{t.unreadCount(unreadCount)}</p>
        </div>
        {unreadCount > 0 && (
          <button
            onClick={markAll}
            className="flex h-10 items-center gap-2 rounded-[11px] border border-card-border bg-white px-4 text-[13.5px] font-semibold text-ink-body hover:bg-surface-canvas"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M4 12l5 5L20 6" stroke="#178F5A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            {t.allRead}
          </button>
        )}
      </div>

      {/* filter tabs */}
      <div className="mb-5 flex flex-wrap gap-2.5">
        {TABS.map((tab) => {
          const active = filter === tab;
          const count = tabCounts[tab];
          return (
            <button
              key={tab}
              onClick={() => setFilter(tab)}
              className={`flex h-10 items-center gap-2 rounded-pill border-[1.5px] px-4 text-[13.5px] font-semibold ${
                active ? 'border-tenant bg-tenant text-white' : 'border-card-border bg-white text-ink-body'
              }`}
            >
              {t.tabs[tab]}
              {count > 0 && (
                <span
                  className={`flex h-5 min-w-5 items-center justify-center rounded-pill px-1.5 text-[11.5px] font-bold ${
                    active ? 'bg-white/25 text-white' : 'bg-tenant-tint text-tenant'
                  }`}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* groups */}
      {groups.map((g) => (
        <div key={g.key} className="mb-5">
          <div className="mb-2.5 pl-0.5 text-[12.5px] font-bold uppercase tracking-wide text-ink-faint">
            {t.groups[g.key]}
          </div>
          <div className="overflow-hidden rounded-[18px] border border-card-border bg-white shadow-card">
            {g.items.map((n, i) => {
              const unread = !n.readAt;
              const actionLabel = t.action[n.type];
              return (
                <div
                  key={n.id}
                  onClick={() => openRow(n)}
                  className={`relative flex cursor-pointer gap-4 px-5 py-4 ${
                    i > 0 ? 'border-t border-hairline' : ''
                  } ${unread ? 'bg-[#F7FAFF]' : 'bg-white'}`}
                >
                  {iconFor(n.type)}
                  <div className="min-w-0 flex-1">
                    <div className="text-[14.5px] font-bold text-ink-strong">{n.title}</div>
                    <div className="mt-0.5 text-[13.5px] leading-relaxed text-ink-subtitle">{n.body}</div>
                    <div className="mt-2 flex items-center gap-3">
                      <span className="text-xs text-ink-faint">{fmtTime(n.createdAt)}</span>
                      {actionLabel && <span className="text-[12.5px] font-bold text-tenant">{actionLabel} →</span>}
                    </div>
                  </div>
                  {unread && <span className="absolute right-5 top-5 h-2.5 w-2.5 rounded-pill bg-tenant" />}
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {/* empty */}
      {groups.length === 0 && (
        <div className="rounded-[18px] border border-card-border bg-white px-5 py-16 text-center">
          <div className="mx-auto flex h-[70px] w-[70px] items-center justify-center rounded-pill bg-surface-canvas">
            <svg width="34" height="34" viewBox="0 0 24 24" fill="none">
              <path
                d="M18 8a6 6 0 10-12 0c0 7-3 9-3 9h18s-3-2-3-9"
                stroke="#C9D0DC"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <div className="mt-4 text-base font-bold text-ink-strong">{t.emptyTitle}</div>
          <div className="mt-1 text-[13.5px] text-ink-muted">{t.emptySub}</div>
        </div>
      )}
    </main>
  );
}
