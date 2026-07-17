'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api-client';
import { getToken, clearToken } from '@/lib/auth';
import type { User } from '@hopak/shared';

export function Navbar() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [checked, setChecked] = useState(false);

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
    setUser(null);
    router.push('/');
  }

  const role = user?.role.toLowerCase();
  const dashboardHref = role === 'owner' ? '/partner/dashboard' : role === 'admin' ? '/admin/dashboard' : null;

  return (
    <header className="border-b border-card-border bg-white dark:border-white/10 dark:bg-[#1a1a19]">
      <div className="mx-auto flex max-w-6xl items-center gap-5 p-4">
        <Link href="/" className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-[9px] bg-tenant font-sans text-base font-bold text-white">
            H
          </span>
          <span className="text-lg font-bold text-ink-strong dark:text-white">Hopak</span>
        </Link>

        <nav className="ml-auto flex items-center gap-5 text-sm">
          <Link href="/search" className="text-ink hover:text-tenant dark:text-white">
            ค้นหาหอพัก
          </Link>

          {!checked ? null : user ? (
            <>
              <Link href="/bookings" className="text-ink hover:text-tenant dark:text-white">
                การจองของฉัน
              </Link>
              {dashboardHref && (
                <Link href={dashboardHref} className="text-ink hover:text-tenant dark:text-white">
                  แดชบอร์ด
                </Link>
              )}
              <Link href="/profile" className="text-ink hover:text-tenant dark:text-white">
                {user.name}
              </Link>
              <button onClick={handleLogout} className="text-danger hover:underline">
                ออกจากระบบ
              </button>
            </>
          ) : (
            <>
              <Link href="/register" className="text-ink hover:text-tenant dark:text-white">
                สมัครสมาชิก
              </Link>
              <Link
                href="/login"
                className="rounded-btn bg-tenant px-4 py-2 font-medium text-white hover:bg-tenant-dark"
              >
                เข้าสู่ระบบ
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
