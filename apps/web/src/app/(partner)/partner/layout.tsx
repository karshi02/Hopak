'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV = [
  { href: '/partner/dashboard', label: 'แดชบอร์ด' },
  { href: '/partner/dorms/new', label: 'เพิ่มหอพัก' },
  { href: '/partner/rooms', label: 'จัดการห้อง' },
  { href: '/partner/requests', label: 'คำขอจอง' },
  { href: '/partner/slips', label: 'ใบจอง' },
  { href: '/partner/settings', label: 'ตั้งค่า' },
];

export default function PartnerLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="flex min-h-screen">
      <aside className="flex w-56 shrink-0 flex-col gap-1 bg-seller-dark p-3.5">
        <div className="flex items-center gap-2.5 px-2 pb-4 pt-1">
          <span className="flex h-[30px] w-[30px] items-center justify-center rounded-lg bg-seller font-sans text-sm font-bold text-white">
            H
          </span>
          <span className="text-base font-bold text-white">Owner Console</span>
        </div>
        <nav className="flex flex-col gap-1">
          {NAV.map((item) => {
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
