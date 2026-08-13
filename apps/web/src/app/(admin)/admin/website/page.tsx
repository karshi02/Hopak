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
    areaDesc: 'ใส่ได้หลายรูปต่อจังหวัด (สูงสุด 8) การ์ดหน้าแรกจะเลื่อนสไลด์ให้เอง — ไม่ใส่รูป = ใช้สีไล่ระดับเริ่มต้น',
    areaChoose: 'เพิ่มรูป (เลือกได้หลายไฟล์)',
    areaRemove: 'ลบรูปทั้งหมด',
    areaPhotoCount: (n: number) => `${n} รูป`,
    areaUploading: 'กำลังอัปโหลด...',

    promoLabel: 'การ์ดจุดขาย 3 ใบ (ใต้แถบค้นหาหน้าแรก)',
    promoDesc: 'แก้ข้อความบนการ์ด 3 ใบใต้ hero กรอกทั้งไทยและอังกฤษ · เว้นว่างทุกช่องเพื่อกลับไปใช้ข้อความเริ่มต้น',
    promoCardN: (n: number) => `การ์ดที่ ${n}`,
    promoTag: 'ป้ายเล็ก (เช่น ยืนยันตัวตนแล้ว)',
    promoTitle: 'หัวข้อ',
    promoSub: 'คำอธิบายย่อย',
    promoTh: 'ไทย',
    promoEn: 'อังกฤษ',
    promoSave: 'บันทึกการ์ดจุดขาย',
    promoSaving: 'กำลังบันทึก...',
    promoSaved: 'บันทึกการ์ดแล้ว',
    promoReset: 'ล้างทั้งหมด (ใช้ข้อความเริ่มต้น)',
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
    areaDesc: 'Add multiple images per province (up to 8) — the homepage card cycles through them. No image = default gradient.',
    areaChoose: 'Add images (multi-select)',
    areaRemove: 'Remove all',
    areaPhotoCount: (n: number) => `${n} photos`,
    areaUploading: 'Uploading...',

    promoLabel: 'Three selling-point cards (below the homepage search bar)',
    promoDesc: 'Edit the 3 cards under the hero. Fill in both Thai and English · clear every field to fall back to the defaults.',
    promoCardN: (n: number) => `Card ${n}`,
    promoTag: 'Small tag (e.g. Verified)',
    promoTitle: 'Title',
    promoSub: 'Subtitle',
    promoTh: 'Thai',
    promoEn: 'English',
    promoSave: 'Save cards',
    promoSaving: 'Saving...',
    promoSaved: 'Cards saved',
    promoReset: 'Clear all (use defaults)',
  },
};

interface PromoCard {
  tagTh: string;
  titleTh: string;
  subTh: string;
  tagEn: string;
  titleEn: string;
  subEn: string;
}

const EMPTY_PROMO: PromoCard = { tagTh: '', titleTh: '', subTh: '', tagEn: '', titleEn: '', subEn: '' };

const promoInput =
  'h-9 w-full rounded-btn border border-card-border bg-white px-3 text-sm text-ink outline-none placeholder:text-ink-faint focus:border-tenant';

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

  // จังหวัดละหลายรูปได้ — หน้าแรกเลื่อนดูทีละรูป
  const [areaImages, setAreaImages] = useState<Record<string, string[]>>({});
  const [uploadingArea, setUploadingArea] = useState<string | null>(null);

  // การ์ดจุดขาย 3 ใบ — เก็บ 3 ช่องเสมอเพื่อให้ฟอร์มมีครบทุกใบแม้ backend ยังไม่มีข้อมูล
  const [promos, setPromos] = useState<PromoCard[]>([EMPTY_PROMO, EMPTY_PROMO, EMPTY_PROMO]);
  const [savingPromos, setSavingPromos] = useState(false);
  const [promoMessage, setPromoMessage] = useState<string | null>(null);

  function reloadHero() {
    apiClient
      .get<{
        heroImageUrl: string | null;
        posterUrls: string[];
        areaImages: Record<string, string[]>;
        promoCards: PromoCard[];
      }>('/settings/hero')
      .then((data) => {
        setHeroImageUrl(data.heroImageUrl);
        setPosterUrls(data.posterUrls ?? []);
        setAreaImages(data.areaImages ?? {});
        const cards = data.promoCards ?? [];
        setPromos([0, 1, 2].map((i) => cards[i] ?? EMPTY_PROMO));
      })
      .catch(() => setHeroImageUrl(null));
  }

  function updatePromo(index: number, field: keyof PromoCard, value: string) {
    setPromos((prev) => prev.map((c, i) => (i === index ? { ...c, [field]: value } : c)));
  }

  async function handleSavePromos() {
    setSavingPromos(true);
    setPromoMessage(null);
    // ถ้าทุกใบว่างหมด ส่ง [] เพื่อกลับไปใช้ข้อความ default
    // ถ้ามีอย่างน้อย 1 ใบที่กรอก ส่งทั้ง 3 ช่อง (รวมช่องว่าง) เพื่อรักษาตำแหน่ง index
    // หน้าแรก merge ต่อช่อง — ช่องที่ว่างจะใช้ข้อความ default ของช่องนั้น
    const anyFilled = promos.some((c) => Object.values(c).some((v) => v.trim() !== ''));
    const cards = anyFilled ? promos : [];
    try {
      await apiClient.post('/admin/settings/promos', { cards });
      setPromoMessage(t.promoSaved);
    } catch {
      setPromoMessage(t.error);
    } finally {
      setSavingPromos(false);
    }
  }

  function handleResetPromos() {
    setPromos([EMPTY_PROMO, EMPTY_PROMO, EMPTY_PROMO]);
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

  // เลือกได้หลายไฟล์ต่อครั้ง — ต่อท้ายรูปเดิมของจังหวัดนั้น (API ตัดที่ 8 รูป)
  async function handleAreaImageChange(province: string, e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    e.target.value = '';
    if (!files.length) return;
    setUploadingArea(province);
    try {
      const formData = new FormData();
      files.forEach((f) => formData.append('files', f));
      formData.append('province', province);
      const res = await fetch(`${API_URL}/admin/settings/area-image`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${getToken()}` },
        body: formData,
      });
      if (res.ok) {
        const data: { areaImages: Record<string, string[]> } = await res.json();
        setAreaImages(data.areaImages ?? {});
      }
    } finally {
      setUploadingArea(null);
    }
  }

  // ไม่ส่ง index = ลบทั้งจังหวัด · ส่ง index = ลบทีละรูป
  async function handleRemoveAreaImage(province: string, index?: number) {
    if (!window.confirm(t.removeConfirm)) return;
    const path =
      index === undefined
        ? `/admin/settings/area-image/${encodeURIComponent(province)}`
        : `/admin/settings/area-image/${encodeURIComponent(province)}/${index}`;
    const res = await fetch(`${API_URL}${path}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${getToken()}` },
    });
    if (res.ok) {
      const data: { areaImages: Record<string, string[]> } = await res.json();
      setAreaImages(data.areaImages ?? {});
    }
  }

  return (
    <div className="max-w-2xl">
      <div className="rounded-card-lg border border-card-border bg-white p-4 shadow-card sm:p-6">
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

        <div className="mt-4 flex flex-col items-start gap-3 sm:flex-row sm:items-center">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="max-w-full text-sm text-ink"
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

      <div className="mt-6 rounded-card-lg border border-card-border bg-white p-4 shadow-card sm:p-6">
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

        <div className="mt-4 flex flex-col items-start gap-3 sm:flex-row sm:items-center">
          <input
            ref={posterInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handlePosterFilesChange}
            className="max-w-full text-sm text-ink"
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

      <div className="mt-6 rounded-card-lg border border-card-border bg-white p-4 shadow-card sm:p-6">
        <h2 className="font-semibold text-ink-strong">{t.areaLabel}</h2>
        <p className="mt-1 text-sm text-ink-subtitle">{t.areaDesc}</p>

        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {PROVINCES.map((province) => {
            const urls = areaImages[province] ?? [];
            const isUploading = uploadingArea === province;
            return (
              <div key={province} className="overflow-hidden rounded-btn border border-card-border">
                <div className="relative h-24 bg-surface-canvas">
                  {urls[0] ? (
                    <img src={urls[0]} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full items-center justify-center text-xs text-ink-faint">{t.none}</div>
                  )}
                  {urls.length > 1 && (
                    <span className="absolute right-1.5 top-1.5 rounded-full bg-black/55 px-2 py-0.5 text-[10.5px] font-bold text-white">
                      {t.areaPhotoCount(urls.length)}
                    </span>
                  )}
                </div>

                {/* รูปทั้งหมดของจังหวัด — กด x ลบทีละรูป */}
                {urls.length > 1 && (
                  <div className="flex flex-wrap gap-1.5 border-b border-card-border p-2">
                    {urls.map((u, i) => (
                      <div key={u} className="relative h-10 w-10 overflow-hidden rounded-[7px]">
                        <img src={u} alt="" className="h-full w-full object-cover" />
                        <button
                          onClick={() => handleRemoveAreaImage(province, i)}
                          aria-label="remove"
                          className="absolute right-0 top-0 flex h-4 w-4 items-center justify-center rounded-bl-[6px] bg-black/60 text-[10px] font-bold leading-none text-white"
                        >
                          &times;
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="p-2">
                  <p className="truncate text-xs font-semibold text-ink-strong">{province}</p>
                  <div className="mt-1.5 flex items-center gap-2">
                    <label className="cursor-pointer text-xs font-semibold text-tenant">
                      {isUploading ? t.areaUploading : t.areaChoose}
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        className="hidden"
                        disabled={isUploading}
                        onChange={(e) => handleAreaImageChange(province, e)}
                      />
                    </label>
                    {urls.length > 0 && (
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

      {/* ===== PROMO CARDS ===== */}
      <div className="mt-6 rounded-card-lg border border-card-border bg-white p-4 shadow-card sm:p-6">
        <h2 className="font-semibold text-ink-strong">{t.promoLabel}</h2>
        <p className="mt-1 text-sm text-ink-subtitle">{t.promoDesc}</p>

        <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
          {promos.map((card, i) => (
            <div key={i} className="rounded-btn border border-card-border p-3.5">
              <div className="mb-2.5 text-sm font-bold text-ink-strong">{t.promoCardN(i + 1)}</div>

              <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-ink-faint">{t.promoTh}</div>
              <div className="flex flex-col gap-2">
                <input
                  value={card.tagTh}
                  onChange={(e) => updatePromo(i, 'tagTh', e.target.value)}
                  placeholder={t.promoTag}
                  className={promoInput}
                />
                <input
                  value={card.titleTh}
                  onChange={(e) => updatePromo(i, 'titleTh', e.target.value)}
                  placeholder={t.promoTitle}
                  className={promoInput}
                />
                <input
                  value={card.subTh}
                  onChange={(e) => updatePromo(i, 'subTh', e.target.value)}
                  placeholder={t.promoSub}
                  className={promoInput}
                />
              </div>

              <div className="mb-1 mt-3 text-[11px] font-semibold uppercase tracking-wide text-ink-faint">
                {t.promoEn}
              </div>
              <div className="flex flex-col gap-2">
                <input
                  value={card.tagEn}
                  onChange={(e) => updatePromo(i, 'tagEn', e.target.value)}
                  placeholder={t.promoTag}
                  className={promoInput}
                />
                <input
                  value={card.titleEn}
                  onChange={(e) => updatePromo(i, 'titleEn', e.target.value)}
                  placeholder={t.promoTitle}
                  className={promoInput}
                />
                <input
                  value={card.subEn}
                  onChange={(e) => updatePromo(i, 'subEn', e.target.value)}
                  placeholder={t.promoSub}
                  className={promoInput}
                />
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            onClick={handleSavePromos}
            disabled={savingPromos}
            className="rounded-btn bg-tenant px-4 py-2 text-sm font-semibold text-white hover:bg-tenant-dark disabled:opacity-60"
          >
            {savingPromos ? t.promoSaving : t.promoSave}
          </button>
          <button
            onClick={handleResetPromos}
            className="rounded-btn border border-card-border px-4 py-2 text-sm font-semibold text-ink-body hover:bg-surface-canvas"
          >
            {t.promoReset}
          </button>
          {promoMessage && <span className="text-sm text-success">{promoMessage}</span>}
        </div>
      </div>
    </div>
  );
}
