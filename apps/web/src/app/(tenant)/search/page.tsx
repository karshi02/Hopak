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
      return { dorm, availableRooms, startingRoom };
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
    }
    return list;
  }, [dorms, roomType, amenity, priceRange, sortBy]);

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

  const selectClass =
    'rounded-full border border-card-border bg-white px-4 py-2 text-sm font-medium text-ink outline-none dark:border-white/10 dark:bg-[#1a1a19] dark:text-white';

  return (
    <main className="mx-auto max-w-6xl p-6">
      <h1 className="text-xl font-bold text-ink-strong dark:text-white">{t.title}</h1>

      <div className="mt-4 flex flex-wrap items-center gap-2.5">
        <button
          onClick={() => handleProvincePick('')}
          className={`rounded-full px-4 py-2 text-sm font-semibold ${
            province === '' && !pickedProvince ? 'bg-tenant text-white' : 'border border-card-border text-ink'
          }`}
        >
          {t.all}
        </button>
        {PROVINCES.map((p) => (
          <button
            key={p}
            onClick={() => handleProvincePick(p)}
            className={`rounded-full px-4 py-2 text-sm font-medium ${
              province === p && !pickedProvince ? 'bg-tenant text-white' : 'border border-card-border text-ink'
            }`}
          >
            {provinceLabel(p)}
          </button>
        ))}

        <select
          value={pickedProvince || province}
          onChange={(e) => handleProvincePick(e.target.value)}
          className={selectClass}
        >
          <option value="">{t.allProvinces77}</option>
          {ALL_THAI_PROVINCES.map((p) => (
            <option key={p} value={p}>
              {provinceLabel(p)}
            </option>
          ))}
        </select>

        <select value={priceRange} onChange={(e) => setPriceRange(e.target.value)} className={selectClass}>
          {t.priceRanges.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <select value={roomType} onChange={(e) => setRoomType(e.target.value)} className={selectClass}>
          {t.roomTypes.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <select value={amenity} onChange={(e) => setAmenity(e.target.value)} className={selectClass}>
          <option value="all">{t.amenity}</option>
          {amenityOptions.map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </select>
        <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className={`${selectClass} ml-auto`}>
          {t.sorts.map((o) => (
            <option key={o.value} value={o.value}>
              {t.sortBy}: {o.label}
            </option>
          ))}
        </select>
      </div>

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
            <div className="mt-6">
              <h2 className="font-semibold text-ink-strong dark:text-white">{t.sponsored}</h2>
              <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {sponsored.map((c) => {
                  const dorm = c.dorm;
                  const cheapest = dorm.rooms
                    .filter((r) => r.status.toUpperCase() === 'AVAILABLE')
                    .sort((a, b) => a.pricePerMonth - b.pricePerMonth)[0];
                  return (
                    <Link
                      key={c.id}
                      href={`/dorms/${dorm.id}`}
                      className="relative block overflow-hidden rounded-card border border-card-border bg-white hover:shadow-md dark:border-white/10 dark:bg-[#1a1a19]"
                    >
                      <div className="relative flex h-36 items-center justify-center bg-surface-canvas font-mono text-xs text-ink-faint dark:bg-[#2c2c2a]">
                        {t.photoPlaceholder}
                        <span className="absolute left-3 top-3 rounded-full bg-ink-strong px-2.5 py-1 text-xs font-semibold text-white">
                          {t.ad}
                        </span>
                      </div>
                      <div className="p-4">
                        <h3 className="truncate font-semibold text-ink-strong dark:text-white">{dorm.name}</h3>
                        <p className="mt-0.5 text-sm text-ink-subtitle">{dorm.province}</p>
                        <p className="mt-3 text-sm">
                          {cheapest ? (
                            <>
                              <span className="font-sans text-lg font-bold text-ink-strong dark:text-white">
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

          <div className="mt-6 flex items-baseline justify-between">
            <h2 className="font-semibold text-ink-strong dark:text-white">
              {t.allDormsIn(province ? provinceLabel(province) : '')}
            </h2>
            <span className="text-sm text-ink-faint">{t.count(filteredDorms.length)}</span>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredDorms.map(({ dorm, availableRooms, startingRoom }) => {
              const isFavorited = favoriteIds.has(dorm.id);
              const isTopRated = (dorm.avgRating ?? 0) >= 4.5 && (dorm.reviewCount ?? 0) > 0;
              return (
                <Link
                  key={dorm.id}
                  href={`/dorms/${dorm.id}`}
                  className="relative block overflow-hidden rounded-card border border-card-border bg-white hover:shadow-md dark:border-white/10 dark:bg-[#1a1a19]"
                >
                  <div className="relative flex h-36 items-center justify-center bg-surface-canvas font-mono text-xs text-ink-faint dark:bg-[#2c2c2a]">
                    {t.photoPlaceholder}
                    {isTopRated && (
                      <span className="absolute left-3 top-3 rounded-full bg-warning px-2.5 py-1 text-xs font-semibold text-white">
                        {t.recommended}
                      </span>
                    )}
                    {availableRooms.length > 0 && (
                      <span className="absolute right-3 top-3 rounded-full bg-white/95 px-2.5 py-1 text-xs font-semibold text-success">
                        {t.available(availableRooms.length)}
                      </span>
                    )}
                    <FavoriteButton
                      active={isFavorited}
                      onToggle={() => toggle(dorm.id)}
                      className={`absolute right-3 ${availableRooms.length > 0 ? 'top-12' : 'top-3'}`}
                    />
                  </div>
                  <div className="p-4">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="truncate font-semibold text-ink-strong dark:text-white">{dorm.name}</h3>
                      <StarRating rating={dorm.avgRating} count={dorm.reviewCount} />
                    </div>
                    <p className="mt-0.5 text-sm text-ink-subtitle">{dorm.province}</p>
                    {dorm.amenities.length > 0 && (
                      <div className="mt-2.5 flex flex-wrap gap-1.5">
                        {dorm.amenities.slice(0, 3).map((a) => (
                          <span key={a} className="rounded-md bg-surface-canvas px-2 py-1 text-xs text-ink-subtitle">
                            {a}
                          </span>
                        ))}
                      </div>
                    )}
                    <p className="mt-3 text-sm">
                      {startingRoom ? (
                        <>
                          <span className="font-sans text-lg font-bold text-ink-strong dark:text-white">
                            ฿{startingRoom.pricePerMonth.toLocaleString()}
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
            {filteredDorms.length === 0 && <p className="text-ink-faint">{t.notFound}</p>}
          </div>
        </>
      )}
    </main>
  );
}
