'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api-client';
import { setToken } from '@/lib/auth';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
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
    <main className="mx-auto max-w-sm p-6">
      <h1 className="text-xl font-bold">เข้าสู่ระบบ</h1>
      <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-3">
        <input
          type="email"
          placeholder="อีเมล"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="rounded border px-3 py-2"
          required
        />
        <input
          type="password"
          placeholder="รหัสผ่าน"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="rounded border px-3 py-2"
          required
        />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button type="submit" className="rounded bg-green-600 px-4 py-2 text-white">
          เข้าสู่ระบบ
        </button>
      </form>
    </main>
  );
}
