'use client';

import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api-client';
import { useLang, type Lang } from '@/hooks/useLang';
import { Badge } from '@/components/dashboard/Badge';
import { FilterTabs } from '@/components/dashboard/FilterTabs';
import type { User } from '@hopak/shared';

const ROLE_LABEL: Record<Lang, Record<string, string>> = {
  th: { tenant: 'ผู้เช่า', owner: 'เจ้าของหอ', admin: 'แอดมิน' },
  en: { tenant: 'Tenant', owner: 'Owner', admin: 'Admin' },
};

const TEXT = {
  th: {
    title: 'ผู้ใช้',
    searchPlaceholder: 'ค้นหาชื่อ / เบอร์…',
    addUserTooltip: 'ยังไม่เปิดใช้งาน — เพิ่มผู้ใช้ผ่านหน้าสมัครสมาชิกแทน',
    addUser: '+ เพิ่มผู้ใช้',
    filters: [
      { value: '', label: 'ทั้งหมด' },
      { value: 'tenant', label: 'ผู้เช่า' },
      { value: 'owner', label: 'เจ้าของหอ' },
      { value: 'admin', label: 'แอดมิน' },
    ],
    name: 'ชื่อ',
    contact: 'ติดต่อ',
    role: 'บทบาท',
    bookings: 'จอง',
    joined: 'เข้าร่วม',
    status: 'สถานะ',
    suspended: 'ระงับ',
    verified: 'ยืนยันแล้ว',
    active: 'ใช้งาน',
    warn: 'แจ้งเตือน',
    unsuspend: 'ยกเลิกระงับ',
    suspend: 'ระงับ',
    none: 'ไม่มีผู้ใช้',
    warningTitle: 'ส่งใบตักเตือน',
    to: 'ถึง',
    notifiedInApp: 'ส่งแจ้งเตือนในระบบแล้ว',
    emailSentOk: 'ส่งอีเมลสำเร็จแล้ว',
    smtpNotConfigured: 'ยังไม่ได้ตั้งค่า SMTP — ส่งได้แค่ในระบบ ไม่ได้ส่งอีเมลจริง',
    noEmail: 'ผู้ใช้ไม่มีอีเมล ส่งได้แค่ในระบบ',
    close: 'ปิด',
    subjectPlaceholder: 'หัวข้อ',
    detailPlaceholder: 'รายละเอียด',
    cancel: 'ยกเลิก',
    sending: 'กำลังส่ง...',
    send: 'ส่ง',
    dateLocale: 'th-TH',
    delete: 'ลบ',
    deleteConfirmTitle: 'ลบบัญชีผู้ใช้',
    deleteConfirmBody: (name: string) => `ยืนยันลบบัญชี "${name}" ถาวร? ข้อมูลจะไม่สามารถกู้คืนได้`,
    deleting: 'กำลังลบ...',
    deleteGenericError: 'ลบไม่สำเร็จ',
  },
  en: {
    title: 'Users',
    searchPlaceholder: 'Search name / phone…',
    addUserTooltip: 'Not enabled yet — add users via the sign-up page instead',
    addUser: '+ Add user',
    filters: [
      { value: '', label: 'All' },
      { value: 'tenant', label: 'Tenants' },
      { value: 'owner', label: 'Owners' },
      { value: 'admin', label: 'Admins' },
    ],
    name: 'Name',
    contact: 'Contact',
    role: 'Role',
    bookings: 'Bookings',
    joined: 'Joined',
    status: 'Status',
    suspended: 'Suspended',
    verified: 'Verified',
    active: 'Active',
    warn: 'Warn',
    unsuspend: 'Unsuspend',
    suspend: 'Suspend',
    none: 'No users',
    warningTitle: 'Send Warning',
    to: 'To',
    notifiedInApp: 'In-app notification sent',
    emailSentOk: 'Email sent successfully',
    smtpNotConfigured: 'SMTP not configured yet — sent in-app only, no real email sent',
    noEmail: 'User has no email, sent in-app only',
    close: 'Close',
    subjectPlaceholder: 'Subject',
    detailPlaceholder: 'Details',
    cancel: 'Cancel',
    sending: 'Sending...',
    send: 'Send',
    dateLocale: 'en-US',
    delete: 'Delete',
    deleteConfirmTitle: 'Delete user account',
    deleteConfirmBody: (name: string) => `Permanently delete "${name}"? This cannot be undone.`,
    deleting: 'Deleting...',
    deleteGenericError: 'Failed to delete',
  },
};

export default function AdminUsersPage() {
  const { lang } = useLang();
  const t = TEXT[lang];
  const [users, setUsers] = useState<User[]>([]);
  const [roleFilter, setRoleFilter] = useState('');
  const [search, setSearch] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [warningTarget, setWarningTarget] = useState<User | null>(null);
  const [warningTitle, setWarningTitle] = useState('');
  const [warningMessage, setWarningMessage] = useState('');
  const [sendingWarning, setSendingWarning] = useState(false);
  const [warningResult, setWarningResult] = useState<{ notified: boolean; emailSent: boolean } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<User | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  function reload() {
    apiClient.get<User[]>('/admin/users').then(setUsers).catch(() => setUsers([]));
  }

  useEffect(reload, []);

  function formatJoined(dateStr?: string) {
    if (!dateStr) return '—';
    return new Intl.DateTimeFormat(t.dateLocale, { month: 'short', year: '2-digit' }).format(new Date(dateStr));
  }

  async function toggleSuspend(user: User) {
    setBusyId(user.id);
    try {
      await apiClient.patch(`/admin/users/${user.id}/suspend`, { suspended: !user.suspended });
      reload();
    } finally {
      setBusyId(null);
    }
  }

  function openDelete(user: User) {
    setDeleteTarget(user);
    setDeleteError(null);
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      await apiClient.delete(`/admin/users/${deleteTarget.id}`);
      setDeleteTarget(null);
      reload();
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : t.deleteGenericError);
    } finally {
      setDeleting(false);
    }
  }

  function openWarning(user: User) {
    setWarningTarget(user);
    setWarningTitle('');
    setWarningMessage('');
    setWarningResult(null);
  }

  async function submitWarning(e: React.FormEvent) {
    e.preventDefault();
    if (!warningTarget) return;
    setSendingWarning(true);
    try {
      const res = await apiClient.post<{ notified: boolean; emailSent: boolean }>(
        `/admin/users/${warningTarget.id}/warning`,
        { title: warningTitle, message: warningMessage },
      );
      setWarningResult(res);
    } finally {
      setSendingWarning(false);
    }
  }

  const q = search.trim().toLowerCase();
  const filtered = users
    .filter((u) => (roleFilter ? u.role.toLowerCase() === roleFilter : true))
    .filter((u) => (q ? u.name.toLowerCase().includes(q) || (u.phone ?? '').includes(q) : true));

  const count = (role: string) => (role ? users.filter((u) => u.role.toLowerCase() === role).length : users.length);

  const tones = ['total', 'neutral', 'neutral', 'neutral'] as const;
  const FILTERS = t.filters.map((f, i) => ({ ...f, count: count(f.value), tone: tones[i] }));

  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-xl font-bold text-ink-strong dark:text-white">{t.title}</h1>
        <div className="flex items-center gap-2.5">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t.searchPlaceholder}
            className="h-9 w-56 rounded-btn border border-card-border px-3.5 text-sm text-ink placeholder:text-ink-faint focus:border-tenant focus:outline-none dark:border-white/10 dark:bg-[#1a1a19] dark:text-white"
          />
          <button
            disabled
            title={t.addUserTooltip}
            className="rounded-btn bg-tenant px-4 py-2 text-sm font-semibold text-white opacity-50"
          >
            {t.addUser}
          </button>
        </div>
      </div>

      <div className="mt-4">
        <FilterTabs options={FILTERS} value={roleFilter} onChange={setRoleFilter} />
      </div>

      <div className="mt-4 overflow-x-auto rounded-card border border-card-border dark:border-white/10">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-card-border text-xs text-ink-faint dark:border-white/10">
              <th className="p-3 font-normal">{t.name}</th>
              <th className="p-3 font-normal">{t.contact}</th>
              <th className="p-3 font-normal">{t.role}</th>
              <th className="p-3 font-normal">{t.bookings}</th>
              <th className="p-3 font-normal">{t.joined}</th>
              <th className="p-3 font-normal">{t.status}</th>
              <th className="p-3 font-normal"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((u) => {
              const role = u.role.toLowerCase();
              const isTenant = role === 'tenant';
              const isAdmin = role === 'admin';
              return (
                <tr key={u.id} className="border-t border-card-border dark:border-white/10">
                  <td className="p-3 font-medium text-ink-strong dark:text-white">{u.name}</td>
                  <td className="p-3 font-sans text-ink-subtitle">{u.phone ?? u.email ?? '—'}</td>
                  <td className="p-3">
                    <Badge label={ROLE_LABEL[lang][role] ?? u.role} variant={role === 'owner' ? 'purple' : 'neutral'} />
                  </td>
                  <td className="p-3 font-sans tabular-nums text-ink-subtitle">
                    {isTenant ? (u.bookingCount ?? 0) : '—'}
                  </td>
                  <td className="p-3 text-ink-subtitle">{formatJoined(u.createdAt)}</td>
                  <td className="p-3">
                    {u.suspended ? (
                      <Badge label={t.suspended} variant="critical" />
                    ) : (
                      <Badge label={role === 'owner' ? t.verified : t.active} variant="good" />
                    )}
                  </td>
                  <td className="p-3">
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => openWarning(u)}
                        className="text-sm font-semibold text-warning-dark hover:underline"
                      >
                        {t.warn}
                      </button>
                      {!isAdmin && (
                        <button
                          onClick={() => toggleSuspend(u)}
                          disabled={busyId === u.id}
                          className={`text-sm font-semibold hover:underline disabled:opacity-50 ${
                            u.suspended ? 'text-success' : 'text-danger'
                          }`}
                        >
                          {u.suspended ? t.unsuspend : t.suspend}
                        </button>
                      )}
                      {!isAdmin && (
                        <button
                          onClick={() => openDelete(u)}
                          className="text-sm font-semibold text-danger hover:underline"
                        >
                          {t.delete}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {filtered.length === 0 && <p className="p-4 text-ink-faint">{t.none}</p>}
      </div>

      {warningTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-6">
          <div className="w-full max-w-sm rounded-card border border-card-border bg-white p-5 dark:border-white/10 dark:bg-[#1a1a19]">
            <h2 className="font-bold text-ink-strong dark:text-white">{t.warningTitle}</h2>
            <p className="mt-1 text-sm text-ink-subtitle">
              {t.to} {warningTarget.name} {warningTarget.email && `(${warningTarget.email})`}
            </p>

            {warningResult ? (
              <div className="mt-4">
                <p className="text-sm text-success">{t.notifiedInApp}</p>
                <p className="mt-1 text-sm text-ink-subtitle">
                  {warningResult.emailSent
                    ? t.emailSentOk
                    : warningTarget.email
                      ? t.smtpNotConfigured
                      : t.noEmail}
                </p>
                <button
                  onClick={() => setWarningTarget(null)}
                  className="mt-4 w-full rounded-btn bg-tenant py-2.5 text-sm font-semibold text-white hover:bg-tenant-dark"
                >
                  {t.close}
                </button>
              </div>
            ) : (
              <form onSubmit={submitWarning} className="mt-4 flex flex-col gap-3">
                <input
                  value={warningTitle}
                  onChange={(e) => setWarningTitle(e.target.value)}
                  placeholder={t.subjectPlaceholder}
                  className="rounded-btn border border-card-border px-3.5 py-2.5 text-sm text-ink placeholder:text-ink-faint focus:border-tenant focus:outline-none dark:border-white/10 dark:bg-[#1a1a19] dark:text-white"
                  required
                />
                <textarea
                  value={warningMessage}
                  onChange={(e) => setWarningMessage(e.target.value)}
                  placeholder={t.detailPlaceholder}
                  rows={4}
                  className="rounded-btn border border-card-border p-3 text-sm text-ink placeholder:text-ink-faint focus:border-tenant focus:outline-none dark:border-white/10 dark:bg-[#1a1a19] dark:text-white"
                  required
                />
                <div className="mt-1 flex gap-2">
                  <button
                    type="button"
                    onClick={() => setWarningTarget(null)}
                    className="flex-1 rounded-btn border border-card-border py-2.5 text-sm font-semibold text-ink-subtitle dark:border-white/10"
                  >
                    {t.cancel}
                  </button>
                  <button
                    type="submit"
                    disabled={sendingWarning}
                    className="flex-1 rounded-btn bg-tenant py-2.5 text-sm font-semibold text-white hover:bg-tenant-dark disabled:opacity-60"
                  >
                    {sendingWarning ? t.sending : t.send}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-6">
          <div className="w-full max-w-sm rounded-card border border-card-border bg-white p-5 dark:border-white/10 dark:bg-[#1a1a19]">
            <h2 className="font-bold text-ink-strong dark:text-white">{t.deleteConfirmTitle}</h2>
            <p className="mt-2 text-sm text-ink-subtitle">{t.deleteConfirmBody(deleteTarget.name)}</p>
            {deleteError && <p className="mt-3 text-sm text-danger">{deleteError}</p>}
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="flex-1 rounded-btn border border-card-border py-2.5 text-sm font-semibold text-ink-subtitle dark:border-white/10"
              >
                {t.cancel}
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                disabled={deleting}
                className="flex-1 rounded-btn bg-danger py-2.5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60"
              >
                {deleting ? t.deleting : t.delete}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
