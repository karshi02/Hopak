'use client';

import { HomeBrowse } from '@/components/HomeBrowse';

// โหมดหอพักรายวัน — คอมโพเนนต์เดียวกับหน้าแรก แต่บังคับ dailyMode
export default function DailyPage() {
  return <HomeBrowse dailyMode />;
}
