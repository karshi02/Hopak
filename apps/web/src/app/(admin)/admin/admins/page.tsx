'use client';

import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api-client';
import { Badge, adminRoleBadge } from '@/components/dashboard/Badge';

interface AdminUser {
  id: string;
  adminRole: string;
  user: { name: string; email?: string };
}

export default function AdminAdminsPage() {
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
      setError(err instanceof Error ? err.message : 'เพิ่มผู้ดูแลไม่สำเร็จ');
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-ink-strong dark:text-white">ผู้ดูแลระบบ</h1>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="rounded-btn bg-success px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
        >
          + เพิ่มผู้ดูแล
        </button>
      </div>

      {showForm && (
        <form
          onSubmit={handleCreate}
          className="mt-4 flex flex-col gap-3 rounded-lg border border-card-border p-4 dark:border-white/10"
        >
          <input
            placeholder="User ID"
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
            บันทึก
          </button>
        </form>
      )}

      <div className="mt-4 overflow-x-auto rounded-lg border border-card-border dark:border-white/10">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-card-border text-ink-faint dark:border-white/10">
              <th className="p-3 font-normal">ชื่อ</th>
              <th className="p-3 font-normal">อีเมล</th>
              <th className="p-3 font-normal">สิทธิ์</th>
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
        {admins.length === 0 && <p className="p-4 text-ink-faint">ไม่มีผู้ดูแล</p>}
      </div>

      <div className="mt-4 rounded-card border border-card-border bg-white p-5 dark:border-white/10 dark:bg-[#1a1a19]">
        <h2 className="mb-3 font-semibold text-ink-strong dark:text-white">บทบาท &amp; สิทธิ์</h2>
        <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-ink-subtitle">
          <div>
            <b className="text-admin">Super Admin</b> — จัดการทุกอย่าง + เพิ่ม/ลบผู้ดูแล
          </div>
          <div>
            <b className="text-tenant">Admin</b> — จัดการจอง หอพัก ผู้ใช้ โฆษณา
          </div>
          <div>
            <b className="text-[#12813F]">Finance</b> — ดูการเงิน รวมบิล ออกใบ โอนเงิน
          </div>
          <div>
            <b className="text-warning-dark">Support</b> — ดูข้อมูล ตอบผู้ใช้ (อ่านอย่างเดียว)
          </div>
        </div>
      </div>
    </div>
  );
}
