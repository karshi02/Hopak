'use client';

import { useEffect, useRef, useState } from 'react';
import { apiClient } from '@/lib/api-client';
import { getToken } from '@/lib/auth';
import { useLang } from '@/hooks/useLang';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

const TEXT = {
  th: {
    title: 'ตั้งค่าเว็บไซต์',
    heroLabel: 'แบนเนอร์หน้าแรก (Hero)',
    heroDesc: 'รูปพื้นหลังส่วนบนสุดของหน้าแรก แนะนำขนาดกว้าง 1920px สูง 800px',
    current: 'รูปปัจจุบัน',
    none: 'ยังไม่ได้ตั้งรูป (ใช้รูปเริ่มต้น)',
    choose: 'เลือกไฟล์รูป',
    upload: 'อัปโหลดและใช้รูปนี้',
    uploading: 'กำลังอัปโหลด...',
    success: 'บันทึกแบนเนอร์ใหม่แล้ว',
    error: 'อัปโหลดไม่สำเร็จ',
    needFile: 'กรุณาเลือกไฟล์รูปก่อน',
  },
  en: {
    title: 'Website Settings',
    heroLabel: 'Homepage Hero Banner',
    heroDesc: 'Background image at the top of the homepage. Recommended 1920x800px.',
    current: 'Current image',
    none: 'No custom image set (using default)',
    choose: 'Choose image file',
    upload: 'Upload and use this image',
    uploading: 'Uploading...',
    success: 'Hero banner updated',
    error: 'Upload failed',
    needFile: 'Please choose an image file first',
  },
};

export default function AdminWebsiteSettingsPage() {
  const { lang } = useLang();
  const t = TEXT[lang];
  const [heroImageUrl, setHeroImageUrl] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    apiClient
      .get<{ heroImageUrl: string | null }>('/settings/hero')
      .then((data) => setHeroImageUrl(data.heroImageUrl))
      .catch(() => setHeroImageUrl(null));
  }, []);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0] ?? null;
    setFile(selected);
    setError(null);
    setMessage(null);
    setPreviewUrl(selected ? URL.createObjectURL(selected) : null);
  }

  async function handleUpload() {
    if (!file) {
      setError(t.needFile);
      return;
    }
    setUploading(true);
    setError(null);
    setMessage(null);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch(`${API_URL}/admin/settings/hero`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${getToken()}` },
        body: formData,
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message ?? t.error);
      }
      const data: { heroImageUrl: string } = await res.json();
      setHeroImageUrl(data.heroImageUrl);
      setFile(null);
      setPreviewUrl(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      setMessage(t.success);
    } catch (err) {
      setError(err instanceof Error ? err.message : t.error);
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="max-w-2xl">
      <h1 className="text-xl font-bold text-ink-strong">{t.title}</h1>

      <div className="mt-6 rounded-card border border-card-border bg-white p-6">
        <h2 className="font-semibold text-ink-strong">{t.heroLabel}</h2>
        <p className="mt-1 text-sm text-ink-subtitle">{t.heroDesc}</p>

        <div className="mt-4">
          <div className="mb-1.5 text-xs font-medium text-ink-faint">
            {previewUrl ? t.choose : heroImageUrl ? t.current : t.none}
          </div>
          <div className="flex h-40 items-center justify-center overflow-hidden rounded-btn border border-card-border bg-surface-canvas">
            {previewUrl || heroImageUrl ? (
              <img src={previewUrl ?? heroImageUrl ?? ''} alt="hero" className="h-full w-full object-cover" />
            ) : (
              <span className="text-sm text-ink-faint">{t.none}</span>
            )}
          </div>
        </div>

        <div className="mt-4 flex items-center gap-3">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="text-sm text-ink"
          />
          <button
            onClick={handleUpload}
            disabled={uploading}
            className="rounded-btn bg-tenant px-4 py-2 text-sm font-medium text-white hover:bg-tenant-dark disabled:opacity-50"
          >
            {uploading ? t.uploading : t.upload}
          </button>
        </div>

        {message && <p className="mt-3 text-sm text-success">{message}</p>}
        {error && <p className="mt-3 text-sm text-danger">{error}</p>}
      </div>
    </div>
  );
}
