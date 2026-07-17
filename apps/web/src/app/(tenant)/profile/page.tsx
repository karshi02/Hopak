'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api-client';
import type { User } from '@hopak/shared';
import { PageLoader } from '@/components/PageLoader';

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    apiClient.get<User>('/users/me').then(setUser);
  }, []);

  async function becomeOwner() {
    await apiClient.post('/users/me/become-owner');
    router.push('/partner/dorms/new');
  }

  if (!user) return <PageLoader fullScreen />;

  return (
    <main className="mx-auto max-w-md p-6">
      <h1 className="text-xl font-bold text-[#0b0b0b] dark:text-white">โปรไฟล์</h1>
      <div className="mt-4 rounded-lg border border-black/10 p-4 dark:border-white/10">
        <p>ชื่อ: {user.name}</p>
        <p>อีเมล: {user.email}</p>
        <p>บทบาท: {user.role}</p>
      </div>

      {user.role.toLowerCase() === 'tenant' && (
        <button
          onClick={becomeOwner}
          className="mt-4 w-full rounded-lg bg-green-600 py-2.5 text-sm font-medium text-white hover:bg-green-700"
        >
          เปิดหอพักกับ Hopak
        </button>
      )}
    </main>
  );
}
