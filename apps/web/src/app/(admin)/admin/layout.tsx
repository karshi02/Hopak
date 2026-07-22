'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useLang } from '@/hooks/useLang';
import { LangSwitch } from '@/components/LangSwitch';
import { PageLoader } from '@/components/PageLoader';

const NAV = {
  th: [
    { href: '/admin/dashboard', label: 'แดชบอร์ด' },
    { href: '/admin/bookings', label: 'การจอง & สถานะ' },
    { href: '/admin/approvals', label: 'หอพัก (อนุมัติ)' },
    { href: '/admin/owner-requests', label: 'คำขอเป็นเจ้าของหอ' },
    { href: '/admin/users', label: 'ผู้ใช้ (Users)' },
    { href: '/admin/finance', label: 'การเงิน & รวมบิล' },
    { href: '/admin/campaigns', label: 'โฆษณา & แคมเปญ' },
    { href: '/admin/admins', label: 'ผู้ดูแล (Admins)' },
  ],
  en: [
    { href: '/admin/dashboard', label: 'Dashboard' },
    { href: '/admin/bookings', label: 'Bookings & Status' },
    { href: '/admin/approvals', label: 'Dorms (Approvals)' },
    { href: '/admin/owner-requests', label: 'Owner Requests' },
    { href: '/admin/users', label: 'Users' },
    { href: '/admin/finance', label: 'Finance & Payouts' },
    { href: '/admin/campaigns', label: 'Ads & Campaigns' },
    { href: '/admin/admins', label: 'Admins' },
  ],
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading } = useCurrentUser();
  const { lang, setLang } = useLang();
  const isAdmin = user?.role.toLowerCase() === 'admin';

  useEffect(() => {
    if (!loading && !isAdmin) router.replace('/login');
  }, [loading, isAdmin, router]);

  if (loading || !isAdmin) return <PageLoader />;

  return (
    <div className="flex min-h-screen">
      <aside className="flex w-56 shrink-0 flex-col gap-1 bg-admin-sidebar p-3.5">
        <div className="flex items-center gap-2.5 px-2 pb-4 pt-1">
          <span className="flex h-[30px] w-[30px] items-center justify-center rounded-lg bg-tenant font-sans text-sm font-bold text-white">
            H
          </span>
          <span className="text-base font-bold text-white">Hopak Admin</span>
        </div>
        <div className="px-2 pb-3">
          <LangSwitch lang={lang} onChange={setLang} dark />
        </div>
        <nav className="flex flex-col gap-1">
          {NAV[lang].map((item) => {
            const active = pathname === item.href || pathname?.startsWith(item.href + '/');
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm ${
                  active ? 'bg-tenant font-semibold text-white' : 'text-admin-sidebarmuted hover:text-white'
                }`}
              >
                <span
                  className={`h-2 w-2 rounded-[2px] ${active ? 'bg-white' : 'bg-admin-sidebardot'}`}
                />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>
      <main className="flex-1 bg-surface-web p-6">{children}</main>
    </div>
  );
}
