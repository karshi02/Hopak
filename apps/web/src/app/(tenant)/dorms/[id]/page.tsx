'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { useParams, useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api-client';
import { getToken } from '@/lib/auth';
import { useLang } from '@/hooks/useLang';
import type { Dorm, Review, Room } from '@hopak/shared';
import { PageLoader } from '@/components/PageLoader';
import { FavoriteButton } from '@/components/FavoriteButton';
import { StarRating } from '@/components/StarRating';
import { useFavorites } from '@/hooks/useFavorites';

const MapPicker = dynamic(() => import('@/components/map/MapPicker'), { ssr: false });

const TEXT = {
  th: {
    search: 'ค้นหา',
    mainPhoto: 'รูปหลัก',
    photo: 'รูป',
    morePhotos: (n: number) => `+${n} รูป`,
    amenities: 'สิ่งอำนวยความสะดวก',
    noData: 'ไม่มีข้อมูล',
    electricRate: 'ค่าไฟ',
    perUnit: '/ หน่วย',
    waterRate: 'ค่าน้ำ',
    deposit: 'ค่ามัดจำ',
    ownerDescription: 'คำอธิบายจากเจ้าของหอ',
    map: 'แผนที่',
    availableRooms: 'ห้องว่าง',
    air: 'ห้องแอร์',
    fan: 'ห้องพัดลม',
    perMonth: '/เดือน',
    book: 'จอง',
    noRoomsNow: 'ไม่มีห้องว่างตอนนี้',
    reviews: 'รีวิว',
    tenant: 'ผู้เช่า',
    noReviews: 'ยังไม่มีรีวิว',
    writeReview: 'เขียนรีวิว',
    reviewRestriction: 'รีวิวได้เฉพาะหอที่คุณเคยจองและชำระเงินแล้ว',
    stars: 'ดาว',
    commentPlaceholder: 'ความคิดเห็นเพิ่มเติม (ถ้ามี)',
    submitReview: 'ส่งรีวิว',
    reviewError: 'ส่งรีวิวไม่สำเร็จ',
    availableCount: (n: number) => `ว่าง ${n} ห้อง`,
    bookNow: 'จองเลย',
    flowNote: 'ส่งคำขอ → รอเจ้าของหอยืนยัน → ชำระเงิน · ยกเลิกฟรีใน 1 วัน',
    noRoomsRightNow: 'ไม่มีห้องว่างในขณะนี้',
  },
  en: {
    search: 'Search',
    mainPhoto: 'Main photo',
    photo: 'Photo',
    morePhotos: (n: number) => `+${n} photos`,
    amenities: 'Amenities',
    noData: 'No data',
    electricRate: 'Electricity rate',
    perUnit: '/ unit',
    waterRate: 'Water rate',
    deposit: 'Deposit',
    ownerDescription: "Owner's description",
    map: 'Map',
    availableRooms: 'Available Rooms',
    air: 'Air-conditioned',
    fan: 'Fan room',
    perMonth: '/month',
    book: 'Book',
    noRoomsNow: 'No rooms available right now',
    reviews: 'Reviews',
    tenant: 'Tenant',
    noReviews: 'No reviews yet',
    writeReview: 'Write a review',
    reviewRestriction: 'Only tenants who booked and paid for this dorm can review',
    stars: 'stars',
    commentPlaceholder: 'Additional comments (optional)',
    submitReview: 'Submit review',
    reviewError: 'Failed to submit review',
    availableCount: (n: number) => `${n} available`,
    bookNow: 'Book now',
    flowNote: 'Request → owner confirms → payment · free cancellation within 1 day',
    noRoomsRightNow: 'No rooms available right now',
  },
};

export default function DormDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { lang } = useLang();
  const t = TEXT[lang];
  const [dorm, setDorm] = useState<(Dorm & { rooms: Room[] }) | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [reviewError, setReviewError] = useState<string | null>(null);
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const { favoriteIds, toggle } = useFavorites();

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

  if (!dorm) return <PageLoader />;

  const availableRooms = dorm.rooms.filter((r) => r.status.toUpperCase() === 'AVAILABLE');
  const cheapestRoom = [...availableRooms].sort((a, b) => a.pricePerMonth - b.pricePerMonth)[0];

  return (
    <main className="mx-auto max-w-6xl p-6">
      <p className="text-xs text-ink-faint">
        <a href="/search" className="hover:text-tenant">
          {t.search}
        </a>{' '}
        › {dorm.province} › <span className="text-ink">{dorm.name}</span>
      </p>

      <div className="relative mt-4 grid grid-cols-2 grid-rows-2 gap-2.5 overflow-hidden rounded-card" style={{ height: 280 }}>
        <div className="col-span-1 row-span-2 flex items-center justify-center bg-surface-canvas font-mono text-xs text-ink-faint">
          {t.mainPhoto}
        </div>
        <div className="flex items-center justify-center bg-surface-canvas font-mono text-xs text-ink-faint">{t.photo}</div>
        <div className="flex items-center justify-center bg-surface-canvas font-mono text-xs text-ink-faint">
          {dorm.images.length > 2 ? t.morePhotos(dorm.images.length - 2) : t.photo}
        </div>
        <FavoriteButton active={favoriteIds.has(dorm.id)} onToggle={() => toggle(dorm.id)} />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-8 lg:grid-cols-[1.7fr_1fr]">
        <div>
          <div className="flex items-start justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold text-ink-strong dark:text-white">{dorm.name}</h1>
              <p className="mt-1.5 text-sm text-ink-subtitle">{dorm.province}</p>
            </div>
            <StarRating rating={dorm.avgRating} count={dorm.reviewCount} />
          </div>

          <div className="my-5 h-px bg-card-border" />

          <h2 className="mb-3 font-semibold text-ink-strong dark:text-white">{t.amenities}</h2>
          <div className="flex flex-wrap gap-2">
            {dorm.amenities.map((a) => (
              <span key={a} className="rounded-lg bg-surface-canvas px-3 py-2 text-sm text-ink">
                {a}
              </span>
            ))}
            {dorm.amenities.length === 0 && <p className="text-sm text-ink-faint">{t.noData}</p>}
          </div>

          <div className="mt-6 flex gap-3.5">
            <div className="flex-1 rounded-xl border border-card-border bg-surface-web p-3.5">
              <p className="text-xs text-ink-faint">{t.electricRate}</p>
              <p className="mt-0.5 font-sans text-base font-bold text-ink-strong dark:text-white">
                ฿{dorm.electricRate} {t.perUnit}
              </p>
            </div>
            <div className="flex-1 rounded-xl border border-card-border bg-surface-web p-3.5">
              <p className="text-xs text-ink-faint">{t.waterRate}</p>
              <p className="mt-0.5 font-sans text-base font-bold text-ink-strong dark:text-white">
                ฿{dorm.waterRate} {t.perUnit}
              </p>
            </div>
            <div className="flex-1 rounded-xl border border-card-border bg-surface-web p-3.5">
              <p className="text-xs text-ink-faint">{t.deposit}</p>
              <p className="mt-0.5 font-sans text-base font-bold text-ink-strong dark:text-white">
                ฿{dorm.deposit.toLocaleString()}
              </p>
            </div>
          </div>

          <h2 className="mb-3 mt-6 font-semibold text-ink-strong dark:text-white">{t.ownerDescription}</h2>
          <p className="text-sm leading-relaxed text-ink-subtitle">{dorm.description}</p>

          <h2 className="mb-3 mt-6 font-semibold text-ink-strong dark:text-white">{t.map}</h2>
          <MapPicker lat={dorm.lat} lng={dorm.lng} readOnly />

          <h2 className="mb-3 mt-6 font-semibold text-ink-strong dark:text-white">{t.availableRooms}</h2>
          <div className="flex flex-col gap-2">
            {availableRooms.map((room) => (
              <div
                key={room.id}
                className="flex items-center justify-between rounded-xl border border-card-border p-3.5"
              >
                <span className="text-sm text-ink">
                  {room.type.toUpperCase() === 'AIR' ? t.air : t.fan} —{' '}
                  <b className="font-sans">฿{room.pricePerMonth.toLocaleString()}</b>{t.perMonth}
                </span>
                <button
                  onClick={() => router.push(`/bookings/new?roomId=${room.id}`)}
                  className="rounded-btn bg-tenant px-3.5 py-1.5 text-sm font-medium text-white hover:bg-tenant-dark"
                >
                  {t.book}
                </button>
              </div>
            ))}
            {availableRooms.length === 0 && <p className="text-sm text-ink-faint">{t.noRoomsNow}</p>}
          </div>

          <h2 className="mb-3 mt-6 font-semibold text-ink-strong dark:text-white">
            {t.reviews} <StarRating rating={dorm.avgRating} count={dorm.reviewCount} />
          </h2>
          <div className="flex flex-col gap-3">
            {reviews.map((r) => (
              <div key={r.id} className="rounded-xl border border-card-border p-3.5">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-ink-strong dark:text-white">
                    {r.tenant?.name ?? t.tenant}
                  </span>
                  <StarRating rating={r.rating} />
                </div>
                {r.comment && <p className="mt-1.5 text-sm text-ink-subtitle">{r.comment}</p>}
              </div>
            ))}
            {reviews.length === 0 && <p className="text-sm text-ink-faint">{t.noReviews}</p>}
          </div>

          {getToken() && (
            <form onSubmit={handleSubmitReview} className="mt-4 rounded-xl border border-card-border p-3.5">
              <p className="text-sm font-medium text-ink-strong dark:text-white">{t.writeReview}</p>
              <p className="mt-0.5 text-xs text-ink-faint">{t.reviewRestriction}</p>
              <select
                value={reviewRating}
                onChange={(e) => setReviewRating(Number(e.target.value))}
                className="mt-2.5 rounded-btn border border-card-border px-3 py-2 text-sm text-ink dark:border-white/10 dark:bg-[#1a1a19] dark:text-white"
              >
                {[5, 4, 3, 2, 1].map((n) => (
                  <option key={n} value={n}>
                    {n} {t.stars}
                  </option>
                ))}
              </select>
              <textarea
                value={reviewComment}
                onChange={(e) => setReviewComment(e.target.value)}
                placeholder={t.commentPlaceholder}
                className="mt-2.5 w-full rounded-btn border border-card-border p-3 text-sm text-ink placeholder:text-ink-faint dark:border-white/10 dark:bg-[#1a1a19] dark:text-white"
                rows={2}
              />
              {reviewError && <p className="mt-1.5 text-sm text-danger">{reviewError}</p>}
              <button
                type="submit"
                disabled={reviewSubmitting}
                className="mt-2.5 rounded-btn bg-tenant px-4 py-2 text-sm font-medium text-white hover:bg-tenant-dark disabled:opacity-60"
              >
                {t.submitReview}
              </button>
            </form>
          )}
        </div>

        <div className="h-fit rounded-card border border-card-border bg-white p-5 shadow-sm dark:bg-[#1a1a19] lg:sticky lg:top-6">
          {cheapestRoom ? (
            <>
              <div className="flex items-baseline gap-1.5">
                <span className="font-sans text-2xl font-bold text-ink-strong dark:text-white">
                  ฿{cheapestRoom.pricePerMonth.toLocaleString()}
                </span>
                <span className="text-sm text-ink-faint">{t.perMonth}</span>
              </div>
              <span className="mt-1.5 inline-block rounded-full bg-success/10 px-2.5 py-1 text-xs font-semibold text-success">
                {t.availableCount(availableRooms.length)}
              </span>
              <button
                onClick={() => router.push(`/bookings/new?roomId=${cheapestRoom.id}`)}
                className="mt-4 w-full rounded-btn bg-tenant py-3 text-sm font-semibold text-white hover:bg-tenant-dark"
              >
                {t.bookNow}
              </button>
              <p className="mt-3.5 text-center text-xs leading-relaxed text-ink-faint">{t.flowNote}</p>
            </>
          ) : (
            <p className="text-sm text-ink-faint">{t.noRoomsRightNow}</p>
          )}
        </div>
      </div>
    </main>
  );
}
