'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiClient } from '@/lib/api-client';
import { getToken } from '@/lib/auth';
import { useLang } from '@/hooks/useLang';
import { StatTile } from '@/components/dashboard/StatTile';
import { Badge } from '@/components/dashboard/Badge';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

interface Summary {
  totalCommission: number;
  totalChamberShare: number;
  totalPlatformShare: number;
  totalPayout: number;
  totalReceived: number;
  totalTransferred: number;
  totalPending: number;
  count: number;
}

interface PaymentRow {
  id: string;
  ownerName: string;
  dormName: string;
  contactName: string;
  amount: number;
  commission: number;
  chamberShare: number;
  platformShare: number;
  ownerPayout: number;
  status: string;
  createdAt: string;
  slipUrl: string | null;
  transferSlipUrl: string | null;
}

interface Period {
  year: number;
  month: number;
}

interface PendingPayout {
  ownerId: string;
  ownerName: string;
  bankName: string | null;
  bankAccountNumber: string | null;
  promptpayId: string | null;
  dormNames: string[];
  totalPayout: number;
  paymentCount: number;
}

const MONTH_TH = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
const MONTH_EN = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const TEXT = {
  th: {
    allPeriods: 'ทุกช่วงเวลา',
    invoiceTooltip: 'ยังไม่เชื่อมระบบออกใบกำกับภาษี',
    invoice: 'ออกใบกำกับภาษี',
    received: 'ยอดเข้าบัญชีส่วนกลาง',
    chamber: 'หอการค้ามหาสารคาม (10%)',
    platform: 'รายได้แพลตฟอร์ม (10%)',
    pendingAmount: 'คงค้างรอโอน',
    owner: 'เจ้าของหอ',
    dorm: 'หอพัก',
    paidAmount: 'ยอดขาย',
    commissionCut: 'คอม 20%',
    chamberCut: 'หอการค้า 10%',
    platformCut: 'แพลตฟอร์ม 10%',
    ownerPayout: 'โอนเจ้าของ 80%',
    status: 'สถานะ',
    statusLabel: { SETTLED: 'รอโอน', TRANSFERRED: 'โอนแล้ว' } as Record<string, string>,
    slip: 'สลิปลูกค้า',
    viewSlip: 'ดูสลิป',
    noSlip: '—',
    noData: 'ยังไม่มีรายการ',
    dateLocale: 'th-TH',

    payoutsTitle: 'รอโอนเงินให้เจ้าของหอ',
    noPayouts: 'ไม่มียอดค้างโอน',
    dorms: (names: string[]) => names.join(', '),
    bookingsCount: (n: number) => `${n} รายการจอง`,
    bank: 'บัญชี',
    noBankInfo: 'เจ้าของหอยังไม่ได้ตั้งค่าบัญชีรับเงิน',
    transferBtn: 'โอนเงิน',
    detailBtn: 'ดูรายละเอียด',

    modalTitle: 'ยืนยันการโอนเงิน',
    modalAmount: 'ยอดที่โอนจริง (แก้ไขได้)',
    modalSystemAmount: 'ยอดที่ระบบคำนวณ',
    modalBank: 'โอนเข้าบัญชี',
    modalSlipLabel: 'แนบสลิปที่โอนแล้ว',
    modalNeedSlip: 'กรุณาแนบสลิปก่อนยืนยัน',
    modalCancel: 'ยกเลิก',
    modalConfirm: 'ยืนยันโอนแล้ว',
    modalConfirming: 'กำลังบันทึก...',
    modalError: 'บันทึกไม่สำเร็จ',

    ownerTransferSlip: 'สลิปโอนเจ้าของ',
  },
  en: {
    allPeriods: 'All periods',
    invoiceTooltip: 'Tax invoice system not connected yet',
    invoice: 'Issue tax invoice',
    received: 'Received to central account',
    chamber: 'Mahasarakham Chamber (10%)',
    platform: 'Platform revenue (10%)',
    pendingAmount: 'Pending transfer',
    owner: 'Owner',
    dorm: 'Dorm',
    paidAmount: 'Gross amount',
    commissionCut: '20% commission',
    chamberCut: '10% chamber',
    platformCut: '10% platform',
    ownerPayout: '80% owner payout',
    status: 'Status',
    statusLabel: { SETTLED: 'Pending transfer', TRANSFERRED: 'Transferred' } as Record<string, string>,
    slip: 'Customer slip',
    viewSlip: 'View slip',
    noSlip: '—',
    noData: 'No records yet',
    dateLocale: 'en-US',

    payoutsTitle: 'Pending owner payouts',
    noPayouts: 'No pending payouts',
    dorms: (names: string[]) => names.join(', '),
    bookingsCount: (n: number) => `${n} bookings`,
    bank: 'Account',
    noBankInfo: "Owner hasn't set up a payout account yet",
    transferBtn: 'Transfer',
    detailBtn: 'View details',

    modalTitle: 'Confirm transfer',
    modalAmount: 'Amount actually transferred (editable)',
    modalSystemAmount: 'System-calculated amount',
    modalBank: 'Transfer to',
    modalSlipLabel: 'Attach transfer slip',
    modalNeedSlip: 'Please attach a slip before confirming',
    modalCancel: 'Cancel',
    modalConfirm: "Confirm I've transferred",
    modalConfirming: 'Saving...',
    modalError: 'Failed to save',

    ownerTransferSlip: 'Owner transfer slip',
  },
};

export default function AdminFinancePage() {
  const { lang } = useLang();
  const t = TEXT[lang];
  const [summary, setSummary] = useState<Summary | null>(null);
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [periods, setPeriods] = useState<Period[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState('');
  const [pendingPayouts, setPendingPayouts] = useState<PendingPayout[]>([]);
  const [transferTarget, setTransferTarget] = useState<PendingPayout | null>(null);

  const monthLabel = lang === 'th' ? MONTH_TH : MONTH_EN;

  function periodQuery() {
    if (!selectedPeriod) return '';
    const [year, month] = selectedPeriod.split('-');
    return `?year=${year}&month=${month}`;
  }

  function reload() {
    const qs = periodQuery();
    apiClient.get<Summary>(`/admin/finance/summary${qs}`).then(setSummary).catch(() => {});
    apiClient.get<PaymentRow[]>(`/admin/finance/payments${qs}`).then(setPayments).catch(() => setPayments([]));
    apiClient
      .get<PendingPayout[]>('/admin/finance/payouts')
      .then(setPendingPayouts)
      .catch(() => setPendingPayouts([]));
  }

  useEffect(() => {
    apiClient.get<Period[]>('/admin/finance/periods').then(setPeriods).catch(() => setPeriods([]));
  }, []);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(reload, [selectedPeriod]);

  const selectClass =
    'rounded-btn border border-card-border bg-white px-3.5 py-2 text-sm font-medium text-ink outline-none';

  return (
    <div>
      <div className="flex items-center justify-between gap-2">
        <select value={selectedPeriod} onChange={(e) => setSelectedPeriod(e.target.value)} className={selectClass}>
          <option value="">{t.allPeriods}</option>
          {periods.map((p) => (
            <option key={`${p.year}-${p.month}`} value={`${p.year}-${p.month}`}>
              {monthLabel[p.month - 1]} {p.year}
            </option>
          ))}
        </select>

        <button
          disabled
          title={t.invoiceTooltip}
          className="rounded-btn border border-card-border bg-white px-4 py-2 text-sm font-semibold opacity-50"
        >
          {t.invoice}
        </button>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatTile label={t.received} value={`฿${(summary?.totalReceived ?? 0).toLocaleString()}`} />
        <StatTile label={t.chamber} value={`฿${(summary?.totalChamberShare ?? 0).toLocaleString()}`} accent="tenant" />
        <StatTile label={t.platform} value={`฿${(summary?.totalPlatformShare ?? 0).toLocaleString()}`} />
        <StatTile label={t.pendingAmount} value={`฿${(summary?.totalPending ?? 0).toLocaleString()}`} />
      </div>

      <div className="mt-5">
        <h2 className="text-base font-bold text-ink-strong">{t.payoutsTitle}</h2>
        <div className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-2">
          {pendingPayouts.map((p) => {
            const bankInfo = p.bankAccountNumber
              ? `${p.bankName ?? ''} ${p.bankAccountNumber}`.trim()
              : p.promptpayId
                ? `PromptPay: ${p.promptpayId}`
                : null;
            return (
              <div key={p.ownerId} className="rounded-card-lg border border-card-border bg-white p-4 shadow-card">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-bold text-ink-strong">{p.ownerName}</div>
                    <div className="mt-0.5 truncate text-xs text-ink-muted">{t.dorms(p.dormNames)}</div>
                    <div className="mt-0.5 text-xs text-ink-faint">{t.bookingsCount(p.paymentCount)}</div>
                  </div>
                  <div className="shrink-0 text-right">
                    <div className="font-sans text-lg font-bold tabular-nums text-ink-strong">
                      ฿{p.totalPayout.toLocaleString()}
                    </div>
                  </div>
                </div>
                <div className="mt-2.5 text-xs text-ink-subtitle">
                  {t.bank}: {bankInfo ?? <span className="text-danger">{t.noBankInfo}</span>}
                </div>
                <div className="mt-3 flex gap-2">
                  <Link
                    href={`/admin/finance/owners/${p.ownerId}`}
                    className="flex-1 rounded-btn border border-card-border py-2 text-center text-sm font-semibold text-ink-body hover:bg-surface-canvas"
                  >
                    {t.detailBtn}
                  </Link>
                  <button
                    onClick={() => setTransferTarget(p)}
                    className="flex-1 rounded-btn bg-admin-sidebar py-2 text-sm font-semibold text-white hover:opacity-90"
                  >
                    {t.transferBtn}
                  </button>
                </div>
              </div>
            );
          })}
          {pendingPayouts.length === 0 && <p className="text-ink-faint">{t.noPayouts}</p>}
        </div>
      </div>

      <div className="mt-5 overflow-x-auto rounded-card-lg border border-card-border bg-white px-2 shadow-card">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-hairline text-xs text-ink-faint">
              <th className="p-3 font-normal">{t.owner}</th>
              <th className="p-3 font-normal">{t.dorm}</th>
              <th className="p-3 font-normal">{t.paidAmount}</th>
              <th className="p-3 font-normal">{t.commissionCut}</th>
              <th className="p-3 font-normal">{t.chamberCut}</th>
              <th className="p-3 font-normal">{t.platformCut}</th>
              <th className="p-3 font-normal">{t.ownerPayout}</th>
              <th className="p-3 font-normal">{t.status}</th>
              <th className="p-3 font-normal">{t.slip}</th>
              <th className="p-3 font-normal">{t.ownerTransferSlip}</th>
            </tr>
          </thead>
          <tbody>
            {payments.map((p) => {
              const isTransferred = p.status === 'TRANSFERRED';
              const statusLabel = t.statusLabel[p.status] ?? p.status;
              return (
                <tr key={p.id} className="border-b border-hairline last:border-0">
                  <td className="p-3 font-medium text-ink-strong">{p.ownerName}</td>
                  <td className="p-3 text-ink-subtitle">{p.dormName}</td>
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
        {payments.length === 0 && <p className="p-4 text-ink-faint">{t.noData}</p>}
      </div>

      {transferTarget && (
        <TransferModal
          target={transferTarget}
          t={t}
          onClose={() => setTransferTarget(null)}
          onDone={() => {
            setTransferTarget(null);
            reload();
          }}
        />
      )}
    </div>
  );
}

function TransferModal({
  target,
  t,
  onClose,
  onDone,
}: {
  target: PendingPayout;
  t: (typeof TEXT)['th'];
  onClose: () => void;
  onDone: () => void;
}) {
  const [slip, setSlip] = useState<File | null>(null);
  const [amount, setAmount] = useState(String(target.totalPayout));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const bankInfo = target.bankAccountNumber
    ? `${target.bankName ?? ''} ${target.bankAccountNumber}`.trim()
    : target.promptpayId
      ? `PromptPay: ${target.promptpayId}`
      : t.noBankInfo;

  async function handleConfirm() {
    if (!slip) {
      setError(t.modalNeedSlip);
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append('slip', slip);
      formData.append('amount', amount);
      const res = await fetch(`${API_URL}/admin/finance/payouts/${target.ownerId}/transfer`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${getToken()}` },
        body: formData,
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message ?? t.modalError);
      }
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : t.modalError);
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-6">
      <div className="w-full max-w-sm rounded-card-lg border border-card-border bg-white p-5 shadow-card">
        <h2 className="font-bold text-ink-strong">{t.modalTitle}</h2>
        <p className="mt-1 text-sm text-ink-subtitle">{target.ownerName}</p>

        <div className="mt-4 rounded-lg bg-surface-canvas p-3.5 text-sm">
          <div className="flex justify-between gap-3">
            <span className="shrink-0 text-ink-muted">{t.modalBank}</span>
            <span className="text-right font-medium text-ink-strong">{bankInfo}</span>
          </div>
          <div className="mt-1.5 text-xs text-ink-faint">
            {t.modalSystemAmount}: ฿{target.totalPayout.toLocaleString()}
          </div>
        </div>

        <div className="mt-3.5">
          <label className="mb-1.5 block text-sm font-medium text-ink-strong">{t.modalAmount}</label>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full rounded-lg border border-card-border px-3.5 py-2.5 font-sans text-sm tabular-nums"
          />
        </div>

        <div className="mt-4">
          <label className="mb-1.5 block text-sm font-medium text-ink-strong">{t.modalSlipLabel}</label>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => {
              setSlip(e.target.files?.[0] ?? null);
              setError(null);
            }}
            className="w-full text-sm"
          />
        </div>

        {error && <p className="mt-3 text-sm text-danger">{error}</p>}

        <div className="mt-4 flex gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="flex-1 rounded-btn border border-card-border py-2.5 text-sm font-semibold text-ink-subtitle disabled:opacity-50"
          >
            {t.modalCancel}
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={submitting}
            className="flex-1 rounded-btn bg-success py-2.5 text-sm font-semibold text-white disabled:opacity-60"
          >
            {submitting ? t.modalConfirming : t.modalConfirm}
          </button>
        </div>
      </div>
    </div>
  );
}
