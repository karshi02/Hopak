'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api-client';
import { setToken } from '@/lib/auth';
import { useLang } from '@/hooks/useLang';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';
const TOTAL_STEPS = 2;

const TEXT = {
  th: {
    heroTitle1: 'สมัครสมาชิกฟรี',
    heroTitle2: 'เริ่มหาหอพักใกล้มหาวิทยาลัยก่อนใคร',
    perks: [
      'ค้นหาและเปรียบเทียบหอพักได้ไม่จำกัด',
      'บันทึกหอที่ถูกใจไว้ดูภายหลังได้',
      'จองและชำระเงินปลอดภัยในระบบ',
    ],
    haveAccount: 'มีบัญชีอยู่แล้ว? เข้าสู่ระบบ',
    step1Title: 'สมัครสมาชิก',
    step1Subtitle: 'สร้างบัญชีเพื่อเริ่มค้นหาและจองหอพัก',
    google: 'สมัครด้วย Google',
    or: 'หรือ',
    namePlaceholder: 'ชื่อ-นามสกุล',
    emailPlaceholder: 'อีเมล',
    phonePlaceholder: 'เบอร์โทร',
    passwordPlaceholder: 'รหัสผ่าน',
    createAccountError: 'สร้างบัญชีไม่สำเร็จ',
    submit: 'สมัครสมาชิก',
    acceptTerms: 'ฉันยอมรับเงื่อนไขการใช้งาน และนโยบายความเป็นส่วนตัว ของ Hoprak',
    haveAccount2: 'มีบัญชีแล้ว?',
    login: 'เข้าสู่ระบบ',
    ownerLink: 'มีหอพักให้เช่า? สมัครเปิดหอพักกับ Hoprak',
    step2Title: 'ตั้งค่าโปรไฟล์',
    step2Subtitle: 'เพิ่มรูปโปรไฟล์ (ข้ามได้)',
    photoLabel: 'รูป',
    avatarPlaceholder: 'ลิงก์รูปโปรไฟล์ (ถ้ามี)',
    addressLabel: 'ที่อยู่',
    addressPlaceholder: 'กรอกที่อยู่ของคุณ',
    useLocation: 'ใช้ตำแหน่งปัจจุบัน',
    locating: 'กำลังค้นหาตำแหน่ง...',
    locationDenied: 'ไม่สามารถเข้าถึงตำแหน่งได้ กรุณากรอกที่อยู่เอง',
    locationUnsupported: 'เบราว์เซอร์นี้ไม่รองรับการค้นหาตำแหน่ง',
    saveProfileError: 'บันทึกโปรไฟล์ไม่สำเร็จ',
    start: 'เริ่มใช้งาน Hoprak',
  },
  en: {
    heroTitle1: 'Sign up for free',
    heroTitle2: 'Start finding dorms near your university first',
    perks: [
      'Search and compare unlimited dorms',
      'Save favorite dorms to view later',
      'Book and pay safely through the platform',
    ],
    haveAccount: 'Already have an account? Log in',
    step1Title: 'Sign up',
    step1Subtitle: 'Create an account to start finding and booking dorms',
    google: 'Sign up with Google',
    or: 'or',
    namePlaceholder: 'Full name',
    emailPlaceholder: 'Email',
    phonePlaceholder: 'Phone number',
    passwordPlaceholder: 'Password',
    createAccountError: 'Failed to create account',
    submit: 'Sign up',
    acceptTerms: "I accept Hoprak's Terms of Use and Privacy Policy",
    haveAccount2: 'Already have an account?',
    login: 'Log in',
    ownerLink: 'Have a dorm to rent? List it with Hoprak',
    step2Title: 'Set up your profile',
    step2Subtitle: 'Add a profile photo (optional)',
    photoLabel: 'Photo',
    avatarPlaceholder: 'Profile photo link (optional)',
    addressLabel: 'Address',
    addressPlaceholder: 'Enter your address',
    useLocation: 'Use current location',
    locating: 'Locating...',
    locationDenied: "Couldn't access your location — please enter your address manually",
    locationUnsupported: "This browser doesn't support location lookup",
    saveProfileError: 'Failed to save profile',
    start: 'Get started with Hoprak',
  },
};

function BrandPanel({ step, t }: { step: number; t: (typeof TEXT)['th'] }) {
  return (
    <div className="relative hidden w-[38%] shrink-0 flex-col justify-between overflow-hidden bg-[linear-gradient(165deg,#1E4FB0_0%,#173A87_55%,#0E1220_130%)] p-10 text-white lg:flex">
      <div className="pointer-events-none absolute -right-10 -top-14 h-[300px] w-[300px] rounded-full bg-[radial-gradient(circle,rgba(47,111,224,0.55),transparent_68%)] blur-xl" />
      <div className="pointer-events-none absolute -bottom-20 -left-10 h-[260px] w-[260px] rounded-full bg-[radial-gradient(circle,rgba(23,143,90,0.35),transparent_66%)] blur-lg" />

      <div className="relative">
        <div className="flex items-center gap-2.5">
          <span className="flex h-[38px] w-[38px] items-center justify-center rounded-[10px] bg-tenant font-sans text-xl font-extrabold leading-none text-white">
            H
          </span>
          <span className="text-lg font-bold tracking-tight text-white">
            Hoprak<span className="text-[#6BA0F5]">.com</span>
          </span>
        </div>

        <h1 className="mt-10 text-[26px] font-bold leading-snug tracking-tight">
          {t.heroTitle1}
          <br />
          {t.heroTitle2}
        </h1>

        <ul className="mt-7 flex flex-col gap-3.5">
          {t.perks.map((perk) => (
            <li key={perk} className="flex items-center gap-3 text-[14.5px] font-medium text-[#E4EBF7]">
              <span className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-[10px] bg-white/12">
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none">
                  <path d="M5 12l5 5 9-11" stroke="#7FE0A8" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
              {perk}
            </li>
          ))}
        </ul>

        <div className="mt-8 flex gap-1.5">
          {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
            <span key={i} className={`h-1.5 w-6 rounded-full ${i + 1 <= step ? 'bg-white' : 'bg-white/25'}`} />
          ))}
        </div>
      </div>

      <div className="relative font-sans text-xs text-[#BFCDE6]">
        © 2026 Hoprak ·{' '}
        <a href="/login" className="underline">
          {t.haveAccount}
        </a>
      </div>
    </div>
  );
}

const inputClass =
  'rounded-btn border border-card-border px-3.5 py-2.5 text-sm text-ink placeholder:text-ink-faint focus:border-tenant focus:outline-none';

export default function RegisterPage() {
  const router = useRouter();
  const { lang } = useLang();
  const t = TEXT[lang];
  const [step, setStep] = useState(1);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [address, setAddress] = useState('');
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const autoSavedRef = useRef(false);

  function handleUseLocation() {
    if (!navigator.geolocation) {
      setLocationError(t.locationUnsupported);
      return;
    }
    setLocating(true);
    setLocationError(null);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${pos.coords.latitude}&lon=${pos.coords.longitude}`,
          );
          const data = await res.json();
          if (data?.display_name) setAddress(data.display_name);
        } catch {
          setLocationError(t.locationDenied);
        } finally {
          setLocating(false);
        }
      },
      () => {
        setLocationError(t.locationDenied);
        setLocating(false);
      },
    );
  }

  // ขอตำแหน่งทันทีที่เข้าหน้าสมัครสมาชิก (ทั้งมือถือและคอมพิวเตอร์) แทนที่จะรอให้กดปุ่มเอง
  useEffect(() => {
    handleUseLocation();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ทันทีที่มีบัญชี (เข้า step 2) และมีที่อยู่จากตำแหน่งแล้ว บันทึกให้อัตโนมัติครั้งเดียว
  // จากนั้นผู้ใช้แก้ไขเองได้อีก โดยจะถูกบันทึกจริงตอนกด "เริ่มใช้งาน Hoprak"
  useEffect(() => {
    if (step === 2 && address && !autoSavedRef.current) {
      autoSavedRef.current = true;
      apiClient.patch('/users/me', { address }).catch(() => {});
    }
  }, [step, address]);

  async function handleCreateAccount(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      const { accessToken } = await apiClient.post<{ accessToken: string }>('/auth/register', {
        name,
        email,
        phone: phone || undefined,
        password,
      });
      setToken(accessToken);
      setStep(2);
    } catch (err) {
      setError(err instanceof Error ? err.message : t.createAccountError);
    }
  }

  async function handleFinishProfile(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      if (avatarUrl || address) {
        await apiClient.patch('/users/me', {
          ...(avatarUrl ? { avatarUrl } : {}),
          ...(address ? { address } : {}),
        });
      }
      router.push('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : t.saveProfileError);
    }
  }

  return (
    <main className="flex min-h-[calc(100vh-65px)] bg-surface-web">
      <BrandPanel step={step} t={t} />

      <div className="flex flex-1 items-center justify-center p-6">
        <div className="w-full max-w-sm">
          {step === 1 && (
            <div>
              <h2 className="text-xl font-semibold text-ink-strong">{t.step1Title}</h2>
              <p className="mt-1 text-sm text-ink-subtitle">{t.step1Subtitle}</p>

              <a
                href={`${API_URL}/auth/google`}
                className="mt-6 flex items-center justify-center gap-2 rounded-btn border border-card-border py-2.5 text-sm font-medium text-ink hover:bg-black/[0.02]"
              >
                <svg width="18" height="18" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.5 12.2c0-.7-.1-1.4-.2-2H12v3.8h5.9a5 5 0 01-2.2 3.3v2.7h3.5c2-1.9 3.3-4.7 3.3-7.8z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c3 0 5.5-1 7.3-2.7l-3.5-2.7c-1 .7-2.3 1.1-3.8 1.1-2.9 0-5.4-2-6.3-4.6H2v2.8A11 11 0 0012 23z"
                  />
                  <path fill="#FBBC05" d="M5.7 14.1a6.6 6.6 0 010-4.2V7.1H2a11 11 0 000 9.8l3.7-2.8z" />
                  <path
                    fill="#EA4335"
                    d="M12 5.4c1.6 0 3 .6 4.1 1.6l3.1-3.1A11 11 0 002 7.1l3.7 2.8C6.6 7.3 9.1 5.4 12 5.4z"
                  />
                </svg>
                {t.google}
              </a>

              <div className="my-5 flex items-center gap-3 text-xs text-ink-faint">
                <span className="h-px flex-1 bg-card-border" />
                {t.or}
                <span className="h-px flex-1 bg-card-border" />
              </div>

              <form onSubmit={handleCreateAccount} className="flex flex-col gap-3">
                <div className="flex h-[50px] items-center gap-2.5 rounded-xl border-[1.5px] border-card-border bg-white px-3.5">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="shrink-0">
                    <circle cx="12" cy="8" r="4" stroke="#9AA0AB" strokeWidth="1.8" />
                    <path d="M4 21v-1a6 6 0 016-6h4a6 6 0 016 6v1" stroke="#9AA0AB" strokeWidth="1.8" strokeLinecap="round" />
                  </svg>
                  <input
                    type="text"
                    placeholder={t.namePlaceholder}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-transparent text-[15px] text-ink outline-none placeholder:text-ink-faint"
                    required
                  />
                </div>

                <div className="flex h-[50px] items-center gap-2.5 rounded-xl border-[1.5px] border-tenant bg-white px-3.5 shadow-[0_0_0_3px_rgba(47,111,224,0.12)]">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="shrink-0">
                    <rect x="3" y="5" width="18" height="14" rx="2" stroke="#2F6FE0" strokeWidth="1.8" />
                    <path d="M4 7l8 6 8-6" stroke="#2F6FE0" strokeWidth="1.8" />
                  </svg>
                  <input
                    type="email"
                    placeholder={t.emailPlaceholder}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-transparent font-sans text-[15px] text-ink outline-none placeholder:font-sans placeholder:text-ink-faint"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="flex h-[50px] items-center gap-2.5 rounded-xl border-[1.5px] border-card-border bg-white px-3.5">
                    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" className="shrink-0">
                      <path
                        d="M5 4h4l2 5-3 2a12 12 0 005 5l2-3 5 2v4a2 2 0 01-2 2A16 16 0 013 6a2 2 0 012-2z"
                        stroke="#9AA0AB"
                        strokeWidth="1.8"
                        strokeLinejoin="round"
                      />
                    </svg>
                    <input
                      type="tel"
                      placeholder={t.phonePlaceholder}
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full min-w-0 bg-transparent font-sans text-[15px] text-ink outline-none placeholder:font-sans placeholder:text-ink-faint"
                    />
                  </div>
                  <div className="flex h-[50px] items-center gap-2.5 rounded-xl border-[1.5px] border-card-border bg-white px-3.5">
                    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" className="shrink-0">
                      <rect x="4" y="10" width="16" height="10" rx="2" stroke="#9AA0AB" strokeWidth="1.8" />
                      <path d="M8 10V7a4 4 0 018 0v3" stroke="#9AA0AB" strokeWidth="1.8" />
                    </svg>
                    <input
                      type="password"
                      placeholder={t.passwordPlaceholder}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full min-w-0 bg-transparent font-sans text-[15px] text-ink outline-none placeholder:font-sans placeholder:text-ink-faint"
                      required
                      minLength={6}
                    />
                  </div>
                </div>

                <label className="mt-1 flex cursor-pointer items-start gap-2.5">
                  <input
                    type="checkbox"
                    checked={acceptedTerms}
                    onChange={(e) => setAcceptedTerms(e.target.checked)}
                    className="mt-0.5 h-[18px] w-[18px] shrink-0 rounded accent-tenant"
                    required
                  />
                  <span className="text-[13px] leading-relaxed text-ink-subtitle">{t.acceptTerms}</span>
                </label>

                {error && <p className="text-sm text-danger">{error}</p>}
                <button
                  type="submit"
                  disabled={!acceptedTerms}
                  className="mt-1 rounded-xl bg-tenant py-3 text-[15px] font-bold text-white shadow-[0_10px_22px_rgba(47,111,224,0.35)] hover:bg-tenant-dark disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {t.submit}
                </button>
              </form>

              <p className="mt-5 text-center text-sm text-ink-subtitle lg:hidden">
                {t.haveAccount2}{' '}
                <a href="/login" className="font-medium text-tenant">
                  {t.login}
                </a>
              </p>
              <p className="mt-2 text-center text-xs text-ink-faint">
                <a href="/partner-register" className="underline">
                  {t.ownerLink}
                </a>
              </p>
            </div>
          )}

          {step === 2 && (
            <div>
              <h2 className="text-xl font-semibold text-ink-strong">{t.step2Title}</h2>
              <p className="mt-1 text-sm text-ink-subtitle">{t.step2Subtitle}</p>
              <form onSubmit={handleFinishProfile} className="mt-6 flex flex-col gap-3">
                <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-surface-canvas text-xs text-ink-faint">
                  {t.photoLabel}
                </div>
                <input
                  type="url"
                  placeholder={t.avatarPlaceholder}
                  value={avatarUrl}
                  onChange={(e) => setAvatarUrl(e.target.value)}
                  className={`${inputClass} font-sans`}
                />

                <label className="text-sm font-medium text-ink-strong">{t.addressLabel}</label>
                <textarea
                  placeholder={t.addressPlaceholder}
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  rows={2}
                  className={`${inputClass} resize-none`}
                />
                <button
                  type="button"
                  onClick={handleUseLocation}
                  disabled={locating}
                  className="flex items-center justify-center gap-1.5 rounded-btn border border-card-border py-2 text-sm font-medium text-ink hover:bg-black/[0.02] disabled:opacity-50"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 21s-7-6.5-7-11a7 7 0 0114 0c0 4.5-7 11-7 11z" />
                    <circle cx="12" cy="10" r="2.5" />
                  </svg>
                  {locating ? t.locating : t.useLocation}
                </button>
                {locationError && <p className="text-sm text-danger">{locationError}</p>}

                {error && <p className="text-sm text-danger">{error}</p>}
                <button
                  type="submit"
                  className="rounded-btn bg-tenant py-2.5 text-sm font-medium text-white shadow-sm hover:bg-tenant-dark"
                >
                  {t.start}
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
