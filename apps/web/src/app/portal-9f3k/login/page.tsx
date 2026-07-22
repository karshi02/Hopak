'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api-client';
import { setToken } from '@/lib/auth';
import { useLang } from '@/hooks/useLang';
import { LangSwitch } from '@/components/LangSwitch';

const TEXT = {
  th: {
    title: 'Hopak Admin Portal',
    subtitle: 'สำหรับผู้ดูแลระบบเท่านั้น',
    emailPlaceholder: 'อีเมล',
    passwordPlaceholder: 'รหัสผ่าน',
    error: 'เข้าสู่ระบบไม่สำเร็จ',
    submitting: 'กำลังเข้าสู่ระบบ...',
    submit: 'เข้าสู่ระบบ',
  },
  en: {
    title: 'Hopak Admin Portal',
    subtitle: 'For administrators only',
    emailPlaceholder: 'Email',
    passwordPlaceholder: 'Password',
    error: 'Log in failed',
    submitting: 'Logging in...',
    submit: 'Log in',
  },
};

const inputClass =
  'h-11 rounded-lg border border-white/15 bg-white/5 px-3.5 text-sm text-white placeholder:text-white/40 focus:border-tenant focus:outline-none';

export default function AdminPortalLoginPage() {
  const router = useRouter();
  const { lang, setLang } = useLang();
  const t = TEXT[lang];
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const { accessToken } = await apiClient.post<{ accessToken: string }>('/auth/admin-login', {
        email,
        password,
      });
      setToken(accessToken);
      router.push('/admin/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : t.error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-admin-sidebar p-6">
      <div className="w-full max-w-sm rounded-card border border-white/10 bg-white/[0.03] p-8">
        <div className="flex items-center justify-between">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-tenant font-sans text-base font-bold text-white">
            H
          </div>
          <LangSwitch lang={lang} onChange={setLang} dark />
        </div>
        <h1 className="mt-5 text-lg font-semibold text-white">{t.title}</h1>
        <p className="mt-1 text-sm text-white/50">{t.subtitle}</p>

        <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-3">
          <input
            type="email"
            placeholder={t.emailPlaceholder}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={`${inputClass} font-sans`}
            required
          />
          <input
            type="password"
            placeholder={t.passwordPlaceholder}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={`${inputClass} font-sans`}
            required
          />
          {error && <p className="text-sm text-danger">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="mt-1 rounded-lg bg-tenant py-2.5 text-sm font-semibold text-white hover:bg-tenant-dark disabled:opacity-60"
          >
            {loading ? t.submitting : t.submit}
          </button>
        </form>
      </div>
    </main>
  );
}
