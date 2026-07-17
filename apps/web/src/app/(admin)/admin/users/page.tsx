'use client';

import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api-client';
import { Badge } from '@/components/dashboard/Badge';
import { FilterTabs } from '@/components/dashboard/FilterTabs';
import type { User } from '@hopak/shared';

const ROLE_LABEL: Record<string, string> = { tenant: 'ผู้เช่า', owner: 'เจ้าของหอ', admin: 'แอดมิน' };

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [roleFilter, setRoleFilter] = useState('');

  useEffect(() => {
    apiClient.get<User[]>('/admin/users').then(setUsers).catch(() => setUsers([]));
  }, []);

  const filtered = roleFilter ? users.filter((u) => u.role.toLowerCase() === roleFilter) : users;
  const count = (role: string) => (role ? users.filter((u) => u.role.toLowerCase() === role).length : users.length);

  const FILTERS = [
    { value: '', label: 'ทั้งหมด', count: count(''), tone: 'total' as const },
    { value: 'tenant', label: 'ผู้เช่า', count: count('tenant'), tone: 'neutral' as const },
    { value: 'owner', label: 'เจ้าของหอ', count: count('owner'), tone: 'neutral' as const },
    { value: 'admin', label: 'แอดมิน', count: count('admin'), tone: 'neutral' as const },
  ];

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-ink-strong dark:text-white">ผู้ใช้</h1>
        <button
          disabled
          title="ยังไม่เปิดใช้งาน — เพิ่มผู้ใช้ผ่านหน้าสมัครสมาชิกแทน"
          className="rounded-btn bg-tenant px-4 py-2 text-sm font-semibold text-white opacity-50"
        >
          + เพิ่มผู้ใช้
        </button>
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
            </tr>
          </thead>
          <tbody>
            {filtered.map((u) => (
              <tr key={u.id} className="border-t border-card-border dark:border-white/10">
                <td className="p-3 font-medium text-ink-strong dark:text-white">{u.name}</td>
                <td className="p-3 font-sans text-ink-subtitle">{u.phone ?? u.email ?? '—'}</td>
                <td className="p-3">
                  <Badge label={ROLE_LABEL[u.role.toLowerCase()] ?? u.role} variant="neutral" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && <p className="p-4 text-ink-faint">ไม่มีผู้ใช้</p>}
      </div>
    </div>
  );
}
