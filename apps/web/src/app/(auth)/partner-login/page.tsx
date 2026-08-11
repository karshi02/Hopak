'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { apiClient } from '@/lib/api-client';
import { setToken, rememberLogin, getRememberedLogin, forgetLogin } from '@/lib/auth';
import { useLang } from '@/hooks/useLang';
import { HopakIcon } from '@/components/HopakIcon';
import { LangToggle } from '@/components/LangToggle';
import type { User } from '@hopak/shared';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

// โทนเจ้าของหอ = เขียว (แยกจากฝั่งผู้เช่าที่เป็นน้ำเงิน #2F6FE0)
const SELLER = '#12A150';
const SELLER_DARK = '#0C7A3C';
const TENANT_BLUE = '#2F6FE0';

const TEXT = {
  th: {
    badge: 'สำหรับเจ้าของหอพัก',
    brandTitle1: 'จัดการหอพักของคุณ',
    brandTitle2: 'ได้ทั้งหมดในที่เดียว',
    brandSub: 'รับคำขอจอง ดูรายได้ และจัดการห้องพักผ่านคอนโซลเจ้าของหอ Hoprak',
    perks: [
      'รับคำขอจองแบบเรียลไทม์ ระบบยืนยันให้อัตโนมัติ',
      'แดชบอร์ดรายได้ ยอดจอง และห้องว่าง ครบในหน้าเดียว',
      'จัดการห้องพัก ราคา และสิ่งอำนวยความสะดวกได้เอง',
    ],
    footer: '© 2026 Hoprak Seller · คอนโซลสำหรับเจ้าของหอพัก',
    noAccount: 'ยังไม่มีหอพักกับ Hoprak?',
    signUp: 'สมัครเปิดหอพัก',
    title: 'เข้าสู่ระบบเจ้าของหอ',
    subtitle: 'เข้าใช้งานคอนโซลจัดการหอพักของคุณ',
    google: 'เข้าสู่ระบบด้วย Google',
    or: 'หรือ',
    emailLabel: 'อีเมล หรือ เบอร์โทร',
    emailPh: 'you@gmail.com',
    passwordLabel: 'รหัสผ่าน',
    passwordPh: 'รหัสผ่านของคุณ',
    forgotPassword: 'ลืมรหัสผ่าน?',
    remember: 'จดจำการเข้าสู่ระบบ',
    lastUsed: 'ใช้ล่าสุด',
    fillRequired: 'กรุณากรอกอีเมลและรหัสผ่าน',
    genericError: 'เข้าสู่ระบบไม่สำเร็จ',
    notOwnerError: 'บัญชีนี้ยังไม่ได้เป็นเจ้าของหอ กรุณาสมัครเปิดหอพักก่อน',
    googleFailed: 'เข้าสู่ระบบด้วย Google ไม่สำเร็จ กรุณาลองใหม่',
    accountSuspended: 'บัญชีนี้ถูกระงับการใช้งาน',
    submitting: 'กำลังเข้าสู่ระบบ...',
    submit: 'เข้าสู่ระบบ',
    tenantTitle: 'หาหอพักอยู่ใช่ไหม?',
    tenantSub: 'เข้าสู่ระบบผู้เช่า',
    showPass: 'แสดงรหัสผ่าน',
  },
  en: {
    badge: 'For dorm owners',
    brandTitle1: 'Run your dorms',
    brandTitle2: 'all from one console',
    brandSub: 'Take bookings, track revenue, and manage rooms in the Hoprak owner console',
    perks: [
      'Booking requests in real time, confirmed automatically',
      'Revenue, bookings and vacancy in a single dashboard',
      'Manage rooms, pricing and amenities yourself',
    ],
    footer: '© 2026 Hoprak Seller · Console for dorm owners',
    noAccount: "Don't have a dorm on Hoprak yet?",
    signUp: 'List your dorm',
    title: 'Owner log in',
    subtitle: 'Access your dorm management console',
    google: 'Log in with Google',
    or: 'or',
    emailLabel: 'Email or phone',
    emailPh: 'you@gmail.com',
    passwordLabel: 'Password',
    passwordPh: 'Your password',
    forgotPassword: 'Forgot password?',
    remember: 'Remember me',
    lastUsed: 'Last used',
    fillRequired: 'Please enter your email and password',
    genericError: 'Log in failed',
    notOwnerError: 'This account is not a dorm owner yet — please apply first',
    googleFailed: 'Google log in failed — please try again',
    accountSuspended: 'This account has been suspended',
    submitting: 'Logging in...',
    submit: 'Log in',
    tenantTitle: 'Looking for a dorm?',
    tenantSub: 'Tenant log in',
    showPass: 'Show password',
  },
};

const inputBase =
  'h-[54px] w-full rounded-[13px] border-[1.5px] border-[#E7ECEA] px-4 text-[15px] text-[#12151C] outline-none transition focus:border-[#12A150] focus:bg-white focus:ring-[3px] focus:ring-[#12A150]/10 placeholder:text-[#9AA5A0]';

function GoogleIcon({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24">
      <path fill="#4285F4" d="M22.5 12.2c0-.7-.1-1.4-.2-2H12v3.9h5.9a5 5 0 01-2.2 3.3v2.7h3.5c2-1.9 3.3-4.7 3.3-7.9z" />
      <path fill="#34A853" d="M12 23c3 0 5.5-1 7.3-2.7l-3.5-2.7c-1 .7-2.3 1-3.8 1-2.9 0-5.4-2-6.3-4.6H2v2.8A11 11 0 0012 23z" />
      <path fill="#FBBC05" d="M5.7 14c-.2-.7-.4-1.4-.4-2.1s.2-1.4.4-2.1V7H2a11 11 0 000 9.9L5.7 14z" />
      <path fill="#EA4335" d="M12 5.4c1.6 0 3 .5 4.2 1.6l3.1-3.1A11 11 0 002 7l3.7 2.8C6.6 7.3 9.1 5.4 12 5.4z" />
    </svg>
  );
}

function PerkIcon({ index }: { index: number }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      {index === 0 && (
        <>
          <path d="M12 3a9 9 0 100 18 9 9 0 000-18z" stroke="#fff" strokeWidth="1.7" />
          <path d="M12 7v5l3.5 2" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" />
        </>
      )}
      {index === 1 && (
        <>
          <path d="M4 20h16" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" />
          <path d="M7 20V11M12 20V6M17 20v-6" stroke="#fff" strokeWidth="1.9" strokeLinecap="round" />
        </>
      )}
      {index === 2 && (
        <>
          <path d="M4 20V9l8-5 8 5v11" stroke="#fff" strokeWidth="1.8" strokeLinejoin="round" />
          <path d="M9 20v-6h6v6" stroke="#fff" strokeWidth="1.8" />
        </>
      )}
    </svg>
  );
}

export default function PartnerLoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { lang } = useLang();
  const t = TEXT[lang];
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [remembered, setRemembered] = useState<string | null>(null);

  useEffect(() => {
    // แปลง "โค้ด" จาก query เป็นข้อความเท่านั้น — ไม่เอาค่าดิบจาก URL มาแสดงตรงๆ
    const ERRORS: Record<string, string> = {
      not_owner: t.notOwnerError,
      google_login_failed: t.googleFailed,
      account_suspended: t.accountSuspended,
    };
    const queryError = searchParams.get('error');
    if (queryError) setError(ERRORS[queryError] ?? t.genericError);

    // จำอีเมลที่ล็อกอินล่าสุด (ไม่เก็บรหัสผ่าน)
    const last = getRememberedLogin();
    if (last) {
      setRemembered(last);
      setEmail(last);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!email || !password) {
      setError(t.fillRequired);
      return;
    }
    setLoading(true);
    try {
      const { accessToken } = await apiClient.post<{ accessToken: string }>('/auth/login', { email, password });
      setToken(accessToken);
      if (remember) rememberLogin(email);
      else forgetLogin();

      const user = await apiClient.get<User>('/users/me');
      const role = user.role.toLowerCase();
      if (role === 'owner') router.push('/partner/dashboard');
      else if (role === 'admin') router.push('/admin/dashboard');
      else {
        setError(t.notOwnerError);
        setLoading(false);
        return;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t.genericError);
    } finally {
      setLoading(false);
    }
  }

  const form = (
    <form onSubmit={handleSubmit} className="w-full">
      <a
        href={`${API_URL}/auth/google`}
        onClick={() => sessionStorage.setItem('googleIntent', 'owner')}
        className="flex h-[56px] items-center justify-center gap-3 rounded-[14px] border border-[#E4E7EC] bg-white text-[16px] font-bold text-[#12151C] hover:bg-[#F7FBF8]"
      >
        <GoogleIcon />
        {t.google}
      </a>

      <div className="my-6 flex items-center gap-3.5">
        <span className="h-px flex-1 bg-[#EEF1F0]" />
        <span className="text-[13px] text-[#9AA5A0]">{t.or}</span>
        <span className="h-px flex-1 bg-[#EEF1F0]" />
      </div>

      <div className="flex flex-col gap-4">
        <div>
          <label className="mb-2 block text-[13.5px] font-medium text-[#5B655F]">{t.emailLabel}</label>
          <input
            type="text"
            autoComplete="username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={t.emailPh}
            className={`${inputBase} bg-[#F6F8FB]`}
          />
          {remembered && email !== remembered && (
            <button
              type="button"
              onClick={() => setEmail(remembered)}
              className="mt-1.5 text-[12.5px] font-semibold"
              style={{ color: SELLER }}
            >
              {t.lastUsed}: {remembered}
            </button>
          )}
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <label className="text-[13.5px] font-medium text-[#5B655F]">{t.passwordLabel}</label>
            <Link href="/forgot-password" className="text-[13px] font-semibold underline" style={{ color: SELLER }}>
              {t.forgotPassword}
            </Link>
          </div>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t.passwordPh}
              className={`${inputBase} bg-white pr-12`}
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={t.showPass}
              className="absolute right-3 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-[#7A808B] hover:bg-[#F2F4F8]"
            >
              {showPassword ? (
                <svg width="19" height="19" viewBox="0 0 24 24" fill="none">
                  <path d="M3 3l18 18M10.6 10.6a2 2 0 002.8 2.8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                  <path d="M6.5 6.6C4.4 8 2.8 10 2 12c1.7 4 5.5 7 10 7 1.8 0 3.5-.5 5-1.3M17.8 16A11.7 11.7 0 0022 12c-1.7-4-5.5-7-10-7-.9 0-1.8.1-2.6.4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                </svg>
              ) : (
                <svg width="19" height="19" viewBox="0 0 24 24" fill="none">
                  <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" stroke="currentColor" strokeWidth="1.8" />
                  <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.8" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* remember me */}
      <button
        type="button"
        onClick={() => setRemember((v) => !v)}
        className="mt-5 flex items-center gap-2.5 text-[14px] text-[#3A3F49]"
      >
        <span
          className="flex h-5 w-5 items-center justify-center rounded-md border-2 transition"
          style={remember ? { background: SELLER, borderColor: SELLER } : { background: '#fff', borderColor: '#D4D9E2' }}
        >
          {remember && (
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
              <path d="M5 12l4 4 10-11" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </span>
        {t.remember}
      </button>

      {error && <p className="mt-4 text-sm text-danger">{error}</p>}

      <button
        type="submit"
        disabled={loading}
        className="mt-6 flex h-[56px] w-full items-center justify-center gap-2 rounded-[14px] text-[17px] font-bold text-white shadow-[0_12px_26px_rgba(18,161,80,0.3)] disabled:opacity-60"
        style={{ background: loading ? SELLER_DARK : SELLER }}
      >
        {loading ? t.submitting : t.submit}
        {!loading && (
          <svg width="19" height="19" viewBox="0 0 24 24" fill="none">
            <path d="M5 12h14M13 6l6 6-6 6" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </button>

      {/* cross-link ฝั่งผู้เช่า (โทนน้ำเงิน) */}
      <Link
        href="/login"
        className="mt-5 flex items-center gap-3.5 rounded-[14px] border border-[#E4E7EC] p-4 transition hover:border-[#2F6FE0] hover:bg-[#F6F9FF]"
      >
        <span className="flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-[12px] bg-[#EAF1FE]">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="8" r="3.4" stroke={TENANT_BLUE} strokeWidth="1.8" />
            <path d="M4.5 20c0-3.6 3.4-5.6 7.5-5.6s7.5 2 7.5 5.6" stroke={TENANT_BLUE} strokeWidth="1.8" strokeLinecap="round" />
          </svg>
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[14.5px] font-bold text-[#12151C]">{t.tenantTitle}</span>
          <span className="block text-[13px] text-[#7A808B]">{t.tenantSub}</span>
        </span>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
          <path d="M9 6l6 6-6 6" stroke={TENANT_BLUE} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </Link>
    </form>
  );

  return (
    <main className="flex min-h-screen flex-col lg:flex-row">
      {/* LEFT · brand panel (เดสก์ท็อป) */}
      <div className="relative hidden w-[40%] max-w-[600px] flex-col overflow-hidden bg-[linear-gradient(160deg,#0B3A22,#0C7A3C_60%,#12A150)] px-[54px] py-14 text-white lg:flex">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_86%_10%,rgba(140,255,200,0.18),transparent_46%),radial-gradient(circle_at_0%_100%,rgba(255,255,255,0.12),transparent_44%)]" />

        <div className="relative flex items-center justify-between gap-3">
          {/* กดโลโก้ = กลับหน้าแรก */}
          <Link href="/" aria-label="Hoprak" className="flex items-center gap-3.5 transition hover:opacity-80">
            <HopakIcon size={44} tone="seller" className="rounded-[11px] ring-1 ring-white/25" />
            <span className="text-[22px] font-bold">Hoprak</span>
          </Link>
          <div className="flex items-center gap-2.5">
            <span className="whitespace-nowrap rounded-full bg-white/[0.16] px-3.5 py-1.5 text-[12.5px] font-semibold">
              {t.badge}
            </span>
            <LangToggle onDark accent={SELLER_DARK} />
          </div>
        </div>

        <div className="relative mt-auto">
          <h1 className="text-[42px] font-extrabold leading-[1.18] tracking-tight">
            {t.brandTitle1}
            <br />
            {t.brandTitle2}
          </h1>
          <p className="mt-4 max-w-[440px] text-[17px] leading-relaxed text-[#CDEBDA]">{t.brandSub}</p>

          <div className="mt-9 flex flex-col gap-4">
            {t.perks.map((p, i) => (
              <div key={p} className="flex items-center gap-3.5">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/[0.14]">
                  <PerkIcon index={i} />
                </span>
                <span className="text-base text-[#E4F5EB]">{p}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="relative mt-11 border-t border-white/[0.16] pt-6 text-[13px] text-[#BFE3CE]">{t.footer}</div>
      </div>

      {/* MOBILE · hero header */}
      <div className="relative overflow-hidden bg-[linear-gradient(160deg,#0B3A22,#0C7A3C_70%,#12A150)] px-[22px] pb-[34px] pt-[22px] text-white lg:hidden">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_86%_10%,rgba(140,255,200,0.2),transparent_50%)]" />
        <div className="relative flex items-center justify-between gap-3">
          <Link href="/" aria-label="Hoprak" className="flex items-center gap-2.5 transition hover:opacity-80">
            <HopakIcon size={34} tone="seller" className="rounded-[9px] ring-1 ring-white/25" />
            <span className="text-[17px] font-bold">Hoprak</span>
          </Link>
          <LangToggle onDark accent={SELLER_DARK} />
        </div>
        <span className="relative mt-4 inline-block whitespace-nowrap rounded-full bg-white/[0.16] px-3 py-1 text-[12px] font-semibold">
          {t.badge}
        </span>
        <h1 className="relative mt-3 text-[28px] font-extrabold leading-[1.2] tracking-tight">
          {t.brandTitle1}
          <br />
          {t.brandTitle2}
        </h1>
        <p className="relative mt-2 text-[14.5px] leading-relaxed text-[#CDEBDA]">{t.brandSub}</p>
      </div>

      {/* RIGHT · form */}
      <div className="flex flex-1 items-center justify-center bg-white px-[22px] py-8 sm:px-14 sm:py-14">
        <div className="w-full max-w-[460px]">
          <div className="mb-7 hidden items-center justify-end gap-2.5 lg:flex">
            <span className="text-sm text-[#7A808B]">{t.noAccount}</span>
            <Link
              href="/partner-register"
              className="inline-flex h-[38px] items-center gap-1.5 rounded-[10px] px-4 text-sm font-bold text-white shadow-[0_6px_14px_rgba(18,161,80,0.28)]"
              style={{ background: SELLER }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                <path d="M12 5v14M5 12h14" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" />
              </svg>
              {t.signUp}
            </Link>
          </div>

          <h2 className="text-[30px] font-extrabold tracking-tight text-[#12151C] lg:text-[34px]">{t.title}</h2>
          <p className="mt-2 text-[15.5px] text-[#7A808B]">{t.subtitle}</p>

          <div className="mt-6">{form}</div>

          <p className="mt-6 text-center text-sm text-[#7A808B] lg:hidden">
            {t.noAccount}{' '}
            <Link href="/partner-register" className="font-bold underline" style={{ color: SELLER }}>
              {t.signUp}
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
