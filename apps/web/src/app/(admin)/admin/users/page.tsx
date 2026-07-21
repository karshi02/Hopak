'use client';

import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api-client';
import { Badge } from '@/components/dashboard/Badge';
import { FilterTabs } from '@/components/dashboard/FilterTabs';
import type { User } from '@hopak/shared';

const ROLE_LABEL: Record<string, string> = { tenant: 'ผู้เช่า', owner: 'เจ้าของหอ', admin: 'แอดมิน' };

function formatJoined(dateStr?: string) {
  if (!dateStr) return '—';
  return new Intl.DateTimeFormat('th-TH', { month: 'short', year: '2-digit' }).format(new Date(dateStr));
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [roleFilter, setRoleFilter] = useState('');
  const [search, setSearch] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [warningTarget, setWarningTarget] = useState<User | null>(null);
  const [warningTitle, setWarningTitle] = useState('');
  const [warningMessage, setWarningMessage] = useState('');
  const [sendingWarning, setSendingWarning] = useState(false);
  const [warningResult, setWarningResult] = useState<{ notified: boolean; emailSent: boolean } | null>(null);

  function reload() {
    apiClient.get<User[]>('/admin/users').then(setUsers).catch(() => setUsers([]));
  }

  useEffect(reload, []);

  async function toggleSuspend(user: User) {
    setBusyId(user.id);
    try {
      await apiClient.patch(`/admin/users/${user.id}/suspend`, { suspended: !user.suspended });
      reload();
    } finally {
      setBusyId(null);
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

  const FILTERS = [
    { value: '', label: 'ทั้งหมด', count: count(''), tone: 'total' as const },
    { value: 'tenant', label: 'ผู้เช่า', count: count('tenant'), tone: 'neutral' as const },
    { value: 'owner', label: 'เจ้าของหอ', count: count('owner'), tone: 'neutral' as const },
    { value: 'admin', label: 'แอดมิน', count: count('admin'), tone: 'neutral' as const },
  ];

  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-xl font-bold text-ink-strong dark:text-white">ผู้ใช้</h1>
        <div className="flex items-center gap-2.5">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ค้นหาชื่อ / เบอร์…"
            className="h-9 w-56 rounded-btn border border-card-border px-3.5 text-sm text-ink placeholder:text-ink-faint focus:border-tenant focus:outline-none dark:border-white/10 dark:bg-[#1a1a19] dark:text-white"
          />
          <button
            disabled
            title="ยังไม่เปิดใช้งาน — เพิ่มผู้ใช้ผ่านหน้าสมัครสมาชิกแทน"
            className="rounded-btn bg-tenant px-4 py-2 text-sm font-semibold text-white opacity-50"
          >
            + เพิ่มผู้ใช้
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
              <th className="p-3 font-normal">ชื่อ</th>
              <th className="p-3 font-normal">ติดต่อ</th>
              <th className="p-3 font-normal">บทบาท</th>
              <th className="p-3 font-normal">จอง</th>
              <th className="p-3 font-normal">เข้าร่วม</th>
              <th className="p-3 font-normal">สถานะ</th>
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
                    <Badge label={ROLE_LABEL[role] ?? u.role} variant={role === 'owner' ? 'purple' : 'neutral'} />
                  </td>
                  <td className="p-3 font-sans tabular-nums text-ink-subtitle">
                    {isTenant ? (u.bookingCount ?? 0) : '—'}
                  </td>
                  <td className="p-3 text-ink-subtitle">{formatJoined(u.createdAt)}</td>
                  <td className="p-3">
                    {u.suspended ? (
                      <Badge label="ระงับ" variant="critical" />
                    ) : (
                      <Badge label={role === 'owner' ? 'ยืนยันแล้ว' : 'ใช้งาน'} variant="good" />
                    )}
                  </td>
                  <td className="p-3">
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => openWarning(u)}
                        className="text-sm font-semibold text-warning-dark hover:underline"
                      >
                        แจ้งเตือน
                      </button>
                      {!isAdmin && (
                        <button
                          onClick={() => toggleSuspend(u)}
                          disabled={busyId === u.id}
                          className={`text-sm font-semibold hover:underline disabled:opacity-50 ${
                            u.suspended ? 'text-success' : 'text-danger'
                          }`}
                        >
                          {u.suspended ? 'ยกเลิกระงับ' : 'ระงับ'}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {filtered.length === 0 && <p className="p-4 text-ink-faint">ไม่มีผู้ใช้</p>}
      </div>

      {warningTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-6">
          <div className="w-full max-w-sm rounded-card border border-card-border bg-white p-5 dark:border-white/10 dark:bg-[#1a1a19]">
            <h2 className="font-bold text-ink-strong dark:text-white">ส่งใบตักเตือน</h2>
            <p className="mt-1 text-sm text-ink-subtitle">
              ถึง {warningTarget.name} {warningTarget.email && `(${warningTarget.email})`}
            </p>

            {warningResult ? (
              <div className="mt-4">
                <p className="text-sm text-success">ส่งแจ้งเตือนในระบบแล้ว</p>
                <p className="mt-1 text-sm text-ink-subtitle">
                  {warningResult.emailSent
                    ? 'ส่งอีเมลสำเร็จแล้ว'
                    : warningTarget.email
                      ? 'ยังไม่ได้ตั้งค่า SMTP — ส่งได้แค่ในระบบ ไม่ได้ส่งอีเมลจริง'
                      : 'ผู้ใช้ไม่มีอีเมล ส่งได้แค่ในระบบ'}
                </p>
                <button
                  onClick={() => setWarningTarget(null)}
                  className="mt-4 w-full rounded-btn bg-tenant py-2.5 text-sm font-semibold text-white hover:bg-tenant-dark"
                >
                  ปิด
                </button>
              </div>
            ) : (
              <form onSubmit={submitWarning} className="mt-4 flex flex-col gap-3">
                <input
                  value={warningTitle}
                  onChange={(e) => setWarningTitle(e.target.value)}
                  placeholder="หัวข้อ"
                  className="rounded-btn border border-card-border px-3.5 py-2.5 text-sm text-ink placeholder:text-ink-faint focus:border-tenant focus:outline-none dark:border-white/10 dark:bg-[#1a1a19] dark:text-white"
                  required
                />
                <textarea
                  value={warningMessage}
                  onChange={(e) => setWarningMessage(e.target.value)}
                  placeholder="รายละเอียด"
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
                    ยกเลิก
                  </button>
                  <button
                    type="submit"
                    disabled={sendingWarning}
                    className="flex-1 rounded-btn bg-tenant py-2.5 text-sm font-semibold text-white hover:bg-tenant-dark disabled:opacity-60"
                  >
                    {sendingWarning ? 'กำลังส่ง...' : 'ส่ง'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
