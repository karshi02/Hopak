'use client';

import { useEffect, useRef, useState } from 'react';
import { apiClient } from '@/lib/api-client';
import { getToken } from '@/lib/auth';
import { useLang, type Lang } from '@/hooks/useLang';
import { Badge } from '@/components/dashboard/Badge';
import { FilterTabs } from '@/components/dashboard/FilterTabs';
import type { User } from '@hopak/shared';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

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

    viewDocs: 'ดูเอกสาร',
    docsTitle: (name: string) => `เอกสารของ ${name}`,
    docsNone: 'ยังไม่มีหอพัก/เอกสารแนบ',
    docItem: (n: number) => `เอกสาร ${n}`,
    accountDocsLabel: 'เอกสารบัญชี (แนบตอนสร้าง/เพิ่มทีหลังได้)',
    accountDocsNone: 'ยังไม่มีเอกสารบัญชี',
    dormDocsLabel: 'เอกสารรายหอพัก',
    addDocs: 'เพิ่มเอกสาร',
    uploadingDocs: 'กำลังอัปโหลด...',
    removeDocConfirm: 'ลบเอกสารนี้?',
    newUserDocsLabel: 'เอกสารแนบ (ถ้ามี — เพิ่ม/เปลี่ยนทีหลังได้เสมอ)',
    filesSelected: (n: number) => `เลือกไฟล์แล้ว ${n} ไฟล์`,

    addUserTitle: 'เพิ่มผู้ใช้ใหม่',
    addUserHint: 'สร้างบัญชีให้ผู้ใช้โดยตรง ไม่ต้องผ่านหน้าสมัครสมาชิก',
    namePlaceholder: 'ชื่อ-นามสกุล',
    emailPlaceholder: 'อีเมล (ถ้ามี)',
    phonePlaceholder: 'เบอร์โทร (ถ้ามี)',
    passwordPlaceholder: 'รหัสผ่านเริ่มต้น',
    create: 'สร้างบัญชี',
    creating: 'กำลังสร้าง...',
    createError: 'สร้างไม่สำเร็จ',
    ownerFollowupNote: 'หมายเหตุ: ถ้าเลือก "เจ้าของหอ" ระบบจะสร้างบัญชีให้เข้าใช้งานได้ทันที เจ้าของหอต้องไปยื่นข้อมูลหอพักผ่านหน้า Owner Console เองต่อ',
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

    viewDocs: 'View docs',
    docsTitle: (name: string) => `${name}'s documents`,
    docsNone: 'No dorm/documents submitted yet',
    docItem: (n: number) => `Document ${n}`,
    accountDocsLabel: 'Account documents (attach at creation or add later)',
    accountDocsNone: 'No account documents yet',
    dormDocsLabel: 'Per-dorm documents',
    addDocs: 'Add documents',
    uploadingDocs: 'Uploading...',
    removeDocConfirm: 'Remove this document?',
    newUserDocsLabel: 'Attached documents (optional — can add/change later)',
    filesSelected: (n: number) => `${n} files selected`,

    addUserTitle: 'Add new user',
    addUserHint: 'Create an account directly — no sign-up flow needed',
    namePlaceholder: 'Full name',
    emailPlaceholder: 'Email (optional)',
    phonePlaceholder: 'Phone (optional)',
    passwordPlaceholder: 'Initial password',
    create: 'Create account',
    creating: 'Creating...',
    createError: 'Failed to create',
    ownerFollowupNote: 'Note: choosing "Owner" only creates the login account — the owner still needs to submit their dorm via the Owner Console.',
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
  const [docsTarget, setDocsTarget] = useState<User | null>(null);
  const [accountDocs, setAccountDocs] = useState<string[]>([]);
  const [dormDocs, setDormDocs] = useState<{ dormId: string; dormName: string; documents: string[] }[]>([]);
  const [uploadingDocs, setUploadingDocs] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState<'tenant' | 'owner' | 'admin'>('tenant');
  const [newDocFiles, setNewDocFiles] = useState<File[]>([]);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const newDocsInputRef = useRef<HTMLInputElement>(null);

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
    } catch {
      // เงียบไว้ก่อน — ไม่ให้พังทั้งหน้า
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
    } catch {
      // เงียบไว้ก่อน — ไม่ให้พังทั้งหน้า
    } finally {
      setSendingWarning(false);
    }
  }

  function reloadDocs(userId: string) {
    apiClient
      .get<{ accountDocuments: string[]; dorms: { dormId: string; dormName: string; documents: string[] }[] }>(
        `/admin/users/${userId}/documents`,
      )
      .then((res) => {
        setAccountDocs(res.accountDocuments);
        setDormDocs(res.dorms);
      })
      .catch(() => {
        setAccountDocs([]);
        setDormDocs([]);
      });
  }

  function openDocs(user: User) {
    setDocsTarget(user);
    setAccountDocs([]);
    setDormDocs([]);
    reloadDocs(user.id);
  }

  async function handleAddAccountDocs(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (!files.length || !docsTarget) return;
    setUploadingDocs(true);
    try {
      const formData = new FormData();
      files.forEach((f) => formData.append('documents', f));
      const res = await fetch(`${API_URL}/admin/users/${docsTarget.id}/documents`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${getToken()}` },
        body: formData,
      });
      if (res.ok) reloadDocs(docsTarget.id);
    } finally {
      setUploadingDocs(false);
      e.target.value = '';
    }
  }

  async function handleRemoveAccountDoc(index: number) {
    if (!docsTarget || !window.confirm(t.removeDocConfirm)) return;
    const res = await fetch(`${API_URL}/admin/users/${docsTarget.id}/documents/${index}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${getToken()}` },
    });
    if (res.ok) reloadDocs(docsTarget.id);
  }

  function openAdd() {
    setNewName('');
    setNewEmail('');
    setNewPhone('');
    setNewPassword('');
    setNewRole('tenant');
    setNewDocFiles([]);
    setCreateError(null);
    setAddOpen(true);
  }

  async function submitAdd(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    setCreateError(null);
    try {
      const created = await apiClient.post<User>('/admin/users', {
        name: newName,
        email: newEmail || undefined,
        phone: newPhone || undefined,
        password: newPassword,
        role: newRole.toUpperCase(),
      });
      if (newDocFiles.length) {
        const formData = new FormData();
        newDocFiles.forEach((f) => formData.append('documents', f));
        await fetch(`${API_URL}/admin/users/${created.id}/documents`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${getToken()}` },
          body: formData,
        });
      }
      setAddOpen(false);
      reload();
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : t.createError);
    } finally {
      setCreating(false);
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
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <FilterTabs options={FILTERS} value={roleFilter} onChange={setRoleFilter} />
        <div className="flex items-center gap-2.5 lg:shrink-0">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t.searchPlaceholder}
            className="h-9 min-w-0 flex-1 rounded-btn border border-card-border bg-white px-3.5 text-sm text-ink placeholder:text-ink-faint focus:border-tenant focus:outline-none lg:w-56 lg:flex-none"
          />
          <button
            onClick={openAdd}
            className="shrink-0 whitespace-nowrap rounded-btn bg-tenant px-4 py-2 text-sm font-semibold text-white hover:bg-tenant-dark"
          >
            {t.addUser}
          </button>
        </div>
      </div>

      <div className="mt-4 overflow-x-auto rounded-card-lg border border-card-border bg-white px-2 shadow-card">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead>
            <tr className="border-b border-hairline text-xs text-ink-faint">
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
                <tr key={u.id} className="border-b border-hairline last:border-0">
                  <td className="p-3 font-medium text-ink-strong">{u.name}</td>
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
                      {role === 'owner' && (
                        <button
                          onClick={() => openDocs(u)}
                          className="text-sm font-semibold text-tenant hover:underline"
                        >
                          {t.viewDocs}
                        </button>
                      )}
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 sm:p-6">
          <div className="max-h-[85vh] w-full max-w-sm overflow-y-auto rounded-card-lg border border-card-border bg-white p-5 shadow-card">
            <h2 className="font-bold text-ink-strong">{t.warningTitle}</h2>
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
                  className="rounded-btn border border-card-border px-3.5 py-2.5 text-sm text-ink placeholder:text-ink-faint focus:border-tenant focus:outline-none"
                  required
                />
                <textarea
                  value={warningMessage}
                  onChange={(e) => setWarningMessage(e.target.value)}
                  placeholder={t.detailPlaceholder}
                  rows={4}
                  className="rounded-btn border border-card-border p-3 text-sm text-ink placeholder:text-ink-faint focus:border-tenant focus:outline-none"
                  required
                />
                <div className="mt-1 flex gap-2">
                  <button
                    type="button"
                    onClick={() => setWarningTarget(null)}
                    className="flex-1 rounded-btn border border-card-border py-2.5 text-sm font-semibold text-ink-subtitle"
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

      {docsTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 sm:p-6">
          <div className="max-h-[85vh] w-full max-w-sm overflow-y-auto rounded-card-lg border border-card-border bg-white p-5 shadow-card">
            <h2 className="font-bold text-ink-strong">{t.docsTitle(docsTarget.name)}</h2>
            <div className="mt-3 flex max-h-96 flex-col gap-4 overflow-y-auto">
              <div>
                <p className="text-sm font-semibold text-ink-strong">{t.accountDocsLabel}</p>
                <div className="mt-1.5 grid grid-cols-4 gap-1.5">
                  {accountDocs.map((url, i) => (
                    <div key={url} className="group relative h-14 overflow-hidden rounded-md border border-card-border">
                      <a href={url} target="_blank" rel="noreferrer">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={url} alt="" className="h-full w-full object-cover" />
                      </a>
                      <button
                        type="button"
                        onClick={() => handleRemoveAccountDoc(i)}
                        className="absolute right-0.5 top-0.5 flex h-4 w-4 items-center justify-center rounded-pill bg-black/60 text-[10px] font-bold text-white opacity-0 transition-opacity group-hover:opacity-100"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
                {accountDocs.length === 0 && <p className="mt-1 text-xs text-ink-faint">{t.accountDocsNone}</p>}
                <label className="mt-2 inline-block cursor-pointer text-xs font-semibold text-tenant">
                  {uploadingDocs ? t.uploadingDocs : `+ ${t.addDocs}`}
                  <input
                    type="file"
                    accept="image/*,application/pdf"
                    multiple
                    className="hidden"
                    onChange={handleAddAccountDocs}
                    disabled={uploadingDocs}
                  />
                </label>
              </div>

              {dormDocs.length > 0 && (
                <div>
                  <p className="text-sm font-semibold text-ink-strong">{t.dormDocsLabel}</p>
                  {dormDocs.map((d) => (
                    <div key={d.dormId} className="mt-1.5">
                      <p className="text-xs font-medium text-ink-subtitle">{d.dormName}</p>
                      {d.documents.length ? (
                        <ul className="mt-1 flex flex-col gap-0.5">
                          {d.documents.map((url, i) => (
                            <li key={url}>
                              <a href={url} target="_blank" rel="noreferrer" className="text-sm text-tenant underline">
                                {t.docItem(i + 1)}
                              </a>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-xs text-ink-faint">{t.docsNone}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
            <button
              onClick={() => setDocsTarget(null)}
              className="mt-4 w-full rounded-btn bg-tenant py-2.5 text-sm font-semibold text-white hover:bg-tenant-dark"
            >
              {t.close}
            </button>
          </div>
        </div>
      )}

      {addOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 sm:p-6">
          <div className="max-h-[85vh] w-full max-w-sm overflow-y-auto rounded-card-lg border border-card-border bg-white p-5 shadow-card">
            <h2 className="font-bold text-ink-strong">{t.addUserTitle}</h2>
            <p className="mt-1 text-sm text-ink-subtitle">{t.addUserHint}</p>
            <form onSubmit={submitAdd} className="mt-4 flex flex-col gap-3">
              <input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder={t.namePlaceholder}
                className="rounded-btn border border-card-border px-3.5 py-2.5 text-sm text-ink placeholder:text-ink-faint focus:border-tenant focus:outline-none"
                required
              />
              <input
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder={t.emailPlaceholder}
                type="email"
                className="rounded-btn border border-card-border px-3.5 py-2.5 text-sm text-ink placeholder:text-ink-faint focus:border-tenant focus:outline-none"
              />
              <input
                value={newPhone}
                onChange={(e) => setNewPhone(e.target.value)}
                placeholder={t.phonePlaceholder}
                className="rounded-btn border border-card-border px-3.5 py-2.5 text-sm text-ink placeholder:text-ink-faint focus:border-tenant focus:outline-none"
              />
              <input
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder={t.passwordPlaceholder}
                type="password"
                minLength={6}
                className="rounded-btn border border-card-border px-3.5 py-2.5 text-sm text-ink placeholder:text-ink-faint focus:border-tenant focus:outline-none"
                required
              />
              <select
                value={newRole}
                onChange={(e) => setNewRole(e.target.value as 'tenant' | 'owner' | 'admin')}
                className="rounded-btn border border-card-border px-3.5 py-2.5 text-sm text-ink focus:border-tenant focus:outline-none"
              >
                <option value="tenant">{ROLE_LABEL[lang].tenant}</option>
                <option value="owner">{ROLE_LABEL[lang].owner}</option>
                <option value="admin">{ROLE_LABEL[lang].admin}</option>
              </select>
              {newRole === 'owner' && (
                <>
                  <p className="text-xs text-ink-faint">{t.ownerFollowupNote}</p>
                  <div>
                    <label className="mb-1.5 block text-xs text-ink-muted">{t.newUserDocsLabel}</label>
                    <input
                      ref={newDocsInputRef}
                      type="file"
                      accept="image/*,application/pdf"
                      multiple
                      onChange={(e) => setNewDocFiles(Array.from(e.target.files ?? []))}
                      className="text-sm text-ink"
                    />
                    {newDocFiles.length > 0 && (
                      <p className="mt-1 text-xs text-ink-faint">{t.filesSelected(newDocFiles.length)}</p>
                    )}
                  </div>
                </>
              )}
              {createError && <p className="text-sm text-danger">{createError}</p>}
              <div className="mt-1 flex gap-2">
                <button
                  type="button"
                  onClick={() => setAddOpen(false)}
                  className="flex-1 rounded-btn border border-card-border py-2.5 text-sm font-semibold text-ink-subtitle"
                >
                  {t.cancel}
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="flex-1 rounded-btn bg-tenant py-2.5 text-sm font-semibold text-white hover:bg-tenant-dark disabled:opacity-60"
                >
                  {creating ? t.creating : t.create}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 sm:p-6">
          <div className="max-h-[85vh] w-full max-w-sm overflow-y-auto rounded-card-lg border border-card-border bg-white p-5 shadow-card">
            <h2 className="font-bold text-ink-strong">{t.deleteConfirmTitle}</h2>
            <p className="mt-2 text-sm text-ink-subtitle">{t.deleteConfirmBody(deleteTarget.name)}</p>
            {deleteError && <p className="mt-3 text-sm text-danger">{deleteError}</p>}
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="flex-1 rounded-btn border border-card-border py-2.5 text-sm font-semibold text-ink-subtitle"
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
