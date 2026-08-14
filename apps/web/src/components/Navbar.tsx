'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { apiClient } from '@/lib/api-client';
import { getToken, clearToken } from '@/lib/auth';
import { resetSocket, getSocket } from '@/lib/ws';
import { useLang } from '@/hooks/useLang';
import { useTypewriter } from '@/hooks/useTypewriter';
import { HopakIcon } from '@/components/HopakIcon';
import { LangSwitch } from '@/components/LangSwitch';
import { MobileHomeChrome, MobileMenuButton } from '@/components/home/MobileHomeChrome';
import type { User } from '@hopak/shared';

const TEXT = {
  th: {
    home: 'หน้าแรก',
    bookings: 'การจองของฉัน',
    saved: 'บันทึก',
    refresh: 'รีเฟรช',
    notifications: 'การแจ้งเตือน',
    dashboard: 'แดชบอร์ด',
    logout: 'ออกจากระบบ',
    login: 'เข้าสู่ระบบ',
    searchPhrases: ['ค้นหาจังหวัด', 'หอพักใกล้มหาวิทยาลัย', 'ชื่อหอพักใกล้ฉัน'],
  },
  en: {
    home: 'Home',
    bookings: 'My Bookings',
    saved: 'Saved',
    refresh: 'Refresh',
    notifications: 'Notifications',
    dashboard: 'Dashboard',
    logout: 'Log out',
    login: 'Log in',
    searchPhrases: ['Search by province', 'Dorms near your university', 'Dorm name near me'],
  },
};

export function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const { lang, setLang } = useLang();
  const t = TEXT[lang];
  const [user, setUser] = useState<User | null>(null);
  const [checked, setChecked] = useState(false);
  const [q, setQ] = useState('');
  const [unreadNotif, setUnreadNotif] = useState(0);
  const [bellPulse, setBellPulse] = useState(false);
  const [toast, setToast] = useState<{ title?: string; body?: string } | null>(null);
  // จอเล็กใส่ปุ่มไม่พอ — เข้าสู่ระบบ/สมัคร/ภาษา ย้ายไปอยู่ในลิ้นชักแฮมเบอร์เกอร์ตัวเดียวกับหน้าแรก
  const [menuOpen, setMenuOpen] = useState(false);
  const animatedPlaceholder = useTypewriter(t.searchPhrases);

  useEffect(() => {
    if (!getToken()) {
      setChecked(true);
      return;
    }
    apiClient
      .get<User>('/users/me')
      .then(setUser)
      .catch(() => clearToken())
      .finally(() => setChecked(true));
  }, []);

  // กระดิ่งแจ้งเตือน — เฉพาะผู้เช่า (tenant) ที่ล็อกอินอยู่เท่านั้น
  // นับจำนวนที่ยังไม่อ่าน + ฟังเรียลไทม์เพิ่มทันทีเมื่อมีแจ้งเตือนใหม่
  const isTenant = user?.role.toLowerCase() === 'tenant';
  useEffect(() => {
    if (!isTenant) return;
    const socket = getSocket();
    // แจ้งเตือนใหม่เรียลไทม์: เพิ่มตัวนับ + กระดิ่งเด้ง (ping) + เด้ง toast แดงสักครู่ (ไม่ต้องรีเฟรช)
    const onNew = (n?: { title?: string; body?: string }) => {
      setUnreadNotif((c) => c + 1);
      setBellPulse(true);
      setTimeout(() => setBellPulse(false), 2500);
      if (n && (n.title || n.body)) {
        setToast(n);
        setTimeout(() => setToast(null), 6000);
      }
    };
    socket.on('notification:new', onNew);
    return () => {
      socket.off('notification:new', onNew);
    };
  }, [isTenant]);

  // โหลด/รีเฟรชจำนวนที่ยังไม่อ่านทุกครั้งที่เปลี่ยนหน้า + เมื่อผู้ใช้กดอ่านในหน้าแจ้งเตือน
  // (custom event 'hopak:notif-read' กันตัวนับค้างขณะอยู่หน้าเดียวกัน)
  useEffect(() => {
    if (!isTenant) return;
    const refetch = () =>
      apiClient
        .get<{ readAt: string | null }[]>('/notifications')
        .then((list) => setUnreadNotif(list.filter((n) => !n.readAt).length))
        .catch(() => {});
    refetch();
    window.addEventListener('hopak:notif-read', refetch);
    return () => window.removeEventListener('hopak:notif-read', refetch);
  }, [isTenant, pathname]);

  function handleLogout() {
    clearToken();
    resetSocket();
    setUser(null);
    router.push('/');
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    router.push(q.trim() ? `/search?q=${encodeURIComponent(q.trim())}` : '/search');
  }

  const role = user?.role.toLowerCase();
  const dashboardHref = role === 'owner' ? '/partner/dashboard' : role === 'admin' ? '/admin/dashboard' : null;

  return (
    <header className="border-b border-card-border bg-white dark:border-white/10 dark:bg-[#1a1a19]">
      <div className="mx-auto flex max-w-6xl items-center gap-2.5 px-4 py-3 sm:gap-4 sm:p-4">
        <Link href="/" className="flex shrink-0 items-center gap-2.5">
          <HopakIcon size={32} />
          <span className="hidden text-lg font-bold text-ink-strong dark:text-white sm:inline">Hoprak</span>
        </Link>

        {/* ช่องค้นหา — ซ่อนบนมือถือ (เบียดจอเล็ก) เหลือปุ่มค้นหาแทน */}
        <form onSubmit={handleSearch} className="hidden max-w-xl flex-1 items-center gap-2 rounded-full border border-card-border bg-surface-canvas px-4 py-2 dark:border-white/10 dark:bg-white/5 md:flex">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="shrink-0 text-ink-faint">
            <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={animatedPlaceholder}
            className="w-full bg-transparent text-sm text-ink outline-none placeholder:text-ink-faint dark:text-white"
          />
        </form>

        {/* ปุ่มค้นหาไอคอน — เฉพาะมือถือ (แทนช่องค้นหาที่ซ่อน) */}
        <Link
          href="/search"
          aria-label="search"
          className="ml-auto flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-ink-subtitle hover:bg-black/[0.04] dark:text-white dark:hover:bg-white/10 md:hidden"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </Link>

        <nav className="flex items-center gap-2.5 text-sm md:ml-auto md:gap-5">
          <Link href="/" className="hidden text-ink hover:text-tenant dark:text-white md:inline">
            {t.home}
          </Link>
          <Link href="/bookings" className="hidden text-ink hover:text-tenant dark:text-white md:inline">
            {t.bookings}
          </Link>
          <Link href="/saved" className="hidden text-ink hover:text-tenant dark:text-white md:inline">
            {t.saved}
          </Link>

          {/* ภาษา + รีเฟรช ซ่อนบนมือถือ (ภาษาไปอยู่ในลิ้นชัก) */}
          <span className="hidden sm:inline-flex">
            <LangSwitch lang={lang} onChange={setLang} />
          </span>

          <button
            type="button"
            onClick={() => router.refresh()}
            title={t.refresh}
            className="hidden h-8 w-8 items-center justify-center rounded-full text-ink-subtitle hover:bg-black/[0.04] dark:text-white dark:hover:bg-white/10 sm:flex"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path
                d="M20 11A8 8 0 105.5 16.5M4 4v5h5M20 20v-5h-5"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>

          {!checked ? null : user ? (
            <>
              {dashboardHref && (
                <Link href={dashboardHref} className="hidden text-ink hover:text-tenant dark:text-white sm:inline">
                  {t.dashboard}
                </Link>
              )}
              {isTenant && (
                <Link
                  href="/notifications"
                  title={t.notifications}
                  className="relative flex h-9 w-9 items-center justify-center rounded-[11px] bg-tenant-tint text-tenant hover:brightness-95 dark:bg-white/10"
                >
                  {bellPulse && <span className="absolute inset-0 animate-ping rounded-[11px] bg-danger/40" />}
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    className={bellPulse ? 'origin-top animate-bounce' : ''}
                  >
                    <path
                      d="M18 8a6 6 0 10-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 01-3.4 0"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  {unreadNotif > 0 && (
                    <span className="absolute -right-1 -top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-pill border-2 border-white bg-danger px-1 text-[11px] font-bold text-white dark:border-[#1a1a19]">
                      {unreadNotif > 99 ? '99+' : unreadNotif}
                    </span>
                  )}
                </Link>
              )}
              <Link href="/profile" className="flex items-center gap-2 text-ink hover:text-tenant dark:text-white">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-tenant/15 text-xs font-bold text-tenant">
                  {user.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={user.avatarUrl} alt="" className="h-full w-full object-cover" />
                  ) : (
                    user.name.charAt(0)
                  )}
                </span>
                <span className="hidden max-w-[120px] truncate sm:inline">{user.name}</span>
              </Link>
              <button onClick={handleLogout} className="hidden text-danger hover:underline sm:inline">
                {t.logout}
              </button>
            </>
          ) : (
            <Link
              href="/login"
              className="hidden rounded-btn bg-tenant px-4 py-2 font-medium text-white hover:bg-tenant-dark sm:block"
            >
              {t.login}
            </Link>
          )}

          <MobileMenuButton
            variant="onLight"
            open={menuOpen}
            onClick={() => setMenuOpen((v) => !v)}
            label={lang === 'th' ? 'เมนู' : 'Menu'}
          />
        </nav>
      </div>

      {/* ลิ้นชักเมนูมือถือ — ไม่เอาแถบล่าง (หน้าหอพักมีแถบราคาติดล่างอยู่แล้ว) */}
      <MobileHomeChrome
        bottomNav={false}
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        lang={lang}
        setLang={setLang}
        user={user ? { name: user.name, avatarUrl: user.avatarUrl } : null}
        onLogout={handleLogout}
      />

      {/* toast แจ้งเตือนใหม่เรียลไทม์ — เด้งมุมขวาบน กดไปหน้าแจ้งเตือน หายเองใน 6 วิ */}
      {toast && (
        <button
          onClick={() => {
            setToast(null);
            router.push('/notifications');
          }}
          className="fixed right-4 top-4 z-[60] flex max-w-xs items-start gap-3 rounded-2xl border-l-4 border-danger bg-white px-4 py-3 text-left shadow-[0_12px_30px_rgba(16,24,40,0.18)] dark:bg-[#1a1a19]"
        >
          <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-danger/10 text-danger">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path
                d="M18 8a6 6 0 10-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 01-3.4 0"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
          <span className="min-w-0">
            {toast.title && (
              <span className="block truncate text-sm font-bold text-ink-strong dark:text-white">{toast.title}</span>
            )}
            {toast.body && (
              <span className="mt-0.5 line-clamp-2 block text-xs text-ink-subtitle dark:text-white/70">{toast.body}</span>
            )}
          </span>
        </button>
      )}
    </header>
  );
}
