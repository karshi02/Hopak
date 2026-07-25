'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { apiClient } from '@/lib/api-client';
import { getToken, setToken } from '@/lib/auth';
import { useLang } from '@/hooks/useLang';
import { useFieldSuggestions } from '@/hooks/useFieldSuggestions';
import { PROVINCES } from '@hopak/shared';

const MapPicker = dynamic(() => import('@/components/map/MapPicker'), { ssr: false });
const PlacesAutocompleteInput = dynamic(() => import('@/components/map/PlacesAutocompleteInput'), { ssr: false });

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';
const MAHASARAKHAM = { lat: 16.246, lng: 103.252 };
const RESEND_COOLDOWN_MS = 60 * 1000;

type Step = 'loading' | 'account' | 'dorm' | 'otp' | 'password' | 'pending' | 'already-logged-in';

interface ApplicationDto {
  id: string;
  status: 'DRAFT' | 'EMAIL_VERIFIED' | 'COMPLETED';
  name: string | null;
  email: string;
  phone: string | null;
  dormName: string | null;
  address: string | null;
  province: string | null;
  lat: number | null;
  lng: number | null;
  note: string | null;
  images: string[];
  documents: string[];
}

const PROVINCE_LABEL = {
  th: { มหาสารคาม: 'มหาสารคาม', ขอนแก่น: 'ขอนแก่น', เชียงใหม่: 'เชียงใหม่' } as Record<string, string>,
  en: { มหาสารคาม: 'Mahasarakham', ขอนแก่น: 'Khon Kaen', เชียงใหม่: 'Chiang Mai' } as Record<string, string>,
};

const TEXT = {
  th: {
    badge: 'Hopak Seller',
    heroTitle1: 'เปิดหอพักกับ Hopak',
    heroTitle2: 'เริ่มรับจองได้ใน ไม่กี่ขั้นตอน',
    perks: [
      'สมัครฟรี ไม่มีค่าใช้จ่ายล่วงหน้า',
      'หอใหม่ต้องผ่านแอดมินอนุมัติครั้งแรกเท่านั้น หลังจากนั้นแก้ไขข้อมูลได้เองทันที',
      'หักค่าบริการ 10% เฉพาะยอดจองที่สำเร็จผ่านระบบ',
    ],
    footer: '© 2026 Hopak Seller · เปิดหอพักกับเรา',
    haveAccount: 'มีบัญชีเจ้าของหอแล้ว? เข้าสู่ระบบ',
    stepLabel: (n: number) => `ขั้นตอนที่ ${n} จาก 4`,

    // step: account
    accountTitle: 'สมัครเปิดหอพัก',
    accountSubtitle: 'สร้างบัญชีเจ้าของหอ แยกจากบัญชีผู้เช่าทั่วไป',
    namePlaceholder: 'ชื่อ-นามสกุล',
    emailPlaceholder: 'อีเมล',
    phonePlaceholder: 'เบอร์โทร',
    accountError: 'ส่งข้อมูลไม่สำเร็จ',
    accountNext: 'ถัดไป',
    haveAccount2: 'มีบัญชีเจ้าของหออยู่แล้ว?',
    login: 'เข้าสู่ระบบ',
    tenantLink: 'สมัครเป็นผู้เช่าแทน',

    // step: dorm
    dormTitle: 'ข้อมูลหอพัก',
    dormSubtitle: 'กรอกรายละเอียดหอพักของคุณ',
    dormNamePlaceholder: 'ชื่อหอพัก',
    addressPlaceholder: 'ที่อยู่ (บ้านเลขที่ ถนน ตำบล อำเภอ)',
    provinceLabel: 'จังหวัด',
    searchLocationPlaceholder: 'ค้นหาตำแหน่งหอพัก เช่น ชื่อถนนหรือสถานที่ใกล้เคียง',
    pinInstruction: 'เลือกจากผลค้นหา หรือปักหมุดหอพักเอง (คลิกหรือลากหมุด)',
    coords: 'พิกัด',
    notePlaceholder: 'หมายเหตุ / รายละเอียดเพิ่มเติมของหอพัก',
    photosLabel: 'รูปภาพหอพัก (รูปแรกจะเป็นหน้าปก)',
    choosePhotos: 'เลือกรูปภาพ',
    uploadingPhoto: 'กำลังอัปโหลด...',
    coverBadge: 'หน้าปก',
    setCover: 'ตั้งเป็นหน้าปก',
    documentsLabel: 'เอกสารยืนยันหอพัก (เช่น สำเนาโฉนด/ทะเบียนบ้าน สำหรับให้แอดมินตรวจสอบ)',
    documentItem: (n: number) => `เอกสาร ${n}`,
    chooseDocuments: 'เลือกไฟล์เอกสาร',
    uploadingDocument: 'กำลังอัปโหลดเอกสาร...',
    dormError: 'บันทึกข้อมูลหอพักไม่สำเร็จ',
    dormIncompleteHint: 'กรุณากรอกข้อมูลให้ครบ (อัปโหลดรูปและเอกสารอย่างน้อยอย่างละ 1 ไฟล์) ยกเว้นหมายเหตุที่ไม่บังคับ',
    dormNext: 'ถัดไป: ยืนยันอีเมล',

    // step: otp
    otpTitle: 'ยืนยันอีเมล',
    otpSubtitle: (email: string) => `ระบบส่งรหัสยืนยัน 6 หลักไปที่ ${email}`,
    otpPlaceholder: 'รหัส 6 หลัก',
    otpVerify: 'ยืนยันรหัส',
    otpResend: 'ส่งรหัสอีกครั้ง',
    otpResendCooldown: (s: number) => `ส่งรหัสอีกครั้งได้ในอีก ${s} วินาที`,
    otpError: 'ยืนยันรหัสไม่สำเร็จ',
    otpSendError: 'ส่งรหัสไม่สำเร็จ',

    // step: password
    passwordTitle: 'ตั้งรหัสผ่าน',
    passwordSubtitle: 'ขั้นตอนสุดท้าย ตั้งรหัสผ่านสำหรับเข้าสู่ระบบ',
    passwordPlaceholder: 'รหัสผ่าน',
    confirmPasswordPlaceholder: 'ยืนยันรหัสผ่าน',
    passwordMismatch: 'รหัสผ่านไม่ตรงกัน',
    passwordError: 'ตั้งรหัสผ่านไม่สำเร็จ',
    finish: 'เสร็จสิ้น ส่งคำขอ',

    // step: pending
    pendingTitle: 'ส่งคำขอเรียบร้อยแล้ว',
    pendingBody:
      'ทีมงาน Hopak กำลังตรวจสอบคำขอเปิดหอพักของคุณ ใช้เวลาประมาณ 1-3 วัน เมื่อได้รับอนุมัติจะสามารถเข้าใช้งาน Owner Console ได้ทันที',
    backHome: 'กลับหน้าแรก',

    // step: already logged in
    alreadyTitle: 'คุณเข้าสู่ระบบอยู่แล้ว',
    alreadyBody: 'ขอเป็นเจ้าของหอได้จากหน้าโปรไฟล์ของบัญชีที่ใช้งานอยู่',
    goProfile: 'ไปหน้าโปรไฟล์',
  },
  en: {
    badge: 'Hopak Seller',
    heroTitle1: 'List your dorm on Hopak',
    heroTitle2: 'Start accepting bookings in a few steps',
    perks: [
      'Free to sign up, no upfront cost',
      'A new dorm needs admin approval only once — after that you can edit it yourself instantly',
      '10% service fee, only on bookings completed through the platform',
    ],
    footer: '© 2026 Hopak Seller · List your dorm with us',
    haveAccount: 'Already have an owner account? Log in',
    stepLabel: (n: number) => `Step ${n} of 4`,

    accountTitle: 'Sign up as an owner',
    accountSubtitle: 'Create an owner account, separate from a regular tenant account',
    namePlaceholder: 'Full name',
    emailPlaceholder: 'Email',
    phonePlaceholder: 'Phone number',
    accountError: 'Failed to submit',
    accountNext: 'Next',
    haveAccount2: 'Already have an owner account?',
    login: 'Log in',
    tenantLink: 'Sign up as a tenant instead',

    dormTitle: 'Dorm details',
    dormSubtitle: 'Tell us about your dorm',
    dormNamePlaceholder: 'Dorm name',
    addressPlaceholder: 'Address (house no., street, sub-district, district)',
    provinceLabel: 'Province',
    searchLocationPlaceholder: 'Search the dorm location, e.g. street name or nearby landmark',
    pinInstruction: 'Pick a search result, or pin the dorm yourself (click or drag the pin)',
    coords: 'Coordinates',
    notePlaceholder: 'Notes / additional details about the dorm',
    photosLabel: 'Dorm photos (the first one is the cover)',
    choosePhotos: 'Choose photos',
    uploadingPhoto: 'Uploading...',
    coverBadge: 'Cover',
    setCover: 'Set as cover',
    documentsLabel: 'Verification documents (e.g. deed / house registration copy, for admin review)',
    documentItem: (n: number) => `Document ${n}`,
    chooseDocuments: 'Choose document files',
    uploadingDocument: 'Uploading document...',
    dormError: 'Failed to save dorm details',
    dormIncompleteHint: 'Please fill in all fields (upload at least 1 photo and 1 document) — only notes is optional',
    dormNext: 'Next: Verify email',

    otpTitle: 'Verify your email',
    otpSubtitle: (email: string) => `We sent a 6-digit code to ${email}`,
    otpPlaceholder: '6-digit code',
    otpVerify: 'Verify code',
    otpResend: 'Resend code',
    otpResendCooldown: (s: number) => `Resend available in ${s}s`,
    otpError: 'Verification failed',
    otpSendError: 'Failed to send code',

    passwordTitle: 'Set a password',
    passwordSubtitle: 'Last step — set a password to log in',
    passwordPlaceholder: 'Password',
    confirmPasswordPlaceholder: 'Confirm password',
    passwordMismatch: 'Passwords do not match',
    passwordError: 'Failed to set password',
    finish: 'Finish & submit',

    pendingTitle: 'Request submitted',
    pendingBody:
      'The Hopak team is reviewing your dorm-owner request. This usually takes 1-3 days. Once approved, you can start using the Owner Console right away.',
    backHome: 'Back to home',

    alreadyTitle: "You're already logged in",
    alreadyBody: 'Request to become an owner from your profile page instead',
    goProfile: 'Go to profile',
  },
};

const inputClass =
  'rounded-btn border border-card-border px-3.5 py-2.5 text-sm text-ink placeholder:text-ink-faint focus:border-seller focus:outline-none dark:border-white/10 dark:bg-[#1a1a19] dark:text-white';

function BrandPanel({ t }: { t: (typeof TEXT)['th'] }) {
  return (
    <div
      className="hidden w-[38%] shrink-0 flex-col justify-between p-10 text-white lg:flex"
      style={{ background: 'radial-gradient(120% 90% at 50% 15%, #2AB27C 0%, #178F5A 46%, #0F6B44 100%)' }}
    >
      <div>
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/15 font-sans text-xl font-bold">
          H
        </div>
        <p className="mt-2 text-sm font-medium text-white/80">{t.badge}</p>
        <h1 className="mt-6 text-2xl font-semibold leading-snug">
          {t.heroTitle1}
          <br />
          {t.heroTitle2}
        </h1>

        <ul className="mt-8 flex flex-col gap-4">
          {t.perks.map((perk) => (
            <li key={perk} className="flex items-start gap-2 text-sm text-white/90">
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white/20 font-sans text-xs">
                ✓
              </span>
              {perk}
            </li>
          ))}
        </ul>
      </div>

      <div className="font-sans text-xs text-white/70">
        {t.footer}
        <br />
        <a href="/partner-login" className="underline">
          {t.haveAccount}
        </a>
      </div>
    </div>
  );
}

export default function PartnerRegisterPage() {
  const { lang } = useLang();
  const t = TEXT[lang];
  const [step, setStep] = useState<Step>('loading');
  const [error, setError] = useState<string | null>(null);
  const [appId, setAppId] = useState<string | null>(null);

  const nameSuggestions = useFieldSuggestions('owner-name');
  const dormNameSuggestions = useFieldSuggestions('dorm-name');
  const addressSuggestions = useFieldSuggestions('dorm-address');

  // step: account
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');

  // step: dorm
  const [dormName, setDormName] = useState('');
  const [address, setAddress] = useState('');
  const [province, setProvince] = useState<string>(PROVINCES[0]);
  const [lat, setLat] = useState(MAHASARAKHAM.lat);
  const [lng, setLng] = useState(MAHASARAKHAM.lng);
  const [note, setNote] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [documents, setDocuments] = useState<string[]>([]);
  const [documentUploading, setDocumentUploading] = useState(false);

  // step: otp
  const [otpCode, setOtpCode] = useState('');
  const [otpVerifying, setOtpVerifying] = useState(false);
  const [resendAt, setResendAt] = useState(0);
  const [cooldown, setCooldown] = useState(0);

  // step: password
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [finishing, setFinishing] = useState(false);

  // ไม่จำข้อมูลเดิมข้ามเซสชัน — ออกจากหน้านี้แล้วกลับมาต้องกรอกใหม่ทุกครั้ง
  useEffect(() => {
    setStep(getToken() ? 'already-logged-in' : 'account');
  }, []);

  useEffect(() => {
    if (!resendAt) return;
    const timer = setInterval(() => {
      const left = Math.max(0, Math.ceil((resendAt - Date.now()) / 1000));
      setCooldown(left);
      if (left <= 0) clearInterval(timer);
    }, 500);
    return () => clearInterval(timer);
  }, [resendAt]);

  async function handleAccountSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      const app = await apiClient.post<ApplicationDto>('/owner-applications', {
        name,
        email,
        phone: phone || undefined,
      });
      setAppId(app.id);
      setStep('dorm');
    } catch (err) {
      setError(err instanceof Error ? err.message : t.accountError);
    }
  }

  async function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || !files.length || !appId) return;
    setPhotoUploading(true);
    setError(null);
    try {
      for (const file of Array.from(files)) {
        const formData = new FormData();
        formData.append('file', file);
        const res = await fetch(`${API_URL}/owner-applications/${appId}/photos`, {
          method: 'POST',
          body: formData,
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.message ?? t.dormError);
        }
        const app: ApplicationDto = await res.json();
        setImages(app.images);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t.dormError);
    } finally {
      setPhotoUploading(false);
      e.target.value = '';
    }
  }

  function handlePlaceSelect(la: number, ln: number, formattedAddress: string, placeName: string) {
    setLat(la);
    setLng(ln);
    if (!address.trim() && formattedAddress) setAddress(formattedAddress);
    if (!dormName.trim() && placeName) setDormName(placeName);
  }

  async function setCoverPhoto(url: string) {
    if (!appId) return;
    try {
      const app = await apiClient.patch<ApplicationDto>(`/owner-applications/${appId}/photos/cover`, { url });
      setImages(app.images);
    } catch (err) {
      setError(err instanceof Error ? err.message : t.dormError);
    }
  }

  async function handleDocumentChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || !files.length || !appId) return;
    setDocumentUploading(true);
    setError(null);
    try {
      for (const file of Array.from(files)) {
        const formData = new FormData();
        formData.append('file', file);
        const res = await fetch(`${API_URL}/owner-applications/${appId}/documents`, {
          method: 'POST',
          body: formData,
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.message ?? t.dormError);
        }
        const app: ApplicationDto = await res.json();
        setDocuments(app.documents);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t.dormError);
    } finally {
      setDocumentUploading(false);
      e.target.value = '';
    }
  }

  async function sendOtp() {
    if (!appId) return;
    setError(null);
    try {
      await apiClient.post(`/owner-applications/${appId}/send-otp`);
      setResendAt(Date.now() + RESEND_COOLDOWN_MS);
    } catch (err) {
      setError(err instanceof Error ? err.message : t.otpSendError);
    }
  }

  async function handleDormSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!appId) return;
    if (images.length === 0 || documents.length === 0) {
      setError(t.dormIncompleteHint);
      return;
    }
    setError(null);
    try {
      await apiClient.patch(`/owner-applications/${appId}/dorm`, {
        dormName,
        address: address || undefined,
        province,
        lat,
        lng,
        note: note || undefined,
      });
      setStep('otp');
      await sendOtp();
    } catch (err) {
      setError(err instanceof Error ? err.message : t.dormError);
    }
  }

  async function handleVerifyOtp(e: React.FormEvent) {
    e.preventDefault();
    if (!appId) return;
    setError(null);
    setOtpVerifying(true);
    try {
      await apiClient.post(`/owner-applications/${appId}/verify-otp`, { code: otpCode });
      setStep('password');
    } catch (err) {
      setError(err instanceof Error ? err.message : t.otpError);
    } finally {
      setOtpVerifying(false);
    }
  }

  async function handleFinish(e: React.FormEvent) {
    e.preventDefault();
    if (!appId) return;
    setError(null);
    if (password !== confirmPassword) {
      setError(t.passwordMismatch);
      return;
    }
    setFinishing(true);
    try {
      const { accessToken } = await apiClient.post<{ accessToken: string }>(
        `/owner-applications/${appId}/finish`,
        { password },
      );
      setToken(accessToken);
      setStep('pending');
    } catch (err) {
      setError(err instanceof Error ? err.message : t.passwordError);
    } finally {
      setFinishing(false);
    }
  }

  const stepNumber = { account: 1, dorm: 2, otp: 3, password: 4 }[step as 'account' | 'dorm' | 'otp' | 'password'];

  return (
    <main className="flex min-h-[calc(100vh-65px)] bg-surface-web">
      <BrandPanel t={t} />

      <div className="flex flex-1 items-center justify-center p-6">
        <div className="w-full max-w-md">
          {stepNumber && <p className="mb-2 text-xs font-medium text-seller">{t.stepLabel(stepNumber)}</p>}

          {step === 'loading' && (
            <div className="flex justify-center py-10">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-seller border-t-transparent" />
            </div>
          )}

          {step === 'account' && (
            <div>
              <h2 className="text-xl font-semibold text-ink-strong dark:text-white">{t.accountTitle}</h2>
              <p className="mt-1 text-sm text-ink-subtitle">{t.accountSubtitle}</p>

              <form onSubmit={handleAccountSubmit} className="mt-6 flex flex-col gap-3">
                <input
                  type="text"
                  placeholder={t.namePlaceholder}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onBlur={(e) => nameSuggestions.remember(e.target.value)}
                  list="suggest-owner-name"
                  className={inputClass}
                  required
                />
                <datalist id="suggest-owner-name">
                  {nameSuggestions.items.map((v) => (
                    <option key={v} value={v} />
                  ))}
                </datalist>
                <div className="flex gap-3">
                  <input
                    type="email"
                    placeholder={t.emailPlaceholder}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={`${inputClass} flex-1 font-sans`}
                    required
                  />
                  <input
                    type="tel"
                    placeholder={t.phonePlaceholder}
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className={`${inputClass} flex-1 font-sans`}
                  />
                </div>
                {error && <p className="text-sm text-danger">{error}</p>}
                <button
                  type="submit"
                  className="mt-1 rounded-btn bg-seller py-2.5 text-sm font-medium text-white shadow-sm hover:bg-seller-dark"
                >
                  {t.accountNext}
                </button>
              </form>

              <p className="mt-5 text-center text-sm text-ink-subtitle lg:hidden">
                {t.haveAccount2}{' '}
                <a href="/partner-login" className="font-medium text-seller">
                  {t.login}
                </a>
              </p>
              <p className="mt-2 text-center text-xs text-ink-faint">
                <a href="/register" className="underline">
                  {t.tenantLink}
                </a>
              </p>
            </div>
          )}

          {step === 'dorm' && (
            <div>
              <h2 className="text-xl font-semibold text-ink-strong dark:text-white">{t.dormTitle}</h2>
              <p className="mt-1 text-sm text-ink-subtitle">{t.dormSubtitle}</p>

              <form onSubmit={handleDormSubmit} className="mt-6 flex flex-col gap-3">
                <input
                  placeholder={t.dormNamePlaceholder}
                  value={dormName}
                  onChange={(e) => setDormName(e.target.value)}
                  onBlur={(e) => dormNameSuggestions.remember(e.target.value)}
                  list="suggest-dorm-name"
                  className={inputClass}
                  required
                />
                <datalist id="suggest-dorm-name">
                  {dormNameSuggestions.items.map((v) => (
                    <option key={v} value={v} />
                  ))}
                </datalist>

                <input
                  placeholder={t.addressPlaceholder}
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  onBlur={(e) => addressSuggestions.remember(e.target.value)}
                  list="suggest-dorm-address"
                  className={inputClass}
                  required
                />
                <datalist id="suggest-dorm-address">
                  {addressSuggestions.items.map((v) => (
                    <option key={v} value={v} />
                  ))}
                </datalist>

                <div>
                  <label className="mb-1.5 block text-xs font-medium text-ink-subtitle">{t.provinceLabel}</label>
                  <select value={province} onChange={(e) => setProvince(e.target.value)} className={`${inputClass} w-full`}>
                    {PROVINCES.map((p) => (
                      <option key={p} value={p}>
                        {PROVINCE_LABEL[lang][p] ?? p}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <p className="mb-1.5 text-sm text-ink-faint">{t.pinInstruction}</p>
                  <PlacesAutocompleteInput
                    placeholder={t.searchLocationPlaceholder}
                    onSelect={handlePlaceSelect}
                    className={`${inputClass} mb-2 w-full`}
                  />
                  <MapPicker
                    lat={lat}
                    lng={lng}
                    onChange={(la, ln) => {
                      setLat(la);
                      setLng(ln);
                    }}
                  />
                  <p className="mt-1 text-xs tabular-nums text-ink-faint">
                    {t.coords}: {lat.toFixed(5)}, {lng.toFixed(5)}
                  </p>
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-medium text-ink-subtitle">{t.photosLabel}</label>
                  {images.length > 0 && (
                    <div className="mb-2 flex flex-wrap gap-2">
                      {images.map((url, i) => (
                        <div key={url} className="relative">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={url}
                            alt=""
                            className={`h-16 w-16 rounded-lg object-cover ${i === 0 ? 'ring-2 ring-seller' : ''}`}
                          />
                          {i === 0 ? (
                            <span className="absolute -top-1.5 left-0.5 rounded-full bg-seller px-1.5 py-0.5 text-[10px] font-medium text-white">
                              {t.coverBadge}
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setCoverPhoto(url)}
                              title={t.setCover}
                              className="absolute inset-x-0 bottom-0 rounded-b-lg bg-black/60 py-0.5 text-[9px] text-white opacity-0 hover:opacity-100"
                            >
                              {t.setCover}
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                  <input type="file" accept="image/*" multiple onChange={handlePhotoChange} disabled={photoUploading} className="text-sm" />
                  {photoUploading && <p className="mt-1 text-xs text-ink-faint">{t.uploadingPhoto}</p>}
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-medium text-ink-subtitle">{t.documentsLabel}</label>
                  {documents.length > 0 && (
                    <ul className="mb-2 flex flex-col gap-1 text-sm text-seller">
                      {documents.map((url, i) => (
                        <li key={url}>
                          <a href={url} target="_blank" rel="noreferrer" className="underline">
                            {t.documentItem(i + 1)}
                          </a>
                        </li>
                      ))}
                    </ul>
                  )}
                  <input
                    type="file"
                    accept="image/*,application/pdf"
                    multiple
                    onChange={handleDocumentChange}
                    disabled={documentUploading}
                    className="text-sm"
                  />
                  {documentUploading && <p className="mt-1 text-xs text-ink-faint">{t.uploadingDocument}</p>}
                </div>

                <textarea
                  placeholder={t.notePlaceholder}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  rows={3}
                  className={`${inputClass} resize-none`}
                />

                {error && <p className="text-sm text-danger">{error}</p>}
                <button
                  type="submit"
                  disabled={images.length === 0 || documents.length === 0}
                  className="mt-1 rounded-btn bg-seller py-2.5 text-sm font-medium text-white shadow-sm hover:bg-seller-dark disabled:opacity-60"
                >
                  {t.dormNext}
                </button>
                {(images.length === 0 || documents.length === 0) && (
                  <p className="text-center text-xs text-ink-faint">{t.dormIncompleteHint}</p>
                )}
              </form>
            </div>
          )}

          {step === 'otp' && (
            <div>
              <h2 className="text-xl font-semibold text-ink-strong dark:text-white">{t.otpTitle}</h2>
              <p className="mt-1 text-sm text-ink-subtitle">{t.otpSubtitle(email)}</p>

              <form onSubmit={handleVerifyOtp} className="mt-6 flex flex-col gap-3">
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder={t.otpPlaceholder}
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  className={`${inputClass} text-center text-lg tracking-[0.3em]`}
                  required
                  maxLength={6}
                />
                {error && <p className="text-sm text-danger">{error}</p>}
                <button
                  type="submit"
                  disabled={otpVerifying || otpCode.length !== 6}
                  className="rounded-btn bg-seller py-2.5 text-sm font-medium text-white shadow-sm hover:bg-seller-dark disabled:opacity-60"
                >
                  {t.otpVerify}
                </button>
                <button
                  type="button"
                  onClick={sendOtp}
                  disabled={cooldown > 0}
                  className="text-sm font-medium text-seller disabled:text-ink-faint"
                >
                  {cooldown > 0 ? t.otpResendCooldown(cooldown) : t.otpResend}
                </button>
              </form>
            </div>
          )}

          {step === 'password' && (
            <div>
              <h2 className="text-xl font-semibold text-ink-strong dark:text-white">{t.passwordTitle}</h2>
              <p className="mt-1 text-sm text-ink-subtitle">{t.passwordSubtitle}</p>

              <form onSubmit={handleFinish} className="mt-6 flex flex-col gap-3">
                <input
                  type="password"
                  placeholder={t.passwordPlaceholder}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={`${inputClass} font-sans`}
                  required
                  minLength={6}
                />
                <input
                  type="password"
                  placeholder={t.confirmPasswordPlaceholder}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className={`${inputClass} font-sans`}
                  required
                  minLength={6}
                />
                {error && <p className="text-sm text-danger">{error}</p>}
                <button
                  type="submit"
                  disabled={finishing}
                  className="rounded-btn bg-seller py-2.5 text-sm font-medium text-white shadow-sm hover:bg-seller-dark disabled:opacity-60"
                >
                  {t.finish}
                </button>
              </form>
            </div>
          )}

          {step === 'pending' && (
            <div className="text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-seller-tint text-2xl text-seller">
                ✓
              </div>
              <h2 className="mt-4 text-xl font-semibold text-ink-strong dark:text-white">{t.pendingTitle}</h2>
              <p className="mt-2 text-sm text-ink-subtitle">{t.pendingBody}</p>
              <a
                href="/"
                className="mt-6 inline-block rounded-btn bg-seller px-5 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-seller-dark"
              >
                {t.backHome}
              </a>
            </div>
          )}

          {step === 'already-logged-in' && (
            <div className="text-center">
              <h2 className="text-xl font-semibold text-ink-strong dark:text-white">{t.alreadyTitle}</h2>
              <p className="mt-2 text-sm text-ink-subtitle">{t.alreadyBody}</p>
              <a
                href="/profile"
                className="mt-6 inline-block rounded-btn bg-seller px-5 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-seller-dark"
              >
                {t.goProfile}
              </a>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
