'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api-client';
import { getToken, clearToken } from '@/lib/auth';
import { resetSocket } from '@/lib/ws';
import { useLang } from '@/hooks/useLang';
import { LangSwitch } from '@/components/LangSwitch';
import type { User } from '@hopak/shared';

const TEXT = {
  th: {
    home: 'หน้าแรก',
    bookings: 'การจองของฉัน',
    saved: 'บันทึก',
    refresh: 'รีเฟรช',
    dashboard: 'แดชบอร์ด',
    logout: 'ออกจากระบบ',
    login: 'เข้าสู่ระบบ',
    searchPlaceholder: 'ค้นหาจังหวัด / มหาวิทยาลัย / ชื่อหอพัก',
  },
  en: {
    home: 'Home',
    bookings: 'My Bookings',
    saved: 'Saved',
    refresh: 'Refresh',
    dashboard: 'Dashboard',
    logout: 'Log out',
    login: 'Log in',
    searchPlaceholder: 'Search province / university / dorm name',
  },
};

export function Navbar() {
  const router = useRouter();
  const { lang, setLang } = useLang();
  const t = TEXT[lang];
  const [user, setUser] = useState<User | null>(null);
  const [checked, setChecked] = useState(false);
  const [q, setQ] = useState('');

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
      <div className="mx-auto flex max-w-6xl items-center gap-4 p-4">
        <Link href="/" className="flex shrink-0 items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-[9px] bg-tenant font-sans text-base font-bold text-white">
            H
          </span>
          <span className="hidden text-lg font-bold text-ink-strong dark:text-white sm:inline">Hopak</span>
        </Link>

        <form onSubmit={handleSearch} className="flex max-w-xl flex-1 items-center gap-2 rounded-full border border-card-border bg-surface-canvas px-4 py-2 dark:border-white/10 dark:bg-white/5">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="shrink-0 text-ink-faint">
            <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t.searchPlaceholder}
            className="w-full bg-transparent text-sm text-ink outline-none placeholder:text-ink-faint dark:text-white"
          />
        </form>

        <nav className="ml-auto flex items-center gap-5 text-sm">
          <Link href="/" className="hidden text-ink hover:text-tenant dark:text-white md:inline">
            {t.home}
          </Link>
          <Link href="/bookings" className="hidden text-ink hover:text-tenant dark:text-white md:inline">
            {t.bookings}
          </Link>
          <Link href="/saved" className="hidden text-ink hover:text-tenant dark:text-white md:inline">
            {t.saved}
          </Link>

          <LangSwitch lang={lang} onChange={setLang} />

          <button
            type="button"
            onClick={() => router.refresh()}
            title={t.refresh}
            className="flex h-8 w-8 items-center justify-center rounded-full text-ink-subtitle hover:bg-black/[0.04] dark:text-white dark:hover:bg-white/10"
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
                <Link href={dashboardHref} className="text-ink hover:text-tenant dark:text-white">
                  {t.dashboard}
                </Link>
              )}
              <Link href="/profile" className="text-ink hover:text-tenant dark:text-white">
                {user.name}
              </Link>
              <button onClick={handleLogout} className="text-danger hover:underline">
                {t.logout}
              </button>
            </>
          ) : (
            <Link
              href="/login"
              className="rounded-btn bg-tenant px-4 py-2 font-medium text-white hover:bg-tenant-dark"
            >
              {t.login}
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
