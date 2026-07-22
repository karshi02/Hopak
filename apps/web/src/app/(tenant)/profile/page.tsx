'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api-client';
import { getToken, clearToken } from '@/lib/auth';
import { resetSocket } from '@/lib/ws';
import { normalizeStatus } from '@/lib/normalize';
import { useLang, type Lang } from '@/hooks/useLang';
import type { OwnerRequest, User } from '@hopak/shared';
import { PageLoader } from '@/components/PageLoader';

const inputClass =
  'h-11 w-full rounded-btn border border-card-border px-3.5 text-sm text-ink placeholder:text-ink-faint focus:border-tenant focus:outline-none dark:border-white/10 dark:bg-[#1a1a19] dark:text-white';

type Tab = 'profile' | 'security';

const TEXT = {
  th: {
    disabledTitle: 'ยังไม่เปิดให้ใช้งาน',
    profileTitle: 'ข้อมูลส่วนตัว',
    profileSubtitle: 'จัดการชื่อ อีเมล และเบอร์โทรของบัญชีคุณ',
    becomeOwnerTitle: 'เปิดหอพักกับ Hopak',
    ownerPending: 'ส่งคำขอแล้ว รอแอดมินอนุมัติ',
    ownerRejected: 'คำขอก่อนหน้าถูกปฏิเสธ ลองส่งคำขอใหม่ได้',
    ownerPitch: 'มีหอให้เช่า? ลงประกาศและรับการจอง',
    sendingRequest: 'กำลังส่ง...',
    requestOwner: 'ขอเป็นเจ้าของหอ',
    avatarLabel: 'รูป',
    profilePhoto: 'รูปโปรไฟล์',
    profilePhotoHint: 'รองรับลิงก์รูปภาพ แก้ไขได้ในโปรไฟล์ตอนสมัครสมาชิก',
    usernameLabel: 'ชื่อผู้ใช้งาน',
    emailLabel: 'อีเมล',
    phoneLabel: 'เบอร์โทรศัพท์',
    phoneNotSet: 'ยังไม่ระบุ',
    roleLabel: 'บทบาท',
    roleOwner: 'เจ้าของหอ',
    roleAdmin: 'แอดมิน',
    roleTenant: 'ผู้เช่า',
    saveError: 'บันทึกไม่สำเร็จ',
    savedProfile: 'บันทึกข้อมูลแล้ว',
    saving: 'กำลังบันทึก...',
    saveInfo: 'บันทึกข้อมูล',
    securityTitle: 'ความปลอดภัย',
    securitySubtitle: 'รหัสผ่านและการเข้าสู่ระบบ',
    changePassword: 'เปลี่ยนรหัสผ่าน',
    googleOnlyNote: 'บัญชีนี้ล็อกอินผ่าน Google ไม่มีรหัสผ่านให้เปลี่ยน',
    currentPassword: 'รหัสผ่านปัจจุบัน',
    newPassword: 'รหัสผ่านใหม่',
    confirmPassword: 'ยืนยันรหัสผ่านใหม่',
    passwordMismatch: 'รหัสผ่านใหม่ไม่ตรงกัน',
    passwordChangeError: 'เปลี่ยนรหัสผ่านไม่สำเร็จ',
    passwordChanged: 'เปลี่ยนรหัสผ่านแล้ว',
    updating: 'กำลังอัปเดต...',
    updatePassword: 'อัปเดตรหัสผ่าน',
    twoFactor: 'ยืนยันตัวตนสองชั้น (2FA)',
    twoFactorHint: 'รับรหัส OTP ทาง SMS ทุกครั้งที่เข้าสู่ระบบ',
    comingSoon: 'เร็วๆ นี้',
    loginDevices: 'อุปกรณ์ที่เข้าสู่ระบบ',
    loginDevicesHint: 'ยังไม่รองรับการดูรายการอุปกรณ์',
    navProfile: 'ข้อมูลส่วนตัว',
    navSecurity: 'ความปลอดภัย',
    navOwnerDashboard: 'แดชบอร์ดเจ้าของหอ',
    navAdminDashboard: 'แดชบอร์ดแอดมิน',
    navRewards: 'Hopak Rewards',
    navPaymentMethods: 'วิธีการชำระเงิน',
    navSaved: 'หอที่บันทึก',
    navNotifications: 'การแจ้งเตือน',
    logout: 'ออกจากระบบ',
  },
  en: {
    disabledTitle: 'Not enabled yet',
    profileTitle: 'Profile',
    profileSubtitle: 'Manage your name, email, and phone number',
    becomeOwnerTitle: 'List your dorm with Hopak',
    ownerPending: 'Request sent, awaiting admin approval',
    ownerRejected: 'Your previous request was rejected — you can try again',
    ownerPitch: 'Have a dorm to rent? List it and start receiving bookings',
    sendingRequest: 'Sending...',
    requestOwner: 'Request to become an owner',
    avatarLabel: 'Photo',
    profilePhoto: 'Profile photo',
    profilePhotoHint: 'Supports an image link, editable from the sign-up profile step',
    usernameLabel: 'Username',
    emailLabel: 'Email',
    phoneLabel: 'Phone number',
    phoneNotSet: 'Not set',
    roleLabel: 'Role',
    roleOwner: 'Owner',
    roleAdmin: 'Admin',
    roleTenant: 'Tenant',
    saveError: 'Failed to save',
    savedProfile: 'Saved',
    saving: 'Saving...',
    saveInfo: 'Save',
    securityTitle: 'Security',
    securitySubtitle: 'Password and login',
    changePassword: 'Change password',
    googleOnlyNote: 'This account logs in via Google, no password to change',
    currentPassword: 'Current password',
    newPassword: 'New password',
    confirmPassword: 'Confirm new password',
    passwordMismatch: 'New passwords do not match',
    passwordChangeError: 'Failed to change password',
    passwordChanged: 'Password changed',
    updating: 'Updating...',
    updatePassword: 'Update password',
    twoFactor: 'Two-factor authentication (2FA)',
    twoFactorHint: 'Get an OTP via SMS every time you log in',
    comingSoon: 'Coming soon',
    loginDevices: 'Logged-in devices',
    loginDevicesHint: 'Viewing device list is not supported yet',
    navProfile: 'Profile',
    navSecurity: 'Security',
    navOwnerDashboard: 'Owner dashboard',
    navAdminDashboard: 'Admin dashboard',
    navRewards: 'Hopak Rewards',
    navPaymentMethods: 'Payment methods',
    navSaved: 'Saved dorms',
    navNotifications: 'Notifications',
    logout: 'Log out',
  },
};
type T = (typeof TEXT)['th'];

function NavItem({
  label,
  active,
  disabled,
  disabledTitle,
  onClick,
  href,
}: {
  label: string;
  active?: boolean;
  disabled?: boolean;
  disabledTitle?: string;
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
      title={disabled ? disabledTitle : undefined}
      className={`${className} w-full text-left`}
    >
      {label}
    </button>
  );
}

function ProfileTab({ user, onSaved, t }: { user: User; onSaved: (u: User) => void; t: T }) {
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
      setError(err instanceof Error ? err.message : t.saveError);
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
      <h2 className="text-xl font-bold text-ink-strong dark:text-white">{t.profileTitle}</h2>
      <p className="mt-1 text-sm text-ink-subtitle">{t.profileSubtitle}</p>

      {user.role.toLowerCase() === 'tenant' && (
        <div className="mt-5 flex items-center gap-4 rounded-card bg-seller p-4 text-white">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/20 font-bold">H</div>
          <div className="flex-1">
            <p className="font-semibold">{t.becomeOwnerTitle}</p>
            {requestStatus === 'pending' ? (
              <p className="text-sm text-white/85">{t.ownerPending}</p>
            ) : requestStatus === 'rejected' ? (
              <p className="text-sm text-white/85">{t.ownerRejected}</p>
            ) : (
              <p className="text-sm text-white/85">{t.ownerPitch}</p>
            )}
          </div>
          {requestStatus !== 'pending' && (
            <button
              onClick={requestOwner}
              disabled={requesting}
              className="rounded-btn bg-white/15 px-4 py-2 text-sm font-medium hover:bg-white/25 disabled:opacity-60"
            >
              {requesting ? t.sendingRequest : t.requestOwner}
            </button>
          )}
        </div>
      )}

      <div className="mt-5 flex items-center gap-5 rounded-card border border-card-border bg-white p-5 dark:border-white/10 dark:bg-[#1a1a19]">
        <div className="flex h-[76px] w-[76px] shrink-0 items-center justify-center rounded-full bg-surface-canvas font-mono text-xs text-ink-faint">
          {t.avatarLabel}
        </div>
        <div className="flex-1">
          <p className="font-semibold text-ink-strong dark:text-white">{t.profilePhoto}</p>
          <p className="mt-0.5 text-xs text-ink-faint">{t.profilePhotoHint}</p>
        </div>
      </div>

      <div className="mt-5 rounded-card border border-card-border bg-white p-5 dark:border-white/10 dark:bg-[#1a1a19]">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-ink-subtitle">{t.usernameLabel}</label>
            <input value={name} onChange={(e) => setName(e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-ink-subtitle">{t.emailLabel}</label>
            <div className={`${inputClass} flex items-center bg-surface-canvas font-sans text-ink-subtitle`}>
              {user.email ?? '—'}
            </div>
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-ink-subtitle">{t.phoneLabel}</label>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className={`${inputClass} font-sans`}
              placeholder={t.phoneNotSet}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-ink-subtitle">{t.roleLabel}</label>
            <div className={`${inputClass} flex items-center bg-surface-canvas text-ink-subtitle`}>
              {user.role.toLowerCase() === 'owner' ? t.roleOwner : user.role.toLowerCase() === 'admin' ? t.roleAdmin : t.roleTenant}
            </div>
          </div>
        </div>

        {error && <p className="mt-3 text-sm text-danger">{error}</p>}
        {saved && <p className="mt-3 text-sm text-success">{t.savedProfile}</p>}

        <div className="mt-5 flex justify-end">
          <button
            onClick={handleSave}
            disabled={saving}
            className="rounded-btn bg-tenant px-6 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-tenant-dark disabled:opacity-60"
          >
            {saving ? t.saving : t.saveInfo}
          </button>
        </div>
      </div>
    </div>
  );
}

function SecurityTab({ hasPassword, t }: { hasPassword: boolean; t: T }) {
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
      setError(t.passwordMismatch);
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
      setError(err instanceof Error ? err.message : t.passwordChangeError);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <h2 className="text-xl font-bold text-ink-strong dark:text-white">{t.securityTitle}</h2>
      <p className="mt-1 text-sm text-ink-subtitle">{t.securitySubtitle}</p>

      <div className="mt-5 rounded-card border border-card-border bg-white p-5 dark:border-white/10 dark:bg-[#1a1a19]">
        <p className="font-semibold text-ink-strong dark:text-white">{t.changePassword}</p>

        {!hasPassword ? (
          <p className="mt-3 text-sm text-ink-faint">{t.googleOnlyNote}</p>
        ) : (
          <form onSubmit={handleSubmit} className="mt-3 flex max-w-md flex-col gap-3.5">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-ink-subtitle">{t.currentPassword}</label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className={inputClass}
                required
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-ink-subtitle">{t.newPassword}</label>
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
              <label className="mb-1.5 block text-xs font-medium text-ink-subtitle">{t.confirmPassword}</label>
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
            {saved && <p className="text-sm text-success">{t.passwordChanged}</p>}
            <button
              type="submit"
              disabled={saving}
              className="self-start rounded-btn bg-tenant px-6 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-tenant-dark disabled:opacity-60"
            >
              {saving ? t.updating : t.updatePassword}
            </button>
          </form>
        )}
      </div>

      <div className="mt-5 rounded-card border border-card-border bg-white p-5 dark:border-white/10 dark:bg-[#1a1a19]">
        <div className="flex items-center justify-between border-b border-card-border py-3.5 dark:border-white/10">
          <div>
            <p className="text-sm font-semibold text-ink-strong dark:text-white">{t.twoFactor}</p>
            <p className="mt-0.5 text-xs text-ink-faint">{t.twoFactorHint}</p>
          </div>
          <span
            title={t.disabledTitle}
            className="cursor-not-allowed rounded-full bg-surface-canvas px-3 py-1 text-xs font-medium text-ink-faint"
          >
            {t.comingSoon}
          </span>
        </div>
        <div className="flex items-center justify-between pt-3.5">
          <div>
            <p className="text-sm font-semibold text-ink-strong dark:text-white">{t.loginDevices}</p>
            <p className="mt-0.5 text-xs text-ink-faint">{t.loginDevicesHint}</p>
          </div>
          <span
            title={t.disabledTitle}
            className="cursor-not-allowed rounded-full bg-surface-canvas px-3 py-1 text-xs font-medium text-ink-faint"
          >
            {t.comingSoon}
          </span>
        </div>
      </div>
    </div>
  );
}

export default function ProfilePage() {
  const router = useRouter();
  const { lang } = useLang();
  const t = TEXT[lang];
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

  if (!user) return <PageLoader />;

  const role = user.role.toLowerCase();

  return (
    <main className="mx-auto max-w-6xl p-6">
      <div className="flex items-start gap-7">
        <aside className="w-64 shrink-0 rounded-card border border-card-border bg-white p-3 dark:border-white/10 dark:bg-[#1a1a19]">
          <div className="flex items-center gap-3 px-2.5 py-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-surface-canvas font-mono text-xs text-ink-faint">
              {t.avatarLabel}
            </div>
            <div>
              <p className="font-semibold text-ink-strong dark:text-white">{user.name}</p>
              <p className="mt-0.5 text-xs text-ink-faint">
                {role === 'owner' ? t.roleOwner : role === 'admin' ? t.roleAdmin : t.roleTenant}
              </p>
            </div>
          </div>
          <div className="my-2 h-px bg-card-border dark:bg-white/10" />
          <nav className="flex flex-col gap-1">
            <NavItem label={t.navProfile} active={tab === 'profile'} onClick={() => setTab('profile')} />
            <NavItem label={t.navSecurity} active={tab === 'security'} onClick={() => setTab('security')} />
            {role === 'owner' && <NavItem label={t.navOwnerDashboard} href="/partner/dashboard" />}
            {role === 'admin' && <NavItem label={t.navAdminDashboard} href="/admin/dashboard" />}
            {role === 'tenant' && (
              <>
                <NavItem label={t.navRewards} disabled disabledTitle={t.disabledTitle} />
                <NavItem label={t.navPaymentMethods} disabled disabledTitle={t.disabledTitle} />
                <NavItem label={t.navSaved} href="/saved" />
              </>
            )}
            <NavItem label={t.navNotifications} href="/notifications" />
          </nav>
          <div className="my-2 h-px bg-card-border dark:bg-white/10" />
          <button
            onClick={handleLogout}
            className="w-full rounded-lg px-3.5 py-2.5 text-left text-sm font-medium text-danger hover:bg-danger/5"
          >
            {t.logout}
          </button>
        </aside>

        <section className="min-w-0 flex-1">
          {tab === 'profile' ? <ProfileTab user={user} onSaved={setUser} t={t} /> : <SecurityTab hasPassword={hasPassword} t={t} />}
        </section>
      </div>
    </main>
  );
}
