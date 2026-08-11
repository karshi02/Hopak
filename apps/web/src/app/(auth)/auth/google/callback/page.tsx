'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api-client';
import { setToken, clearToken } from '@/lib/auth';
import { PageLoader } from '@/components/PageLoader';

// อ่าน role จาก JWT (payload base64url) โดยไม่ต้องยิง API เพิ่ม
function roleFromJwt(token: string): string {
  try {
    const b64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    return (JSON.parse(atob(b64)).role ?? '').toLowerCase();
  } catch {
    return '';
  }
}

export default function GoogleCallbackPage() {
  const router = useRouter();

  useEffect(() => {
    // API ส่ง "โค้ดแลก token" มาทาง query (?code=) — query รอด redirect ข้าม origin (ต่างจาก fragment #
    // ที่หายตอน 302) เอาโค้ดไปแลกเป็น JWT จริงผ่าน POST (โค้ดใช้ครั้งเดียว/หมดอายุ 2 นาที ไม่รั่วอันตราย)
    const code = new URLSearchParams(window.location.search).get('code');
    // ลบโค้ดออกจาก URL ทันที — ไม่ให้ค้างใน address bar / browser history / Referer header
    // ที่ยิงออกไปตอน navigate ต่อ (โค้ดใช้ครั้งเดียวอยู่แล้ว แต่ไม่ควรค้างให้เห็นเลย)
    window.history.replaceState(null, '', '/auth/google/callback');
    if (!code) {
      router.replace('/login?error=google_login_failed');
      return;
    }
    // ฝั่งที่กด Google มา (owner = จากหน้า partner-login) — ตั้งไว้ก่อน redirect ออก
    const intent = sessionStorage.getItem('googleIntent');
    sessionStorage.removeItem('googleIntent');

    apiClient
      .postWithCredentials<{ accessToken: string }>('/auth/google/exchange', { code })
      .then(({ accessToken }) => {
        const role = roleFromJwt(accessToken);
        // ล็อกอินฝั่งเจ้าของหอ แต่บัญชีไม่ใช่ owner → ไม่ให้เข้า console (ต้องสมัคร+รออนุมัติก่อน)
        if (intent === 'owner' && role !== 'owner') {
          clearToken();
          window.location.replace('/partner-login?error=not_owner');
          return;
        }
        setToken(accessToken);
        // route ตาม role — owner ไปคอนโซล ไม่ไปโผล่ฝั่ง user
        if (role === 'owner') window.location.replace('/partner/dashboard');
        else if (role === 'admin') window.location.replace('/admin/dashboard');
        else window.location.replace('/');
      })
      .catch(() => router.replace('/login?error=google_login_failed'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <PageLoader />;
}
