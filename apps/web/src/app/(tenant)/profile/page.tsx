'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api-client';
import { getToken, clearToken } from '@/lib/auth';
import { resetSocket } from '@/lib/ws';
import { normalizeStatus } from '@/lib/normalize';
import type { OwnerRequest, User } from '@hopak/shared';
import { PageLoader } from '@/components/PageLoader';

const inputClass =
  'h-11 w-full rounded-btn border border-card-border px-3.5 text-sm text-ink placeholder:text-ink-faint focus:border-tenant focus:outline-none dark:border-white/10 dark:bg-[#1a1a19] dark:text-white';

type Tab = 'profile' | 'security';

function NavItem({
  label,
  active,
  disabled,
  onClick,
  href,
}: {
  label: string;
  active?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  href?: string;
}) {
  const className = `flex items-center rounded-lg px-3.5 py-2.5 text-sm ${
    active
      ? 'bg-tenant/10 font-semibold text-tenant'
      : disabled
        ? 'cursor-not-allowed text-ink-faint'
        : 'text-ink-subtitle hover:bg-black/[0.03] dark:hover:bg-white/5'
  }`;

  if (href && !disabled) {
    return (
      <Link href={href} className={className}>
        {label}
      </Link>
    );
  }
  return (
    <button
      type="button"
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      title={disabled ? 'ยังไม่เปิดให้ใช้งาน' : undefined}
      className={`${className} w-full text-left`}
    >
      {label}
    </button>
  );
}

function ProfileTab({ user, onSaved }: { user: User; onSaved: (u: User) => void }) {
  const [name, setName] = useState(user.name);
  const [phone, setPhone] = useState(user.phone ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ownerRequest, setOwnerRequest] = useState<OwnerRequest | null>(null);
  const [requesting, setRequesting] = useState(false);
  const [saved, setSaved] = useState(false);

  async function handleSave() {
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const updated = await apiClient.patch<User>('/users/me', { name, phone: phone || undefined });
      onSaved(updated);
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'บันทึกไม่สำเร็จ');
    } finally {
      setSaving(false);
    }
  }

  useEffect(() => {
    apiClient.get<OwnerRequest | null>('/users/me/owner-request').then(setOwnerRequest).catch(() => {});
  }, []);

  async function requestOwner() {
    setRequesting(true);
    try {
      const req = await apiClient.post<OwnerRequest>('/users/me/become-owner');
      setOwnerRequest(req);
    } finally {
      setRequesting(false);
    }
  }

  const requestStatus = ownerRequest ? normalizeStatus(ownerRequest.status) : null;

  return (
    <div>
      <h2 className="text-xl font-bold text-ink-strong dark:text-white">ข้อมูลส่วนตัว</h2>
      <p className="mt-1 text-sm text-ink-subtitle">จัดการชื่อ อีเมล และเบอร์โทรของบัญชีคุณ</p>

      {user.role.toLowerCase() === 'tenant' && (
        <div className="mt-5 flex items-center gap-4 rounded-card bg-seller p-4 text-white">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/20 font-bold">H</div>
          <div className="flex-1">
            <p className="font-semibold">เปิดหอพักกับ Hopak</p>
            {requestStatus === 'pending' ? (
              <p className="text-sm text-white/85">ส่งคำขอแล้ว รอแอดมินอนุมัติ</p>
            ) : requestStatus === 'rejected' ? (
              <p className="text-sm text-white/85">คำขอก่อนหน้าถูกปฏิเสธ ลองส่งคำขอใหม่ได้</p>
            ) : (
              <p className="text-sm text-white/85">มีหอให้เช่า? ลงประกาศและรับการจอง</p>
            )}
          </div>
          {requestStatus !== 'pending' && (
            <button
              onClick={requestOwner}
              disabled={requesting}
              className="rounded-btn bg-white/15 px-4 py-2 text-sm font-medium hover:bg-white/25 disabled:opacity-60"
            >
              {requesting ? 'กำลังส่ง...' : 'ขอเป็นเจ้าของหอ'}
            </button>
          )}
        </div>
      )}

      <div className="mt-5 flex items-center gap-5 rounded-card border border-card-border bg-white p-5 dark:border-white/10 dark:bg-[#1a1a19]">
        <div className="flex h-[76px] w-[76px] shrink-0 items-center justify-center rounded-full bg-surface-canvas font-mono text-xs text-ink-faint">
          รูป
        </div>
        <div className="flex-1">
          <p className="font-semibold text-ink-strong dark:text-white">รูปโปรไฟล์</p>
          <p className="mt-0.5 text-xs text-ink-faint">รองรับลิงก์รูปภาพ แก้ไขได้ในโปรไฟล์ตอนสมัครสมาชิก</p>
        </div>
      </div>

      <div className="mt-5 rounded-card border border-card-border bg-white p-5 dark:border-white/10 dark:bg-[#1a1a19]">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-ink-subtitle">ชื่อผู้ใช้งาน</label>
            <input value={name} onChange={(e) => setName(e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-ink-subtitle">อีเมล</label>
            <div className={`${inputClass} flex items-center bg-surface-canvas font-sans text-ink-subtitle`}>
              {user.email ?? '—'}
            </div>
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-ink-subtitle">เบอร์โทรศัพท์</label>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className={`${inputClass} font-sans`}
              placeholder="ยังไม่ระบุ"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-ink-subtitle">บทบาท</label>
            <div className={`${inputClass} flex items-center bg-surface-canvas text-ink-subtitle`}>
              {user.role.toLowerCase() === 'owner' ? 'เจ้าของหอ' : user.role.toLowerCase() === 'admin' ? 'แอดมิน' : 'ผู้เช่า'}
            </div>
          </div>
        </div>

        {error && <p className="mt-3 text-sm text-danger">{error}</p>}
        {saved && <p className="mt-3 text-sm text-success">บันทึกข้อมูลแล้ว</p>}

        <div className="mt-5 flex justify-end">
          <button
            onClick={handleSave}
            disabled={saving}
            className="rounded-btn bg-tenant px-6 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-tenant-dark disabled:opacity-60"
          >
            {saving ? 'กำลังบันทึก...' : 'บันทึกข้อมูล'}
          </button>
        </div>
      </div>
    </div>
  );
}

function SecurityTab({ hasPassword }: { hasPassword: boolean }) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaved(false);
    if (newPassword !== confirmPassword) {
      setError('รหัสผ่านใหม่ไม่ตรงกัน');
      return;
    }
    setSaving(true);
    try {
      await apiClient.patch('/users/me/password', { currentPassword, newPassword });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'เปลี่ยนรหัสผ่านไม่สำเร็จ');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <h2 className="text-xl font-bold text-ink-strong dark:text-white">ความปลอดภัย</h2>
      <p className="mt-1 text-sm text-ink-subtitle">รหัสผ่านและการเข้าสู่ระบบ</p>

      <div className="mt-5 rounded-card border border-card-border bg-white p-5 dark:border-white/10 dark:bg-[#1a1a19]">
        <p className="font-semibold text-ink-strong dark:text-white">เปลี่ยนรหัสผ่าน</p>

        {!hasPassword ? (
          <p className="mt-3 text-sm text-ink-faint">บัญชีนี้ล็อกอินผ่าน Google ไม่มีรหัสผ่านให้เปลี่ยน</p>
        ) : (
          <form onSubmit={handleSubmit} className="mt-3 flex max-w-md flex-col gap-3.5">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-ink-subtitle">รหัสผ่านปัจจุบัน</label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className={inputClass}
                required
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-ink-subtitle">รหัสผ่านใหม่</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className={inputClass}
                minLength={6}
                required
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-ink-subtitle">ยืนยันรหัสผ่านใหม่</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className={inputClass}
                minLength={6}
                required
              />
            </div>
            {error && <p className="text-sm text-danger">{error}</p>}
            {saved && <p className="text-sm text-success">เปลี่ยนรหัสผ่านแล้ว</p>}
            <button
              type="submit"
              disabled={saving}
              className="self-start rounded-btn bg-tenant px-6 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-tenant-dark disabled:opacity-60"
            >
              {saving ? 'กำลังอัปเดต...' : 'อัปเดตรหัสผ่าน'}
            </button>
          </form>
        )}
      </div>

      <div className="mt-5 rounded-card border border-card-border bg-white p-5 dark:border-white/10 dark:bg-[#1a1a19]">
        <div className="flex items-center justify-between border-b border-card-border py-3.5 dark:border-white/10">
          <div>
            <p className="text-sm font-semibold text-ink-strong dark:text-white">ยืนยันตัวตนสองชั้น (2FA)</p>
            <p className="mt-0.5 text-xs text-ink-faint">รับรหัส OTP ทาง SMS ทุกครั้งที่เข้าสู่ระบบ</p>
          </div>
          <span
            title="ยังไม่เปิดให้ใช้งาน"
            className="cursor-not-allowed rounded-full bg-surface-canvas px-3 py-1 text-xs font-medium text-ink-faint"
          >
            เร็วๆ นี้
          </span>
        </div>
        <div className="flex items-center justify-between pt-3.5">
          <div>
            <p className="text-sm font-semibold text-ink-strong dark:text-white">อุปกรณ์ที่เข้าสู่ระบบ</p>
            <p className="mt-0.5 text-xs text-ink-faint">ยังไม่รองรับการดูรายการอุปกรณ์</p>
          </div>
          <span
            title="ยังไม่เปิดให้ใช้งาน"
            className="cursor-not-allowed rounded-full bg-surface-canvas px-3 py-1 text-xs font-medium text-ink-faint"
          >
            เร็วๆ นี้
          </span>
        </div>
      </div>
    </div>
  );
}

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [hasPassword, setHasPassword] = useState(true);
  const [tab, setTab] = useState<Tab>('profile');

  useEffect(() => {
    if (!getToken()) {
      router.replace('/login');
      return;
    }
    apiClient
      .get<User>('/users/me')
      .then((u) => {
        setUser(u);
        setHasPassword(!u.googleId);
      })
      .catch(() => router.replace('/login'));
  }, [router]);

  function handleLogout() {
    clearToken();
    resetSocket();
    router.push('/');
  }

  if (!user) return <PageLoader fullScreen />;

  const role = user.role.toLowerCase();

  return (
    <main className="mx-auto max-w-6xl p-6">
      <div className="flex items-start gap-7">
        <aside className="w-64 shrink-0 rounded-card border border-card-border bg-white p-3 dark:border-white/10 dark:bg-[#1a1a19]">
          <div className="flex items-center gap-3 px-2.5 py-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-surface-canvas font-mono text-xs text-ink-faint">
              รูป
            </div>
            <div>
              <p className="font-semibold text-ink-strong dark:text-white">{user.name}</p>
              <p className="mt-0.5 text-xs text-ink-faint">
                {role === 'owner' ? 'เจ้าของหอ' : role === 'admin' ? 'แอดมิน' : 'ผู้เช่า'}
              </p>
            </div>
          </div>
          <div className="my-2 h-px bg-card-border dark:bg-white/10" />
          <nav className="flex flex-col gap-1">
            <NavItem label="ข้อมูลส่วนตัว" active={tab === 'profile'} onClick={() => setTab('profile')} />
            <NavItem label="ความปลอดภัย" active={tab === 'security'} onClick={() => setTab('security')} />
            {role === 'owner' && <NavItem label="แดชบอร์ดเจ้าของหอ" href="/partner/dashboard" />}
            {role === 'admin' && <NavItem label="แดชบอร์ดแอดมิน" href="/admin/dashboard" />}
            {role === 'tenant' && (
              <>
                <NavItem label="Hopak Rewards" disabled />
                <NavItem label="วิธีการชำระเงิน" disabled />
                <NavItem label="หอที่บันทึก" href="/saved" />
              </>
            )}
            <NavItem label="การแจ้งเตือน" href="/notifications" />
          </nav>
          <div className="my-2 h-px bg-card-border dark:bg-white/10" />
          <button
            onClick={handleLogout}
            className="w-full rounded-lg px-3.5 py-2.5 text-left text-sm font-medium text-danger hover:bg-danger/5"
          >
            ออกจากระบบ
          </button>
        </aside>

        <section className="min-w-0 flex-1">
          {tab === 'profile' ? <ProfileTab user={user} onSaved={setUser} /> : <SecurityTab hasPassword={hasPassword} />}
        </section>
      </div>
    </main>
  );
}
