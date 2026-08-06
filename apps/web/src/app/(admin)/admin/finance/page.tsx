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
  centralBalance: number;
  count: number;
}

interface TransferLogRow {
  id: string;
  dormName: string;
  amount: number;
  baseAmount: number;
  bonusAmount: number;
  note: string | null;
  adminName: string;
  slipUrl: string | null;
  createdAt: string;
}

interface PaymentRow {
  id: string;
  ownerName: string;
  dormName: string;
  contactName: string;
  amount: number;
  roomPrice: number;
  deposit: number;
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
  dormId: string;
  dormName: string;
  ownerId: string;
  ownerName: string;
  ownerPhone: string | null;
  bankName: string | null;
  bankAccountName: string | null;
  bankAccountNumber: string | null;
  promptpayId: string | null;
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
    received: 'ยอดคงเหลือบัญชีกลาง',
    chamber: 'หอการค้ามหาสารคาม (10% ของค่าคอม)',
    platform: 'รายได้แพลตฟอร์ม (90% ของค่าคอม)',
    pendingAmount: 'คงค้างรอโอน',
    owner: 'เจ้าของหอ',
    dorm: 'หอพัก',
    paidAmount: 'ยอดรวม',
    rentCol: 'ค่าห้อง',
    depositCol: 'มัดจำ',
    commissionCut: 'คอม 20%',
    chamberCut: 'หอการค้า',
    platformCut: 'แพลตฟอร์ม',
    ownerPayout: 'โอนเจ้าของ (ค่าห้อง−คอม+มัดจำ)',
    status: 'สถานะ',
    statusLabel: { PENDING: 'รอเคลียร์บิล', SETTLED: 'รอโอน', TRANSFERRED: 'โอนแล้ว' } as Record<string, string>,
    settleBtn: 'เคลียร์บิล',
    settling: 'กำลังเคลียร์...',
    settleConfirm: 'ยืนยันว่าตรวจสลิปแล้ว ลูกค้าชำระเงินจริง/เข้าหอแล้ว?',
    slip: 'สลิปลูกค้า',
    viewSlip: 'ดูสลิป',
    noSlip: '—',
    noData: 'ยังไม่มีรายการ',
    dateLocale: 'th-TH',

    payoutsTitle: 'หอทั้งหมด (เลือกโอนทีละหอ)',
    noPayouts: 'ยังไม่มีหอที่อนุมัติแล้วในระบบ',
    noPayoutAmount: 'ไม่มียอดค้างโอน',
    searchDorm: 'ค้นหาหอ/เจ้าของหอ',
    bookingsCount: (n: number) => `${n} รายการจอง`,
    bank: 'บัญชี',
    noBankInfo: 'เจ้าของหอยังไม่ได้ตั้งค่าบัญชีรับเงิน',
    transferBtn: 'โอนเงิน',
    detailBtn: 'ดูรายละเอียด',

    modalTitle: 'ยืนยันการโอนเงิน',
    modalAmount: 'ยอดที่โอนจริง (แก้ไขได้)',
    modalSystemAmount: 'ยอดที่ระบบคำนวณ',
    modalBank: 'โอนเข้าบัญชี',
    modalAccountName: 'ชื่อบัญชี',
    modalNoAccountName: 'เจ้าของหอยังไม่ได้กรอกชื่อบัญชี',
    modalSlipLabel: 'แนบสลิปที่โอนแล้ว',
    modalNeedSlip: 'กรุณาแนบสลิปก่อนยืนยัน',
    modalNeedAmount: 'กรุณาระบุยอดที่โอนก่อนยืนยัน',
    modalNoLinkedPayment: 'หอนี้ไม่มียอดค้างโอนในระบบ — ระบุยอดที่จะโอนเอง (ไม่ผูกกับ payment ใดๆ)',
    modalBonusPreview: 'รวมโบนัสเพิ่มเติม',
    modalNoteLabel: 'หมายเหตุถึงเจ้าของหอ (ถ้ามี)',
    modalNotePlaceholder: 'เช่น โบนัสยอดจองเดือนนี้เกินเป้า',
    modalCancel: 'ยกเลิก',
    modalConfirm: 'ยืนยันโอนแล้ว',
    modalConfirming: 'กำลังบันทึก...',
    modalError: 'บันทึกไม่สำเร็จ',

    ownerTransferSlip: 'สลิปโอนเจ้าของ',
    transferHistoryTitle: 'ประวัติการโอนเงิน',
    transferDate: 'วันที่โอน',
    transferAmount: 'ยอดโอน',
    transferNote: 'หมายเหตุ',
    transferBy: 'โอนโดย',
    transferBonusInline: (n: number) => `รวมโบนัส ฿${n.toLocaleString()}`,
    noTransferHistory: 'ยังไม่มีประวัติการโอนเงิน',
  },
  en: {
    allPeriods: 'All periods',
    invoiceTooltip: 'Tax invoice system not connected yet',
    invoice: 'Issue tax invoice',
    received: 'Central account balance',
    chamber: 'Mahasarakham Chamber (10% of commission)',
    platform: 'Platform revenue (90% of commission)',
    pendingAmount: 'Pending transfer',
    owner: 'Owner',
    dorm: 'Dorm',
    paidAmount: 'Total',
    rentCol: 'Rent',
    depositCol: 'Deposit',
    commissionCut: '20% commission',
    chamberCut: 'Chamber',
    platformCut: 'Platform',
    ownerPayout: 'Owner payout (rent−comm+deposit)',
    status: 'Status',
    statusLabel: { PENDING: 'Awaiting review', SETTLED: 'Pending transfer', TRANSFERRED: 'Transferred' } as Record<
      string,
      string
    >,
    settleBtn: 'Settle bill',
    settling: 'Settling...',
    settleConfirm: "Confirm you've checked the slip and the customer really paid / checked in?",
    slip: 'Customer slip',
    viewSlip: 'View slip',
    noSlip: '—',
    noData: 'No records yet',
    dateLocale: 'en-US',

    payoutsTitle: 'All dorms (transfer per dorm)',
    noPayouts: 'No approved dorms yet',
    noPayoutAmount: 'No pending amount',
    searchDorm: 'Search dorm/owner',
    bookingsCount: (n: number) => `${n} bookings`,
    bank: 'Account',
    noBankInfo: "Owner hasn't set up a payout account yet",
    transferBtn: 'Transfer',
    detailBtn: 'View details',

    modalTitle: 'Confirm transfer',
    modalAmount: 'Amount actually transferred (editable)',
    modalSystemAmount: 'System-calculated amount',
    modalBank: 'Transfer to',
    modalAccountName: 'Account name',
    modalNoAccountName: 'Owner has not set an account name yet',
    modalSlipLabel: 'Attach transfer slip',
    modalNeedSlip: 'Please attach a slip before confirming',
    modalNeedAmount: 'Please enter the transfer amount before confirming',
    modalNoLinkedPayment: 'No tracked pending amount for this dorm — enter the amount manually (not tied to any payment)',
    modalBonusPreview: 'Includes bonus',
    modalNoteLabel: 'Note to owner (optional)',
    modalNotePlaceholder: 'e.g. bonus for exceeding this month’s booking target',
    modalCancel: 'Cancel',
    modalConfirm: "Confirm I've transferred",
    modalConfirming: 'Saving...',
    modalError: 'Failed to save',

    ownerTransferSlip: 'Owner transfer slip',
    transferHistoryTitle: 'Transfer history',
    transferDate: 'Date',
    transferAmount: 'Amount',
    transferNote: 'Note',
    transferBy: 'Transferred by',
    transferBonusInline: (n: number) => `incl. ฿${n.toLocaleString()} bonus`,
    noTransferHistory: 'No transfer history yet',
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
  const [payoutSearch, setPayoutSearch] = useState('');
  const [transferLogs, setTransferLogs] = useState<TransferLogRow[]>([]);

  const monthLabel = lang === 'th' ? MONTH_TH : MONTH_EN;

  const filteredPayouts = pendingPayouts.filter(
    (p) =>
      !payoutSearch ||
      p.dormName.toLowerCase().includes(payoutSearch.toLowerCase()) ||
      p.ownerName.toLowerCase().includes(payoutSearch.toLowerCase()),
  );

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
    apiClient
      .get<TransferLogRow[]>('/admin/finance/transfers')
      .then(setTransferLogs)
      .catch(() => setTransferLogs([]));
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
        <StatTile label={t.received} value={`฿${(summary?.centralBalance ?? 0).toLocaleString()}`} />
        <StatTile label={t.chamber} value={`฿${(summary?.totalChamberShare ?? 0).toLocaleString()}`} accent="tenant" />
        <StatTile label={t.platform} value={`฿${(summary?.totalPlatformShare ?? 0).toLocaleString()}`} />
        <StatTile label={t.pendingAmount} value={`฿${(summary?.totalPending ?? 0).toLocaleString()}`} />
      </div>

      <div className="mt-5">
        <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
          <h2 className="text-base font-bold text-ink-strong">{t.payoutsTitle}</h2>
          <input
            value={payoutSearch}
            onChange={(e) => setPayoutSearch(e.target.value)}
            placeholder={t.searchDorm}
            className="w-full rounded-btn border border-card-border px-3 py-1.5 text-sm outline-none focus:border-tenant sm:w-56"
          />
        </div>
        <div className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-2">
          {filteredPayouts
            .map((p) => {
              const bankInfo = p.bankAccountNumber
                ? `${p.bankName ?? ''} ${p.bankAccountNumber}${p.bankAccountName ? ` · ${p.bankAccountName}` : ''}`.trim()
                : p.promptpayId
                  ? `PromptPay: ${p.promptpayId}`
                  : null;
              const hasPayout = p.totalPayout > 0;
              return (
                <div key={p.dormId} className="rounded-card-lg border border-card-border bg-white p-4 shadow-card">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-bold text-ink-strong">{p.dormName}</div>
                      <div className="mt-0.5 truncate text-xs text-ink-muted">
                        {p.ownerName}
                        {p.ownerPhone && <span className="text-tenant"> · 📞 {p.ownerPhone}</span>}
                      </div>
                      <div className="mt-0.5 text-xs text-ink-faint">
                        {hasPayout ? t.bookingsCount(p.paymentCount) : t.noPayoutAmount}
                      </div>
                    </div>
                    <div className="shrink-0 text-right">
                      <div
                        className={`font-sans text-lg font-bold tabular-nums ${hasPayout ? 'text-ink-strong' : 'text-ink-faint'}`}
                      >
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
          {filteredPayouts.length === 0 && <p className="text-ink-faint">{t.noPayouts}</p>}
        </div>
      </div>

      <div className="mt-5">
        <h2 className="text-base font-bold text-ink-strong">{t.transferHistoryTitle}</h2>
        <div className="mt-3 overflow-x-auto rounded-card-lg border border-card-border bg-white px-2 shadow-card">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead>
              <tr className="border-b border-hairline text-xs text-ink-faint">
                <th className="p-3 font-normal">{t.transferDate}</th>
                <th className="p-3 font-normal">{t.dorm}</th>
                <th className="p-3 font-normal">{t.transferAmount}</th>
                <th className="p-3 font-normal">{t.transferNote}</th>
                <th className="p-3 font-normal">{t.transferBy}</th>
                <th className="p-3 font-normal">{t.ownerTransferSlip}</th>
              </tr>
            </thead>
            <tbody>
              {transferLogs.map((log) => (
                <tr key={log.id} className="border-b border-hairline last:border-0">
                  <td className="p-3 text-ink-subtitle">
                    {new Date(log.createdAt).toLocaleString(lang === 'th' ? 'th-TH' : 'en-US', {
                      dateStyle: 'medium',
                      timeStyle: 'short',
                    })}
                  </td>
                  <td className="p-3 font-medium text-ink-strong">{log.dormName}</td>
                  <td className="p-3 font-sans font-semibold tabular-nums">
                    ฿{log.amount.toLocaleString()}
                    {log.bonusAmount > 0 && (
                      <span className="ml-1 text-xs font-normal text-tenant">
                        ({t.transferBonusInline(log.bonusAmount)})
                      </span>
                    )}
                  </td>
                  <td className="p-3 text-ink-subtitle">{log.note ?? '—'}</td>
                  <td className="p-3 text-ink-subtitle">{log.adminName}</td>
                  <td className="p-3">
                    {log.slipUrl ? (
                      <a href={log.slipUrl} target="_blank" rel="noreferrer" className="font-semibold text-tenant underline">
                        {t.viewSlip}
                      </a>
                    ) : (
                      <span className="text-ink-faint">{t.noSlip}</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {transferLogs.length === 0 && <p className="p-4 text-ink-faint">{t.noTransferHistory}</p>}
        </div>
      </div>

      <div className="mt-5 overflow-x-auto rounded-card-lg border border-card-border bg-white px-2 shadow-card">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead>
            <tr className="border-b border-hairline text-xs text-ink-faint">
              <th className="p-3 font-normal">{t.owner}</th>
              <th className="p-3 font-normal">{t.dorm}</th>
              <th className="p-3 font-normal">{t.paidAmount}</th>
              <th className="p-3 font-normal">{t.rentCol}</th>
              <th className="p-3 font-normal">{t.depositCol}</th>
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
              const statusLabel = t.statusLabel[p.status] ?? p.status;
              const badgeVariant = p.status === 'TRANSFERRED' ? 'good' : p.status === 'SETTLED' ? 'warning' : 'critical';
              return (
                <tr key={p.id} className="border-b border-hairline last:border-0">
                  <td className="p-3 font-medium text-ink-strong">{p.ownerName}</td>
                  <td className="p-3 text-ink-subtitle">{p.dormName}</td>
                  <td className="p-3 font-sans tabular-nums">฿{p.amount.toLocaleString()}</td>
                  <td className="p-3 font-sans tabular-nums text-ink-subtitle">฿{p.roomPrice.toLocaleString()}</td>
                  <td className="p-3 font-sans tabular-nums text-ink-subtitle">฿{p.deposit.toLocaleString()}</td>
                  <td className="p-3 font-sans tabular-nums text-danger">−฿{p.commission.toLocaleString()}</td>
                  <td className="p-3 font-sans tabular-nums text-warning-dark">฿{p.chamberShare.toLocaleString()}</td>
                  <td className="p-3 font-sans tabular-nums text-tenant">฿{p.platformShare.toLocaleString()}</td>
                  <td className="p-3 font-sans font-semibold tabular-nums">฿{p.ownerPayout.toLocaleString()}</td>
                  <td className="p-3">
                    <Badge label={statusLabel} variant={badgeVariant} />
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
  const [amount, setAmount] = useState(target.totalPayout > 0 ? String(target.totalPayout) : '');
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const bonusPreview = Math.max(0, Number(amount || 0) - target.totalPayout);

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
    if (!amount || Number(amount) <= 0) {
      setError(t.modalNeedAmount);
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append('slip', slip);
      formData.append('amount', amount);
      if (note.trim()) formData.append('note', note.trim());
      const res = await fetch(`${API_URL}/admin/finance/payouts/dorm/${target.dormId}/transfer`, {
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 sm:p-6">
      <div className="max-h-[85vh] w-full max-w-sm overflow-y-auto rounded-card-lg border border-card-border bg-white p-5 shadow-card">
        <h2 className="font-bold text-ink-strong">{t.modalTitle}</h2>
        <p className="mt-1 text-sm text-ink-subtitle">
          {target.dormName} &middot; {target.ownerName}
        </p>
        {target.ownerPhone && (
          <p className="mt-1 text-sm font-semibold text-tenant">📞 {target.ownerPhone}</p>
        )}

        <div className="mt-4 rounded-lg bg-surface-canvas p-3.5 text-sm">
          <div className="flex justify-between gap-3">
            <span className="shrink-0 text-ink-muted">{t.modalBank}</span>
            <span className="text-right font-medium text-ink-strong">{bankInfo}</span>
          </div>
          <div className="mt-1.5 flex justify-between gap-3">
            <span className="shrink-0 text-ink-muted">{t.modalAccountName}</span>
            <span className={`text-right font-bold ${target.bankAccountName ? 'text-ink-strong' : 'text-danger'}`}>
              {target.bankAccountName ?? t.modalNoAccountName}
            </span>
          </div>
          <div className="mt-1.5 text-xs text-ink-faint">
            {t.modalSystemAmount}: ฿{target.totalPayout.toLocaleString()}
          </div>
          {target.totalPayout === 0 && <div className="mt-1 text-xs text-warning-dark">{t.modalNoLinkedPayment}</div>}
        </div>

        <div className="mt-3.5">
          <label className="mb-1.5 block text-sm font-medium text-ink-strong">{t.modalAmount}</label>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full rounded-lg border border-card-border px-3.5 py-2.5 font-sans text-sm tabular-nums"
          />
          {bonusPreview > 0 && (
            <p className="mt-1.5 text-xs text-tenant">
              {t.modalBonusPreview}: ฿{bonusPreview.toLocaleString()}
            </p>
          )}
        </div>

        <div className="mt-3.5">
          <label className="mb-1.5 block text-sm font-medium text-ink-strong">{t.modalNoteLabel}</label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={t.modalNotePlaceholder}
            rows={2}
            className="w-full resize-none rounded-lg border border-card-border px-3.5 py-2.5 text-sm"
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
