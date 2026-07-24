'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { PROVINCES } from '@hopak/shared';
import { useDormSearch } from '@/hooks/useDormSearch';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useFavorites } from '@/hooks/useFavorites';
import { useLang, type Lang } from '@/hooks/useLang';
import { clearToken } from '@/lib/auth';
import { resetSocket } from '@/lib/ws';
import { apiClient } from '@/lib/api-client';
import { StarRating } from '@/components/StarRating';
import { FavoriteButton } from '@/components/FavoriteButton';
import { LangSwitch, ThaiFlagIcon, UkFlagIcon } from '@/components/LangSwitch';

const PROVINCE_LABEL: Record<Lang, Record<string, string>> = {
  th: { มหาสารคาม: 'มหาสารคาม', ขอนแก่น: 'ขอนแก่น', เชียงใหม่: 'เชียงใหม่' },
  en: { มหาสารคาม: 'Mahasarakham', ขอนแก่น: 'Khon Kaen', เชียงใหม่: 'Chiang Mai' },
};

const ROOM_TYPE_OPTIONS: Record<Lang, { value: string; label: string }[]> = {
  th: [
    { value: 'all', label: 'ทุกประเภทห้อง' },
    { value: 'air', label: 'ห้องแอร์' },
    { value: 'fan', label: 'ห้องพัดลม' },
  ],
  en: [
    { value: 'all', label: 'All room types' },
    { value: 'air', label: 'Air-conditioned' },
    { value: 'fan', label: 'Fan room' },
  ],
};

const PRICE_RANGE_OPTIONS: Record<Lang, { value: string; label: string }[]> = {
  th: [
    { value: 'all', label: 'งบประมาณทั้งหมด' },
    { value: 'under3000', label: 'ต่ำกว่า ฿3,000' },
    { value: '3000-5000', label: '฿3,000 – ฿5,000' },
    { value: 'above5000', label: 'มากกว่า ฿5,000' },
  ],
  en: [
    { value: 'all', label: 'Any budget' },
    { value: 'under3000', label: 'Under ฿3,000' },
    { value: '3000-5000', label: '฿3,000 – ฿5,000' },
    { value: 'above5000', label: 'Above ฿5,000' },
  ],
};

const TEXT = {
  th: {
    navHome: 'หน้าแรก',
    navSearch: 'ค้นหาหอพัก',
    navOwner: 'สำหรับเจ้าของหอ',
    login: 'เข้าสู่ระบบ',
    register: 'สมัครสมาชิก',
    logout: 'ออกจากระบบ',
    heroTitle: 'หอที่ใช่...จองได้ในคลิกเดียว',
    heroSubtitle: 'ค้นหา จอง และจัดการหอพักออนไลน์ ใกล้มหาวิทยาลัยของคุณ',
    tabMonthly: 'หอพักรายเดือน',
    tabDaily: 'หอพักรายวัน',
    comingSoon: 'เร็วๆ นี้',
    fieldLabel: 'จังหวัด / มหาวิทยาลัย / ชื่อหอพัก',
    dormsUnit: 'หอพัก',
    moveInDate: 'วันเข้าอยู่',
    roomType: 'ประเภทห้อง',
    budget: 'งบประมาณ / เดือน',
    searchBtn: 'ค้นหาหอพัก',
    selectProvince: 'เลือกจังหวัด',
    dormsIn: (p: string) => `หอพักใน${p}`,
    nearbyCount: (n: number) => `${n} หอพักใกล้เคียง`,
    noDorms: 'ยังไม่มีหอพักในจังหวัดนี้',
    perMonth: '/ เดือน',
    full: 'ห้องเต็ม',
    footerHelp: 'ช่วยเหลือ',
    helpLinks: ['ศูนย์ช่วยเหลือ', 'คำถามที่พบบ่อย', 'วิธีจองหอพัก', 'นโยบายการยกเลิก', 'ติดต่อเรา'],
    footerAbout: 'เกี่ยวกับ Hopak',
    aboutLinks: ['เกี่ยวกับเรา', 'ร่วมงานกับเรา', 'ข่าวสาร & โปรโมชัน', 'บล็อก'],
    footerOwner: 'สำหรับเจ้าของหอ',
    listDorm: 'ลงประกาศหอพัก',
    ownerLogin: 'เข้าสู่ระบบเจ้าของหอ',
    ownerLinksExtra: ['ค่าบริการ & ค่าคอมมิชชัน', 'คู่มือเจ้าของหอ'],
    footerPolicy: 'ข้อกำหนด & นโยบาย',
    policyLinks: ['ข้อกำหนดการใช้งาน', 'นโยบายความเป็นส่วนตัว', 'นโยบายคุกกี้'],
    sponsoredBy: 'ได้รับการสนับสนุนโดย',
    currency: 'ไทย (TH) · ฿ THB',
    copyright: '© 2026 Hopak.co.th · แพลตฟอร์มหาหอพักใกล้มหาวิทยาลัย',
  },
  en: {
    navHome: 'Home',
    navSearch: 'Find Dorms',
    navOwner: 'For Dorm Owners',
    login: 'Log in',
    register: 'Sign up',
    logout: 'Log out',
    heroTitle: 'The perfect dorm... book it in just one click.',
    heroSubtitle: 'Search, book, and manage dorms online near your university',
    tabMonthly: 'Monthly Dorms',
    tabDaily: 'Daily Rentals',
    comingSoon: 'Coming soon',
    fieldLabel: 'Province / University / Dorm name',
    dormsUnit: 'dorms',
    moveInDate: 'Move-in date',
    roomType: 'Room type',
    budget: 'Budget / month',
    searchBtn: 'Search Dorms',
    selectProvince: 'Select province',
    dormsIn: (p: string) => `Dorms in ${p}`,
    nearbyCount: (n: number) => `${n} nearby dorms`,
    noDorms: 'No dorms in this province yet',
    perMonth: '/ month',
    full: 'Fully booked',
    footerHelp: 'Help',
    helpLinks: ['Help Center', 'FAQ', 'How to book', 'Cancellation policy', 'Contact us'],
    footerAbout: 'About Hopak',
    aboutLinks: ['About us', 'Careers', 'News & Promotions', 'Blog'],
    footerOwner: 'For Dorm Owners',
    listDorm: 'List your dorm',
    ownerLogin: 'Owner login',
    ownerLinksExtra: ['Fees & commission', 'Owner guide'],
    footerPolicy: 'Terms & Policies',
    policyLinks: ['Terms of use', 'Privacy policy', 'Cookie policy'],
    sponsoredBy: 'Supported by',
    currency: 'English (EN) · ฿ THB',
    copyright: '© 2026 Hopak.co.th · A dorm-finder platform near universities',
  },
} satisfies Record<Lang, Record<string, unknown>>;

export default function HomePage() {
  const router = useRouter();
  const { user, loading: userLoading } = useCurrentUser();
  const { dorms } = useDormSearch({});
  const { favoriteIds, toggle } = useFavorites();

  const { lang, setLang } = useLang();
  const [province, setProvince] = useState<string>(PROVINCES[0]);
  const [open, setOpen] = useState(false);
  const [roomType, setRoomType] = useState('all');
  const [priceRange, setPriceRange] = useState('all');
  const [q, setQ] = useState('');
  const [heroImageUrl, setHeroImageUrl] = useState<string | null>(null);

  useEffect(() => {
    apiClient
      .get<{ heroImageUrl: string | null }>('/settings/hero')
      .then((data) => setHeroImageUrl(data.heroImageUrl))
      .catch(() => setHeroImageUrl(null));
  }, []);

  const t = TEXT[lang];
  const roomTypeOptions = ROOM_TYPE_OPTIONS[lang];
  const priceRangeOptions = PRICE_RANGE_OPTIONS[lang];
  const provinceLabel = (p: string) => PROVINCE_LABEL[lang][p] ?? p;

  const byProvince = useMemo(() => {
    const map = new Map<string, typeof dorms>();
    for (const p of PROVINCES) map.set(p, []);
    for (const d of dorms) {
      if (map.has(d.province)) map.get(d.province)!.push(d);
    }
    return map;
  }, [dorms]);

  const currentDorms = byProvince.get(province) ?? [];

  function handleLogout() {
    clearToken();
    resetSocket();
    router.push('/');
    router.refresh();
  }

  function handleSearch() {
    const params = new URLSearchParams();
    if (q.trim()) params.set('q', q.trim());
    params.set('province', province);
    if (roomType !== 'all') params.set('roomType', roomType);
    if (priceRange !== 'all') params.set('priceRange', priceRange);
    router.push(`/search?${params.toString()}`);
  }

  return (
    <div style={{ background: '#EDEFF3', color: '#181B22' }}>
      {/* ===== HEADER ===== */}
      <div className="flex h-20 items-center gap-3.5 bg-[#14171C] px-6 sm:px-10">
        <Link href="/" className="flex items-center gap-2.5">
          <span className="flex h-10 w-10 items-center justify-center rounded-[11px] bg-tenant font-sans text-xl font-bold text-white">
            H
          </span>
          <span className="hidden text-lg font-bold text-white sm:inline">Hopak</span>
        </Link>

        <nav className="ml-auto flex items-center gap-5 text-sm text-[#C7CCD5]">
          <span className="hidden font-semibold text-white md:inline">{t.navHome}</span>
          <Link href="/search" className="hidden hover:text-white md:inline">
            {t.navSearch}
          </Link>
          <Link href="/register" className="hidden hover:text-white md:inline">
            {t.navOwner}
          </Link>

          <LangSwitch lang={lang} onChange={setLang} dark />

          {!userLoading &&
            (user ? (
              <>
                <Link href="/profile" className="text-white hover:underline">
                  {user.name}
                </Link>
                <button onClick={handleLogout} className="text-[#F08A7A] hover:underline">
                  {t.logout}
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  className="flex h-10 items-center rounded-[10px] border border-[#3A3F49] px-4 text-white"
                >
                  {t.login}
                </Link>
                <Link
                  href="/register"
                  className="flex h-10 items-center rounded-[10px] bg-tenant px-4 font-semibold text-white"
                >
                  {t.register}
                </Link>
              </>
            ))}
        </nav>
      </div>

      {/* ===== HERO ===== */}
      <div
        className="relative h-[400px] bg-cover bg-center"
        style={{ backgroundImage: `url('${heroImageUrl ?? '/hero-banner.jpg'}')` }}
      >
        <div className="pt-[52px] text-center">
          <div className="text-3xl font-bold tracking-tight text-white sm:text-[38px]">{t.heroTitle}</div>
          <div className="mt-2 text-base text-[#EAF1FD] sm:text-[17px]">{t.heroSubtitle}</div>
        </div>
      </div>

      {/* ===== SEARCH CARD ===== */}
      <div className="relative z-[2] mx-auto -mt-[190px] max-w-[1120px] px-4">
        <div className="flex gap-1.5 pl-3.5">
          <div className="flex items-center gap-2 rounded-t-[14px] bg-white px-6 py-3.5 text-sm font-semibold text-tenant shadow-[0_-2px_8px_rgba(0,0,0,0.04)]">
            <span className="h-[9px] w-[9px] rounded-full bg-tenant" />
            {t.tabMonthly}
          </div>
          <div
            className="cursor-not-allowed rounded-t-[14px] bg-white/55 px-6 py-3.5 text-sm text-ink-body"
            title={t.comingSoon}
          >
            {t.tabDaily}
          </div>
        </div>

        <div className="rounded-[0_18px_18px_18px] bg-white p-5 shadow-[0_12px_40px_rgba(20,40,80,0.18)] sm:p-6">
          {/* big field */}
          <div className="flex h-16 items-center gap-3 rounded-[14px] border-2 border-tenant px-5">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="shrink-0">
              <circle cx="11" cy="11" r="7" stroke="#2F6FE0" strokeWidth="2.2" />
              <path d="M16.5 16.5L21 21" stroke="#2F6FE0" strokeWidth="2.2" strokeLinecap="round" />
            </svg>
            <div className="flex-1 overflow-hidden">
              <div className="text-xs text-ink-muted">{t.fieldLabel}</div>
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                placeholder={`${provinceLabel(province)} · ${currentDorms.length} ${t.dormsUnit}`}
                className="w-full truncate bg-transparent text-lg font-semibold text-ink-strong outline-none placeholder:text-ink-strong"
              />
            </div>
          </div>

          {/* field row */}
          <div className="mt-3.5 grid grid-cols-1 gap-3.5 sm:grid-cols-3">
            <div
              className="flex h-[74px] items-center gap-3 rounded-[14px] border border-card-border px-[18px] opacity-60"
              title={t.comingSoon}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="shrink-0">
                <rect x="3" y="5" width="18" height="16" rx="2.5" stroke="#5B616C" strokeWidth="1.7" />
                <path d="M3 9h18M8 3v4M16 3v4" stroke="#5B616C" strokeWidth="1.7" strokeLinecap="round" />
              </svg>
              <div>
                <div className="text-[12.5px] text-ink-muted">{t.moveInDate}</div>
                <div className="text-sm font-semibold text-ink-body">{t.comingSoon}</div>
              </div>
            </div>

            <label className="flex h-[74px] cursor-pointer items-center gap-3 rounded-[14px] border border-card-border px-[18px]">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="shrink-0">
                <path d="M4 20v-9l8-6 8 6v9" stroke="#5B616C" strokeWidth="1.7" strokeLinejoin="round" />
                <rect x="9" y="13" width="6" height="7" stroke="#5B616C" strokeWidth="1.7" />
              </svg>
              <div className="flex-1">
                <div className="text-[12.5px] text-ink-muted">{t.roomType}</div>
                <select
                  value={roomType}
                  onChange={(e) => setRoomType(e.target.value)}
                  className="w-full appearance-none bg-transparent text-base font-semibold text-ink-strong outline-none"
                >
                  {roomTypeOptions.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
            </label>

            <label className="flex h-[74px] cursor-pointer items-center gap-3 rounded-[14px] border border-card-border px-[18px]">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="shrink-0">
                <circle cx="12" cy="12" r="9" stroke="#5B616C" strokeWidth="1.7" />
                <path
                  d="M12 7v10M9.5 9.5c0-1.1 1.1-1.8 2.5-1.8s2.5.7 2.5 1.8-1.1 1.8-2.5 1.8-2.5.7-2.5 1.8 1.1 1.8 2.5 1.8 2.5-.7 2.5-1.8"
                  stroke="#5B616C"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                />
              </svg>
              <div className="flex-1">
                <div className="text-[12.5px] text-ink-muted">{t.budget}</div>
                <select
                  value={priceRange}
                  onChange={(e) => setPriceRange(e.target.value)}
                  className="w-full appearance-none bg-transparent text-base font-semibold text-ink-strong outline-none"
                >
                  {priceRangeOptions.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
            </label>
          </div>

          <button
            onClick={handleSearch}
            className="mt-4 h-[60px] w-full rounded-[14px] bg-tenant text-xl font-bold text-white hover:bg-tenant-dark"
          >
            {t.searchBtn}
          </button>
        </div>
      </div>

      {/* ===== PROVINCE SELECTOR ===== */}
      <div className="mx-auto mt-8 flex max-w-[1120px] items-center gap-3.5 px-4">
        <span className="text-sm font-semibold text-ink-body">{t.selectProvince}</span>
        <div className="relative w-full max-w-[320px]">
          <div
            onClick={() => setOpen((v) => !v)}
            className="flex h-[50px] cursor-pointer items-center gap-2.5 rounded-xl border border-[#D8DCE2] bg-white px-4 shadow-[0_1px_3px_rgba(0,0,0,0.05)]"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="shrink-0">
              <path
                d="M12 21s-6.5-5.5-6.5-10a6.5 6.5 0 1113 0c0 4.5-6.5 10-6.5 10z"
                stroke="#2F6FE0"
                strokeWidth="1.8"
                strokeLinejoin="round"
              />
              <circle cx="12" cy="11" r="2.3" stroke="#2F6FE0" strokeWidth="1.8" />
            </svg>
            <span className="flex-1 text-base font-semibold text-ink-strong">{provinceLabel(province)}</span>
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }}
            >
              <path d="M6 9l6 6 6-6" stroke="#8A909B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>

          {open && (
            <div className="absolute left-0 right-0 top-14 z-10 rounded-xl border border-card-border bg-white p-1.5 shadow-[0_12px_30px_rgba(20,40,80,0.16)]">
              {PROVINCES.map((p) => {
                const selected = p === province;
                return (
                  <div
                    key={p}
                    onClick={() => {
                      setProvince(p);
                      setOpen(false);
                    }}
                    className={`flex cursor-pointer items-center gap-2.5 rounded-[9px] px-3 py-2.5 text-[15px] hover:bg-[#F1F3F6] ${
                      selected ? 'bg-tenant-tint text-tenant' : 'text-ink-body'
                    }`}
                  >
                    <span className={`flex-1 ${selected ? 'font-bold' : 'font-medium'}`}>{provinceLabel(p)}</span>
                    <span className="text-[13px] text-ink-muted">
                      {byProvince.get(p)?.length ?? 0} {t.dormsUnit}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ===== DORMS IN PROVINCE ===== */}
      <div className="mx-auto mt-7 max-w-[1120px] px-4">
        <div className="mb-3.5 flex items-baseline gap-2.5">
          <div className="text-[22px] font-bold">{t.dormsIn(provinceLabel(province))}</div>
          <span className="text-sm text-ink-muted">{t.nearbyCount(currentDorms.length)}</span>
        </div>

        {currentDorms.length === 0 ? (
          <p className="text-ink-faint">{t.noDorms}</p>
        ) : (
          <div className="grid grid-cols-1 gap-[18px] sm:grid-cols-2 lg:grid-cols-4">
            {currentDorms.slice(0, 4).map((d) => {
              const availableRooms = d.rooms.filter((r) => r.status.toUpperCase() === 'AVAILABLE');
              const startingRoom = [...availableRooms].sort((a, b) => a.pricePerMonth - b.pricePerMonth)[0];
              const isFavorited = favoriteIds.has(d.id);
              return (
                <Link
                  key={d.id}
                  href={`/dorms/${d.id}`}
                  className="block overflow-hidden rounded-card-lg border border-[#E7E9EC] bg-white shadow-card hover:shadow-card-hover"
                >
                  <div className="relative flex h-[150px] items-center justify-center bg-surface-canvas font-mono text-xs text-ink-faint">
                    รูปหอพัก
                    <FavoriteButton active={isFavorited} onToggle={() => toggle(d.id)} />
                  </div>
                  <div className="p-3.5">
                    <div className="flex items-center justify-between gap-2">
                      <div className="truncate text-[15.5px] font-bold">{d.name}</div>
                      <StarRating rating={d.avgRating} count={d.reviewCount} />
                    </div>
                    <div className="mt-0.5 truncate text-[13px] text-ink-muted">
                      {d.university ?? provinceLabel(d.province)}
                    </div>
                    <div className="mt-2.5 text-sm">
                      {startingRoom ? (
                        <>
                          <b className="font-sans text-lg">฿{startingRoom.pricePerMonth.toLocaleString()}</b>
                          <span className="text-ink-muted"> {t.perMonth}</span>
                        </>
                      ) : (
                        <span className="text-ink-faint">{t.full}</span>
                      )}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {/* ===== FOOTER ===== */}
      <div className="mt-14 border-t border-card-border bg-white px-6 pt-11 sm:px-10">
        <div className="mx-auto grid max-w-[1120px] grid-cols-2 gap-8 sm:grid-cols-4">
          <div>
            <div className="mb-4 text-[15px] font-bold">{t.footerHelp}</div>
            <div className="flex flex-col gap-3 text-sm text-ink-body">
              {t.helpLinks.map((s) => (
                <span key={s}>{s}</span>
              ))}
            </div>
          </div>
          <div>
            <div className="mb-4 text-[15px] font-bold">{t.footerAbout}</div>
            <div className="flex flex-col gap-3 text-sm text-ink-body">
              {t.aboutLinks.map((s) => (
                <span key={s}>{s}</span>
              ))}
            </div>
          </div>
          <div>
            <div className="mb-4 text-[15px] font-bold">{t.footerOwner}</div>
            <div className="flex flex-col gap-3 text-sm text-ink-body">
              <Link href="/register" className="text-left hover:text-tenant">
                {t.listDorm}
              </Link>
              <Link href="/login" className="text-left hover:text-tenant">
                {t.ownerLogin}
              </Link>
              {t.ownerLinksExtra.map((s) => (
                <span key={s}>{s}</span>
              ))}
            </div>
          </div>
          <div>
            <div className="mb-4 text-[15px] font-bold">{t.footerPolicy}</div>
            <div className="flex flex-col gap-3 text-sm text-ink-body">
              {t.policyLinks.map((s) => (
                <span key={s}>{s}</span>
              ))}
            </div>
          </div>
        </div>

        <div className="mx-auto mt-9 flex max-w-[1120px] items-center gap-[18px] border-t border-surface-canvas pt-7">
          <span className="text-[13px] text-ink-muted">{t.sponsoredBy}</span>
          <img src="/yec-mahasarakham.png" alt="YEC Mahasarakham" className="h-14 w-auto" />
          <div className="ml-auto flex items-center gap-3">
            <span className="flex h-[34px] items-center gap-1.5 rounded-lg border border-card-border px-3 text-[13px] text-ink-body">
              {lang === 'th' ? (
                <ThaiFlagIcon className="h-3 w-[18px] rounded-[2px]" />
              ) : (
                <UkFlagIcon className="h-3 w-[18px] rounded-[2px]" />
              )}
              {t.currency}
            </span>
          </div>
        </div>
      </div>

      {/* ===== COPYRIGHT BAR ===== */}
      <div className="bg-[#14171C] px-6 py-[22px] text-[#9AA0AB] sm:px-10">
        <div className="mx-auto flex max-w-[1120px] items-center gap-3">
          <span className="flex h-8 w-8 items-center justify-center rounded-[9px] bg-tenant font-sans font-bold text-white">
            H
          </span>
          <span className="text-sm font-bold text-white">Hopak</span>
          <span className="ml-auto text-[13px] text-[#5B616C]">{t.copyright}</span>
        </div>
      </div>
    </div>
  );
}
