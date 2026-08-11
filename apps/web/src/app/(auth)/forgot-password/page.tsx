'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiClient } from '@/lib/api-client';
import { useLang } from '@/hooks/useLang';
import { useCurrentUser } from '@/hooks/useCurrentUser';

const TEXT = {
  th: {
    title: 'ลืมรหัสผ่าน',
    subtitle: 'กรอกอีเมลที่ใช้สมัคร เราจะส่งลิงก์ตั้งรหัสผ่านใหม่ไปให้',
    emailLabel: 'อีเมล',
    submit: 'ส่งลิงก์ตั้งรหัสผ่านใหม่',
    submitting: 'กำลังส่ง...',
    fillRequired: 'กรุณากรอกอีเมล',
    genericError: 'ส่งลิงก์ไม่สำเร็จ กรุณาลองใหม่',
    sentTitle: 'ส่งลิงก์แล้ว',
    // ข้อความกลางๆ ไม่บอกว่าอีเมลนี้มีในระบบจริงหรือไม่ (กันคนไล่เช็คว่าใครสมัครไว้บ้าง)
    sentBody: 'ถ้าอีเมลนี้มีบัญชีอยู่ในระบบ เราได้ส่งลิงก์ตั้งรหัสผ่านใหม่ไปให้แล้ว กรุณาตรวจสอบกล่องจดหมาย (รวมถึงอีเมลขยะ)',
    sentNote: 'ลิงก์ใช้ได้ครั้งเดียวและหมดอายุใน 30 นาที',
    backToLogin: '← กลับไปหน้าเข้าสู่ระบบ',
  },
  en: {
    title: 'Forgot password',
    subtitle: 'Enter the email you signed up with and we will send you a reset link',
    emailLabel: 'Email',
    submit: 'Send reset link',
    submitting: 'Sending...',
    fillRequired: 'Please enter your email',
    genericError: 'Could not send the link, please try again',
    sentTitle: 'Link sent',
    sentBody:
      'If an account exists for this email, we have sent a password reset link. Please check your inbox (and spam folder).',
    sentNote: 'The link works once and expires in 30 minutes.',
    backToLogin: '← Back to log in',
  },
};

const inputClass =
  'w-full bg-transparent font-sans text-[15px] text-ink outline-none placeholder:font-sans placeholder:text-ink-faint';

export default function ForgotPasswordPage() {
  const { lang } = useLang();
  const t = TEXT[lang];
  const { user } = useCurrentUser();
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // เข้ามาจากเมนูตอนล็อกอินอยู่ → เติมอีเมลของบัญชีให้เลย (ไม่ส่งผ่าน URL)
  useEffect(() => {
    const mail = user?.email;
    if (mail) setEmail((prev) => prev || mail);
  }, [user]);

  async function handleSubmit() {
    setError(null);
    if (!email.trim()) {
      setError(t.fillRequired);
      return;
    }
    setLoading(true);
    try {
      await apiClient.post('/auth/forgot-password', { email: email.trim() });
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : t.genericError);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-[calc(100vh-65px)] items-center justify-center bg-surface-web p-6">
      <div className="w-full max-w-sm">
        {sent ? (
          <>
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-success/10 text-2xl">
              ✉️
            </div>
            <h2 className="text-xl font-semibold text-ink-strong">{t.sentTitle}</h2>
            <p className="mt-2 text-sm leading-relaxed text-ink-subtitle">{t.sentBody}</p>
            <p className="mt-2 text-xs text-ink-faint">{t.sentNote}</p>
          </>
        ) : (
          <>
            <h2 className="text-xl font-semibold text-ink-strong">{t.title}</h2>
            <p className="mt-1 text-sm text-ink-subtitle">{t.subtitle}</p>

            <div className="mt-6 flex flex-col gap-3">
              <div className="flex h-[50px] items-center gap-2.5 rounded-xl border-[1.5px] border-tenant bg-white px-3.5 shadow-[0_0_0_3px_rgba(47,111,224,0.12)]">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="shrink-0">
                  <rect x="3" y="5" width="18" height="14" rx="2" stroke="#2F6FE0" strokeWidth="1.8" />
                  <path d="M4 7l8 6 8-6" stroke="#2F6FE0" strokeWidth="1.8" />
                </svg>
                <input
                  type="email"
                  placeholder={t.emailLabel}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                  className={inputClass}
                />
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
          </>
        )}

        <p className="mt-6 text-center text-sm">
          <Link href="/login" className="font-medium text-tenant">
            {t.backToLogin}
          </Link>
        </p>
      </div>
    </main>
  );
}
