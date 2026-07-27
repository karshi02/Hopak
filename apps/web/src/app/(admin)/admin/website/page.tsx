'use client';

import { useEffect, useRef, useState } from 'react';
import { apiClient } from '@/lib/api-client';
import { getToken } from '@/lib/auth';
import { useLang } from '@/hooks/useLang';
import { PROVINCES } from '@hopak/shared';

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

    postersLabel: 'โปสเตอร์ / แบนเนอร์เพิ่มเติม (หลายรูป)',
    postersDesc: 'อัปโหลดได้หลายรูปพร้อมกัน ใช้เป็นชุดโปสเตอร์/แบนเนอร์หมุนเวียน',
    postersNone: 'ยังไม่มีโปสเตอร์',
    choosePosters: 'เลือกไฟล์รูป (เลือกได้หลายไฟล์)',
    uploadPosters: 'อัปโหลด',
    postersSuccess: 'เพิ่มโปสเตอร์แล้ว',
    removeConfirm: 'ลบโปสเตอร์นี้?',

    areaLabel: 'รูปพื้นหลัง "ทำเลยอดนิยม" หน้าแรก',
    areaDesc: 'ตั้งรูปพื้นหลังต่อจังหวัด ใช้แทนสีไล่ระดับเริ่มต้นบนการ์ดทำเลยอดนิยม',
    areaChoose: 'เลือกรูป',
    areaRemove: 'ลบรูป',
    areaUploading: 'กำลังอัปโหลด...',
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

    postersLabel: 'Extra posters / banners (multiple)',
    postersDesc: 'Upload several images at once, used as a rotating poster/banner set.',
    postersNone: 'No posters yet',
    choosePosters: 'Choose image files (multi-select)',
    uploadPosters: 'Upload',
    postersSuccess: 'Posters added',
    removeConfirm: 'Remove this poster?',

    areaLabel: 'Homepage "Popular Areas" background images',
    areaDesc: 'Set a background image per province — replaces the default gradient on popular-area cards.',
    areaChoose: 'Choose image',
    areaRemove: 'Remove',
    areaUploading: 'Uploading...',
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

  const [posterUrls, setPosterUrls] = useState<string[]>([]);
  const [posterFiles, setPosterFiles] = useState<File[]>([]);
  const [uploadingPosters, setUploadingPosters] = useState(false);
  const [posterMessage, setPosterMessage] = useState<string | null>(null);
  const [posterError, setPosterError] = useState<string | null>(null);
  const posterInputRef = useRef<HTMLInputElement>(null);

  const [areaImages, setAreaImages] = useState<Record<string, string>>({});
  const [uploadingArea, setUploadingArea] = useState<string | null>(null);

  function reloadHero() {
    apiClient
      .get<{ heroImageUrl: string | null; posterUrls: string[]; areaImages: Record<string, string> }>('/settings/hero')
      .then((data) => {
        setHeroImageUrl(data.heroImageUrl);
        setPosterUrls(data.posterUrls ?? []);
        setAreaImages(data.areaImages ?? {});
      })
      .catch(() => setHeroImageUrl(null));
  }

  useEffect(reloadHero, []);

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

  function handlePosterFilesChange(e: React.ChangeEvent<HTMLInputElement>) {
    setPosterFiles(Array.from(e.target.files ?? []));
    setPosterError(null);
    setPosterMessage(null);
  }

  async function handleUploadPosters() {
    if (!posterFiles.length) {
      setPosterError(t.needFile);
      return;
    }
    setUploadingPosters(true);
    setPosterError(null);
    setPosterMessage(null);
    try {
      const formData = new FormData();
      posterFiles.forEach((f) => formData.append('files', f));
      const res = await fetch(`${API_URL}/admin/settings/posters`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${getToken()}` },
        body: formData,
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message ?? t.error);
      }
      const data: { posterUrls: string[] } = await res.json();
      setPosterUrls(data.posterUrls);
      setPosterFiles([]);
      if (posterInputRef.current) posterInputRef.current.value = '';
      setPosterMessage(t.postersSuccess);
    } catch (err) {
      setPosterError(err instanceof Error ? err.message : t.error);
    } finally {
      setUploadingPosters(false);
    }
  }

  async function handleRemovePoster(index: number) {
    if (!window.confirm(t.removeConfirm)) return;
    try {
      const res = await fetch(`${API_URL}/admin/settings/posters/${index}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (!res.ok) throw new Error(t.error);
      const data: { posterUrls: string[] } = await res.json();
      setPosterUrls(data.posterUrls);
    } catch {
      // เงียบไว้ก่อน
    }
  }

  async function handleAreaImageChange(province: string, e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setUploadingArea(province);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('province', province);
      const res = await fetch(`${API_URL}/admin/settings/area-image`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${getToken()}` },
        body: formData,
      });
      if (res.ok) {
        const data: { areaImages: Record<string, string> } = await res.json();
        setAreaImages(data.areaImages ?? {});
      }
    } finally {
      setUploadingArea(null);
    }
  }

  async function handleRemoveAreaImage(province: string) {
    if (!window.confirm(t.removeConfirm)) return;
    const res = await fetch(`${API_URL}/admin/settings/area-image/${encodeURIComponent(province)}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${getToken()}` },
    });
    if (res.ok) {
      const data: { areaImages: Record<string, string> } = await res.json();
      setAreaImages(data.areaImages ?? {});
    }
  }

  return (
    <div className="max-w-2xl">
      <div className="rounded-card-lg border border-card-border bg-white p-6 shadow-card">
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

      <div className="mt-6 rounded-card-lg border border-card-border bg-white p-6 shadow-card">
        <h2 className="font-semibold text-ink-strong">{t.postersLabel}</h2>
        <p className="mt-1 text-sm text-ink-subtitle">{t.postersDesc}</p>

        <div className="mt-4 grid grid-cols-3 gap-2.5">
          {posterUrls.map((url, i) => (
            <div key={url} className="group relative h-24 overflow-hidden rounded-btn border border-card-border">
              <img src={url} alt="" className="h-full w-full object-cover" />
              <button
                onClick={() => handleRemovePoster(i)}
                className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-pill bg-black/60 text-xs font-bold text-white opacity-0 transition-opacity group-hover:opacity-100"
              >
                ×
              </button>
            </div>
          ))}
          {posterUrls.length === 0 && <p className="col-span-3 text-sm text-ink-faint">{t.postersNone}</p>}
        </div>

        <div className="mt-4 flex items-center gap-3">
          <input
            ref={posterInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handlePosterFilesChange}
            className="text-sm text-ink"
          />
          <button
            onClick={handleUploadPosters}
            disabled={uploadingPosters}
            className="rounded-btn bg-tenant px-4 py-2 text-sm font-medium text-white hover:bg-tenant-dark disabled:opacity-50"
          >
            {uploadingPosters ? t.uploading : t.uploadPosters}
          </button>
        </div>

        {posterMessage && <p className="mt-3 text-sm text-success">{posterMessage}</p>}
        {posterError && <p className="mt-3 text-sm text-danger">{posterError}</p>}
      </div>

      <div className="mt-6 rounded-card-lg border border-card-border bg-white p-6 shadow-card">
        <h2 className="font-semibold text-ink-strong">{t.areaLabel}</h2>
        <p className="mt-1 text-sm text-ink-subtitle">{t.areaDesc}</p>

        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {PROVINCES.map((province) => {
            const url = areaImages[province];
            const isUploading = uploadingArea === province;
            return (
              <div key={province} className="overflow-hidden rounded-btn border border-card-border">
                <div className="relative h-24 bg-surface-canvas">
                  {url ? (
                    <img src={url} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full items-center justify-center text-xs text-ink-faint">{t.none}</div>
                  )}
                </div>
                <div className="p-2">
                  <p className="truncate text-xs font-semibold text-ink-strong">{province}</p>
                  <div className="mt-1.5 flex items-center gap-2">
                    <label className="cursor-pointer text-xs font-semibold text-tenant">
                      {isUploading ? t.areaUploading : t.areaChoose}
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        disabled={isUploading}
                        onChange={(e) => handleAreaImageChange(province, e)}
                      />
                    </label>
                    {url && (
                      <button
                        onClick={() => handleRemoveAreaImage(province)}
                        className="text-xs font-semibold text-danger"
                      >
                        {t.areaRemove}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
