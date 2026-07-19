'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useFavorites } from '@/hooks/useFavorites';
import { getToken } from '@/lib/auth';
import { PageLoader } from '@/components/PageLoader';
import { FavoriteButton } from '@/components/FavoriteButton';
import { StarRating } from '@/components/StarRating';

export default function SavedPage() {
  const router = useRouter();
  const { favorites, favoriteIds, loaded, toggle } = useFavorites();
  const visibleFavorites = favorites.filter((d) => favoriteIds.has(d.id));

  useEffect(() => {
    if (!getToken()) router.replace('/login');
  }, [router]);

  if (!loaded) return <PageLoader fullScreen />;

  return (
    <main className="mx-auto max-w-6xl p-6">
      <h1 className="text-xl font-bold text-ink-strong dark:text-white">หอพักที่บันทึกไว้</h1>

      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {visibleFavorites.map((dorm) => {
          const availableRooms = dorm.rooms.filter((r) => r.status.toUpperCase() === 'AVAILABLE');
          const startingRoom = [...availableRooms].sort((a, b) => a.pricePerMonth - b.pricePerMonth)[0];
          return (
            <Link
              key={dorm.id}
              href={`/dorms/${dorm.id}`}
              className="relative block overflow-hidden rounded-card border border-card-border bg-white hover:shadow-md dark:border-white/10 dark:bg-[#1a1a19]"
            >
              <div className="relative flex h-36 items-center justify-center bg-surface-canvas font-mono text-xs text-ink-faint dark:bg-[#2c2c2a]">
                รูปหอพัก
                <FavoriteButton active={favoriteIds.has(dorm.id)} onToggle={() => toggle(dorm.id)} />
              </div>
              <div className="p-4">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="truncate font-semibold text-ink-strong dark:text-white">{dorm.name}</h3>
                  <StarRating rating={dorm.avgRating} count={dorm.reviewCount} />
                </div>
                <p className="mt-0.5 text-sm text-ink-subtitle">{dorm.province}</p>
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
        {visibleFavorites.length === 0 && <p className="text-ink-faint">ยังไม่มีหอพักที่บันทึกไว้</p>}
      </div>
    </main>
  );
}
