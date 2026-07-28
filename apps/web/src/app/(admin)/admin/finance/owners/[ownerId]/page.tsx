'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { apiClient } from '@/lib/api-client';
import { useLang } from '@/hooks/useLang';
import { Badge } from '@/components/dashboard/Badge';

interface OwnerPaymentRow {
  id: string;
  dormName: string;
  contactName: string;
  amount: number;
  commission: number;
  chamberShare: number;
  platformShare: number;
  ownerPayout: number;
  status: string;
  createdAt: string;
  transferredAt: string | null;
  slipUrl: string | null;
  transferSlipUrl: string | null;
}

interface OwnerDetail {
  owner: {
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
    bankName: string | null;
    bankAccountName: string | null;
    bankAccountNumber: string | null;
    promptpayId: string | null;
  };
  payments: OwnerPaymentRow[];
}

const TEXT = {
  th: {
    back: '← กลับหน้าการเงิน',
    contact: 'ติดต่อ',
    bankInfo: 'บัญชีรับเงิน',
    noBankInfo: 'ยังไม่ได้ตั้งค่าบัญชีรับเงิน',
    totalPayout: 'รวมยอดโอนสะสม (โอนแล้ว)',
    totalPending: 'ยอดค้างโอน',
    dorm: 'หอพัก',
    paidAmount: 'ยอดขาย',
    commissionCut: 'คอม 20%',
    chamberCut: 'หอการค้า 10%',
    platformCut: 'แพลตฟอร์ม 10%',
    ownerPayout: 'โอนเจ้าของ 80%',
    status: 'สถานะ',
    statusLabel: { SETTLED: 'รอโอน', TRANSFERRED: 'โอนแล้ว' } as Record<string, string>,
    slip: 'สลิปลูกค้า',
    transferSlip: 'สลิปโอนเจ้าของ',
    viewSlip: 'ดูสลิป',
    noSlip: '—',
    noData: 'ยังไม่มีรายการ',
    dateLocale: 'th-TH',
  },
  en: {
    back: '← Back to Finance',
    contact: 'Contact',
    bankInfo: 'Payout account',
    noBankInfo: 'No payout account set up yet',
    totalPayout: 'Total transferred',
    totalPending: 'Pending transfer',
    dorm: 'Dorm',
    paidAmount: 'Gross amount',
    commissionCut: '20% commission',
    chamberCut: '10% chamber',
    platformCut: '10% platform',
    ownerPayout: '80% owner payout',
    status: 'Status',
    statusLabel: { SETTLED: 'Pending transfer', TRANSFERRED: 'Transferred' } as Record<string, string>,
    slip: 'Customer slip',
    transferSlip: 'Owner transfer slip',
    viewSlip: 'View slip',
    noSlip: '—',
    noData: 'No records yet',
    dateLocale: 'en-US',
  },
};

export default function AdminFinanceOwnerDetailPage() {
  const { ownerId } = useParams<{ ownerId: string }>();
  const { lang } = useLang();
  const t = TEXT[lang];
  const [detail, setDetail] = useState<OwnerDetail | null>(null);

  useEffect(() => {
    apiClient.get<OwnerDetail>(`/admin/finance/owners/${ownerId}`).then(setDetail).catch(() => {});
  }, [ownerId]);

  if (!detail) return null;

  const bankInfo = detail.owner.bankAccountNumber
    ? `${detail.owner.bankName ?? ''} ${detail.owner.bankAccountNumber}${
        detail.owner.bankAccountName ? ` · ${detail.owner.bankAccountName}` : ''
      }`.trim()
    : detail.owner.promptpayId
      ? `PromptPay: ${detail.owner.promptpayId}`
      : null;

  const totalTransferred = detail.payments
    .filter((p) => p.status === 'TRANSFERRED')
    .reduce((sum, p) => sum + p.ownerPayout, 0);
  const totalPending = detail.payments
    .filter((p) => p.status === 'SETTLED')
    .reduce((sum, p) => sum + p.ownerPayout, 0);

  return (
    <div>
      <Link href="/admin/finance" className="text-sm font-semibold text-tenant">
        {t.back}
      </Link>

      <div className="mt-3 rounded-card-lg border border-card-border bg-white p-5 shadow-card">
        <h1 className="text-lg font-bold text-ink-strong">{detail.owner.name}</h1>
        <p className="mt-1 text-sm text-ink-subtitle">
          {t.contact}: {detail.owner.email ?? '—'}
          {detail.owner.phone && ` · ${detail.owner.phone}`}
        </p>
        <p className="mt-1 text-sm text-ink-subtitle">
          {t.bankInfo}: {bankInfo ?? <span className="text-danger">{t.noBankInfo}</span>}
        </p>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="rounded-lg bg-surface-canvas p-3">
            <div className="text-xs text-ink-muted">{t.totalPayout}</div>
            <div className="mt-0.5 font-sans text-lg font-bold tabular-nums text-success">
              ฿{totalTransferred.toLocaleString()}
            </div>
          </div>
          <div className="rounded-lg bg-surface-canvas p-3">
            <div className="text-xs text-ink-muted">{t.totalPending}</div>
            <div className="mt-0.5 font-sans text-lg font-bold tabular-nums text-warning-dark">
              ฿{totalPending.toLocaleString()}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-4 overflow-x-auto rounded-card-lg border border-card-border bg-white px-2 shadow-card">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead>
            <tr className="border-b border-hairline text-xs text-ink-faint">
              <th className="p-3 font-normal">{t.dorm}</th>
              <th className="p-3 font-normal">{t.paidAmount}</th>
              <th className="p-3 font-normal">{t.commissionCut}</th>
              <th className="p-3 font-normal">{t.chamberCut}</th>
              <th className="p-3 font-normal">{t.platformCut}</th>
              <th className="p-3 font-normal">{t.ownerPayout}</th>
              <th className="p-3 font-normal">{t.status}</th>
              <th className="p-3 font-normal">{t.slip}</th>
              <th className="p-3 font-normal">{t.transferSlip}</th>
            </tr>
          </thead>
          <tbody>
            {detail.payments.map((p) => {
              const isTransferred = p.status === 'TRANSFERRED';
              const statusLabel = t.statusLabel[p.status] ?? p.status;
              return (
                <tr key={p.id} className="border-b border-hairline last:border-0">
                  <td className="p-3 font-medium text-ink-strong">{p.dormName}</td>
                  <td className="p-3 font-sans tabular-nums">฿{p.amount.toLocaleString()}</td>
                  <td className="p-3 font-sans tabular-nums text-danger">−฿{p.commission.toLocaleString()}</td>
                  <td className="p-3 font-sans tabular-nums text-warning-dark">฿{p.chamberShare.toLocaleString()}</td>
                  <td className="p-3 font-sans tabular-nums text-tenant">฿{p.platformShare.toLocaleString()}</td>
                  <td className="p-3 font-sans font-semibold tabular-nums">฿{p.ownerPayout.toLocaleString()}</td>
                  <td className="p-3">
                    <Badge label={statusLabel} variant={isTransferred ? 'good' : 'warning'} />
                  </td>
                  <td className="p-3">
                    {p.slipUrl ? (
                      <a href={p.slipUrl} target="_blank" rel="noreferrer" className="font-semibold text-tenant underline">
                        {t.viewSlip}
                      </a>
                    ) : (
                      <span className="text-ink-faint">{t.noSlip}</span>
                    )}
                  </td>
                  <td className="p-3">
                    {p.transferSlipUrl ? (
                      <a
                        href={p.transferSlipUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="font-semibold text-tenant underline"
                      >
                        {t.viewSlip}
                      </a>
                    ) : (
                      <span className="text-ink-faint">{t.noSlip}</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {detail.payments.length === 0 && <p className="p-4 text-ink-faint">{t.noData}</p>}
      </div>
    </div>
  );
}
