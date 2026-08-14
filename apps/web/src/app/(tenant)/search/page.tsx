'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { PROVINCES, addressInDistrict, findDistrict } from '@hopak/shared';
import { amenityLabel } from '@/lib/amenities';
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
    perNight: '/ คืน',
    full: 'ห้องเต็ม',
    popular: 'ยอดฮิต',
    allDormsIn: (p: string) => `หอพักทั้งหมด${p ? `ใน${p}` : ''}`,
    count: (n: number) => `${n} แห่ง`,
    recommended: '★ แนะนำ',
    available: (n: number) => `ว่าง ${n} ห้อง`,
    notFound: 'ไม่พบหอพัก',
    ownerCtaTitle: (p: string) => `เป็นเจ้าของหอพัก${p ? 'ใน' + p : ''}?`,
    ownerCtaSub: 'ลงประกาศฟรี จ่ายค่าบริการเฉพาะเมื่อมีคนจองสำเร็จ',
    ownerCtaPrimary: 'ลงประกาศหอพัก',
    ownerCtaSecondary: 'เรียนรู้เพิ่มเติม',
    mapView: 'ดูแผนที่',
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
    distanceSort: 'ใกล้ฉันก่อน',
    geoUse: 'เรียงตามระยะทางจากฉัน',
    geoRetry: 'เปิดตำแหน่งเพื่อเรียงตามระยะทาง',
    distanceFrom: (place: string) => `ระยะห่างจาก ${place}`,
    kmAway: (km: number) => `${km.toFixed(1)} กม.`,

    crumbHome: 'หน้าแรก',
    crumbSearch: 'ค้นหาหอพัก',
    heroPills: ['ราคาโปร่งใส', 'เห็นค่าน้ำค่าไฟ', 'ไม่มีค่าหน้าหอ'],
    filtersTitle: 'ตัวกรอง',
    clearFilters: 'ล้าง',
    priceRangeTitle: 'ช่วงราคา (บาท/เดือน)',
    roomTypeTitle: 'ประเภทห้อง',
    amenityTitle: 'สิ่งอำนวยความสะดวก',
    openMap: 'ดูบนแผนที่',
    nearbyTitle: 'ไม่เจอที่ถูกใจ? ลองทำเลใกล้เคียง',
    nearbySub: 'ขยายพื้นที่ค้นหารอบมหาวิทยาลัย เพื่อดูตัวเลือกเพิ่มเติม',
    dormsUnit: 'หอ',
    heroTitleIn: (p: string) => `หอพักใกล้มหาวิทยาลัยใน${p}`,
    heroTitleAll: 'หอพักใกล้มหาวิทยาลัยทั่วประเทศ',
    heroFound: (n: number) => `พบ ${n} หอพัก`,
    heroSub: 'ราคาโปร่งใส เห็นค่าน้ำค่าไฟชัดเจน',
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
    perNight: '/ night',
    full: 'Fully booked',
    popular: 'Popular',
    allDormsIn: (p: string) => (p ? `Dorms in ${p}` : 'All dorms'),
    count: (n: number) => `${n} listings`,
    recommended: '★ Top rated',
    available: (n: number) => `${n} available`,
    notFound: 'No dorms found',
    ownerCtaTitle: (p: string) => `Own a dorm${p ? ' in ' + p : ''}?`,
    ownerCtaSub: 'List for free — pay only when a booking goes through',
    ownerCtaPrimary: 'List your dorm',
    ownerCtaSecondary: 'Learn more',
    mapView: 'Map view',
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
    geoUse: 'Sort by distance from me',
    geoRetry: 'Enable location to sort by distance',
    distanceFrom: (place: string) => `Distance from ${place}`,
    kmAway: (km: number) => `${km.toFixed(1)} km`,

    crumbHome: 'Home',
    crumbSearch: 'Search dorms',
    heroPills: ['Transparent pricing', 'Utility rates shown', 'No agency fee'],
    filtersTitle: 'Filters',
    clearFilters: 'Clear',
    priceRangeTitle: 'Price range (per month)',
    roomTypeTitle: 'Room type',
    amenityTitle: 'Amenities',
    openMap: 'Open map',
    nearbyTitle: 'Nothing you like? Try a nearby area',
    nearbySub: 'Widen the search around the university for more options',
    dormsUnit: 'dorms',
    heroTitleIn: (p: string) => `Dorms near universities in ${p}`,
    heroTitleAll: 'Dorms near universities nationwide',
    heroFound: (n: number) => `${n} dorms found`,
    heroSub: 'Transparent pricing, clear water & electric rates',
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
  // ?district= มาจากการ์ดย่อยรายอำเภอหน้าแรก — ระบบไม่มีฟิลด์อำเภอ กรองจาก address ฝั่งหน้าเว็บ
  const district = params.get('district');
  const { dorms, loading } = useDormSearch({ q, province: province || undefined });
  const { favoriteIds, toggle } = useFavorites();

  // โหมดรายวัน (มาจากหน้าแรก ?rental=daily) — กรองเฉพาะหอที่มีห้องเปิดรายวัน + ใช้ราคา/คืน
  const dailyMode = params.get('rental') === 'daily';
  type RoomT = (typeof dorms)[number]['rooms'][number];
  const rPrice = (r: RoomT) => (dailyMode ? r.pricePerDay ?? 0 : r.pricePerMonth);
  // แยกขาด — รายวันเห็นเฉพาะห้องรายวัน, รายเดือนเห็นเฉพาะห้องรายเดือน
  const rOk = (r: RoomT) =>
    r.status.toUpperCase() === 'AVAILABLE' &&
    (dailyMode ? !!r.allowDaily && (r.pricePerDay ?? 0) > 0 : !r.allowDaily);
  const perUnit = dailyMode ? t.perNight : t.perMonth;

  const placeLat = params.get('lat') ? Number(params.get('lat')) : null;
  const placeLng = params.get('lng') ? Number(params.get('lng')) : null;
  const placeName = params.get('placeName');
  const hasPlace = placeLat != null && placeLng != null && !Number.isNaN(placeLat) && !Number.isNaN(placeLng);
  // ตำแหน่งจริงของผู้ใช้ (device geolocation) — ใช้คิดระยะทางเมื่อค้นด้วยจังหวัด (ไม่มีพิกัดสถานที่ใน URL)
  const [myLocation, setMyLocation] = useState<{ lat: number; lng: number } | null>(null);

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

  const [geoDenied, setGeoDenied] = useState(false);

  // ขอตำแหน่งเครื่อง — ได้แล้วสลับไปเรียง "ใกล้ฉันก่อน" ให้เลย (เว้นแต่ผู้ใช้เลือกวิธีเรียงเองไว้แล้ว)
  const askLocation = () => {
    if (!navigator.geolocation) {
      setGeoDenied(true);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setMyLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setGeoDenied(false);
        setSortBy((cur) => (cur === 'recommended' ? 'distance_asc' : cur));
      },
      () => {
        setMyLocation(null);
        setGeoDenied(true);
      },
      { enableHighAccuracy: false, timeout: 8000 },
    );
  };

  useEffect(() => {
    if (hasPlace) return; // มีพิกัดสถานที่ใน URL แล้ว ไม่ต้องใช้ตำแหน่งเครื่อง
    askLocation();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasPlace]);

  const amenityOptions = useMemo(() => {
    const set = new Set<string>();
    dorms.forEach((d) => d.amenities.forEach((a) => set.add(a)));
    return Array.from(set);
  }, [dorms]);

  const filteredDorms = useMemo(() => {
    // จุดอ้างอิงระยะทาง: พิกัดสถานที่ใน URL ก่อน ถ้าไม่มีใช้ตำแหน่งเครื่อง
    const ref = hasPlace ? { lat: placeLat!, lng: placeLng! } : myLocation;
    let list = dorms.map((dorm) => {
      const availableRooms = dorm.rooms.filter(rOk);
      const startingRoom = [...availableRooms].sort((a, b) => rPrice(a) - rPrice(b))[0];
      // ต้องมีจุดอ้างอิง + หอมีพิกัดจริง (ไม่ใช่ 0,0) ถึงจะคิดระยะ
      const distanceKm = ref && dorm.lat && dorm.lng ? haversineKm(ref.lat, ref.lng, dorm.lat, dorm.lng) : null;
      return { dorm, availableRooms, startingRoom, distanceKm };
    });

    if (district) {
      list = list.filter((x) => addressInDistrict(x.dorm.address, district));
    }
    // โหมดรายวัน: ตัดหอที่ไม่มีห้องเปิดรายวันออก
    if (dailyMode) {
      list = list.filter((x) => x.availableRooms.length > 0);
    }
    if (roomType !== 'all') {
      list = list.filter((x) => x.availableRooms.some((r) => r.type.toUpperCase() === roomType.toUpperCase()));
    }
    if (amenity !== 'all') {
      list = list.filter((x) => x.dorm.amenities.includes(amenity));
    }
    if (priceRange !== 'all') {
      list = list.filter((x) => {
        if (!x.startingRoom) return false;
        const p = rPrice(x.startingRoom);
        if (priceRange === 'under3000') return p < 3000;
        if (priceRange === '3000-5000') return p >= 3000 && p <= 5000;
        return p > 5000;
      });
    }
    if (sortBy === 'price_asc') {
      list = [...list].sort((a, b) => (a.startingRoom ? rPrice(a.startingRoom) : Infinity) - (b.startingRoom ? rPrice(b.startingRoom) : Infinity));
    } else if (sortBy === 'price_desc') {
      list = [...list].sort((a, b) => (b.startingRoom ? rPrice(b.startingRoom) : 0) - (a.startingRoom ? rPrice(a.startingRoom) : 0));
    } else if (sortBy === 'distance_asc') {
      list = [...list].sort((a, b) => (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity));
    }
    return list;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [district, dorms, roomType, amenity, priceRange, sortBy, hasPlace, placeLat, placeLng, dailyMode, myLocation]);

  // อำเภออื่นในจังหวัดเดียวกันที่มีหอจริง — ไว้เสนอเมื่อผลไม่ถูกใจ
  const nearbyDistricts = useMemo(() => {
    if (!province) return [];
    const counts = new Map<string, number>();
    for (const d of dorms) {
      const dist = findDistrict(d.address);
      if (!dist || dist === district) continue;
      counts.set(dist, (counts.get(dist) ?? 0) + 1);
    }
    return [...counts.entries()]
      .map(([dist, count]) => ({ district: dist, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 4);
  }, [dorms, province, district]);

  const heroStats = useMemo(() => {
    let cheapest: number | null = null;
    let ratingSum = 0;
    let ratingCount = 0;
    for (const { startingRoom, dorm } of filteredDorms) {
      if (startingRoom && (cheapest === null || rPrice(startingRoom) < cheapest)) {
        cheapest = rPrice(startingRoom);
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
    <main className="mx-auto max-w-[1360px] px-4 py-6 pb-[92px] sm:px-6 sm:pb-6">
      {/* ===== HERO BAND ===== */}
      <div className="relative overflow-hidden rounded-[24px] bg-[linear-gradient(120deg,#12224E_0%,#1E4FB0_55%,#2F6FE0_120%)] p-6 shadow-[0_20px_46px_rgba(18,34,78,0.35)] sm:p-9">
        {/* ลายจุดแผนที่ + วงแสงลอย */}
        <div className="pointer-events-none absolute inset-0 opacity-50 [background-image:radial-gradient(rgba(255,255,255,0.14)_1.4px,transparent_1.5px)] [background-size:22px_22px]" />
        <div className="pointer-events-none absolute -top-20 right-20 h-[320px] w-[320px] animate-[floaty_7s_ease-in-out_infinite] rounded-full bg-[radial-gradient(circle,rgba(91,157,255,0.5),transparent_66%)] blur-[20px]" />
        <div className="pointer-events-none absolute -bottom-24 left-52 h-[240px] w-[240px] animate-[floaty_9s_ease-in-out_infinite] rounded-full bg-[radial-gradient(circle,rgba(31,181,110,0.28),transparent_66%)] blur-[22px]" />

        <div className="relative flex flex-col items-start justify-between gap-7 lg:flex-row lg:items-center">
          <div className="min-w-0 flex-1">
            {/* breadcrumb */}
            <div className="flex items-center gap-2 text-[13px] font-semibold text-[#AFC6F2]">
              <Link href="/" className="text-[#AFC6F2] hover:text-white">
                {t.crumbHome}
              </Link>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                <path d="M9 6l6 6-6 6" stroke="#7E9BD4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span>{t.crumbSearch}</span>
              {province && (
                <>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                    <path d="M9 6l6 6-6 6" stroke="#7E9BD4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <span className="text-white">{provinceLabel(province)}</span>
                </>
              )}
            </div>

            <div className="mt-3.5 flex flex-wrap items-center gap-2.5">
              {province && (
                <div className="inline-flex items-center gap-2 rounded-pill border border-white/30 bg-white/[0.16] px-3.5 py-1.5 text-[13px] font-bold text-white">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                    <path d="M21 10c0 6-9 12-9 12s-9-6-9-12a9 9 0 1118 0z" stroke="#fff" strokeWidth="1.8" />
                    <circle cx="12" cy="10" r="3" stroke="#fff" strokeWidth="1.8" />
                  </svg>
                  {provinceLabel(province)}
                </div>
              )}
              {/* กรองรายอำเภอมาจากหน้าแรก — กด x เพื่อกลับไปดูทั้งจังหวัด */}
              {district && (
                <Link
                  href={`/search?province=${encodeURIComponent(province)}`}
                  className="inline-flex items-center gap-2.5 rounded-pill border border-white/[0.28] bg-white/10 px-3.5 py-1.5 text-[13px] font-semibold text-[#EAF1FF]"
                >
                  {district}
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                    <path d="M6 6l12 12M18 6L6 18" stroke="#EAF1FF" strokeWidth="2.2" strokeLinecap="round" />
                  </svg>
                </Link>
              )}
            </div>

            <h1 className="mt-4 text-[28px] font-extrabold leading-[1.06] tracking-[-1px] text-white sm:text-[40px]">
              {province ? t.heroTitleIn(provinceLabel(province)) : t.heroTitleAll}
            </h1>

            <div className="mt-4 flex flex-wrap items-center gap-2.5">
              {t.heroPills.map((label) => (
                <div
                  key={label}
                  className="inline-flex items-center gap-2 rounded-[10px] border border-white/20 bg-white/10 px-3.5 py-1.5 text-[13px] font-semibold text-[#EAF1FF]"
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="9" stroke="#8FF0C4" strokeWidth="1.8" />
                    <path d="M8 12l3 3 5-6" stroke="#8FF0C4" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  {label}
                </div>
              ))}
            </div>
          </div>

          {/* การ์ดกระจก 3 ใบ */}
          <div className="flex w-full gap-3 sm:w-auto">
            {[
              {
                value: String(heroStats.count),
                label: t.statDorms,
                d: 'M3 21h18M5 21V8l7-4 7 4v13M9 21v-6h6v6',
                stroke: '#fff',
              },
              {
                value: heroStats.cheapest != null ? `฿${heroStats.cheapest.toLocaleString()}` : t.noData,
                label: t.statFrom,
                d: 'M12 3v18M8 7h5a3 3 0 010 6H9a3 3 0 000 6h6',
                stroke: '#8FF0C4',
              },
              {
                value: heroStats.avgRating != null ? heroStats.avgRating.toFixed(1) : t.noData,
                label: t.statRating,
                d: 'M12 2l2.9 6.2 6.8.7-5.1 4.6 1.5 6.7L12 17.8 5.9 20.2l1.5-6.7L2.3 9.9l6.8-.7L12 2z',
                stroke: '#F5B860',
              },
            ].map((c) => (
              <div
                key={c.label}
                className="flex-1 rounded-2xl border border-white/20 bg-white/10 p-4 text-center backdrop-blur sm:w-[120px] sm:flex-none"
              >
                <div className="mx-auto mb-2.5 flex h-[34px] w-[34px] items-center justify-center rounded-[10px] bg-white/[0.16]">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                    <path d={c.d} stroke={c.stroke} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
                <div className="font-sans text-[20px] font-extrabold tracking-[-0.5px] text-white sm:text-[26px]">
                  {c.value}
                </div>
                <div className="mt-0.5 text-[12px] text-[#BFD1EE]">{c.label}</div>
              </div>
            ))}
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
                  {amenityLabel(a, lang)}
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
            {(hasPlace || myLocation) && (
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

        {/* ไม่มีจุดอ้างอิงระยะทาง = เรียงใกล้-ไกลไม่ได้ ให้กดขออนุญาตตำแหน่งเองอีกครั้ง */}
        {!hasPlace && !myLocation && (
          <button
            type="button"
            onClick={askLocation}
            className="flex h-[42px] items-center gap-2 rounded-pill border border-[#D8DCE2] bg-white px-4 text-[13px] font-semibold text-ink-body hover:border-tenant hover:text-tenant"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
              <path d="M12 21s-6.5-5.5-6.5-10a6.5 6.5 0 1113 0c0 4.5-6.5 10-6.5 10z" stroke="currentColor" strokeWidth="1.8" />
              <circle cx="12" cy="11" r="2.5" stroke="currentColor" strokeWidth="1.8" />
            </svg>
            {geoDenied ? t.geoRetry : t.geoUse}
          </button>
        )}
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
        /* จอใหญ่แยกไซด์บาร์ตัวกรองออกมาซ้าย (sticky) — จอเล็กใช้แถบกรองด้านบนเหมือนเดิม */
        <div className="mt-6 grid items-start gap-6 lg:grid-cols-[288px_1fr]">
          <aside className="hidden flex-col gap-4 lg:sticky lg:top-[92px] lg:flex">
            <div className="overflow-hidden rounded-[18px] border border-card-border bg-white shadow-[0_2px_8px_rgba(16,24,40,0.05)]">
              <div className="flex items-center justify-between border-b border-[#F0F2F6] px-[18px] py-4">
                <div className="flex items-center gap-2.5">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                    <path d="M4 6h16M7 12h10M10 18h4" stroke="#2F6FE0" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                  <span className="text-[15.5px] font-extrabold">{t.filtersTitle}</span>
                </div>
                <button
                  onClick={() => {
                    setPriceRange('all');
                    setRoomType('all');
                    setAmenity('all');
                  }}
                  className="text-[12.5px] font-semibold text-tenant"
                >
                  {t.clearFilters}
                </button>
              </div>

              <div className="p-[18px]">
                <div className="mb-3 text-[13.5px] font-bold">{t.priceRangeTitle}</div>
                <div className="flex flex-col gap-1.5">
                  {t.priceRanges.map((o) => (
                    <label key={o.value} className="flex cursor-pointer items-center gap-2.5 py-1">
                      <input
                        type="radio"
                        name="price"
                        checked={priceRange === o.value}
                        onChange={() => setPriceRange(o.value)}
                        className="h-[17px] w-[17px] accent-[#2F6FE0]"
                      />
                      <span className="text-[13.5px] text-[#3A4050]">{o.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="mx-[18px] h-px bg-[#F0F2F6]" />

              <div className="p-[18px]">
                <div className="mb-3 text-[13.5px] font-bold">{t.roomTypeTitle}</div>
                <div className="flex flex-col gap-1.5">
                  {t.roomTypes.map((o) => {
                    // นับจากผลจริงที่กรองอย่างอื่นไว้แล้ว — ตัวเลขต้องตรงกับที่กดแล้วเห็น
                    const count =
                      o.value === 'all'
                        ? filteredDorms.length
                        : filteredDorms.filter((x) =>
                            x.availableRooms.some((r) => r.type.toUpperCase() === o.value.toUpperCase()),
                          ).length;
                    return (
                      <label key={o.value} className="flex cursor-pointer items-center gap-2.5 py-1">
                        <input
                          type="radio"
                          name="roomType"
                          checked={roomType === o.value}
                          onChange={() => setRoomType(o.value)}
                          className="h-[17px] w-[17px] accent-[#2F6FE0]"
                        />
                        <span className="flex-1 text-[13.5px] text-[#3A4050]">{o.label}</span>
                        <span className="font-sans text-[12px] text-ink-faint">{count}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {amenityOptions.length > 0 && (
                <>
                  <div className="mx-[18px] h-px bg-[#F0F2F6]" />
                  <div className="p-[18px]">
                    <div className="mb-3 text-[13.5px] font-bold">{t.amenityTitle}</div>
                    <div className="flex flex-wrap gap-2">
                      {amenityOptions.map((a) => {
                        const on = amenity === a;
                        return (
                          <button
                            key={a}
                            onClick={() => setAmenity(on ? 'all' : a)}
                            className={`rounded-pill border px-3.5 py-1.5 text-[12.5px] font-semibold ${
                              on
                                ? 'border-[#D5E4FF] bg-[#EAF1FF] text-[#1E4FB0]'
                                : 'border-[#EDF0F4] bg-[#F4F6FA] text-[#5B616C]'
                            }`}
                          >
                            {amenityLabel(a, lang)}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* การ์ดแผนที่ */}
            <Link
              href={`/search/map?${params.toString()}`}
              className="relative block h-[210px] overflow-hidden rounded-[18px] border border-card-border bg-[linear-gradient(135deg,#DCE7F5,#EAF1FF)] shadow-[0_2px_8px_rgba(16,24,40,0.05)]"
            >
              <div className="absolute inset-0 [background-image:linear-gradient(rgba(47,111,224,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(47,111,224,0.08)_1px,transparent_1px)] [background-size:26px_26px]" />
              <div className="absolute left-1/2 top-[44%] -translate-x-1/2 -translate-y-full">
                <svg width="34" height="34" viewBox="0 0 24 24" fill="none">
                  <path d="M12 21s-7-5.5-7-11a7 7 0 1114 0c0 5.5-7 11-7 11z" fill="#2F6FE0" stroke="#fff" strokeWidth="1.5" />
                  <circle cx="12" cy="10" r="2.4" fill="#fff" />
                </svg>
              </div>
              <div className="absolute inset-x-3.5 bottom-3.5 flex h-[42px] items-center justify-center gap-2 rounded-[11px] bg-white/95 text-[13.5px] font-bold text-[#1E4FB0] backdrop-blur">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M9 20l-6-3V4l6 3m0 13l6-3m-6 3V7m6 10l6 3V7l-6-3m0 13V4m0 0L9 7"
                    stroke="#2F6FE0"
                    strokeWidth="1.7"
                    strokeLinejoin="round"
                  />
                </svg>
                {t.openMap}
              </div>
            </Link>
          </aside>

          <div className="min-w-0">
          {sponsored.length > 0 && (
            <div className="mt-8">
              <h2 className="font-semibold text-ink-strong">{t.sponsored}</h2>
              <div className="mt-3 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {sponsored.map((c) => {
                  const dorm = c.dorm;
                  const cheapest = dorm.rooms
                    .filter(rOk)
                    .sort((a, b) => rPrice(a) - rPrice(b))[0];
                  return (
                    <Link
                      key={c.id}
                      href={`/dorms/${dorm.id}${dailyMode ? '?rental=daily' : ''}`}
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
                                ฿{rPrice(cheapest).toLocaleString()}
                              </span>
                              <span className="text-ink-faint"> {perUnit}</span>
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
              // ยอดฮิต = รีวิวดี (คะแนน ≥ 4.5 จากรีวิว ≥ 3 ครั้ง)
              const isPopular = (dorm.avgRating ?? 0) >= 4.5 && (dorm.reviewCount ?? 0) >= 3;
              return (
                <Link
                  key={dorm.id}
                  href={`/dorms/${dorm.id}${dailyMode ? '?rental=daily' : ''}`}
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

                    {isPopular && (
                      <span className="absolute left-3.5 top-3.5 inline-flex items-center gap-1 rounded-full bg-[#FF6B35] px-2.5 py-1 text-[11.5px] font-bold text-white shadow">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M12 2c1 3-1 4-2 6-1 2 0 4 2 4s2-2 1-4c3 1 5 4 5 7a6 6 0 11-12 0c0-4 3-6 6-13z" />
                        </svg>
                        {t.popular}
                      </span>
                    )}

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
                      <span className="truncate">
                        {[dorm.university, findDistrict(dorm.address), provinceLabel(dorm.province)]
                          .filter(Boolean)
                          .join(' · ')}
                      </span>
                      {distanceKm != null && (
                        <span className="shrink-0 font-semibold text-tenant">· {t.kmAway(distanceKm)}</span>
                      )}
                    </div>
                    {dorm.amenities.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {dorm.amenities.slice(0, 3).map((a) => (
                          <span
                            key={a}
                            className="rounded-lg border border-[#EDF0F4] bg-[#F4F6FA] px-2.5 py-1 text-[11.5px] font-medium text-[#5B616C]"
                          >
                            {amenityLabel(a, lang)}
                          </span>
                        ))}
                      </div>
                    )}
                    <div className="mt-4 flex items-end justify-between border-t border-[#F0F2F6] pt-3.5">
                      <div>
                        {startingRoom ? (
                          <div>
                            <span className="font-sans text-[22px] font-bold text-tenant">
                              ฿{rPrice(startingRoom).toLocaleString()}
                            </span>
                            <span className="text-xs text-ink-faint"> {perUnit}</span>
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

          {/* ทำเลใกล้เคียง — อำเภออื่นในจังหวัดเดียวกันที่มีหอจริง */}
          {nearbyDistricts.length > 0 && (
            <div className="mt-8">
              <div className="mb-1.5 text-[18px] font-extrabold tracking-[-0.3px]">{t.nearbyTitle}</div>
              <div className="mb-4 text-[13.5px] text-ink-faint">{t.nearbySub}</div>
              <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
                {nearbyDistricts.map((n, i) => {
                  const tone = [
                    { bg: '#EAF1FF', fg: '#2F6FE0' },
                    { bg: '#E7F7EF', fg: '#178F5A' },
                    { bg: '#F3ECFF', fg: '#7C4DE0' },
                    { bg: '#FFF3E0', fg: '#C77B14' },
                  ][i % 4];
                  return (
                    <Link
                      key={n.district}
                      href={`/search?province=${encodeURIComponent(province)}&district=${encodeURIComponent(n.district)}`}
                      className="flex items-center gap-3.5 rounded-[15px] border border-card-border bg-white px-4 py-3.5 shadow-[0_1px_3px_rgba(16,24,40,0.04)] hover:border-[#B9CEF5]"
                    >
                      <span
                        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl"
                        style={{ background: tone.bg }}
                      >
                        <svg width="21" height="21" viewBox="0 0 24 24" fill="none">
                          <path d="M21 10c0 6-9 12-9 12s-9-6-9-12a9 9 0 1118 0z" stroke={tone.fg} strokeWidth="1.8" />
                          <circle cx="12" cy="10" r="3" stroke={tone.fg} strokeWidth="1.8" />
                        </svg>
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[14.5px] font-bold">{n.district}</span>
                        <span className="mt-0.5 block font-sans text-[12px] text-ink-faint">
                          {n.count} {t.dormsUnit}
                        </span>
                      </span>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="shrink-0">
                        <path d="M9 6l6 6-6 6" stroke="#C9D0DC" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}
          </div>
        </div>
      )}

      {/* ปุ่มลอยไปหน้าแผนที่ — มือถือเท่านั้น (จอใหญ่ยังไม่มีแผนที่ในหน้านี้) */}
      <Link
        href={`/search/map?${params.toString()}`}
        className="fixed bottom-5 left-1/2 z-40 flex h-[46px] -translate-x-1/2 items-center gap-2 rounded-pill bg-[#0E1220] px-5 text-[13.5px] font-bold text-white shadow-[0_12px_28px_rgba(8,12,24,0.4)] sm:hidden"
      >
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none">
          <path d="M9 4L3 6v14l6-2 6 2 6-2V4l-6 2-6-2z" stroke="#fff" strokeWidth="1.8" strokeLinejoin="round" />
          <path d="M9 4v14M15 6v14" stroke="#fff" strokeWidth="1.8" />
        </svg>
        {t.mapView}
      </Link>

      {/* ชวนเจ้าของหอลงประกาศ — คนที่หาหอในจังหวัดนี้ไม่เจอ อาจเป็นเจ้าของหอเองก็ได้ */}
      <div className="mt-10 overflow-hidden rounded-[20px] bg-[linear-gradient(120deg,#0E1220,#16233F)] p-6 sm:p-9">
        <div className="flex flex-col items-start gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="text-[19px] font-extrabold tracking-tight text-white sm:text-[22px]">
              {t.ownerCtaTitle(province ? provinceLabel(province) : '')}
            </div>
            <div className="mt-1.5 text-[14px] text-[#C6D3EA]">{t.ownerCtaSub}</div>
          </div>
          <div className="flex w-full shrink-0 gap-2.5 sm:w-auto">
            <Link
              href="/partner-register"
              className="flex h-[46px] flex-1 items-center justify-center rounded-xl bg-tenant px-5 text-[14.5px] font-bold text-white sm:flex-none"
            >
              {t.ownerCtaPrimary}
            </Link>
            <Link
              href="/owners"
              className="flex h-[46px] flex-1 items-center justify-center rounded-xl border border-white/30 px-5 text-[14.5px] font-semibold text-white sm:flex-none"
            >
              {t.ownerCtaSecondary}
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
