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

/** ระยะเวลาสไลด์ลิ้นชัก — ต้องตรงกับ duration ใน className ด้านล่าง ไม่งั้นถอดออกก่อนสไลด์จบ */
const DRAWER_MS = 620;
/** โค้งแบบ iOS: ออกตัวเร็วแล้วค่อยๆ หยุด (ease-out) ให้รู้สึกลื่นกว่า ease ปกติ */
const DRAWER_EASE = 'cubic-bezier(.32,.72,0,1)';

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

/** ไอคอนเมนู — 20px เส้นหนา 2 อ่านออกบนจอมือถือ ของเดิม 18px เส้น 1.8 ดูจางจนแยกไม่ออกว่าเป็นรูปอะไร */
function MenuIcon({ d, color }: { d: string; color: string }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <path d={d} stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
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
  open = false,
}: {
  onClick: () => void;
  label: string;
  variant?: 'onDark' | 'onLight';
  /** เปิดอยู่ = ขีดสามเส้นบิดเป็นกากบาท ให้เห็นว่าปุ่มเดียวกันใช้ปิดได้ */
  open?: boolean;
}) {
  // easing ใส่เป็น inline style ไม่ใช่คลาส — Tailwind อ่านคลาสจากซอร์ส สร้างจากตัวแปรตอนรันไม่ทัน
  const bar = `absolute h-[2px] w-[17px] rounded-sm transition-transform duration-[560ms] motion-reduce:transition-none ${
    variant === 'onDark' ? 'bg-white' : 'bg-ink-strong dark:bg-white'
  }`;
  const ease = { transitionTimingFunction: DRAWER_EASE };
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      aria-expanded={open}
      className={`relative flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] transition-transform active:scale-95 sm:hidden ${
        variant === 'onDark' ? 'bg-white/15' : 'bg-black/[0.05] dark:bg-white/10'
      }`}
    >
      <span className={bar} style={{ ...ease, transform: open ? 'rotate(45deg)' : 'translateY(-6px)' }} />
      <span
        className={`${bar} transition-opacity`}
        style={{ ...ease, opacity: open ? 0 : 1, transitionDuration: '300ms' }}
      />
      <span className={bar} style={{ ...ease, transform: open ? 'rotate(-45deg)' : 'translateY(6px)' }} />
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

  // ลิ้นชักต้องอยู่ใน DOM ต่ออีกแป๊บตอนปิด ไม่งั้นถอดทิ้งทันทีจนไม่เห็นจังหวะสไลด์ออก
  // render = ยังวาดอยู่ไหม, shown = อยู่ในตำแหน่งเปิดแล้วหรือยัง (ติ๊กถัดไปค่อยเปลี่ยนคลาสเพื่อให้ transition ทำงาน)
  const [render, setRender] = useState(open);
  const [shown, setShown] = useState(false);
  useEffect(() => {
    if (open) {
      setRender(true);
      const id = requestAnimationFrame(() => setShown(true));
      return () => cancelAnimationFrame(id);
    }
    setShown(false);
    const id = setTimeout(() => setRender(false), DRAWER_MS);
    return () => clearTimeout(id);
  }, [open]);

  // เปิดลิ้นชักแล้วล็อกไม่ให้หน้าหลังเลื่อนตาม
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  // สีเส้นเข้มกว่าเดิมทุกอัน (ตัวจางๆ อ่านไม่ออกบนพื้น tint) และรูปที่เดาไม่ออกวาดใหม่:
  // "เรียนรู้เพิ่มเติม" เดิมเป็นหมวกรับปริญญาที่ทับกันจนดูเป็นสามเหลี่ยมประหลาด เปลี่ยนเป็นหนังสือ
  // "ลงประกาศหอพัก" เดิมเป็นบ้านเปล่า ซ้ำกับไอคอนบ้านที่อื่นในหน้า เปลี่ยนเป็นโทรโข่ง = ประกาศ
  const menuItems = [
    { href: '/search', label: t.items.search, bg: '#EAF1FF', color: '#1E4FB0', d: 'M11 18a7 7 0 100-14 7 7 0 000 14zM21 21l-4.2-4.2' },
    { href: '/search', label: t.items.zones, bg: '#E7F7EF', color: '#0E7A4A', d: 'M20 10c0 5.5-8 11-8 11s-8-5.5-8-11a8 8 0 1116 0zM12 12.5a2.5 2.5 0 100-5 2.5 2.5 0 000 5z' },
    { href: '/saved', label: t.items.saved, bg: '#FFF1EC', color: '#C9541D', d: 'M12 20.5S4 15.8 4 9.9a4.6 4.6 0 018-3A4.6 4.6 0 0120 9.9c0 5.9-8 10.6-8 10.6z' },
    { href: '/bookings', label: t.items.bookings, bg: '#F3ECFF', color: '#6438C8', d: 'M8 3v3.5M16 3v3.5M4 10h16M5.5 5.5h13a1 1 0 011 1V19a1 1 0 01-1 1h-13a1 1 0 01-1-1V6.5a1 1 0 011-1z' },
    { href: '/partner-register', label: t.items.partner, bg: '#FFF3E0', color: '#A66208', d: 'M4 10.5v3a1.5 1.5 0 001.5 1.5H7l6.5 4V5L7 9H5.5A1.5 1.5 0 004 10.5zM7 15v4.5M17.5 9.5a3.5 3.5 0 010 5' },
    { href: '/owners', label: t.items.ownerLearn, bg: '#EAF1FF', color: '#1E4FB0', d: 'M4 5.5A2.5 2.5 0 016.5 3H19v14.5H6.5A2.5 2.5 0 004 20V5.5zM4 20a2.5 2.5 0 002.5 2.5H19M8 7.5h7M8 11h5' },
    { href: '/partner-login', label: t.items.partnerLogin, bg: '#EEF1F6', color: '#454B57', d: 'M14 3.5h4.5a1.5 1.5 0 011.5 1.5v14a1.5 1.5 0 01-1.5 1.5H14M10 8l4 4-4 4M14 12H3.5' },
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
      {render && (
        <>
          <div
            onClick={onClose}
            style={{ transitionDuration: `${DRAWER_MS}ms` }}
            className={`fixed inset-0 z-[80] bg-[rgba(11,13,18,0.5)] transition-opacity ease-out motion-reduce:transition-none sm:hidden ${
              shown ? 'opacity-100' : 'opacity-0'
            }`}
          />
          <div
            style={{ transitionDuration: `${DRAWER_MS}ms`, transitionTimingFunction: DRAWER_EASE }}
            className={`fixed bottom-0 right-0 top-0 z-[81] flex w-[286px] max-w-[86vw] flex-col bg-white shadow-[-8px_0_40px_rgba(8,12,24,0.35)] transition-transform will-change-transform motion-reduce:transition-none sm:hidden ${
              shown ? 'translate-x-0' : 'translate-x-full'
            }`}
          >
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
              {menuItems.map((item, i) => (
                <Link
                  key={item.label}
                  href={item.href}
                  onClick={onClose}
                  /* ไล่ทีละอันเท่ากันทั้งขาเข้าและขาออก — ขาออกไล่ย้อนจากอันล่างขึ้นบน */
                  style={{
                    transitionDuration: '440ms',
                    transitionDelay: `${90 + (shown ? i : menuItems.length - 1 - i) * 40}ms`,
                  }}
                  className={`flex h-12 items-center gap-3.5 rounded-[11px] px-3.5 transition-[opacity,transform] ease-out motion-reduce:transition-none active:bg-surface-canvas ${
                    shown ? 'translate-x-0 opacity-100' : 'translate-x-3 opacity-0'
                  }`}
                >
                  <span
                    className="flex h-[36px] w-[36px] shrink-0 items-center justify-center rounded-[10px]"
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
