'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiClient } from '@/lib/api-client';
import { Navbar } from '@/components/Navbar';

interface SponsoredCampaign {
  id: string;
  kind: string;
  dorm: { id: string; name: string; province: string };
}

export default function HomePage() {
  const [sponsored, setSponsored] = useState<SponsoredCampaign[]>([]);

  useEffect(() => {
    apiClient.get<SponsoredCampaign[]>('/promotions/sponsored').then(setSponsored).catch(() => setSponsored([]));
  }, []);

  return (
    <>
      <Navbar />
      <main className="mx-auto max-w-5xl p-6">
      <section className="rounded-card bg-gradient-to-br from-tenant to-tenant-dark p-8 text-white">
        <h1 className="text-3xl font-bold">หาหอพักที่ใช่ ได้ในไม่กี่คลิก</h1>
        <p className="mt-2 text-white/85">ค้นหา จอง และจัดการหอพักออนไลน์ ใกล้มหาวิทยาลัยของคุณ</p>
        <Link
          href="/search"
          className="mt-5 inline-block rounded-btn bg-white px-5 py-2.5 font-medium text-tenant hover:bg-white/90"
        >
          ค้นหาหอพัก
        </Link>
      </section>

      {sponsored.length > 0 && (
        <section className="mt-8">
          <div className="flex items-center gap-2">
            <h2 className="font-semibold text-ink-strong dark:text-white">สปอนเซอร์</h2>
            <span className="rounded-md bg-warning/10 px-2 py-0.5 text-xs font-semibold text-warning-dark">
              โฆษณา
            </span>
          </div>
          <div className="mt-3 flex gap-4 overflow-x-auto pb-2">
            {sponsored.map((c) => (
              <Link
                key={c.id}
                href={`/dorms/${c.dorm.id}`}
                className="w-56 shrink-0 rounded-card border border-card-border bg-white p-3 hover:shadow dark:border-white/10 dark:bg-[#1a1a19]"
              >
                <div className="flex h-28 items-center justify-center rounded-lg bg-surface-canvas font-mono text-xs text-ink-faint dark:bg-[#2c2c2a]">
                  รูปหอพัก
                </div>
                <p className="mt-2 truncate font-medium text-ink-strong dark:text-white">{c.dorm.name}</p>
                <p className="text-sm text-ink-subtitle">{c.dorm.province}</p>
              </Link>
            ))}
          </div>
        </section>
      )}
      </main>
    </>
  );
}
