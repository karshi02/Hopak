'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api-client';
import { setToken } from '@/lib/auth';
import { useLang } from '@/hooks/useLang';
import { Turnstile, turnstileEnabled } from '@/components/Turnstile';
import { HopakIcon } from '@/components/HopakIcon';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

const TEXT = {
  th: {
    brandTitle1: 'หาหอในฝัน',
    brandTitle2: 'จองได้ในไม่กี่คลิก',
    brandSub: 'รวมหอพักใกล้มหาวิทยาลัย ราคาโปร่งใส จองและชำระเงินจบในที่เดียว',
    perks: ['ค้นหาหอใกล้ ม. ราคาดี รีวิวจริง', 'ชำระเงินปลอดภัย ยืนยันทันที', 'เช่ารายวันหรือรายเดือนก็ได้'],
    rating: '4.8 จาก 1,200+ รีวิวผู้เช่า',
    stepOf: (n: number) => `ขั้นตอนที่ ${n} จาก 2`,
    login: 'เข้าสู่ระบบ',
    stepAccount: 'สร้างบัญชี',
    stepProfile: 'โปรไฟล์',
    // step 1
    title1: 'สร้างบัญชี Hoprak',
    sub1: 'เริ่มด้วย Google หรือกรอกอีเมลของคุณ',
    google: 'ดำเนินการต่อด้วย Google',
    or: 'หรือ',
    fName: 'ชื่อ-นามสกุล',
    fEmail: 'อีเมล',
    fPhone: 'เบอร์โทรศัพท์',
    fPass: 'รหัสผ่าน',
    phName: 'เช่น วิชัย ใจดี',
    phEmail: 'you@gmail.com',
    phPhone: '08x-xxx-xxxx',
    phPass: 'อย่างน้อย 6 ตัวอักษร',
    submit1: 'สมัครสมาชิก',
    submitting: 'กำลังสมัคร...',
    haveAccount: 'มีบัญชีแล้ว?',
    terms: 'การสมัครถือว่ายอมรับเงื่อนไขการใช้งานและนโยบายความเป็นส่วนตัว',
    err1: 'สร้างบัญชีไม่สำเร็จ',
    errPhone: 'กรอกเบอร์โทรให้ครบ 10 หลัก (ขึ้นต้นด้วย 0)',
    errCaptcha: 'กรุณายืนยันว่าคุณไม่ใช่บอทก่อน',
    // step 2
    title2: 'ตั้งค่าโปรไฟล์',
    sub2: 'เพื่อให้หอพักติดต่อคุณได้สะดวก',
    uploadPhoto: 'อัปโหลดรูปโปรไฟล์',
    newUser: 'ผู้ใช้ใหม่',
    fDisplayName: 'ชื่อที่แสดง',
    intentTitle: 'คุณสนใจแบบไหน',
    intentMonthly: 'เช่ารายเดือน',
    intentDaily: 'เช่ารายวัน',
    back: 'ย้อนกลับ',
    finish: 'เริ่มใช้งาน',
    err2: 'บันทึกโปรไฟล์ไม่สำเร็จ',
  },
  en: {
    brandTitle1: 'Find your dorm',
    brandTitle2: 'Book it in a few clicks',
    brandSub: 'Dorms near your university, transparent pricing, book and pay in one place',
    perks: ['Dorms near campus, good prices, real reviews', 'Secure payment, instant confirmation', 'Daily or monthly rental'],
    rating: '4.8 from 1,200+ tenant reviews',
    stepOf: (n: number) => `Step ${n} of 2`,
    login: 'Log in',
    stepAccount: 'Account',
    stepProfile: 'Profile',
    title1: 'Create your Hoprak account',
    sub1: 'Start with Google or use your email',
    google: 'Continue with Google',
    or: 'or',
    fName: 'Full name',
    fEmail: 'Email',
    fPhone: 'Phone number',
    fPass: 'Password',
    phName: 'e.g. Wichai Jaidee',
    phEmail: 'you@gmail.com',
    phPhone: '08x-xxx-xxxx',
    phPass: 'At least 6 characters',
    submit1: 'Sign up',
    submitting: 'Signing up...',
    haveAccount: 'Already have an account?',
    terms: 'By signing up you accept our Terms of Service and Privacy Policy',
    err1: 'Could not create account',
    errPhone: 'Enter a valid 10-digit phone number starting with 0',
    errCaptcha: 'Please complete the bot check first',
    title2: 'Set up your profile',
    sub2: 'So dorms can reach you easily',
    uploadPhoto: 'Upload profile photo',
    newUser: 'New user',
    fDisplayName: 'Display name',
    intentTitle: 'What are you looking for?',
    intentMonthly: 'Monthly rental',
    intentDaily: 'Daily rental',
    back: 'Back',
    finish: 'Get started',
    err2: 'Could not save profile',
  },
};

const inputBase =
  'h-[52px] w-full rounded-[13px] border-[1.5px] border-[#E7ECEA] bg-[#F6F8FB] px-4 text-[15px] text-[#12151C] outline-none transition focus:border-[#2F6FE0] focus:bg-white focus:ring-[3px] focus:ring-[#2F6FE0]/10 placeholder:text-[#9AA5A0]';
const labelBase = 'mb-2 block text-[13.5px] font-medium text-[#5B655F]';

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

export default function RegisterPage() {
  const router = useRouter();
  const { lang } = useLang();
  const t = TEXT[lang];
  const [step, setStep] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  // token กันบอทจาก Cloudflare Turnstile — ว่าง = ยังไม่ผ่านการยืนยัน
  const [captcha, setCaptcha] = useState('');
  const [password, setPassword] = useState('');
  const [intent, setIntent] = useState<'monthly' | 'daily'>('monthly');
  const [address, setAddress] = useState('');
  const autoSavedRef = useRef(false);

  // เก็บที่อยู่จากตำแหน่งเครื่องแบบเงียบๆ (ไม่มี UI) — บันทึกให้อัตโนมัติครั้งเดียวหลังมีบัญชี
  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${pos.coords.latitude}&lon=${pos.coords.longitude}`,
          );
          const data = await res.json();
          if (data?.display_name) setAddress(data.display_name);
        } catch {
          /* ไม่ได้ก็ข้ามไป ไม่รบกวนผู้ใช้ */
        }
      },
      () => {},
      { enableHighAccuracy: false, timeout: 8000 },
    );
  }, []);

  useEffect(() => {
    if (step === 2 && address && !autoSavedRef.current) {
      autoSavedRef.current = true;
      apiClient.patch('/users/me', { address }).catch(() => {});
    }
  }, [step, address]);

  async function handleCreateAccount(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    // เบอร์ไทยต้อง 10 หลักขึ้นต้นด้วย 0 — ใช้กติกาเดียวกับฟอร์มจอง (bookings/new)
    // เว้นวรรค/ขีดที่คนพิมพ์ติดมาให้ตัดทิ้งก่อนเทียบ แล้วส่งเฉพาะตัวเลขล้วนขึ้นไป
    const phoneDigits = phone.replace(/[^0-9]/g, '');
    if (!/^0\d{9}$/.test(phoneDigits)) {
      setError(t.errPhone);
      return;
    }
    if (turnstileEnabled && !captcha) {
      setError(t.errCaptcha);
      return;
    }
    setSubmitting(true);
    try {
      const { accessToken } = await apiClient.post<{ accessToken: string }>('/auth/register', {
        name,
        email,
        phone: phoneDigits,
        password,
        turnstileToken: captcha || undefined,
      });
      setToken(accessToken);
      setStep(2);
    } catch (err) {
      setError(err instanceof Error ? err.message : t.err1);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleFinish(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      if (name) await apiClient.patch('/users/me', { name });
      // ความสนใจ: รายวัน → เข้าโหมดหอรายวันเลย ; รายเดือน → หน้าแรก
      router.push(intent === 'daily' ? '/daily' : '/');
    } catch (err) {
      setError(err instanceof Error ? err.message : t.err2);
      setSubmitting(false);
    }
  }

  const initial = (name.trim()[0] ?? (lang === 'th' ? 'ผ' : 'U')).toUpperCase();
  const nameShown = name.trim() || t.newUser;

  return (
    <main className="flex min-h-screen flex-col lg:flex-row">
      {/* LEFT · brand panel */}
      <div className="relative hidden w-[40%] max-w-[600px] flex-col overflow-hidden bg-[linear-gradient(160deg,#12224E,#1E4FB0_62%,#2F6FE0)] px-[54px] py-14 text-white lg:flex">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_88%_10%,rgba(120,180,255,0.22),transparent_46%),radial-gradient(circle_at_0%_100%,rgba(90,150,255,0.14),transparent_44%)]" />
        {/* กดโลโก้ = กลับหน้าแรก */}
        <Link href="/" aria-label="Hoprak" className="relative flex items-center gap-3.5 transition hover:opacity-80">
          <HopakIcon size={44} className="ring-1 ring-white/25 rounded-[11px]" />
          <span className="text-[22px] font-bold">Hoprak</span>
        </Link>

        <div className="relative mt-auto">
          <h1 className="text-[42px] font-extrabold leading-[1.18] tracking-tight">
            {t.brandTitle1}
            <br />
            {t.brandTitle2}
          </h1>
          <p className="mt-4 max-w-[440px] text-[17px] leading-relaxed text-[#CFE0FF]">{t.brandSub}</p>

          <div className="mt-9 flex flex-col gap-4">
            {t.perks.map((p, i) => (
              <div key={p} className="flex items-center gap-3.5">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/[0.14]">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                    {i === 0 && (
                      <>
                        <circle cx="11" cy="11" r="7" stroke="#fff" strokeWidth="1.9" />
                        <path d="M20 20l-4-4" stroke="#fff" strokeWidth="1.9" strokeLinecap="round" />
                      </>
                    )}
                    {i === 1 && (
                      <>
                        <path d="M12 3l7 4v5c0 4-3 7-7 9-4-2-7-5-7-9V7l7-4z" stroke="#fff" strokeWidth="1.8" strokeLinejoin="round" />
                        <path d="M9 12l2 2 4-4" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                      </>
                    )}
                    {i === 2 && (
                      <>
                        <rect x="4" y="5" width="16" height="15" rx="2" stroke="#fff" strokeWidth="1.8" />
                        <path d="M8 3v4M16 3v4M4 10h16" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" />
                      </>
                    )}
                  </svg>
                </span>
                <span className="text-base text-[#EAF2FF]">{p}</span>
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
          <span className="text-[14.5px] text-[#CFE0FF]">{t.rating}</span>
        </div>
      </div>

      {/* RIGHT · form */}
      <div className="flex flex-1 items-center justify-center bg-white px-5 pb-10 pt-9 sm:px-14 lg:py-10">
        <div className="w-full max-w-[520px]">
          {/* topbar — จอเล็กไม่มีแผงแบรนด์ฝั่งซ้าย ใส่โลโก้ไว้ตรงนี้ กดกลับหน้าแรกได้ */}
          <Link href="/" aria-label="Hoprak" className="mb-6 inline-flex items-center gap-2.5 lg:hidden">
            <HopakIcon size={34} />
            <span className="text-[17px] font-bold tracking-tight text-[#161A22]">
              Hoprak<span className="text-[#2F6FE0]">.com</span>
            </span>
          </Link>

          <div className="flex items-center justify-between gap-3">
            <span className="text-[14.5px] text-[#7A808B]">{t.stepOf(step)}</span>
            <Link
              href="/login"
              className="inline-flex h-[38px] items-center gap-1.5 rounded-[10px] bg-[#2F6FE0] px-4 text-sm font-bold text-white shadow-[0_6px_14px_rgba(47,111,224,0.28)] hover:bg-[#1E4FB0]"
            >
              {t.login}
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                <path d="M10 17l5-5-5-5M15 12H3M14 4h5a1 1 0 011 1v14a1 1 0 01-1 1h-5" stroke="#fff" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </Link>
          </div>

          {/* stepper */}
          <div className="mt-4 flex items-center">
            {[
              { n: 1, label: t.stepAccount },
              { n: 2, label: t.stepProfile },
            ].map((s, i) => {
              const on = step >= s.n;
              return (
                <div key={s.n} className={`flex items-center ${i === 0 ? 'flex-1' : ''}`}>
                  <div className="flex shrink-0 items-center gap-2.5">
                    <span
                      className="flex h-8 w-8 items-center justify-center rounded-full border-2 text-sm font-bold"
                      style={
                        on
                          ? { background: '#2F6FE0', borderColor: '#2F6FE0', color: '#fff' }
                          : { background: '#fff', borderColor: '#E0E5E3', color: '#A6AFAA' }
                      }
                    >
                      {s.n}
                    </span>
                    <span className="text-[13.5px] font-semibold" style={{ color: on ? '#12151C' : '#A6AFAA' }}>
                      {s.label}
                    </span>
                  </div>
                  {i === 0 && (
                    <div className="mx-3 h-0.5 flex-1 rounded" style={{ background: step > 1 ? '#2F6FE0' : '#E7ECEA' }} />
                  )}
                </div>
              );
            })}
          </div>

          {/* STEP 1 */}
          {step === 1 && (
            <form onSubmit={handleCreateAccount}>
              <h2 className="mt-8 text-[32px] font-extrabold tracking-tight text-[#12151C]">{t.title1}</h2>
              <p className="mt-2 text-[15.5px] text-[#7A808B]">{t.sub1}</p>

              <a
                href={`${API_URL}/auth/google`}
                onClick={() => sessionStorage.removeItem('googleIntent')}
                className="mt-6 flex h-[58px] items-center justify-center gap-3 rounded-[14px] border border-[#E4E7EC] bg-white text-[16px] font-bold text-[#12151C] hover:bg-[#F8FAFD]"
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
                  <label className={labelBase}>{t.fName}</label>
                  <input value={name} onChange={(e) => setName(e.target.value)} placeholder={t.phName} required className={inputBase} />
                </div>
                <div>
                  <label className={labelBase}>{t.fEmail}</label>
                  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder={t.phEmail} required className={inputBase} />
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className={labelBase}>{t.fPhone}</label>
                    <input
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder={t.phPhone}
                      type="tel"
                      inputMode="numeric"
                      autoComplete="tel"
                      required
                      className={`${inputBase} font-sans`}
                    />
                  </div>
                  <div>
                    <label className={labelBase}>{t.fPass}</label>
                    <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder={t.phPass} required minLength={6} className={inputBase} />
                  </div>
                </div>
              </div>

              <div className="mt-4">
                <Turnstile onToken={setCaptcha} lang={lang} />
              </div>

              {error && <p className="mt-4 text-sm text-danger">{error}</p>}

              <button
                type="submit"
                disabled={submitting}
                className="mt-6 flex h-[56px] w-full items-center justify-center gap-2 rounded-[14px] bg-[#2F6FE0] text-[17px] font-bold text-white shadow-[0_12px_26px_rgba(47,111,224,0.3)] hover:bg-[#1E4FB0] disabled:opacity-60"
              >
                {submitting ? t.submitting : t.submit1}
                {!submitting && (
                  <svg width="19" height="19" viewBox="0 0 24 24" fill="none">
                    <path d="M5 12h14M13 6l6 6-6 6" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </button>

              <p className="mt-4 text-center text-sm text-[#7A808B]">
                {t.haveAccount}{' '}
                <Link href="/login" className="font-bold text-[#2F6FE0] underline">
                  {t.login}
                </Link>
              </p>
              <p className="mt-3 text-center text-[12.5px] leading-relaxed text-[#9AA5A0]">{t.terms}</p>
            </form>
          )}

          {/* STEP 2 */}
          {step === 2 && (
            <form onSubmit={handleFinish}>
              <h2 className="mt-8 text-[32px] font-extrabold tracking-tight text-[#12151C]">{t.title2}</h2>
              <p className="mt-2 text-[15.5px] text-[#7A808B]">{t.sub2}</p>

              {/* avatar card */}
              <div className="mt-6 flex items-center gap-4 rounded-2xl bg-[#F6F8FB] p-5">
                <div className="relative shrink-0">
                  <span className="flex h-[74px] w-[74px] items-center justify-center rounded-full bg-[linear-gradient(135deg,#3B82F6,#1E4FB0)] text-[30px] font-extrabold text-white">
                    {initial}
                  </span>
                  <span className="absolute -bottom-0.5 -right-0.5 flex h-7 w-7 items-center justify-center rounded-full border-2 border-white bg-[#2F6FE0]">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                      <path d="M12 5v14M5 12h14" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" />
                    </svg>
                  </span>
                </div>
                <div className="min-w-0">
                  <div className="truncate text-[17px] font-bold text-[#12151C]">{nameShown}</div>
                  <span className="mt-0.5 block text-[13.5px] font-semibold text-[#2F6FE0]">{t.uploadPhoto}</span>
                </div>
              </div>

              <div className="mt-5">
                <label className={labelBase}>{t.fDisplayName}</label>
                <input value={name} onChange={(e) => setName(e.target.value)} placeholder={t.phName} className={inputBase} />
              </div>

              {/* intent cards */}
              <div className="mt-6">
                <div className="mb-3 text-[16px] font-bold text-[#12151C]">{t.intentTitle}</div>
                <div className="grid grid-cols-2 gap-3">
                  {(
                    [
                      ['monthly', t.intentMonthly],
                      ['daily', t.intentDaily],
                    ] as const
                  ).map(([key, label]) => {
                    const on = intent === key;
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setIntent(key)}
                        className="flex flex-col items-center gap-2.5 rounded-2xl border-2 px-4 py-5 transition"
                        style={
                          on
                            ? { borderColor: '#2F6FE0', background: '#EAF1FF', color: '#1E4FB0' }
                            : { borderColor: '#E4E7EC', background: '#fff', color: '#3A3F49' }
                        }
                      >
                        <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
                          {key === 'monthly' ? (
                            <>
                              <path d="M4 20V9l8-5 8 5v11" stroke={on ? '#2F6FE0' : '#8A909B'} strokeWidth="1.8" strokeLinejoin="round" />
                              <path d="M9 20v-6h6v6" stroke={on ? '#2F6FE0' : '#8A909B'} strokeWidth="1.8" />
                            </>
                          ) : (
                            <>
                              <rect x="4" y="5" width="16" height="15" rx="2" stroke={on ? '#2F6FE0' : '#8A909B'} strokeWidth="1.8" />
                              <path d="M8 3v4M16 3v4M4 10h16" stroke={on ? '#2F6FE0' : '#8A909B'} strokeWidth="1.8" strokeLinecap="round" />
                            </>
                          )}
                        </svg>
                        <span className="text-[15px] font-bold">{label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {error && <p className="mt-4 text-sm text-danger">{error}</p>}

              <div className="mt-7 flex gap-3">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="h-[56px] rounded-[14px] border-[1.5px] border-[#E1E7E4] bg-white px-6 text-base font-semibold text-[#5B655F] hover:bg-[#F6F8FB]"
                >
                  {t.back}
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex h-[56px] flex-1 items-center justify-center gap-2 rounded-[14px] bg-[#2F6FE0] text-[17px] font-bold text-white shadow-[0_12px_26px_rgba(47,111,224,0.3)] hover:bg-[#1E4FB0] disabled:opacity-60"
                >
                  {t.finish}
                  <svg width="19" height="19" viewBox="0 0 24 24" fill="none">
                    <path d="M5 12h14M13 6l6 6-6 6" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </main>
  );
}
