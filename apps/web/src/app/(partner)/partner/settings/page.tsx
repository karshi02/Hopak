'use client';

import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api-client';
import { useLang } from '@/hooks/useLang';
import type { Dorm, User } from '@hopak/shared';

const inputClass = 'h-11 rounded-lg border border-card-border bg-white px-3.5 text-sm text-ink';

const TEXT = {
  th: {
    title: 'ตั้งค่า',
    ownerInfo: 'ข้อมูลเจ้าของหอพัก',
    ownerName: 'ชื่อเจ้าของ',
    dormName: 'ชื่อหอพัก',
    payments: 'การรับเงิน',
    bankPlaceholder: 'ธนาคาร',
    accountPlaceholder: 'เลขบัญชี',
    promptpayPlaceholder: 'เบอร์ PromptPay',
    save: 'บันทึกการตั้งค่า',
    saving: 'กำลังบันทึก...',
    saved: 'บันทึกแล้ว',
    saveError: 'บันทึกไม่สำเร็จ',
    feeNote: 'Hopak หักค่าบริการ 20% จากยอดขายผ่านระบบ (หอการค้ามหาสารคาม 10% + แพลตฟอร์ม 10%) แล้วโอนส่วนที่เหลือ 80% เข้าบัญชีนี้',
  },
  en: {
    title: 'Settings',
    ownerInfo: 'Owner Info',
    ownerName: 'Owner name',
    dormName: 'Dorm name',
    payments: 'Payments',
    bankPlaceholder: 'Bank',
    accountPlaceholder: 'Account number',
    promptpayPlaceholder: 'PromptPay number',
    save: 'Save settings',
    saving: 'Saving...',
    saved: 'Saved',
    saveError: 'Save failed',
    feeNote: 'Hopak takes a 20% service fee from platform sales (10% Mahasarakham Chamber of Commerce + 10% platform), then transfers the remaining 80% to this account.',
  },
};

export default function PartnerSettingsPage() {
  const { lang } = useLang();
  const t = TEXT[lang];
  const [user, setUser] = useState<User | null>(null);
  const [dorms, setDorms] = useState<Dorm[]>([]);
  const [bankName, setBankName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [promptpayId, setPromptpayId] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiClient
      .get<User>('/users/me')
      .then((u) => {
        setUser(u);
        setBankName(u.bankName ?? '');
        setAccountNumber(u.bankAccountNumber ?? '');
        setPromptpayId(u.promptpayId ?? '');
      })
      .catch(() => {});
    apiClient.get<Dorm[]>('/dorms/mine').then(setDorms).catch(() => setDorms([]));
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaved(false);
    setError(null);
    try {
      await apiClient.patch('/users/me', {
        bankName,
        bankAccountNumber: accountNumber,
        promptpayId,
      });
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : t.saveError);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <div className="rounded-card-lg border border-card-border bg-white p-5 shadow-card">
        <h2 className="mb-3.5 font-semibold text-ink-strong">{t.ownerInfo}</h2>
        <div className="flex flex-col gap-3 text-sm">
          <div className="flex justify-between border-b border-hairline py-2.5">
            <span className="text-ink-subtitle">{t.ownerName}</span>
            <span className="font-medium text-ink-strong">{user?.name ?? '—'}</span>
          </div>
          <div className="flex justify-between py-2.5">
            <span className="text-ink-subtitle">{t.dormName}</span>
            <span className="font-medium text-ink-strong">{dorms.map((d) => d.name).join(', ') || '—'}</span>
          </div>
        </div>
      </div>

      <div className="rounded-card-lg border border-card-border bg-white p-5 shadow-card">
        <h2 className="mb-3.5 font-semibold text-ink-strong">{t.payments}</h2>
        <form onSubmit={handleSave} className="flex flex-col gap-3">
          <input
            placeholder={t.bankPlaceholder}
            value={bankName}
            onChange={(e) => setBankName(e.target.value)}
            className={inputClass}
          />
          <input
            placeholder={t.accountPlaceholder}
            value={accountNumber}
            onChange={(e) => setAccountNumber(e.target.value)}
            className={`${inputClass} font-sans`}
          />
          <input
            placeholder={t.promptpayPlaceholder}
            value={promptpayId}
            onChange={(e) => setPromptpayId(e.target.value)}
            className={`${inputClass} font-sans`}
          />
          <button
            type="submit"
            disabled={saving}
            className="mt-1 rounded-btn bg-tenant py-2.5 text-sm font-semibold text-white hover:bg-tenant-dark disabled:opacity-60"
          >
            {saving ? t.saving : t.save}
          </button>
          {saved && <p className="text-sm text-success">{t.saved}</p>}
          {error && <p className="text-sm text-danger">{error}</p>}
        </form>
        <p className="mt-3.5 text-xs leading-relaxed text-ink-faint">{t.feeNote}</p>
      </div>
    </div>
  );
}
