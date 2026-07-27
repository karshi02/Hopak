'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { PROVINCES } from '@hopak/shared';
import type { Campaign, Dorm, Room } from '@hopak/shared';

type SponsoredCampaign = Campaign & { dorm: Dorm & { rooms: Room[] } };
import { useDormSearch } from '@/hooks/useDormSearch';
import { useFavorites } from '@/hooks/useFavorites';
import { useLang } from '@/hooks/useLang';
import { apiClient } from '@/lib/api-client';
import { haversineKm } from '@/lib/geo';
import { PageLoader } from '@/components/PageLoader';
import { FavoriteButton } from '@/components/FavoriteButton';
import { StarRating } from '@/components/StarRating';

const ALL_THAI_PROVINCES = [
  'กรุงเทพมหานคร', 'กระบี่', 'กาญจนบุรี', 'กาฬสินธุ์', 'กำแพงเพชร', 'ขอนแก่น', 'จันทบุรี', 'ฉะเชิงเทรา',
  'ชลบุรี', 'ชัยนาท', 'ชัยภูมิ', 'ชุมพร', 'เชียงราย', 'เชียงใหม่', 'ตรัง', 'ตราด', 'ตาก', 'นครนายก',
  'นครปฐม', 'นครพนม', 'นครราชสีมา', 'นครศรีธรรมราช', 'นครสวรรค์', 'นนทบุรี', 'นราธิวาส', 'น่าน',
  'บึงกาฬ', 'บุรีรัมย์', 'ปทุมธานี', 'ประจวบคีรีขันธ์', 'ปราจีนบุรี', 'ปัตตานี', 'พระนครศรีอยุธยา',
  'พะเยา', 'พังงา', 'พัทลุง', 'พิจิตร', 'พิษณุโลก', 'เพชรบุรี', 'เพชรบูรณ์', 'แพร่', 'ภูเก็ต',
  'มหาสารคาม', 'มุกดาหาร', 'แม่ฮ่องสอน', 'ยโสธร', 'ยะลา', 'ร้อยเอ็ด', 'ระนอง', 'ระยอง', 'ราชบุรี',
  'ลพบุรี', 'ลำปาง', 'ลำพูน', 'เลย', 'ศรีสะเกษ', 'สกลนคร', 'สงขลา', 'สตูล', 'สมุทรปราการ',
  'สมุทรสงคราม', 'สมุทรสาคร', 'สระแก้ว', 'สระบุรี', 'สิงห์บุรี', 'สุโขทัย', 'สุพรรณบุรี', 'สุราษฎร์ธานี',
  'สุรินทร์', 'หนองคาย', 'หนองบัวลำภู', 'อ่างทอง', 'อำนาจเจริญ', 'อุดรธานี', 'อุตรดิตถ์', 'อุทัยธานี',
  'อุบลราชธานี',
];

const PROVINCE_EN_LABEL: Record<string, string> = {
  กรุงเทพมหานคร: 'Bangkok', กระบี่: 'Krabi', กาญจนบุรี: 'Kanchanaburi', กาฬสินธุ์: 'Kalasin',
  กำแพงเพชร: 'Kamphaeng Phet', ขอนแก่น: 'Khon Kaen', จันทบุรี: 'Chanthaburi', ฉะเชิงเทรา: 'Chachoengsao',
  ชลบุรี: 'Chonburi', ชัยนาท: 'Chai Nat', ชัยภูมิ: 'Chaiyaphum', ชุมพร: 'Chumphon', เชียงราย: 'Chiang Rai',
  เชียงใหม่: 'Chiang Mai', ตรัง: 'Trang', ตราด: 'Trat', ตาก: 'Tak', นครนายก: 'Nakhon Nayok',
  นครปฐม: 'Nakhon Pathom', นครพนม: 'Nakhon Phanom', นครราชสีมา: 'Nakhon Ratchasima',
  นครศรีธรรมราช: 'Nakhon Si Thammarat', นครสวรรค์: 'Nakhon Sawan', นนทบุรี: 'Nonthaburi',
  นราธิวาส: 'Narathiwat', น่าน: 'Nan', บึงกาฬ: 'Bueng Kan', บุรีรัมย์: 'Buriram', ปทุมธานี: 'Pathum Thani',
  ประจวบคีรีขันธ์: 'Prachuap Khiri Khan', ปราจีนบุรี: 'Prachinburi', ปัตตานี: 'Pattani',
  พระนครศรีอยุธยา: 'Phra Nakhon Si Ayutthaya', พะเยา: 'Phayao', พังงา: 'Phang Nga', พัทลุง: 'Phatthalung',
  พิจิตร: 'Phichit', พิษณุโลก: 'Phitsanulok', เพชรบุรี: 'Phetchaburi', เพชรบูรณ์: 'Phetchabun', แพร่: 'Phrae',
  ภูเก็ต: 'Phuket', มหาสารคาม: 'Mahasarakham', มุกดาหาร: 'Mukdahan', แม่ฮ่องสอน: 'Mae Hong Son',
  ยโสธร: 'Yasothon', ยะลา: 'Yala', ร้อยเอ็ด: 'Roi Et', ระนอง: 'Ranong', ระยอง: 'Rayong', ราชบุรี: 'Ratchaburi',
  ลพบุรี: 'Lopburi', ลำปาง: 'Lampang', ลำพูน: 'Lamphun', เลย: 'Loei', ศรีสะเกษ: 'Sisaket',
  สกลนคร: 'Sakon Nakhon', สงขลา: 'Songkhla', สตูล: 'Satun', สมุทรปราการ: 'Samut Prakan',
  สมุทรสงคราม: 'Samut Songkhram', สมุทรสาคร: 'Samut Sakhon', สระแก้ว: 'Sa Kaeo', สระบุรี: 'Saraburi',
  สิงห์บุรี: 'Sing Buri', สุโขทัย: 'Sukhothai', สุพรรณบุรี: 'Suphan Buri', สุราษฎร์ธานี: 'Surat Thani',
  สุรินทร์: 'Surin', หนองคาย: 'Nong Khai', หนองบัวลำภู: 'Nong Bua Lamphu', อ่างทอง: 'Ang Thong',
  อำนาจเจริญ: 'Amnat Charoen', อุดรธานี: 'Udon Thani', อุตรดิตถ์: 'Uttaradit', อุทัยธานี: 'Uthai Thani',
  อุบลราชธานี: 'Ubon Ratchathani',
};

// จังหวัดที่ยังไม่มีหอพักในระบบ ผูกกับจังหวัดที่รองรับจริงที่ใกล้เคียงที่สุด (ติดกันจริงหรือภูมิภาคเดียวกัน)
// จังหวัดใต้/กลาง/ตะวันออก/ตะวันตกไม่มีจังหวัดที่รองรับอยู่ใกล้เลย จึงใช้ขอนแก่นเป็นค่าเริ่มต้น (ศูนย์กลางประเทศที่สุดในสามจังหวัด)
const NEAREST_SUPPORTED_PROVINCE: Record<string, string> = {
  // ติดกับมหาสารคามจริง
  กาฬสินธุ์: 'มหาสารคาม', ร้อยเอ็ด: 'มหาสารคาม', สุรินทร์: 'มหาสารคาม', บุรีรัมย์: 'มหาสารคาม',
  // ภาคอีสานที่เหลือ ใกล้ขอนแก่นสุด
  นครราชสีมา: 'ขอนแก่น', ศรีสะเกษ: 'ขอนแก่น', อุบลราชธานี: 'ขอนแก่น', ยโสธร: 'ขอนแก่น',
  ชัยภูมิ: 'ขอนแก่น', อำนาจเจริญ: 'ขอนแก่น', บึงกาฬ: 'ขอนแก่น', หนองบัวลำภู: 'ขอนแก่น',
  อุดรธานี: 'ขอนแก่น', เลย: 'ขอนแก่น', หนองคาย: 'ขอนแก่น', สกลนคร: 'ขอนแก่น',
  นครพนม: 'ขอนแก่น', มุกดาหาร: 'ขอนแก่น',
  // ภาคเหนือ ใกล้เชียงใหม่สุด
  เชียงราย: 'เชียงใหม่', แม่ฮ่องสอน: 'เชียงใหม่', ลำปาง: 'เชียงใหม่', ลำพูน: 'เชียงใหม่',
  พะเยา: 'เชียงใหม่', แพร่: 'เชียงใหม่', น่าน: 'เชียงใหม่', อุตรดิตถ์: 'เชียงใหม่',
  ตาก: 'เชียงใหม่', สุโขทัย: 'เชียงใหม่', กำแพงเพชร: 'เชียงใหม่', พิษณุโลก: 'เชียงใหม่',
  พิจิตร: 'เชียงใหม่', เพชรบูรณ์: 'เชียงใหม่', นครสวรรค์: 'เชียงใหม่', อุทัยธานี: 'เชียงใหม่',
};

const TEXT = {
  th: {
    title: 'ค้นหาหอพัก',
    all: 'ทั้งหมด',
    allProvinces77: 'ทุกจังหวัด (77 จังหวัด)',
    amenity: 'สิ่งอำนวยความสะดวก',
    sortBy: 'เรียงโดย',
    fallbackNote: (picked: string, nearest: string) =>
      `ยังไม่มีหอพักใน${picked}ตอนนี้ กำลังแสดงหอพักในจังหวัดใกล้เคียง (${nearest}) แทน`,
    sponsored: 'สปอนเซอร์',
    photoPlaceholder: 'รูปหอพัก',
    ad: 'โฆษณา',
    perMonth: '/ เดือน',
    full: 'ห้องเต็ม',
    allDormsIn: (p: string) => `หอพักทั้งหมด${p ? `ใน${p}` : ''}`,
    count: (n: number) => `${n} แห่ง`,
    recommended: '★ แนะนำ',
    available: (n: number) => `ว่าง ${n} ห้อง`,
    notFound: 'ไม่พบหอพัก',
    priceRanges: [
      { value: 'all', label: 'ราคาทั้งหมด' },
      { value: 'under3000', label: 'ต่ำกว่า 3,000' },
      { value: '3000-5000', label: '3,000 - 5,000' },
      { value: 'above5000', label: 'มากกว่า 5,000' },
    ],
    roomTypes: [
      { value: 'all', label: 'ทุกประเภทห้อง' },
      { value: 'air', label: 'แอร์' },
      { value: 'fan', label: 'พัดลม' },
    ],
    sorts: [
      { value: 'recommended', label: 'แนะนำ' },
      { value: 'price_asc', label: 'ราคา ต่ำ - สูง' },
      { value: 'price_desc', label: 'ราคา สูง - ต่ำ' },
    ],
    distanceSort: 'ใกล้ที่สุด',
    distanceFrom: (place: string) => `ระยะห่างจาก ${place}`,
    kmAway: (km: number) => `${km.toFixed(1)} กม.`,

    heroTitleIn: (p: string) => `หอพักใกล้มหาวิทยาลัยใน${p}`,
    heroTitleAll: 'หอพักใกล้มหาวิทยาลัยทั่วประเทศ',
    heroFound: (n: number) => `พบ ${n} หอพัก`,
    heroSub: 'ราคาโปร่งใส เห็นค่าน้ำค่าไฟชัดเจน ไม่มีค่าหน้าหอ',
    statDorms: 'หอพัก',
    statFrom: 'เริ่มต้น/เดือน',
    statRating: 'คะแนนเฉลี่ย',
    noData: '—',
    priceFilterLabel: 'ราคา',
    roomTypeFilterLabel: 'ประเภทห้อง',
    amenityFilterLabel: 'สิ่งอำนวยความสะดวก',
    bookNow: 'จองเลย',
  },
  en: {
    title: 'Find Dorms',
    all: 'All',
    allProvinces77: 'All provinces (77)',
    amenity: 'Amenities',
    sortBy: 'Sort by',
    fallbackNote: (picked: string, nearest: string) =>
      `No dorms in ${picked} yet — showing dorms in the nearest supported province (${nearest}) instead`,
    sponsored: 'Sponsored',
    photoPlaceholder: 'Dorm photo',
    ad: 'Ad',
    perMonth: '/ month',
    full: 'Fully booked',
    allDormsIn: (p: string) => (p ? `Dorms in ${p}` : 'All dorms'),
    count: (n: number) => `${n} listings`,
    recommended: '★ Top rated',
    available: (n: number) => `${n} available`,
    notFound: 'No dorms found',
    priceRanges: [
      { value: 'all', label: 'Any price' },
      { value: 'under3000', label: 'Under 3,000' },
      { value: '3000-5000', label: '3,000 - 5,000' },
      { value: 'above5000', label: 'Above 5,000' },
    ],
    roomTypes: [
      { value: 'all', label: 'All room types' },
      { value: 'air', label: 'Air-conditioned' },
      { value: 'fan', label: 'Fan room' },
    ],
    sorts: [
      { value: 'recommended', label: 'Recommended' },
      { value: 'price_asc', label: 'Price: low to high' },
      { value: 'price_desc', label: 'Price: high to low' },
    ],
    distanceSort: 'Nearest first',
    distanceFrom: (place: string) => `Distance from ${place}`,
    kmAway: (km: number) => `${km.toFixed(1)} km`,

    heroTitleIn: (p: string) => `Dorms near universities in ${p}`,
    heroTitleAll: 'Dorms near universities nationwide',
    heroFound: (n: number) => `${n} dorms found`,
    heroSub: 'Transparent pricing, clear water & electric rates, no hidden fees',
    statDorms: 'Dorms',
    statFrom: 'From/month',
    statRating: 'Avg. rating',
    noData: '—',
    priceFilterLabel: 'Price',
    roomTypeFilterLabel: 'Room type',
    amenityFilterLabel: 'Amenities',
    bookNow: 'Book now',
  },
};

export default function SearchPage() {
  const params = useSearchParams();
  const { lang } = useLang();
  const t = TEXT[lang];
  const provinceLabel = (p: string) => (lang === 'en' ? PROVINCE_EN_LABEL[p] ?? p : p);
  const [province, setProvince] = useState<string>(() => params.get('province') ?? '');
  const [pickedProvince, setPickedProvince] = useState('');
  const [priceRange, setPriceRange] = useState(() => params.get('priceRange') ?? 'all');
  const [roomType, setRoomType] = useState(() => params.get('roomType') ?? 'all');
  const [amenity, setAmenity] = useState('all');
  const [sortBy, setSortBy] = useState('recommended');
  const [sponsored, setSponsored] = useState<SponsoredCampaign[]>([]);

  const q = params.get('q') ?? undefined;
  const { dorms, loading } = useDormSearch({ q, province: province || undefined });
  const { favoriteIds, toggle } = useFavorites();

  const placeLat = params.get('lat') ? Number(params.get('lat')) : null;
  const placeLng = params.get('lng') ? Number(params.get('lng')) : null;
  const placeName = params.get('placeName');
  const hasPlace = placeLat != null && placeLng != null && !Number.isNaN(placeLat) && !Number.isNaN(placeLng);

  useEffect(() => {
    if (hasPlace) setSortBy('distance_asc');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasPlace]);

  useEffect(() => {
    apiClient
      .get<SponsoredCampaign[]>('/promotions/sponsored')
      .then(setSponsored)
      .catch(() => setSponsored([]));
  }, []);

  const amenityOptions = useMemo(() => {
    const set = new Set<string>();
    dorms.forEach((d) => d.amenities.forEach((a) => set.add(a)));
    return Array.from(set);
  }, [dorms]);

  const filteredDorms = useMemo(() => {
    let list = dorms.map((dorm) => {
      const availableRooms = dorm.rooms.filter((r) => r.status.toUpperCase() === 'AVAILABLE');
      const startingRoom = [...availableRooms].sort((a, b) => a.pricePerMonth - b.pricePerMonth)[0];
      const distanceKm = hasPlace ? haversineKm(placeLat!, placeLng!, dorm.lat, dorm.lng) : null;
      return { dorm, availableRooms, startingRoom, distanceKm };
    });

    if (roomType !== 'all') {
      list = list.filter((x) => x.availableRooms.some((r) => r.type.toUpperCase() === roomType.toUpperCase()));
    }
    if (amenity !== 'all') {
      list = list.filter((x) => x.dorm.amenities.includes(amenity));
    }
    if (priceRange !== 'all') {
      list = list.filter((x) => {
        if (!x.startingRoom) return false;
        const p = x.startingRoom.pricePerMonth;
        if (priceRange === 'under3000') return p < 3000;
        if (priceRange === '3000-5000') return p >= 3000 && p <= 5000;
        return p > 5000;
      });
    }
    if (sortBy === 'price_asc') {
      list = [...list].sort((a, b) => (a.startingRoom?.pricePerMonth ?? Infinity) - (b.startingRoom?.pricePerMonth ?? Infinity));
    } else if (sortBy === 'price_desc') {
      list = [...list].sort((a, b) => (b.startingRoom?.pricePerMonth ?? 0) - (a.startingRoom?.pricePerMonth ?? 0));
    } else if (sortBy === 'distance_asc') {
      list = [...list].sort((a, b) => (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity));
    }
    return list;
  }, [dorms, roomType, amenity, priceRange, sortBy, hasPlace, placeLat, placeLng]);

  const heroStats = useMemo(() => {
    let cheapest: number | null = null;
    let ratingSum = 0;
    let ratingCount = 0;
    for (const { startingRoom, dorm } of filteredDorms) {
      if (startingRoom && (cheapest === null || startingRoom.pricePerMonth < cheapest)) {
        cheapest = startingRoom.pricePerMonth;
      }
      if ((dorm.reviewCount ?? 0) > 0 && dorm.avgRating != null) {
        ratingSum += dorm.avgRating;
        ratingCount += 1;
      }
    }
    return {
      count: filteredDorms.length,
      cheapest,
      avgRating: ratingCount > 0 ? ratingSum / ratingCount : null,
    };
  }, [filteredDorms]);

  function handleProvincePick(value: string) {
    if (!value) {
      setProvince('');
      setPickedProvince('');
      return;
    }
    if ((PROVINCES as readonly string[]).includes(value)) {
      setProvince(value);
      setPickedProvince('');
    } else {
      setPickedProvince(value);
      setProvince(NEAREST_SUPPORTED_PROVINCE[value] ?? PROVINCES[0]);
    }
  }

  const pillSelectClass =
    'w-full appearance-none bg-transparent text-[14px] font-semibold text-[#2A303C] outline-none';

  return (
    <main className="mx-auto max-w-[1360px] px-6 py-6">
      {/* ===== HERO BAND ===== */}
      <div className="relative overflow-hidden rounded-[24px] bg-[linear-gradient(135deg,#1E4FB0_0%,#2F6FE0_55%,#173A87_120%)] p-8 shadow-[0_16px_40px_rgba(30,79,176,0.28)]">
        <div className="pointer-events-none absolute -top-12 right-28 h-[220px] w-[220px] rounded-full bg-[radial-gradient(circle,rgba(255,255,255,0.28),transparent_66%)] blur-lg" />
        <div className="pointer-events-none absolute -bottom-16 left-64 h-[190px] w-[190px] rounded-full bg-[radial-gradient(circle,rgba(23,143,90,0.4),transparent_66%)] blur-lg" />

        <div className="relative flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-end">
          <div>
            {province && (
              <div className="inline-flex items-center gap-2 rounded-full border border-white/28 bg-white/16 px-3.5 py-1.5 text-[12.5px] font-semibold text-[#EAF1FF]">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                  <path d="M21 10c0 6-9 12-9 12s-9-6-9-12a9 9 0 1118 0z" stroke="#EAF1FF" strokeWidth="1.8" />
                  <circle cx="12" cy="10" r="3" stroke="#EAF1FF" strokeWidth="1.8" />
                </svg>
                {provinceLabel(province)}
              </div>
            )}
            <div className="mt-3.5 text-[28px] font-bold leading-tight tracking-tight text-white sm:text-[34px]">
              {province ? t.heroTitleIn(provinceLabel(province)) : t.heroTitleAll}
            </div>
            <div className="mt-2.5 text-[15px] text-[#D3E0F5]">
              <span className="font-bold text-white">{t.heroFound(heroStats.count)}</span> · {t.heroSub}
            </div>
          </div>
          <div className="flex gap-6">
            <div className="text-left sm:text-right">
              <div className="text-[24px] font-bold tracking-tight text-white">{heroStats.count}</div>
              <div className="mt-0.5 text-[12.5px] text-[#BFD1EE]">{t.statDorms}</div>
            </div>
            <div className="text-left sm:text-right">
              <div className="text-[24px] font-bold tracking-tight text-white">
                {heroStats.cheapest != null ? `฿${heroStats.cheapest.toLocaleString()}` : t.noData}
              </div>
              <div className="mt-0.5 text-[12.5px] text-[#BFD1EE]">{t.statFrom}</div>
            </div>
            <div className="text-left sm:text-right">
              <div className="text-[24px] font-bold tracking-tight text-white">
                {heroStats.avgRating != null ? heroStats.avgRating.toFixed(1) : t.noData}
              </div>
              <div className="mt-0.5 text-[12.5px] text-[#BFD1EE]">{t.statRating}</div>
            </div>
          </div>
        </div>
      </div>

      {/* ===== FILTER BAR ===== */}
      <div className="mt-6 flex flex-wrap items-center gap-2.5">
        <button
          onClick={() => handleProvincePick('')}
          className={`h-[42px] rounded-full px-5 text-[14px] font-semibold ${
            province === '' && !pickedProvince
              ? 'bg-[linear-gradient(135deg,#2F6FE0,#5B9DFF)] text-white shadow-[0_8px_20px_rgba(47,111,224,0.4)]'
              : 'border border-card-border bg-white text-ink'
          }`}
        >
          {t.all}
        </button>
        {PROVINCES.map((p) => (
          <button
            key={p}
            onClick={() => handleProvincePick(p)}
            className={`h-[42px] rounded-full px-5 text-[14px] font-semibold ${
              province === p && !pickedProvince
                ? 'bg-[linear-gradient(135deg,#2F6FE0,#5B9DFF)] text-white shadow-[0_8px_20px_rgba(47,111,224,0.4)]'
                : 'border border-card-border bg-white text-ink'
            }`}
          >
            {provinceLabel(p)}
          </button>
        ))}

        <select
          value={pickedProvince || province}
          onChange={(e) => handleProvincePick(e.target.value)}
          className="h-[42px] rounded-full border border-card-border bg-white px-4 text-sm font-medium text-ink outline-none"
        >
          <option value="">{t.allProvinces77}</option>
          {ALL_THAI_PROVINCES.map((p) => (
            <option key={p} value={p}>
              {provinceLabel(p)}
            </option>
          ))}
        </select>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <div className="flex h-[46px] items-center gap-2.5 rounded-xl border border-card-border bg-white px-4 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
          <span className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-lg bg-[#EAF1FF]">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M12 3v18M8 7h5a3 3 0 010 6H9a3 3 0 000 6h6" stroke="#2F6FE0" strokeWidth="1.9" strokeLinecap="round" />
            </svg>
          </span>
          <select value={priceRange} onChange={(e) => setPriceRange(e.target.value)} className={pillSelectClass}>
            {t.priceRanges.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="shrink-0">
            <path d="M6 9l6 6 6-6" stroke="#9AA0AB" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>

        <div className="flex h-[46px] items-center gap-2.5 rounded-xl border border-card-border bg-white px-4 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
          <span className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-lg bg-[#E7F7EF]">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path
                d="M3 21h18M5 21V8l7-4 7 4v13M9 21v-6h6v6"
                stroke="#178F5A"
                strokeWidth="1.9"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
          <select value={roomType} onChange={(e) => setRoomType(e.target.value)} className={pillSelectClass}>
            {t.roomTypes.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="shrink-0">
            <path d="M6 9l6 6 6-6" stroke="#9AA0AB" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>

        {amenityOptions.length > 0 && (
          <div className="flex h-[46px] items-center gap-2.5 rounded-xl border border-card-border bg-white px-4 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
            <span className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-lg bg-[#F3ECFF]">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path
                  d="M4 9h16M4 9a2 2 0 012-2h12a2 2 0 012 2M7 13h.01M11 13h6M7 17c0 1.5 1.5 1.5 1.5 0"
                  stroke="#7C4DE0"
                  strokeWidth="1.9"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </span>
            <select value={amenity} onChange={(e) => setAmenity(e.target.value)} className={pillSelectClass}>
              <option value="all">{t.amenity}</option>
              {amenityOptions.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="shrink-0">
              <path d="M6 9l6 6 6-6" stroke="#9AA0AB" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        )}

        <div className="ml-auto flex h-[46px] items-center gap-2.5 rounded-xl border border-card-border bg-white px-4 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="shrink-0">
            <path
              d="M4 6h13M4 12h9M4 18h5M17 15v5m0 0l3-3m-3 3l-3-3"
              stroke="#8A909F"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className={pillSelectClass}>
            {hasPlace && (
              <option value="distance_asc">
                {t.sortBy}: {t.distanceSort}
              </option>
            )}
            {t.sorts.map((o) => (
              <option key={o.value} value={o.value}>
                {t.sortBy}: {o.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {hasPlace && placeName && (
        <p className="mt-3 rounded-btn bg-tenant-tint px-4 py-2.5 text-sm font-medium text-tenant">
          {t.distanceFrom(placeName)}
        </p>
      )}

      {pickedProvince && (
        <p className="mt-3 rounded-btn bg-warning/10 px-4 py-2.5 text-sm text-warning-dark">
          {t.fallbackNote(provinceLabel(pickedProvince), provinceLabel(province))}
        </p>
      )}

      {loading ? (
        <PageLoader />
      ) : (
        <>
          {sponsored.length > 0 && (
            <div className="mt-8">
              <h2 className="font-semibold text-ink-strong">{t.sponsored}</h2>
              <div className="mt-3 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {sponsored.map((c) => {
                  const dorm = c.dorm;
                  const cheapest = dorm.rooms
                    .filter((r) => r.status.toUpperCase() === 'AVAILABLE')
                    .sort((a, b) => a.pricePerMonth - b.pricePerMonth)[0];
                  return (
                    <Link
                      key={c.id}
                      href={`/dorms/${dorm.id}`}
                      className="relative block overflow-hidden rounded-[22px] border border-[#EAEDF2] bg-white shadow-[0_2px_8px_rgba(16,24,40,0.05)] transition-all hover:-translate-y-1.5 hover:shadow-[0_24px_48px_rgba(16,24,40,0.16)]"
                    >
                      <div className="relative flex h-[180px] items-center justify-center bg-surface-canvas font-mono text-xs text-ink-faint">
                        {dorm.images?.[0] ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={dorm.images[0]} alt="" className="absolute inset-0 h-full w-full object-cover" />
                        ) : (
                          t.photoPlaceholder
                        )}
                        <span className="absolute left-3.5 top-3.5 rounded-full bg-ink-strong px-2.5 py-1 text-xs font-semibold text-white">
                          {t.ad}
                        </span>
                      </div>
                      <div className="p-[18px]">
                        <h3 className="truncate text-[17px] font-bold tracking-tight">{dorm.name}</h3>
                        <p className="mt-1 text-[13px] text-ink-subtitle">{dorm.province}</p>
                        <p className="mt-3 border-t border-[#F0F2F6] pt-3 text-sm">
                          {cheapest ? (
                            <>
                              <span className="font-sans text-lg font-bold text-tenant">
                                ฿{cheapest.pricePerMonth.toLocaleString()}
                              </span>
                              <span className="text-ink-faint"> {t.perMonth}</span>
                            </>
                          ) : (
                            <span className="text-ink-faint">{t.full}</span>
                          )}
                        </p>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}

          <div className="mt-8 flex items-baseline justify-between">
            <h2 className="text-lg font-bold tracking-tight">
              {t.allDormsIn(province ? provinceLabel(province) : '')}
            </h2>
            <span className="text-sm text-ink-faint">{t.count(filteredDorms.length)}</span>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {filteredDorms.map(({ dorm, availableRooms, startingRoom, distanceKm }) => {
              const isFavorited = favoriteIds.has(dorm.id);
              const hasRating = (dorm.reviewCount ?? 0) > 0 && dorm.avgRating != null;
              return (
                <Link
                  key={dorm.id}
                  href={`/dorms/${dorm.id}`}
                  className="group relative block overflow-hidden rounded-[22px] border border-[#EAEDF2] bg-white shadow-[0_2px_8px_rgba(16,24,40,0.05)] transition-all hover:-translate-y-1.5 hover:shadow-[0_24px_48px_rgba(16,24,40,0.16)]"
                >
                  <div className="relative h-[210px] bg-surface-canvas">
                    {dorm.images?.[0] ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={dorm.images[0]} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full items-center justify-center font-mono text-xs text-ink-faint">
                        {t.photoPlaceholder}
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />

                    <FavoriteButton active={isFavorited} onToggle={() => toggle(dorm.id)} className="absolute right-3.5 top-3.5" />

                    {availableRooms.length > 0 && (
                      <div className="absolute bottom-3.5 left-3.5 flex items-center gap-1.5 rounded-full bg-[linear-gradient(135deg,#178F5A,#1FB56E)] px-3 py-1.5 text-xs font-bold text-white shadow-[0_6px_14px_rgba(23,143,90,0.45)]">
                        <span className="h-[7px] w-[7px] rounded-full bg-[#BFF5D8]" />
                        {t.available(availableRooms.length)}
                      </div>
                    )}
                    {hasRating && (
                      <div className="absolute bottom-3.5 right-3.5 flex items-center gap-1 rounded-full bg-black/60 px-2.5 py-1.5 text-xs font-bold text-white">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="#F5B860">
                          <path d="M12 2l2.9 6.2 6.8.7-5.1 4.6 1.5 6.7L12 17.8 5.9 20.2l1.5-6.7L2.3 8.9l6.8-.7L12 2z" />
                        </svg>
                        {dorm.avgRating!.toFixed(1)}
                      </div>
                    )}
                  </div>
                  <div className="p-[18px]">
                    <div className="truncate text-[17px] font-bold tracking-tight">{dorm.name}</div>
                    <div className="mt-1 flex items-center gap-1.5 text-[13px] text-ink-faint">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                        <path d="M21 10c0 6-9 12-9 12s-9-6-9-12a9 9 0 1118 0z" stroke="#9AA0AB" strokeWidth="1.8" />
                        <circle cx="12" cy="10" r="3" stroke="#9AA0AB" strokeWidth="1.8" />
                      </svg>
                      {dorm.university || dorm.province}
                      {distanceKm != null && <span className="font-semibold text-tenant"> · {t.kmAway(distanceKm)}</span>}
                    </div>
                    {dorm.amenities.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {dorm.amenities.slice(0, 3).map((a) => (
                          <span
                            key={a}
                            className="rounded-lg border border-[#EDF0F4] bg-[#F4F6FA] px-2.5 py-1 text-[11.5px] font-medium text-[#5B616C]"
                          >
                            {a}
                          </span>
                        ))}
                      </div>
                    )}
                    <div className="mt-4 flex items-end justify-between border-t border-[#F0F2F6] pt-3.5">
                      <div>
                        {startingRoom ? (
                          <div>
                            <span className="font-sans text-[22px] font-bold text-tenant">
                              ฿{startingRoom.pricePerMonth.toLocaleString()}
                            </span>
                            <span className="text-xs text-ink-faint"> {t.perMonth}</span>
                          </div>
                        ) : (
                          <span className="text-sm text-ink-faint">{t.full}</span>
                        )}
                      </div>
                      {startingRoom && (
                        <span className="rounded-[11px] bg-[linear-gradient(135deg,#2F6FE0,#5B9DFF)] px-4 py-2 text-[13px] font-bold text-white shadow-[0_8px_18px_rgba(47,111,224,0.35)]">
                          {t.bookNow}
                        </span>
                      )}
                    </div>
                  </div>
                </Link>
              );
            })}
            {filteredDorms.length === 0 && <p className="text-ink-faint">{t.notFound}</p>}
          </div>
        </>
      )}
    </main>
  );
}
