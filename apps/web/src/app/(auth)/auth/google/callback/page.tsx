'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api-client';
import { setToken } from '@/lib/auth';
import { PageLoader } from '@/components/PageLoader';

export default function GoogleCallbackPage() {
  const router = useRouter();

  useEffect(() => {
    // API ส่ง "โค้ดแลก token" มาทาง query (?code=) — query รอด redirect ข้าม origin (ต่างจาก fragment #
    // ที่หายตอน 302) เอาโค้ดไปแลกเป็น JWT จริงผ่าน POST (โค้ดใช้ครั้งเดียว/หมดอายุ 2 นาที ไม่รั่วอันตราย)
    const code = new URLSearchParams(window.location.search).get('code');
    if (!code) {
      router.replace('/login?error=google_login_failed');
      return;
    }
    apiClient
      .post<{ accessToken: string }>('/auth/google/exchange', { code })
      .then(({ accessToken }) => {
        setToken(accessToken);
        // hard navigate กัน Next router ค้างหลังเปลี่ยน URL — ล้าง ?code= ออกจาก history ด้วยในตัว
        window.location.replace('/');
      })
      .catch(() => router.replace('/login?error=google_login_failed'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <PageLoader />;
}
