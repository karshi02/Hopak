'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api-client';
import { getToken, clearToken } from '@/lib/auth';
import { resetSocket } from '@/lib/ws';
import { normalizeStatus } from '@/lib/normalize';
import { useLang, type Lang } from '@/hooks/useLang';
import { useBookings } from '@/hooks/useBookings';
import { useFavorites } from '@/hooks/useFavorites';
import { StarRating } from '@/components/StarRating';
import type { User } from '@hopak/shared';
import { PageLoader } from '@/components/PageLoader';
import { ContentSkeleton } from '@/components/RouteSkeleton';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

const TEXT = {
  th: {
    disabledTitle: 'ยังไม่เปิดให้ใช้งาน',
    comingSoon: 'เร็วๆ นี้',
    editProfile: 'แก้ไขโปรไฟล์',
    changePhoto: 'เปลี่ยนรูป',
    uploadingPhoto: 'กำลังอัปโหลด...',
    photoUploadError: 'อัปโหลดรูปไม่สำเร็จ',
    memberSince: (d: string) => `สมาชิกตั้งแต่ ${d}`,
    statActive: 'การจองที่ใช้งาน',
    statSaved: 'หอที่บันทึกไว้',
    statReviews: 'รีวิวที่เขียน',
    statTotal: 'การจองทั้งหมด',
    navOverview: 'ภาพรวม',
    navBookings: 'การจองของฉัน',
    navSaved: 'หอที่บันทึกไว้',
    navReviews: 'รีวิวของฉัน',
    navSettings: 'ตั้งค่าบัญชี',
    navOwnerDashboard: 'แดชบอร์ดเจ้าของหอ',
    navAdminDashboard: 'แดชบอร์ดแอดมิน',
    navNotifications: 'การแจ้งเตือน',
    logout: 'ออกจากระบบ',
    becomeOwnerTitle: 'เปิดหอพักกับ Hoprak',
    ownerPending: 'ส่งคำขอแล้ว รอแอดมินอนุมัติ',
    ownerRejected: 'คำขอก่อนหน้าถูกปฏิเสธ ลองส่งคำขอใหม่ได้',
    ownerPitch: 'มีหอให้เช่า? ลงประกาศและรับการจอง',
    sendingRequest: 'กำลังส่ง...',
    requestOwner: 'ขอเป็นเจ้าของหอ',
    ownerFormTitle: 'กรอกข้อมูลเพื่อขอเป็นเจ้าของหอ',
    fDorm: 'ชื่อหอพัก',
    fProvince: 'จังหวัด',
    fPhone: 'เบอร์ติดต่อ',
    fAddress: 'ที่อยู่หอพัก (ไม่บังคับ)',
    fNote: 'หมายเหตุถึงแอดมิน (ไม่บังคับ)',
    fDocs: 'เอกสารยืนยัน (บัตรประชาชน / โฉนด / ทะเบียนบ้าน)',
    fDocsHint: 'แนบอย่างน้อย 1 ไฟล์ เพื่อให้แอดมินตรวจสอบ',
    submitReq: 'ส่งคำขอ',
    cancelReq: 'ยกเลิก',
    formError: 'กรุณากรอกชื่อหอพัก จังหวัด เบอร์ติดต่อ และแนบเอกสารอย่างน้อย 1 ไฟล์',
    wStep: (n: number) => `ขั้นตอนที่ ${n} จาก 3`,
    wStep1: 'ข้อมูลหอพัก',
    wStep2: 'เอกสารยืนยัน',
    wStep3: 'ตรวจสอบและส่ง',
    wNext: 'ถัดไป',
    wBack: 'ย้อนกลับ',
    wReview: 'ตรวจสอบข้อมูลก่อนส่ง',
    wStep1Err: 'กรุณากรอกชื่อหอพัก จังหวัด และเบอร์ติดต่อ',
    wStep2Err: 'กรุณาแนบเอกสารอย่างน้อย 1 ไฟล์',
    wFilesN: (n: number) => `แนบแล้ว ${n} ไฟล์`,
    bookingsTitle: 'การจองของฉัน',
    viewDetail: 'ดูรายละเอียด',
    checkIn: 'เข้าอยู่',
    noBookings: 'ยังไม่มีการจอง',
    savedTitle: 'หอพักที่บันทึกไว้',
    noSaved: 'ยังไม่มีหอพักที่บันทึกไว้',
    perMonth: '/เดือน',
    fieldsTitle: 'ข้อมูลส่วนตัว',
    nameLabel: 'ชื่อ-นามสกุล',
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
    passwordTitle: 'รหัสผ่าน',
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
    loginDevices: 'อุปกรณ์ที่เข้าสู่ระบบ',
    logoutDevice: 'ออกจากระบบอุปกรณ์นี้',
    loggingOutDevice: 'กำลังออก...',
    noSessions: 'ไม่มีอุปกรณ์ที่เข้าสู่ระบบ',
    lastSeen: (d: string) => `ใช้งานล่าสุด ${d}`,
    sessionError: 'โหลดรายการอุปกรณ์ไม่สำเร็จ',
    verifiedBadge: 'ยืนยันอีเมลแล้ว',
    verifyTitle: 'ยืนยันตัวตนด้วย OTP',
    verifyDescIdle: 'เพิ่มความปลอดภัยให้บัญชี ด้วยการยืนยันอีเมลผ่านรหัส OTP',
    verifyDescDone: 'บัญชีนี้ยืนยันอีเมลเรียบร้อยแล้ว',
    verifyNoEmail: 'บัญชีนี้ไม่มีอีเมลผูกไว้ ยืนยันตัวตนด้วย OTP ไม่ได้',
    verifiedTag: 'ยืนยันแล้ว',
    unverifiedTag: 'ยังไม่ยืนยัน',
    sendOtp: 'ส่งรหัส OTP',
    sendingOtp: 'กำลังส่ง...',
    otpSentTo: (email: string) => `กรอกรหัส 6 หลักที่ส่งไปยัง ${email}`,
    verifyCode: 'ยืนยันรหัส',
    verifying: 'กำลังยืนยัน...',
    resendIn: (s: string) => `ไม่ได้รับรหัส? ส่งอีกครั้ง (${s})`,
    resend: 'ไม่ได้รับรหัส? ส่งอีกครั้ง',
    verifySuccess: 'ยืนยันตัวตนสำเร็จ! บัญชีของคุณได้รับการยืนยันด้วย OTP แล้ว',
    otpError: 'เกิดข้อผิดพลาด',
    statusLabel: {
      pending: 'รอชำระเงิน',
      paid: 'ชำระเงินแล้ว',
      cancelled: 'ยกเลิกแล้ว',
      completed: 'เสร็จสิ้น',
    } as Record<string, string>,
  },
  en: {
    disabledTitle: 'Not enabled yet',
    comingSoon: 'Coming soon',
    editProfile: 'Edit profile',
    changePhoto: 'Change photo',
    uploadingPhoto: 'Uploading...',
    photoUploadError: 'Failed to upload photo',
    memberSince: (d: string) => `Member since ${d}`,
    statActive: 'Active bookings',
    statSaved: 'Saved dorms',
    statReviews: 'Reviews written',
    statTotal: 'Total bookings',
    navOverview: 'Overview',
    navBookings: 'My bookings',
    navSaved: 'Saved dorms',
    navReviews: 'My reviews',
    navSettings: 'Account settings',
    navOwnerDashboard: 'Owner dashboard',
    navAdminDashboard: 'Admin dashboard',
    navNotifications: 'Notifications',
    logout: 'Log out',
    becomeOwnerTitle: 'List your dorm with Hoprak',
    ownerPending: 'Request sent, awaiting admin approval',
    ownerRejected: 'Your previous request was rejected — you can try again',
    ownerPitch: 'Have a dorm to rent? List it and start receiving bookings',
    sendingRequest: 'Sending...',
    requestOwner: 'Request to become an owner',
    ownerFormTitle: 'Fill in details to request owner access',
    fDorm: 'Dorm name',
    fProvince: 'Province',
    fPhone: 'Contact phone',
    fAddress: 'Dorm address (optional)',
    fNote: 'Note to admin (optional)',
    fDocs: 'Verification documents (ID card / deed / house registration)',
    fDocsHint: 'Attach at least 1 file for admin review',
    submitReq: 'Submit request',
    cancelReq: 'Cancel',
    formError: 'Please fill in dorm name, province, phone and attach at least 1 document',
    wStep: (n: number) => `Step ${n} of 3`,
    wStep1: 'Dorm details',
    wStep2: 'Verification documents',
    wStep3: 'Review & submit',
    wNext: 'Next',
    wBack: 'Back',
    wReview: 'Review before submitting',
    wStep1Err: 'Please fill in dorm name, province and phone',
    wStep2Err: 'Please attach at least 1 document',
    wFilesN: (n: number) => `${n} file(s) attached`,
    bookingsTitle: 'My bookings',
    viewDetail: 'View details',
    checkIn: 'Check-in',
    noBookings: 'No bookings yet',
    savedTitle: 'Saved dorms',
    noSaved: 'No saved dorms yet',
    perMonth: '/mo',
    fieldsTitle: 'Personal information',
    nameLabel: 'Full name',
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
    passwordTitle: 'Password',
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
    loginDevices: 'Logged-in devices',
    logoutDevice: 'Log out this device',
    loggingOutDevice: 'Logging out...',
    noSessions: 'No logged-in devices',
    lastSeen: (d: string) => `Last active ${d}`,
    sessionError: 'Failed to load devices',
    verifiedBadge: 'Email verified',
    verifyTitle: 'Verify identity with OTP',
    verifyDescIdle: 'Add security to your account by verifying your email via OTP',
    verifyDescDone: 'This account has verified its email',
    verifyNoEmail: "This account has no email on file, can't verify via OTP",
    verifiedTag: 'Verified',
    unverifiedTag: 'Not verified',
    sendOtp: 'Send OTP code',
    sendingOtp: 'Sending...',
    otpSentTo: (email: string) => `Enter the 6-digit code sent to ${email}`,
    verifyCode: 'Verify code',
    verifying: 'Verifying...',
    resendIn: (s: string) => `Didn't get a code? Resend (${s})`,
    resend: "Didn't get a code? Resend",
    verifySuccess: 'Verified! Your account email is now confirmed.',
    otpError: 'Something went wrong',
    statusLabel: {
      pending: 'Awaiting payment',
      paid: 'Paid',
      cancelled: 'Cancelled',
      completed: 'Completed',
    } as Record<string, string>,
  },
};
type T = (typeof TEXT)['th'];

function iconSvg(d: string, opts: { stroke?: string; w?: number; fill?: string } = {}) {
  const { stroke = 'currentColor', w = 1.8, fill = 'none' } = opts;
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill={fill}>
      <path d={d} stroke={stroke} strokeWidth={w} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const NAV_ICONS = {
  overview: 'M4 13h7V4H4v9zM13 20h7v-9h-7v9zM13 4v5h7V4h-7zM4 20h7v-5H4v5z',
  bookings: 'M8 4h13M8 12h13M8 20h13M3 4h.01M3 12h.01M3 20h.01',
  saved: 'M12 21s-8-4.5-8-11a4.5 4.5 0 018-2.8A4.5 4.5 0 0120 10c0 6.5-8 11-8 11z',
  reviews: 'M12 2l2.9 6.2 6.8.7-5.1 4.6 1.5 6.7L12 17.8 5.9 20.2l1.5-6.7L2.3 8.9l6.8-.7L12 2z',
  settings:
    'M12 15a3 3 0 100-6 3 3 0 000 6zM19 12a7 7 0 00-.1-1l2-1.6-2-3.4-2.4 1a7 7 0 00-1.7-1L14.5 3h-5l-.3 2.6a7 7 0 00-1.7 1l-2.4-1-2 3.4L3.1 11a7 7 0 000 2l-2 1.6 2 3.4 2.4-1a7 7 0 001.7 1l.3 2.4h5l.3-2.6a7 7 0 001.7-1l2.4 1 2-3.4-2-1.6a7 7 0 00.1-1z',
};

function scrollToId(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function NavRow({
  label,
  disabled,
  disabledTitle,
  onClick,
  href,
  d,
}: {
  label: string;
  disabled?: boolean;
  disabledTitle?: string;
  onClick?: () => void;
  href?: string;
  d: string;
}) {
  const inner = (
    <>
      <span className="flex w-[22px] justify-center">
        {iconSvg(d, { stroke: disabled ? '#C7CBD3' : '#8A909F' })}
      </span>
      <span className={`flex-1 text-[14.5px] font-semibold ${disabled ? 'text-ink-faint' : 'text-[#3A4050]'}`}>
        {label}
      </span>
    </>
  );
  const className = `mb-0.5 flex items-center gap-3 rounded-xl px-3.5 py-3 ${disabled ? 'cursor-not-allowed' : 'cursor-pointer hover:bg-[#F4F6FA]'}`;

  if (href && !disabled) {
    return (
      <Link href={href} className={className}>
        {inner}
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
      {inner}
    </button>
  );
}

function StatBox({ value, label, last }: { value: string | number; label: string; last?: boolean }) {
  return (
    <div className={`px-6 py-4 text-center ${last ? '' : 'border-r border-white/15'}`}>
      <div className="text-2xl font-bold text-white">{value}</div>
      <div className="mt-0.5 text-[12.5px] text-[#C6D5EE]">{label}</div>
    </div>
  );
}

function fieldBox(icon: React.ReactNode, value: string) {
  return (
    <div className="flex h-12 items-center gap-2.5 rounded-xl border border-[#E4E7EC] bg-[#F7F9FC] px-4">
      {icon}
      <span className="truncate text-[14.5px] font-semibold text-[#2A303C]">{value}</span>
    </div>
  );
}

function formatMemberSince(dateStr: string | undefined, lang: Lang) {
  if (!dateStr) return '—';
  const date = new Date(dateStr);
  return date.toLocaleDateString(lang === 'th' ? 'th-TH-u-ca-buddhist' : 'en-US', {
    month: 'short',
    year: 'numeric',
  });
}

function formatDate(dateStr: string, lang: Lang) {
  return new Date(dateStr).toLocaleDateString(lang === 'th' ? 'th-TH-u-ca-buddhist' : 'en-US', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function roomTypeLabel(type: string | undefined, lang: Lang) {
  const key = (type ?? '').toLowerCase();
  if (key === 'air') return lang === 'th' ? 'ห้องแอร์' : 'AC room';
  if (key === 'fan') return lang === 'th' ? 'ห้องพัดลม' : 'Fan room';
  return type ?? '—';
}

function statusBadgeStyle(status: string) {
  switch (status) {
    case 'paid':
    case 'completed':
      return 'bg-[#E7F7EF] text-[#12704A]';
    case 'confirmed':
      return 'bg-[#EAF1FF] text-tenant';
    case 'cancelled':
      return 'bg-[#FEF0F0] text-danger';
    default:
      return 'bg-[#FFF3E0] text-[#C77B14]';
  }
}

export default function ProfilePage() {
  const router = useRouter();
  const { lang } = useLang();
  const t = TEXT[lang];
  const [user, setUser] = useState<User | null>(null);
  const [hasPassword, setHasPassword] = useState(true);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarUploading(true);
    setAvatarError(null);
    try {
      const formData = new FormData();
      formData.append('avatar', file);
      const res = await fetch(`${API_URL}/users/me/avatar`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${getToken()}` },
        body: formData,
      });
      if (!res.ok) throw new Error();
      const updated: User = await res.json();
      setUser(updated);
    } catch {
      setAvatarError(t.photoUploadError);
    } finally {
      setAvatarUploading(false);
      e.target.value = '';
    }
  }

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
  const isTenant = role === 'tenant';

  return (
    <main className="mx-auto max-w-6xl p-4 sm:p-6">
      {/* HEADER */}
      <div
        id="top"
        className="relative overflow-hidden rounded-card-lg shadow-lg scroll-mt-24"
        style={{
          background: 'linear-gradient(135deg,#1E4FB0 0%,#2F6FE0 55%,#173A87 120%)',
          boxShadow: '0 16px 40px rgba(30,79,176,0.28)',
        }}
      >
        <div
          className="pointer-events-none absolute -right-16 -top-16 h-60 w-60 rounded-full blur-2xl"
          style={{ background: 'radial-gradient(circle,rgba(255,255,255,0.24),transparent 66%)' }}
        />
        <div
          className="pointer-events-none absolute -bottom-16 left-52 h-56 w-56 rounded-full blur-2xl"
          style={{ background: 'radial-gradient(circle,rgba(23,143,90,0.4),transparent 66%)' }}
        />
        <div className="relative flex flex-col gap-5 p-7 sm:flex-row sm:items-center">
          <label className="group relative flex h-24 w-24 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-full border-4 border-white/50 bg-gradient-to-br from-[#EAF1FF] to-[#B9CEF5] text-4xl font-bold text-tenant shadow-lg">
            {user.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={user.avatarUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              user.name.charAt(0)
            )}
            <span
              className={`absolute inset-0 flex items-center justify-center bg-black/50 text-xs font-semibold text-white transition-opacity ${
                avatarUploading ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
              }`}
            >
              {avatarUploading ? t.uploadingPhoto : t.changePhoto}
            </span>
            <input type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} disabled={avatarUploading} />
          </label>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2.5">
              <div className="text-[26px] font-bold text-white">{user.name}</div>
              {user.emailVerified && (
                <span className="flex items-center gap-1.5 rounded-pill border border-white/30 bg-white/[0.18] px-2.5 py-1 text-xs font-bold text-white">
                  {iconSvg('M12 3l7 4v5c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V7l7-4zM9 12l2 2 4-4', { stroke: '#7FE0A8', w: 2 })}
                  {t.verifiedBadge}
                </span>
              )}
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[13.5px] text-[#D3E0F5]">
              {user.email && (
                <span className="flex items-center gap-1.5">
                  {iconSvg('M3 5h18v14H3zM4 7l8 6 8-6', { stroke: '#D3E0F5', w: 1.7 })}
                  {user.email}
                </span>
              )}
              {user.phone && (
                <span className="flex items-center gap-1.5">
                  {iconSvg('M5 4h4l2 5-3 2a12 12 0 005 5l2-3 5 2v4a2 2 0 01-2 2A16 16 0 013 6a2 2 0 012-2z', {
                    stroke: '#D3E0F5',
                    w: 1.7,
                  })}
                  {user.phone}
                </span>
              )}
              <span className="flex items-center gap-1.5">
                {iconSvg('M12 7v5l3 3M21 12a9 9 0 11-18 0 9 9 0 0118 0z', { stroke: '#D3E0F5', w: 1.7 })}
                {t.memberSince(formatMemberSince(user.createdAt, lang))}
              </span>
            </div>
            {avatarError && <p className="mt-1.5 text-xs font-semibold text-[#FFB4B0]">{avatarError}</p>}
          </div>
          <button
            type="button"
            onClick={() => scrollToId('settings')}
            className="flex h-11 shrink-0 items-center gap-2 rounded-xl bg-white/95 px-5 text-sm font-bold text-[#1E4FB0] shadow-lg"
          >
            {iconSvg('M4 20h4l10-10-4-4L4 16v4zM14 6l4 4', { stroke: '#1E4FB0', w: 1.9 })}
            {t.editProfile}
          </button>
        </div>
        {isTenant && (
          <div className="relative grid grid-cols-2 border-t border-white/15 bg-white/10 sm:grid-cols-4">
            <ProfileStats user={user} t={t} />
          </div>
        )}
      </div>

      {/* BODY */}
      <div className="mt-6 grid grid-cols-1 items-start gap-6 lg:grid-cols-[260px_1fr]">
        <aside className="rounded-card-lg border border-card-border bg-white p-3 shadow-sm lg:sticky lg:top-[88px]">
          {isTenant && <NavRow label={t.navOverview} d={NAV_ICONS.overview} onClick={() => scrollToId('top')} />}
          {isTenant && <NavRow label={t.navBookings} d={NAV_ICONS.bookings} onClick={() => scrollToId('bookings')} />}
          {isTenant && <NavRow label={t.navSaved} d={NAV_ICONS.saved} onClick={() => scrollToId('saved')} />}
          {isTenant && <NavRow label={t.navReviews} d={NAV_ICONS.reviews} disabled disabledTitle={t.disabledTitle} />}
          <NavRow label={t.navSettings} d={NAV_ICONS.settings} onClick={() => scrollToId('settings')} />
          {role === 'owner' && <NavRow label={t.navOwnerDashboard} d={NAV_ICONS.overview} href="/partner/dashboard" />}
          {role === 'admin' && <NavRow label={t.navAdminDashboard} d={NAV_ICONS.overview} href="/admin/dashboard" />}
          <NavRow label={t.navNotifications} d={NAV_ICONS.reviews} href="/notifications" />
          <div className="my-2 h-px bg-[#F0F2F6]" />
          <button
            type="button"
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-xl px-3.5 py-3 text-left text-danger hover:bg-danger/5"
          >
            <span className="flex w-[22px] justify-center">
              {iconSvg('M15 4h3a2 2 0 012 2v12a2 2 0 01-2 2h-3M10 17l5-5-5-5M15 12H3', { stroke: '#E0413B' })}
            </span>
            <span className="text-[14.5px] font-semibold">{t.logout}</span>
          </button>
        </aside>

        <section className="flex min-w-0 flex-col gap-5">
          {isTenant && <BookingsSection t={t} lang={lang} />}
          {isTenant && <SavedSection t={t} />}
          <VerifySection user={user} onVerified={setUser} t={t} />
          <SettingsSection user={user} onSaved={setUser} hasPassword={hasPassword} t={t} lang={lang} />
        </section>
      </div>
    </main>
  );
}

function ProfileStats({ user, t }: { user: User; t: T }) {
  const { bookings } = useBookings();
  const { favorites } = useFavorites();
  const activeCount = bookings.filter((b) => ['pending', 'confirmed', 'paid'].includes(normalizeStatus(b.status))).length;

  return (
    <>
      <StatBox value={activeCount} label={t.statActive} />
      <StatBox value={favorites.length} label={t.statSaved} />
      <StatBox value={user.reviewCount ?? 0} label={t.statReviews} />
      <StatBox value={bookings.length} label={t.statTotal} last />
    </>
  );
}

function BookingsSection({ t, lang }: { t: T; lang: Lang }) {
  const { bookings, loading } = useBookings();

  return (
    <div id="bookings" className="scroll-mt-24 rounded-card-lg border border-card-border bg-white p-6 shadow-sm">
      <div className="mb-4 text-[17px] font-bold text-ink-strong">{t.bookingsTitle}</div>
      {loading ? (
        <ContentSkeleton variant="form" rows={3} />
      ) : bookings.length > 0 ? (
        <div className="flex flex-col gap-3.5">
          {bookings.map((b) => (
            <div key={b.id} className="flex gap-4 rounded-2xl border border-card-border bg-[#FBFCFE] p-3.5">
              <div className="h-24 w-[120px] shrink-0 overflow-hidden rounded-xl bg-surface-canvas">
                {b.room?.dorm?.images?.[0] && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={b.room.dorm.images[0]} alt="" className="h-full w-full object-cover" />
                )}
              </div>
              <div className="flex-1">
                <div className="flex flex-wrap items-center gap-2.5">
                  <span className="text-base font-bold text-ink-strong">{b.room?.dorm?.name ?? '—'}</span>
                  <span className={`rounded-pill px-2.5 py-1 text-[11.5px] font-bold ${statusBadgeStyle(normalizeStatus(b.status))}`}>
                    {t.statusLabel[normalizeStatus(b.status)]}
                  </span>
                </div>
                <div className="mt-1 text-[13px] text-ink-faint">
                  {b.room?.name ?? roomTypeLabel(b.room?.type, lang)} &middot; {t.checkIn} {formatDate(b.checkInDate, lang)}
                </div>
                <div className="mt-3 flex items-center gap-4">
                  <span className="text-lg font-bold text-tenant">
                    &#3647;{b.amount.toLocaleString()}
                    <span className="text-xs font-normal text-ink-faint"> {t.perMonth}</span>
                  </span>
                  <Link
                    href={`/bookings/${b.id}`}
                    className="ml-auto rounded-btn bg-tenant px-4 py-2 text-[13px] font-bold text-white"
                  >
                    {t.viewDetail}
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-ink-faint">{t.noBookings}</p>
      )}
    </div>
  );
}

function SavedSection({ t }: { t: T }) {
  const { favorites, favoriteIds, loaded, toggle } = useFavorites();
  const visibleFavorites = favorites.filter((d) => favoriteIds.has(d.id));

  return (
    <div id="saved" className="scroll-mt-24 rounded-card-lg border border-card-border bg-white p-6 shadow-sm">
      <div className="mb-4 text-[17px] font-bold text-ink-strong">{t.savedTitle}</div>
      {!loaded ? (
        <ContentSkeleton variant="form" rows={3} />
      ) : visibleFavorites.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {visibleFavorites.map((dorm) => {
            const availableRooms = dorm.rooms.filter((r) => r.status.toUpperCase() === 'AVAILABLE');
            const startingRoom = [...availableRooms].sort((a, b) => a.pricePerMonth - b.pricePerMonth)[0];
            return (
              <Link
                key={dorm.id}
                href={`/dorms/${dorm.id}`}
                className="block overflow-hidden rounded-2xl border border-card-border hover:-translate-y-0.5 hover:shadow-lg"
              >
                <div className="relative h-[110px] bg-surface-canvas">
                  {dorm.images?.[0] && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={dorm.images[0]} alt="" className="h-full w-full object-cover" />
                  )}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      toggle(dorm.id);
                    }}
                    className="absolute right-2 top-2 flex h-[30px] w-[30px] items-center justify-center rounded-full bg-white/90"
                  >
                    {iconSvg('M12 21s-8-4.5-8-11a4.5 4.5 0 018-2.8A4.5 4.5 0 0120 10c0 6.5-8 11-8 11z', {
                      stroke: '#E06A6A',
                      fill: '#E06A6A',
                    })}
                  </button>
                </div>
                <div className="p-3">
                  <StarRating rating={dorm.avgRating} count={dorm.reviewCount} />
                  <div className="mt-1 truncate text-sm font-bold text-ink-strong">{dorm.name}</div>
                  <div className="mt-0.5 text-[11.5px] text-ink-faint">{dorm.province}</div>
                  {startingRoom && (
                    <div className="mt-2">
                      <span className="text-base font-bold text-tenant">
                        &#3647;{startingRoom.pricePerMonth.toLocaleString()}
                      </span>
                      <span className="text-[11px] text-ink-faint">{t.perMonth}</span>
                    </div>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      ) : (
        <p className="text-sm text-ink-faint">{t.noSaved}</p>
      )}
    </div>
  );
}

type OtpStage = 'idle' | 'sending' | 'input' | 'verifying' | 'done';

function VerifySection({ user, onVerified, t }: { user: User; onVerified: (u: User) => void; t: T }) {
  const [stage, setStage] = useState<OtpStage>(user.emailVerified ? 'done' : 'idle');
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(0);

  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setInterval(() => setCountdown((c) => Math.max(0, c - 1)), 1000);
    return () => clearInterval(timer);
  }, [countdown]);

  async function sendOtp() {
    setStage('sending');
    setError(null);
    try {
      await apiClient.post('/users/me/send-verification-otp');
      setStage('input');
      setCode('');
      setCountdown(60);
    } catch (err) {
      setError(err instanceof Error ? err.message : t.otpError);
      setStage('idle');
    }
  }

  async function verifyCode() {
    setStage('verifying');
    setError(null);
    try {
      const updated = await apiClient.post<User>('/users/me/verify-email-otp', { code });
      onVerified(updated);
      setStage('done');
    } catch (err) {
      setError(err instanceof Error ? err.message : t.otpError);
      setStage('input');
    }
  }

  if (!user.email) return null;

  const done = stage === 'done' || user.emailVerified;

  return (
    <div className={`rounded-card-lg border bg-white p-6 shadow-sm ${done ? 'border-[#CBEEDD]' : 'border-card-border'}`}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-3.5">
        <span
          className={`flex h-[46px] w-[46px] shrink-0 items-center justify-center rounded-xl ${done ? 'bg-[#E7F7EF]' : 'bg-[#EAF1FF]'}`}
        >
          {iconSvg('M12 3l7 4v5c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V7l7-4zM9 12l2 2 4-4', {
            stroke: done ? '#1FB56E' : '#2F6FE0',
            w: 1.8,
          })}
        </span>
        <div className="flex-1">
          <div className="flex items-center gap-2.5">
            <span className="text-[17px] font-bold text-ink-strong">{t.verifyTitle}</span>
            <span
              className={`rounded-pill px-2.5 py-1 text-[11.5px] font-bold ${done ? 'bg-[#E7F7EF] text-[#12704A]' : 'bg-[#FFF3E0] text-[#C77B14]'}`}
            >
              {done ? t.verifiedTag : t.unverifiedTag}
            </span>
          </div>
          <div className="mt-0.5 text-[13px] text-ink-faint">{done ? t.verifyDescDone : t.verifyDescIdle}</div>
        </div>
        {stage === 'idle' && (
          <button
            type="button"
            onClick={sendOtp}
            className="flex h-11 shrink-0 items-center gap-2 rounded-xl bg-tenant px-5 text-sm font-bold text-white shadow-sm"
          >
            {t.sendOtp}
          </button>
        )}
        {stage === 'sending' && (
          <span className="text-sm font-semibold text-ink-faint">{t.sendingOtp}</span>
        )}
      </div>

      {error && (stage === 'idle' || stage === 'sending') && <p className="mt-3 text-sm text-danger">{error}</p>}

      {(stage === 'input' || stage === 'verifying') && (
        <div className="mt-5 border-t border-[#F0F2F6] pt-5">
          <div className="text-[13.5px] text-[#5B616C]">{t.otpSentTo(user.email)}</div>
          <input
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
            maxLength={6}
            inputMode="numeric"
            placeholder="123456"
            className="mt-3.5 h-14 w-full max-w-[220px] rounded-xl border-2 border-[#E4E7EC] bg-[#F7F9FC] px-4 text-center text-2xl font-bold tracking-[6px] text-ink-strong focus:border-tenant focus:outline-none"
          />
          {error && <p className="mt-2.5 text-sm text-danger">{error}</p>}
          <div className="mt-4 flex flex-wrap items-center gap-4">
            <button
              type="button"
              onClick={verifyCode}
              disabled={stage === 'verifying' || code.length !== 6}
              className="h-[46px] rounded-xl bg-gradient-to-br from-[#178F5A] to-[#1FB56E] px-6 text-[14.5px] font-bold text-white shadow-sm disabled:opacity-60"
            >
              {stage === 'verifying' ? t.verifying : t.verifyCode}
            </button>
            <span className="text-[13px] text-ink-faint">
              {countdown > 0 ? (
                t.resendIn(`00:${String(countdown).padStart(2, '0')}`)
              ) : (
                <button type="button" onClick={sendOtp} className="font-bold text-tenant">
                  {t.resend}
                </button>
              )}
            </span>
          </div>
        </div>
      )}

      {stage === 'done' && (
        <div className="mt-4 flex items-center gap-2.5 rounded-2xl bg-[#E7F7EF] px-4 py-3.5">
          {iconSvg('M8 12l3 3 5-6', { stroke: '#fff', w: 2.2, fill: '#1FB56E' })}
          <span className="text-sm font-semibold text-[#12704A]">{t.verifySuccess}</span>
        </div>
      )}
    </div>
  );
}

interface SessionItem {
  id: string;
  userAgent: string | null;
  ip: string | null;
  createdAt: string;
  lastSeenAt: string;
}

// อ่าน browser/OS แบบหยาบๆ จาก User-Agent เพื่อโชว์ให้อ่านง่าย ไม่ต้องแม่นยำ 100%
function describeDevice(ua: string | null): string {
  if (!ua) return '—';
  const browser = /Edg\//.test(ua)
    ? 'Edge'
    : /Chrome\//.test(ua)
      ? 'Chrome'
      : /Firefox\//.test(ua)
        ? 'Firefox'
        : /Safari\//.test(ua)
          ? 'Safari'
          : 'Browser';
  const os = /Windows/.test(ua)
    ? 'Windows'
    : /Mac OS/.test(ua)
      ? 'macOS'
      : /Android/.test(ua)
        ? 'Android'
        : /iPhone|iPad/.test(ua)
          ? 'iOS'
          : /Linux/.test(ua)
            ? 'Linux'
            : '';
  return os ? `${browser} · ${os}` : browser;
}

function DeviceSessionsSection({ t, lang }: { t: T; lang: Lang }) {
  const [sessions, setSessions] = useState<SessionItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [revokingId, setRevokingId] = useState<string | null>(null);

  function reload() {
    apiClient
      .get<SessionItem[]>('/users/me/sessions')
      .then(setSessions)
      .catch(() => setError(t.sessionError));
  }

  useEffect(reload, []);

  async function revoke(id: string) {
    setRevokingId(id);
    try {
      await apiClient.delete(`/users/me/sessions/${id}`);
      reload();
    } catch {
      setError(t.sessionError);
    } finally {
      setRevokingId(null);
    }
  }

  return (
    <div className="mt-2.5 rounded-xl bg-[#F7F9FC] px-4 py-3.5">
      <span className="text-sm font-semibold text-ink-strong">{t.loginDevices}</span>
      <div className="mt-2.5 flex flex-col gap-2">
        {(sessions ?? []).map((s) => (
          <div key={s.id} className="flex items-center justify-between gap-3 rounded-lg bg-white px-3.5 py-2.5">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-ink-strong">{describeDevice(s.userAgent)}</p>
              <p className="mt-0.5 text-xs text-ink-faint">{t.lastSeen(formatDate(s.lastSeenAt, lang))}</p>
            </div>
            <button
              type="button"
              onClick={() => revoke(s.id)}
              disabled={revokingId === s.id}
              className="shrink-0 rounded-btn border border-card-border px-3 py-1.5 text-xs font-semibold text-danger disabled:opacity-50"
            >
              {revokingId === s.id ? t.loggingOutDevice : t.logoutDevice}
            </button>
          </div>
        ))}
        {sessions && sessions.length === 0 && <p className="text-xs text-ink-faint">{t.noSessions}</p>}
      </div>
      {error && <p className="mt-2 text-xs text-danger">{error}</p>}
    </div>
  );
}

function SettingsSection({
  user,
  onSaved,
  hasPassword,
  t,
  lang,
}: {
  user: User;
  onSaved: (u: User) => void;
  hasPassword: boolean;
  t: T;
  lang: Lang;
}) {
  const [name, setName] = useState(user.name);
  const [phone, setPhone] = useState(user.phone ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwSaving, setPwSaving] = useState(false);
  const [pwError, setPwError] = useState<string | null>(null);
  const [pwSaved, setPwSaved] = useState(false);

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

  async function handlePasswordSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPwError(null);
    setPwSaved(false);
    if (newPassword !== confirmPassword) {
      setPwError(t.passwordMismatch);
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
      setTimeout(() => window.location.replace('/login?error=password_changed'), 1200);
    } catch (err) {
      setPwError(err instanceof Error ? err.message : t.passwordChangeError);
    } finally {
      setPwSaving(false);
    }
  }

  const inputBoxClass =
    'h-12 w-full rounded-xl border border-[#E4E7EC] bg-white px-4 text-[14.5px] text-ink placeholder:text-ink-faint focus:border-tenant focus:outline-none';

  return (
    <div id="settings" className="scroll-mt-24 flex flex-col gap-5">
      <div className="rounded-card-lg border border-card-border bg-white p-6 shadow-sm">
        <div className="mb-4 text-[17px] font-bold text-ink-strong">{t.fieldsTitle}</div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-ink-faint">{t.nameLabel}</label>
            <input value={name} onChange={(e) => setName(e.target.value)} className={inputBoxClass} />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-ink-faint">{t.emailLabel}</label>
            {fieldBox(iconSvg('M3 5h18v14H3zM4 7l8 6 8-6', { stroke: '#9AA0AB', w: 1.7 }), user.email ?? '—')}
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-ink-faint">{t.phoneLabel}</label>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder={t.phoneNotSet}
              className={inputBoxClass}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-ink-faint">{t.roleLabel}</label>
            {fieldBox(
              iconSvg('M12 12a4 4 0 100-8 4 4 0 000 8zM4 21v-1a6 6 0 016-6h4a6 6 0 016 6v1', {
                stroke: '#9AA0AB',
                w: 1.7,
              }),
              user.role.toLowerCase() === 'owner' ? t.roleOwner : user.role.toLowerCase() === 'admin' ? t.roleAdmin : t.roleTenant,
            )}
          </div>
        </div>
        {error && <p className="mt-3 text-sm text-danger">{error}</p>}
        {saved && <p className="mt-3 text-sm text-success">{t.savedProfile}</p>}
        <div className="mt-5 flex justify-end">
          <button
            onClick={handleSave}
            disabled={saving}
            className="rounded-btn bg-tenant px-6 py-2.5 text-sm font-bold text-white shadow-sm disabled:opacity-60"
          >
            {saving ? t.saving : t.saveInfo}
          </button>
        </div>
      </div>

      <div className="rounded-card-lg border border-card-border bg-white p-6 shadow-sm">
        <div className="mb-4 text-[17px] font-bold text-ink-strong">{t.passwordTitle}</div>
        {!hasPassword ? (
          <p className="text-sm text-ink-faint">{t.googleOnlyNote}</p>
        ) : (
          <form onSubmit={handlePasswordSubmit} className="flex max-w-md flex-col gap-3.5">
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-ink-faint">{t.currentPassword}</label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className={inputBoxClass}
                required
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-ink-faint">{t.newPassword}</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className={inputBoxClass}
                minLength={6}
                required
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-ink-faint">{t.confirmPassword}</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className={inputBoxClass}
                minLength={6}
                required
              />
            </div>
            {pwError && <p className="text-sm text-danger">{pwError}</p>}
            {pwSaved && <p className="text-sm text-success">{t.passwordChanged}</p>}
            <button
              type="submit"
              disabled={pwSaving}
              className="self-start rounded-btn bg-tenant px-6 py-2.5 text-sm font-bold text-white shadow-sm disabled:opacity-60"
            >
              {pwSaving ? t.updating : t.updatePassword}
            </button>
          </form>
        )}

        <div className="mt-5 flex items-center justify-between rounded-xl bg-[#F7F9FC] px-4 py-3.5">
          <span className="text-sm font-semibold text-ink-strong">{t.twoFactor}</span>
          <span
            title={t.disabledTitle}
            className="cursor-not-allowed rounded-pill bg-white px-3 py-1 text-xs font-medium text-ink-faint"
          >
            {t.comingSoon}
          </span>
        </div>
        <DeviceSessionsSection t={t} lang={lang} />
      </div>
    </div>
  );
}
