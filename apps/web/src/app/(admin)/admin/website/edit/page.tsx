'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { apiClient } from '@/lib/api-client';
import { getToken } from '@/lib/auth';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

// ---- ข้อความ default หน้าแรก (ตรงกับ TEXT.th ใน apps/web/src/app/page.tsx) ----
// ใช้เป็นค่าเริ่มต้นให้แอดมินแก้จากข้อความจริงที่โชว์อยู่ ไม่ใช่ช่องว่าง
const DEFAULT = {
  heroTitle: 'หาหอพักใกล้มหาวิทยาลัย ราคาโปร่งใส จองได้ทันที',
  heroSubtitle: 'เปรียบเทียบค่าน้ำค่าไฟก่อนจอง',
  zonesTitle: 'ทำเลยอดนิยม',
  zonesSub: 'เลือกจังหวัดที่ใช่ แล้วดูหอพักทั้งหมดในจังหวัดนั้น',
  trust: [
    { titleTh: 'ราคาโปร่งใส', subTh: 'เห็นค่าน้ำค่าไฟ ค่ามัดจำครบ ไม่มีค่าแอบแฝง' },
    { titleTh: 'จองปลอดภัย', subTh: 'ชำระเงินผ่านระบบ มีหลักฐานการจองครบถ้วน' },
    { titleTh: 'รีวิวจริงจากผู้เช่า', subTh: 'อ่านรีวิวจากคนที่เคยเข้าพักจริงก่อนตัดสินใจ' },
  ],
  promos: [
    { tag: 'ยืนยันตัวตนแล้ว', title: 'หอพักทุกแห่งผ่านการตรวจสอบโดยแอดมิน', sub: 'ปลอดภัย ไม่โดนหลอก' },
    { tag: 'สมาชิกใหม่', title: 'สมัครฟรี เริ่มค้นหาหอได้ทันที', sub: 'เริ่มใช้งานได้ทันที' },
    { tag: 'โปร่งใส', title: 'เห็นค่าน้ำ ค่าไฟ ค่ามัดจำครบก่อนจอง', sub: 'ไม่มีค่าใช้จ่ายแอบแฝง' },
  ],
};

const PROMO_STYLE = [
  { bg: 'linear-gradient(135deg,#178F5A,#0F6E44)', tagFg: '#0F6E44' },
  { bg: 'linear-gradient(135deg,#2F6FE0,#1E4FB0)', tagFg: '#1E4FB0' },
  { bg: 'linear-gradient(135deg,#E0902F,#C77B14)', tagFg: '#C77B14' },
];
const TRUST_IC = ['#EAF1FF', '#E7F7EF', '#F3ECFF'];
const TRUST_ICON_STROKE = ['#2F6FE0', '#178F5A', '#7C4DE0'];

interface PromoCard {
  tagTh: string;
  titleTh: string;
  subTh: string;
  tagEn: string;
  titleEn: string;
  subEn: string;
}
interface HomeContent {
  heroTitleTh?: string;
  heroSubtitleTh?: string;
  heroColor?: string;
  heroPos?: string;
  zonesTitleTh?: string;
  zonesSubTh?: string;
  trust?: { titleTh: string; subTh: string }[];
}

// สีพื้นหลัง hero ตอนไม่มีรูป — value '' = gradient ฟ้าเริ่มต้น, ที่เหลือเป็นสีทึบ (hex)
const HERO_COLORS: { label: string; value: string; css: string }[] = [
  { label: 'ฟ้า (เริ่มต้น)', value: '', css: 'linear-gradient(120deg,#2F6FE0,#2456B8)' },
  { label: 'ฟ้าเข้ม', value: '#1E4FB0', css: '#1E4FB0' },
  { label: 'กรมท่า', value: '#14171C', css: '#14171C' },
  { label: 'เขียว', value: '#178F5A', css: '#178F5A' },
  { label: 'ส้ม', value: '#E0902F', css: '#E0902F' },
  { label: 'ม่วง', value: '#7C4DE0', css: '#7C4DE0' },
  { label: 'แดง', value: '#DC4C4C', css: '#DC4C4C' },
  { label: 'ชมพู', value: '#E0559B', css: '#E0559B' },
];

// key ของทุกช่องที่แก้ได้ (เก็บเป็น flat map string)
type Values = Record<string, string>;

function buildInitial(hc: HomeContent, promos: PromoCard[]): Values {
  const v: Values = {
    heroTitle: hc.heroTitleTh || DEFAULT.heroTitle,
    heroSubtitle: hc.heroSubtitleTh || DEFAULT.heroSubtitle,
    heroColor: hc.heroColor || '',
    heroPos: hc.heroPos || '50% 50%',
    zonesTitle: hc.zonesTitleTh || DEFAULT.zonesTitle,
    zonesSub: hc.zonesSubTh || DEFAULT.zonesSub,
  };
  for (let i = 0; i < 3; i++) {
    v[`trust${i}title`] = hc.trust?.[i]?.titleTh || DEFAULT.trust[i].titleTh;
    v[`trust${i}sub`] = hc.trust?.[i]?.subTh || DEFAULT.trust[i].subTh;
    v[`promo${i}tag`] = promos[i]?.tagTh || DEFAULT.promos[i].tag;
    v[`promo${i}title`] = promos[i]?.titleTh || DEFAULT.promos[i].title;
    v[`promo${i}sub`] = promos[i]?.subTh || DEFAULT.promos[i].sub;
  }
  return v;
}

function Editable({
  id,
  initial,
  dirty,
  onEdit,
  className,
  style,
  placeholder,
}: {
  id: string;
  initial: string;
  dirty: boolean;
  onEdit: (id: string, val: string) => void;
  className?: string;
  style?: React.CSSProperties;
  placeholder?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  // ตั้งค่าเริ่มต้นตอน mount เท่านั้น — ไม่ป้อน value กลับเข้า DOM ตอน re-render (กัน cursor เด้ง)
  useEffect(() => {
    if (ref.current) ref.current.innerText = initial;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <div
      ref={ref}
      contentEditable
      suppressContentEditableWarning
      data-ph={placeholder}
      onInput={(e) => onEdit(id, e.currentTarget.innerText)}
      className={`ce${dirty ? ' ce-dirty' : ''}${className ? ' ' + className : ''}`}
      style={style}
    />
  );
}

export default function AdminWebsiteInlineEditPage() {
  const [loaded, setLoaded] = useState(false);
  const [initial, setInitial] = useState<Values>({});
  const [values, setValues] = useState<Values>({});
  const [loadedPromos, setLoadedPromos] = useState<PromoCard[]>([]);
  const [heroImageUrl, setHeroImageUrl] = useState<string | null>(null);
  const [resetKey, setResetKey] = useState(0);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const heroInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    apiClient
      .get<{ heroImageUrl: string | null; promoCards: PromoCard[]; homeContent: HomeContent }>('/settings/hero')
      .then((data) => {
        const init = buildInitial(data.homeContent ?? {}, data.promoCards ?? []);
        setInitial(init);
        setValues(init);
        setLoadedPromos(data.promoCards ?? []);
        setHeroImageUrl(data.heroImageUrl ?? null);
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }, []);

  const dirtyKeys = useMemo(
    () => Object.keys(values).filter((k) => (values[k] ?? '') !== (initial[k] ?? '')),
    [values, initial],
  );
  const dirtyCount = dirtyKeys.length;

  function showToast(msg: string) {
    setToast(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 1800);
  }

  function onEdit(id: string, val: string) {
    setValues((prev) => ({ ...prev, [id]: val }));
  }

  function handleReset() {
    setValues(initial);
    setResetKey((k) => k + 1); // remount Editable → คืนค่าเริ่มต้นใน DOM
    showToast('ยกเลิกการแก้ไขแล้ว');
  }

  async function handleSave() {
    setSaving(true);
    try {
      // ข้อความหน้าแรก
      await apiClient.post('/admin/settings/home-content', {
        heroTitleTh: values.heroTitle,
        heroSubtitleTh: values.heroSubtitle,
        heroColor: values.heroColor || '',
        heroPos: values.heroPos || '50% 50%',
        zonesTitleTh: values.zonesTitle,
        zonesSubTh: values.zonesSub,
        trust: [0, 1, 2].map((i) => ({ titleTh: values[`trust${i}title`], subTh: values[`trust${i}sub`] })),
      });
      // การ์ดจุดขาย — แก้ไทยจาก editor, คงอังกฤษเดิมจากที่โหลดมา (ว่างก็ปล่อยว่าง หน้าแรก merge default ต่อช่อง)
      const cards: PromoCard[] = [0, 1, 2].map((i) => ({
        tagTh: values[`promo${i}tag`] ?? '',
        titleTh: values[`promo${i}title`] ?? '',
        subTh: values[`promo${i}sub`] ?? '',
        tagEn: loadedPromos[i]?.tagEn ?? '',
        titleEn: loadedPromos[i]?.titleEn ?? '',
        subEn: loadedPromos[i]?.subEn ?? '',
      }));
      await apiClient.post('/admin/settings/promos', { cards });
      setInitial(values); // snapshot ใหม่ = ล้าง dirty
      showToast('บันทึกการเปลี่ยนแปลงเรียบร้อย ✓');
    } catch {
      showToast('บันทึกไม่สำเร็จ');
    } finally {
      setSaving(false);
    }
  }

  async function handlePickHero(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch(`${API_URL}/admin/settings/hero`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${getToken()}` },
        body: fd,
      });
      if (!res.ok) throw new Error();
      const data: { heroImageUrl: string } = await res.json();
      setHeroImageUrl(data.heroImageUrl);
      showToast('เปลี่ยนรูปพื้นหลังแล้ว ✓');
    } catch {
      showToast('อัปโหลดรูปไม่สำเร็จ');
    }
  }

  async function handleClearHero() {
    try {
      const res = await fetch(`${API_URL}/admin/settings/hero`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (!res.ok) throw new Error();
      setHeroImageUrl(null);
      showToast('เอารูปพื้นหลังออกแล้ว');
    } catch {
      showToast('เอารูปออกไม่สำเร็จ');
    }
  }

  const heroBg = heroImageUrl
    ? `url('${heroImageUrl}')`
    : values.heroColor || 'linear-gradient(120deg,#2F6FE0,#2456B8)';
  const heroTextShadow = heroImageUrl ? '0 2px 12px rgba(0,0,0,.55)' : undefined;
  // แยกตำแหน่งรูป "X% Y%" เป็นตัวเลขให้ slider คุม
  const [posX, posY] = (values.heroPos || '50% 50%').split(' ').map((p) => parseInt(p, 10) || 0);
  const setPos = (x: number, y: number) => onEdit('heroPos', `${x}% ${y}%`);

  return (
    <div className="-m-4 sm:-m-6">
      <style>{`
        .ce { outline:none; border-radius:6px; transition:box-shadow .12s, background .12s; cursor:text; }
        .ce:hover { box-shadow:0 0 0 2px rgba(47,111,224,.35); background:rgba(47,111,224,.05); }
        .ce:focus { box-shadow:0 0 0 2px #2F6FE0, 0 4px 14px rgba(47,111,224,.25); background:#fff; }
        .ce-dirty:not(:focus) { box-shadow:0 0 0 2px rgba(23,143,90,.45); background:rgba(23,143,90,.06); }
        .ce:empty::before { content:attr(data-ph); color:#B4BAC5; }
      `}</style>

      {/* ===== STICKY EDIT BAR ===== */}
      <div className="sticky top-0 z-40 flex flex-wrap items-center gap-4 border-b border-[#2A2F38] bg-[#14171C] px-4 py-3 sm:px-6">
        <div className="flex items-center gap-2.5">
          <span className="flex h-[34px] w-[34px] items-center justify-center rounded-[9px] bg-tenant font-sans font-bold text-white">
            H
          </span>
          <div>
            <div className="text-[15px] font-bold leading-tight text-white">แก้ไขหน้าแรก</div>
            <div className="text-[12px] text-[#8A909B]">คลิกที่ข้อความใดก็ได้เพื่อแก้ไขทันที</div>
          </div>
        </div>

        <div
          className="flex h-[34px] items-center gap-2 rounded-pill px-3.5"
          style={{ background: dirtyCount === 0 ? '#22262E' : 'rgba(23,143,90,.16)' }}
        >
          <span
            className="h-2 w-2 rounded-pill"
            style={{ background: dirtyCount === 0 ? '#5B616C' : '#1FB56E' }}
          />
          <span className="text-[13px] font-semibold" style={{ color: dirtyCount === 0 ? '#8A909B' : '#3DDC97' }}>
            {dirtyCount === 0 ? 'ยังไม่มีการแก้ไข' : `แก้ไขแล้ว ${dirtyCount} จุด`}
          </span>
        </div>

        <div className="ml-auto flex items-center gap-2.5">
          <Link
            href="/admin/website"
            className="flex h-[42px] items-center rounded-[11px] border border-[#3A3F49] px-4 text-sm font-semibold text-[#C7CCD5] hover:bg-white/5"
          >
            ตั้งค่ารูป/โปสเตอร์
          </Link>
          <button
            onClick={handleReset}
            disabled={dirtyCount === 0}
            className="h-[42px] rounded-[11px] border border-[#3A3F49] bg-transparent px-[18px] text-sm font-semibold text-[#C7CCD5] hover:bg-white/5 disabled:opacity-40"
          >
            ยกเลิกการแก้ไข
          </button>
          <button
            onClick={handleSave}
            disabled={dirtyCount === 0 || saving}
            className="flex h-[42px] items-center gap-2 rounded-[11px] px-[22px] text-sm font-bold text-white shadow-[0_6px_16px_rgba(47,111,224,.35)] disabled:opacity-60"
            style={{ background: dirtyCount === 0 ? '#3A4050' : '#2F6FE0' }}
          >
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none">
              <path d="M5 4h11l3 3v13H5z" stroke="#fff" strokeWidth="1.8" strokeLinejoin="round" />
              <path d="M8 4v5h7M8 20v-6h8v6" stroke="#fff" strokeWidth="1.8" strokeLinejoin="round" />
            </svg>
            {saving ? 'กำลังบันทึก...' : 'บันทึกการเปลี่ยนแปลง'}
          </button>
        </div>
      </div>

      {/* hint strip */}
      <div className="mx-auto mt-[18px] max-w-[1120px] px-4 sm:px-5">
        <div className="flex items-center gap-2.5 rounded-xl border border-[#D3E2FA] bg-[#EAF1FD] px-4 py-3">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="shrink-0">
            <circle cx="12" cy="12" r="9" stroke="#2F6FE0" strokeWidth="1.7" />
            <path d="M12 8h.01M11 12h1v4h1" stroke="#2F6FE0" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span className="text-[13.5px] text-[#1E4FB0]">
            เลื่อนเมาส์ไปที่ข้อความจะเห็นกรอบสีฟ้า · คลิกเพื่อพิมพ์แก้ · ช่องที่แก้แล้วจะขึ้นกรอบสีเขียว · กด
            “บันทึก” เมื่อเสร็จ
          </span>
        </div>
      </div>

      {!loaded ? (
        <div className="mx-auto max-w-[1120px] px-4 py-16 text-center text-sm text-ink-faint">กำลังโหลด...</div>
      ) : (
        <div className="mx-auto mb-16 mt-5 max-w-[1120px] px-4 sm:px-5" key={resetKey}>
          <div className="overflow-hidden rounded-[20px] border border-[#E4E7EC] bg-white shadow-[0_8px_30px_rgba(20,40,80,.08)]">
            {/* hero — โชว์ภาพจริงไม่มีฟิลเตอร์ */}
            <div
              className="relative bg-cover bg-center px-5 py-9 text-center sm:px-12 sm:py-[52px]"
              style={{
                background: heroBg,
                backgroundSize: 'cover',
                backgroundPosition: heroImageUrl ? values.heroPos || '50% 50%' : 'center',
              }}
            >
              <div className="absolute right-3.5 top-3.5 z-[3] flex gap-2">
                <label className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-[10px] bg-white/[.92] px-3.5 text-[13px] font-bold text-[#1E4FB0] shadow-[0_4px_12px_rgba(0,0,0,.18)]">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                    <rect x="3" y="4" width="18" height="16" rx="2.5" stroke="#1E4FB0" strokeWidth="1.8" />
                    <path d="M3 16l5-5 4 4 3-3 6 6" stroke="#1E4FB0" strokeWidth="1.8" strokeLinejoin="round" />
                  </svg>
                  เปลี่ยนรูปพื้นหลัง
                  <input ref={heroInputRef} type="file" accept="image/*" onChange={handlePickHero} className="hidden" />
                </label>
                {heroImageUrl && (
                  <button
                    onClick={handleClearHero}
                    className="inline-flex h-9 items-center gap-1.5 rounded-[10px] bg-[rgba(20,23,28,.7)] px-3 text-[13px] font-semibold text-white"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                      <path d="M6 6l12 12M18 6L6 18" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
                    </svg>
                    เอารูปออก
                  </button>
                )}
              </div>

              <div className="relative z-[2]">
                <Editable
                  id="heroTitle"
                  initial={initial.heroTitle}
                  dirty={values.heroTitle !== initial.heroTitle}
                  onEdit={onEdit}
                  placeholder="หัวข้อหลัก"
                  className="mx-auto max-w-2xl text-balance text-[24px] font-bold tracking-tight text-white sm:text-[34px]"
                  style={{ textShadow: heroTextShadow }}
                />
                <Editable
                  id="heroSubtitle"
                  initial={initial.heroSubtitle}
                  dirty={values.heroSubtitle !== initial.heroSubtitle}
                  onEdit={onEdit}
                  placeholder="คำอธิบาย"
                  className="mx-auto mt-3 max-w-[560px] text-[14px] text-[#EAF1FD] sm:text-[17px]"
                  style={{ textShadow: heroTextShadow }}
                />
              </div>

              {/* เลือกสีพื้นหลัง — โชว์เฉพาะตอนไม่มีรูป */}
              {!heroImageUrl && (
                <div className="relative z-[2] mx-auto mt-6 inline-flex flex-wrap items-center justify-center gap-2 rounded-2xl bg-black/25 px-4 py-3 backdrop-blur-sm">
                  <span className="mr-1 text-[12.5px] font-semibold text-white">สีพื้นหลัง:</span>
                  {HERO_COLORS.map((c) => {
                    const active = (values.heroColor || '') === c.value;
                    return (
                      <button
                        key={c.value || 'default'}
                        type="button"
                        title={c.label}
                        onClick={() => onEdit('heroColor', c.value)}
                        className={`h-8 w-8 rounded-full border-2 transition ${
                          active ? 'border-white ring-2 ring-white/60' : 'border-white/40 hover:border-white'
                        }`}
                        style={{ background: c.css }}
                      />
                    );
                  })}
                </div>
              )}

              {/* เลือกตำแหน่งรูป — โชว์เฉพาะตอนมีรูป เลื่อนแล้วพรีวิวสด */}
              {heroImageUrl && (
                <div className="relative z-[2] mx-auto mt-6 flex max-w-[420px] flex-col gap-2.5 rounded-2xl bg-black/30 px-4 py-3 backdrop-blur-sm">
                  <div className="text-[12.5px] font-semibold text-white">ตำแหน่งรูป (เลื่อนเลือกส่วนที่จะโชว์)</div>
                  <label className="flex items-center gap-3">
                    <span className="w-14 text-[12px] text-white/85">แนวนอน</span>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={posX}
                      onChange={(e) => setPos(parseInt(e.target.value, 10), posY)}
                      className="h-1.5 flex-1 accent-white"
                    />
                    <span className="w-9 text-right text-[12px] text-white/85">{posX}%</span>
                  </label>
                  <label className="flex items-center gap-3">
                    <span className="w-14 text-[12px] text-white/85">แนวตั้ง</span>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={posY}
                      onChange={(e) => setPos(posX, parseInt(e.target.value, 10))}
                      className="h-1.5 flex-1 accent-white"
                    />
                    <span className="w-9 text-right text-[12px] text-white/85">{posY}%</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setPos(50, 50)}
                    className="self-start text-[12px] font-semibold text-white/80 underline hover:text-white"
                  >
                    รีเซ็ตเป็นกึ่งกลาง
                  </button>
                </div>
              )}
            </div>

            {/* promo cards */}
            <div className="grid grid-cols-1 gap-4 p-5 sm:grid-cols-2 sm:p-8 lg:grid-cols-3">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="relative min-h-[150px] overflow-hidden rounded-2xl p-5"
                  style={{ background: PROMO_STYLE[i].bg }}
                >
                  <div className="pointer-events-none absolute -right-8 -top-8 h-[120px] w-[120px] rounded-full bg-white/[.12]" />
                  <div className="relative">
                    <Editable
                      id={`promo${i}tag`}
                      initial={initial[`promo${i}tag`]}
                      dirty={values[`promo${i}tag`] !== initial[`promo${i}tag`]}
                      onEdit={onEdit}
                      className="inline-block rounded-pill bg-white/90 px-3 py-1 text-[12.5px] font-bold"
                      style={{ color: PROMO_STYLE[i].tagFg }}
                    />
                    <Editable
                      id={`promo${i}title`}
                      initial={initial[`promo${i}title`]}
                      dirty={values[`promo${i}title`] !== initial[`promo${i}title`]}
                      onEdit={onEdit}
                      className="mt-3.5 text-[18px] font-bold leading-snug text-white"
                    />
                    <Editable
                      id={`promo${i}sub`}
                      initial={initial[`promo${i}sub`]}
                      dirty={values[`promo${i}sub`] !== initial[`promo${i}sub`]}
                      onEdit={onEdit}
                      className="mt-1.5 text-[13.5px] text-white/85"
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* section title + trust rows */}
            <div className="px-5 pb-7 sm:px-8">
              <Editable
                id="zonesTitle"
                initial={initial.zonesTitle}
                dirty={values.zonesTitle !== initial.zonesTitle}
                onEdit={onEdit}
                className="mb-1 text-[19px] font-bold sm:text-[23px]"
              />
              <Editable
                id="zonesSub"
                initial={initial.zonesSub}
                dirty={values.zonesSub !== initial.zonesSub}
                onEdit={onEdit}
                className="mb-4 text-[14px] text-[#8A909B]"
              />
              <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="flex items-start gap-3.5 rounded-[14px] border border-[#EAEDF2] p-4">
                    <div
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[11px]"
                      style={{ background: TRUST_IC[i] }}
                    >
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                        <path
                          d={
                            [
                              'M12 3v18M8 7h5a3 3 0 010 6H9a3 3 0 000 6h6',
                              'M12 3l7 4v5c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V7l7-4z',
                              'M12 2l2.9 6.2 6.8.7-5.1 4.6 1.5 6.7L12 17.8',
                            ][i]
                          }
                          stroke={TRUST_ICON_STROKE[i]}
                          strokeWidth="1.8"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </div>
                    <div className="min-w-0 flex-1">
                      <Editable
                        id={`trust${i}title`}
                        initial={initial[`trust${i}title`]}
                        dirty={values[`trust${i}title`] !== initial[`trust${i}title`]}
                        onEdit={onEdit}
                        className="text-[15px] font-bold"
                      />
                      <Editable
                        id={`trust${i}sub`}
                        initial={initial[`trust${i}sub`]}
                        dirty={values[`trust${i}sub`] !== initial[`trust${i}sub`]}
                        onEdit={onEdit}
                        className="mt-1 text-[13px] leading-relaxed text-[#7A808B]"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-xl bg-[#14171C] px-6 py-3 text-sm font-semibold text-white shadow-[0_12px_30px_rgba(0,0,0,.3)]">
          {toast}
        </div>
      )}
    </div>
  );
}
