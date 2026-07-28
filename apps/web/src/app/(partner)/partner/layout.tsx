'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useLang } from '@/hooks/useLang';
import { apiClient } from '@/lib/api-client';
import { clearToken } from '@/lib/auth';
import { LangSwitch } from '@/components/LangSwitch';
import { PageLoader } from '@/components/PageLoader';
import { AdminIcon } from '@/components/admin/AdminIcon';
import type { Booking } from '@hopak/shared';

type IconKey = 'dash' | 'bed' | 'book' | 'money' | 'bell' | 'gear' | 'shield';
interface NavItem {
  href: string;
  icon: IconKey;
  label: string;
  badgeKey?: 'pending';
}

const NAV: Record<'th' | 'en', NavItem[]> = {
  th: [
    { href: '/partner/dashboard', icon: 'dash', label: 'แดชบอร์ด' },
    { href: '/partner/rooms', icon: 'bed', label: 'ห้องพัก' },
    { href: '/partner/requests', icon: 'book', label: 'การจอง', badgeKey: 'pending' },
    { href: '/partner/check-in', icon: 'shield', label: 'ยืนยันเข้าพัก' },
    { href: '/partner/slips', icon: 'money', label: 'ใบจอง' },
    { href: '/partner/notifications', icon: 'bell', label: 'แจ้งเตือน' },
    { href: '/partner/settings', icon: 'gear', label: 'ตั้งค่า' },
  ],
  en: [
    { href: '/partner/dashboard', icon: 'dash', label: 'Dashboard' },
    { href: '/partner/rooms', icon: 'bed', label: 'Rooms' },
    { href: '/partner/requests', icon: 'book', label: 'Bookings', badgeKey: 'pending' },
    { href: '/partner/check-in', icon: 'shield', label: 'Check-in' },
    { href: '/partner/slips', icon: 'money', label: 'Slips' },
    { href: '/partner/notifications', icon: 'bell', label: 'Notifications' },
    { href: '/partner/settings', icon: 'gear', label: 'Settings' },
  ],
};

const PAGE_HEADER: Record<string, Record<'th' | 'en', { title: string; subtitle: string }>> = {
  '/partner/dashboard': {
    th: { title: 'แดชบอร์ด', subtitle: 'ภาพรวมหอพักของคุณ' },
    en: { title: 'Dashboard', subtitle: 'Your dorm overview' },
  },
  '/partner/rooms': {
    th: { title: 'ห้องพัก', subtitle: 'จัดการห้องทั้งหมด' },
    en: { title: 'Rooms', subtitle: 'Manage all your rooms' },
  },
  '/partner/requests': {
    th: { title: 'การจอง', subtitle: 'คำขอจองและผู้เช่าปัจจุบัน' },
    en: { title: 'Bookings', subtitle: 'Requests and current tenants' },
  },
  '/partner/profile': {
    th: { title: 'โปรไฟล์ของฉัน', subtitle: 'รูปโปรไฟล์ ข้อมูลส่วนตัว และรหัสผ่าน' },
    en: { title: 'My Profile', subtitle: 'Photo, personal info, and password' },
  },
  '/partner/check-in': {
    th: { title: 'ยืนยันเข้าพัก', subtitle: 'กรอกโค้ดจากใบเสร็จของผู้เช่าเพื่อยืนยันตัวตนตอนเข้าพัก' },
    en: { title: 'Check-in', subtitle: "Enter the code from the tenant's receipt to verify them at check-in" },
  },
  '/partner/slips': {
    th: { title: 'ใบจอง', subtitle: 'รายละเอียดห้อง ราคา และใบยืนยันการชำระเงิน' },
    en: { title: 'Slips', subtitle: 'Room details, price, and payment confirmation' },
  },
  '/partner/notifications': {
    th: { title: 'แจ้งเตือน', subtitle: 'ข่าวสารและการแจ้งเตือนล่าสุด' },
    en: { title: 'Notifications', subtitle: 'Latest updates and alerts' },
  },
  '/partner/settings': {
    th: { title: 'ตั้งค่า', subtitle: 'ข้อมูลเจ้าของหอและบัญชีรับเงิน' },
    en: { title: 'Settings', subtitle: 'Owner info and payout account' },
  },
  '/partner/dorms/new': {
    th: { title: 'เพิ่มหอพัก', subtitle: 'เพิ่มหอพักอีกแห่งเข้าระบบ' },
    en: { title: 'Add Dorm', subtitle: 'Add another dorm property' },
  },
};

export default function PartnerLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading } = useCurrentUser();
  const { lang, setLang } = useLang();
  const isOwner = user?.role.toLowerCase() === 'owner';
  const [pendingCount, setPendingCount] = useState(0);
  const [navOpen, setNavOpen] = useState(false);

  // เปลี่ยนหน้าแล้วปิดลิ้นชักเมนูเสมอ ไม่งั้นบนมือถือเมนูจะค้างทับหน้าใหม่
  useEffect(() => {
    setNavOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!loading && !isOwner) router.replace('/login');
  }, [loading, isOwner, router]);

  useEffect(() => {
    if (!isOwner) return;
    apiClient
      .get<Booking[]>('/bookings')
      .then((list) => setPendingCount(list.filter((b) => b.status.toLowerCase() === 'pending').length))
      .catch(() => setPendingCount(0));
  }, [isOwner]);

  if (loading || !isOwner) return <PageLoader theme="seller" />;

  function handleLogout() {
    clearToken();
    router.push('/login');
  }

  const headerKey = Object.keys(PAGE_HEADER).find((k) => pathname === k || pathname?.startsWith(k + '/'));
  const header = PAGE_HEADER[headerKey ?? ''] ?? PAGE_HEADER['/partner/dashboard'];
  const t = header[lang];
  const initials = (user?.name ?? '').trim().slice(0, 2) || 'อ';

  return (
    <div className="flex h-screen overflow-hidden bg-surface-canvas">
      {/* ฉากหลังทึบตอนเปิดเมนูบนจอเล็ก — กดที่ไหนก็ปิดเมนูได้ */}
      {navOpen && (
        <div onClick={() => setNavOpen(false)} className="fixed inset-0 z-40 bg-black/40 lg:hidden" aria-hidden />
      )}

      {/* ===== SIDEBAR ===== */}
      {/* จอเล็ก = ลิ้นชักเลื่อนเข้าออก, จอ lg ขึ้นไป = คอลัมน์ติดอยู่กับที่เหมือนเดิม */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-64 shrink-0 flex-col bg-admin-sidebar px-4 py-5 transition-transform duration-200 lg:static lg:translate-x-0 ${
          navOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center gap-2.5 px-1 pb-5">
          <span className="flex h-[38px] w-[38px] items-center justify-center rounded-[11px] bg-seller shadow-[0_6px_16px_rgba(23,143,90,0.4)] font-sans text-xl font-extrabold text-white">
            H
          </span>
          <div>
            <div className="text-[17px] font-bold leading-none text-white">Hopak</div>
            <div className="mt-[3px] text-[11px] font-semibold tracking-[1.5px] text-admin-sidebarmuted">
              SELLER · เจ้าของหอ
            </div>
          </div>
        </div>

        <div className="px-2.5 pb-2 pt-1 text-[11px] font-semibold tracking-wide text-admin-sidebarlabel">
          {lang === 'th' ? 'เมนู' : 'MENU'}
        </div>

        <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto">
          {NAV[lang].map((item) => {
            const active = pathname === item.href || pathname?.startsWith(item.href + '/');
            const badge = item.badgeKey === 'pending' && pendingCount > 0 ? pendingCount : null;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 rounded-[11px] px-3 py-2.5 text-[14.5px] transition-colors ${
                  active ? 'bg-tenant font-semibold text-white' : 'text-admin-sidebarmuted hover:bg-white/5 hover:text-white'
                }`}
              >
                <AdminIcon name={item.icon} size={19} />
                <span className="flex-1">{item.label}</span>
                {badge != null && (
                  <span className="rounded-pill bg-accent px-2 py-0.5 text-[11px] font-bold text-white">{badge}</span>
                )}
              </Link>
            );
          })}
        </nav>

        <div className="px-2 pb-1 pt-2">
          <LangSwitch lang={lang} onChange={setLang} dark />
        </div>

        <Link
          href="/partner/profile"
          className="mt-2 flex items-center gap-2.5 rounded-[11px] border-t border-admin-sidebarborder px-1 py-3 transition-colors hover:bg-white/5"
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-pill bg-gradient-to-br from-tenant to-tenant-dark font-sans text-[13px] font-bold text-white">
            {user?.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={user.avatarUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              initials
            )}
          </span>
          <div className="min-w-0 flex-1">
            <div className="truncate text-[13.5px] font-semibold text-white">{user?.name}</div>
            <div className="text-[11.5px] text-admin-sidebarmuted">
              {lang === 'th' ? 'จัดการโปรไฟล์' : 'Manage profile'}
            </div>
          </div>
        </Link>
        <button
          onClick={handleLogout}
          className="flex items-center gap-2.5 rounded-[11px] px-3 py-2.5 text-left text-sm font-semibold text-danger-dark hover:bg-danger-dark/10"
        >
          <AdminIcon name="logout" size={18} />
          {lang === 'th' ? 'ออกจากระบบ' : 'Log out'}
        </button>
      </aside>

      {/* ===== MAIN ===== */}
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex h-[72px] shrink-0 items-center gap-3 border-b border-card-border bg-white px-4 sm:px-7">
          <button
            onClick={() => setNavOpen(true)}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[11px] border border-card-border text-ink-subtitle lg:hidden"
            aria-label="menu"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
            </svg>
          </button>
          <div className="min-w-0">
            <div className="truncate text-lg font-bold leading-none text-ink-strong sm:text-xl">{t.title}</div>
            <div className="mt-1 hidden text-[12.5px] text-ink-muted sm:block">{t.subtitle}</div>
          </div>
          <div className="ml-auto flex items-center gap-2.5">
            <Link
              href="/partner/rooms/new"
              className="flex h-10 items-center gap-2 rounded-[11px] bg-tenant px-3 text-sm font-semibold text-white hover:bg-tenant-dark sm:px-4"
            >
              <AdminIcon name="plus" size={17} />
              <span className="hidden sm:inline">{lang === 'th' ? 'เพิ่มห้องพัก' : 'Add Room'}</span>
            </Link>
            <Link
              href="/partner/notifications"
              className="relative hidden h-10 w-10 items-center justify-center rounded-[11px] border border-card-border bg-white text-ink-subtitle sm:flex"
            >
              <AdminIcon name="bell" size={19} />
            </Link>
            <Link
              href="/partner/profile"
              title={lang === 'th' ? 'จัดการโปรไฟล์' : 'Manage profile'}
              className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-pill bg-gradient-to-br from-tenant to-tenant-dark font-sans text-[13px] font-bold text-white ring-tenant ring-offset-2 transition-shadow hover:ring-2"
            >
              {user?.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={user.avatarUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                initials
              )}
            </Link>
          </div>
        </div>

        <main className="flex-1 overflow-auto px-4 py-5 sm:px-7 sm:py-6">{children}</main>
      </div>
    </div>
  );
}
