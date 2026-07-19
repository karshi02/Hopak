'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { PROVINCES } from '@hopak/shared';
import type { Campaign, Dorm, Room } from '@hopak/shared';

type SponsoredCampaign = Campaign & { dorm: Dorm & { rooms: Room[] } };
import { useDormSearch } from '@/hooks/useDormSearch';
import { useFavorites } from '@/hooks/useFavorites';
import { apiClient } from '@/lib/api-client';
import { PageLoader } from '@/components/PageLoader';
import { FavoriteButton } from '@/components/FavoriteButton';
import { StarRating } from '@/components/StarRating';

const PRICE_RANGES = [
  { value: 'all', label: 'ราคาทั้งหมด' },
  { value: 'under3000', label: 'ต่ำกว่า 3,000' },
  { value: '3000-5000', label: '3,000 - 5,000' },
  { value: 'above5000', label: 'มากกว่า 5,000' },
];

const ROOM_TYPES = [
  { value: 'all', label: 'ทุกประเภทห้อง' },
  { value: 'air', label: 'แอร์' },
  { value: 'fan', label: 'พัดลม' },
];

const SORTS = [
  { value: 'recommended', label: 'แนะนำ' },
  { value: 'price_asc', label: 'ราคา ต่ำ - สูง' },
  { value: 'price_desc', label: 'ราคา สูง - ต่ำ' },
];

export default function SearchPage() {
  const params = useSearchParams();
  const [province, setProvince] = useState<string>('');
  const [priceRange, setPriceRange] = useState('all');
  const [roomType, setRoomType] = useState('all');
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

  const selectClass =
    'rounded-full border border-card-border bg-white px-4 py-2 text-sm font-medium text-ink outline-none dark:border-white/10 dark:bg-[#1a1a19] dark:text-white';

  return (
    <main className="mx-auto max-w-6xl p-6">
      <h1 className="text-xl font-bold text-ink-strong dark:text-white">ค้นหาหอพัก</h1>

      <div className="mt-4 flex flex-wrap items-center gap-2.5">
        <button
          onClick={() => setProvince('')}
          className={`rounded-full px-4 py-2 text-sm font-semibold ${
            province === '' ? 'bg-tenant text-white' : 'border border-card-border text-ink'
          }`}
        >
          ทั้งหมด
        </button>
        {PROVINCES.map((p) => (
          <button
            key={p}
            onClick={() => setProvince(p)}
            className={`rounded-full px-4 py-2 text-sm font-medium ${
              province === p ? 'bg-tenant text-white' : 'border border-card-border text-ink'
            }`}
          >
            {p}
          </button>
        ))}

        <select value={priceRange} onChange={(e) => setPriceRange(e.target.value)} className={selectClass}>
          {PRICE_RANGES.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <select value={roomType} onChange={(e) => setRoomType(e.target.value)} className={selectClass}>
          {ROOM_TYPES.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <select value={amenity} onChange={(e) => setAmenity(e.target.value)} className={selectClass}>
          <option value="all">สิ่งอำนวยความสะดวก</option>
          {amenityOptions.map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </select>
        <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className={`${selectClass} ml-auto`}>
          {SORTS.map((o) => (
            <option key={o.value} value={o.value}>
              เรียงโดย: {o.label}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <PageLoader fullScreen />
      ) : (
        <>
          {sponsored.length > 0 && (
            <div className="mt-6">
              <h2 className="font-semibold text-ink-strong dark:text-white">สปอนเซอร์</h2>
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
                        รูปหอพัก
                        <span className="absolute left-3 top-3 rounded-full bg-ink-strong px-2.5 py-1 text-xs font-semibold text-white">
                          โฆษณา
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
                              <span className="text-ink-faint"> / เดือน</span>
                            </>
                          ) : (
                            <span className="text-ink-faint">ห้องเต็ม</span>
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
              หอพักทั้งหมด{province ? `ใน${province}` : ''}
            </h2>
            <span className="text-sm text-ink-faint">{filteredDorms.length} แห่ง</span>
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
                    รูปหอพัก
                    {isTopRated && (
                      <span className="absolute left-3 top-3 rounded-full bg-warning px-2.5 py-1 text-xs font-semibold text-white">
                        ★ แนะนำ
                      </span>
                    )}
                    {availableRooms.length > 0 && (
                      <span className="absolute right-3 top-3 rounded-full bg-white/95 px-2.5 py-1 text-xs font-semibold text-success">
                        ว่าง {availableRooms.length} ห้อง
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
                          <span className="text-ink-faint"> / เดือน</span>
                        </>
                      ) : (
                        <span className="text-ink-faint">ห้องเต็ม</span>
                      )}
                    </p>
                  </div>
                </Link>
              );
            })}
            {filteredDorms.length === 0 && <p className="text-ink-faint">ไม่พบหอพัก</p>}
          </div>
        </>
      )}
    </main>
  );
}
