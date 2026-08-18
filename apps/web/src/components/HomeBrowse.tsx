'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { PROVINCES, MSK_PROVINCE, MSK_DISTRICTS, addressInDistrict, findDistrict } from '@hopak/shared';
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

interface Landmark {
  id: string;
  name: string;
  district: string;
  province: string;
  imageUrl: string | null;
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
import { HopakIcon } from '@/components/HopakIcon';
import { MobileHomeChrome, MobileMenuButton } from '@/components/home/MobileHomeChrome';

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
    landmarkTitle: 'ใกล้สถานที่สำคัญ',
    landmarkSub: 'เลือกสถานที่ แล้วดูหอพักในอำเภอเดียวกัน',
    viewAllZones: 'ดูทั้งหมด →',
    selectProvince: 'เลือกจังหวัด',
    zoneCount: (n: number) => `${n} หอพัก`,
    zoneFrom: (p: string) => `เริ่ม ${p}`,
    trendingTitle: 'หอพักแนะนำ',
    trendingSub: 'คะแนนรีวิวสูงสุดจากผู้เช่าจริง',
    dormsIn: (p: string) => `หอพักใน${p}`,
    nearbyCount: (n: number) => `${n} หอพักใกล้เคียง`,
    distanceAway: (km: number) => (km < 1 ? `ห่างคุณ ${Math.round(km * 1000)} ม.` : `ห่างคุณ ${km.toFixed(1)} กม.`),
    noDorms: 'ยังไม่มีหอพักในจังหวัดนี้',
    noDailyDorms: 'ยังไม่มีหอพักรายวันในจังหวัดนี้',
    perMonth: '/ เดือน',
    perNight: '/ คืน',
    full: 'ห้องเต็ม',
    popular: 'ยอดฮิต',
    roomsAvailable: (n: number) => `ว่าง ${n} ห้อง`,
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
    ownerLearnMore: 'เรียนรู้เพิ่มเติม',
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
    landmarkTitle: 'Near landmarks',
    landmarkSub: 'Pick a place, see dorms in the same district',
    viewAllZones: 'View all →',
    selectProvince: 'Select province',
    zoneCount: (n: number) => `${n} dorms`,
    zoneFrom: (p: string) => `From ${p}`,
    trendingTitle: 'Recommended dorms',
    trendingSub: 'Highest rated by real tenants',
    dormsIn: (p: string) => `Dorms in ${p}`,
    nearbyCount: (n: number) => `${n} nearby dorms`,
    distanceAway: (km: number) => (km < 1 ? `${Math.round(km * 1000)} m from you` : `${km.toFixed(1)} km from you`),
    noDorms: 'No dorms in this province yet',
    noDailyDorms: 'No daily rentals in this province yet',
    perMonth: '/ month',
    perNight: '/ night',
    full: 'Fully booked',
    popular: 'Popular',
    roomsAvailable: (n: number) => `${n} room${n > 1 ? 's' : ''} left`,
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
    ownerLearnMore: 'Learn more',
    ownerLinksExtra: ['Fees & commission', 'Owner guide'],
    footerPolicy: 'Terms & Policies',
    policyLinks: ['Terms of use', 'Privacy policy', 'Cookie policy'],
    sponsoredBy: 'Supported by',
    copyright: '© 2026 Hoprak.com · All rights reserved',
  },
} satisfies Record<Lang, Record<string, unknown>>;

/**
 * การ์ดทำเลยอดนิยม — แอดมินใส่ได้หลายรูปต่อจังหวัด เลื่อนดูได้เอง (ลูกศร/จุด) และเลื่อนอัตโนมัติทุก 4 วิ
 * ทั้งการ์ดเป็นลิงก์ไปหน้าค้นหา ปุ่มเลื่อนเลยต้อง preventDefault กันหลุดไปหน้าอื่น
 */
/**
 * หัวข้อหมวดของหน้าแรก — เดิมแต่ละหมวดเขียนเอง ขนาดตัวอักษรกับระยะห่างไม่ตรงกันสักอัน
 * (2xl บ้าง 22px บ้าง 17px บ้าง บางอันคำอธิบายอยู่บรรทัดเดียวกับหัวข้อ) รวมมาไว้ที่เดียว
 */
function SectionHead({ title, sub, action }: { title: string; sub?: string; action?: React.ReactNode }) {
  return (
    <div className="mb-4 flex flex-col items-start gap-3 sm:flex-row sm:items-end sm:justify-between sm:gap-4">
      <div className="min-w-0">
        <h2 className="text-[22px] font-bold tracking-tight text-ink-strong sm:text-[26px]">{title}</h2>
        {sub && <div className="mt-1 text-[13.5px] text-[#8A909F]">{sub}</div>}
      </div>
      {action}
    </div>
  );
}

/** ทำเลยอดนิยม (การ์ดรายจังหวัด) — ปิดไว้ชั่วคราวตามที่สั่ง เปลี่ยนเป็น true เพื่อเอากลับ */
const SHOW_POPULAR_ZONES = false;

function ZoneCard({
  href,
  images,
  fallbackClass,
  title,
  subtitle,
}: {
  href: string;
  images: string[];
  fallbackClass: string;
  title: string;
  subtitle: string;
}) {
  const [idx, setIdx] = useState(0);
  const [paused, setPaused] = useState(false);
  const many = images.length > 1;

  useEffect(() => {
    if (!many || paused) return;
    const timer = setInterval(() => setIdx((i) => (i + 1) % images.length), 4000);
    return () => clearInterval(timer);
  }, [many, paused, images.length]);

  const step = (e: React.MouseEvent, dir: 1 | -1) => {
    e.preventDefault();
    e.stopPropagation();
    setIdx((i) => (i + dir + images.length) % images.length);
  };

  return (
    <Link
      href={href}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      className={`group relative block h-[200px] overflow-hidden rounded-[18px] shadow-[0_4px_14px_rgba(16,24,40,0.1)] transition-transform hover:-translate-y-1 ${
        images.length ? 'bg-[#0B0D12]' : fallbackClass
      }`}
    >
      {images.map((src, i) => (
        <div
          key={src}
          className={`absolute inset-0 bg-cover bg-center transition-opacity duration-500 ${
            i === idx ? 'opacity-100' : 'opacity-0'
          }`}
          style={{ backgroundImage: `url('${src}')` }}
        />
      ))}
      {/* ไล่เฉดสูงขึ้นและเข้มขึ้น — ของเดิมจางเกินจนตัวหนังสือขาวจมไปกับรูปสว่าง */}
      <div className="absolute inset-0 bg-gradient-to-t from-[rgba(11,13,18,0.88)] via-[rgba(11,13,18,0.28)] to-transparent" />

      {many && (
        <>
          <button
            type="button"
            aria-label="prev"
            onClick={(e) => step(e, -1)}
            className="absolute left-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-black/45 text-white opacity-0 backdrop-blur transition group-hover:opacity-100"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M15 6l-6 6 6 6" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <button
            type="button"
            aria-label="next"
            onClick={(e) => step(e, 1)}
            className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-black/45 text-white opacity-0 backdrop-blur transition group-hover:opacity-100"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M9 6l6 6-6 6" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <div className="absolute right-3 top-3 flex gap-1.5">
            {images.map((src, i) => (
              <button
                key={src}
                type="button"
                aria-label={`photo ${i + 1}`}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIdx(i);
                }}
                className={`h-[6px] rounded-full transition-all ${
                  i === idx ? 'w-[16px] bg-white' : 'w-[6px] bg-white/55'
                }`}
              />
            ))}
          </div>
        </>
      )}

      <div className="absolute bottom-4 left-4 right-3">
        <div className="text-lg font-bold text-white">{title}</div>
        <div className="mt-0.5 text-[12.5px] text-white/85">{subtitle}</div>
      </div>
    </Link>
  );
}

export function HomeBrowse({ dailyMode }: { dailyMode: boolean }) {
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
  // เมนูแฮมเบอร์เกอร์ของมือถือ — จอเล็กใส่ปุ่มบนหัวไม่พอ ย้ายไปไว้ในลิ้นชักแทน
  const [menuOpen, setMenuOpen] = useState(false);
  const [province, setProvince] = useState<string>(PROVINCES[0]);
  const [open, setOpen] = useState(false);
  const [roomType, setRoomType] = useState('all');
  const [priceRange, setPriceRange] = useState('all');
  const [availableOnly, setAvailableOnly] = useState(false);
  const [q, setQ] = useState('');
  const [selectedPlace, setSelectedPlace] = useState<{ lat: number; lng: number; name: string } | null>(null);
  // จังหวัดละหลายรูปได้ — การ์ดทำเลยอดนิยมเลื่อนดูทีละรูป
  const [areaImages, setAreaImages] = useState<Record<string, string[]>>({});
  // สถานที่สำคัญรายอำเภอ (ดึงจาก Google Places ไว้แล้ว เก็บใน DB ฝั่งเรา) — ไม่มีก็ไม่พัง แค่ไม่โชว์
  const [landmarks, setLandmarks] = useState<Landmark[]>([]);
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
        areaImages: Record<string, string[]>;
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

  // สถานที่สำคัญรายอำเภอ — อ่านจาก DB ของเราเอง (แอดมิน sync จาก Google Places ไว้แล้ว)
  // ไม่มีข้อมูล = ไม่โชว์ส่วนนี้ ไม่กระทบอย่างอื่น
  useEffect(() => {
    apiClient
      .get<Landmark[]>(`/landmarks?province=${encodeURIComponent(MSK_PROVINCE)}`)
      .then(setLandmarks)
      .catch(() => setLandmarks([]));
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
  const topSearchPlaceholder = useTypewriter(t.topSearchPhrases);

  // ช่องค้นหาบนหัวมีข้อความพิมพ์เองอยู่ แต่ซ่อนบนจอเล็ก (sm:flex)
  // จอเล็กเลยย้ายข้อความนั้นมาเป็น placeholder ของช่องค้นหาใน hero แทน
  // placeholder เป็น prop ไม่ใช่ CSS ทำด้วย media query ไม่ได้ ต้องรู้ขนาดจอจริง
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 639px)');
    const sync = () => setIsMobile(mq.matches);
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, []);
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

  // รายเดือนกับรายวันแยกขาดจากกัน — ห้องหนึ่งเป็นได้อย่างเดียว (allowDaily เป็นตัวแบ่ง)
  // รายวันใช้ pricePerDay, รายเดือนใช้ pricePerMonth และต้องไม่เห็นห้องรายวันเลย
  const roomOk = (r: (typeof dorms)[number]['rooms'][number]) =>
    r.status.toUpperCase() === 'AVAILABLE' &&
    (dailyMode ? Boolean(r.allowDaily) && (r.pricePerDay ?? 0) > 0 : !r.allowDaily);
  const roomPrice = (r: (typeof dorms)[number]['rooms'][number]) => (dailyMode ? r.pricePerDay ?? 0 : r.pricePerMonth);

  // แต่ละโหมดแสดงเฉพาะหอที่มีห้องของโหมดนั้นอย่างน้อย 1 ห้อง
  const catDorms = useMemo(
    () =>
      dailyMode
        ? dorms.filter((d) => d.rooms.some((r) => r.allowDaily && (r.pricePerDay ?? 0) > 0))
        : dorms.filter((d) => d.rooms.some((r) => !r.allowDaily)),
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

  // จำนวนหอรายอำเภอของมหาสารคาม — ใช้กรอง/นับให้การ์ด "ใกล้สถานที่สำคัญ" เท่านั้น (ไม่มีหมวดทำเลย่อยบนหน้าแรกแล้ว)
  // ระบบไม่มีฟิลด์อำเภอ จับจากข้อความ address ของหอตรงๆ นับเฉพาะอำเภอที่มีหอจริง
  const mskDistricts = useMemo(() => {
    const list = byProvince.get(MSK_PROVINCE) ?? [];
    if (!list.length) return [];
    return MSK_DISTRICTS.map(({ name }) => {
      const inDistrict = list.filter((d) => addressInDistrict(d.address, name));
      return { district: name, count: inDistrict.length, cheapest: cheapestOf(inDistrict) };
    })
      .filter((z) => z.count > 0)
      .sort((a, b) => b.count - a.count);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [byProvince, dailyMode]);

  // สถานที่สำคัญที่ "มีหอพักในอำเภอเดียวกัน" เท่านั้น — โชว์ที่ที่กดแล้วไม่เจอหอเลยไม่มีประโยชน์
  const landmarkCards = useMemo(() => {
    const countByDistrict = new Map(mskDistricts.map((d) => [d.district, d]));
    return landmarks
      .map((l) => ({ ...l, zone: countByDistrict.get(l.district) }))
      .filter((l) => l.zone && l.zone.count > 0)
      .slice(0, 8);
  }, [landmarks, mskDistricts]);

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
    <div className="overflow-x-hidden bg-[#F2F4F8] pb-[76px] text-[#161A22] sm:pb-0">
      {/* ===== TOP HEADER ===== */}
      <div className="bg-gradient-to-b from-[#0E1220] to-[#151C30]">
        <div className="mx-auto flex h-auto min-h-[58px] max-w-[1240px] items-center gap-x-2.5 px-3 py-2 sm:min-h-[62px] sm:gap-x-5 sm:px-6 sm:py-2.5">
          <Link href="/" className="flex shrink-0 items-center gap-2">
            <HopakIcon size={30} className="sm:hidden" />
            <HopakIcon size={34} className="hidden sm:block" />
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

          <div className="ml-auto flex min-w-0 items-center gap-2 sm:gap-5">
            {/* จอเล็ก: ทุกอย่างยกไปอยู่ในเมนูแฮมเบอร์เกอร์ (เหลือแค่กระดิ่งแจ้งเตือน) */}
            <div className="hidden sm:block">
              <LangSwitch lang={lang} onChange={setLang} dark />
            </div>

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
                      className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] bg-white/15 text-white hover:bg-white/25 sm:h-9 sm:w-9 sm:rounded-[11px]"
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
                  <Link
                    href="/profile"
                    title={user.name}
                    className="hidden min-w-0 items-center gap-2 text-[13.5px] font-semibold text-white hover:underline sm:flex"
                  >
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white/15 text-xs font-bold text-white sm:h-7 sm:w-7">
                      {user.avatarUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={user.avatarUrl} alt="" className="h-full w-full object-cover" />
                      ) : (
                        user.name.charAt(0)
                      )}
                    </span>
                    {/* ชื่อยาวทำให้แถวหัวแตกบนมือถือ — โชว์เฉพาะจอ sm ขึ้นไป */}
                    <span className="hidden max-w-[140px] truncate sm:inline">{user.name}</span>
                  </Link>

                  {/* ออกจากระบบ — มือถือเป็นปุ่มไอคอนกลม จอใหญ่มีข้อความกำกับ */}
                  <button
                    onClick={handleLogout}
                    title={t.logout}
                    aria-label={t.logout}
                    className="hidden h-9 shrink-0 items-center justify-center gap-1.5 rounded-pill bg-[#F0604D]/15 px-3.5 text-[13px] font-semibold text-[#FF9382] transition hover:bg-[#F0604D]/25 hover:text-white sm:flex"
                  >
                    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" className="shrink-0">
                      <path
                        d="M15 17l5-5-5-5M20 12H9M9 4H6a2 2 0 00-2 2v12a2 2 0 002 2h3"
                        stroke="currentColor"
                        strokeWidth="1.9"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                    <span className="hidden sm:inline">{t.logout}</span>
                  </button>
                </>
              ) : (
                <>
                  <Link
                    href="/register"
                    className="hidden h-9 shrink-0 items-center rounded-lg border border-white/28 px-4 text-[13.5px] font-semibold text-white sm:flex"
                  >
                    {t.register}
                  </Link>
                  <Link
                    href="/login"
                    className="hidden h-9 shrink-0 items-center rounded-lg bg-tenant px-[17px] text-[13.5px] font-semibold text-white sm:flex"
                  >
                    {t.login}
                  </Link>
                </>
              ))}

            <MobileMenuButton open={menuOpen} onClick={() => setMenuOpen((v) => !v)} label={lang === 'th' ? 'เมนู' : 'Menu'} />
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
            onClick={() => router.push('/')}
            className={`flex items-center gap-2 rounded-t-xl px-6 py-3.5 text-[15px] font-semibold shadow-[0_-2px_8px_rgba(0,0,0,0.04)] ${
              !dailyMode ? 'bg-white text-tenant' : 'bg-white/55 text-[#3A3F49]'
            }`}
          >
            {!dailyMode && <span className="h-[9px] w-[9px] rounded-full bg-tenant" />}
            {t.tabMonthly}
          </button>
          <button
            type="button"
            onClick={() => router.push('/daily')}
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
                placeholder={
                  isMobile
                    ? topSearchPlaceholder
                    : `${provinceLabel(province)} · ${currentDorms.length} ${t.dormsUnit}`
                }
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

      {/* ===== RECOMMENDED DORMS (คะแนนรีวิวจริงสูงสุด) ===== */}
      {topDorms.length > 0 && (
        <div className="mx-auto max-w-[1240px] px-6 pt-12">
          <SectionHead title={t.trendingTitle} sub={t.trendingSub} />
          <div className="grid grid-cols-1 gap-[18px] sm:grid-cols-2 lg:grid-cols-4">
            {topDorms.map((d) => {
              const isFavorited = favoriteIds.has(d.id);
              const cheapest = cheapestOf([d]);
              return (
                <Link
                  key={d.id}
                  href={`/dorms/${d.id}${dailyMode ? '?rental=daily' : ''}`}
                  className="flex h-full flex-col overflow-hidden rounded-2xl border border-[#EAEDF2] bg-white shadow-[0_2px_6px_rgba(16,24,40,0.05)] transition-all hover:-translate-y-1 hover:shadow-[0_16px_36px_rgba(16,24,40,0.14)]"
                >
                  <div className="relative h-[150px] shrink-0 bg-surface-canvas">
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
                  <div className="flex flex-1 flex-col p-3.5">
                    <div className="mb-1 flex items-center gap-1.5">
                      <StarRating rating={d.avgRating} count={d.reviewCount} />
                    </div>
                    <div className="truncate text-[15px] font-bold tracking-tight">{d.name}</div>
                    {d.university && <div className="mt-1 truncate text-xs text-[#8A909F]">{d.university}</div>}
                    {/* ทำเล — อำเภอ (จับจาก address) + จังหวัด */}
                    <div className="mt-1 flex items-center gap-1 text-xs text-[#8A909F]">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" className="shrink-0">
                        <path d="M21 10c0 6-9 12-9 12s-9-6-9-12a9 9 0 1118 0z" stroke="#9AA0AB" strokeWidth="2" />
                        <circle cx="12" cy="10" r="3" stroke="#9AA0AB" strokeWidth="2" />
                      </svg>
                      <span className="truncate">
                        {[findDistrict(d.address), provinceLabel(d.province)].filter(Boolean).join(' · ')}
                      </span>
                    </div>
                    <div className="mt-auto border-t border-[#F0F2F6] pt-2.5">
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

      {/* ===== PROVINCE SELECTOR + BROWSE =====
          ตัวเลือกจังหวัดอยู่ในหัวหมวดเลย ของเดิมลอยเป็นแถวเดี่ยวเหนือหัวข้อ ดูไม่รู้ว่าคุมอะไร */}
      <div className="mx-auto mt-12 max-w-[1240px] px-6">
        <SectionHead
          title={t.dormsIn(provinceLabel(province))}
          sub={t.nearbyCount(visibleCurrentDorms.length)}
          action={
            <div className="flex w-full shrink-0 items-center gap-3 sm:w-auto">
              {visibleCurrentDorms.length > 4 && (
                <Link
                  href={`/search?province=${encodeURIComponent(province)}`}
                  className="hidden text-sm font-semibold text-tenant sm:inline"
                >
                  {t.viewAllZones}
                </Link>
              )}
      <div className="relative w-full sm:w-[230px] sm:shrink-0">
        <button
          type="button"
          aria-label={t.selectProvince}
          onClick={() => setOpen((v) => !v)}
          className="flex h-[44px] w-full cursor-pointer items-center gap-2.5 rounded-xl border border-[#D8DCE2] bg-white px-3.5 shadow-[0_1px_3px_rgba(0,0,0,0.05)]"
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
          <span className="flex-1 truncate text-left text-[15px] font-semibold text-ink-strong">{provinceLabel(province)}</span>
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }}
          >
            <path d="M6 9l6 6 6-6" stroke="#8A909B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>

        {open && (
          <div className="absolute right-0 top-12 z-10 w-[260px] rounded-xl border border-card-border bg-white p-1.5 shadow-[0_12px_30px_rgba(20,40,80,0.16)]">
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
          }
        />

        {visibleCurrentDorms.length === 0 ? (
          <p className="text-ink-faint">{dailyMode ? t.noDailyDorms : t.noDorms}</p>
        ) : (
          <div className="grid grid-cols-1 gap-[18px] sm:grid-cols-2 lg:grid-cols-4">
            {visibleCurrentDorms.slice(0, 4).map((d) => {
              const okRooms = d.rooms.filter(roomOk);
              const startingRoom = [...okRooms].sort((a, b) => roomPrice(a) - roomPrice(b))[0];
              const isFavorited = favoriteIds.has(d.id);
              // ยอดฮิต = รีวิวดี (คะแนน ≥ 4.5 จากรีวิวอย่างน้อย 3 ครั้ง)
              const isPopular = (d.avgRating ?? 0) >= 4.5 && (d.reviewCount ?? 0) >= 3;
              return (
                <Link
                  key={d.id}
                  href={`/dorms/${d.id}${dailyMode ? '?rental=daily' : ''}`}
                  className="flex h-full flex-col overflow-hidden rounded-card-lg border border-[#E7E9EC] bg-white shadow-card transition-all hover:-translate-y-1 hover:shadow-card-hover"
                >
                  <div className="relative h-[150px] shrink-0 bg-surface-canvas">
                    {d.images?.[0] ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={d.images[0]} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full items-center justify-center font-mono text-xs text-ink-faint">
                        {t.photoPlaceholder}
                      </div>
                    )}
                    {isPopular && (
                      <span className="absolute left-2.5 top-2.5 z-[1] inline-flex items-center gap-1 rounded-full bg-[#FF6B35] px-2.5 py-1 text-[11px] font-bold text-white shadow">
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M12 2c1 3-1 4-2 6-1 2 0 4 2 4s2-2 1-4c3 1 5 4 5 7a6 6 0 11-12 0c0-4 3-6 6-13z" />
                        </svg>
                        {t.popular}
                      </span>
                    )}
                    <FavoriteButton active={isFavorited} onToggle={() => toggle(d.id)} />
                  </div>
                  <div className="flex flex-1 flex-col p-3.5">
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
                    <div className="mt-auto flex items-baseline justify-between gap-2 pt-2.5 text-sm">
                      {startingRoom ? (
                        <span>
                          <b className="font-sans text-lg">฿{roomPrice(startingRoom).toLocaleString()}</b>
                          <span className="text-ink-muted"> {perUnit}</span>
                        </span>
                      ) : (
                        <span className="text-ink-faint">{t.full}</span>
                      )}
                      {okRooms.length > 0 && (
                        <span className="shrink-0 rounded-full bg-success-tint px-2 py-0.5 text-[11.5px] font-semibold text-success">
                          {t.roomsAvailable(okRooms.length)}
                        </span>
                      )}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {/* ===== POPULAR ZONES (จังหวัดจริง) =====
          ปิดไว้ก่อนตามที่สั่ง — เปิดกลับด้วยการตั้ง SHOW_POPULAR_ZONES = true */}
      {SHOW_POPULAR_ZONES && topProvinces.length > 0 && (
        <div className="mx-auto max-w-[1240px] px-6 pt-12">
          {SHOW_POPULAR_ZONES && (
          <SectionHead
            title={zonesTitle}
            sub={zonesSub}
            action={
              <Link href="/search" className="shrink-0 text-sm font-semibold text-tenant">
                {t.viewAllZones}
              </Link>
            }
          />
          )}
          {SHOW_POPULAR_ZONES && (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {topProvinces.map((z, i) => (
              <ZoneCard
                key={z.province}
                href={`/search?province=${encodeURIComponent(z.province)}`}
                images={areaImages[z.province] ?? []}
                fallbackClass={
                  [
                    'bg-gradient-to-br from-[#3E5C8A] to-[#1E4FB0]',
                    'bg-gradient-to-br from-[#2E7D5B] to-[#178F5A]',
                    'bg-gradient-to-br from-[#6B4EA0] to-[#7C4DE0]',
                    'bg-gradient-to-br from-[#8A6D3B] to-[#C79A4B]',
                  ][i % 4]
                }
                title={provinceLabel(z.province)}
                subtitle={`${t.zoneCount(z.count)}${
                  z.cheapest != null ? ` · ${t.zoneFrom(`฿${z.cheapest.toLocaleString()}`)}` : ''
                }`}
              />
            ))}
          </div>
          )}
        </div>
      )}

      {/* ===== ใกล้สถานที่สำคัญ — ปิดท้ายหน้า ===== */}
        {/* สถานที่สำคัญรายอำเภอ — กดแล้วไปดูหอในอำเภอเดียวกันนั้น */}
      {landmarkCards.length > 0 && (
        <div className="mx-auto max-w-[1240px] px-6 pt-12">
            <SectionHead title={t.landmarkTitle} sub={t.landmarkSub} />
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {landmarkCards.map((l, i) => (
                <Link
                  key={l.id}
                  href={`/search?province=${encodeURIComponent(l.province)}&district=${encodeURIComponent(l.district)}`}
                  className={`group relative block h-[132px] overflow-hidden rounded-[15px] shadow-[0_4px_14px_rgba(16,24,40,0.1)] transition-transform hover:-translate-y-1 ${
                    l.imageUrl
                      ? 'bg-[#0B0D12]'
                      : [
                          'bg-gradient-to-br from-[#3E5C8A] to-[#1E4FB0]',
                          'bg-gradient-to-br from-[#2E7D5B] to-[#178F5A]',
                          'bg-gradient-to-br from-[#6B4EA0] to-[#7C4DE0]',
                          'bg-gradient-to-br from-[#8A6D3B] to-[#C79A4B]',
                        ][i % 4]
                  }`}
                >
                  {l.imageUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={l.imageUrl}
                      alt=""
                      className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-[rgba(11,13,18,0.82)] via-transparent to-transparent" />
                  <div className="absolute bottom-3 left-3.5 right-3">
                    <div className="truncate text-[14.5px] font-bold text-white">{l.name}</div>
                    <div className="mt-0.5 truncate text-[11.5px] text-white/85">
                      {l.district} · {t.zoneCount(l.zone!.count)}
                      {l.zone!.cheapest != null && ` · ${t.zoneFrom(`฿${l.zone!.cheapest.toLocaleString()}`)}`}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
      )}

      {/* ===== FOOTER ===== */}
      <div className="mt-14 border-t border-[#E4E7EC] bg-white pt-11">
        <div className="mx-auto max-w-[1240px] px-6">
          <div className="grid grid-cols-2 gap-8 sm:grid-cols-5">
            <div className="col-span-2 max-w-[290px] sm:col-span-1">
              <div className="flex items-center gap-2.5">
                <HopakIcon size={34} />
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
                {/* หน้าขายของสำหรับเจ้าของหอ — ค่าบริการ วิธีใช้งาน คำถามที่พบบ่อย */}
                <Link href="/owners" className="hover:text-tenant">
                  {t.ownerLearnMore}
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

          <div className="mt-9 border-t border-[#EDEFF3] pt-7" />
        </div>

        {/* แถบล่าง + ลิ้นชักเมนู (เฉพาะมือถือ) */}
        <MobileHomeChrome
          open={menuOpen}
          onClose={() => setMenuOpen(false)}
          lang={lang}
          setLang={setLang}
          user={user ? { name: user.name, avatarUrl: user.avatarUrl } : null}
          onLogout={handleLogout}
        />

        {/* dark bottom bar */}
        <div className="bg-[#14171C] px-6 py-6">
          <div className="mx-auto flex max-w-[1240px] flex-wrap items-center gap-3">
            <HopakIcon size={32} />
            <span className="text-sm font-bold text-white">Hoprak.com</span>
            <span className="ml-auto text-[13px] text-[#5B616C]">{t.copyright}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
