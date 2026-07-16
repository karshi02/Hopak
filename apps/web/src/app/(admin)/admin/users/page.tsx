'use client';

import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api-client';
import type { User } from '@hopak/shared';

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);

  useEffect(() => {
    apiClient.get<User[]>('/admin/users').then(setUsers).catch(() => setUsers([]));
  }, []);

  return (
    <div>
      <h1 className="text-xl font-bold">ผู้ใช้</h1>
      <table className="mt-4 w-full text-left text-sm">
        <thead>
          <tr>
            <th className="p-2">ชื่อ</th>
            <th className="p-2">อีเมล</th>
            <th className="p-2">บทบาท</th>
          </tr>
        </thead>
        <tbody>
          {users.map((u) => (
            <tr key={u.id} className="border-t">
              <td className="p-2">{u.name}</td>
              <td className="p-2">{u.email}</td>
              <td className="p-2">{u.role}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
