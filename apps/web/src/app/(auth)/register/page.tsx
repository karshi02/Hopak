'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api-client';
import { setToken } from '@/lib/auth';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';
const TOTAL_STEPS = 2;

const PERKS = [
  'หอพักคุณภาพจากเจ้าของจริง ผ่านการยืนยันตัวตน',
  'จองออนไลน์ปลอดภัย ไม่มีค่าธรรมเนียมแอบแฝง',
  'ข้อมูลส่วนตัวปลอดภัย เก็บเบอร์ให้เฉพาะเจ้าของหอที่จองเท่านั้น',
];

function BrandPanel({ step }: { step: number }) {
  return (
    <div className="hidden w-[38%] shrink-0 flex-col justify-between bg-gradient-to-br from-tenant to-tenant-dark p-10 text-white lg:flex">
      <div>
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/15 font-sans text-xl font-bold">
          H
        </div>
        <h1 className="mt-8 text-2xl font-semibold leading-snug">
          หาหอพักที่ใช่
          <br />
          ได้ในไม่กี่คลิก
        </h1>

        <ul className="mt-8 flex flex-col gap-4">
          {PERKS.map((perk) => (
            <li key={perk} className="flex items-start gap-2 text-sm text-white/90">
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white/20 font-sans text-xs">
                ✓
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

      <div className="font-sans text-xs text-white/70">
        © 2026 Hopak ·{' '}
        <a href="/login" className="underline">
          มีบัญชีอยู่แล้ว? เข้าสู่ระบบ
        </a>
      </div>
    </div>
  );
}

const inputClass =
  'rounded-btn border border-card-border px-3.5 py-2.5 text-sm text-ink placeholder:text-ink-faint focus:border-tenant focus:outline-none dark:border-white/10 dark:bg-[#1a1a19] dark:text-white';

export default function RegisterPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');

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
      setError(err instanceof Error ? err.message : 'สร้างบัญชีไม่สำเร็จ');
    }
  }

  async function handleFinishProfile(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      if (avatarUrl) {
        await apiClient.patch('/users/me', { avatarUrl });
      }
      router.push('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'บันทึกโปรไฟล์ไม่สำเร็จ');
    }
  }

  return (
    <main className="flex min-h-[calc(100vh-65px)] bg-surface-web">
      <BrandPanel step={step} />

      <div className="flex flex-1 items-center justify-center p-6">
        <div className="w-full max-w-sm">
          {step === 1 && (
            <div>
              <h2 className="text-xl font-semibold text-ink-strong dark:text-white">สมัครสมาชิก</h2>
              <p className="mt-1 text-sm text-ink-subtitle">สร้างบัญชีเพื่อเริ่มค้นหาและจองหอพัก</p>

              <a
                href={`${API_URL}/auth/google`}
                className="mt-6 flex items-center justify-center gap-2 rounded-btn border border-card-border py-2.5 text-sm font-medium text-ink hover:bg-black/[0.02] dark:border-white/10 dark:text-white dark:hover:bg-white/5"
              >
                <span className="font-sans font-semibold text-tenant">G</span>
                สมัครด้วย Google
              </a>

              <div className="my-5 flex items-center gap-3 text-xs text-ink-faint">
                <span className="h-px flex-1 bg-card-border" />
                หรือ
                <span className="h-px flex-1 bg-card-border" />
              </div>

              <form onSubmit={handleCreateAccount} className="flex flex-col gap-3">
                <input
                  type="text"
                  placeholder="ชื่อ-นามสกุล"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className={inputClass}
                  required
                />
                <div className="flex gap-3">
                  <input
                    type="email"
                    placeholder="อีเมล"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={`${inputClass} flex-1 font-sans`}
                    required
                  />
                  <input
                    type="tel"
                    placeholder="เบอร์โทร"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className={`${inputClass} flex-1 font-sans`}
                  />
                </div>
                <input
                  type="password"
                  placeholder="รหัสผ่าน"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={`${inputClass} font-sans`}
                  required
                  minLength={6}
                />
                {error && <p className="text-sm text-danger">{error}</p>}
                <button
                  type="submit"
                  className="mt-1 rounded-btn bg-tenant py-2.5 text-sm font-medium text-white shadow-sm hover:bg-tenant-dark"
                >
                  สมัครสมาชิก
                </button>
              </form>

              <p className="mt-5 text-center text-sm text-ink-subtitle lg:hidden">
                มีบัญชีแล้ว?{' '}
                <a href="/login" className="font-medium text-tenant">
                  เข้าสู่ระบบ
                </a>
              </p>
            </div>
          )}

          {step === 2 && (
            <div>
              <h2 className="text-xl font-semibold text-ink-strong dark:text-white">ตั้งค่าโปรไฟล์</h2>
              <p className="mt-1 text-sm text-ink-subtitle">เพิ่มรูปโปรไฟล์ (ข้ามได้)</p>
              <form onSubmit={handleFinishProfile} className="mt-6 flex flex-col gap-3">
                <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-surface-canvas text-xs text-ink-faint">
                  รูป
                </div>
                <input
                  type="url"
                  placeholder="ลิงก์รูปโปรไฟล์ (ถ้ามี)"
                  value={avatarUrl}
                  onChange={(e) => setAvatarUrl(e.target.value)}
                  className={`${inputClass} font-sans`}
                />
                {error && <p className="text-sm text-danger">{error}</p>}
                <button
                  type="submit"
                  className="rounded-btn bg-tenant py-2.5 text-sm font-medium text-white shadow-sm hover:bg-tenant-dark"
                >
                  เริ่มใช้งาน Hopak
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
