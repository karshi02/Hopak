'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { apiClient } from '@/lib/api-client';
import { useLang } from '@/hooks/useLang';
import type { Dorm } from '@hopak/shared';
import { PageLoader } from '@/components/PageLoader';

const TEXT = {
  th: {
    title: 'แก้ไขหอพัก',
    statusLabel: 'สถานะ',
    pendingApproval: 'รออนุมัติ',
    save: 'บันทึก',
    saved: 'บันทึกแล้ว',
  },
  en: {
    title: 'Edit Dorm',
    statusLabel: 'Status',
    pendingApproval: 'Pending approval',
    save: 'Save',
    saved: 'Saved',
  },
};

export default function EditDormPage() {
  const { id } = useParams<{ id: string }>();
  const { lang } = useLang();
  const t = TEXT[lang];
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

  if (!dorm) return <PageLoader />;

  return (
    <div className="max-w-lg">
      <h1 className="text-xl font-bold">{t.title}</h1>
      <p className="mt-1 text-sm text-gray-500">
        {t.statusLabel}: {dorm.status === 'pending_approval' ? t.pendingApproval : dorm.status}
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
          {t.save}
        </button>
        {saved && <p className="text-sm text-seller">{t.saved}</p>}
      </div>
    </div>
  );
}
