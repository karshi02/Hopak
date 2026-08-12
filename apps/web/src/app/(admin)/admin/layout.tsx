'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useLang } from '@/hooks/useLang';
import { apiClient } from '@/lib/api-client';
import { getSocket } from '@/lib/ws';
import { clearToken } from '@/lib/auth';
import { LangSwitch } from '@/components/LangSwitch';
import { PageLoader } from '@/components/PageLoader';
import { AdminIcon } from '@/components/admin/AdminIcon';
import { RealtimeToasts } from '@/components/RealtimeToasts';

interface SearchResults {
  dorms: { id: string; name: string; owner: { name: string } }[];
  users: { id: string; name: string; role: string }[];
  bookings: { id: string; contactName: string; amount: number }[];
}

interface PendingItem {
  id: string;
  name: string;
}

type IconKey = 'dash' | 'book' | 'home' | 'user' | 'money' | 'ad' | 'shield' | 'gear';
interface NavItem {
  href: string;
  icon: IconKey;
  label: string;
  badgeKey?: 'approvals';
  /** เมนูย่อย — กดสามเหลี่ยมแล้วกางลงมา (เช่น แดชบอร์ด → แดชบอร์ดรายปี) */
  children?: { href: string; label: string }[];
}

// แท็บล่างบนมือถือ 5 แท็บ (สเปค admin console mobile) — เมนูเต็มอยู่ใน drawer
const BOTTOM_NAV: Record<'th' | 'en', { href: string; icon: IconKey; label: string; badge?: boolean }[]> = {
  th: [
    { href: '/admin/bookings', icon: 'book', label: 'จอง' },
    { href: '/admin/approvals', icon: 'home', label: 'หอพัก', badge: true },
    { href: '/admin/owner-requests', icon: 'shield', label: 'คำขอ' },
    { href: '/admin/users', icon: 'user', label: 'ผู้ใช้' },
    { href: '/admin/sessions', icon: 'gear', label: 'Session' },
  ],
  en: [
    { href: '/admin/bookings', icon: 'book', label: 'Bookings' },
    { href: '/admin/approvals', icon: 'home', label: 'Dorms', badge: true },
    { href: '/admin/owner-requests', icon: 'shield', label: 'Requests' },
    { href: '/admin/users', icon: 'user', label: 'Users' },
    { href: '/admin/sessions', icon: 'gear', label: 'Session' },
  ],
};

const NAV: Record<'th' | 'en', NavItem[]> = {
  th: [
    {
      href: '/admin/dashboard',
      icon: 'dash',
      label: 'แดชบอร์ด',
      children: [
        { href: '/admin/yearly', label: 'แดชบอร์ดรายปี' },
        { href: '/admin/revenue', label: 'รายได้ รายเดือน/รายวัน' },
      ],
    },
    { href: '/admin/bookings', icon: 'book', label: 'การจอง & สถานะ' },
    { href: '/admin/approvals', icon: 'home', label: 'หอพัก (อนุมัติ)', badgeKey: 'approvals' },
    { href: '/admin/owner-requests', icon: 'shield', label: 'คำขอเป็นเจ้าของหอ' },
    { href: '/admin/users', icon: 'user', label: 'ผู้เช่า & ผู้ใช้' },
    { href: '/admin/sessions', icon: 'shield', label: 'ประวัติการเข้าสู่ระบบ' },
    { href: '/admin/finance', icon: 'money', label: 'การเงิน & รวมบิล' },
    { href: '/admin/campaigns', icon: 'ad', label: 'โฆษณา & แคมเปญ' },
    { href: '/admin/admins', icon: 'shield', label: 'ผู้ดูแล (Admins)' },
    { href: '/admin/website/edit', icon: 'gear', label: 'แก้ไขหน้าแรก (inline)' },
    { href: '/admin/website', icon: 'gear', label: 'ธีม & โปสเตอร์' },
  ],
  en: [
    {
      href: '/admin/dashboard',
      icon: 'dash',
      label: 'Dashboard',
      children: [
        { href: '/admin/yearly', label: 'Yearly dashboard' },
        { href: '/admin/revenue', label: 'Monthly / daily revenue' },
      ],
    },
    { href: '/admin/bookings', icon: 'book', label: 'Bookings & Status' },
    { href: '/admin/approvals', icon: 'home', label: 'Dorms (Approvals)', badgeKey: 'approvals' },
    { href: '/admin/owner-requests', icon: 'shield', label: 'Owner Requests' },
    { href: '/admin/users', icon: 'user', label: 'Users' },
    { href: '/admin/sessions', icon: 'shield', label: 'Login History' },
    { href: '/admin/finance', icon: 'money', label: 'Finance & Payouts' },
    { href: '/admin/campaigns', icon: 'ad', label: 'Ads & Campaigns' },
    { href: '/admin/admins', icon: 'shield', label: 'Admins' },
    { href: '/admin/website/edit', icon: 'gear', label: 'Edit Homepage (inline)' },
    { href: '/admin/website', icon: 'gear', label: 'Website Settings' },
  ],
};

const PAGE_HEADER: Record<string, Record<'th' | 'en', { title: string; subtitle: string }>> = {
  '/admin/dashboard': {
    th: { title: 'แดชบอร์ด', subtitle: 'ภาพรวมระบบทั้งหมด' },
    en: { title: 'Dashboard', subtitle: 'System overview' },
  },
  '/admin/bookings': {
    th: { title: 'การจอง & สถานะ', subtitle: 'ติดตามสถานะการจองของผู้เช่าทุกคน' },
    en: { title: 'Bookings & Status', subtitle: 'Track every tenant booking status' },
  },
  '/admin/approvals': {
    th: { title: 'หอพัก', subtitle: 'อนุมัติหอพักที่สมัครเข้ามาใหม่' },
    en: { title: 'Dorms', subtitle: 'Approve newly submitted dorms' },
  },
  '/admin/owner-requests': {
    th: { title: 'คำขอเป็นเจ้าของหอ', subtitle: 'อนุมัติผู้เช่าที่ขอเปลี่ยนเป็นเจ้าของหอ' },
    en: { title: 'Owner Requests', subtitle: 'Approve tenants requesting owner status' },
  },
  '/admin/users': {
    th: { title: 'ผู้เช่า & ผู้ใช้', subtitle: 'เช็คสถานะผู้ใช้ · ส่งใบเตือน · จัดการบัญชี' },
    en: { title: 'Users', subtitle: 'Check status · send warnings · manage accounts' },
  },
  '/admin/sessions': {
    th: { title: 'ประวัติการเข้าสู่ระบบ', subtitle: 'ทุกการเข้าใช้งาน · IP · บราวเซอร์ · สถานะ session' },
    en: { title: 'Login History', subtitle: 'Every login · IP · browser · session status' },
  },
  '/admin/finance': {
    th: { title: 'การเงิน & รวมบิล', subtitle: 'ค่าคอมมิชชันและยอดโอนเจ้าของหอ' },
    en: { title: 'Finance & Payouts', subtitle: 'Commission and owner payout totals' },
  },
  '/admin/yearly': {
    th: { title: 'สรุปรายปี', subtitle: 'ยอดรวม ค่าคอม เงินโอนออก ยอดคงเหลือ และสมาชิกทั้งปี' },
    en: { title: 'Yearly Summary', subtitle: 'Gross, commission, payouts, balance and members for the year' },
  },
  '/admin/revenue': {
    th: { title: 'รายได้แพลตฟอร์ม', subtitle: 'แยกรายได้ที่มาจากหอรายเดือนและหอรายวัน' },
    en: { title: 'Platform revenue', subtitle: 'Revenue split between monthly and daily dorms' },
  },
  '/admin/campaigns': {
    th: { title: 'โฆษณา & แคมเปญ', subtitle: 'ดัน/ลดฟีดและแคมเปญร่วมกับหอพัก' },
    en: { title: 'Ads & Campaigns', subtitle: 'Feed boosts and joint dorm campaigns' },
  },
  '/admin/admins': {
    th: { title: 'ผู้ดูแล', subtitle: 'เพิ่มผู้ดูแลและกำหนดบทบาท/สิทธิ์' },
    en: { title: 'Admins', subtitle: 'Add admins and set roles/permissions' },
  },
  '/admin/website': {
    th: { title: 'ตั้งค่าเว็บไซต์', subtitle: 'ธีมและโปสเตอร์หน้าแรก' },
    en: { title: 'Website Settings', subtitle: 'Homepage theme and poster' },
  },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading } = useCurrentUser();
  const { lang, setLang } = useLang();
  const isAdmin = user?.role.toLowerCase() === 'admin';
  const [pendingList, setPendingList] = useState<PendingItem[]>([]);
  const pendingApprovals = pendingList.length;
  const [bellOpen, setBellOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResults | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [navOpen, setNavOpen] = useState(false);
  // กลุ่มเมนูที่กางอยู่ (เก็บเป็น href ของหัวข้อ)
  const [openGroups, setOpenGroups] = useState<string[]>([]);
  const bellRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!loading && !isAdmin) router.replace('/login');
  }, [loading, isAdmin, router]);

  function reloadPending() {
    apiClient
      .get<PendingItem[]>('/admin/approvals')
      .then(setPendingList)
      .catch(() => setPendingList([]));
  }

  useEffect(() => {
    if (!isAdmin) return;
    reloadPending();
    const socket = getSocket();
    socket.on('dorm:new', reloadPending);
    socket.on('room:new', reloadPending);
    return () => {
      socket.off('dorm:new', reloadPending);
      socket.off('room:new', reloadPending);
    };
  }, [isAdmin]);

  // อยู่หน้าลูกไหน ให้กลุ่มนั้นกางไว้เสมอ (เข้าหน้าตรงๆ ก็เห็นว่าอยู่ตรงไหน)
  useEffect(() => {
    for (const item of NAV.th.concat(NAV.en)) {
      if (item.children?.some((c) => pathname === c.href) && !openGroups.includes(item.href)) {
        setOpenGroups((prev) => [...prev, item.href]);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  // เปลี่ยนหน้าแล้วปิดลิ้นชักเมนูเสมอ ไม่งั้นบนมือถือเมนูจะค้างทับหน้าใหม่
  useEffect(() => {
    setNavOpen(false);
  }, [pathname]);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (bellRef.current && !bellRef.current.contains(e.target as Node)) setBellOpen(false);
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) setSearchOpen(false);
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  useEffect(() => {
    const q = searchQuery.trim();
    if (q.length < 2) {
      setSearchResults(null);
      return;
    }
    const timer = setTimeout(() => {
      apiClient
        .get<SearchResults>(`/admin/search?q=${encodeURIComponent(q)}`)
        .then((res) => {
          setSearchResults(res);
          setSearchOpen(true);
        })
        .catch(() => setSearchResults(null));
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  function goTo(href: string) {
    setSearchOpen(false);
    setSearchQuery('');
    router.push(href);
  }

  if (loading || !isAdmin) return <PageLoader />;

  function handleLogout() {
    clearToken();
    router.push('/login');
  }

  const headerKey = Object.keys(PAGE_HEADER).find((k) => pathname === k || pathname?.startsWith(k + '/'));
  const header = PAGE_HEADER[headerKey ?? ''] ?? PAGE_HEADER['/admin/dashboard'];
  const t = header[lang];
  const initials = (user?.name ?? '').trim().slice(0, 2) || 'AD';

  return (
    <div className="flex h-screen overflow-hidden bg-surface-canvas">
      {/* ฉากหลังทึบตอนเปิดเมนูบนจอเล็ก — กดที่ไหนก็ปิดเมนูได้ */}
      {navOpen && (
        <div
          onClick={() => setNavOpen(false)}
          className="fixed inset-0 z-40 bg-black/40 lg:hidden"
          aria-hidden
        />
      )}

      {/* ===== SIDEBAR ===== */}
      {/* จอเล็ก = ลิ้นชักเลื่อนเข้าออก, จอ lg ขึ้นไป = คอลัมน์ติดอยู่กับที่เหมือนเดิม */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-64 shrink-0 flex-col bg-admin-sidebar px-4 py-5 transition-transform duration-200 lg:static lg:translate-x-0 ${
          navOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center gap-2.5 px-1 pb-5">
          <span className="flex h-[38px] w-[38px] items-center justify-center rounded-[11px] bg-gradient-to-br from-tenant to-tenant-dark shadow-[0_6px_16px_rgba(47,111,224,0.4)]">
            <AdminIcon name="home" size={19} className="text-white" />
          </span>
          <div>
            <div className="text-[17px] font-bold leading-none text-white">Hoprak</div>
            <div className="mt-[3px] text-[11px] font-semibold tracking-[1.5px] text-admin-sidebarmuted">
              ADMIN CONSOLE
            </div>
          </div>
        </div>

        <div className="px-2.5 pb-2 pt-1 text-[11px] font-semibold tracking-wide text-admin-sidebarlabel">
          {lang === 'th' ? 'เมนูหลัก' : 'MAIN MENU'}
        </div>

        <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto">
          {NAV[lang].map((item) => {
            const badge = item.badgeKey === 'approvals' && pendingApprovals > 0 ? pendingApprovals : null;

            // หัวข้อที่มีเมนูย่อย — กดแล้วกาง/พับ (สามเหลี่ยมหมุน) ไม่พาไปหน้าอื่นทันที
            if (item.children) {
              const expanded = openGroups.includes(item.href);
              const childActive = item.children.some((c) => pathname === c.href);
              const selfActive = pathname === item.href;
              return (
                <div key={item.href}>
                  {/* กดชื่อ = ไปหน้าแดชบอร์ด · กดสามเหลี่ยม = กาง/พับเมนูย่อย */}
                  <div
                    className={`flex items-center rounded-[11px] pr-1 transition-colors ${
                      selfActive || childActive
                        ? 'bg-admin font-semibold text-white'
                        : 'text-admin-sidebarmuted hover:bg-white/5 hover:text-white'
                    }`}
                  >
                    <Link href={item.href} className="flex flex-1 items-center gap-3 px-3 py-2.5 text-[14.5px]">
                      <AdminIcon name={item.icon} size={19} />
                      <span className="flex-1">{item.label}</span>
                    </Link>
                    <button
                      type="button"
                      onClick={() =>
                        setOpenGroups((prev) =>
                          prev.includes(item.href) ? prev.filter((h) => h !== item.href) : [...prev, item.href],
                        )
                      }
                      aria-expanded={expanded}
                      aria-label={item.label}
                      className="flex h-8 w-7 shrink-0 items-center justify-center rounded-[8px] hover:bg-white/10"
                    >
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        className={`transition-transform ${expanded ? 'rotate-180' : ''}`}
                      >
                        <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </button>
                  </div>

                  {expanded && (
                    <div className="mt-0.5 flex flex-col gap-0.5 border-l border-admin-sidebarborder pl-3 ml-5">
                      {item.children.map((c) => {
                        const sub = pathname === c.href;
                        return (
                          <Link
                            key={c.href}
                            href={c.href}
                            className={`rounded-[9px] px-3 py-2 text-[13.5px] transition-colors ${
                              sub ? 'bg-white/10 font-semibold text-white' : 'text-admin-sidebarmuted hover:bg-white/5 hover:text-white'
                            }`}
                          >
                            {c.label}
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            }

            const active = pathname === item.href || pathname?.startsWith(item.href + '/');
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 rounded-[11px] px-3 py-2.5 text-[14.5px] transition-colors ${
                  active ? 'bg-admin font-semibold text-white' : 'text-admin-sidebarmuted hover:bg-white/5 hover:text-white'
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

        <div className="mt-2 flex items-center gap-2.5 border-t border-admin-sidebarborder px-1 py-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-pill bg-gradient-to-br from-admin to-[#8B7BEA] font-sans text-[13px] font-bold text-white">
            {initials}
          </span>
          <div className="min-w-0 flex-1">
            <div className="truncate text-[13.5px] font-semibold text-white">{user?.name}</div>
            <div className="text-[11.5px] text-admin-sidebarmuted">{lang === 'th' ? 'ผู้ดูแลระบบ' : 'Admin'}</div>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-2.5 rounded-[11px] px-3 py-2.5 text-left text-sm font-semibold text-danger-dark hover:bg-danger-dark/10"
        >
          <AdminIcon name="logout" size={18} />
          {lang === 'th' ? 'ออกจากระบบ (Logout)' : 'Log out'}
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
            <div ref={searchRef} className="relative hidden md:block">
              <div className="flex h-10 items-center gap-2 rounded-[11px] bg-surface-canvas px-3.5 text-[13.5px] text-ink-muted focus-within:ring-1 focus-within:ring-tenant">
                <AdminIcon name="search" size={17} />
                <input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={() => searchResults && setSearchOpen(true)}
                  placeholder={lang === 'th' ? 'ค้นหาหอพัก / ผู้ใช้ / การจอง…' : 'Search dorms / users / bookings…'}
                  className="w-36 bg-transparent text-ink placeholder:text-ink-faint focus:outline-none lg:w-56"
                />
              </div>
              {searchOpen && searchResults && (
                <div className="absolute right-0 top-12 z-50 max-h-96 w-80 overflow-y-auto rounded-card-lg border border-card-border bg-white p-2 shadow-card">
                  {searchResults.dorms.length === 0 && searchResults.users.length === 0 && searchResults.bookings.length === 0 && (
                    <p className="p-3 text-sm text-ink-faint">{lang === 'th' ? 'ไม่พบผลลัพธ์' : 'No results'}</p>
                  )}
                  {searchResults.dorms.length > 0 && (
                    <div className="mb-1">
                      <p className="px-2.5 py-1 text-[11px] font-semibold text-ink-faint">{lang === 'th' ? 'หอพัก' : 'Dorms'}</p>
                      {searchResults.dorms.map((d) => (
                        <button
                          key={d.id}
                          onClick={() => goTo('/admin/approvals')}
                          className="block w-full rounded-lg px-2.5 py-2 text-left text-sm hover:bg-surface-canvas"
                        >
                          <span className="font-medium text-ink-strong">{d.name}</span>
                          <span className="ml-1.5 text-ink-faint">· {d.owner.name}</span>
                        </button>
                      ))}
                    </div>
                  )}
                  {searchResults.users.length > 0 && (
                    <div className="mb-1">
                      <p className="px-2.5 py-1 text-[11px] font-semibold text-ink-faint">{lang === 'th' ? 'ผู้ใช้' : 'Users'}</p>
                      {searchResults.users.map((u) => (
                        <button
                          key={u.id}
                          onClick={() => goTo('/admin/users')}
                          className="block w-full rounded-lg px-2.5 py-2 text-left text-sm hover:bg-surface-canvas"
                        >
                          <span className="font-medium text-ink-strong">{u.name}</span>
                          <span className="ml-1.5 text-ink-faint">· {u.role}</span>
                        </button>
                      ))}
                    </div>
                  )}
                  {searchResults.bookings.length > 0 && (
                    <div>
                      <p className="px-2.5 py-1 text-[11px] font-semibold text-ink-faint">{lang === 'th' ? 'การจอง' : 'Bookings'}</p>
                      {searchResults.bookings.map((b) => (
                        <button
                          key={b.id}
                          onClick={() => goTo('/admin/bookings')}
                          className="block w-full rounded-lg px-2.5 py-2 text-left text-sm hover:bg-surface-canvas"
                        >
                          <span className="font-medium text-ink-strong">{b.contactName}</span>
                          <span className="ml-1.5 text-ink-faint">· ฿{b.amount.toLocaleString()}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
            <div ref={bellRef} className="relative">
              <button
                onClick={() => setBellOpen((v) => !v)}
                className="relative flex h-10 w-10 items-center justify-center rounded-[11px] border border-card-border bg-white text-ink-subtitle"
              >
                <AdminIcon name="bell" size={19} />
                {pendingApprovals > 0 && (
                  <span className="absolute right-[9px] top-2 h-[7px] w-[7px] rounded-pill bg-accent ring-2 ring-white" />
                )}
              </button>
              {bellOpen && (
                <div className="absolute right-0 top-12 z-50 w-72 overflow-hidden rounded-card-lg border border-card-border bg-white shadow-card">
                  <div className="border-b border-hairline px-3.5 py-2.5 text-sm font-semibold text-ink-strong">
                    {lang === 'th' ? 'รออนุมัติหอพัก' : 'Pending dorm approvals'}
                  </div>
                  <div className="max-h-72 overflow-y-auto">
                    {pendingList.slice(0, 8).map((p) => (
                      <Link
                        key={p.id}
                        href="/admin/approvals"
                        onClick={() => setBellOpen(false)}
                        className="block px-3.5 py-2.5 text-sm text-ink-body hover:bg-surface-canvas"
                      >
                        {p.name}
                      </Link>
                    ))}
                    {pendingList.length === 0 && (
                      <p className="px-3.5 py-3 text-sm text-ink-faint">{lang === 'th' ? 'ไม่มีรายการรออนุมัติ' : 'Nothing pending'}</p>
                    )}
                  </div>
                </div>
              )}
            </div>
            <div className="hidden h-[26px] w-px bg-card-border sm:block" />
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-pill bg-gradient-to-br from-admin to-[#8B7BEA] font-sans text-[13px] font-bold text-white">
              {initials}
            </span>
          </div>
        </div>

        {/* pb ล่างเผื่อที่ให้ bottom nav บนมือถือ */}
        <main className="flex-1 overflow-auto px-4 py-5 pb-24 sm:px-7 sm:py-6 lg:pb-6">{children}</main>
      </div>

      {/* แจ้งเตือนเรียลไทม์ — เด้งทันทีทุกหน้า ไม่ต้องรีเฟรช */}
      <RealtimeToasts accent="#6D5AE0" />

      {/* ===== BOTTOM NAV (มือถือ) — 5 แท็บ ===== */}
      <nav className="fixed inset-x-0 bottom-0 z-30 flex h-[62px] items-stretch border-t border-card-border bg-white lg:hidden">
        {BOTTOM_NAV[lang].map((item) => {
          const active = pathname === item.href || pathname?.startsWith(item.href + '/');
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`relative flex flex-1 flex-col items-center justify-center gap-1 ${
                active ? 'text-admin' : 'text-ink-faint'
              }`}
            >
              <span className="relative">
                <AdminIcon name={item.icon} size={20} />
                {item.badge && pendingApprovals > 0 && (
                  <span className="absolute -right-2 -top-1.5 flex h-[15px] min-w-[15px] items-center justify-center rounded-pill bg-accent px-1 text-[9.5px] font-bold text-white">
                    {pendingApprovals}
                  </span>
                )}
              </span>
              <span className="text-[10.5px] font-semibold">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
