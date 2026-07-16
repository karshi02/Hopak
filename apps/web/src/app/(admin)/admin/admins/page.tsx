'use client';

import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api-client';

interface AdminUser {
  id: string;
  adminRole: string;
  user: { name: string; email: string };
}

export default function AdminAdminsPage() {
  const [admins, setAdmins] = useState<AdminUser[]>([]);

  useEffect(() => {
    apiClient.get<AdminUser[]>('/admin/admins').then(setAdmins);
  }, []);

  return (
    <div>
      <h1 className="text-xl font-bold">ผู้ดูแลระบบ</h1>
      <table className="mt-4 w-full text-left text-sm">
        <thead>
          <tr>
            <th className="p-2">ชื่อ</th>
            <th className="p-2">สิทธิ์</th>
          </tr>
        </thead>
        <tbody>
          {admins.map((a) => (
            <tr key={a.id} className="border-t">
              <td className="p-2">{a.user.name}</td>
              <td className="p-2">{a.adminRole}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
