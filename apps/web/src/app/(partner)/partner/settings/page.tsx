'use client';

import { useEffect, useRef, useState } from 'react';
import { apiClient } from '@/lib/api-client';
import { useLang } from '@/hooks/useLang';
import { THAI_BANKS } from '@/lib/thaiBanks';
import type { Dorm, User } from '@hopak/shared';

const inputClass = 'h-11 rounded-lg border border-card-border bg-white px-3.5 text-sm text-ink';

function BankIcon({ name, size = 22 }: { name: string; size?: number }) {
  const bank = THAI_BANKS.find((b) => b.name === name);
  if (!bank) {
    return (
      <span
        style={{ width: size, height: size }}
        className="flex shrink-0 items-center justify-center rounded-full bg-surface-canvas text-[9px] font-bold text-ink-faint"
      >
        ?
      </span>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={bank.logo}
      alt={bank.name}
      style={{ width: size, height: size }}
      className="shrink-0 rounded-full object-cover"
    />
  );
}

function BankPicker({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (name: string) => void;
  placeholder: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`${inputClass} flex w-full items-center gap-2.5 text-left`}
      >
        {value ? <BankIcon name={value} /> : <span className="h-[22px] w-[22px] shrink-0 rounded-full bg-surface-canvas" />}
        <span className={value ? 'text-ink' : 'text-ink-faint'}>{value || placeholder}</span>
      </button>
      {open && (
        <div className="absolute z-20 mt-1.5 max-h-72 w-full overflow-y-auto rounded-lg border border-card-border bg-white py-1.5 shadow-card">
          {THAI_BANKS.map((bank) => (
            <button
              key={bank.name}
              type="button"
              onClick={() => {
                onChange(bank.name);
                setOpen(false);
              }}
              className="flex w-full items-center gap-2.5 px-3.5 py-2 text-left text-sm hover:bg-surface-canvas"
            >
              <BankIcon name={bank.name} />
              <span className="text-ink">{bank.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

const TEXT = {
  th: {
    title: 'ตั้งค่า',
    ownerInfo: 'ข้อมูลเจ้าของหอพัก',
    ownerName: 'ชื่อเจ้าของ',
    dormName: 'ชื่อหอพัก',
    payments: 'การรับเงิน',
    bankPlaceholder: 'ธนาคาร',
    accountNamePlaceholder: 'ชื่อบัญชี (ชื่อ-นามสกุลตามหน้าบัญชี)',
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
    accountNamePlaceholder: 'Account name (as shown on the bank account)',
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
  const [accountName, setAccountName] = useState('');
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
        setAccountName(u.bankAccountName ?? '');
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
        bankAccountName: accountName,
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
          <BankPicker value={bankName} onChange={setBankName} placeholder={t.bankPlaceholder} />
          <input
            placeholder={t.accountNamePlaceholder}
            value={accountName}
            onChange={(e) => setAccountName(e.target.value)}
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
