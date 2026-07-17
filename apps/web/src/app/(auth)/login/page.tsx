'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api-client';
import { setToken } from '@/lib/auth';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

const inputClass =
  'h-[46px] rounded-btn border border-card-border px-3.5 text-sm text-ink placeholder:text-ink-faint focus:border-tenant focus:outline-none dark:border-white/10 dark:bg-[#1a1a19] dark:text-white font-sans';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      const { accessToken } = await apiClient.post<{ accessToken: string }>('/auth/login', {
        email,
        password,
      });
      setToken(accessToken);
      router.push('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'เข้าสู่ระบบไม่สำเร็จ');
    }
  }

  return (
    <main className="flex min-h-[calc(100vh-65px)] bg-surface-web">
      <div className="hidden w-[38%] shrink-0 flex-col justify-between bg-gradient-to-br from-tenant to-tenant-dark p-10 text-white lg:flex">
        <div>
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/15 font-sans text-xl font-bold">
            H
          </div>
          <h1 className="mt-8 text-2xl font-semibold leading-snug">
            ยินดีต้อนรับกลับมา 👋
          </h1>
          <p className="mt-4 max-w-[280px] text-sm leading-relaxed text-white/85">
            เข้าสู่ระบบเพื่อดูการจองของคุณ ติดตามสถานะ และค้นหาหอพักใหม่ๆ
          </p>
        </div>
        <div className="font-sans text-xs text-white/70">© 2026 Hopak</div>
      </div>

      <div className="flex flex-1 items-center justify-center p-6">
        <div className="w-full max-w-sm">
          <h2 className="text-xl font-semibold text-ink-strong dark:text-white">เข้าสู่ระบบ</h2>
          <p className="mt-1 text-sm text-ink-subtitle">เข้าสู่บัญชี Hopak ของคุณ</p>

          <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-ink-subtitle">อีเมล หรือ เบอร์โทร</label>
              <input
                type="email"
                placeholder="you@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={`${inputClass} w-full`}
                required
              />
            </div>

            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <label className="text-xs font-medium text-ink-subtitle">รหัสผ่าน</label>
                <a href="#" className="text-xs font-medium text-tenant">
                  ลืมรหัสผ่าน?
                </a>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={`${inputClass} w-full pr-10`}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-faint"
                >
                  {showPassword ? '🙈' : '👁'}
                </button>
              </div>
            </div>

            {error && <p className="text-sm text-danger">{error}</p>}

            <button
              type="submit"
              className="mt-1 rounded-btn bg-tenant py-2.5 text-sm font-medium text-white shadow-sm hover:bg-tenant-dark"
            >
              เข้าสู่ระบบ
            </button>

            <div className="my-1 flex items-center gap-3 text-xs text-ink-faint">
              <span className="h-px flex-1 bg-card-border" />
              หรือ
              <span className="h-px flex-1 bg-card-border" />
            </div>

            <a
              href={`${API_URL}/auth/google`}
              className="flex items-center justify-center gap-2 rounded-btn border border-card-border py-2.5 text-sm font-medium text-ink hover:bg-black/[0.02] dark:border-white/10 dark:text-white dark:hover:bg-white/5"
            >
              <span className="font-sans font-semibold text-tenant">G</span>
              เข้าสู่ระบบด้วย Google
            </a>
          </form>

          <p className="mt-5 text-center text-sm text-ink-subtitle">
            ยังไม่มีบัญชี?{' '}
            <a href="/register" className="font-medium text-tenant">
              สมัครสมาชิก
            </a>
          </p>
        </div>
      </div>
    </main>
  );
}
