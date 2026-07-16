'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api-client';
import { setToken } from '@/lib/auth';

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      const { accessToken } = await apiClient.post<{ accessToken: string }>('/auth/register', {
        name,
        email,
        password,
      });
      setToken(accessToken);
      router.push('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'สมัครสมาชิกไม่สำเร็จ');
    }
  }

  return (
    <main className="mx-auto max-w-sm p-6">
      <h1 className="text-xl font-bold">สมัครสมาชิก</h1>
      <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-3">
        <input
          type="text"
          placeholder="ชื่อ"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="rounded border px-3 py-2"
          required
        />
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
          สมัครสมาชิก
        </button>
      </form>
      <p className="mt-3 text-sm text-gray-600">
        เจ้าของหอพัก?{' '}
        <a href="/register?owner=1" className="text-green-700 underline">
          สมัครเปิดหอพักกับ Hopak
        </a>
      </p>
    </main>
  );
}
