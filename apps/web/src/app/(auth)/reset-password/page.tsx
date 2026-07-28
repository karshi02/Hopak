'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { apiClient } from '@/lib/api-client';
import { useLang } from '@/hooks/useLang';

const MIN_PASSWORD_LENGTH = 6;

const TEXT = {
  th: {
    title: 'ตั้งรหัสผ่านใหม่',
    subtitle: 'ตั้งรหัสผ่านใหม่สำหรับบัญชี Hopak ของคุณ',
    passwordLabel: 'รหัสผ่านใหม่',
    confirmLabel: 'ยืนยันรหัสผ่านใหม่',
    submit: 'บันทึกรหัสผ่านใหม่',
    submitting: 'กำลังบันทึก...',
    fillRequired: 'กรุณากรอกรหัสผ่านให้ครบทั้ง 2 ช่อง',
    tooShort: `รหัสผ่านต้องยาวอย่างน้อย ${MIN_PASSWORD_LENGTH} ตัวอักษร`,
    mismatch: 'รหัสผ่านทั้ง 2 ช่องไม่ตรงกัน',
    genericError: 'ตั้งรหัสผ่านใหม่ไม่สำเร็จ',
    noToken: 'ลิงก์ไม่ถูกต้อง กรุณาขอลิงก์ตั้งรหัสผ่านใหม่อีกครั้ง',
    requestNew: 'ขอลิงก์ใหม่',
    doneTitle: 'ตั้งรหัสผ่านใหม่แล้ว',
    doneBody: 'ระบบออกจากระบบทุกอุปกรณ์ที่ค้างอยู่ให้แล้วเพื่อความปลอดภัย กรุณาเข้าสู่ระบบใหม่ด้วยรหัสผ่านที่เพิ่งตั้ง',
    goLogin: 'ไปหน้าเข้าสู่ระบบ',
    backToLogin: '← กลับไปหน้าเข้าสู่ระบบ',
  },
  en: {
    title: 'Set a new password',
    subtitle: 'Choose a new password for your Hopak account',
    passwordLabel: 'New password',
    confirmLabel: 'Confirm new password',
    submit: 'Save new password',
    submitting: 'Saving...',
    fillRequired: 'Please fill in both password fields',
    tooShort: `Password must be at least ${MIN_PASSWORD_LENGTH} characters`,
    mismatch: 'The two passwords do not match',
    genericError: 'Could not reset your password',
    noToken: 'Invalid link — please request a new reset link',
    requestNew: 'Request a new link',
    doneTitle: 'Password updated',
    doneBody: 'For your security we logged out every device that was still signed in. Please log in again with your new password.',
    goLogin: 'Go to log in',
    backToLogin: '← Back to log in',
  },
};

const inputClass =
  'w-full bg-transparent font-sans text-[15px] text-ink outline-none placeholder:font-sans placeholder:text-ink-faint';

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { lang } = useLang();
  const t = TEXT[lang];
  const token = searchParams.get('token');

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    setError(null);
    if (!password || !confirm) {
      setError(t.fillRequired);
      return;
    }
    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(t.tooShort);
      return;
    }
    if (password !== confirm) {
      setError(t.mismatch);
      return;
    }
    setLoading(true);
    try {
      await apiClient.post('/auth/reset-password', { token, password });
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : t.genericError);
    } finally {
      setLoading(false);
    }
  }

  if (!token) {
    return (
      <div className="w-full max-w-sm">
        <h2 className="text-xl font-semibold text-ink-strong">{t.title}</h2>
        <p className="mt-2 text-sm text-danger">{t.noToken}</p>
        <Link
          href="/forgot-password"
          className="mt-5 block rounded-xl bg-tenant py-3 text-center text-[15px] font-bold text-white hover:bg-tenant-dark"
        >
          {t.requestNew}
        </Link>
      </div>
    );
  }

  if (done) {
    return (
      <div className="w-full max-w-sm">
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-success/10 text-2xl">✅</div>
        <h2 className="text-xl font-semibold text-ink-strong">{t.doneTitle}</h2>
        <p className="mt-2 text-sm leading-relaxed text-ink-subtitle">{t.doneBody}</p>
        <button
          type="button"
          onClick={() => router.push('/login')}
          className="mt-5 w-full rounded-xl bg-tenant py-3 text-[15px] font-bold text-white shadow-[0_10px_22px_rgba(47,111,224,0.35)] hover:bg-tenant-dark"
        >
          {t.goLogin}
        </button>
      </div>
    );
  }

  return (
    <div className="w-full max-w-sm">
      <h2 className="text-xl font-semibold text-ink-strong">{t.title}</h2>
      <p className="mt-1 text-sm text-ink-subtitle">{t.subtitle}</p>

      <div className="mt-6 flex flex-col gap-3">
        <div className="flex h-[50px] items-center gap-2.5 rounded-xl border-[1.5px] border-tenant bg-white px-3.5 shadow-[0_0_0_3px_rgba(47,111,224,0.12)]">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="shrink-0">
            <rect x="4" y="10" width="16" height="10" rx="2" stroke="#2F6FE0" strokeWidth="1.8" />
            <path d="M8 10V7a4 4 0 018 0v3" stroke="#2F6FE0" strokeWidth="1.8" />
          </svg>
          <input
            type={showPassword ? 'text' : 'password'}
            placeholder={t.passwordLabel}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={inputClass}
          />
          <button type="button" onClick={() => setShowPassword((v) => !v)} className="shrink-0 text-ink-faint">
            {showPassword ? '🙈' : '👁'}
          </button>
        </div>

        <div className="flex h-[50px] items-center gap-2.5 rounded-xl border-[1.5px] border-card-border bg-white px-3.5">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="shrink-0">
            <rect x="4" y="10" width="16" height="10" rx="2" stroke="#9AA0AB" strokeWidth="1.8" />
            <path d="M8 10V7a4 4 0 018 0v3" stroke="#9AA0AB" strokeWidth="1.8" />
          </svg>
          <input
            type={showPassword ? 'text' : 'password'}
            placeholder={t.confirmLabel}
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
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

      <p className="mt-6 text-center text-sm">
        <Link href="/login" className="font-medium text-tenant">
          {t.backToLogin}
        </Link>
      </p>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <main className="flex min-h-[calc(100vh-65px)] items-center justify-center bg-surface-web p-6">
      <Suspense fallback={null}>
        <ResetPasswordForm />
      </Suspense>
    </main>
  );
}
