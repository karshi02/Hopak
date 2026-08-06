'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { PROVINCES } from '@hopak/shared';
import { useDormSearch } from '@/hooks/useDormSearch';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useFavorites } from '@/hooks/useFavorites';
import { useLang, type Lang } from '@/hooks/useLang';
import { useTypewriter } from '@/hooks/useTypewriter';
import { clearToken } from '@/lib/auth';
import { getSocket } from '@/lib/ws';

interface PromoCardData {
  tagTh: string;
  titleTh: string;
  subTh: string;
  tagEn: string;
  titleEn: string;
  subEn: string;
}

interface HomeContent {
  heroTitleTh?: string;
  heroSubtitleTh?: string;
  heroColor?: string;
  heroPos?: string;
  zonesTitleTh?: string;
  zonesSubTh?: string;
  trust?: { titleTh: string; subTh: string }[];
}
import { resetSocket } from '@/lib/ws';
import { apiClient } from '@/lib/api-client';
import { loadGoogleMaps } from '@/lib/googleMaps';
import { haversineKm } from '@/lib/geo';
import { StarRating } from '@/components/StarRating';
import { FavoriteButton } from '@/components/FavoriteButton';
import { LangSwitch } from '@/components/LangSwitch';

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
    navOwner: 'ลงประกาศหอพัก',
    notifications: 'การแจ้งเตือน',
    topSearchPhrases: ['ค้นหาจังหวัด', 'หอพักใกล้มหาวิทยาลัย', 'ชื่อหอพักใกล้ฉัน'],
    login: 'เข้าสู่ระบบ',
    register: 'สมัครสมาชิก',
    logout: 'ออกจากระบบ',
    heroTitle: 'หาหอพักใกล้มหาวิทยาลัย ราคาโปร่งใส จองได้ทันที',
    heroSubtitle: 'เปรียบเทียบค่าน้ำค่าไฟก่อนจอง',
    tabMonthly: 'หอพักรายเดือน',
    tabDaily: 'หอพักรายวัน',
    comingSoon: 'เร็วๆ นี้',
    fieldLabel: 'จังหวัด / มหาวิทยาลัย / ชื่อหอพัก',
    dormsUnit: 'หอพัก',
    moveInDate: 'วันเข้าอยู่',
    roomType: 'ประเภทห้อง',
    budget: 'งบประมาณ / เดือน',
    searchBtn: 'ค้นหาหอพัก',
    availableOnly: 'เฉพาะห้องว่างพร้อมเข้าอยู่',
    chips: ['หอแอร์ราคาถูก', 'เดินถึงมหาลัย', 'มีเครื่องซักผ้า', 'ที่จอดรถ', 'สัตว์เลี้ยงได้'],
    popularLabel: 'ยอดนิยม:',
    promos: [
      { tag: 'ยืนยันตัวตนแล้ว', title: 'หอพักทุกแห่งผ่านการตรวจสอบโดยแอดมิน', sub: 'ปลอดภัย ไม่โดนหลอก' },
      { tag: 'สมาชิกใหม่', title: 'สมัครฟรี เริ่มค้นหาหอได้ทันที', sub: 'เริ่มใช้งานได้ทันที' },
      { tag: 'โปร่งใส', title: 'เห็นค่าน้ำ ค่าไฟ ค่ามัดจำครบก่อนจอง', sub: 'ไม่มีค่าใช้จ่ายแอบแฝง' },
    ],
    zonesTitle: 'ทำเลยอดนิยม',
    zonesSub: 'เลือกจังหวัดที่ใช่ แล้วดูหอพักทั้งหมดในจังหวัดนั้น',
    viewAllZones: 'ดูทั้งหมด →',
    selectProvince: 'เลือกจังหวัด',
    zoneCount: (n: number) => `${n} หอพัก`,
    zoneFrom: (p: string) => `เริ่ม ${p}`,
    trendingTitle: 'หอพักแนะนำ',
    dormsIn: (p: string) => `หอพักใน${p}`,
    nearbyCount: (n: number) => `${n} หอพักใกล้เคียง`,
    distanceAway: (km: number) => (km < 1 ? `ห่างคุณ ${Math.round(km * 1000)} ม.` : `ห่างคุณ ${km.toFixed(1)} กม.`),
    noDorms: 'ยังไม่มีหอพักในจังหวัดนี้',
    noDailyDorms: 'ยังไม่มีหอพักรายวันในจังหวัดนี้',
    perMonth: '/ เดือน',
    perNight: '/ คืน',
    full: 'ห้องเต็ม',
    photoPlaceholder: 'ไม่มีรูปหอพัก',
    trust: [
      { title: 'ราคาโปร่งใส', desc: 'เห็นค่าน้ำค่าไฟ ค่ามัดจำครบ ไม่มีค่าแอบแฝง' },
      { title: 'จองปลอดภัย', desc: 'ชำระเงินผ่านระบบ มีหลักฐานการจองครบถ้วน' },
      { title: 'รีวิวจริงจากผู้เช่า', desc: 'อ่านรีวิวจากคนที่เคยเข้าพักจริงก่อนตัดสินใจ' },
    ],
    footerHelp: 'ช่วยเหลือ',
    helpLinks: ['ศูนย์ช่วยเหลือ', 'คำถามที่พบบ่อย', 'วิธีจองหอพัก', 'นโยบายการยกเลิก', 'ติดต่อเรา'],
    footerAbout: 'เกี่ยวกับ Hoprak',
    aboutLinks: ['เกี่ยวกับเรา', 'ร่วมงานกับเรา', 'ข่าวสาร & โปรโมชัน', 'บล็อก'],
    footerOwner: 'สำหรับเจ้าของหอ',
    listDorm: 'ลงประกาศหอพัก',
    ownerLogin: 'เข้าสู่ระบบเจ้าของหอ',
    ownerLinksExtra: ['ค่าบริการ & ค่าคอมมิชชัน', 'คู่มือเจ้าของหอ'],
    footerPolicy: 'ข้อกำหนด & นโยบาย',
    policyLinks: ['ข้อกำหนดการใช้งาน', 'นโยบายความเป็นส่วนตัว', 'นโยบายคุกกี้'],
    sponsoredBy: 'ได้รับการสนับสนุนโดย',
    copyright: '© 2569 Hoprak.com · สงวนลิขสิทธิ์',
  },
  en: {
    navOwner: 'List your dorm',
    notifications: 'Notifications',
    topSearchPhrases: ['Search by province', 'Dorms near your university', 'Dorm name near me'],
    login: 'Log in',
    register: 'Sign up',
    logout: 'Log out',
    heroTitle: 'Find dorms near your university — transparent pricing, book instantly',
    heroSubtitle: 'Compare water & electric rates before booking',
    tabMonthly: 'Monthly Dorms',
    tabDaily: 'Daily Rentals',
    comingSoon: 'Coming soon',
    fieldLabel: 'Province / University / Dorm name',
    dormsUnit: 'dorms',
    moveInDate: 'Move-in date',
    roomType: 'Room type',
    budget: 'Budget / month',
    searchBtn: 'Search Dorms',
    availableOnly: 'Available rooms only',
    chips: ['Cheap AC rooms', 'Walk to university', 'Has laundry', 'Parking', 'Pets allowed'],
    popularLabel: 'Popular:',
    promos: [
      { tag: 'Verified', title: 'Every dorm is reviewed by our admin team', sub: 'Safe, no scams' },
      { tag: 'New members', title: 'Free sign-up, start searching instantly', sub: 'Start using it right away' },
      { tag: 'Transparent', title: 'See water, electric & deposit fees upfront', sub: 'No hidden costs' },
    ],
    zonesTitle: 'Popular Areas',
    zonesSub: 'Pick a province to see all its dorms',
    viewAllZones: 'View all →',
    selectProvince: 'Select province',
    zoneCount: (n: number) => `${n} dorms`,
    zoneFrom: (p: string) => `From ${p}`,
    trendingTitle: 'Recommended dorms',
    dormsIn: (p: string) => `Dorms in ${p}`,
    nearbyCount: (n: number) => `${n} nearby dorms`,
    distanceAway: (km: number) => (km < 1 ? `${Math.round(km * 1000)} m from you` : `${km.toFixed(1)} km from you`),
    noDorms: 'No dorms in this province yet',
    noDailyDorms: 'No daily rentals in this province yet',
    perMonth: '/ month',
    perNight: '/ night',
    full: 'Fully booked',
    photoPlaceholder: 'No dorm photo',
    trust: [
      { title: 'Transparent pricing', desc: 'Water, electric, and deposit fees shown upfront' },
      { title: 'Safe booking', desc: 'Pay through the platform with a full booking record' },
      { title: 'Real tenant reviews', desc: 'Read reviews from people who actually stayed' },
    ],
    footerHelp: 'Help',
    helpLinks: ['Help Center', 'FAQ', 'How to book', 'Cancellation policy', 'Contact us'],
    footerAbout: 'About Hoprak',
    aboutLinks: ['About us', 'Careers', 'News & Promotions', 'Blog'],
    footerOwner: 'For Dorm Owners',
    listDorm: 'List your dorm',
    ownerLogin: 'Owner login',
    ownerLinksExtra: ['Fees & commission', 'Owner guide'],
    footerPolicy: 'Terms & Policies',
    policyLinks: ['Terms of use', 'Privacy policy', 'Cookie policy'],
    sponsoredBy: 'Supported by',
    copyright: '© 2026 Hoprak.com · All rights reserved',
  },
} satisfies Record<Lang, Record<string, unknown>>;

export default function HomePage() {
  const router = useRouter();
  const { user, loading: userLoading } = useCurrentUser();
  const { dorms } = useDormSearch({});
  const { favoriteIds, toggle } = useFavorites();

  // กระดิ่งแจ้งเตือน — เฉพาะผู้เช่า (tenant) ที่ล็อกอินอยู่ (navbar หน้าแรกเป็นตัวแยกจาก Navbar.tsx)
  const isTenant = user?.role.toLowerCase() === 'tenant';
  const [unreadNotif, setUnreadNotif] = useState(0);
  useEffect(() => {
    if (!isTenant) return;
    const refetch = () =>
      apiClient
        .get<{ readAt: string | null }[]>('/notifications')
        .then((list) => setUnreadNotif(list.filter((n) => !n.readAt).length))
        .catch(() => {});
    refetch();
    const socket = getSocket();
    const onNew = () => setUnreadNotif((c) => c + 1);
    socket.on('notification:new', onNew);
    window.addEventListener('hopak:notif-read', refetch);
    return () => {
      socket.off('notification:new', onNew);
      window.removeEventListener('hopak:notif-read', refetch);
    };
  }, [isTenant]);

  const { lang, setLang } = useLang();
  const [category, setCategory] = useState<'monthly' | 'daily'>('monthly');
  const [province, setProvince] = useState<string>(PROVINCES[0]);
  const [open, setOpen] = useState(false);
  const [roomType, setRoomType] = useState('all');
  const [priceRange, setPriceRange] = useState('all');
  const [availableOnly, setAvailableOnly] = useState(false);
  const [q, setQ] = useState('');
  const [selectedPlace, setSelectedPlace] = useState<{ lat: number; lng: number; name: string } | null>(null);
  const [areaImages, setAreaImages] = useState<Record<string, string>>({});
  const [promoCards, setPromoCards] = useState<PromoCardData[]>([]);
  const [homeContent, setHomeContent] = useState<HomeContent>({});
  const [heroImageUrl, setHeroImageUrl] = useState<string | null>(null);
  const [myLocation, setMyLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [topSearchQ, setTopSearchQ] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    apiClient
      .get<{
        heroImageUrl: string | null;
        areaImages: Record<string, string>;
        promoCards: PromoCardData[];
        homeContent: HomeContent;
      }>('/settings/hero')
      .then((data) => {
        setHeroImageUrl(data.heroImageUrl ?? null);
        setAreaImages(data.areaImages ?? {});
        setPromoCards(data.promoCards ?? []);
        setHomeContent(data.homeContent ?? {});
      })
      .catch(() => {
        setHeroImageUrl(null);
        setAreaImages({});
        setPromoCards([]);
        setHomeContent({});
      });
  }, []);

  // ขอตำแหน่งจริงของผู้ใช้ (ต้องกดอนุญาตเอง) — ไม่ได้ก็แค่ไม่โชว์ระยะทาง ไม่เดา/ไม่ใช้ค่า fallback ปลอม
  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => setMyLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => setMyLocation(null),
      { enableHighAccuracy: false, timeout: 8000 },
    );
  }, []);

  // ผูก Google Places autocomplete กับช่องค้นหาเดิม — เลือกสถานที่/มหาวิทยาลัยแล้วได้ lat/lng
  // เอาไปคำนวณระยะทางไปหอพักแต่ละที่ในหน้า /search (แบบ Agoda ค้นหาสถานที่แล้วโชว์ระยะห่าง)
  useEffect(() => {
    let cancelled = false;
    let autocomplete: google.maps.places.Autocomplete | null = null;

    loadGoogleMaps()
      .then((g) => {
        if (cancelled || !searchInputRef.current) return;
        autocomplete = new g.maps.places.Autocomplete(searchInputRef.current, {
          fields: ['geometry', 'formatted_address', 'name'],
          componentRestrictions: { country: 'th' },
        });
        autocomplete.addListener('place_changed', () => {
          const place = autocomplete!.getPlace();
          const loc = place.geometry?.location;
          if (!loc) return;
          const name = place.name || place.formatted_address || '';
          setQ(name);
          setSelectedPlace({ lat: loc.lat(), lng: loc.lng(), name });
        });
      })
      .catch(() => {
        // Google Maps โหลดไม่ได้ (เช่น API key ไม่ตั้งค่า) — เหลือแค่ค้นหาข้อความปกติ ไม่พังทั้งหน้า
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const t = TEXT[lang];
  // ข้อความหน้าแรกที่แอดมินแก้ได้ (เฉพาะภาษาไทย) — ทับ default เมื่อดูภาษาไทยและแอดมินตั้งค่าไว้
  const isTh = lang === 'th';
  const heroTitle = (isTh && homeContent.heroTitleTh) || t.heroTitle;
  const heroSubtitle = (isTh && homeContent.heroSubtitleTh) || t.heroSubtitle;
  const zonesTitle = (isTh && homeContent.zonesTitleTh) || t.zonesTitle;
  const zonesSub = (isTh && homeContent.zonesSubTh) || t.zonesSub;
  const trustCards = t.trust.map((tr, i) => {
    const o = isTh ? homeContent.trust?.[i] : undefined;
    return { title: (o?.titleTh || tr.title) as string, desc: (o?.subTh || tr.desc) as string };
  });
  const topSearchPlaceholder = useTypewriter(t.topSearchPhrases);
  const roomTypeOptions = ROOM_TYPE_OPTIONS[lang];
  const priceRangeOptions = PRICE_RANGE_OPTIONS[lang];

  // การ์ดจุดขายใต้ hero: merge ต่อช่อง — คงไว้ 3 ใบเสมอ
  // ช่องไหนแอดมินตั้ง title ไว้ (ตามภาษาที่ดูอยู่) ใช้ของแอดมิน ช่องที่เหลือใช้ข้อความ default
  // (กันกรณีแอดมินแก้แค่บางใบแล้วอีก 2 ใบหายไป)
  const promos = t.promos.map((def, i) => {
    const c = promoCards[i];
    const adminTitle = c && (lang === 'th' ? c.titleTh : c.titleEn);
    if (c && adminTitle)
      return lang === 'th'
        ? { tag: c.tagTh, title: c.titleTh, sub: c.subTh }
        : { tag: c.tagEn, title: c.titleEn, sub: c.subEn };
    return def;
  });
  const provinceLabel = (p: string) => PROVINCE_LABEL[lang][p] ?? p;

  const dailyMode = category === 'daily';
  // โหมดรายวัน: ห้องต้องเปิดรายวัน (allowDaily) + ราคาที่ใช้คือ pricePerDay ; โหมดเดือนใช้ pricePerMonth
  const roomOk = (r: (typeof dorms)[number]['rooms'][number]) =>
    r.status.toUpperCase() === 'AVAILABLE' && (!dailyMode || (r.allowDaily && (r.pricePerDay ?? 0) > 0));
  const roomPrice = (r: (typeof dorms)[number]['rooms'][number]) => (dailyMode ? r.pricePerDay ?? 0 : r.pricePerMonth);

  // โหมดรายวันแสดงเฉพาะหอที่มีห้องเปิดรายวันอย่างน้อย 1 ห้อง
  const catDorms = useMemo(
    () => (dailyMode ? dorms.filter((d) => d.rooms.some((r) => r.allowDaily && (r.pricePerDay ?? 0) > 0)) : dorms),
    [dorms, dailyMode],
  );

  const byProvince = useMemo(() => {
    const map = new Map<string, typeof dorms>();
    for (const p of PROVINCES) map.set(p, []);
    for (const d of catDorms) {
      if (map.has(d.province)) map.get(d.province)!.push(d);
    }
    return map;
  }, [catDorms]);

  const currentDorms = byProvince.get(province) ?? [];

  function cheapestOf(list: typeof dorms) {
    let min: number | null = null;
    for (const d of list) {
      for (const r of d.rooms) {
        if (roomOk(r) && (min === null || roomPrice(r) < min)) {
          min = roomPrice(r);
        }
      }
    }
    return min;
  }

  // ทำเลยอดนิยม = จังหวัดจริงที่มีหอพักเยอะสุด (ไม่มี concept "โซน/ย่าน" ในระบบจริง ใช้จังหวัดแทน ข้อมูลจริงทั้งหมด ไม่ fake)
  const topProvinces = useMemo(() => {
    return PROVINCES.map((p) => {
      const list = byProvince.get(p) ?? [];
      return { province: p, count: list.length, cheapest: cheapestOf(list) };
    })
      .filter((z) => z.count > 0)
      .sort((a, b) => b.count - a.count)
      .slice(0, 4);
  }, [byProvince]);

  // หอพักแนะนำ = คะแนนรีวิวจริงสูงสุดทั้งระบบ (ไม่มี concept "โปรโมท/บูสต์" โชว์บนหน้าแรกในตอนนี้ ไม่ใส่ badge ที่พิสูจน์ไม่ได้)
  const topDorms = useMemo(() => {
    return [...catDorms]
      .filter((d) => (d.reviewCount ?? 0) > 0)
      .sort((a, b) => (b.avgRating ?? 0) - (a.avgRating ?? 0))
      .slice(0, 4);
  }, [catDorms]);

  const perUnit = dailyMode ? t.perNight : t.perMonth;

  const visibleCurrentDorms = availableOnly
    ? currentDorms.filter((d) => d.rooms.some(roomOk))
    : currentDorms;

  function handleLogout() {
    clearToken();
    resetSocket();
    router.push('/');
    router.refresh();
  }

  function handleSearch() {
    const params = new URLSearchParams();
    if (selectedPlace && selectedPlace.name === q.trim()) {
      params.set('lat', String(selectedPlace.lat));
      params.set('lng', String(selectedPlace.lng));
      params.set('placeName', selectedPlace.name);
    } else if (q.trim()) {
      params.set('q', q.trim());
    }
    params.set('province', province);
    if (dailyMode) params.set('rental', 'daily');
    if (roomType !== 'all') params.set('roomType', roomType);
    if (priceRange !== 'all') params.set('priceRange', priceRange);
    if (availableOnly) params.set('availableOnly', '1');
    router.push(`/search?${params.toString()}`);
  }

  return (
    <div className="overflow-x-hidden bg-[#F2F4F8] text-[#161A22]">
      {/* ===== TOP HEADER ===== */}
      <div className="bg-gradient-to-b from-[#0E1220] to-[#151C30]">
        <div className="mx-auto flex h-auto min-h-[62px] max-w-[1240px] flex-wrap items-center gap-x-5 gap-y-2 px-4 py-2.5 sm:px-6">
          <Link href="/" className="flex shrink-0 items-center gap-2">
            <span className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-[9px] bg-tenant font-sans text-xl font-extrabold leading-none text-white">
              H
            </span>
            <span className="whitespace-nowrap text-[17px] font-bold tracking-tight text-white sm:text-[19px]">
              Hoprak<span className="text-[#6BA0F5]">.com</span>
            </span>
          </Link>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              router.push(topSearchQ.trim() ? `/search?q=${encodeURIComponent(topSearchQ.trim())}` : '/search');
            }}
            className="hidden min-w-0 max-w-xs flex-1 items-center gap-2 rounded-full border border-white/12 bg-white/[0.07] px-4 py-2 sm:flex"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="shrink-0">
              <circle cx="11" cy="11" r="7" stroke="#9AA3B5" strokeWidth="2" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" stroke="#9AA3B5" strokeWidth="2" strokeLinecap="round" />
            </svg>
            <input
              value={topSearchQ}
              onChange={(e) => setTopSearchQ(e.target.value)}
              placeholder={topSearchPlaceholder}
              className="w-full min-w-0 bg-transparent text-[13.5px] text-white outline-none placeholder:text-[#9AA3B5]"
            />
          </form>

          <div className="ml-auto flex flex-wrap items-center gap-x-3 gap-y-2 sm:gap-5">
            <LangSwitch lang={lang} onChange={setLang} dark />

            <Link
              href="/partner-register"
              className="hidden items-center gap-1.5 text-[13.5px] font-semibold text-[#C6CEDD] hover:text-white sm:flex"
            >
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none">
                <path d="M3 21v-2a4 4 0 014-4h6a4 4 0 014 4v2" stroke="#C6CEDD" strokeWidth="1.8" strokeLinecap="round" />
                <circle cx="10" cy="7" r="4" stroke="#C6CEDD" strokeWidth="1.8" />
              </svg>
              {t.navOwner}
            </Link>

            {!userLoading &&
              (user ? (
                <>
                  {isTenant && (
                    <Link
                      href="/notifications"
                      title={t.notifications}
                      className="relative flex h-9 w-9 items-center justify-center rounded-[11px] bg-white/15 text-white hover:bg-white/25"
                    >
                      <svg width="19" height="19" viewBox="0 0 24 24" fill="none">
                        <path
                          d="M18 8a6 6 0 10-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 01-3.4 0"
                          stroke="currentColor"
                          strokeWidth="1.8"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                      {unreadNotif > 0 && (
                        <span className="absolute -right-1 -top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-pill border-2 border-[#0E1220] bg-danger px-1 text-[11px] font-bold text-white">
                          {unreadNotif > 99 ? '99+' : unreadNotif}
                        </span>
                      )}
                    </Link>
                  )}
                  <Link href="/profile" className="flex items-center gap-2 text-[13.5px] font-semibold text-white hover:underline">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white/15 text-xs font-bold text-white">
                      {user.avatarUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={user.avatarUrl} alt="" className="h-full w-full object-cover" />
                      ) : (
                        user.name.charAt(0)
                      )}
                    </span>
                    {user.name}
                  </Link>
                  <button onClick={handleLogout} className="text-[13.5px] font-semibold text-[#F08A7A] hover:underline">
                    {t.logout}
                  </button>
                </>
              ) : (
                <>
                  <Link
                    href="/register"
                    className="flex h-9 items-center rounded-lg border border-white/28 px-4 text-[13.5px] font-semibold text-white"
                  >
                    {t.register}
                  </Link>
                  <Link
                    href="/login"
                    className="flex h-9 items-center rounded-lg bg-tenant px-[17px] text-[13.5px] font-semibold text-white"
                  >
                    {t.login}
                  </Link>
                </>
              ))}
          </div>
        </div>
      </div>

      {/* ===== HERO ===== */}
      {/* รูปที่อัปโหลด = โชว์ภาพจริงไม่มีฟิลเตอร์ (ใส่เงาตัวอักษรให้ยังอ่านออก) · ไม่มีรูป = สีที่แอดมินเลือก หรือ gradient เริ่มต้น */}
      <div
        className={`relative bg-cover bg-center px-4 pb-[150px] pt-11 text-center sm:pb-[190px] sm:pt-14 ${
          heroImageUrl || homeContent.heroColor ? '' : 'bg-[linear-gradient(120deg,#2F6FE0,#2456B8)]'
        }`}
        style={
          heroImageUrl
            ? { backgroundImage: `url('${heroImageUrl}')`, backgroundPosition: homeContent.heroPos || 'center' }
            : homeContent.heroColor
              ? { background: homeContent.heroColor }
              : undefined
        }
      >
        <h1
          className="mx-auto max-w-3xl text-[26px] font-bold leading-tight tracking-tight text-white text-balance sm:text-[36px]"
          style={heroImageUrl ? { textShadow: '0 2px 12px rgba(0,0,0,0.55)' } : undefined}
        >
          {heroTitle}
        </h1>
        <p
          className="mt-2 text-[15px] text-[#EAF1FD] sm:text-[16px]"
          style={heroImageUrl ? { textShadow: '0 1px 8px rgba(0,0,0,0.6)' } : undefined}
        >
          {heroSubtitle}
        </p>
      </div>

      {/* ===== SEARCH CARD (floats over hero) ===== */}
      <div className="relative z-[2] mx-auto -mt-[120px] w-full max-w-[880px] px-4 sm:-mt-[140px]">
        {/* category tabs */}
        <div className="flex gap-1.5 pl-3.5">
          <button
            type="button"
            onClick={() => setCategory('monthly')}
            className={`flex items-center gap-2 rounded-t-xl px-6 py-3.5 text-[15px] font-semibold shadow-[0_-2px_8px_rgba(0,0,0,0.04)] ${
              !dailyMode ? 'bg-white text-tenant' : 'bg-white/55 text-[#3A3F49]'
            }`}
          >
            {!dailyMode && <span className="h-[9px] w-[9px] rounded-full bg-tenant" />}
            {t.tabMonthly}
          </button>
          <button
            type="button"
            onClick={() => setCategory('daily')}
            className={`flex items-center gap-2 rounded-t-xl px-6 py-3.5 text-[15px] font-semibold shadow-[0_-2px_8px_rgba(0,0,0,0.04)] ${
              dailyMode ? 'bg-white text-tenant' : 'bg-white/55 text-[#3A3F49]'
            }`}
          >
            {dailyMode && <span className="h-[9px] w-[9px] rounded-full bg-tenant" />}
            {t.tabDaily}
          </button>
        </div>

        {/* card */}
        <div className="rounded-[0_18px_18px_18px] bg-white p-4 shadow-[0_12px_40px_rgba(20,40,80,0.18)] sm:p-6">
          {/* main search field */}
          <div className="flex min-w-0 items-center gap-3 rounded-[14px] border-2 border-tenant px-4 py-3">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="shrink-0">
              <circle cx="11" cy="11" r="7" stroke="#2F6FE0" strokeWidth="2.2" />
              <path d="M16.5 16.5L21 21" stroke="#2F6FE0" strokeWidth="2.2" strokeLinecap="round" />
            </svg>
            <div className="min-w-0 flex-1">
              <div className="text-[12px] text-[#8A909B]">{t.fieldLabel}</div>
              <input
                ref={searchInputRef}
                value={q}
                onChange={(e) => {
                  setQ(e.target.value);
                  setSelectedPlace(null);
                }}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                placeholder={`${provinceLabel(province)} · ${currentDorms.length} ${t.dormsUnit}`}
                className="w-full truncate bg-transparent text-[17px] font-semibold text-ink-strong outline-none placeholder:font-semibold placeholder:text-ink-strong"
              />
            </div>
          </div>

          {/* sub fields */}
          <div className="mt-3.5 grid grid-cols-1 gap-3.5 sm:grid-cols-2">
            <label className="flex min-w-0 cursor-pointer items-center gap-3 rounded-[14px] border border-[#E4E7EC] px-4 py-3">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="shrink-0">
                <path d="M4 20v-9l8-6 8 6v9" stroke="#5B616C" strokeWidth="1.7" strokeLinejoin="round" />
                <rect x="9" y="13" width="6" height="7" stroke="#5B616C" strokeWidth="1.7" />
              </svg>
              <div className="min-w-0 flex-1">
                <div className="text-[12.5px] text-[#8A909B]">{t.roomType}</div>
                <select
                  value={roomType}
                  onChange={(e) => setRoomType(e.target.value)}
                  className="w-full appearance-none truncate bg-transparent text-[15px] font-semibold text-ink-strong outline-none"
                >
                  {roomTypeOptions.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
            </label>

            <label className="flex min-w-0 cursor-pointer items-center gap-3 rounded-[14px] border border-[#E4E7EC] px-4 py-3">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="shrink-0">
                <circle cx="12" cy="12" r="9" stroke="#5B616C" strokeWidth="1.7" />
                <path
                  d="M12 7v10M9.5 9.5c0-1.1 1.1-1.8 2.5-1.8s2.5.7 2.5 1.8-1.1 1.8-2.5 1.8-2.5.7-2.5 1.8 1.1 1.8 2.5 1.8 2.5-.7 2.5-1.8"
                  stroke="#5B616C"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                />
              </svg>
              <div className="min-w-0 flex-1">
                <div className="text-[12.5px] text-[#8A909B]">{t.budget}</div>
                <select
                  value={priceRange}
                  onChange={(e) => setPriceRange(e.target.value)}
                  className="w-full appearance-none truncate bg-transparent text-[15px] font-semibold text-ink-strong outline-none"
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

          <label className="mt-3 flex cursor-pointer items-center gap-2 px-1">
            <input
              type="checkbox"
              checked={availableOnly}
              onChange={(e) => setAvailableOnly(e.target.checked)}
              className="h-[18px] w-[18px] rounded accent-tenant"
            />
            <span className="text-[13px] text-[#3A4050]">{t.availableOnly}</span>
          </label>

          <button
            onClick={handleSearch}
            className="mt-4 flex h-[58px] w-full items-center justify-center gap-2 rounded-[14px] bg-tenant text-[19px] font-bold text-white hover:bg-tenant-dark"
          >
            <svg width="21" height="21" viewBox="0 0 24 24" fill="none">
              <circle cx="11" cy="11" r="7" stroke="#fff" strokeWidth="2.2" />
              <path d="M21 21l-4-4" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" />
            </svg>
            {t.searchBtn}
          </button>
        </div>

        {/* quick chips */}
        <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
          <span className="text-[13px] text-[#5B616C]">{t.popularLabel}</span>
          {t.chips.map((c) => (
            <span
              key={c}
              className="rounded-full border border-[#E4E7EC] bg-white px-3.5 py-1.5 text-[13px] font-medium text-[#3A4050]"
            >
              {c}
            </span>
          ))}
        </div>
      </div>

      {/* ===== PROMO STRIP ===== */}
      <div className="mx-auto max-w-[1240px] px-6 pt-8">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {promos.map((p, i) => (
            <div
              key={`${i}-${p.title}`}
              className={`relative h-[132px] overflow-hidden rounded-2xl p-5 shadow-[0_4px_14px_rgba(16,24,40,0.08)] ${
                i === 0
                  ? 'bg-gradient-to-br from-[#178F5A] to-[#12704A]'
                  : i === 1
                    ? 'bg-gradient-to-br from-[#2F6FE0] to-[#1E4FB0]'
                    : 'bg-gradient-to-br from-[#E0902F] to-[#D77A1E]'
              }`}
            >
              <div className="pointer-events-none absolute -right-5 -top-8 h-[130px] w-[130px] rounded-full bg-white/[0.14]" />
              <div className="relative">
                <div
                  className={`inline-block rounded-full bg-white px-2.5 py-1 text-[11px] font-bold ${
                    i === 0 ? 'text-[#12704A]' : i === 1 ? 'text-tenant' : 'text-[#C77B14]'
                  }`}
                >
                  {p.tag}
                </div>
                <div className="mt-2.5 text-[17px] font-bold leading-snug text-white">{p.title}</div>
                <div className="mt-1 text-[13px] text-white/85">{p.sub}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ===== POPULAR ZONES (จังหวัดจริง) ===== */}
      {topProvinces.length > 0 && (
        <div className="mx-auto max-w-[1240px] px-6 pt-10">
          <div className="mb-4 flex items-end justify-between">
            <div>
              <div className="text-2xl font-bold tracking-tight">{zonesTitle}</div>
              <div className="mt-1 text-sm text-[#8A909F]">{zonesSub}</div>
            </div>
            <Link href="/search" className="text-sm font-semibold text-tenant">
              {t.viewAllZones}
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {topProvinces.map((z, i) => {
              const areaImage = areaImages[z.province];
              return (
              <Link
                key={z.province}
                href={`/search?province=${encodeURIComponent(z.province)}`}
                className={`group relative block h-[200px] overflow-hidden rounded-[18px] bg-cover bg-center shadow-[0_4px_14px_rgba(16,24,40,0.1)] transition-transform hover:-translate-y-1 ${
                  areaImage
                    ? ''
                    : ['bg-gradient-to-br from-[#3E5C8A] to-[#1E4FB0]', 'bg-gradient-to-br from-[#2E7D5B] to-[#178F5A]', 'bg-gradient-to-br from-[#6B4EA0] to-[#7C4DE0]', 'bg-gradient-to-br from-[#8A6D3B] to-[#C79A4B]'][i % 4]
                }`}
                style={areaImage ? { backgroundImage: `url('${areaImage}')` } : undefined}
              >
                <div className="absolute inset-0 bg-gradient-to-t from-[rgba(11,13,18,0.78)] via-transparent to-transparent" />
                <div className="absolute bottom-4 left-4 right-3">
                  <div className="text-lg font-bold text-white">{provinceLabel(z.province)}</div>
                  <div className="mt-0.5 text-[12.5px] text-white/82">
                    {t.zoneCount(z.count)}
                    {z.cheapest != null && ` · ${t.zoneFrom(`฿${z.cheapest.toLocaleString()}`)}`}
                  </div>
                </div>
              </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* ===== RECOMMENDED DORMS (คะแนนรีวิวจริงสูงสุด) ===== */}
      {topDorms.length > 0 && (
        <div className="mx-auto max-w-[1240px] px-6 pt-11">
          <div className="mb-4 text-2xl font-bold tracking-tight">{t.trendingTitle}</div>
          <div className="grid grid-cols-1 gap-[18px] sm:grid-cols-2 lg:grid-cols-4">
            {topDorms.map((d) => {
              const isFavorited = favoriteIds.has(d.id);
              const cheapest = cheapestOf([d]);
              return (
                <Link
                  key={d.id}
                  href={`/dorms/${d.id}`}
                  className="block overflow-hidden rounded-2xl border border-[#EAEDF2] bg-white shadow-[0_2px_6px_rgba(16,24,40,0.05)] transition-all hover:-translate-y-1 hover:shadow-[0_16px_36px_rgba(16,24,40,0.14)]"
                >
                  <div className="relative h-[150px] bg-surface-canvas">
                    {d.images?.[0] ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={d.images[0]} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full items-center justify-center font-mono text-xs text-ink-faint">
                        {t.photoPlaceholder}
                      </div>
                    )}
                    <FavoriteButton active={isFavorited} onToggle={() => toggle(d.id)} />
                  </div>
                  <div className="p-3.5">
                    <div className="mb-1 flex items-center gap-1.5">
                      <StarRating rating={d.avgRating} count={d.reviewCount} />
                    </div>
                    <div className="truncate text-[15px] font-bold tracking-tight">{d.name}</div>
                    <div className="mt-1 truncate text-xs text-[#8A909F]">{d.university ?? provinceLabel(d.province)}</div>
                    <div className="mt-2.5 border-t border-[#F0F2F6] pt-2.5">
                      {cheapest != null ? (
                        <>
                          <span className="text-[11px] text-[#9AA0AB]">{lang === 'th' ? 'เริ่มต้น ' : 'From '}</span>
                          <span className="font-sans text-[19px] font-bold text-tenant">฿{cheapest.toLocaleString()}</span>
                          <span className="text-xs text-[#9AA0AB]"> {perUnit}</span>
                        </>
                      ) : (
                        <span className="text-xs text-ink-faint">{t.full}</span>
                      )}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* ===== PROVINCE SELECTOR + BROWSE ===== */}
      <div className="mx-auto mt-11 flex max-w-[1240px] items-center gap-3.5 px-6">
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

      <div className="mx-auto mt-5 max-w-[1240px] px-6">
        <div className="mb-3.5 flex items-baseline gap-2.5">
          <div className="text-[22px] font-bold">{t.dormsIn(provinceLabel(province))}</div>
          <span className="text-sm text-ink-muted">{t.nearbyCount(visibleCurrentDorms.length)}</span>
        </div>

        {visibleCurrentDorms.length === 0 ? (
          <p className="text-ink-faint">{dailyMode ? t.noDailyDorms : t.noDorms}</p>
        ) : (
          <div className="grid grid-cols-1 gap-[18px] sm:grid-cols-2 lg:grid-cols-4">
            {visibleCurrentDorms.slice(0, 4).map((d) => {
              const okRooms = d.rooms.filter(roomOk);
              const startingRoom = [...okRooms].sort((a, b) => roomPrice(a) - roomPrice(b))[0];
              const isFavorited = favoriteIds.has(d.id);
              return (
                <Link
                  key={d.id}
                  href={`/dorms/${d.id}`}
                  className="block overflow-hidden rounded-card-lg border border-[#E7E9EC] bg-white shadow-card hover:shadow-card-hover"
                >
                  <div className="relative h-[150px] bg-surface-canvas">
                    {d.images?.[0] ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={d.images[0]} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full items-center justify-center font-mono text-xs text-ink-faint">
                        {t.photoPlaceholder}
                      </div>
                    )}
                    <FavoriteButton active={isFavorited} onToggle={() => toggle(d.id)} />
                  </div>
                  <div className="p-3.5">
                    <div className="flex items-center justify-between gap-2">
                      <div className="truncate text-[15.5px] font-bold">{d.name}</div>
                      <StarRating rating={d.avgRating} count={d.reviewCount} />
                    </div>
                    <div className="mt-0.5 truncate text-[13px] text-ink-muted">
                      {d.university ?? provinceLabel(d.province)}
                      {myLocation && (
                        <span className="text-tenant"> · {t.distanceAway(haversineKm(myLocation.lat, myLocation.lng, d.lat, d.lng))}</span>
                      )}
                    </div>
                    <div className="mt-2.5 text-sm">
                      {startingRoom ? (
                        <>
                          <b className="font-sans text-lg">฿{roomPrice(startingRoom).toLocaleString()}</b>
                          <span className="text-ink-muted"> {perUnit}</span>
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

      {/* ===== TRUST BADGES ===== */}
      <div className="mx-auto max-w-[1240px] px-6 pt-12">
        <div className="grid grid-cols-1 gap-6 rounded-[20px] border border-[#EAEDF2] bg-white p-7 shadow-[0_2px_8px_rgba(16,24,40,0.05)] sm:grid-cols-2 lg:grid-cols-4">
          {trustCards.map((tr, i) => (
            <div key={i} className={`flex items-start gap-3.5 ${i < 3 ? 'sm:border-r sm:border-[#EEF1F6] sm:pr-5' : ''}`}>
              <div
                className={`flex h-[46px] w-[46px] shrink-0 items-center justify-center rounded-[13px] ${
                  ['bg-[#EAF1FF]', 'bg-[#E7F7EF]', 'bg-[#F3ECFF]', 'bg-[#FFF1EC]'][i % 4]
                }`}
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                  <path
                    d={
                      [
                        'M12 3v18M8 7h5a3 3 0 010 6H9a3 3 0 000 6h6',
                        'M12 3l7 4v5c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V7l7-4z',
                        'M12 2l2.9 6.2 6.8.7-5.1 4.6 1.5 6.7L12 17.8',
                        'M20 12a8 8 0 11-16 0 8 8 0 0116 0zM9 9l6 6M15 9l-6 6',
                      ][i % 4]
                    }
                    stroke={['#2F6FE0', '#178F5A', '#7C4DE0', '#E0692F'][i % 4]}
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
              <div>
                <div className="text-[15px] font-bold">{tr.title}</div>
                <div className="mt-0.5 text-[12.5px] leading-relaxed text-[#8A909F]">{tr.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ===== FOOTER ===== */}
      <div className="mt-14 border-t border-[#E4E7EC] bg-white pt-11">
        <div className="mx-auto max-w-[1240px] px-6">
          <div className="grid grid-cols-2 gap-8 sm:grid-cols-5">
            <div className="col-span-2 max-w-[290px] sm:col-span-1">
              <div className="flex items-center gap-2.5">
                <span className="flex h-[34px] w-[34px] items-center justify-center rounded-[9px] bg-tenant font-sans text-xl font-extrabold text-white">
                  H
                </span>
                <span className="text-[18px] font-bold text-ink-strong">
                  Hoprak<span className="text-tenant">.com</span>
                </span>
              </div>
              <div className="mt-3.5 text-[13px] leading-relaxed text-[#7A808B]">
                แพลตฟอร์มหาหอพักใกล้มหาวิทยาลัย โปร่งใส ปลอดภัย สนับสนุนโดยหอการค้าจังหวัดมหาสารคาม
              </div>
            </div>
            <div>
              <div className="mb-4 text-[15px] font-bold text-ink-strong">{t.footerHelp}</div>
              <div className="flex flex-col gap-3 text-[14px] text-[#5B616C]">
                {t.helpLinks.map((s) => (
                  <span key={s}>{s}</span>
                ))}
              </div>
            </div>
            <div>
              <div className="mb-4 text-[15px] font-bold text-ink-strong">{t.footerAbout}</div>
              <div className="flex flex-col gap-3 text-[14px] text-[#5B616C]">
                {t.aboutLinks.map((s) => (
                  <span key={s}>{s}</span>
                ))}
              </div>
            </div>
            <div>
              <div className="mb-4 text-[15px] font-bold text-ink-strong">{t.footerOwner}</div>
              <div className="flex flex-col gap-3 text-[14px] text-[#5B616C]">
                <Link href="/partner-register" className="hover:text-tenant">
                  {t.listDorm}
                </Link>
                <Link href="/partner-login" className="hover:text-tenant">
                  {t.ownerLogin}
                </Link>
                {t.ownerLinksExtra.map((s) => (
                  <span key={s}>{s}</span>
                ))}
              </div>
            </div>
            <div>
              <div className="mb-4 text-[15px] font-bold text-ink-strong">{t.footerPolicy}</div>
              <div className="flex flex-col gap-3 text-[14px] text-[#5B616C]">
                {t.policyLinks.map((s) => (
                  <span key={s}>{s}</span>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-9 flex flex-wrap items-center gap-4 border-t border-[#EDEFF3] py-7">
            <span className="text-[13px] text-[#8A909B]">{t.sponsoredBy}</span>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/yec-mahasarakham.png" alt="YEC Mahasarakham" className="h-14 w-auto" />
          </div>
        </div>

        {/* dark bottom bar */}
        <div className="bg-[#14171C] px-6 py-6">
          <div className="mx-auto flex max-w-[1240px] flex-wrap items-center gap-3">
            <span className="flex h-8 w-8 items-center justify-center rounded-[9px] bg-tenant font-sans font-bold text-white">
              H
            </span>
            <span className="text-sm font-bold text-white">Hoprak.com</span>
            <span className="ml-auto text-[13px] text-[#5B616C]">{t.copyright}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
