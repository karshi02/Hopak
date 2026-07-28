'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { setToken } from '@/lib/auth';
import { PageLoader } from '@/components/PageLoader';

export default function GoogleCallbackPage() {
  const router = useRouter();

  useEffect(() => {
    // token มาทาง URL fragment (#token=...) ไม่ใช่ query — fragment ไม่ถูกส่งไป server
    // (กัน token หลุดเข้า nginx access log / Referer) อ่านจาก location.hash แทน searchParams
    const hash = window.location.hash.startsWith('#') ? window.location.hash.slice(1) : '';
    const token = new URLSearchParams(hash).get('token');
    if (token) {
      setToken(token);
      // ล้าง fragment ทิ้งจาก URL ทันที กันโผล่ค้างใน history/แชร์ลิงก์ต่อ
      window.history.replaceState(null, '', window.location.pathname);
      router.replace('/');
    } else {
      router.replace('/login?error=google_login_failed');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <PageLoader />;
}
