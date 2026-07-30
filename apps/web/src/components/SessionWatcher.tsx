'use client';

import { useEffect } from 'react';
import { getToken, clearToken } from '@/lib/auth';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';
const POLL_MS = 15000; // poll เฉยๆ ทุก 15 วิ เพื่อจับ session ที่โดนเตะ/idle หมดอายุ

// เฝ้า session แบบเรียลไทม์: ถ้าโดนเตะจาก login ที่อื่น (1 บัญชี 1 session) หรือ idle หมดอายุ
// จะเด้งออกทันทีโดยไม่ต้องรอผู้ใช้กดอะไร — แก้อาการ "บราวเซอร์เก่ายังโชว์ล็อกอินอยู่"
export function SessionWatcher() {
  useEffect(() => {
    let stopped = false;

    function logout() {
      clearToken();
      if (window.location.pathname !== '/login') {
        window.location.href = '/login?error=session_expired';
      }
    }

    // กิจกรรมจริง (โหลดหน้า/รีเฟรช/สลับกลับมาที่แท็บ) = "กำลังใช้งาน" → ยิง /users/me ซึ่ง bump
    // lastSeenAt (รีเซ็ตนาฬิกา idle) รีเฟรชจึงไม่ทำให้หมดอายุ ตราบใดที่ยังไม่โดนเตะ/ไม่ idle เกิน 30 นาที
    async function activityCheck() {
      const token = getToken();
      if (!token) return;
      try {
        const res = await fetch(`${API_URL}/users/me`, { headers: { Authorization: `Bearer ${token}` } });
        if (stopped) return;
        if (res.status === 401) logout(); // โดนเตะ หรือ idle เกิน 30 นาทีจริง
      } catch {
        // network hiccup — ไม่เด้งออก
      }
    }

    // poll เฉยๆ ระหว่างเปิดค้าง = ไม่ใช่กิจกรรม → ใช้ /auth/session ที่ "ไม่ bump" lastSeenAt
    // ปล่อยให้ idle เดินได้ตามจริง แต่ยังจับได้ว่าโดนเตะ/หมดอายุแล้วเพื่อเด้งออกภายใน 15 วิ
    async function passiveCheck() {
      const token = getToken();
      if (!token) return;
      try {
        const res = await fetch(`${API_URL}/auth/session`, { headers: { Authorization: `Bearer ${token}` } });
        if (stopped) return;
        const body = await res.json().catch(() => ({ valid: false }));
        if (!res.ok || !body.valid) logout();
      } catch {
        // network hiccup — ไม่เด้งออก
      }
    }

    const id = setInterval(passiveCheck, POLL_MS);
    const onVisible = () => {
      if (document.visibilityState === 'visible') activityCheck();
    };
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', activityCheck);
    activityCheck(); // โหลดหน้า/รีเฟรช = กิจกรรม

    return () => {
      stopped = true;
      clearInterval(id);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', activityCheck);
    };
  }, []);

  return null;
}
