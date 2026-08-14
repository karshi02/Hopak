'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LangSwitch } from '@/components/LangSwitch';
import type { Lang } from '@/hooks/useLang';

/**
 * แถบล่าง + ลิ้นชักเมนู สำหรับหน้าแรกบนมือถือ
 *
 * หัวหน้าแรกบนจอเล็กใส่ปุ่มไม่พอ (ลงประกาศหอพัก/สมัคร/เข้าสู่ระบบ โดนตัดหรือถูกซ่อนไปเลย)
 * ย้ายทุกอย่างมาไว้ในลิ้นชักที่เลื่อนออกจากขวา แล้วเหลือแค่ปุ่มแฮมเบอร์เกอร์บนหัว
 */

type MenuUser = { name: string; avatarUrl?: string | null } | null;

const TEXT = {
  th: {
    login: 'เข้าสู่ระบบ',
    register: 'สมัครสมาชิก',
    profile: 'บัญชีของฉัน',
    logout: 'ออกจากระบบ',
    language: 'ภาษา:',
    menu: 'เมนู',
    close: 'ปิดเมนู',
    items: {
      search: 'ค้นหาหอพัก',
      zones: 'ทำเลยอดนิยม',
      saved: 'รายการโปรด',
      bookings: 'การจองของฉัน',
      partner: 'ลงประกาศหอพัก',
      ownerLearn: 'เรียนรู้เพิ่มเติม (เจ้าของหอ)',
      partnerLogin: 'เข้าสู่ระบบเจ้าของหอ',
    },
    nav: { home: 'หน้าแรก', search: 'ค้นหา', saved: 'รายการโปรด', account: 'บัญชี' },
  },
  en: {
    login: 'Log in',
    register: 'Sign up',
    profile: 'My account',
    logout: 'Log out',
    language: 'Language:',
    menu: 'Menu',
    close: 'Close menu',
    items: {
      search: 'Find dorms',
      zones: 'Popular areas',
      saved: 'Favorites',
      bookings: 'My bookings',
      partner: 'List your dorm',
      ownerLearn: 'Learn more (owners)',
      partnerLogin: 'Owner log in',
    },
    nav: { home: 'Home', search: 'Search', saved: 'Favorites', account: 'Account' },
  },
} satisfies Record<Lang, Record<string, unknown>>;

function MenuIcon({ d, color }: { d: string; color: string }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path d={d} stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function NavIcon({ d, active }: { d: string; active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <path d={d} stroke={active ? '#2F6FE0' : '#9AA0AB'} strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/**
 * ปุ่มแฮมเบอร์เกอร์ — โชว์เฉพาะจอเล็ก
 * onDark = หัวหน้าแรก (พื้นเข้ม) / onLight = Navbar หน้าอื่น (พื้นขาว)
 */
export function MobileMenuButton({
  onClick,
  label,
  variant = 'onDark',
}: {
  onClick: () => void;
  label: string;
  variant?: 'onDark' | 'onLight';
}) {
  const bar =
    variant === 'onDark'
      ? 'h-[2px] w-[17px] rounded-sm bg-white'
      : 'h-[2px] w-[17px] rounded-sm bg-ink-strong dark:bg-white';
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={`flex h-9 w-9 shrink-0 flex-col items-center justify-center gap-[4px] rounded-[10px] sm:hidden ${
        variant === 'onDark' ? 'bg-white/15' : 'bg-black/[0.05] dark:bg-white/10'
      }`}
    >
      <span className={bar} />
      <span className={bar} />
      <span className={bar} />
    </button>
  );
}

export function MobileHomeChrome({
  open,
  onClose,
  lang,
  setLang,
  user,
  onLogout,
  bottomNav = true,
}: {
  open: boolean;
  onClose: () => void;
  lang: Lang;
  setLang: (l: Lang) => void;
  user: MenuUser;
  onLogout: () => void;
  /** หน้าอื่นที่ใช้ Navbar เอาแค่ลิ้นชัก ไม่เอาแถบล่าง (ชนกับแถบราคาในหน้าหอพัก) */
  bottomNav?: boolean;
}) {
  const t = TEXT[lang];
  const pathname = usePathname();
  const [navHidden, setNavHidden] = useState(false);

  // แถบล่างซ่อนตอนเลื่อนลง โผล่ตอนเลื่อนขึ้น — กันบังเนื้อหาระหว่างไถอ่าน
  // เกณฑ์เดียวกับดีไซน์: เปลี่ยนทิศต้องเกิน 6px และซ่อนเฉพาะเมื่อเลื่อนพ้น 40px แรก
  useEffect(() => {
    let lastY = window.scrollY;
    const onScroll = () => {
      const y = window.scrollY;
      if (Math.abs(y - lastY) <= 6) return;
      setNavHidden(y > lastY && y > 40);
      lastY = y;
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // เปิดลิ้นชักแล้วล็อกไม่ให้หน้าหลังเลื่อนตาม
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  const menuItems = [
    { href: '/search', label: t.items.search, bg: '#EAF1FF', color: '#2F6FE0', d: 'M11 18a7 7 0 100-14 7 7 0 000 14zM21 21l-4-4' },
    { href: '/search', label: t.items.zones, bg: '#E7F7EF', color: '#178F5A', d: 'M21 10c0 6-9 12-9 12s-9-6-9-12a9 9 0 1118 0zM12 10a2 2 0 100-4 2 2 0 000 4z' },
    { href: '/saved', label: t.items.saved, bg: '#FFF1EC', color: '#E0692F', d: 'M12 21s-8-4.5-8-11a4.5 4.5 0 018-2.8A4.5 4.5 0 0120 10c0 6.5-8 11-8 11z' },
    { href: '/bookings', label: t.items.bookings, bg: '#F3ECFF', color: '#7C4DE0', d: 'M8 2v3M16 2v3M4 8h16M5 5h14v15H5z' },
    { href: '/partner-register', label: t.items.partner, bg: '#FFF3E0', color: '#C77B14', d: 'M3 21h18M5 21V7l7-4 7 4v14M9 21v-5h6v5' },
    { href: '/owners', label: t.items.ownerLearn, bg: '#EAF1FF', color: '#1E4FB0', d: 'M12 3l9 5-9 5-9-5 9-5zM12 13v8M8 17h8' },
    { href: '/partner-login', label: t.items.partnerLogin, bg: '#EEF1F6', color: '#5B616C', d: 'M15 3h4a2 2 0 012 2v14a2 2 0 01-2 2h-4M10 17l5-5-5-5M15 12H3' },
  ];

  const navItems = [
    { href: '/', label: t.nav.home, d: 'M3 11l9-7 9 7M5 10v10h14V10' },
    { href: '/search', label: t.nav.search, d: 'M11 18a7 7 0 100-14 7 7 0 000 14zM21 21l-4-4' },
    { href: '/saved', label: t.nav.saved, d: 'M12 21s-8-4.5-8-11a4.5 4.5 0 018-2.8A4.5 4.5 0 0120 10c0 6.5-8 11-8 11z' },
    { href: user ? '/profile' : '/login', label: t.nav.account, d: 'M4 21v-1a6 6 0 016-6h4a6 6 0 016 6v1M12 11a4 4 0 100-8 4 4 0 000 8z' },
  ];

  return (
    <>
      {/* ===== แถบล่าง (มือถือ) ===== */}
      {bottomNav && (
      <div
        className="fixed inset-x-0 bottom-0 z-40 flex border-t border-[#EAEDF2] bg-white px-2.5 pb-[max(env(safe-area-inset-bottom),14px)] pt-2.5 shadow-[0_-6px_20px_rgba(16,24,40,0.08)] transition-transform duration-300 ease-[cubic-bezier(.4,0,.2,1)] sm:hidden"
        style={{ transform: navHidden ? 'translateY(110%)' : 'translateY(0)' }}
      >
        {navItems.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.label}
              href={item.href}
              className="flex flex-1 flex-col items-center gap-1"
              style={{ color: active ? '#2F6FE0' : '#9AA0AB' }}
            >
              <NavIcon d={item.d} active={active} />
              <span className={`text-[10.5px] ${active ? 'font-bold' : 'font-medium'}`}>{item.label}</span>
            </Link>
          );
        })}
      </div>
      )}

      {/* ===== ลิ้นชักเมนู (เลื่อนออกจากขวา) ===== */}
      {open && (
        <>
          <div onClick={onClose} className="fixed inset-0 z-[80] bg-[rgba(11,13,18,0.5)] sm:hidden" />
          <div className="fixed bottom-0 right-0 top-0 z-[81] flex w-[286px] max-w-[86vw] flex-col bg-white shadow-[-8px_0_40px_rgba(8,12,24,0.35)] sm:hidden">
            <div className="bg-[linear-gradient(150deg,#1E4FB0,#122C63)] px-5 pb-5 pt-[max(env(safe-area-inset-top),18px)]">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <span className="flex h-[30px] w-[30px] items-center justify-center rounded-lg bg-tenant font-sans text-lg font-extrabold text-white">
                    H
                  </span>
                  <span className="text-[16px] font-bold text-white">
                    Hoprak<span className="text-[#6BA0F5]">.com</span>
                  </span>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  aria-label={t.close}
                  className="flex h-[30px] w-[30px] items-center justify-center rounded-full bg-white/[0.16]"
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                    <path d="M6 6l12 12M18 6L6 18" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                </button>
              </div>

              {user ? (
                <div className="mt-4 flex gap-2.5">
                  <Link
                    href="/profile"
                    onClick={onClose}
                    className="flex h-[42px] flex-1 items-center justify-center gap-2 rounded-[11px] bg-white text-[13.5px] font-bold text-[#1E4FB0]"
                  >
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#EAF1FF] text-[11px] font-bold text-[#1E4FB0]">
                      {user.avatarUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={user.avatarUrl} alt="" className="h-full w-full object-cover" />
                      ) : (
                        user.name.charAt(0)
                      )}
                    </span>
                    <span className="truncate">{t.profile}</span>
                  </Link>
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onLogout();
                    }}
                    className="h-[42px] shrink-0 rounded-[11px] border border-white/40 px-3.5 text-[13.5px] font-semibold text-white"
                  >
                    {t.logout}
                  </button>
                </div>
              ) : (
                <div className="mt-4 flex gap-2.5">
                  <Link
                    href="/login"
                    onClick={onClose}
                    className="flex h-[42px] flex-1 items-center justify-center gap-1.5 rounded-[11px] bg-white text-[13.5px] font-bold text-[#1E4FB0]"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                      <path
                        d="M15 3h4a2 2 0 012 2v14a2 2 0 01-2 2h-4M10 17l5-5-5-5M15 12H3"
                        stroke="#1E4FB0"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                    {t.login}
                  </Link>
                  <Link
                    href="/register"
                    onClick={onClose}
                    className="flex h-[42px] flex-1 items-center justify-center rounded-[11px] border border-white/40 text-[13.5px] font-semibold text-white"
                  >
                    {t.register}
                  </Link>
                </div>
              )}
            </div>

            <div className="flex-1 overflow-y-auto p-2">
              {menuItems.map((item) => (
                <Link
                  key={item.label}
                  href={item.href}
                  onClick={onClose}
                  className="flex h-12 items-center gap-3.5 rounded-[11px] px-3.5 active:bg-surface-canvas"
                >
                  <span
                    className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-[9px]"
                    style={{ background: item.bg }}
                  >
                    <MenuIcon d={item.d} color={item.color} />
                  </span>
                  <span className="text-[14.5px] font-semibold text-[#2A2F3A]">{item.label}</span>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="ml-auto">
                    <path d="M9 6l6 6-6 6" stroke="#C9D0DC" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </Link>
              ))}

              <div className="mx-3.5 my-2 h-px bg-[#EEF1F6]" />
              <div className="flex items-center gap-2.5 px-3.5 py-3">
                <span className="text-[13px] font-semibold text-ink-faint">{t.language}</span>
                <LangSwitch lang={lang} onChange={setLang} />
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}
