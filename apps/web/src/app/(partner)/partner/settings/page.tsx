'use client';

import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api-client';
import type { Dorm, User } from '@hopak/shared';

const inputClass =
  'h-11 rounded-lg border border-card-border bg-surface-web px-3.5 text-sm text-ink dark:border-white/10 dark:bg-[#1a1a19] dark:text-white';

export default function PartnerSettingsPage() {
  const [user, setUser] = useState<User | null>(null);
  const [dorms, setDorms] = useState<Dorm[]>([]);
  const [bankName, setBankName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [promptpayId, setPromptpayId] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    apiClient.get<User>('/users/me').then(setUser);
    apiClient.get<Dorm[]>('/dorms/mine').then(setDorms);
  }, []);

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaved(true);
  }

  return (
    <div>
      <h1 className="text-xl font-bold text-ink-strong dark:text-white">ตั้งค่า</h1>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-card border border-card-border bg-white p-5 dark:border-white/10 dark:bg-[#1a1a19]">
          <h2 className="mb-3.5 font-semibold text-ink-strong dark:text-white">ข้อมูลเจ้าของหอพัก</h2>
          <div className="flex flex-col gap-3 text-sm">
            <div className="flex justify-between border-b border-card-border py-2.5 dark:border-white/10">
              <span className="text-ink-subtitle">ชื่อเจ้าของ</span>
              <span className="font-medium text-ink-strong dark:text-white">{user?.name ?? '—'}</span>
            </div>
            <div className="flex justify-between py-2.5">
              <span className="text-ink-subtitle">ชื่อหอพัก</span>
              <span className="font-medium text-ink-strong dark:text-white">
                {dorms.map((d) => d.name).join(', ') || '—'}
              </span>
            </div>
          </div>
        </div>

        <div className="rounded-card border border-card-border bg-white p-5 dark:border-white/10 dark:bg-[#1a1a19]">
          <h2 className="mb-3.5 font-semibold text-ink-strong dark:text-white">การรับเงิน</h2>
          <form onSubmit={handleSave} className="flex flex-col gap-3">
            <input
              placeholder="ธนาคาร"
              value={bankName}
              onChange={(e) => setBankName(e.target.value)}
              className={inputClass}
            />
            <input
              placeholder="เลขบัญชี"
              value={accountNumber}
              onChange={(e) => setAccountNumber(e.target.value)}
              className={`${inputClass} font-sans`}
            />
            <input
              placeholder="เบอร์ PromptPay"
              value={promptpayId}
              onChange={(e) => setPromptpayId(e.target.value)}
              className={`${inputClass} font-sans`}
            />
            <button
              type="submit"
              className="mt-1 rounded-btn bg-seller py-2.5 text-sm font-semibold text-white hover:bg-seller-dark"
            >
              บันทึกการตั้งค่า
            </button>
            {saved && <p className="text-sm text-seller">บันทึกแล้ว (ยังไม่เชื่อมต่อฐานข้อมูลจริง)</p>}
          </form>
          <p className="mt-3.5 text-xs leading-relaxed text-ink-faint">
            Hopak หักค่าบริการ 10% จากยอดขายผ่านระบบ แล้วโอนส่วนที่เหลือเข้าบัญชีนี้
          </p>
        </div>
      </div>
    </div>
  );
}
