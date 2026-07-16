'use client';

import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api-client';
import type { User } from '@hopak/shared';

export default function ProfilePage() {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    apiClient.get<User>('/users/me').then(setUser);
  }, []);

  async function becomeOwner() {
    await apiClient.post('/users/me/become-owner');
    apiClient.get<User>('/users/me').then(setUser);
  }

  if (!user) return <main className="p-6">กำลังโหลด...</main>;

  return (
    <main className="mx-auto max-w-md p-6">
      <h1 className="text-xl font-bold">โปรไฟล์</h1>
      <p className="mt-4">ชื่อ: {user.name}</p>
      <p>อีเมล: {user.email}</p>
      <p>บทบาท: {user.role}</p>

      {user.role === 'tenant' && (
        <button onClick={becomeOwner} className="mt-4 rounded bg-green-600 px-4 py-2 text-white">
          เปิดหอพักกับ Hopak
        </button>
      )}
    </main>
  );
}
