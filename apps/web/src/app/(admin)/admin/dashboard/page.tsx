'use client';

import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api-client';

export default function AdminDashboardPage() {
  const [byProvince, setByProvince] = useState<Record<string, number>>({});

  useEffect(() => {
    apiClient.get<Record<string, number>>('/admin/analytics/bookings-by-province').then(setByProvince);
  }, []);

  return (
    <div>
      <h1 className="text-xl font-bold">แดชบอร์ด</h1>
      <h2 className="mt-4 font-semibold">ยอดจองต่อจังหวัด</h2>
      <ul className="mt-2">
        {Object.entries(byProvince).map(([province, count]) => (
          <li key={province}>
            {province}: {count}
          </li>
        ))}
      </ul>
    </div>
  );
}
