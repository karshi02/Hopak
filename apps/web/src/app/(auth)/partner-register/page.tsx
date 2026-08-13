'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { ALL_PROVINCES, normalizeProvince } from '@hopak/shared';
import PlacesAutocompleteInput, { type PlacePick } from '@/components/map/PlacesAutocompleteInput';
import { loadGoogleMaps } from '@/lib/googleMaps';
import { apiClient } from '@/lib/api-client';
import { setToken } from '@/lib/auth';

// แผนที่โหลดฝั่ง client เท่านั้น (Google Maps ใช้ window)
const MapPicker = dynamic(() => import('@/components/map/MapPicker'), { ssr: false });

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

type Step = 1 | 2 | 3 | 4;

const STEP_LABELS = ['บัญชี', 'ข้อมูลหอ', 'ส่งใบสมัคร', 'รออนุมัติ'];
const MOBILE_STEP_LABELS = ['สร้างบัญชี', 'ยืนยันและข้อมูลหอ', 'ส่งใบสมัคร', 'รออนุมัติ'];

function Mark({ size = 22, dark = false }: { size?: number; dark?: boolean }) {
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-[11px] bg-[linear-gradient(140deg,#16B497,#0E7A6C)] font-sans font-extrabold text-white shadow-[0_7px_18px_rgba(8,94,80,.2)] ${dark ? 'bg-white/15' : ''}`}
      style={{ width: size, height: size, fontSize: size * 0.56 }}
      aria-hidden="true"
    >
      H
    </span>
  );
}

function Icon({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      {children}
    </svg>
  );
}

function ArrowIcon() {
  return <Icon className="h-4 w-4"><path d="M5 12h14" /><path d="m13 6 6 6-6 6" /></Icon>;
}

function PinIcon({ className = 'h-5 w-5' }: { className?: string }) {
  return <Icon className={className}><path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z" /><circle cx="12" cy="10" r="2.5" /></Icon>;
}

function ShieldIcon() {
  return <Icon className="h-4 w-4"><path d="M12 3 4.5 6v5.6c0 4.4 3 7.5 7.5 9.4 4.5-1.9 7.5-5 7.5-9.4V6L12 3Z" /><path d="m8.7 12 2.1 2.1 4.6-4.8" /></Icon>;
}

function GoogleMark() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
      <path fill="#4285F4" d="M21.6 12.23c0-.71-.06-1.23-.2-1.78H12v3.35h5.52c-.11.83-.72 2.08-2.08 2.92l-.02.11 3.02 2.34.21.02c1.94-1.79 3.05-4.42 3.05-7.96Z" />
      <path fill="#34A853" d="M12 22c2.7 0 4.97-.89 6.63-2.42l-3.16-2.47c-.84.59-1.97 1-3.47 1a6 6 0 0 1-5.65-4.15l-.1.01-3.14 2.43-.04.1A10 10 0 0 0 12 22Z" />
      <path fill="#FBBC05" d="M6.35 13.97A6.1 6.1 0 0 1 6.03 12c0-.68.12-1.34.31-1.97v-.12L3.17 7.45l-.1.05A10 10 0 0 0 2 12c0 1.62.39 3.15 1.07 4.5l3.28-2.53Z" />
      <path fill="#EA4335" d="M12 5.97c1.9 0 3.18.82 3.91 1.5l2.85-2.78C16.96 3.02 14.7 2 12 2a10 10 0 0 0-8.93 5.5l3.28 2.53A6 6 0 0 1 12 5.97Z" />
    </svg>
  );
}

function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[13px] font-semibold text-[#33413B]">{label}</span>
      {children}
      {hint && <span className="mt-1.5 block text-xs text-[#7A857F]">{hint}</span>}
    </label>
  );
}

function DesktopStepper({ step }: { step: Step }) {
  return (
    <div className="mt-8 hidden min-[821px]:block">
      <div className="flex items-start">
        {STEP_LABELS.map((label, index) => {
          const number = index + 1;
          const active = step >= number;
          return (
            <div key={label} className="flex flex-1 items-start last:flex-none">
              <div className="flex flex-col items-center">
                <span className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold ${active ? 'bg-[#0E9F8E] text-white shadow-[0_5px_12px_rgba(14,159,142,.25)]' : 'border border-[#E0E5E3] bg-white text-[#A6AFAA]'}`}>
                  {step > number ? '✓' : number}
                </span>
                <span className={`mt-2 whitespace-nowrap text-[12px] font-medium ${active ? 'text-[#167E70]' : 'text-[#A6AFAA]'}`}>{label}</span>
              </div>
              {number < 4 && <span className={`mt-[15px] h-[2px] flex-1 ${step > number ? 'bg-[#0E9F8E]' : 'bg-[#E8ECEA]'}`} />}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function BrandPanel() {
  const benefits = [
    ['เข้าถึงผู้เช่าหลายพันคน', <path key="users" d="M16 20v-1.5a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4V20M9.5 10.5A3.5 3.5 0 1 0 9.5 3a3.5 3.5 0 0 0 0 7.5ZM18 9a3 3 0 0 1 3 3v1M16.5 3.4a3 3 0 0 1 0 5.8" />],
    ['รับเงินปลอดภัย ตรวจยอดอัตโนมัติ', <><path key="shield" d="M12 3 5 6v5.5c0 4.2 2.8 7.2 7 9.2 4.2-2 7-5 7-9.2V6l-7-3Z" /><path key="check" d="m8.7 12 2.1 2.1 4.6-4.8" /></>],
    ['จัดการห้องและการจองในที่เดียว', <><rect key="rect" x="4" y="4" width="16" height="16" rx="3" /><path key="line1" d="M8 9h8M8 13h5" /></>],
  ];
  return (
    <aside className="relative hidden min-h-screen w-[40%] max-w-[620px] flex-col overflow-hidden bg-[linear-gradient(160deg,#0E7A6C_0%,#0B5F55_60%,#08463F_100%)] px-[54px] py-14 text-white min-[821px]:flex">
      <div className="pointer-events-none absolute -right-24 -top-24 h-[390px] w-[390px] rounded-full bg-[radial-gradient(circle,rgba(74,217,182,.26),transparent_67%)]" />
      <div className="pointer-events-none absolute -bottom-32 -left-24 h-[380px] w-[380px] rounded-full bg-[radial-gradient(circle,rgba(69,220,187,.18),transparent_70%)]" />
      {/* กดโลโก้ = กลับหน้าแรก */}
      <Link href="/" aria-label="Hoprak" className="relative flex items-center gap-3 transition hover:opacity-80"><Mark size={44} dark /><span className="font-sans text-[19px] font-bold tracking-[-.3px]">Hoprak Seller</span></Link>

      <div className="relative mt-auto pb-12">
        <p className="max-w-[400px] text-[40px] font-bold leading-[1.2] tracking-[-1.2px]">ปล่อยห้องว่างให้เต็ม<br />เริ่มได้ใน 1 นาที</p>
        <p className="mt-4 max-w-[380px] text-[16px] leading-7 text-white/75">เปิดหอพักของคุณกับ Hoprak แล้วจัดการการจองทุกอย่างได้ในที่เดียว</p>
        <div className="mt-10 space-y-4">
          {benefits.map(([label, paths]) => (
            <div key={label as string} className="flex items-center gap-3.5 text-[15px] font-medium text-white/92">
              <span className="flex h-11 w-11 items-center justify-center rounded-[13px] bg-white/[.13] text-[#D6FFF3]"><Icon className="h-5 w-5">{paths as React.ReactNode}</Icon></span>
              {label as string}
            </div>
          ))}
        </div>
      </div>

    </aside>
  );
}

export default function PartnerRegisterPage() {
  const [step, setStep] = useState<Step>(1);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [dorm, setDorm] = useState('');
  const [addr, setAddr] = useState('');
  const [query, setQuery] = useState('');
  // OTP 6 หลัก (backend ตรวจ @Length(6,6)) — เดิม UI มี 4 ช่องเลยยืนยันไม่ผ่านแน่นอน
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [appId, setAppId] = useState<string | null>(null);
  // continuation secret จาก backend — ต้องแนบทุก request ของใบสมัคร (id อย่างเดียวไม่พอ)
  const [appSecret, setAppSecret] = useState<string | null>(null);
  const [otpVerified, setOtpVerified] = useState(false);
  const [password, setPassword] = useState('');
  const [password2, setPassword2] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resendIn, setResendIn] = useState(0); // คูลดาวน์ก่อนขอรหัสใหม่ได้ (60 วิ ตรงกับ backend)
  const [otpExpiresIn, setOtpExpiresIn] = useState(0); // อายุรหัสที่ส่งไป (600 วิ ตรงกับ backend)
  const [ownerExists, setOwnerExists] = useState(false);
  const [docs, setDocs] = useState<{ name: string; size: number }[]>([]);
  const [uploading, setUploading] = useState(false);
  const docInputRef = useRef<HTMLInputElement>(null);
  const [showMap, setShowMap] = useState(false);
  const [pin, setPin] = useState<{ lat: number; lng: number } | null>(null);
  const [province, setProvince] = useState('');
  const [placeName, setPlaceName] = useState('');
  const [outsideTh, setOutsideTh] = useState(false);
  const otpRefs = useRef<Array<HTMLInputElement | null>>([]);

  const next = () => setStep((current) => Math.min(4, current + 1) as Step);
  const back = () => setStep((current) => Math.max(1, current - 1) as Step);
  // สมัครด้วย Google — ไม่ใช่การล็อกอิน แค่ขอชื่อ/อีเมลของบัญชี Google มากรอกฟอร์มให้
  // (intent=owner_register: callback จะเด้งกลับมาที่หน้านี้พร้อม ?gcode= ไม่แตะบัญชีใดๆ)
  const goGmail = () => {
    window.location.href = `${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'}/auth/google?intent=owner_register`;
  };

  // กลับมาจาก Google: แลกโค้ดเป็นชื่อ+อีเมล แล้วยิงขอ OTP ต่อให้เลย ผู้ใช้ไม่ต้องพิมพ์ซ้ำ
  const [googleProfile, setGoogleProfile] = useState<{ name: string; email: string } | null>(null);
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const gcode = params.get('gcode');
    const queryError = params.get('error');
    if (!gcode && !queryError) return;
    // ล้าง query ทันที ไม่ให้โค้ด/สถานะค้างใน address bar หรือ history
    window.history.replaceState(null, '', '/partner-register');
    if (!gcode) {
      setError('เชื่อมต่อ Google ไม่สำเร็จ กรุณากรอกอีเมลเอง');
      return;
    }
    apiClient
      .postWithCredentials<{ name: string; email?: string }>('/auth/google/exchange/profile', { code: gcode })
      .then((profile) => {
        if (!profile.email) {
          setError('บัญชี Google นี้ไม่มีอีเมล กรุณากรอกอีเมลเอง');
          return;
        }
        setName(profile.name);
        setEmail(profile.email);
        setGoogleProfile({ name: profile.name, email: profile.email });
      })
      .catch(() => setError('เชื่อมต่อ Google ไม่สำเร็จ กรุณากรอกอีเมลเอง'));
  }, []);

  // ได้โปรไฟล์ครบแล้วค่อยยิงสร้างใบสมัคร + ส่ง OTP (state ต้องลงก่อน ไม่งั้นส่งค่าว่าง)
  useEffect(() => {
    if (!googleProfile || name !== googleProfile.name || email !== googleProfile.email) return;
    setGoogleProfile(null);
    void startApplication();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [googleProfile, name, email]);

  // ขั้น 1 → สร้างใบสมัคร แล้วให้ backend ส่ง OTP เข้าอีเมล
  async function startApplication() {
    setError(null);
    setOwnerExists(false); // เปลี่ยนอีเมลแล้วลองใหม่ ต้องไม่ค้างกล่องเตือนของอีเมลก่อนหน้า
    if (!name.trim() || !email.trim()) {
      setError('กรอกชื่อและอีเมลก่อน');
      return;
    }
    setBusy(true);
    try {
      let id = appId;
      let secret = appSecret;
      if (!id || !secret) {
        const app = await apiClient.post<{ id: string; secret?: string; requiresOtp?: boolean }>(
          '/owner-applications',
          { name: name.trim(), email: email.trim() },
        );
        id = app.id;
        setAppId(id);
        // อีเมลนี้มีใบสมัครที่กรอกค้างไว้ — ระบบไม่ล้างทิ้งให้แล้ว (กันคนอื่นที่รู้อีเมลมาลบข้อมูลเรา)
        // ต้องยืนยัน OTP ก่อนถึงจะได้สิทธิ์กรอกต่อ ฝั่ง API จะออก secret ใหม่ให้ตอนยืนยันผ่าน
        if (app.requiresOtp || !app.secret) {
          setAppSecret(null);
          setResendIn(60);
          setOtpExpiresIn(600);
          setStep(2);
          return;
        }
        secret = app.secret;
        setAppSecret(secret);
      }
      await apiClient.post(`/owner-applications/${id}/send-otp`, {}, { 'x-application-secret': secret });
      setResendIn(60);
      setOtpExpiresIn(600);
      setStep(2);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'ส่งรหัสยืนยันไม่สำเร็จ';
      // มีบัญชี "เจ้าของหอ" ด้วยอีเมลนี้แล้ว (คนละเรื่องกับบัญชีผู้เช่า ซึ่งสมัครซ้ำได้)
      setOwnerExists(message.includes('เจ้าของหอ'));
      setError(message);
    } finally {
      setBusy(false);
    }
  }

  async function resendOtp() {
    if (!appId || resendIn > 0) return;
    setError(null);
    try {
      await apiClient.post(`/owner-applications/${appId}/send-otp`, {}, secretHeader());
      setResendIn(60);
      setOtpExpiresIn(600);
      setOtp(['', '', '', '', '', '']);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ส่งรหัสใหม่ไม่สำเร็จ');
    }
  }

  async function verifyOtp() {
    const code = otp.join('');
    setError(null);
    if (!appId || code.length !== 6) {
      setError('กรอกรหัส 6 หลักให้ครบ');
      return;
    }
    if (otpExpiresIn <= 0) {
      setError('รหัสหมดอายุแล้ว กดขอรหัสใหม่');
      return;
    }
    setBusy(true);
    try {
      // ยืนยันโดยไม่มี secret (กลับมาทำใบสมัครเดิมต่อ) API จะออก secret ใหม่มาให้ตรงนี้
      const res = await apiClient.post<{ secret?: string }>(
        `/owner-applications/${appId}/verify-otp`,
        { code },
        secretHeader(),
      );
      if (res.secret) setAppSecret(res.secret);
      setOtpVerified(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'รหัสไม่ถูกต้องหรือหมดอายุ');
    } finally {
      setBusy(false);
    }
  }

  const secretHeader = () => (appSecret ? { 'x-application-secret': appSecret } : undefined);

  // เอกสารยืนยัน (บัตรประชาชน/โฉนด/ทะเบียนบ้าน) — เก็บแบบ private แอดมินเท่านั้นที่เปิดดูได้
  async function uploadDocs(files: FileList | null) {
    if (!files?.length || !appId) return;
    setError(null);
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        if (file.size > 10 * 1024 * 1024) {
          setError(`${file.name} ใหญ่เกิน 10MB`);
          continue;
        }
        const form = new FormData();
        form.append('file', file);
        const res = await fetch(`${API_URL}/owner-applications/${appId}/documents`, {
          method: 'POST',
          body: form,
          headers: appSecret ? { 'x-application-secret': appSecret } : undefined,
        });
        if (!res.ok) {
          const detail = await res.json().catch(() => null);
          throw new Error(detail?.message ?? 'อัปโหลดเอกสารไม่สำเร็จ');
        }
        setDocs((prev) => [...prev, { name: file.name, size: file.size }]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'อัปโหลดเอกสารไม่สำเร็จ');
    } finally {
      setUploading(false);
      if (docInputRef.current) docInputRef.current.value = '';
    }
  }

  // ขั้น 2 → บันทึกข้อมูลหอ + ตั้งรหัสผ่าน = ส่งใบสมัครจริง
  async function submitApplication() {
    setError(null);
    if (!appId) return setError('ยังไม่ได้เริ่มใบสมัคร');
    if (!otpVerified) return setError('ยืนยันรหัส OTP ก่อน');
    if (!dorm.trim()) return setError('กรอกชื่อหอพัก');
    if (!province) return setError('เลือกจังหวัด');
    if (!pin) return setError('ปักหมุดตำแหน่งหอบนแผนที่ก่อน');
    if (password.length < 6) return setError('รหัสผ่านอย่างน้อย 6 ตัวอักษร');
    if (password !== password2) return setError('รหัสผ่านทั้งสองช่องไม่ตรงกัน');
    if (docs.length === 0) return setError('แนบเอกสารยืนยันอย่างน้อย 1 ไฟล์');

    setBusy(true);
    try {
      await apiClient.patch(
        `/owner-applications/${appId}/dorm`,
        {
          dormName: dorm.trim(),
          address: addr.trim() || undefined,
          province,
          lat: pin.lat,
          lng: pin.lng,
        },
        secretHeader(),
      );
      const done = await apiClient.post<{ accessToken?: string }>(
        `/owner-applications/${appId}/finish`,
        { password },
        secretHeader(),
      );
      // finish คืน JWT ของบัญชีเจ้าของหอมาให้ — เก็บไว้เลย ผู้ใช้เข้าคอนโซลได้ทันทีโดยไม่ต้องล็อกอินซ้ำ
      if (done?.accessToken) setToken(done.accessToken);
      setStep(3);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ส่งใบสมัครไม่สำเร็จ');
    } finally {
      setBusy(false);
    }
  }

  // เลือกจากช่องค้นหา (เฉพาะที่พัก: โรงแรม/หอพัก/คอนโป/เกสต์เฮาส์) → เติมทุกช่องอัตโนมัติ
  const pickPlace = (place: PlacePick) => {
    setPin({ lat: place.lat, lng: place.lng });
    // เขียนทับทุกครั้งที่เลือกใหม่ — ไม่ใช่เฉพาะครั้งแรก ไม่งั้นค่าเก่าค้างข้ามสถานที่
    setAddr(place.address);
    setPlaceName(place.name);
    if (place.name) setDorm(place.name);
    // แปลงจังหวัดไม่ได้ (เช่นอยู่ต่างประเทศ) = ล้างค่าให้ว่าง ให้ผู้ใช้เลือกเอง ดีกว่าค้างจังหวัดเดิมผิดๆ
    setProvince(place.province ?? '');
    setOutsideTh(place.country != null && place.country !== 'TH');
    setShowMap(true);
  };

  // ลากหมุด/แตะแผนที่ → หาที่อยู่+จังหวัดย้อนกลับ (reverse geocode) ให้ตรงกับตำแหน่งใหม่
  const movePin = async (lat: number, lng: number) => {
    setPin({ lat, lng });
    try {
      const g = await loadGoogleMaps();
      const geocoder = new g.maps.Geocoder();
      const res = await geocoder.geocode({ location: { lat, lng } });
      const best = res.results?.[0];
      if (!best) return;
      setAddr(best.formatted_address ?? '');
      const comps = best.address_components ?? [];
      // ไม่มี administrative_area_level_1 ก็แกะจากที่อยู่เต็มแทน
      const prov =
        normalizeProvince(comps.find((c) => c.types.includes('administrative_area_level_1'))?.long_name) ??
        normalizeProvince(best.formatted_address);
      // ลากหมุดไปจังหวัดอื่น = เปลี่ยนตาม ; หาไม่เจอ = ล้างให้เลือกเอง
      setProvince(prov ?? '');
      const country = comps.find((c) => c.types.includes('country'))?.short_name ?? null;
      setOutsideTh(country != null && country !== 'TH');
    } catch {
      // หา address ไม่ได้ก็ปล่อย — พิกัดยังใช้ได้
    }
  };
  const setOtpDigit = (index: number, value: string) => {
    const digit = value.replace(/\D/g, '').slice(-1);
    setOtp((current) => current.map((item, itemIndex) => itemIndex === index ? digit : item));
    if (digit && index < 5) otpRefs.current[index + 1]?.focus();
  };
  // นับถอยหลังก่อนกดส่งรหัสใหม่ได้ (คนละตัวกับอายุรหัส)
  useEffect(() => {
    if (resendIn <= 0) return;
    const timer = setTimeout(() => setResendIn((n) => n - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendIn]);

  // นับถอยหลังอายุรหัส OTP — หมดแล้วต้องขอใหม่ (ยืนยันไม่ได้)
  useEffect(() => {
    if (otpExpiresIn <= 0 || otpVerified) return;
    const timer = setTimeout(() => setOtpExpiresIn((n) => n - 1), 1000);
    return () => clearTimeout(timer);
  }, [otpExpiresIn, otpVerified]);

  const mmss = (total: number) => `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;

  const coordinate = pin ? `${pin.lat.toFixed(5)}, ${pin.lng.toFixed(5)}` : null;

  return (
    <main className="min-h-screen bg-white text-[#152019] min-[821px]:flex">
      <BrandPanel />
      <section className="flex min-h-screen min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex h-[66px] items-center border-b border-[#EEF2F0] bg-white/95 px-5 backdrop-blur min-[821px]:hidden">
          <button onClick={back} aria-label="ย้อนกลับ" className={`mr-3 flex h-9 w-9 items-center justify-center rounded-full text-[#33413B] ${step === 2 ? '' : 'invisible'}`}><Icon className="h-5 w-5"><path d="m14 6-6 6 6 6" /></Icon></button>
          <Link href="/" aria-label="Hoprak" className="flex items-center gap-2 transition hover:opacity-80"><Mark size={31} /><span className="font-sans text-[15px] font-bold">Hoprak Seller</span></Link>
          <span className="ml-auto font-sans text-sm font-bold text-[#0E9F8E]">{step}/4</span>
        </header>

        <div className="min-[821px]:mx-auto min-[821px]:w-full min-[821px]:max-w-[560px] min-[821px]:pt-14">
          <div className="hidden items-center justify-between min-[821px]:flex">
            <span className="text-sm font-semibold text-[#5B655F]">ขั้นตอนที่ {step} จาก 4</span>
            <Link href="/partner-login" className="inline-flex items-center gap-2 rounded-full bg-[#0E9F8E] px-5 py-2.5 text-sm font-bold text-white shadow-[0_10px_22px_rgba(14,159,142,.28)] transition hover:bg-[#0B7A6C]">
              <Icon className="h-4 w-4"><path d="M14 8l4 4-4 4" /><path d="M18 12H7" /><path d="M10 5H5a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h5" /></Icon>เข้าสู่ระบบ
            </Link>
          </div>
          <DesktopStepper step={step} />
        </div>

        <div className="px-5 pt-4 min-[821px]:mx-auto min-[821px]:w-full min-[821px]:max-w-[560px] min-[821px]:px-0 min-[821px]:pt-11">
          <div className="min-[821px]:hidden">
            <div className="flex gap-1.5">{[1, 2, 3, 4].map((number) => <span key={number} className={`h-1.5 flex-1 rounded-full ${step >= number ? 'bg-[#0E9F8E]' : 'bg-[#E6EBE8]'}`} />)}</div>
            <p className="mt-2.5 text-[12.5px] font-semibold text-[#5B655F]">ขั้นที่ {step} · {MOBILE_STEP_LABELS[step - 1]}</p>
          </div>

          {step === 1 && (
            <div className="flex min-h-[calc(100vh-130px)] flex-col py-6 min-[821px]:min-h-0 min-[821px]:py-0">
              <div><p className="text-[26px] font-bold leading-tight tracking-[-.45px] min-[821px]:text-[32px]">สร้างบัญชีเจ้าของหอ</p><p className="mt-2 text-[15px] leading-6 text-[#5B655F]"></p></div>
              <button onClick={goGmail} className="mt-7 flex h-[54px] w-full items-center justify-center gap-3 rounded-[14px] border-2 border-[#0E9F8E] bg-white text-[15px] font-bold text-[#17695F] shadow-[0_10px_22px_rgba(14,159,142,.16)] transition hover:bg-[#F2FAF8]"><GoogleMark />สมัครด้วย Gmail</button>
              {/* <p className="mt-3 flex items-center justify-center gap-1.5 text-center text-[12px] text-[#7A857F]"><span className="text-[#0E9F8E]"><ShieldIcon /></span>เชื่อมต่อ Google อย่างปลอดภัย · เราไม่เห็นรหัสผ่าน</p> */}
              <div className="my-7 flex items-center gap-3 text-xs text-[#9AA5A0]"><span className="h-px flex-1 bg-[#E7ECEA]" />หรือใช้อีเมล<span className="h-px flex-1 bg-[#E7ECEA]" /></div>
              <div className="space-y-4">
                <Field label="ชื่อ-นามสกุล"><input value={name} onChange={(event) => setName(event.target.value)} placeholder="เช่น พิมพ์ชนก ใจดี" className="h-[52px] w-full rounded-[13px] border border-[#E7ECEA] bg-[#F6F8F7] px-4 text-[15px] outline-none transition placeholder:text-[#A6AFAA] focus:border-[#0E9F8E] focus:bg-white focus:ring-4 focus:ring-[#0E9F8E]/10" /></Field>
                <Field label="อีเมล" hint="เราจะส่งรหัส OTP ไปยืนยัน"><input value={email} type="email" onChange={(event) => setEmail(event.target.value)} placeholder="your@email.com" className="h-[52px] w-full rounded-[13px] border border-[#E7ECEA] bg-[#F6F8F7] px-4 font-sans text-[15px] outline-none transition placeholder:text-[#A6AFAA] focus:border-[#0E9F8E] focus:bg-white focus:ring-4 focus:ring-[#0E9F8E]/10" /></Field>
              </div>
              <div className="flex-1" />
              {/* อีเมลนี้มีบัญชีเจ้าของหออยู่แล้ว — บอกให้ชัดตรงนี้เลย พร้อมทางไปต่อ ไม่ต้องให้เดา */}
              {ownerExists ? (
                <div className="mt-4 rounded-[13px] border border-[#F0C9A6] bg-[#FFF7EF] p-4">
                  <p className="text-[14px] font-bold text-[#8A5A22]">อีเมลนี้มีบัญชีเจ้าของหออยู่แล้ว</p>
                  <p className="mt-1 text-[13px] text-[#7A6852]">
                    เข้าสู่ระบบด้วยอีเมลนี้ได้เลย หรือถ้าจำรหัสผ่านไม่ได้ให้ตั้งรหัสใหม่
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2.5">
                    <Link
                      href="/partner-login"
                      className="flex h-[42px] items-center rounded-[11px] bg-[#0E9F8E] px-4 text-[13.5px] font-bold text-white"
                    >
                      เข้าสู่ระบบเจ้าของหอ
                    </Link>
                    <Link
                      href="/forgot-password?role=owner"
                      className="flex h-[42px] items-center rounded-[11px] border border-[#E7ECEA] bg-white px-4 text-[13.5px] font-bold text-[#33413B]"
                    >
                      ลืมรหัสผ่าน
                    </Link>
                  </div>
                </div>
              ) : (
                error && <p className="mt-4 text-[13px] font-semibold text-danger">{error}</p>
              )}
              <button onClick={startApplication} disabled={busy} className="mt-8 flex h-[54px] w-full items-center justify-center gap-2 rounded-[14px] bg-[#0E9F8E] text-[15px] font-bold text-white shadow-[0_12px_26px_rgba(14,159,142,.3)] transition hover:bg-[#0B7A6C] disabled:opacity-60">{busy ? 'กำลังส่ง...' : 'ส่งรหัสยืนยัน'} <ArrowIcon /></button>
              <p className="mt-5 text-center text-sm text-[#5B655F] min-[821px]:hidden">มีบัญชีแล้ว? <Link href="/partner-login" className="font-bold text-[#0E9F8E]">เข้าสู่ระบบ</Link></p>
            </div>
          )}

          {step === 2 && (
            <div className="py-6 min-[821px]:py-0">
              <h1 className="text-[25px] font-bold tracking-[-.45px] min-[821px]:text-[32px]">ยืนยันอีเมลและข้อมูลหอ</h1>
              <p className="mt-2 text-[15px] text-[#5B655F]">ส่งรหัส OTP ไปที่ <b className="font-sans text-[#33413B]">{email || 'your@email.com'}</b></p>
              <div className="mt-5 flex gap-2.5 min-[821px]:max-w-[280px]">{otp.map((value, index) => <input key={index} ref={(element) => { otpRefs.current[index] = element; }} value={value} onChange={(event) => setOtpDigit(index, event.target.value)} onKeyDown={(event) => { if (event.key === 'Backspace' && !value && index > 0) otpRefs.current[index - 1]?.focus(); }} inputMode="numeric" maxLength={1} aria-label={`OTP หลักที่ ${index + 1}`} className={`h-[52px] min-w-0 flex-1 rounded-[13px] border text-center font-sans text-[24px] font-bold outline-none transition ${value ? 'border-[#0E9F8E] bg-[#F2FAF8] text-[#0B7A6C]' : 'border-[#E1E8E5] bg-white focus:border-[#0E9F8E] focus:ring-4 focus:ring-[#0E9F8E]/10'}`} />)}</div>
              {/* อายุรหัส (10 นาที) — คนละเรื่องกับคูลดาวน์ขอรหัสใหม่ (1 นาที) */}
              {!otpVerified && otpExpiresIn > 0 && (
                <p className={`mt-2.5 text-[12.5px] font-semibold ${otpExpiresIn <= 60 ? 'text-[#E34D4D]' : 'text-[#5B655F]'}`}>
                  รหัสหมดอายุใน {mmss(otpExpiresIn)} นาที
                </p>
              )}
              {!otpVerified && otpExpiresIn === 0 && appId && (
                <p className="mt-2.5 text-[12.5px] font-semibold text-[#E34D4D]">รหัสหมดอายุแล้ว — กดขอรหัสใหม่ด้านล่าง</p>
              )}

              <div className="mt-3 flex flex-wrap items-center gap-3">
                <button
                  onClick={verifyOtp}
                  disabled={busy || otpVerified || otpExpiresIn <= 0}
                  className={`h-[40px] rounded-[11px] px-4 text-[13.5px] font-bold text-white disabled:opacity-60 ${otpVerified ? 'bg-[#12B58C]' : 'bg-[#0E9F8E]'}`}
                >
                  {otpVerified ? '✓ ยืนยันอีเมลแล้ว' : busy ? 'กำลังตรวจสอบ...' : 'ยืนยันรหัส'}
                </button>
                <button onClick={resendOtp} disabled={resendIn > 0 || otpVerified} className="text-[12.5px] font-semibold text-[#0E9F8E] disabled:text-[#9AA5A0]">
                  {resendIn > 0 ? `ขอรหัสใหม่ได้ใน ${mmss(resendIn)}` : 'ขอรหัสใหม่'}
                </button>
              </div>
              <div className="my-7 h-px bg-[#E7ECEA]" />
              <h2 className="text-[19px] font-bold">ข้อมูลหอพักของคุณ</h2><p className="mt-1 text-[14px] text-[#5B655F]">กรอกเท่าที่มีตอนนี้ รายละเอียดอื่นเพิ่มทีหลังได้</p>
              <button onClick={() => setShowMap((visible) => !visible)} className="mt-5 flex w-full items-center gap-3 rounded-[14px] border border-[#D5EDE7] bg-[#F2FAF8] px-4 py-3.5 text-left transition hover:bg-[#E8F7F3]"><span className="text-[#0E9F8E]"><PinIcon /></span><span className="min-w-0 flex-1"><span className="block text-[14px] font-bold text-[#226C62]">{coordinate ? `✓ ปักหมุดแล้ว · ${coordinate}` : 'ปักหมุดที่อยู่บนแผนที่'}</span><span className="mt-0.5 block text-xs text-[#61857E]">ช่วยให้ผู้เช่าหาหอของคุณเจอได้ง่ายขึ้น</span></span><span className="text-[13px] font-bold text-[#0E9F8E]">{showMap ? 'ซ่อน' : 'ปักหมุด →'}</span></button>
              {showMap && <div className="mt-3">
                {/* ป้ายบอกให้เริ่มกรอกที่ช่องนี้ — ต้องสะดุดตาก่อนอย่างอื่น เพราะกรอกที่นี่แล้วช่องล่างเติมเองหมด */}
                <div className="rounded-[13px] border-[1.5px] border-[#0E9F8E] bg-[#F2FAF8] px-4 py-3">
                  <p className="flex items-center gap-2 text-[14px] font-bold text-[#0B6F62]">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#0E9F8E] text-[11px] font-extrabold text-white">1</span>
                    <span className="underline decoration-[#0E9F8E] decoration-2 underline-offset-4">เริ่มกรอกที่ช่องนี้</span>
                  </p>
                  <p className="mt-1.5 text-[12.5px] leading-relaxed text-[#3E6B63]">
                    พิมพ์ชื่อที่พักแล้วเลือกจากรายการ ระบบจะเติม <b>ที่อยู่ · จังหวัด · ชื่อหอพัก</b> และปักหมุดให้อัตโนมัติ
                    ไม่ต้องกรอกเองทีละช่อง · ลากหมุดปรับตำแหน่งได้
                  </p>
                </div>

                {/* ค้นหาเฉพาะ "ที่พัก" (โรงแรม/หอพัก/คอนโด/เกสต์เฮาส์) — กันกรอกสถานที่มั่ว */}
                <div className="relative mt-3">
                  <span className="pointer-events-none absolute left-3.5 top-[15px] z-10 text-[#78928B]"><Icon className="h-5 w-5"><circle cx="11" cy="11" r="6.5" /><path d="m16 16 4 4" /></Icon></span>
                  <PlacesAutocompleteInput
                    placeholder="ค้นหาชื่อหอพัก / โรงแรม / คอนโด"
                    defaultValue={placeName}
                    onSelect={pickPlace}
                    className="h-[50px] w-full rounded-[13px] border border-[#DDE8E3] bg-white pl-11 pr-4 text-[14px] outline-none focus:border-[#0E9F8E] focus:ring-4 focus:ring-[#0E9F8E]/10"
                  />
                </div>

                <div className="mt-3 overflow-hidden rounded-[16px] border border-[#D7E5DD]">
                  <MapPicker lat={pin?.lat ?? 16.1812} lng={pin?.lng ?? 103.3005} onChange={movePin} />
                </div>

                {outsideTh && (
                  <p className="mt-2 rounded-[10px] bg-[#FFF4E0] px-3 py-2 text-[12px] font-semibold text-[#B4791A]">
                    ที่พักนี้อยู่นอกประเทศไทย — เลือกจังหวัดเองด้านล่างหรือค้นหาที่พักในไทยแทน
                  </p>
                )}
              </div>}
              <div className="mt-5"><Field label="ที่อยู่ / รายละเอียดเพิ่มเติม"><input value={addr} onChange={(event) => setAddr(event.target.value)} placeholder="บ้านเลขที่ ถนน ตำบล อำเภอ" className="h-[52px] w-full rounded-[13px] border border-[#E7ECEA] bg-[#F6F8F7] px-4 text-[14px] outline-none transition placeholder:text-[#A6AFAA] focus:border-[#0E9F8E] focus:bg-white focus:ring-4 focus:ring-[#0E9F8E]/10" /></Field></div>
              <div className="my-6 h-px bg-[#E7ECEA]" />
              <div className="space-y-4"><Field label="ชื่อหอพัก"><input value={dorm} onChange={(event) => setDorm(event.target.value)} placeholder="เช่น หอพักบ้านอุ่นใจ" className="h-[52px] w-full rounded-[13px] border border-[#E7ECEA] bg-[#F6F8F7] px-4 text-[15px] outline-none transition placeholder:text-[#A6AFAA] focus:border-[#0E9F8E] focus:bg-white focus:ring-4 focus:ring-[#0E9F8E]/10" /></Field><div className="grid gap-4"><Field label="จังหวัด"><select value={province} onChange={(event) => setProvince(event.target.value)} className="h-[52px] w-full appearance-none rounded-[13px] border border-[#E7ECEA] bg-[#F6F8F7] px-4 text-[14px] outline-none focus:border-[#0E9F8E]"><option value="">เลือกจังหวัด</option>{ALL_PROVINCES.map((item) => <option key={item} value={item}>{item}</option>)}</select></Field></div></div>
              {/* เอกสารยืนยันตัวตน — แอดมินใช้ตรวจก่อนอนุมัติหอ */}
              <div className="mt-5 rounded-[14px] border border-[#E7ECEA] bg-[#FAFCFB] p-4">
                <p className="text-[14px] font-bold text-[#33413B]">
                  แนบเอกสารยืนยัน <span className="text-[#E34D4D]">*</span>
                </p>
                <p className="mt-1 text-[12.5px] leading-relaxed text-[#7A857F]">
                  บัตรประชาชน · โฉนด/สัญญาเช่า · ทะเบียนบ้าน (รูปภาพหรือ PDF ไม่เกิน 10MB ต่อไฟล์)
                  <br />
                  <b className="text-[#33413B]">เอกสารต้องเป็นของเจ้าของหอเท่านั้น</b> — ชื่อในเอกสารต้องตรงกับชื่อผู้สมัคร
                  <br />
                  เก็บเป็นความลับ เห็นเฉพาะแอดมินตอนตรวจสอบ
                </p>

                <input
                  ref={docInputRef}
                  type="file"
                  multiple
                  accept="image/*,application/pdf"
                  onChange={(event) => uploadDocs(event.target.files)}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => docInputRef.current?.click()}
                  disabled={uploading || !appId}
                  className="mt-3 flex h-[46px] w-full items-center justify-center gap-2 rounded-[12px] border-[1.5px] border-dashed border-[#0E9F8E] bg-white text-[14px] font-bold text-[#0E9F8E] disabled:opacity-50"
                >
                  <Icon className="h-4 w-4"><path d="M12 5v14M5 12h14" /></Icon>
                  {uploading ? 'กำลังอัปโหลด...' : 'เลือกไฟล์เอกสาร'}
                </button>

                {docs.length > 0 && (
                  <ul className="mt-3 space-y-2">
                    {docs.map((doc, index) => (
                      <li key={`${doc.name}-${index}`} className="flex items-center gap-2.5 rounded-[10px] bg-white px-3 py-2">
                        <span className="text-[#12B58C]"><Icon className="h-4 w-4"><path d="m5 12 4.5 4.5L19 7" /></Icon></span>
                        <span className="min-w-0 flex-1 truncate text-[13px] text-[#33413B]">{doc.name}</span>
                        <span className="shrink-0 font-sans text-[11.5px] text-[#7A857F]">
                          {(doc.size / 1024 / 1024).toFixed(1)} MB
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="mt-4 grid gap-4 min-[821px]:grid-cols-2">
                <Field label="ตั้งรหัสผ่าน">
                  <input value={password} onChange={(event) => setPassword(event.target.value)} type="password" autoComplete="new-password" placeholder="••••••••" className="h-[52px] w-full rounded-[13px] border border-[#E7ECEA] bg-[#F6F8F7] px-4 text-[15px] outline-none transition placeholder:text-[#A6AFAA] focus:border-[#0E9F8E] focus:bg-white focus:ring-4 focus:ring-[#0E9F8E]/10" />
                </Field>
                <Field label="ยืนยันรหัสผ่าน">
                  <input
                    value={password2}
                    onChange={(event) => setPassword2(event.target.value)}
                    type="password"
                    autoComplete="new-password"
                    placeholder="••••••••"
                    className={`h-[52px] w-full rounded-[13px] border bg-[#F6F8F7] px-4 text-[15px] outline-none transition placeholder:text-[#A6AFAA] focus:bg-white focus:ring-4 ${
                      password2 && password !== password2
                        ? 'border-[#E34D4D] focus:border-[#E34D4D] focus:ring-[#E34D4D]/10'
                        : 'border-[#E7ECEA] focus:border-[#0E9F8E] focus:ring-[#0E9F8E]/10'
                    }`}
                  />
                </Field>
              </div>
              {error && <p className="mt-3 text-[13px] font-semibold text-danger">{error}</p>}
              <div className="mt-7 flex gap-3"><button onClick={back} className="hidden h-[54px] rounded-[14px] border border-[#DDE5E1] px-6 text-[15px] font-bold text-[#52615B] hover:bg-[#F6F8F7] min-[821px]:block">ย้อนกลับ</button><button onClick={submitApplication} disabled={busy} className="flex h-[54px] flex-1 items-center justify-center gap-2 rounded-[14px] bg-[#0E9F8E] text-[15px] font-bold text-white shadow-[0_12px_26px_rgba(14,159,142,.3)] transition hover:bg-[#0B7A6C] disabled:opacity-60">{busy ? 'กำลังส่ง...' : 'ยืนยันและสร้างหอ'} <ArrowIcon /></button></div>
            </div>
          )}

          {step === 3 && <div className="flex min-h-[calc(100vh-150px)] flex-col items-center justify-center py-12 text-center min-[821px]:min-h-[540px]"><span className="flex h-[84px] w-[84px] items-center justify-center rounded-full bg-[#E4F6F1] text-[#12B58C]"><Icon className="h-10 w-10"><path d="m5 12 4.5 4.5L19 7" /></Icon></span><h1 className="mt-7 text-[27px] font-bold tracking-[-.5px] min-[821px]:text-[32px]">ส่งใบสมัครเรียบร้อย!</h1><p className="mt-3 max-w-[390px] text-[15px] leading-7 text-[#5B655F]">เราได้รับใบสมัครหอ <b className="font-semibold text-[#263B34]">{dorm || 'ของคุณ'}</b> แล้ว ขั้นต่อไปทีมงานจะตรวจสอบข้อมูลและแจ้งผลทางอีเมล</p><button onClick={next} className="mt-9 flex h-[54px] w-full max-w-[360px] items-center justify-center gap-2 rounded-[14px] bg-[#0E9F8E] text-[15px] font-bold text-white shadow-[0_12px_26px_rgba(14,159,142,.3)] hover:bg-[#0B7A6C]">ดูสถานะคำขอ <ArrowIcon /></button></div>}

          {step === 4 && <div className="py-10 text-center min-[821px]:py-8"><span className="mx-auto flex h-[78px] w-[78px] items-center justify-center rounded-full bg-[#FFF4E0] text-[#E0902F]"><Icon className="h-9 w-9"><circle cx="12" cy="12" r="8" /><path d="M12 7v5l3.5 2" /></Icon></span><h1 className="mt-6 text-[27px] font-bold tracking-[-.5px] min-[821px]:text-[32px]">รอแอดมินอนุมัติ</h1><p className="mt-2 text-[15px] leading-6 text-[#5B655F]">ปกติใช้เวลา 1–2 วันทำการ<br />เราจะแจ้งผลทางอีเมล</p>
            <div className="mt-7 rounded-[16px] border border-[#DCEEE9] bg-[#F6FBFA] p-5 text-left"><div className="relative space-y-6"><span className="absolute bottom-6 left-[9px] top-5 w-[2px] bg-[#CDE5DF]" /><div className="relative flex gap-3"><span className="z-10 flex h-5 w-5 items-center justify-center rounded-full bg-[#12B58C] text-[11px] font-bold text-white">✓</span><div><p className="text-[14px] font-bold text-[#286057]">ส่งใบสมัครแล้ว</p><p className="mt-0.5 text-xs text-[#7A857F]">วันนี้ 10:24 น.</p></div></div><div className="relative flex gap-3"><span className="z-10 mt-1 h-5 w-5 rounded-full border-[5px] border-[#E0902F] bg-[#FFF4E0]" /><div><p className="text-[14px] font-bold text-[#5A4A31]">แอดมินกำลังตรวจสอบ <span className="ml-1 rounded-full bg-[#FFF4E0] px-2 py-0.5 text-[11px] font-semibold text-[#B4791A]">กำลังรอ</span></p><p className="mt-0.5 text-xs text-[#7A857F]">เราจะใช้เวลาไม่นาน</p></div></div><div className="relative flex gap-3 opacity-55"><span className="z-10 h-5 w-5 rounded-full border-2 border-[#96A49E] bg-[#F6FBFA]" /><div><p className="text-[14px] font-bold text-[#60716A]">อนุมัติ และเริ่มใช้งาน</p><p className="mt-0.5 text-xs text-[#7A857F]">เปิดหอให้ผู้เช่าจองได้</p></div></div></div></div>
            <div className="mt-4 flex gap-3 rounded-[14px] border border-[#F5DFC0] bg-[#FFF7ED] p-4 text-left"><span className="shrink-0 text-[#C77B14]"><Icon className="h-5 w-5"><rect x="5" y="10" width="14" height="10" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3" /></Icon></span><p className="text-[13px] leading-5 text-[#72532A]">เข้าดูแดชบอร์ดได้เลย แต่<b>ยังลงประกาศหอพักไม่ได้</b>จนกว่าจะอนุมัติ</p></div>
            <Link href="/partner/dashboard" className="mt-6 flex h-[54px] w-full items-center justify-center gap-2 rounded-[14px] bg-[#0E9F8E] text-[15px] font-bold text-white shadow-[0_12px_26px_rgba(14,159,142,.3)] hover:bg-[#0B7A6C]">เข้าสู่แดชบอร์ด <ArrowIcon /></Link><Link href="/" className="mt-3 flex h-[52px] w-full items-center justify-center gap-2 rounded-[14px] border border-[#DDE5E1] bg-white text-[14px] font-bold text-[#52615B] hover:bg-[#F6F8F7]"><Icon className="h-4 w-4"><path d="m3 11 9-7 9 7" /><path d="M5 10v9h14v-9M9 19v-5h6v5" /></Icon>กลับไปหน้าหอพัก</Link><p className="mt-4 hidden text-[12px] text-[#7A857F] min-[821px]:block">โพสต์หอพักจะปลดล็อกอัตโนมัติเมื่อได้รับอนุมัติ</p>
          </div>}
        </div>
      </section>
    </main>
  );
}
