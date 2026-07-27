'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { apiClient } from '@/lib/api-client';
import { getToken } from '@/lib/auth';
import { useLang } from '@/hooks/useLang';
import type { Dorm } from '@hopak/shared';
import { PageLoader } from '@/components/PageLoader';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

const TEXT = {
  th: {
    title: 'แก้ไขหอพัก',
    statusLabel: 'สถานะ',
    pendingApproval: 'รออนุมัติ',
    save: 'บันทึก',
    saved: 'บันทึกแล้ว',
    imagesLabel: 'รูปหอพัก',
    addImages: 'เพิ่มรูป',
    uploadingImages: 'กำลังอัปโหลด...',
    removeImageConfirm: 'ลบรูปนี้?',
  },
  en: {
    title: 'Edit Dorm',
    statusLabel: 'Status',
    pendingApproval: 'Pending approval',
    save: 'Save',
    saved: 'Saved',
    imagesLabel: 'Dorm photos',
    addImages: 'Add photos',
    uploadingImages: 'Uploading...',
    removeImageConfirm: 'Remove this photo?',
  },
};

export default function EditDormPage() {
  const { id } = useParams<{ id: string }>();
  const { lang } = useLang();
  const t = TEXT[lang];
  const [dorm, setDorm] = useState<Dorm | null>(null);
  const [saved, setSaved] = useState(false);
  const [uploadingImages, setUploadingImages] = useState(false);

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

  async function handleAddImages(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    setUploadingImages(true);
    try {
      const formData = new FormData();
      files.forEach((f) => formData.append('photos', f));
      const res = await fetch(`${API_URL}/dorms/${id}/images`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${getToken()}` },
        body: formData,
      });
      if (res.ok) setDorm(await res.json());
    } finally {
      setUploadingImages(false);
      e.target.value = '';
    }
  }

  async function handleRemoveImage(index: number) {
    if (!window.confirm(t.removeImageConfirm)) return;
    const res = await fetch(`${API_URL}/dorms/${id}/images/${index}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${getToken()}` },
    });
    if (res.ok) setDorm(await res.json());
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

        <div className="mt-2">
          <label className="mb-1.5 block text-xs text-gray-500">{t.imagesLabel}</label>
          <div className="grid grid-cols-4 gap-1.5">
            {dorm.images.map((url, i) => (
              <div key={url} className="group relative h-16 overflow-hidden rounded-md border">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={url} alt="" className="h-full w-full object-cover" />
                <button
                  type="button"
                  onClick={() => handleRemoveImage(i)}
                  className="absolute right-0.5 top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-black/60 text-[10px] font-bold text-white opacity-0 transition-opacity group-hover:opacity-100"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
          <label className="mt-2 inline-block cursor-pointer text-xs font-semibold text-seller">
            {uploadingImages ? t.uploadingImages : `+ ${t.addImages}`}
            <input type="file" accept="image/*" multiple className="hidden" onChange={handleAddImages} disabled={uploadingImages} />
          </label>
        </div>
      </div>
    </div>
  );
}
