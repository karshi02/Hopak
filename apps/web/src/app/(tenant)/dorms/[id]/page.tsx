'use client';

import { useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { useParams, useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api-client';
import { getToken } from '@/lib/auth';
import { useLang } from '@/hooks/useLang';
import type { Dorm, Review, Room } from '@hopak/shared';
import { PageLoader } from '@/components/PageLoader';
import { FavoriteButton } from '@/components/FavoriteButton';
import { useFavorites } from '@/hooks/useFavorites';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { AMENITY_ICON, amenityLabel } from '@/lib/amenities';

const MapPicker = dynamic(() => import('@/components/map/MapPicker'), { ssr: false });

const TEXT = {
  th: {
    search: 'ค้นหา',
    morePhotos: (n: number) => `+${n} รูป`,
    noData: 'ไม่มีข้อมูล',
    costs: 'ค่าใช้จ่าย',
    electricRate: 'ค่าไฟ',
    perUnit: '/ หน่วย',
    waterRate: 'ค่าน้ำ',
    deposit: 'ค่ามัดจำ',
    ownerDescription: 'รายละเอียดหอพัก',
    map: 'ตำแหน่งบนแผนที่',
    availableRooms: 'ประเภทห้องที่ว่าง',
    availableRoomsSub: 'แยกตามประเภท พร้อมรูปห้องจริงของแต่ละแบบ',
    air: 'ห้องแอร์',
    fan: 'ห้องพัดลม',
    airSub: 'เย็นฉ่ำ เหมาะกับหน้าร้อน',
    fanSub: 'เย็นสบาย ประหยัดค่าไฟ',
    fromPrice: (p: string) => `เริ่ม ${p}`,
    perMonth: '/เดือน',
    roomDetailLink: 'ดูรายละเอียดห้อง',
    noRoomsNow: 'ไม่มีห้องว่างตอนนี้',
    reviews: 'รีวิวจากผู้เช่า',
    tenant: 'ผู้เช่า',
    noReviews: 'ยังไม่มีรีวิว',
    fromReviews: (n: number) => `จาก ${n} รีวิว`,
    writeReview: 'เขียนรีวิวของคุณ',
    writeReviewSub: 'แชร์ประสบการณ์การเข้าพัก เพื่อช่วยเพื่อนนักศึกษาคนอื่น',
    rateLabel: 'ให้คะแนน:',
    ratingWords: { 1: 'แย่', 2: 'พอใช้', 3: 'ปานกลาง', 4: 'ดี', 5: 'ดีมาก' } as Record<number, string>,
    reviewRestriction: 'รีวิวได้เฉพาะหอที่คุณเคยจองและชำระเงินแล้ว',
    commentPlaceholder: 'เล่าถึงห้องพัก ความสะอาด เจ้าของหอ ทำเล และสิ่งอำนวยความสะดวก...',
    submitReview: 'ส่งรีวิว',
    reviewError: 'ส่งรีวิวไม่สำเร็จ',
    ownerReplyLabel: 'เจ้าของหอตอบกลับ',
    replyBtn: 'ตอบกลับ',
    replyPlaceholder: 'พิมพ์คำตอบกลับรีวิวนี้...',
    replySubmit: 'ส่งคำตอบ',
    replyCancel: 'ยกเลิก',
    replyError: 'ส่งคำตอบไม่สำเร็จ',
    availableCount: (n: number) => `ว่าง ${n} ห้อง`,
    bookNow: 'จองเลย',
    flowNote: 'ส่งคำขอ → รอเจ้าของหอยืนยัน → ชำระเงิน · ยกเลิกฟรีใน 1 วัน',
    noRoomsRightNow: 'ไม่มีห้องว่างในขณะนี้',
    ownerLabel: 'เจ้าของหอ',
    // modal
    roomAmenities: 'สิ่งอำนวยความสะดวกในห้อง',
    specAvailable: 'ห้องว่าง',
    specRooms: (n: number) => `${n} ห้อง`,
    bookThisRoom: 'จองห้องนี้',
    close: 'ปิด',
    ownDorm: 'นี่คือหอพักของคุณ',
    ownDormSub: 'คุณจองห้องของตัวเองไม่ได้',
    timeAgo: (n: number, unit: 'day' | 'week' | 'month' | 'year') => {
      const u = { day: 'วัน', week: 'สัปดาห์', month: 'เดือน', year: 'ปี' }[unit];
      return n <= 0 ? 'วันนี้' : `${n} ${u}ที่แล้ว`;
    },
  },
  en: {
    search: 'Search',
    morePhotos: (n: number) => `+${n} photos`,
    noData: 'No data',
    costs: 'Costs',
    electricRate: 'Electricity',
    perUnit: '/ unit',
    waterRate: 'Water',
    deposit: 'Deposit',
    ownerDescription: 'Dorm details',
    map: 'Location on map',
    availableRooms: 'Available room types',
    availableRoomsSub: 'Grouped by type, with real photos of each',
    air: 'Air-conditioned',
    fan: 'Fan room',
    airSub: 'Cool and comfy for hot days',
    fanSub: 'Comfortable and low electricity cost',
    fromPrice: (p: string) => `From ${p}`,
    perMonth: '/month',
    roomDetailLink: 'Room details',
    noRoomsNow: 'No rooms available right now',
    reviews: 'Tenant reviews',
    tenant: 'Tenant',
    noReviews: 'No reviews yet',
    fromReviews: (n: number) => `From ${n} reviews`,
    writeReview: 'Write your review',
    writeReviewSub: 'Share your stay to help other students',
    rateLabel: 'Rating:',
    ratingWords: { 1: 'Poor', 2: 'Fair', 3: 'Okay', 4: 'Good', 5: 'Great' } as Record<number, string>,
    reviewRestriction: 'Only tenants who booked and paid for this dorm can review',
    commentPlaceholder: 'Tell us about the room, cleanliness, owner, location, and amenities...',
    submitReview: 'Submit review',
    reviewError: 'Failed to submit review',
    ownerReplyLabel: "Owner's reply",
    replyBtn: 'Reply',
    replyPlaceholder: 'Write a reply to this review...',
    replySubmit: 'Submit reply',
    replyCancel: 'Cancel',
    replyError: 'Failed to submit reply',
    availableCount: (n: number) => `${n} available`,
    bookNow: 'Book now',
    flowNote: 'Request → owner confirms → payment · free cancellation within 1 day',
    noRoomsRightNow: 'No rooms available right now',
    ownerLabel: 'Owner',
    roomAmenities: 'In-room amenities',
    specAvailable: 'Available',
    specRooms: (n: number) => `${n} rooms`,
    bookThisRoom: 'Book this room',
    close: 'Close',
    ownDorm: 'This is your dorm',
    ownDormSub: 'You cannot book your own room',
    timeAgo: (n: number, unit: 'day' | 'week' | 'month' | 'year') => {
      if (n <= 0) return 'Today';
      const label = { day: 'day', week: 'week', month: 'month', year: 'year' }[unit];
      return `${n} ${label}${n > 1 ? 's' : ''} ago`;
    },
  },
};

function relativeTime(dateStr: string, t: (typeof TEXT)['th']) {
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (days < 7) return t.timeAgo(days, 'day');
  if (days < 30) return t.timeAgo(Math.floor(days / 7), 'week');
  if (days < 365) return t.timeAgo(Math.floor(days / 30), 'month');
  return t.timeAgo(Math.floor(days / 365), 'year');
}

function Star({ filled, size = 15 }: { filled: boolean; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={filled ? '#E0902F' : 'none'}>
      <path
        d="M12 2l2.9 6.2 6.8.7-5.1 4.6 1.5 6.7L12 17.8 5.9 20.2l1.5-6.7L2.3 8.9l6.8-.7L12 2z"
        stroke={filled ? '#E0902F' : '#D4D9E2'}
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function StarRow({ rating, size = 13 }: { rating: number; size?: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <Star key={n} filled={n <= Math.round(rating)} size={size} />
      ))}
    </div>
  );
}

/** ภาพปกกลุ่มห้องแบบเลื่อนได้ (ลูกศร + จุด + ตำแหน่ง) — รวมรูปห้องจริงทุกห้องในกลุ่ม */
function RoomGroupCarousel({ images, placeholder }: { images: string[]; placeholder: React.ReactNode }) {
  const [index, setIndex] = useState(0);
  const n = images.length;
  const go = (i: number) => setIndex(((i % n) + n) % n);

  if (n === 0) {
    return <div className="relative flex h-[230px] items-center justify-center bg-surface-canvas">{placeholder}</div>;
  }

  return (
    <div className="relative h-[230px] overflow-hidden rounded-[16px] bg-surface-canvas">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={images[index]} alt="" className="h-full w-full object-cover" />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/55 to-transparent" />
      <span className="absolute right-3 top-3 rounded-full bg-black/50 px-2.5 py-1 text-xs font-semibold text-white backdrop-blur-sm">
        {index + 1} / {n}
      </span>
      {n > 1 && (
        <>
          <button
            type="button"
            onClick={() => go(index - 1)}
            className="absolute left-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 shadow-[0_4px_12px_rgba(11,13,20,0.25)] hover:bg-white"
            aria-label="prev"
          >
            <svg width="19" height="19" viewBox="0 0 24 24" fill="none">
              <path d="M15 6l-6 6 6 6" stroke="#161A22" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <button
            type="button"
            onClick={() => go(index + 1)}
            className="absolute right-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 shadow-[0_4px_12px_rgba(11,13,20,0.25)] hover:bg-white"
            aria-label="next"
          >
            <svg width="19" height="19" viewBox="0 0 24 24" fill="none">
              <path d="M9 6l6 6-6 6" stroke="#161A22" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <div className="absolute inset-x-0 bottom-3 flex justify-center gap-1.5">
            {images.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => go(i)}
                aria-label={`slide ${i + 1}`}
                className={`h-[7px] rounded-full transition-all ${i === index ? 'w-5 bg-white' : 'w-[7px] bg-white/55'}`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

const AVATAR_GRADIENTS = [
  'linear-gradient(135deg,#2F6FE0,#1E4FB0)',
  'linear-gradient(135deg,#178F5A,#12704A)',
  'linear-gradient(135deg,#7C4DE0,#5B32B0)',
  'linear-gradient(135deg,#E0902F,#C77B14)',
];

// รวมห้องประเภทเดียวกันที่ชื่อ+ราคาเหมือนกันเป็น "แบบห้อง" เดียว นับจำนวนห้องว่าง
interface RoomVariant {
  key: string;
  room: Room; // ตัวแทน (ห้องแรก) ใช้จอง + ดึงรูป/ราคา/สิ่งอำนวยความสะดวก
  count: number;
}

export default function DormDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { lang } = useLang();
  const t = TEXT[lang];
  const [dorm, setDorm] = useState<(Dorm & { rooms: Room[] }) | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [reviewRating, setReviewRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [reviewComment, setReviewComment] = useState('');
  const [reviewError, setReviewError] = useState<string | null>(null);
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [replyTargetId, setReplyTargetId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [replySubmitting, setReplySubmitting] = useState(false);
  const [replyError, setReplyError] = useState<string | null>(null);
  const [modalVariant, setModalVariant] = useState<RoomVariant | null>(null);
  const [modalPhotoIdx, setModalPhotoIdx] = useState(0);
  const { favoriteIds, toggle } = useFavorites();
  const { user } = useCurrentUser();
  const isOwnerHere = !!user && !!dorm && user.role.toLowerCase() === 'owner' && user.id === dorm.ownerId;

  function loadReviews() {
    apiClient
      .get<{ reviews: Review[]; avgRating: number | null; count: number }>(`/dorms/${id}/reviews`)
      .then((res) => setReviews(res.reviews));
  }

  useEffect(() => {
    apiClient.get<Dorm & { rooms: Room[] }>(`/dorms/${id}`).then(setDorm);
    loadReviews();
  }, [id]);

  async function handleSubmitReview(e: React.FormEvent) {
    e.preventDefault();
    setReviewError(null);
    setReviewSubmitting(true);
    try {
      await apiClient.post(`/dorms/${id}/reviews`, { rating: reviewRating, comment: reviewComment || undefined });
      setReviewComment('');
      loadReviews();
    } catch (err) {
      setReviewError(err instanceof Error ? err.message : t.reviewError);
    } finally {
      setReviewSubmitting(false);
    }
  }

  async function handleSubmitReply(reviewId: string) {
    setReplyError(null);
    setReplySubmitting(true);
    try {
      await apiClient.patch(`/dorms/${id}/reviews/${reviewId}/reply`, { reply: replyText });
      setReplyTargetId(null);
      setReplyText('');
      loadReviews();
    } catch (err) {
      setReplyError(err instanceof Error ? err.message : t.replyError);
    } finally {
      setReplySubmitting(false);
    }
  }

  const availableRooms = useMemo(
    () => (dorm ? dorm.rooms.filter((r) => r.status.toUpperCase() === 'AVAILABLE') : []),
    [dorm],
  );

  // จัดกลุ่มตามประเภท → แบบห้อง (ชื่อ+ราคาเดียวกัน) นับจำนวนห้องว่าง + รวมรูปทุกห้องในกลุ่ม
  const roomGroups = useMemo(() => {
    return (['AIR', 'FAN'] as const)
      .map((type) => {
        const rooms = availableRooms.filter((r) => r.type.toUpperCase() === type);
        const images = Array.from(new Set(rooms.flatMap((r) => r.images ?? [])));
        const variantMap = new Map<string, RoomVariant>();
        for (const room of rooms) {
          const key = `${room.name ?? ''}|${room.pricePerMonth}`;
          const existing = variantMap.get(key);
          if (existing) existing.count += 1;
          else variantMap.set(key, { key, room, count: 1 });
        }
        const variants = [...variantMap.values()].sort((a, b) => a.room.pricePerMonth - b.room.pricePerMonth);
        const minPrice = variants.length ? variants[0].room.pricePerMonth : 0;
        return { type, rooms, images, variants, minPrice };
      })
      .filter((g) => g.rooms.length > 0);
  }, [availableRooms]);

  if (!dorm) return <PageLoader />;

  const cheapestRoom = [...availableRooms].sort((a, b) => a.pricePerMonth - b.pricePerMonth)[0];
  const hasRating = (dorm.reviewCount ?? 0) > 0 && dorm.avgRating != null;

  // ค่าใช้จ่ายใช้เรตระดับห้อง (ของจริง) ก่อน ตกไป dorm-level เฉพาะเมื่อห้องไม่ได้ตั้ง
  const costDeposit = cheapestRoom?.deposit ?? dorm.deposit;
  const costElectric = cheapestRoom?.electricRate ?? dorm.electricRate;
  const costWater = cheapestRoom?.waterRate ?? dorm.waterRate;
  const hasCosts = costDeposit > 0 || costElectric > 0 || costWater > 0;

  const breakdown = [5, 4, 3, 2, 1].map((star) => {
    const count = reviews.filter((r) => r.rating === star).length;
    const pct = reviews.length > 0 ? Math.round((count / reviews.length) * 100) : 0;
    return { star, count, pct };
  });

  const pickedRating = hoverRating || reviewRating;

  function openRoom(variant: RoomVariant) {
    setModalVariant(variant);
    setModalPhotoIdx(0);
  }

  const modalImages = modalVariant?.room.images ?? [];

  return (
    <main className="mx-auto max-w-[1240px] px-4 py-5 sm:px-6">
      <p className="text-[13px] text-ink-faint">
        <a href="/search" className="hover:text-tenant">
          {t.search}
        </a>{' '}
        · {dorm.province} · <span className="font-semibold text-ink-strong">{dorm.name}</span>
      </p>

      {/* ===== GALLERY ===== */}
      <div className="mt-4 grid h-[280px] gap-3 sm:h-[420px] sm:grid-cols-[1.6fr_1fr]">
        <div className="relative overflow-hidden rounded-[20px] bg-surface-canvas">
          {dorm.images[0] ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={dorm.images[0]} alt="" className="absolute inset-0 h-full w-full object-cover" />
          ) : (
            <div className="flex h-full items-center justify-center font-mono text-xs text-ink-faint">{dorm.name}</div>
          )}
          <FavoriteButton active={favoriteIds.has(dorm.id)} onToggle={() => toggle(dorm.id)} className="absolute right-3.5 top-3.5" />
        </div>
        <div className="hidden grid-rows-2 gap-3 sm:grid">
          <div className="relative overflow-hidden rounded-[20px] bg-surface-canvas">
            {dorm.images[1] && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={dorm.images[1]} alt="" className="absolute inset-0 h-full w-full object-cover" />
            )}
          </div>
          <div className="relative overflow-hidden rounded-[20px] bg-surface-canvas">
            {dorm.images[2] && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={dorm.images[2]} alt="" className="absolute inset-0 h-full w-full object-cover" />
            )}
            {dorm.images.length > 3 && (
              <span className="absolute inset-0 flex items-center justify-center bg-black/45 font-sans text-[15px] font-bold text-white">
                {t.morePhotos(dorm.images.length - 3)}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ===== BODY ===== */}
      <div className="mt-6 grid grid-cols-1 items-start gap-7 lg:grid-cols-[1fr_380px]">
        <div>
          <div className="rounded-[20px] border border-[#EAEDF2] bg-white p-5 shadow-[0_2px_8px_rgba(16,24,40,0.05)] sm:p-[26px]">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
              <div>
                <div className="text-[22px] font-bold tracking-tight sm:text-[27px]">{dorm.name}</div>
                <div className="mt-1.5 flex items-center gap-1.5 text-sm text-ink-faint">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" className="shrink-0">
                    <path d="M21 10c0 6-9 12-9 12s-9-6-9-12a9 9 0 1118 0z" stroke="#9AA0AB" strokeWidth="1.8" />
                    <circle cx="12" cy="10" r="3" stroke="#9AA0AB" strokeWidth="1.8" />
                  </svg>
                  {dorm.university || dorm.address || dorm.province}
                </div>
              </div>
              {hasRating && (
                <div className="flex shrink-0 items-center gap-2 self-start rounded-xl bg-[#FFF3E0] px-3.5 py-2">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="#E0902F">
                    <path d="M12 2l2.9 6.2 6.8.7-5.1 4.6 1.5 6.7L12 17.8 5.9 20.2l1.5-6.7L2.3 8.9l6.8-.7L12 2z" />
                  </svg>
                  <div>
                    <span className="text-[17px] font-bold text-[#0E1220]">{dorm.avgRating!.toFixed(1)}</span>
                    <span className="text-[12.5px] text-[#9A7B3A]"> · {t.fromReviews(dorm.reviewCount ?? 0)}</span>
                  </div>
                </div>
              )}
            </div>

            {dorm.amenities.length > 0 && (
              <div className="mt-[18px] flex flex-wrap gap-2">
                {dorm.amenities.map((a) => (
                  <span
                    key={a}
                    className="flex items-center gap-1.5 rounded-[10px] border border-[#EDF0F4] bg-[#F4F6FA] px-3 py-2 text-[13px] font-medium text-[#3A4050]"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                      <path d="M5 12l5 5 9-11" stroke="#2F6FE0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    {a}
                  </span>
                ))}
              </div>
            )}

            {/* COSTS — เรตระดับห้องจริง (ตกไป dorm-level เมื่อห้องไม่ได้ตั้ง) โชว์เฉพาะเมื่อมีค่าจริง */}
            {hasCosts && (
              <>
                <div className="my-[22px] h-px bg-[#F0F2F6]" />
                <div className="mb-3 text-[16px] font-bold">{t.costs}</div>
                <div className="grid grid-cols-3 gap-3 sm:gap-3.5">
                  {[
                    {
                      label: t.electricRate,
                      value: `฿${costElectric} ${t.perUnit}`,
                      d: 'M13 2L4.5 13.5H11l-1 8.5 8.5-11.5H12l1-8.5z',
                      color: '#E0902F',
                    },
                    {
                      label: t.waterRate,
                      value: `฿${costWater} ${t.perUnit}`,
                      d: 'M12 3s6 6.5 6 11a6 6 0 01-12 0c0-4.5 6-11 6-11z',
                      color: '#2F8FB0',
                    },
                    {
                      label: t.deposit,
                      value: `฿${costDeposit.toLocaleString()}`,
                      d: 'M12 3v18M8 7h5a3 3 0 010 6H9a3 3 0 000 6h6',
                      color: '#178F5A',
                    },
                  ].map((c) => (
                    <div key={c.label} className="rounded-[14px] border border-[#EAEDF2] bg-[#F7F9FC] p-3 sm:p-4">
                      <div className="flex items-center gap-1.5 text-[12.5px] text-ink-faint">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="shrink-0">
                          <path d={c.d} stroke={c.color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                        {c.label}
                      </div>
                      <div className="mt-1.5 text-[16px] font-bold sm:text-[20px]">{c.value}</div>
                    </div>
                  ))}
                </div>
              </>
            )}

            <div className="my-[22px] h-px bg-[#F0F2F6]" />
            <div className="mb-2.5 text-[16px] font-bold">{t.ownerDescription}</div>
            <p className="text-[14.5px] leading-relaxed text-[#5B616C]">{dorm.description || t.noData}</p>
          </div>

          {/* MAP */}
          <div className="mt-5 rounded-[20px] border border-[#EAEDF2] bg-white p-5 shadow-[0_2px_8px_rgba(16,24,40,0.05)] sm:p-[22px]">
            <div className="mb-3.5 text-[16px] font-bold">{t.map}</div>
            <MapPicker lat={dorm.lat} lng={dorm.lng} readOnly />
          </div>

          {/* ROOM TYPES */}
          <div className="mt-5 rounded-[20px] border border-[#EAEDF2] bg-white p-5 shadow-[0_2px_8px_rgba(16,24,40,0.05)] sm:p-[22px]">
            <div className="text-[16px] font-bold">{t.availableRooms}</div>
            <div className="mt-1 text-[13px] text-ink-faint">{t.availableRoomsSub}</div>

            <div className="mt-4 flex flex-col gap-6">
              {roomGroups.map((group) => {
                const isAir = group.type === 'AIR';
                return (
                  <div key={group.type}>
                    {/* group header */}
                    <div className="mb-3 flex items-center gap-2.5">
                      <span
                        className={`flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-[11px] ${
                          isAir ? 'bg-[#E7F7EF]' : 'bg-[#EAF1FF]'
                        }`}
                      >
                        {isAir ? (
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                            <path d="M4 9h16M6 13h.01M10 13h4M6 17c0 2 2 2 2 0" stroke="#178F5A" strokeWidth="1.8" strokeLinecap="round" />
                          </svg>
                        ) : (
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                            <circle cx="12" cy="12" r="2" stroke="#2F6FE0" strokeWidth="1.8" />
                            <path d="M12 8c3-3 6-1 5 1M12 12c-3 3-6 1-5-1" stroke="#2F6FE0" strokeWidth="1.8" strokeLinecap="round" />
                          </svg>
                        )}
                      </span>
                      <div className="flex-1">
                        <div className="text-[16px] font-bold">{isAir ? t.air : t.fan}</div>
                        <div className="text-xs text-ink-faint">{isAir ? t.airSub : t.fanSub}</div>
                      </div>
                      <span
                        className={`shrink-0 rounded-full px-3 py-1.5 text-[12.5px] font-bold ${
                          isAir ? 'bg-[#E7F7EF] text-[#12704A]' : 'bg-[#EAF1FF] text-tenant'
                        }`}
                      >
                        {t.fromPrice(`฿${group.minPrice.toLocaleString()}`)}
                      </span>
                    </div>

                    {/* carousel */}
                    <RoomGroupCarousel
                      images={group.images}
                      placeholder={<span className="text-xs text-ink-faint">{isAir ? t.air : t.fan}</span>}
                    />

                    {/* variant rows */}
                    <div className="mt-3 flex flex-col gap-2.5">
                      {group.variants.map((variant) => {
                        const room = variant.room;
                        const label = room.name || (isAir ? t.air : t.fan);
                        const thumb = room.images?.[0];
                        return (
                          <div
                            key={variant.key}
                            onClick={() => openRoom(variant)}
                            className="flex cursor-pointer items-center gap-3.5 rounded-[14px] border border-[#EAEDF2] p-2.5 hover:border-[#B9CEF5] hover:bg-[#FBFCFE]"
                          >
                            <div className="relative h-[60px] w-[74px] shrink-0 overflow-hidden rounded-[11px] bg-surface-canvas">
                              {thumb && (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={thumb} alt="" className="h-full w-full object-cover" />
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="truncate text-[14.5px] font-bold">{label}</div>
                              {room.description && (
                                <div className="mt-0.5 truncate text-xs text-ink-faint">{room.description}</div>
                              )}
                              <span className="mt-1.5 inline-flex items-center gap-1 text-xs font-bold text-tenant">
                                {t.roomDetailLink}
                                <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                                  <path d="M9 6l6 6-6 6" stroke="#2F6FE0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                              </span>
                            </div>
                            <span className="hidden shrink-0 rounded-full bg-[#E7F7EF] px-2.5 py-1 text-[11.5px] font-bold text-[#12704A] sm:inline">
                              {t.availableCount(variant.count)}
                            </span>
                            <div className="min-w-[80px] shrink-0 text-right sm:min-w-[90px]">
                              <span className="text-[17px] font-bold text-tenant sm:text-[18px]">
                                ฿{room.pricePerMonth.toLocaleString()}
                              </span>
                              <span className="text-xs text-ink-faint">{t.perMonth}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
              {availableRooms.length === 0 && <p className="text-sm text-ink-faint">{t.noRoomsNow}</p>}
            </div>
          </div>

          {/* ===== REVIEWS ===== */}
          <div className="mt-5 rounded-[20px] border border-[#EAEDF2] bg-white p-5 shadow-[0_2px_8px_rgba(16,24,40,0.05)] sm:p-[26px]">
            <div className="text-[18px] font-bold">{t.reviews}</div>

            {reviews.length > 0 && (
              <div className="mt-4 flex flex-col items-center gap-6 rounded-2xl border border-[#E8EEF7] bg-[linear-gradient(135deg,#F7F9FC,#EFF4FB)] px-5 py-5 sm:flex-row sm:gap-8">
                <div className="shrink-0 text-center">
                  <div className="text-[44px] font-bold leading-none tracking-tight">{(dorm.avgRating ?? 0).toFixed(1)}</div>
                  <div className="mt-2 flex justify-center gap-0.5">
                    <StarRow rating={dorm.avgRating ?? 0} size={16} />
                  </div>
                  <div className="mt-1.5 text-[12.5px] text-ink-faint">{t.fromReviews(reviews.length)}</div>
                </div>
                <div className="w-full flex-1">
                  {breakdown.map((b) => (
                    <div key={b.star} className="mb-1.5 flex items-center gap-2.5">
                      <span className="w-3 text-xs text-ink-faint">{b.star}</span>
                      <Star filled size={12} />
                      <div className="h-[7px] flex-1 overflow-hidden rounded-full bg-[#E7EBF1]">
                        <div
                          className="h-full rounded-full bg-[linear-gradient(90deg,#E0902F,#F0A94A)]"
                          style={{ width: `${b.pct}%` }}
                        />
                      </div>
                      <span className="w-8 text-right text-xs text-ink-faint">{b.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-[22px] flex flex-col gap-[18px]">
              {reviews.map((r, i) => (
                <div key={r.id} className="flex gap-3.5">
                  <div
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-[15px] font-bold text-white"
                    style={{ background: AVATAR_GRADIENTS[i % AVATAR_GRADIENTS.length] }}
                  >
                    {(r.tenant?.name ?? t.tenant).slice(0, 1)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2.5">
                      <span className="text-[14.5px] font-bold">{r.tenant?.name ?? t.tenant}</span>
                      <span className="text-xs text-ink-faint">{relativeTime(r.createdAt, t)}</span>
                    </div>
                    <div className="mt-1">
                      <StarRow rating={r.rating} />
                    </div>
                    {r.comment && <div className="mt-2 text-sm leading-relaxed text-[#5B616C]">{r.comment}</div>}

                    {r.reply ? (
                      <div className="mt-2.5 rounded-lg bg-surface-canvas p-2.5">
                        <p className="text-xs font-semibold text-ink-strong">{t.ownerReplyLabel}</p>
                        <p className="mt-1 text-sm text-ink-subtitle">{r.reply}</p>
                      </div>
                    ) : (
                      isOwnerHere &&
                      (replyTargetId === r.id ? (
                        <div className="mt-2.5">
                          <textarea
                            value={replyText}
                            onChange={(e) => setReplyText(e.target.value)}
                            placeholder={t.replyPlaceholder}
                            rows={2}
                            className="w-full rounded-btn border border-card-border p-2.5 text-sm text-ink placeholder:text-ink-faint"
                          />
                          {replyError && <p className="mt-1 text-xs text-danger">{replyError}</p>}
                          <div className="mt-1.5 flex gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                setReplyTargetId(null);
                                setReplyError(null);
                              }}
                              className="rounded-btn border border-card-border px-3 py-1.5 text-xs font-semibold text-ink-subtitle"
                            >
                              {t.replyCancel}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleSubmitReply(r.id)}
                              disabled={replySubmitting || !replyText.trim()}
                              className="rounded-btn bg-tenant px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-60"
                            >
                              {t.replySubmit}
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            setReplyTargetId(r.id);
                            setReplyText('');
                            setReplyError(null);
                          }}
                          className="mt-2 text-xs font-semibold text-tenant hover:underline"
                        >
                          {t.replyBtn}
                        </button>
                      ))
                    )}
                  </div>
                </div>
              ))}
              {reviews.length === 0 && <p className="text-sm text-ink-faint">{t.noReviews}</p>}
            </div>

            <div className="my-6 h-px bg-[#F0F2F6]" />

            {getToken() && (
              <form onSubmit={handleSubmitReview}>
                <div className="text-[16px] font-bold">{t.writeReview}</div>
                <p className="mt-1 text-[13px] text-ink-faint">{t.writeReviewSub}</p>
                <p className="mt-1 text-xs text-ink-faint">{t.reviewRestriction}</p>

                <div className="mt-4 flex flex-wrap items-center gap-3">
                  <span className="text-sm font-semibold text-[#3A4050]">{t.rateLabel}</span>
                  <div className="flex gap-1" onMouseLeave={() => setHoverRating(0)}>
                    {[1, 2, 3, 4, 5].map((n) => (
                      <button
                        type="button"
                        key={n}
                        onMouseEnter={() => setHoverRating(n)}
                        onClick={() => setReviewRating(n)}
                      >
                        <Star filled={n <= pickedRating} size={28} />
                      </button>
                    ))}
                  </div>
                  <span className="text-[13.5px] font-bold text-[#E0902F]">{t.ratingWords[pickedRating]}</span>
                </div>

                <textarea
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                  placeholder={t.commentPlaceholder}
                  rows={3}
                  className="mt-3.5 w-full rounded-[14px] border-[1.5px] border-card-border bg-[#F7F9FC] p-4 text-sm text-ink placeholder:text-ink-faint focus:border-tenant focus:outline-none"
                />
                {reviewError && <p className="mt-1.5 text-sm text-danger">{reviewError}</p>}
                <div className="mt-3.5 flex justify-end">
                  <button
                    type="submit"
                    disabled={reviewSubmitting}
                    className="rounded-xl bg-[linear-gradient(135deg,#2F6FE0,#5B9DFF)] px-7 py-3 text-[14.5px] font-bold text-white shadow-[0_8px_18px_rgba(47,111,224,0.32)] disabled:opacity-60"
                  >
                    {t.submitReview}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>

        {/* ===== RIGHT: BOOKING CARD ===== */}
        <div className="lg:sticky lg:top-[88px]">
          <div className="rounded-[20px] border border-[#EAEDF2] bg-white p-6 shadow-[0_8px_26px_rgba(16,24,40,0.1)]">
            {cheapestRoom ? (
              <>
                <div className="flex items-baseline gap-1.5">
                  <span className="font-sans text-[34px] font-bold tracking-tight text-tenant">
                    ฿{cheapestRoom.pricePerMonth.toLocaleString()}
                  </span>
                  <span className="text-[15px] text-ink-faint">{t.perMonth}</span>
                </div>
                <div className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-[#E7F7EF] px-3 py-1.5 text-[12.5px] font-bold text-[#12704A]">
                  <span className="h-[7px] w-[7px] rounded-full bg-[#1FB56E]" />
                  {t.availableCount(availableRooms.length)}
                </div>

                <div className="my-4 flex flex-col gap-2.5">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-ink-faint">{t.deposit}</span>
                    <span className="font-semibold">฿{costDeposit.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-ink-faint">{t.electricRate}</span>
                    <span className="font-semibold">
                      ฿{costElectric} {t.perUnit}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-ink-faint">{t.waterRate}</span>
                    <span className="font-semibold">
                      ฿{costWater} {t.perUnit}
                    </span>
                  </div>
                </div>

                {isOwnerHere ? (
                  <div className="flex items-center gap-2.5 rounded-xl bg-[#F7F9FC] p-3.5">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="shrink-0">
                      <path d="M4 11l8-6 8 6M6 10v9h12v-9" stroke="#8A909F" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    <div>
                      <div className="text-[13.5px] font-bold text-ink-strong">{t.ownDorm}</div>
                      <div className="text-[11.5px] text-ink-faint">{t.ownDormSub}</div>
                    </div>
                  </div>
                ) : (
                  <>
                    <button
                      onClick={() => router.push(`/bookings/new?roomId=${cheapestRoom.id}`)}
                      className="h-[52px] w-full rounded-[13px] bg-[linear-gradient(135deg,#2F6FE0,#5B9DFF)] text-[16px] font-bold text-white shadow-[0_10px_22px_rgba(47,111,224,0.35)]"
                    >
                      {t.bookNow}
                    </button>
                    <div className="mt-3.5 flex items-center gap-2 rounded-xl bg-[#F7F9FC] p-3">
                      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" className="shrink-0">
                        <path d="M12 3l7 4v5c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V7l7-4z" stroke="#178F5A" strokeWidth="1.8" strokeLinejoin="round" />
                      </svg>
                      <span className="text-[11.5px] leading-relaxed text-[#5B616C]">{t.flowNote}</span>
                    </div>
                  </>
                )}
              </>
            ) : (
              <p className="text-sm text-ink-faint">{t.noRoomsRightNow}</p>
            )}
          </div>

          {dorm.owner?.name && (
            <div className="mt-3.5 flex items-center gap-2.5 rounded-2xl border border-[#EAEDF2] bg-white p-3.5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[linear-gradient(135deg,#2F6FE0,#1E4FB0)] text-sm font-bold text-white">
                {dorm.owner.name.slice(0, 1)}
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-[13.5px] font-bold">
                  {dorm.owner.name} · {t.ownerLabel}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ===== ROOM DETAIL MODAL ===== */}
      {modalVariant && (
        <div
          onClick={() => setModalVariant(null)}
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/55 p-4 backdrop-blur-sm sm:p-8"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="max-h-[90vh] w-full max-w-[920px] overflow-auto rounded-[24px] bg-white shadow-[0_30px_80px_rgba(11,13,20,0.4)]"
          >
            <div className="grid grid-cols-1 md:grid-cols-[1.15fr_1fr]">
              {/* gallery */}
              <div className="p-[18px]">
                <div className="relative h-[240px] overflow-hidden rounded-[16px] bg-surface-canvas sm:h-[300px]">
                  {modalImages[modalPhotoIdx] ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={modalImages[modalPhotoIdx]} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full items-center justify-center text-xs text-ink-faint">{modalVariant.room.name}</div>
                  )}
                </div>
                {modalImages.length > 1 && (
                  <div className="mt-2.5 grid grid-cols-4 gap-2.5">
                    {modalImages.slice(0, 8).map((img, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => setModalPhotoIdx(i)}
                        className={`relative h-16 overflow-hidden rounded-[11px] border-2 ${
                          i === modalPhotoIdx ? 'border-tenant' : 'border-transparent'
                        }`}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={img} alt="" className="h-full w-full object-cover" />
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* info */}
              <div className="flex flex-col p-6 pt-0 md:pl-2 md:pt-6">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-[22px] font-bold tracking-tight">
                      {modalVariant.room.name || (modalVariant.room.type.toUpperCase() === 'AIR' ? t.air : t.fan)}
                    </div>
                    {modalVariant.room.description && (
                      <div className="mt-1 text-[13px] text-ink-faint">{modalVariant.room.description}</div>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => setModalVariant(null)}
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-surface-canvas hover:bg-card-border/50"
                    aria-label={t.close}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                      <path d="M6 6l12 12M18 6L6 18" stroke="#3A4050" strokeWidth="2" strokeLinecap="round" />
                    </svg>
                  </button>
                </div>

                <div className="mt-3.5">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-[#E7F7EF] px-3 py-1.5 text-[12.5px] font-bold text-[#12704A]">
                    <span className="h-[7px] w-[7px] rounded-full bg-[#1FB56E]" />
                    {t.availableCount(modalVariant.count)}
                  </span>
                </div>

                {/* spec grid — เฉพาะข้อมูลจริงที่ระบบเก็บ (ห้องว่าง/มัดจำ/ค่าไฟ/ค่าน้ำ) */}
                <div className="mt-4 grid grid-cols-2 gap-2.5">
                  {[
                    { label: t.specAvailable, value: t.specRooms(modalVariant.count), d: 'M3 21V8l9-5 9 5v13M9 21v-6h6v6' },
                    {
                      label: t.deposit,
                      value: `฿${(modalVariant.room.deposit ?? dorm.deposit).toLocaleString()}`,
                      d: 'M12 3v18M8 7h5a3 3 0 010 6H9a3 3 0 000 6h6',
                    },
                    {
                      label: t.electricRate,
                      value: `฿${modalVariant.room.electricRate ?? dorm.electricRate} ${t.perUnit}`,
                      d: 'M13 2L4.5 13.5H11l-1 8.5 8.5-11.5H12l1-8.5z',
                    },
                    {
                      label: t.waterRate,
                      value: `฿${modalVariant.room.waterRate ?? dorm.waterRate} ${t.perUnit}`,
                      d: 'M12 3s6 6.5 6 11a6 6 0 01-12 0c0-4.5 6-11 6-11z',
                    },
                  ].map((s) => (
                    <div key={s.label} className="flex items-center gap-2.5 rounded-[12px] border border-[#EEF1F6] bg-[#F7F9FC] p-2.5">
                      <span className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-[9px] bg-[#EAF1FF]">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                          <path d={s.d} stroke="#2F6FE0" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </span>
                      <div className="min-w-0">
                        <div className="text-[10.5px] text-ink-faint">{s.label}</div>
                        <div className="truncate text-[13px] font-bold">{s.value}</div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* amenities */}
                {(modalVariant.room.amenities?.length ?? 0) > 0 && (
                  <>
                    <div className="mb-2.5 mt-[18px] text-[13px] font-bold">{t.roomAmenities}</div>
                    <div className="flex flex-wrap gap-2">
                      {modalVariant.room.amenities!.map((a) => (
                        <span
                          key={a}
                          className="flex items-center gap-1.5 rounded-[9px] border border-card-border bg-white px-2.5 py-1.5 text-[12.5px] text-[#3A4050]"
                        >
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                            <path
                              d={AMENITY_ICON[a] ?? 'M5 12l4 4 10-11'}
                              stroke="#178F5A"
                              strokeWidth="1.9"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                          {amenityLabel(a, lang)}
                        </span>
                      ))}
                    </div>
                  </>
                )}

                {/* price + cta */}
                <div className="mt-auto pt-5">
                  <div className="flex items-end justify-between gap-3 border-t border-[#F0F2F6] pt-4">
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-[26px] font-bold tracking-tight text-tenant sm:text-[30px]">
                        ฿{modalVariant.room.pricePerMonth.toLocaleString()}
                      </span>
                      <span className="text-[14px] text-ink-faint">{t.perMonth}</span>
                    </div>
                    {isOwnerHere ? (
                      <span className="text-[12.5px] font-semibold text-ink-faint">{t.ownDormSub}</span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => router.push(`/bookings/new?roomId=${modalVariant.room.id}`)}
                        className="h-[50px] shrink-0 rounded-[13px] bg-[linear-gradient(135deg,#2F6FE0,#5B9DFF)] px-6 text-[15px] font-bold text-white shadow-[0_10px_22px_rgba(47,111,224,0.32)] sm:px-[30px]"
                      >
                        {t.bookThisRoom}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
