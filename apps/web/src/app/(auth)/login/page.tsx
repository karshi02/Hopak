'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api-client';
import { setToken } from '@/lib/auth';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

const inputClass =
  'h-12 rounded-lg border border-gray-200 px-3.5 text-sm text-gray-800 placeholder-gray-400 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 focus:outline-none bg-white';

function Check() {
  return (
    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white bg-opacity-20">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
        <path d="M5 12l5 5L20 6" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24">
      <path fill="#4285F4" d="M22.5 12.2c0-.7-.1-1.4-.2-2H12v3.8h5.9a5 5 0 01-2.2 3.3v2.7h3.5c2-1.9 3.3-4.7 3.3-7.8z" />
      <path fill="#34A853" d="M12 23c3 0 5.5-1 7.3-2.7l-3.5-2.7c-1 .7-2.3 1.1-3.8 1.1-2.9 0-5.4-2-6.3-4.6H2v2.8A11 11 0 0012 23z" />
      <path fill="#FBBC05" d="M5.7 14.1a6.6 6.6 0 010-4.2V7.1H2a11 11 0 000 9.8l3.7-2.8z" />
      <path fill="#EA4335" d="M12 5.4c1.6 0 3 .6 4.1 1.6l3.1-3.1A11 11 0 002 7.1l3.7 2.8C6.6 7.3 9.1 5.4 12 5.4z" />
    </svg>
  );
}

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    setError(null);
    if (!email || !password) {
      setError('กรุณากรอกอีเมลและรหัสผ่าน');
      return;
    }
    setLoading(true);
    try {
      const { accessToken } = await apiClient.post<{ accessToken: string }>('/auth/login', { email, password });
      setToken(accessToken);
      router.push('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'เข้าสู่ระบบไม่สำเร็จ');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen bg-gray-50">
      {/* ฝั่งซ้าย: แบนเนอร์น้ำเงิน */}
      <div
        className="hidden w-2/5 shrink-0 flex-col justify-between p-10 text-white lg:flex"
        style={{ background: 'linear-gradient(160deg, #3159d6 0%, #1e3a8a 100%)' }}
      >
        <div>
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white bg-opacity-20 text-lg font-bold">
              H
            </div>
            <span className="text-lg font-semibold">Hopak</span>
          </div>

          <h1 className="mt-10 text-3xl font-bold leading-snug">
            ยินดีต้อนรับ
            <br />
            กลับมา 👋
          </h1>

          <ul className="mt-8 flex flex-col gap-4 text-sm leading-relaxed text-white text-opacity-90">
            <li className="flex gap-3">
              <Check />
              <span>ดูการจองทั้งหมดของคุณ พร้อมสถานะล่าสุด</span>
            </li>
            <li className="flex gap-3">
              <Check />
              <span>ค้นหาหอพักใหม่ๆ ทั่วมหาสารคาม ขอนแก่น เชียงใหม่</span>
            </li>
            <li className="flex gap-3">
              <Check />
              <span>ข้อมูลส่วนตัวถูกปกป้อง เบอร์ซ่อนบางส่วน</span>
            </li>
          </ul>
        </div>

        <div className="text-xs text-white text-opacity-70">© 2026 Hopak · แพลตฟอร์มจองหอพักออนไลน์</div>
      </div>

      {/* ฝั่งขวา: ฟอร์ม */}
      <div className="flex flex-1 items-center justify-center p-6">
        <div className="w-full max-w-sm">
          <h2 className="text-2xl font-bold text-gray-900">เข้าสู่ระบบ</h2>
          <p className="mt-1 text-sm text-gray-500">เข้าสู่บัญชี Hopak ของคุณ</p>

          <a
            href={`${API_URL}/auth/google`}
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white py-3 text-sm font-medium text-gray-800 hover:bg-gray-50"
          >
            <GoogleIcon />
            เข้าสู่ระบบด้วย Google
          </a>

          <div className="my-5 flex items-center gap-3 text-xs text-gray-400">
            <span className="h-px flex-1 bg-gray-200" />
            หรือ
            <span className="h-px flex-1 bg-gray-200" />
          </div>

          <div className="flex flex-col gap-4">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-gray-600">อีเมล หรือ เบอร์โทร</label>
              <input
                type="email"
                placeholder="you@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                className={`${inputClass} w-full`}
              />
            </div>

            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <label className="text-xs font-medium text-gray-600">รหัสผ่าน</label>
                <a href="#" className="text-xs font-medium text-blue-600">
                  ลืมรหัสผ่าน?
                </a>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                  className={`${inputClass} w-full pr-10`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                >
                  {showPassword ? '🙈' : '👁'}
                </button>
              </div>
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <button
              type="button"
              onClick={handleSubmit}
              disabled={loading}
              className="mt-1 rounded-lg bg-blue-600 py-3 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:opacity-60"
            >
              {loading ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบ'}
            </button>
          </div>

          <p className="mt-6 text-center text-sm text-gray-500">
            ยังไม่มีบัญชี?{' '}
            <a href="/register" className="font-semibold text-blue-600">
              สมัครสมาชิก
            </a>
          </p>
        </div>
      </div>
    </main>
  );
}
