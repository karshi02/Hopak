'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { apiClient } from '@/lib/api-client';
import type { Dorm } from '@hopak/shared';
import { PageLoader } from '@/components/PageLoader';

export default function EditDormPage() {
  const { id } = useParams<{ id: string }>();
  const [dorm, setDorm] = useState<Dorm | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    apiClient.get<Dorm>(`/dorms/${id}`).then(setDorm);
  }, [id]);

  async function handleSave() {
    if (!dorm) return;
    await apiClient.patch(`/dorms/${id}`, {
      name: dorm.name,
      description: dorm.description,
    });
    setSaved(true);
  }

  if (!dorm) return <PageLoader fullScreen />;

  return (
    <div className="max-w-lg">
      <h1 className="text-xl font-bold">แก้ไขหอพัก</h1>
      <p className="mt-1 text-sm text-gray-500">
        สถานะ: {dorm.status === 'pending_approval' ? 'รออนุมัติ' : dorm.status}
      </p>
      <div className="mt-4 flex flex-col gap-3">
        <input
          value={dorm.name}
          onChange={(e) => setDorm({ ...dorm, name: e.target.value })}
          className="rounded border px-3 py-2"
        />
        <textarea
          value={dorm.description}
          onChange={(e) => setDorm({ ...dorm, description: e.target.value })}
          className="rounded border px-3 py-2"
        />
        <button onClick={handleSave} className="rounded bg-seller px-4 py-2 text-white">
          บันทึก
        </button>
        {saved && <p className="text-sm text-seller">บันทึกแล้ว</p>}
      </div>
    </div>
  );
}
