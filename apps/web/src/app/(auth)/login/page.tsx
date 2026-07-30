'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { apiClient } from '@/lib/api-client';
import { setToken, rememberLogin, getRememberedLogin, forgetLogin } from '@/lib/auth';
import { useLang } from '@/hooks/useLang';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

const TEXT = {
  th: {
    welcome: 'ยินดีต้อนรับ',
    welcomeBack: 'กลับมา 👋',
    perks: [
      'ดูการจองทั้งหมดของคุณ พร้อมสถานะล่าสุด',
      'ค้นหาหอพักใหม่ๆ ทั่วมหาสารคาม ขอนแก่น เชียงใหม่',
      'ข้อมูลส่วนตัวถูกปกป้อง เบอร์ซ่อนบางส่วน',
    ],
    haveAccount: 'ยังไม่มีบัญชี? สมัครสมาชิก',
    title: 'เข้าสู่ระบบ',
    subtitle: 'เข้าสู่บัญชี Hoprak ของคุณ',
    google: 'เข้าสู่ระบบด้วย Google',
    or: 'หรือ',
    emailLabel: 'อีเมล หรือ เบอร์โทร',
    passwordLabel: 'รหัสผ่าน',
    forgotPassword: 'ลืมรหัสผ่าน?',
    lastUsed: 'ใช้ล่าสุด',
    notYou: 'ไม่ใช่คุณ?',
    fillRequired: 'กรุณากรอกอีเมลและรหัสผ่าน',
    genericError: 'เข้าสู่ระบบไม่สำเร็จ',
    sessionExpired: 'เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่',
    submitting: 'กำลังเข้าสู่ระบบ...',
    submit: 'เข้าสู่ระบบ',
    noAccount: 'ยังไม่มีบัญชี?',
    signUp: 'สมัครสมาชิก',
    ownerLink: 'เป็นเจ้าของหอพัก? เข้าสู่ระบบที่นี่',
  },
  en: {
    welcome: 'Welcome',
    welcomeBack: 'back 👋',
    perks: [
      'See all your bookings with the latest status',
      'Find new dorms across Mahasarakham, Khon Kaen, Chiang Mai',
      'Your personal info is protected, phone numbers partly hidden',
    ],
    haveAccount: "Don't have an account? Sign up",
    title: 'Log in',
    subtitle: 'Log in to your Hoprak account',
    google: 'Log in with Google',
    or: 'or',
    emailLabel: 'Email or phone',
    passwordLabel: 'Password',
    forgotPassword: 'Forgot password?',
    lastUsed: 'Last used',
    notYou: 'Not you?',
    fillRequired: 'Please enter your email and password',
    genericError: 'Log in failed',
    sessionExpired: 'Your session expired — please log in again',
    submitting: 'Logging in...',
    submit: 'Log in',
    noAccount: "Don't have an account?",
    signUp: 'Sign up',
    ownerLink: 'A dorm owner? Log in here',
  },
};

const inputClass = 'w-full bg-transparent font-sans text-[15px] text-ink outline-none placeholder:font-sans placeholder:text-ink-faint';

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24">
      <path fill="#4285F4" d="M22.5 12.2c0-.7-.1-1.4-.2-2H12v3.8h5.9a5 5 0 01-2.2 3.3v2.7h3.5c2-1.9 3.3-4.7 3.3-7.8z" />
      <path fill="#34A853" d="M12 23c3 0 5.5-1 7.3-2.7l-3.5-2.7c-1 .7-2.3 1.1-3.8 1.1-2.9 0-5.4-2-6.3-4.6H2v2.8A11 11 0 0012 23z" />
      <path fill="#FBBC05" d="M5.7 14.1a6.6 6.6 0 010-4.2V7.1H2a11 11 0 000 9.8l3.7-2.8z" />
      <path fill="#EA4335" d="M12 5.4c1.6 0 3 .6 4.1 1.6l3.1-3.1A11 11 0 002 7.1l3.7 2.8C6.6 7.3 9.1 5.4 12 5.4z" />
    </svg>
  );
}

function BrandPanel({ t }: { t: (typeof TEXT)['th'] }) {
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
          {t.welcome}
          <br />
          {t.welcomeBack}
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
      </div>

      <div className="relative font-sans text-xs text-[#BFCDE6]">
        © 2026 Hoprak ·{' '}
        <a href="/register" className="underline">
          {t.haveAccount}
        </a>
      </div>
    </div>
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
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [remembered, setRemembered] = useState<string | null>(null);

  useEffect(() => {
    const queryError = searchParams.get('error');
    if (queryError === 'session_expired') setError(t.sessionExpired);
    else if (queryError) setError(queryError);

    // จำอีเมล/เบอร์ที่ login ล่าสุด (ไม่จำรหัส) — เติมช่องอีเมลให้อัตโนมัติ ผู้ใช้กรอกแค่รหัส
    const last = getRememberedLogin();
    if (last) {
      setRemembered(last);
      setEmail(last);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSubmit() {
    setError(null);
    if (!email || !password) {
      setError(t.fillRequired);
      return;
    }
    setLoading(true);
    try {
      const { accessToken } = await apiClient.post<{ accessToken: string }>('/auth/login', { email, password });
      setToken(accessToken);
      rememberLogin(email); // จำอีเมลไว้เติมให้ครั้งหน้า (ไม่เก็บรหัสผ่าน)
      router.push('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : t.genericError);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-[calc(100vh-65px)] bg-surface-web">
      <BrandPanel t={t} />

      <div className="flex flex-1 items-center justify-center p-6">
        <div className="w-full max-w-sm">
          <h2 className="text-xl font-semibold text-ink-strong">{t.title}</h2>
          <p className="mt-1 text-sm text-ink-subtitle">{t.subtitle}</p>

          <a
            href={`${API_URL}/auth/google`}
            className="mt-6 flex items-center justify-center gap-2 rounded-btn border border-card-border py-2.5 text-sm font-medium text-ink hover:bg-black/[0.02]"
          >
            <GoogleIcon />
            {t.google}
          </a>

          <div className="my-5 flex items-center gap-3 text-xs text-ink-faint">
            <span className="h-px flex-1 bg-card-border" />
            {t.or}
            <span className="h-px flex-1 bg-card-border" />
          </div>

          <div className="flex flex-col gap-3">
            <div className="flex h-[50px] items-center gap-2.5 rounded-xl border-[1.5px] border-tenant bg-white px-3.5 shadow-[0_0_0_3px_rgba(47,111,224,0.12)]">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="shrink-0">
                <rect x="3" y="5" width="18" height="14" rx="2" stroke="#2F6FE0" strokeWidth="1.8" />
                <path d="M4 7l8 6 8-6" stroke="#2F6FE0" strokeWidth="1.8" />
              </svg>
              <input
                type="text"
                placeholder={t.emailLabel}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                className={inputClass}
              />
            </div>

            {remembered && (
              <div className="-mt-1 flex items-center gap-2 text-xs">
                {email !== remembered && (
                  <button
                    type="button"
                    onClick={() => setEmail(remembered)}
                    className="rounded-full bg-tenant/10 px-2.5 py-1 font-medium text-tenant hover:bg-tenant/15"
                  >
                    {t.lastUsed}: {remembered}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    forgetLogin();
                    setRemembered(null);
                    setEmail('');
                  }}
                  className="text-ink-faint underline"
                >
                  {t.notYou}
                </button>
              </div>
            )}

            <div>
              <div className="flex h-[50px] items-center gap-2.5 rounded-xl border-[1.5px] border-card-border bg-white px-3.5">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="shrink-0">
                  <rect x="4" y="10" width="16" height="10" rx="2" stroke="#9AA0AB" strokeWidth="1.8" />
                  <path d="M8 10V7a4 4 0 018 0v3" stroke="#9AA0AB" strokeWidth="1.8" />
                </svg>
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder={t.passwordLabel}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                  className={inputClass}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="shrink-0 text-ink-faint"
                >
                  {showPassword ? '🙈' : '👁'}
                </button>
              </div>
              <div className="mt-1.5 text-right">
                <Link href="/forgot-password" className="text-xs font-semibold text-tenant">
                  {t.forgotPassword}
                </Link>
              </div>
            </div>

            {error && <p className="text-sm text-danger">{error}</p>}

            <button
              type="button"
              onClick={handleSubmit}
              disabled={loading}
              className="mt-1 rounded-xl bg-tenant py-3 text-[15px] font-bold text-white shadow-[0_10px_22px_rgba(47,111,224,0.35)] hover:bg-tenant-dark disabled:opacity-60"
            >
              {loading ? t.submitting : t.submit}
            </button>
          </div>

          <p className="mt-5 text-center text-sm text-ink-subtitle lg:hidden">
            {t.noAccount}{' '}
            <a href="/register" className="font-medium text-tenant">
              {t.signUp}
            </a>
          </p>
          <p className="mt-2 text-center text-xs text-ink-faint">
            <a href="/partner-login" className="underline">
              {t.ownerLink}
            </a>
          </p>
        </div>
      </div>
    </main>
  );
}
