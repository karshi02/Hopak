'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { apiClient } from '@/lib/api-client';
import { setToken, rememberLogin, getRememberedLogin, forgetLogin } from '@/lib/auth';
import { useLang } from '@/hooks/useLang';
import { HopakIcon } from '@/components/HopakIcon';
import { LangToggle } from '@/components/LangToggle';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

const TEXT = {
  th: {
    brandTitle1: 'ยินดีต้อนรับ',
    brandTitle2: 'กลับมาอีกครั้ง',
    brandSub: 'เข้าสู่บัญชี Hoprak เพื่อดูการจอง ใบเสร็จ และหอที่บันทึกไว้ทั้งหมด',
    perks: ['ดูการจองและใบเสร็จในที่เดียว', 'บันทึกหอที่ชอบไว้ดูภายหลัง', 'รับแจ้งเตือนสถานะทันที'],
    rating: '4.8 จาก 1,200+ รีวิวผู้เช่า',
    noAccount: 'ยังไม่มีบัญชี?',
    signUp: 'สมัครสมาชิก',
    title: 'เข้าสู่ระบบ',
    subtitle: 'ยินดีต้อนรับกลับ! เข้าใช้งานบัญชี Hoprak ของคุณ',
    google: 'เข้าสู่ระบบด้วย Google',
    or: 'หรือ',
    emailLabel: 'อีเมล หรือ เบอร์โทร',
    emailPh: 'you@gmail.com',
    passwordLabel: 'รหัสผ่าน',
    passwordPh: 'รหัสผ่านของคุณ',
    forgotPassword: 'ลืมรหัสผ่าน?',
    remember: 'จดจำการเข้าสู่ระบบ',
    lastUsed: 'ใช้ล่าสุด',
    notYou: 'ไม่ใช่คุณ?',
    fillRequired: 'กรุณากรอกอีเมลและรหัสผ่าน',
    genericError: 'เข้าสู่ระบบไม่สำเร็จ',
    sessionExpired: 'เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่',
    passwordChanged: 'เปลี่ยนรหัสผ่านเรียบร้อย กรุณาเข้าสู่ระบบใหม่ด้วยรหัสใหม่',
    googleFailed: 'เข้าสู่ระบบด้วย Google ไม่สำเร็จ กรุณาลองใหม่',
    accountSuspended: 'บัญชีนี้ถูกระงับการใช้งาน',
    submitting: 'กำลังเข้าสู่ระบบ...',
    submit: 'เข้าสู่ระบบ',
    ownerTitle: 'เป็นเจ้าของหอพัก?',
    ownerSub: 'เข้าสู่ระบบที่นี่',
    showPass: 'แสดงรหัสผ่าน',
  },
  en: {
    brandTitle1: 'Welcome',
    brandTitle2: 'back again',
    brandSub: 'Log in to your Hoprak account to see bookings, receipts and saved dorms',
    perks: ['Bookings and receipts in one place', 'Save the dorms you like', 'Get status updates instantly'],
    rating: '4.8 from 1,200+ tenant reviews',
    noAccount: "Don't have an account?",
    signUp: 'Sign up',
    title: 'Log in',
    subtitle: 'Welcome back! Access your Hoprak account',
    google: 'Log in with Google',
    or: 'or',
    emailLabel: 'Email or phone',
    emailPh: 'you@gmail.com',
    passwordLabel: 'Password',
    passwordPh: 'Your password',
    forgotPassword: 'Forgot password?',
    remember: 'Remember me',
    lastUsed: 'Last used',
    notYou: 'Not you?',
    fillRequired: 'Please enter your email and password',
    genericError: 'Log in failed',
    sessionExpired: 'Your session expired — please log in again',
    passwordChanged: 'Password changed — please log in again with your new password',
    googleFailed: 'Google log in failed — please try again',
    accountSuspended: 'This account has been suspended',
    submitting: 'Logging in...',
    submit: 'Log in',
    ownerTitle: 'A dorm owner?',
    ownerSub: 'Log in here',
    showPass: 'Show password',
  },
};

const inputBase =
  'h-[54px] w-full rounded-[13px] border-[1.5px] border-[#E7ECEA] px-4 text-[15px] text-[#12151C] outline-none transition focus:border-[#2F6FE0] focus:bg-white focus:ring-[3px] focus:ring-[#2F6FE0]/10 placeholder:text-[#9AA5A0]';

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

export default function LoginPage() {
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
      session_expired: t.sessionExpired,
      password_changed: t.passwordChanged,
      google_login_failed: t.googleFailed,
      account_suspended: t.accountSuspended,
    };
    const queryError = searchParams.get('error');
    if (queryError) setError(ERRORS[queryError] ?? t.genericError);

    // จำอีเมล/เบอร์ที่ login ล่าสุด (ไม่จำรหัส) — เติมช่องอีเมลให้อัตโนมัติ ผู้ใช้กรอกแค่รหัส
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
      // ติ๊ก "จดจำการเข้าสู่ระบบ" = จำอีเมลไว้เติมให้ครั้งหน้า (ไม่เก็บรหัสผ่าน) ; ไม่ติ๊ก = ลืมทิ้ง
      if (remember) rememberLogin(email);
      else forgetLogin();
      router.push('/');
    } catch (err) {
      // ผิดครบเพดานแล้ว → พาไปตั้งรหัสใหม่เลย (ไม่บอกผู้ใช้ว่าผิดมากี่ครั้ง)
      // ส่งอีเมลผ่าน sessionStorage ไม่ใช่ URL ตามหลักเดิมของหน้าลืมรหัสผ่าน
      if ((err as { code?: string }).code === 'too_many_attempts') {
        sessionStorage.setItem('hopak_reset_email', email.trim());
        window.location.href = '/forgot-password';
        return;
      }
      setError(err instanceof Error ? err.message : t.genericError);
    } finally {
      setLoading(false);
    }
  }

  // ฟอร์ม (ใช้ร่วมกันทั้งเดสก์ท็อปและมือถือ)
  const form = (
    <form onSubmit={handleSubmit} className="w-full">
      <a
        href={`${API_URL}/auth/google`}
        onClick={() => sessionStorage.removeItem('googleIntent')}
        className="flex h-[56px] items-center justify-center gap-3 rounded-[14px] border border-[#E4E7EC] bg-white text-[16px] font-bold text-[#12151C] hover:bg-[#F8FAFD]"
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
              className="mt-1.5 text-[12.5px] font-semibold text-[#2F6FE0]"
            >
              {t.lastUsed}: {remembered}
            </button>
          )}
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <label className="text-[13.5px] font-medium text-[#5B655F]">{t.passwordLabel}</label>
            <Link href="/forgot-password" className="text-[13px] font-semibold text-[#2F6FE0] hover:underline">
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
          style={
            remember
              ? { background: '#2F6FE0', borderColor: '#2F6FE0' }
              : { background: '#fff', borderColor: '#D4D9E2' }
          }
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
        className="mt-6 flex h-[56px] w-full items-center justify-center gap-2 rounded-[14px] bg-[#2F6FE0] text-[17px] font-bold text-white shadow-[0_12px_26px_rgba(47,111,224,0.3)] hover:bg-[#1E4FB0] disabled:opacity-60"
      >
        {loading ? t.submitting : t.submit}
        {!loading && (
          <svg width="19" height="19" viewBox="0 0 24 24" fill="none">
            <path d="M5 12h14M13 6l6 6-6 6" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </button>

      {/* owner card */}
      <Link
        href="/partner-login"
        className="mt-5 flex items-center gap-3.5 rounded-[14px] border border-[#E4E7EC] p-4 transition hover:border-[#2F6FE0] hover:bg-[#F6F9FF]"
      >
        <span className="flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-[12px] bg-[#E7F7EF]">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
            <path d="M4 20V9l8-5 8 5v11" stroke="#12A150" strokeWidth="1.8" strokeLinejoin="round" />
            <path d="M9 20v-6h6v6" stroke="#12A150" strokeWidth="1.8" />
          </svg>
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[14.5px] font-bold text-[#12151C]">{t.ownerTitle}</span>
          <span className="block text-[13px] text-[#7A808B]">{t.ownerSub}</span>
        </span>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
          <path d="M9 6l6 6-6 6" stroke="#12A150" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </Link>
    </form>
  );

  return (
    <main className="flex min-h-screen flex-col lg:flex-row">
      {/* LEFT · brand panel (เดสก์ท็อป) */}
      <div className="relative hidden w-[40%] max-w-[600px] flex-col overflow-hidden bg-[linear-gradient(160deg,#12224E,#1E4FB0_62%,#2F6FE0)] px-[54px] py-14 text-white lg:flex">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_86%_10%,rgba(120,180,255,0.22),transparent_46%),radial-gradient(circle_at_0%_100%,rgba(90,220,170,0.14),transparent_44%)]" />
        <div className="relative flex items-center justify-between gap-3">
          {/* กดโลโก้ = กลับหน้าแรก */}
          <Link href="/" aria-label="Hoprak" className="flex items-center gap-3.5 transition hover:opacity-80">
            <HopakIcon size={44} className="rounded-[11px] ring-1 ring-white/25" />
            <span className="text-[22px] font-bold">Hoprak</span>
          </Link>
          <LangToggle onDark accent="#1E4FB0" />
        </div>

        <div className="relative mt-auto">
          <h1 className="text-[42px] font-extrabold leading-[1.18] tracking-tight">
            {t.brandTitle1}
            <br />
            {t.brandTitle2}
          </h1>
          <p className="mt-4 max-w-[440px] text-[17px] leading-relaxed text-[#CFDCF5]">{t.brandSub}</p>

          <div className="mt-9 flex flex-col gap-4">
            {t.perks.map((p, i) => (
              <div key={p} className="flex items-center gap-3.5">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/[0.14]">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                    {i === 0 && <path d="M5 12l4 4 10-11" stroke="#fff" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />}
                    {i === 1 && (
                      <>
                        <path d="M12 3l7 4v5c0 4-3 7-7 9-4-2-7-5-7-9V7l7-4z" stroke="#fff" strokeWidth="1.8" strokeLinejoin="round" />
                        <path d="M9 12l2 2 4-4" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                      </>
                    )}
                    {i === 2 && (
                      <>
                        <path d="M6 8a6 6 0 1112 0c0 7 3 9 3 9H3s3-2 3-9z" stroke="#fff" strokeWidth="1.8" strokeLinejoin="round" />
                        <path d="M10 21a2 2 0 004 0" stroke="#fff" strokeWidth="1.8" />
                      </>
                    )}
                  </svg>
                </span>
                <span className="text-base text-[#E7EEFB]">{p}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="relative mt-11 flex items-center gap-3 border-t border-white/[0.16] pt-6">
          <span className="flex gap-0.5">
            {[0, 1, 2, 3, 4].map((i) => (
              <svg key={i} width="16" height="16" viewBox="0 0 24 24" fill="#FFC24D">
                <path d="M12 2l2.9 6.2 6.8.7-5.1 4.6 1.5 6.7L12 17.8 5.9 20.2l1.5-6.7L2.3 8.9l6.8-.7L12 2z" />
              </svg>
            ))}
          </span>
          <span className="text-[14.5px] text-[#CFDCF5]">{t.rating}</span>
        </div>
      </div>

      {/* MOBILE · hero header */}
      <div className="relative overflow-hidden bg-[linear-gradient(160deg,#12224E,#1E4FB0_70%,#2F6FE0)] px-[22px] pb-[34px] pt-[22px] text-white lg:hidden">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_86%_10%,rgba(120,180,255,0.22),transparent_50%)]" />
        <div className="relative flex items-center justify-between gap-3">
          <Link href="/" aria-label="Hoprak" className="flex items-center gap-2.5 transition hover:opacity-80">
            <HopakIcon size={34} className="rounded-[9px] ring-1 ring-white/25" />
            <span className="text-[17px] font-bold">Hoprak</span>
          </Link>
          <LangToggle onDark accent="#1E4FB0" />
        </div>
        <h1 className="relative mt-5 text-[28px] font-extrabold leading-[1.2] tracking-tight">
          {t.brandTitle1}
          <br />
          {t.brandTitle2}
        </h1>
        <p className="relative mt-2 text-[14.5px] leading-relaxed text-[#CFDCF5]">{t.brandSub}</p>
      </div>

      {/* RIGHT · form */}
      <div className="flex flex-1 items-center justify-center bg-white px-[22px] py-8 sm:px-14 sm:py-14">
        <div className="w-full max-w-[460px]">
          {/* topbar — สมัครสมาชิก */}
          <div className="mb-7 hidden items-center justify-end gap-2.5 lg:flex">
            <span className="text-sm text-[#7A808B]">{t.noAccount}</span>
            <Link
              href="/register"
              className="inline-flex h-[38px] items-center gap-1.5 rounded-[10px] bg-[#2F6FE0] px-4 text-sm font-bold text-white shadow-[0_6px_14px_rgba(47,111,224,0.28)] hover:bg-[#1E4FB0]"
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

          {/* ล่างสุด (มือถือ) */}
          <p className="mt-6 text-center text-sm text-[#7A808B] lg:hidden">
            {t.noAccount}{' '}
            <Link href="/register" className="font-bold text-[#2F6FE0] underline">
              {t.signUp}
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
