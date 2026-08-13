'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiClient } from '@/lib/api-client';
import { getToken, clearToken } from '@/lib/auth';
import { useLang } from '@/hooks/useLang';
import type { Dorm, User } from '@hopak/shared';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

const TEXT = {
  th: {
    changePhoto: 'เปลี่ยนรูป',
    uploading: 'กำลังอัปโหลด...',
    photoError: 'อัปโหลดรูปไม่สำเร็จ',
    photoHint: 'กดที่รูปเพื่อเปลี่ยนรูปโปรไฟล์ · รองรับ JPG, PNG',
    roleOwner: 'เจ้าของหอพัก',
    dormsLabel: 'หอพักของคุณ',
    noDorm: 'ยังไม่มีหอพักในระบบ',
    verified: 'ยืนยันอีเมลแล้ว',
    unverified: 'ยังไม่ยืนยันอีเมล',

    infoTitle: 'ข้อมูลส่วนตัว',
    nameLabel: 'ชื่อ-นามสกุล',
    emailLabel: 'อีเมล',
    phoneLabel: 'เบอร์โทรศัพท์',
    emailReadonly: 'อีเมลเปลี่ยนเองไม่ได้ ติดต่อแอดมินหากต้องการเปลี่ยน',
    save: 'บันทึกข้อมูล',
    saving: 'กำลังบันทึก...',
    saved: 'บันทึกแล้ว',
    saveError: 'บันทึกไม่สำเร็จ',

    pwTitle: 'รหัสผ่าน',
    currentPw: 'รหัสผ่านปัจจุบัน',
    newPw: 'รหัสผ่านใหม่',
    confirmPw: 'ยืนยันรหัสผ่านใหม่',
    pwSubmit: 'อัปเดตรหัสผ่าน',
    pwSaving: 'กำลังอัปเดต...',
    pwSaved: 'เปลี่ยนรหัสผ่านแล้ว',
    pwMismatch: 'รหัสผ่านใหม่ทั้ง 2 ช่องไม่ตรงกัน',
    pwFill: 'กรุณากรอกให้ครบทุกช่อง',
    pwError: 'เปลี่ยนรหัสผ่านไม่สำเร็จ',

    payoutTitle: 'บัญชีรับเงิน',
    payoutDesc: 'ตั้งค่าบัญชีที่ใช้รับยอดโอนจาก Hoprak ได้ที่หน้าตั้งค่า',
    payoutLink: 'ไปหน้าตั้งค่า →',
  },
  en: {
    changePhoto: 'Change photo',
    uploading: 'Uploading...',
    photoError: 'Photo upload failed',
    photoHint: 'Tap the photo to change it · JPG, PNG supported',
    roleOwner: 'Dorm owner',
    dormsLabel: 'Your dorms',
    noDorm: 'No dorms yet',
    verified: 'Email verified',
    unverified: 'Email not verified',

    infoTitle: 'Personal info',
    nameLabel: 'Full name',
    emailLabel: 'Email',
    phoneLabel: 'Phone number',
    emailReadonly: 'Email cannot be changed here — contact an admin if you need to change it',
    save: 'Save',
    saving: 'Saving...',
    saved: 'Saved',
    saveError: 'Save failed',

    pwTitle: 'Password',
    currentPw: 'Current password',
    newPw: 'New password',
    confirmPw: 'Confirm new password',
    pwSubmit: 'Update password',
    pwSaving: 'Updating...',
    pwSaved: 'Password updated',
    pwMismatch: 'The two new passwords do not match',
    pwFill: 'Please fill in every field',
    pwError: 'Could not change password',

    payoutTitle: 'Payout account',
    payoutDesc: 'Set up the account that receives your Hoprak transfers on the settings page.',
    payoutLink: 'Go to settings →',
  },
};

const inputClass =
  'h-11 w-full rounded-[11px] border border-card-border bg-white px-3.5 text-sm text-ink outline-none placeholder:text-ink-faint focus:border-tenant';
const labelClass = 'mb-1.5 block text-[13px] font-semibold text-ink-body';
const cardClass = 'rounded-card-lg border border-card-border bg-white p-5 shadow-card';

export default function PartnerProfilePage() {
  const { lang } = useLang();
  const t = TEXT[lang];
  const [user, setUser] = useState<User | null>(null);
  const [dorms, setDorms] = useState<Dorm[]>([]);

  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwSaving, setPwSaving] = useState(false);
  const [pwSaved, setPwSaved] = useState(false);
  const [pwError, setPwError] = useState<string | null>(null);

  useEffect(() => {
    apiClient
      .get<User>('/users/me')
      .then((u) => {
        setUser(u);
        setName(u.name ?? '');
        setPhone(u.phone ?? '');
      })
      .catch(() => {});
    apiClient.get<Dorm[]>('/dorms/mine').then(setDorms).catch(() => setDorms([]));
  }, []);

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarUploading(true);
    setAvatarError(null);
    try {
      const formData = new FormData();
      formData.append('avatar', file);
      // multipart ส่งผ่าน fetch ตรง — apiClient ตั้ง Content-Type เป็น json ตายตัว ใช้กับไฟล์ไม่ได้
      const res = await fetch(`${API_URL}/users/me/avatar`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${getToken()}` },
        body: formData,
      });
      if (!res.ok) throw new Error();
      setUser(await res.json());
    } catch {
      setAvatarError(t.photoError);
    } finally {
      setAvatarUploading(false);
      e.target.value = '';
    }
  }

  async function handleSaveInfo(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaved(false);
    setSaveError(null);
    try {
      const updated = await apiClient.patch<User>('/users/me', { name, phone: phone || undefined });
      setUser(updated);
      setSaved(true);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : t.saveError);
    } finally {
      setSaving(false);
    }
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    setPwError(null);
    setPwSaved(false);
    if (!currentPassword || !newPassword || !confirmPassword) {
      setPwError(t.pwFill);
      return;
    }
    if (newPassword !== confirmPassword) {
      setPwError(t.pwMismatch);
      return;
    }
    setPwSaving(true);
    try {
      await apiClient.patch('/users/me/password', { currentPassword, newPassword });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setPwSaved(true);
      // เปลี่ยนรหัสแล้วทุกเซสชันถูกตัดทิ้ง (รวมเครื่องนี้) — token เดิมใช้ไม่ได้แล้ว ต้องล็อกอินใหม่
      clearToken();
      setTimeout(() => window.location.replace('/partner-login?error=password_changed'), 1200);
    } catch (err) {
      setPwError(err instanceof Error ? err.message : t.pwError);
    } finally {
      setPwSaving(false);
    }
  }

  const initials = (user?.name ?? '').trim().slice(0, 2) || 'อ';

  return (
    <div className="mx-auto max-w-3xl">
      {/* ===== HEADER CARD ===== */}
      <div className={cardClass}>
        <div className="flex flex-col items-center gap-4 text-center sm:flex-row sm:items-center sm:text-left">
          <label className="group relative cursor-pointer">
            <span className="flex h-[88px] w-[88px] items-center justify-center overflow-hidden rounded-pill bg-gradient-to-br from-seller to-seller-dark font-sans text-2xl font-bold text-white">
              {user?.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={user.avatarUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                initials
              )}
            </span>
            <span className="absolute inset-0 flex items-center justify-center rounded-pill bg-black/55 text-[11px] font-semibold text-white opacity-0 transition-opacity group-hover:opacity-100">
              {avatarUploading ? t.uploading : t.changePhoto}
            </span>
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleAvatarChange}
              disabled={avatarUploading}
            />
          </label>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center justify-center gap-2.5 sm:justify-start">
              <h2 className="text-xl font-bold text-ink-strong">{user?.name ?? '—'}</h2>
              <span
                className={`rounded-pill px-2.5 py-1 text-[11.5px] font-bold ${
                  user?.emailVerified ? 'bg-success-tint text-[#12704A]' : 'bg-warning-tint text-warning'
                }`}
              >
                {user?.emailVerified ? t.verified : t.unverified}
              </span>
            </div>
            <p className="mt-1 text-sm text-ink-subtitle">
              {t.roleOwner}
              {user?.email && ` · ${user.email}`}
            </p>
            <p className="mt-1 text-[12.5px] text-ink-faint">
              {t.dormsLabel}: {dorms.map((d) => d.name).join(', ') || t.noDorm}
            </p>
            <p className="mt-2 text-[11.5px] text-ink-faint">{t.photoHint}</p>
            {avatarError && <p className="mt-1 text-[12.5px] text-danger">{avatarError}</p>}
          </div>
        </div>
      </div>

      {/* ===== PERSONAL INFO ===== */}
      <div className={`mt-4 ${cardClass}`}>
        <h3 className="mb-4 font-semibold text-ink-strong">{t.infoTitle}</h3>
        <form onSubmit={handleSaveInfo} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className={labelClass}>{t.nameLabel}</label>
            <input value={name} onChange={(e) => setName(e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>{t.phoneLabel}</label>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className={`${inputClass} font-sans`}
            />
          </div>
          <div className="sm:col-span-2">
            <label className={labelClass}>{t.emailLabel}</label>
            <input value={user?.email ?? ''} readOnly className={`${inputClass} bg-surface-canvas text-ink-muted`} />
            <p className="mt-1.5 text-[11.5px] text-ink-faint">{t.emailReadonly}</p>
          </div>
          <div className="flex flex-wrap items-center gap-3 sm:col-span-2">
            <button
              type="submit"
              disabled={saving}
              className="rounded-[11px] bg-tenant px-5 py-2.5 text-sm font-semibold text-white hover:bg-tenant-dark disabled:opacity-60"
            >
              {saving ? t.saving : t.save}
            </button>
            {saved && <span className="text-sm text-success">{t.saved}</span>}
            {saveError && <span className="text-sm text-danger">{saveError}</span>}
          </div>
        </form>
      </div>

      {/* ===== PASSWORD ===== */}
      <div className={`mt-4 ${cardClass}`}>
        <h3 className="mb-4 font-semibold text-ink-strong">{t.pwTitle}</h3>
        <form onSubmit={handleChangePassword} className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <label className={labelClass}>{t.currentPw}</label>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>{t.newPw}</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>{t.confirmPw}</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className={inputClass}
            />
          </div>
          <div className="flex flex-wrap items-center gap-3 sm:col-span-3">
            <button
              type="submit"
              disabled={pwSaving}
              className="rounded-[11px] bg-tenant px-5 py-2.5 text-sm font-semibold text-white hover:bg-tenant-dark disabled:opacity-60"
            >
              {pwSaving ? t.pwSaving : t.pwSubmit}
            </button>
            {pwSaved && <span className="text-sm text-success">{t.pwSaved}</span>}
            {pwError && <span className="text-sm text-danger">{pwError}</span>}
          </div>
        </form>
      </div>

      {/* ===== PAYOUT POINTER ===== */}
      <div className={`mt-4 ${cardClass}`}>
        <h3 className="font-semibold text-ink-strong">{t.payoutTitle}</h3>
        <p className="mt-1.5 text-[13.5px] text-ink-subtitle">{t.payoutDesc}</p>
        <Link href="/partner/settings" className="mt-2.5 inline-block text-sm font-semibold text-tenant">
          {t.payoutLink}
        </Link>
      </div>
    </div>
  );
}
