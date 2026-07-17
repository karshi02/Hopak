'use client';

import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api-client';
import { normalizeStatus } from '@/lib/normalize';
import { StatTile } from '@/components/dashboard/StatTile';
import { calcCommission, calcOwnerPayout } from '@hopak/shared';
import type { Booking } from '@hopak/shared';

interface Summary {
  totalCommission: number;
  totalPayout: number;
  totalReceived: number;
  totalTransferred: number;
  totalPending: number;
  count: number;
}

export default function AdminFinancePage() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [transferring, setTransferring] = useState(false);

  function reload() {
    apiClient.get<Summary>('/admin/finance/summary').then(setSummary);
    apiClient.get<Booking[]>('/bookings').then((data) =>
      setBookings(data.filter((b) => ['paid', 'completed'].includes(normalizeStatus(b.status)))),
    );
  }

  useEffect(reload, []);

  async function transfer() {
    setTransferring(true);
    await apiClient.post('/admin/finance/transfer');
    reload();
    setTransferring(false);
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-ink-strong dark:text-white">การเงิน &amp; รวมบิล</h1>
        <div className="flex gap-2">
          <button
            disabled
            title="ยังไม่เชื่อมระบบออกใบกำกับภาษี"
            className="rounded-btn border border-card-border px-4 py-2 text-sm font-semibold opacity-50 dark:border-white/10"
          >
            ออกใบกำกับภาษี
          </button>
          <button
            onClick={transfer}
            disabled={transferring}
            className="rounded-btn bg-[#111827] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            {transferring ? 'กำลังโอน...' : 'โอนให้เจ้าของหอ'}
          </button>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatTile label="ยอดเข้าบัญชีส่วนกลาง" value={`฿${(summary?.totalReceived ?? 0).toLocaleString()}`} />
        <StatTile label="รายได้แพลตฟอร์ม (คอม 10%)" value={`฿${(summary?.totalCommission ?? 0).toLocaleString()}`} accent="tenant" />
        <StatTile label="ยอดโอนให้หอพักแล้ว" value={`฿${(summary?.totalTransferred ?? 0).toLocaleString()}`} />
        <StatTile label="คงค้างรอโอน" value={`฿${(summary?.totalPending ?? 0).toLocaleString()}`} />
      </div>

      <div className="mt-5 overflow-x-auto rounded-card border border-card-border dark:border-white/10">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-card-border text-xs text-ink-faint dark:border-white/10">
              <th className="p-3 font-normal">ผู้จอง</th>
              <th className="p-3 font-normal">ยอดชำระ</th>
              <th className="p-3 font-normal">หัก 10%</th>
              <th className="p-3 font-normal">ยอดโอนเจ้าของหอ</th>
            </tr>
          </thead>
          <tbody>
            {bookings.map((b) => (
              <tr key={b.id} className="border-t border-card-border dark:border-white/10">
                <td className="p-3 font-medium text-ink-strong dark:text-white">{b.contactName}</td>
                <td className="p-3 font-sans tabular-nums">฿{b.amount.toLocaleString()}</td>
                <td className="p-3 font-sans tabular-nums text-danger">−฿{calcCommission(b.amount).toLocaleString()}</td>
                <td className="p-3 font-sans font-semibold tabular-nums">฿{calcOwnerPayout(b.amount).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {bookings.length === 0 && <p className="p-4 text-ink-faint">ยังไม่มีรายการ</p>}
      </div>
    </div>
  );
}
