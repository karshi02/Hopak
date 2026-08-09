'use client';

import { HomeBrowse } from '@/components/HomeBrowse';

// หน้าแรก = โหมดรายเดือน (default) — โหมดรายวันแยกไปหน้า /daily
export default function HomePage() {
  return <HomeBrowse dailyMode={false} />;
}
