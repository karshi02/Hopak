'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api-client';
import { setToken } from '@/lib/auth';

const inputClass =
  'h-11 rounded-lg border border-white/15 bg-white/5 px-3.5 text-sm text-white placeholder:text-white/40 focus:border-tenant focus:outline-none';

export default function AdminPortalLoginPage() {
  const router = useRouter();
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
      setError(err instanceof Error ? err.message : 'เข้าสู่ระบบไม่สำเร็จ');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-admin-sidebar p-6">
      <div className="w-full max-w-sm rounded-card border border-white/10 bg-white/[0.03] p-8">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-tenant font-sans text-base font-bold text-white">
          H
        </div>
        <h1 className="mt-5 text-lg font-semibold text-white">Hopak Admin Portal</h1>
        <p className="mt-1 text-sm text-white/50">สำหรับผู้ดูแลระบบเท่านั้น</p>

        <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-3">
          <input
            type="email"
            placeholder="อีเมล"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={`${inputClass} font-sans`}
            required
          />
          <input
            type="password"
            placeholder="รหัสผ่าน"
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
            {loading ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบ'}
          </button>
        </form>
      </div>
    </main>
  );
}
