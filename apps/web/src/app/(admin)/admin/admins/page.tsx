'use client';

import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api-client';
import { useLang } from '@/hooks/useLang';
import { Badge, adminRoleBadge } from '@/components/dashboard/Badge';

interface AdminUser {
  id: string;
  adminRole: string;
  user: { name: string; email?: string };
}

const TEXT = {
  th: {
    title: 'ผู้ดูแลระบบ',
    add: '+ เพิ่มผู้ดูแล',
    userId: 'User ID',
    save: 'บันทึก',
    createError: 'เพิ่มผู้ดูแลไม่สำเร็จ',
    name: 'ชื่อ',
    email: 'อีเมล',
    permission: 'สิทธิ์',
    none: 'ไม่มีผู้ดูแล',
    rolesTitle: 'บทบาท & สิทธิ์',
    roleDesc: {
      superAdmin: 'จัดการทุกอย่าง + เพิ่ม/ลบผู้ดูแล',
      admin: 'จัดการจอง หอพัก ผู้ใช้ โฆษณา',
      finance: 'ดูการเงิน รวมบิล ออกใบ โอนเงิน',
      support: 'ดูข้อมูล ตอบผู้ใช้ (อ่านอย่างเดียว)',
    },
  },
  en: {
    title: 'Administrators',
    add: '+ Add admin',
    userId: 'User ID',
    save: 'Save',
    createError: 'Failed to add admin',
    name: 'Name',
    email: 'Email',
    permission: 'Permission',
    none: 'No admins',
    rolesTitle: 'Roles & Permissions',
    roleDesc: {
      superAdmin: 'Manage everything + add/remove admins',
      admin: 'Manage bookings, dorms, users, ads',
      finance: 'View finance, payouts, invoices, transfers',
      support: 'View data, reply to users (read-only)',
    },
  },
};

export default function AdminAdminsPage() {
  const { lang } = useLang();
  const t = TEXT[lang];
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ userId: '', adminRole: 'SUPPORT' });
  const [error, setError] = useState<string | null>(null);

  function reload() {
    apiClient.get<AdminUser[]>('/admin/admins').then(setAdmins);
  }

  useEffect(reload, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await apiClient.post('/admin/admins', form);
      setShowForm(false);
      setForm({ userId: '', adminRole: 'SUPPORT' });
      reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : t.createError);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-ink-strong dark:text-white">{t.title}</h1>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="rounded-btn bg-success px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
        >
          {t.add}
        </button>
      </div>

      {showForm && (
        <form
          onSubmit={handleCreate}
          className="mt-4 flex flex-col gap-3 rounded-lg border border-card-border p-4 dark:border-white/10"
        >
          <input
            placeholder={t.userId}
            value={form.userId}
            onChange={(e) => setForm({ ...form, userId: e.target.value })}
            className="rounded-lg border border-card-border px-3 py-2 dark:border-white/10 dark:bg-[#1a1a19]"
            required
          />
          <select
            value={form.adminRole}
            onChange={(e) => setForm({ ...form, adminRole: e.target.value })}
            className="rounded-lg border border-card-border px-3 py-2 dark:border-white/10 dark:bg-[#1a1a19]"
          >
            <option value="SUPER_ADMIN">Super Admin</option>
            <option value="ADMIN">Admin</option>
            <option value="FINANCE">Finance</option>
            <option value="SUPPORT">Support</option>
          </select>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button type="submit" className="rounded-lg bg-tenant py-2 text-sm font-medium text-white hover:bg-tenant-dark">
            {t.save}
          </button>
        </form>
      )}

      <div className="mt-4 overflow-x-auto rounded-lg border border-card-border dark:border-white/10">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-card-border text-ink-faint dark:border-white/10">
              <th className="p-3 font-normal">{t.name}</th>
              <th className="p-3 font-normal">{t.email}</th>
              <th className="p-3 font-normal">{t.permission}</th>
            </tr>
          </thead>
          <tbody>
            {admins.map((a) => {
              const badge = adminRoleBadge(a.adminRole);
              return (
                <tr key={a.id} className="border-t border-card-border dark:border-white/10">
                  <td className="p-3">{a.user.name}</td>
                  <td className="p-3">{a.user.email ?? '-'}</td>
                  <td className="p-3">
                    <Badge label={badge.label} variant={badge.variant} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {admins.length === 0 && <p className="p-4 text-ink-faint">{t.none}</p>}
      </div>

      <div className="mt-4 rounded-card border border-card-border bg-white p-5 dark:border-white/10 dark:bg-[#1a1a19]">
        <h2 className="mb-3 font-semibold text-ink-strong dark:text-white">{t.rolesTitle}</h2>
        <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-ink-subtitle">
          <div>
            <b className="text-admin">Super Admin</b> — {t.roleDesc.superAdmin}
          </div>
          <div>
            <b className="text-tenant">Admin</b> — {t.roleDesc.admin}
          </div>
          <div>
            <b className="text-[#12813F]">Finance</b> — {t.roleDesc.finance}
          </div>
          <div>
            <b className="text-warning-dark">Support</b> — {t.roleDesc.support}
          </div>
        </div>
      </div>
    </div>
  );
}
