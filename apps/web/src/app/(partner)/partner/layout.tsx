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
    { href: '/partner/dashboard', label: 'แดชบอร์ด' },
    { href: '/partner/dorms/new', label: 'เพิ่มหอพัก' },
    { href: '/partner/rooms', label: 'จัดการห้อง' },
    { href: '/partner/requests', label: 'คำขอจอง' },
    { href: '/partner/slips', label: 'ใบจอง' },
    { href: '/partner/settings', label: 'ตั้งค่า' },
  ],
  en: [
    { href: '/partner/dashboard', label: 'Dashboard' },
    { href: '/partner/dorms/new', label: 'Add Dorm' },
    { href: '/partner/rooms', label: 'Manage Rooms' },
    { href: '/partner/requests', label: 'Booking Requests' },
    { href: '/partner/slips', label: 'Slips' },
    { href: '/partner/settings', label: 'Settings' },
  ],
};

export default function PartnerLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading } = useCurrentUser();
  const { lang, setLang } = useLang();
  const isOwner = user?.role.toLowerCase() === 'owner';

  useEffect(() => {
    if (!loading && !isOwner) router.replace('/login');
  }, [loading, isOwner, router]);

  if (loading || !isOwner) return <PageLoader />;

  return (
    <div className="flex min-h-screen">
      <aside className="flex w-56 shrink-0 flex-col gap-1 bg-seller-dark p-3.5">
        <div className="flex items-center gap-2.5 px-2 pb-4 pt-1">
          <span className="flex h-[30px] w-[30px] items-center justify-center rounded-lg bg-seller font-sans text-sm font-bold text-white">
            H
          </span>
          <span className="text-base font-bold text-white">Owner Console</span>
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
                  active ? 'bg-seller font-semibold text-white' : 'text-seller-muted hover:text-white'
                }`}
              >
                <span
                  className={`h-2 w-2 rounded-[2px] ${active ? 'bg-white' : 'bg-seller-dot'}`}
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
