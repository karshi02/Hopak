'use client';

import { useEffect, useMemo, useState } from 'react';
import { apiClient } from '@/lib/api-client';
import { useLang } from '@/hooks/useLang';

interface FinanceSummary {
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
interface PaymentRow {
  id: string;
  dormId: string;
  ownerId: string;
  dormName: string;
  ownerName: string;
  method: string;
  amount: number;
  commission: number;
  ownerPayout: number;
  status: string; // PENDING | SETTLED | TRANSFERRED
}
// ยอดค้างโอนแยกตามประเภทการเช่า (รายเดือนหักคอม 20% · รายวันหัก 10%)
interface PayoutBucket {
  gross: number;
  commission: number;
  ownerPayout: number;
  pending: number;
  transferred: number;
  count: number;
}
interface PayoutSplitRow {
  dormId: string;
  dormName: string;
  ownerId: string;
  ownerName: string;
  monthly: PayoutBucket;
  daily: PayoutBucket;
}
interface PayoutSplit {
  rows: PayoutSplitRow[];
  totals: { monthly: PayoutBucket; daily: PayoutBucket };
}

interface Period {
  year: number;
  month: number;
}

// ข้อมูลเจ้าของหอ + บัญชีรับเงิน — เช็คก่อนกดโอน
interface OwnerDetail {
  owner: {
    id: string;
    name: string;
    email?: string | null;
    phone?: string | null;
    bankName?: string | null;
    bankAccountName?: string | null;
    bankAccountNumber?: string | null;
    promptpayId?: string | null;
  };
  payments: { id: string; dormName: string; ownerPayout: number; status: string; createdAt: string }[];
}

// รายได้หอพัก "รายวัน" — แยกจากรายเดือนคนละส่วน
interface DailyRow {
  dormId: string;
  dormName: string;
  ownerId: string;
  ownerName: string;
  bookings: number;
  nights: number;
  gross: number;
  commission: number;
  ownerPayout: number;
  transferred: number;
  pending: number;
}
interface DailySummary {
  rows: DailyRow[];
  totals: Omit<DailyRow, 'dormId' | 'dormName' | 'ownerId' | 'ownerName'>;
  adr: number;
}

const MONTH_TH = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];
const MONTH_EN = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const AVATAR_BG = ['#2F6FE0', '#E0902F', '#6D5AE0', '#12A150', '#159AAF'];
const METHOD_COLOR = ['#2F6FE0', '#12A150', '#6D5AE0', '#E0902F'];

const TEXT = {
  th: {
    title: 'การเงิน & รวมบิล',
    splitTitle: 'โอนเงินแยกประเภท (รายเดือน / รายวัน)',
    splitHint: 'คนละรอบ คนละยอด',
    monthlyLabel: 'หอรายเดือน (คอม 20%)',
    dailyLabel: 'หอรายวัน (คอม 10%)',
    splitGross: 'ยอดรับรวม',
    splitPlatform: 'ส่วนแบ่งแพลตฟอร์ม',
    splitPending: 'รอโอน',
    splitTransferred: 'โอนแล้ว',
    splitItems: 'รายการ',
    dailyTitle: 'รายได้หอพักรายวัน',
    dailySub: 'เฉพาะการจองแบบรายคืน — แยกจากรายเดือน',
    dailyBookings: 'จำนวนการจอง',
    dailyNights: 'คืนที่ขายได้',
    dailyAdr: 'ราคาเฉลี่ย/คืน',
    dailyGross: 'ยอดรับรวม',
    dailyComm: 'ค่าคอม 20%',
    dailyPayout: 'ยอดเจ้าของหอ',
    dailyTransferred: 'โอนแล้ว',
    dailyPending: 'รอโอน',
    dailyDorm: 'หอพัก',
    dailyOwner: 'เจ้าของ',
    dailyNone: 'ยังไม่มีรายได้จากหอพักรายวันในรอบนี้',
    unitBooking: 'ครั้ง',
    unitNight: 'คืน',
    sub: (m: string) => `รอบการโอน ${m}`,
    exportCsv: 'Export CSV',
    billPdf: 'รวมบิล (PDF)',
    kCentral: 'เงินเข้าเดือนนี้',
    kCentralNote: (n: number) => `จากการจอง ${n} รายการ`,
    kComm: 'ค่าคอมมิชชั่น 20%',
    kCommNote: (n: number) => `แบ่งหุ้นส่วน 10% = ฿${n.toLocaleString()}`,
    kPayout: 'ยอดโอนให้หอพัก',
    kPayoutNote: 'ยอดขาย − คอม',
    kPending: 'คงค้างรอโอน',
    kPendingNote: (n: number) => `${n} รายการ`,
    progressTitle: 'ความคืบหน้าการโอนรอบนี้',
    progressCount: (a: number, b: number) => `โอนแล้ว ${a} / ${b} หอ`,
    transferred: 'โอนแล้ว',
    waiting: 'รอโอน',
    flowGross: 'ยอดขายรวม',
    flowComm: 'ค่าคอม 20%',
    flowChamber: 'แบ่งหุ้นส่วน 10%',
    flowNet: 'รายได้สุทธิแพลตฟอร์ม',
    methodsTitle: 'ช่องทางรับเงิน',
    centralTotal: 'รวมเงินเข้าเดือนนี้',
    tableTitle: (m: string) => `รายการโอนให้เจ้าของหอ · รอบ ${m}`,
    tabAll: 'ทั้งหมด',
    tabPending: 'รอโอน',
    tabTransferred: 'โอนแล้ว',
    colOwner: 'เจ้าของหอ',
    colGross: 'ยอดขาย',
    colComm: 'หักคอม 20%',
    colPayout: 'ยอดโอน',
    colStatus: 'สถานะ',
    actTransfer: 'โอน',
    actInfo: 'ดูข้อมูล',
    ownerTitle: 'ข้อมูลเจ้าของหอ (ตรวจก่อนโอน)',
    ownerName: 'ชื่อเจ้าของ',
    ownerEmail: 'อีเมล',
    ownerPhone: 'เบอร์โทร',
    ownerBank: 'ธนาคาร',
    ownerAccName: 'ชื่อบัญชี',
    ownerAccNo: 'เลขที่บัญชี',
    ownerPromptpay: 'พร้อมเพย์',
    feesTitle: 'อัตราค่าคอมมิชชัน',
    feesSub: 'มีผลกับบิลที่ออกใหม่เท่านั้น ยอดที่คิดไปแล้วเก็บไว้ในบิลเดิม ไม่เปลี่ยนย้อนหลัง',
    feesMonthly: 'รายเดือน (% ของค่าห้อง)',
    feesDaily: 'รายวัน (% ของยอดต่อคืน)',
    feesSave: 'บันทึกอัตราใหม่',
    feesSaving: 'กำลังบันทึก...',
    feesSaved: 'บันทึกแล้ว',
    feesRange: 'กรอกได้ 0–50%',
    ownerNoBank: 'ยังไม่ได้ตั้งบัญชีรับเงิน — โอนอัตโนมัติไม่ได้',
    ownerPending: 'ยอดรอโอนของเจ้าของรายนี้',
    ownerLoading: 'กำลังโหลด...',
    close: 'ปิด',
    actView: 'ดู',
    totalAll: 'รวมทั้งหมด',
    none: 'ไม่มีรายการในรอบนี้',
    transferConfirm: (name: string, amt: string) => `โอนเงิน ${amt} ให้ ${name} ผ่าน Xendit?`,
    mPromptpay: 'พร้อมเพย์ / QR',
    mCard: 'บัตรเครดิต',
    mBank: 'โอนธนาคาร',
    mOther: 'อื่นๆ',
  },
  en: {
    title: 'Finance & Payouts',
    splitTitle: 'Payouts by rental type (monthly / daily)',
    splitHint: 'separate rounds',
    monthlyLabel: 'Monthly dorms (20% comm)',
    dailyLabel: 'Daily dorms (10% comm)',
    splitGross: 'Gross received',
    splitPlatform: 'Platform share',
    splitPending: 'Pending',
    splitTransferred: 'Transferred',
    splitItems: 'items',
    dailyTitle: 'Daily rental revenue',
    dailySub: 'Per-night bookings only — separate from monthly',
    dailyBookings: 'Bookings',
    dailyNights: 'Nights sold',
    dailyAdr: 'Avg / night',
    dailyGross: 'Gross received',
    dailyComm: 'Commission 20%',
    dailyPayout: 'Owner payout',
    dailyTransferred: 'Transferred',
    dailyPending: 'Awaiting transfer',
    dailyDorm: 'Dorm',
    dailyOwner: 'Owner',
    dailyNone: 'No daily rental revenue in this period',
    unitBooking: 'bookings',
    unitNight: 'nights',
    sub: (m: string) => `Payout cycle ${m}`,
    exportCsv: 'Export CSV',
    billPdf: 'Bill (PDF)',
    kCentral: 'Received this month',
    kCentralNote: (n: number) => `from ${n} bookings`,
    kComm: 'Commission 20%',
    kCommNote: (n: number) => `partner share 10% = ฿${n.toLocaleString()}`,
    kPayout: 'Owner payouts',
    kPayoutNote: 'gross − commission',
    kPending: 'Pending payout',
    kPendingNote: (n: number) => `${n} items`,
    progressTitle: 'Payout progress this cycle',
    progressCount: (a: number, b: number) => `${a} / ${b} dorms paid`,
    transferred: 'Transferred',
    waiting: 'Pending',
    flowGross: 'Gross sales',
    flowComm: 'Commission 20%',
    flowChamber: 'Partner share 10%',
    flowNet: 'Net platform revenue',
    methodsTitle: 'Payment methods',
    centralTotal: 'Central balance',
    tableTitle: (m: string) => `Owner payouts · ${m}`,
    tabAll: 'All',
    tabPending: 'Pending',
    tabTransferred: 'Transferred',
    colOwner: 'Owner',
    colGross: 'Gross',
    colComm: 'Comm 20%',
    colPayout: 'Payout',
    colStatus: 'Status',
    actTransfer: 'Pay',
    actInfo: 'Details',
    ownerTitle: 'Owner details (check before paying)',
    ownerName: 'Owner',
    ownerEmail: 'Email',
    ownerPhone: 'Phone',
    ownerBank: 'Bank',
    ownerAccName: 'Account name',
    ownerAccNo: 'Account number',
    ownerPromptpay: 'PromptPay',
    feesTitle: 'Commission rates',
    feesSub: 'Applies to newly issued bills only — amounts already charged stay as recorded.',
    feesMonthly: 'Monthly (% of room price)',
    feesDaily: 'Daily (% of nightly total)',
    feesSave: 'Save rates',
    feesSaving: 'Saving...',
    feesSaved: 'Saved',
    feesRange: 'Allowed range 0–50%',
    ownerNoBank: 'No payout account set — automatic transfer unavailable',
    ownerPending: 'Pending payout for this owner',
    ownerLoading: 'Loading...',
    close: 'Close',
    actView: 'View',
    totalAll: 'Total',
    none: 'No items this cycle',
    transferConfirm: (name: string, amt: string) => `Transfer ${amt} to ${name} via Xendit?`,
    mPromptpay: 'PromptPay / QR',
    mCard: 'Credit card',
    mBank: 'Bank transfer',
    mOther: 'Other',
  },
};

type Tab = 'all' | 'pending' | 'transferred';

export default function AdminFinancePage() {
  const { lang } = useLang();
  const t = TEXT[lang];

  // อัตราค่าคอม — แก้ที่นี่แล้วมีผลกับบิลใหม่ทันที (payments.service อ่านค่านี้ตอนออก QR)
  // เก็บเป็น "เปอร์เซ็นต์" ในช่องกรอก แต่ส่ง/รับกับ API เป็นสัดส่วน 0-1
  const [feePct, setFeePct] = useState<{ monthly: string; daily: string }>({ monthly: '', daily: '' });
  const [feeBusy, setFeeBusy] = useState(false);
  const [feeMsg, setFeeMsg] = useState<string | null>(null);
  useEffect(() => {
    apiClient
      .get<{ commissionRate: number; dailyCommissionRate: number }>('/settings/fees')
      .then((d) =>
        setFeePct({
          monthly: String(Math.round(d.commissionRate * 1000) / 10),
          daily: String(Math.round(d.dailyCommissionRate * 1000) / 10),
        }),
      )
      .catch(() => {});
  }, []);

  async function saveFees() {
    setFeeMsg(null);
    const monthly = Number(feePct.monthly);
    const daily = Number(feePct.daily);
    if (![monthly, daily].every((v) => Number.isFinite(v) && v >= 0 && v <= 50)) {
      setFeeMsg(t.feesRange);
      return;
    }
    setFeeBusy(true);
    try {
      await apiClient.post('/admin/settings/fees', {
        commissionRate: monthly / 100,
        dailyCommissionRate: daily / 100,
      });
      setFeeMsg(t.feesSaved);
    } catch (err) {
      setFeeMsg(err instanceof Error ? err.message : 'บันทึกไม่สำเร็จ');
    } finally {
      setFeeBusy(false);
    }
  }
  const now = new Date();
  const [sel, setSel] = useState<Period>({ year: now.getFullYear(), month: now.getMonth() + 1 });
  const [fin, setFin] = useState<FinanceSummary | null>(null);
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [periods, setPeriods] = useState<Period[]>([]);
  const [tab, setTab] = useState<Tab>('all');
  const [daily, setDaily] = useState<DailySummary | null>(null);
  const [split, setSplit] = useState<PayoutSplit | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  // โมดัลดูข้อมูลเจ้าของหอก่อนโอน
  const [ownerModal, setOwnerModal] = useState<{ dormId: string; dorm: string; payout: number } | null>(null);
  const [ownerDetail, setOwnerDetail] = useState<OwnerDetail | null>(null);

  function loadPeriod() {
    const qs = `?year=${sel.year}&month=${sel.month}`;
    apiClient.get<FinanceSummary>(`/admin/finance/summary${qs}`).then(setFin).catch(() => setFin(null));
    apiClient.get<PaymentRow[]>(`/admin/finance/payments${qs}`).then(setPayments).catch(() => setPayments([]));
    apiClient
      .get<DailySummary>(`/admin/finance/daily-summary${qs}`)
      .then(setDaily)
      .catch(() => setDaily(null));
    apiClient
      .get<PayoutSplit>('/admin/finance/payout-breakdown')
      .then(setSplit)
      .catch(() => setSplit(null));
  }
  useEffect(() => {
    apiClient.get<Period[]>('/admin/finance/periods').then(setPeriods).catch(() => setPeriods([]));
  }, []);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(loadPeriod, [sel]);

  const monthLabel = `${(lang === 'th' ? MONTH_TH : MONTH_EN)[sel.month - 1]} ${sel.year}`;
  const baht = (n: number) => `฿${Math.round(n).toLocaleString()}`;

  // รวม payment เป็นรายหอ
  const dormRows = useMemo(() => {
    const map = new Map<
      string,
      { dormId: string; ownerId: string; owner: string; dorm: string; gross: number; commission: number; payout: number; transferred: boolean }
    >();
    for (const p of payments) {
      const g =
        map.get(p.dormId) ?? {
          dormId: p.dormId,
          ownerId: p.ownerId,
          owner: p.ownerName,
          dorm: p.dormName,
          gross: 0,
          commission: 0,
          payout: 0,
          transferred: true,
        };
      g.gross += p.amount;
      g.commission += p.commission;
      g.payout += p.ownerPayout;
      if (p.status !== 'TRANSFERRED') g.transferred = false;
      map.set(p.dormId, g);
    }
    return [...map.values()].sort((a, b) => b.gross - a.gross);
  }, [payments]);

  const paidCount = dormRows.filter((r) => r.transferred).length;
  const pendingCount = dormRows.length - paidCount;
  const totalGross = dormRows.reduce((s, r) => s + r.gross, 0);
  const totalComm = dormRows.reduce((s, r) => s + r.commission, 0);
  const totalPayout = dormRows.reduce((s, r) => s + r.payout, 0);

  // แยกช่องทางรับเงินตาม method
  const methods = useMemo(() => {
    const map = new Map<string, number>();
    for (const p of payments) {
      const key = p.method?.toLowerCase().includes('promptpay')
        ? t.mPromptpay
        : p.method?.toLowerCase().includes('card')
          ? t.mCard
          : p.method?.toLowerCase().includes('bank')
            ? t.mBank
            : t.mOther;
      map.set(key, (map.get(key) ?? 0) + p.amount);
    }
    return [...map.entries()].map(([label, v], i) => ({ label, v, color: METHOD_COLOR[i % METHOD_COLOR.length] }));
  }, [payments, t]);
  const methodTotal = methods.reduce((s, m) => s + m.v, 0);

  const filtered = dormRows.filter((r) => (tab === 'all' ? true : tab === 'pending' ? !r.transferred : r.transferred));

  // เปิดดูข้อมูลเจ้าของหอ (บัญชี/เบอร์/อีเมล) ก่อนตัดสินใจโอน
  function openOwner(row: { dormId: string; ownerId: string; dorm: string; payout: number }) {
    setOwnerModal({ dormId: row.dormId, dorm: row.dorm, payout: row.payout });
    setOwnerDetail(null);
    apiClient
      .get<OwnerDetail>(`/admin/finance/owners/${row.ownerId}`)
      .then(setOwnerDetail)
      .catch(() => setOwnerDetail(null));
  }

  async function transfer(dormId: string, name: string, amount: number, rentalType?: 'MONTHLY' | 'DAILY') {
    if (!window.confirm(t.transferConfirm(name, baht(amount)))) return;
    setBusy(`${dormId}-${rentalType ?? 'ALL'}`);
    try {
      // ระบุ rentalType = โอนเฉพาะยอดของประเภทนั้น (รายเดือน/รายวัน แยกรอบกัน)
      await apiClient.post(`/admin/finance/payouts/dorm/${dormId}/transfer-xendit`, {
        ...(rentalType ? { rentalType } : {}),
      });
      loadPeriod();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'error');
    } finally {
      setBusy(null);
    }
  }

  function exportCsv() {
    const header = [t.colOwner, 'gross', 'commission', 'payout', t.colStatus];
    const rows = dormRows.map((r) => [r.dorm, r.gross, r.commission, r.payout, r.transferred ? t.transferred : t.waiting]);
    rows.push([t.totalAll, totalGross, totalComm, totalPayout, '']);
    const csv = [header, ...rows].map((row) => row.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const url = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `hopak-payouts-${sel.year}-${sel.month}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const s = fin;
  const gridCols = 'grid-cols-[1.5fr_1fr_1fr_1fr_96px_74px]';

  return (
    <div>
      {/* topbar */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-[26px] font-bold tracking-tight text-ink-strong">{t.title}</h1>
          <p className="mt-1 text-[13.5px] text-ink-muted">{t.sub(monthLabel)}</p>
        </div>
        <div className="flex items-center gap-2.5 print:hidden">
          <select
            value={`${sel.year}-${sel.month}`}
            onChange={(e) => {
              const [y, m] = e.target.value.split('-').map(Number);
              setSel({ year: y, month: m });
            }}
            className="h-[42px] rounded-[11px] border border-card-border bg-white px-3.5 text-sm font-semibold text-[#3A3F49] outline-none"
          >
            <option value={`${now.getFullYear()}-${now.getMonth() + 1}`}>
              {(lang === 'th' ? MONTH_TH : MONTH_EN)[now.getMonth()]} {now.getFullYear()}
            </option>
            {periods
              .filter((p) => !(p.year === now.getFullYear() && p.month === now.getMonth() + 1))
              .map((p) => (
                <option key={`${p.year}-${p.month}`} value={`${p.year}-${p.month}`}>
                  {(lang === 'th' ? MONTH_TH : MONTH_EN)[p.month - 1]} {p.year}
                </option>
              ))}
          </select>
          <button onClick={exportCsv} className="flex h-[42px] items-center gap-2 rounded-[11px] border border-card-border bg-white px-4 text-sm font-semibold text-[#3A3F49] hover:bg-surface-canvas">
            {t.exportCsv}
          </button>
          <button onClick={() => window.print()} className="flex h-[42px] items-center gap-2 rounded-[11px] bg-gradient-to-br from-tenant to-tenant-dark px-[18px] text-sm font-bold text-white shadow-[0_8px_18px_rgba(47,111,224,0.28)] hover:brightness-105">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M12 3v11m0 0l-4-4m4 4l4-4M5 21h14" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
            {t.billPdf}
          </button>
        </div>
      </div>

      {/* KPI row */}
      <div className="mt-[18px] grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi bg="#EAF1FD" color="#111827" label={t.kCentral} value={baht(s?.centralBalance ?? 0)} note={t.kCentralNote(s?.count ?? 0)}
          icon={<><rect x="3" y="7" width="18" height="12" rx="1" stroke="#2F6FE0" strokeWidth="1.9" /><path d="M3 11h18M7 15h4" stroke="#2F6FE0" strokeWidth="1.9" strokeLinecap="round" /></>} />
        <Kpi bg="#E9F7EF" color="#12A150" label={t.kComm} value={baht(s?.totalCommission ?? 0)} note={t.kCommNote(s?.totalChamberShare ?? 0)}
          icon={<path d="M3 17l6-6 4 4 8-8M21 7v4h-4" stroke="#12A150" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />} />
        <Kpi bg="#F3ECFB" color="#111827" label={t.kPayout} value={baht(s?.totalPayout ?? 0)} note={t.kPayoutNote}
          icon={<path d="M4 12h16m0 0l-6-6m6 6l-6 6" stroke="#6D5AE0" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />} />
        <Kpi bg="#FEF6E7" color="#B4791A" label={t.kPending} value={baht(s?.totalPending ?? 0)} note={t.kPendingNote(pendingCount)}
          icon={<><circle cx="12" cy="12" r="9" stroke="#B4791A" strokeWidth="1.9" /><path d="M12 8v4l3 2" stroke="#B4791A" strokeWidth="1.9" strokeLinecap="round" /></>} />
      </div>

      {/* progress + methods */}
      <div className="mt-[18px] grid grid-cols-1 gap-4 lg:grid-cols-[1.7fr_1fr]">
        <div className="rounded-[18px] border border-card-border bg-white p-4 shadow-card sm:p-6">
          <div className="mb-4 flex items-center justify-between">
            <div className="text-[17px] font-bold text-ink-strong">{t.progressTitle}</div>
            <span className="text-[14px] text-ink-muted">{t.progressCount(paidCount, dormRows.length)}</span>
          </div>
          <div className="mb-2.5 flex h-4 overflow-hidden rounded-pill bg-[#F1F3F6]">
            <span style={{ width: `${totalPayout > 0 ? ((s?.totalTransferred ?? 0) / totalPayout) * 100 : 0}%`, background: '#12A150' }} />
            <span style={{ width: `${totalPayout > 0 ? ((s?.totalPending ?? 0) / totalPayout) * 100 : 0}%`, background: '#E0902F' }} />
          </div>
          <div className="mb-5 flex flex-wrap gap-5 text-[13px] text-ink-body">
            <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-[#12A150]" />{t.transferred} {baht(s?.totalTransferred ?? 0)}</span>
            <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-[#E0902F]" />{t.waiting} {baht(s?.totalPending ?? 0)}</span>
          </div>
          {/* flow breakdown */}
          <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
            {[
              { label: t.flowGross, value: baht(s?.totalReceived ?? 0), color: '#111827' },
              { label: t.flowComm, value: `−${baht(s?.totalCommission ?? 0)}`, color: '#C0392B' },
              { label: t.flowChamber, value: `−${baht(s?.totalChamberShare ?? 0)}`, color: '#C0392B' },
              { label: t.flowNet, value: baht(s?.totalPlatformShare ?? 0), color: '#12A150' },
            ].map((f) => (
              <div key={f.label} className="rounded-[14px] border border-[#EEF1F4] px-4 py-4">
                <div className="text-[12.5px] text-ink-muted">{f.label}</div>
                <div className="mt-1.5 text-[20px] font-bold tabular-nums" style={{ color: f.color }}>{f.value}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-[18px] border border-card-border bg-white p-4 shadow-card sm:p-6">
          <div className="mb-4 text-[17px] font-bold text-ink-strong">{t.methodsTitle}</div>
          <div className="mb-5 flex h-[14px] overflow-hidden rounded-pill bg-surface-canvas">
            {methods.map((m) => (
              <span key={m.label} style={{ width: `${methodTotal > 0 ? (m.v / methodTotal) * 100 : 0}%`, background: m.color }} />
            ))}
          </div>
          <div className="flex flex-col gap-3.5">
            {methods.map((m) => (
              <div key={m.label} className="flex items-center gap-2.5">
                <span className="h-[11px] w-[11px] rounded-[3px]" style={{ background: m.color }} />
                <span className="flex-1 text-[14px] text-ink-body">{m.label}</span>
                <span className="text-[14px] font-bold tabular-nums text-ink-strong">{baht(m.v)}</span>
              </div>
            ))}
            {methods.length === 0 && <p className="text-sm text-ink-faint">{t.none}</p>}
          </div>
          <div className="mt-5 flex items-center justify-between border-t border-[#EFF1F4] pt-[18px]">
            <span className="text-[14px] font-bold text-ink-strong">{t.centralTotal}</span>
            <span className="text-[19px] font-bold tabular-nums text-tenant">{baht(s?.centralBalance ?? 0)}</span>
          </div>
        </div>
      </div>

      {/* payout table */}
      <div className="mt-[18px] rounded-[18px] border border-card-border bg-white p-4 shadow-card sm:p-6">
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <div className="text-[18px] font-bold text-ink-strong">{t.tableTitle(monthLabel)}</div>
          <div className="ml-auto flex flex-wrap gap-2 print:hidden">
            {(
              [
                ['all', `${t.tabAll} ${dormRows.length}`],
                ['pending', `${t.tabPending} ${pendingCount}`],
                ['transferred', `${t.tabTransferred} ${paidCount}`],
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                onClick={() => setTab(key)}
                className="rounded-[9px] px-3.5 py-2 text-[13px] font-semibold"
                style={
                  tab === key
                    ? { background: '#2F6FE0', color: '#fff' }
                    : key === 'pending'
                      ? { background: '#FEF6E7', color: '#B4791A' }
                      : key === 'transferred'
                        ? { background: '#E9F7EF', color: '#12813F' }
                        : { background: '#F1F3F6', color: '#5B616C' }
                }
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* จอ md ขึ้นไป: ตารางพอดีความกว้าง ไม่ต้องเลื่อนแนวนอน */}
        <div className="hidden overflow-hidden rounded-[14px] border border-[#EEF1F4] md:block">
          <div>
            <div>
              <div className={`grid ${gridCols} gap-3 bg-[#F8F9FB] px-5 py-3 text-[12.5px] font-semibold text-ink-muted`}>
                <div>{t.colOwner}</div>
                <div className="text-right">{t.colGross}</div>
                <div className="text-right">{t.colComm}</div>
                <div className="text-right">{t.colPayout}</div>
                <div className="text-right">{t.colStatus}</div>
                <div />
              </div>
              {filtered.map((r, idx) => (
                <div key={r.dormId} className={`grid ${gridCols} items-center gap-3 border-t border-[#F1F3F6] px-5 py-3.5 text-[13.5px]`}>
                  <div className="flex items-center gap-2.5">
                    <span className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-[10px] font-sans text-[14px] font-bold text-white" style={{ background: AVATAR_BG[idx % AVATAR_BG.length] }}>
                      {(r.owner.trim()[0] ?? '?').toUpperCase()}
                    </span>
                    <span className="min-w-0 truncate font-medium text-ink-strong">{r.dorm}</span>
                  </div>
                  <div className="text-right tabular-nums text-ink-body">{baht(r.gross)}</div>
                  <div className="text-right tabular-nums text-[#C0392B]">−{baht(r.commission)}</div>
                  <div className="text-right font-bold tabular-nums text-ink-strong">{baht(r.payout)}</div>
                  <div className="text-right">
                    <span className="rounded-pill px-2.5 py-1 text-[11.5px] font-semibold" style={r.transferred ? { color: '#12813F', background: '#E9F7EF' } : { color: '#B4791A', background: '#FEF6E7' }}>
                      {r.transferred ? t.transferred : t.waiting}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center justify-end gap-1.5">
                    <button
                      onClick={() => openOwner(r)}
                      className="rounded-[8px] bg-[#EAF1FD] px-2 py-1 text-[11.5px] font-semibold text-[#2456B8]"
                    >
                      {t.actInfo}
                    </button>
                    {!r.transferred && (
                      <button
                        onClick={() => transfer(r.dormId, r.dorm, r.payout)}
                        disabled={busy === r.dormId}
                        className="rounded-[8px] bg-admin px-2 py-1 text-[11.5px] font-semibold text-white disabled:opacity-50"
                      >
                        {t.actTransfer}
                      </button>
                    )}
                  </div>
                </div>
              ))}
              {dormRows.length > 0 && (
                <div className={`grid ${gridCols} items-center gap-3 border-t-2 border-[#E7EAEF] bg-[#FAFBFC] px-5 py-4 text-[14px] font-bold`}>
                  <div className="text-ink-strong">{t.totalAll}</div>
                  <div className="text-right tabular-nums text-ink-strong">{baht(totalGross)}</div>
                  <div className="text-right tabular-nums text-[#C0392B]">−{baht(totalComm)}</div>
                  <div className="text-right tabular-nums text-[#12A150]">{baht(totalPayout)}</div>
                  <div />
                  <div />
                </div>
              )}
            </div>
          </div>
          {dormRows.length === 0 && <p className="p-5 text-ink-faint">{t.none}</p>}
        </div>

        {/* มือถือ: การ์ดต่อหอ */}
        <div className="flex flex-col gap-2.5 md:hidden">
          {filtered.map((r, idx) => (
            <div key={r.dormId} className="rounded-[14px] border border-[#EEF1F4] bg-white p-3.5">
              <div className="flex items-start gap-2.5">
                <span
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] font-sans text-[14px] font-bold text-white"
                  style={{ background: AVATAR_BG[idx % AVATAR_BG.length] }}
                >
                  {(r.owner.trim()[0] ?? '?').toUpperCase()}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="truncate font-semibold text-ink-strong">{r.dorm}</div>
                  <div className="truncate text-[12.5px] text-ink-muted">{r.owner}</div>
                </div>
                <span
                  className="shrink-0 rounded-pill px-2.5 py-1 text-[11.5px] font-semibold"
                  style={r.transferred ? { color: '#12813F', background: '#E9F7EF' } : { color: '#B4791A', background: '#FEF6E7' }}
                >
                  {r.transferred ? t.transferred : t.waiting}
                </span>
              </div>

              <dl className="mt-2.5 grid grid-cols-2 gap-x-3 gap-y-1 rounded-[10px] bg-surface-canvas px-3 py-2 text-[12.5px]">
                <dt className="text-ink-muted">{t.colGross}</dt>
                <dd className="text-right tabular-nums text-ink-body">{baht(r.gross)}</dd>
                <dt className="text-ink-muted">{t.colComm}</dt>
                <dd className="text-right tabular-nums text-[#C0392B]">−{baht(r.commission)}</dd>
                <dt className="font-semibold text-ink-body">{t.colPayout}</dt>
                <dd className="text-right font-bold tabular-nums text-ink-strong">{baht(r.payout)}</dd>
              </dl>

              <div className="mt-2.5 flex gap-2">
                <button
                  onClick={() => openOwner(r)}
                  className="flex-1 rounded-[10px] bg-[#EAF1FD] py-2 text-[13px] font-bold text-[#2456B8]"
                >
                  {t.actInfo}
                </button>
                {!r.transferred && (
                  <button
                    onClick={() => transfer(r.dormId, r.dorm, r.payout)}
                    disabled={busy === r.dormId}
                    className="flex-1 rounded-[10px] bg-admin py-2 text-[13px] font-bold text-white disabled:opacity-50"
                  >
                    {t.actTransfer}
                  </button>
                )}
              </div>
            </div>
          ))}
          {dormRows.length > 0 && (
            <div className="flex items-center justify-between rounded-[12px] bg-[#FAFBFC] px-3.5 py-3 text-[13.5px] font-bold">
              <span className="text-ink-strong">{t.totalAll}</span>
              <span className="tabular-nums text-[#12A150]">{baht(totalPayout)}</span>
            </div>
          )}
          {dormRows.length === 0 && <p className="text-ink-faint">{t.none}</p>}
        </div>
      </div>

      {/* ===== อัตราค่าคอม (แอดมินปรับเอง) ===== */}
      <div className="mt-6 rounded-[18px] border border-card-border bg-white p-4 shadow-card sm:p-5 print:hidden">
        <h2 className="text-[17px] font-bold text-ink-strong">{t.feesTitle}</h2>
        <p className="mt-0.5 text-[12.5px] text-ink-muted">{t.feesSub}</p>
        <div className="mt-4 flex flex-wrap items-end gap-3">
          {(
            [
              ['monthly', t.feesMonthly],
              ['daily', t.feesDaily],
            ] as const
          ).map(([key, label]) => (
            <label key={key} className="min-w-[190px] flex-1">
              <span className="mb-1.5 block text-[12.5px] font-semibold text-ink-muted">{label}</span>
              <div className="flex h-[42px] items-center gap-2 rounded-[11px] border border-card-border bg-white px-3.5">
                <input
                  value={feePct[key]}
                  onChange={(e) => setFeePct((prev) => ({ ...prev, [key]: e.target.value }))}
                  inputMode="decimal"
                  className="w-full bg-transparent font-sans text-[15px] font-bold tabular-nums text-ink-strong outline-none"
                />
                <span className="shrink-0 text-[13px] font-semibold text-ink-faint">%</span>
              </div>
            </label>
          ))}
          <button
            onClick={saveFees}
            disabled={feeBusy}
            className="h-[42px] shrink-0 rounded-[11px] bg-tenant px-5 text-sm font-bold text-white disabled:opacity-50"
          >
            {feeBusy ? t.feesSaving : t.feesSave}
          </button>
          {feeMsg && <span className="text-[12.5px] font-semibold text-ink-muted">{feeMsg}</span>}
        </div>
      </div>

      {/* ===== โมดัลข้อมูลเจ้าของหอ (ตรวจก่อนโอน) ===== */}
      {ownerModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="max-h-[85vh] w-full max-w-md overflow-y-auto rounded-[16px] border border-card-border bg-white p-5 shadow-card">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-[17px] font-bold text-ink-strong">{t.ownerTitle}</h2>
                <p className="mt-0.5 text-[12.5px] text-ink-muted">{ownerModal.dorm}</p>
              </div>
              <button
                onClick={() => setOwnerModal(null)}
                aria-label={t.close}
                className="shrink-0 text-ink-faint hover:text-ink-body"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </button>
            </div>

            {!ownerDetail ? (
              <p className="mt-4 text-sm text-ink-faint">{t.ownerLoading}</p>
            ) : (
              <>
                <dl className="mt-4 flex flex-col gap-2 text-[13px]">
                  {(
                    [
                      [t.ownerName, ownerDetail.owner.name],
                      [t.ownerEmail, ownerDetail.owner.email],
                      [t.ownerPhone, ownerDetail.owner.phone],
                      [t.ownerBank, ownerDetail.owner.bankName],
                      [t.ownerAccName, ownerDetail.owner.bankAccountName],
                      [t.ownerAccNo, ownerDetail.owner.bankAccountNumber],
                      [t.ownerPromptpay, ownerDetail.owner.promptpayId],
                    ] as const
                  ).map(([label, value]) => (
                    <div key={label} className="flex items-start justify-between gap-3 border-b border-hairline pb-2 last:border-0">
                      <dt className="shrink-0 text-ink-muted">{label}</dt>
                      <dd className="min-w-0 break-all text-right font-sans font-semibold text-ink-strong">
                        {value || '—'}
                      </dd>
                    </div>
                  ))}
                </dl>

                {!ownerDetail.owner.bankAccountNumber && (
                  <p className="mt-3 rounded-[10px] bg-[#FDECEC] px-3 py-2 text-[12.5px] font-semibold text-[#C0392B]">
                    {t.ownerNoBank}
                  </p>
                )}

                <div className="mt-3 flex items-center justify-between rounded-[10px] bg-surface-canvas px-3 py-2.5 text-[13px]">
                  <span className="text-ink-body">{t.ownerPending}</span>
                  <span className="font-sans font-bold tabular-nums text-[#12A150]">
                    {baht(
                      ownerDetail.payments
                        .filter((x) => x.status !== 'TRANSFERRED')
                        .reduce((sum, x) => sum + x.ownerPayout, 0),
                    )}
                  </span>
                </div>

                <div className="mt-4 flex gap-2">
                  <button
                    onClick={() => setOwnerModal(null)}
                    className="flex-1 rounded-[11px] border border-card-border py-2.5 text-[13.5px] font-semibold text-ink-body"
                  >
                    {t.close}
                  </button>
                  <button
                    onClick={() => {
                      const target = ownerModal;
                      setOwnerModal(null);
                      transfer(target.dormId, target.dorm, target.payout);
                    }}
                    disabled={busy === ownerModal.dormId || !ownerDetail.owner.bankAccountNumber}
                    className="flex-1 rounded-[11px] bg-admin py-2.5 text-[13.5px] font-bold text-white disabled:opacity-50"
                  >
                    {t.actTransfer} {baht(ownerModal.payout)}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ===== โอนเงินแยกประเภท: รายเดือน vs รายวัน ===== */}
      <div className="mt-[18px] rounded-[18px] border border-card-border bg-white p-4 shadow-card sm:p-6">
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="text-[18px] font-bold text-ink-strong">{t.splitTitle}</div>
          <span className="rounded-pill bg-[#EEECFB] px-2.5 py-1 text-[11.5px] font-semibold text-[#6D5AE0]">
            {t.splitHint}
          </span>
        </div>

        {/* ยอดรวมแต่ละประเภท */}
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {(
            [
              ['MONTHLY', t.monthlyLabel, '#2F6FE0', '#EAF1FD', split?.totals.monthly],
              ['DAILY', t.dailyLabel, '#12A150', '#E7F7EF', split?.totals.daily],
            ] as const
          ).map(([kind, label, color, bg, bucket]) => (
            <div key={kind} className="rounded-[14px] border border-card-border p-4" style={{ background: bg }}>
              <div className="text-[13px] font-bold" style={{ color }}>
                {label}
              </div>
              <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1.5 text-[12.5px]">
                <span className="text-ink-muted">{t.splitGross}</span>
                <span className="text-right font-sans tabular-nums text-ink-strong">{baht(bucket?.gross ?? 0)}</span>
                <span className="text-ink-muted">{t.splitPlatform}</span>
                <span className="text-right font-sans tabular-nums" style={{ color }}>
                  {baht(bucket?.commission ?? 0)}
                </span>
                <span className="text-ink-muted">{t.splitPending}</span>
                <span className="text-right font-sans font-bold tabular-nums text-[#B4791A]">
                  {baht(bucket?.pending ?? 0)}
                </span>
                <span className="text-ink-muted">{t.splitTransferred}</span>
                <span className="text-right font-sans tabular-nums text-[#12813F]">
                  {baht(bucket?.transferred ?? 0)}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* ต่อหอ — ปุ่มโอนแยกคนละปุ่ม */}
        <div className="mt-4 flex flex-col gap-2.5">
          {(split?.rows ?? []).map((r) => (
            <div key={r.dormId} className="rounded-[14px] border border-card-border p-3.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="truncate font-semibold text-ink-strong">{r.dormName}</div>
                  <div className="truncate text-[12.5px] text-ink-muted">{r.ownerName}</div>
                </div>
                <button
                  onClick={() => openOwner({ dormId: r.dormId, ownerId: r.ownerId, dorm: r.dormName, payout: 0 })}
                  className="rounded-[8px] bg-[#EAF1FD] px-2.5 py-1 text-[11.5px] font-semibold text-[#2456B8]"
                >
                  {t.actInfo}
                </button>
              </div>

              <div className="mt-2.5 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                {(
                  [
                    ['MONTHLY', t.monthlyLabel, '#2F6FE0', r.monthly],
                    ['DAILY', t.dailyLabel, '#12A150', r.daily],
                  ] as const
                ).map(([kind, label, color, bucket]) => (
                  <div key={kind} className="rounded-[11px] bg-surface-canvas p-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[12.5px] font-bold" style={{ color }}>
                        {label}
                      </span>
                      <span className="text-[11.5px] text-ink-faint">{bucket.count} {t.splitItems}</span>
                    </div>
                    <div className="mt-1.5 flex items-end justify-between gap-2">
                      <div>
                        <div className="font-sans text-[17px] font-bold tabular-nums text-ink-strong">
                          {baht(bucket.pending)}
                        </div>
                        <div className="text-[11px] text-ink-muted">{t.splitPending}</div>
                      </div>
                      <button
                        onClick={() => transfer(r.dormId, `${r.dormName} · ${label}`, bucket.pending, kind)}
                        disabled={bucket.pending <= 0 || busy === `${r.dormId}-${kind}`}
                        className="rounded-[9px] px-3 py-1.5 text-[12.5px] font-bold text-white disabled:opacity-40"
                        style={{ background: color }}
                      >
                        {t.actTransfer}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
          {(!split || split.rows.length === 0) && <p className="text-ink-faint">{t.none}</p>}
        </div>
      </div>

      {/* ===== รายได้หอพักรายวัน (แยกจากรายเดือน) ===== */}
      <div className="mt-[18px] rounded-[18px] border-[1.5px] border-[#CBEBD9] bg-white p-4 shadow-card sm:p-6">
        <div className="flex flex-wrap items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-[11px] bg-[#E7F7EF]">
            <svg width="19" height="19" viewBox="0 0 24 24" fill="none">
              <path
                d="M20 14.2A8.2 8.2 0 019.8 4a8.4 8.4 0 100 16.4 8.2 8.2 0 0010.2-6.2z"
                stroke="#12A150"
                strokeWidth="1.9"
                strokeLinejoin="round"
              />
            </svg>
          </span>
          <div>
            <div className="text-[18px] font-bold text-ink-strong">
              {t.dailyTitle} · {monthLabel}
            </div>
            <div className="text-[12.5px] text-ink-muted">{t.dailySub}</div>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {(
            [
              [t.dailyBookings, `${daily?.totals.bookings ?? 0} ${t.unitBooking}`, '#161A22'],
              [t.dailyNights, `${daily?.totals.nights ?? 0} ${t.unitNight}`, '#161A22'],
              [t.dailyAdr, baht(daily?.adr ?? 0), '#2F6FE0'],
              [t.dailyGross, baht(daily?.totals.gross ?? 0), '#12A150'],
            ] as const
          ).map(([label, value, color]) => (
            <div key={label} className="rounded-[13px] border border-card-border bg-[#FBFDFC] p-4">
              <div className="text-[12.5px] text-ink-muted">{label}</div>
              <div className="mt-1 text-[22px] font-bold tabular-nums" style={{ color }}>
                {value}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 hidden overflow-hidden rounded-[13px] border border-card-border md:block">
          <table className="w-full table-fixed text-left text-[13px]">
            <colgroup>
              <col className="w-[26%]" />
              <col className="w-[16%]" />
              <col className="w-[10%]" />
              <col className="w-[16%]" />
              <col className="w-[16%]" />
              <col className="w-[16%]" />
            </colgroup>
            <thead>
              <tr className="border-b border-card-border bg-[#FAFBFC] text-[11.5px] font-semibold text-ink-faint">
                <th className="px-4 py-2.5">{t.dailyDorm}</th>
                <th className="px-4 py-2.5">{t.dailyOwner}</th>
                <th className="px-4 py-2.5 text-right">{t.dailyNights}</th>
                <th className="px-4 py-2.5 text-right">{t.dailyGross}</th>
                <th className="px-4 py-2.5 text-right">{t.dailyComm}</th>
                <th className="px-4 py-2.5 text-right">{t.dailyPayout}</th>
              </tr>
            </thead>
            <tbody>
              {(daily?.rows ?? []).map((r) => (
                <tr key={r.dormId} className="border-b border-hairline last:border-0">
                  <td className="truncate px-4 py-3 font-semibold text-ink-strong" title={r.dormName}>
                    {r.dormName}
                  </td>
                  <td className="truncate px-4 py-3 text-ink-subtitle" title={r.ownerName}>
                    {r.ownerName}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-ink-subtitle">{r.nights}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-ink-strong">{baht(r.gross)}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-[#C0392B]">{baht(r.commission)}</td>
                  <td className="px-4 py-3 text-right tabular-nums font-bold text-[#12A150]">
                    {baht(r.ownerPayout)}
                    <div className="text-[11px] font-normal text-ink-faint">
                      {t.dailyTransferred} {baht(r.transferred)} · {t.dailyPending} {baht(r.pending)}
                    </div>
                  </td>
                </tr>
              ))}
              {daily && daily.rows.length > 0 && (
                <tr className="border-t-2 border-[#E7EAEF] bg-[#FAFBFC] text-[13.5px] font-bold">
                  <td className="px-4 py-3 text-ink-strong" colSpan={2}>
                    {t.totalAll}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-ink-strong">{daily.totals.nights}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-ink-strong">{baht(daily.totals.gross)}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-[#C0392B]">{baht(daily.totals.commission)}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-[#12A150]">{baht(daily.totals.ownerPayout)}</td>
                </tr>
              )}
            </tbody>
          </table>
          {(!daily || daily.rows.length === 0) && <p className="p-5 text-ink-faint">{t.dailyNone}</p>}
        </div>

        {/* มือถือ: การ์ดรายได้รายวันต่อหอ */}
        <div className="mt-4 flex flex-col gap-2.5 md:hidden">
          {(daily?.rows ?? []).map((r) => (
            <div key={r.dormId} className="rounded-[13px] border border-card-border bg-white p-3.5">
              <div className="truncate font-semibold text-ink-strong">{r.dormName}</div>
              <div className="truncate text-[12.5px] text-ink-muted">{r.ownerName}</div>

              <dl className="mt-2.5 grid grid-cols-2 gap-x-3 gap-y-1 rounded-[10px] bg-surface-canvas px-3 py-2 text-[12.5px]">
                <dt className="text-ink-muted">{t.dailyNights}</dt>
                <dd className="text-right tabular-nums text-ink-body">{r.nights}</dd>
                <dt className="text-ink-muted">{t.dailyGross}</dt>
                <dd className="text-right tabular-nums text-ink-strong">{baht(r.gross)}</dd>
                <dt className="text-ink-muted">{t.dailyComm}</dt>
                <dd className="text-right tabular-nums text-[#C0392B]">{baht(r.commission)}</dd>
                <dt className="font-semibold text-ink-body">{t.dailyPayout}</dt>
                <dd className="text-right font-bold tabular-nums text-[#12A150]">{baht(r.ownerPayout)}</dd>
              </dl>

              <div className="mt-1.5 text-[11.5px] text-ink-faint">
                {t.dailyTransferred} {baht(r.transferred)} · {t.dailyPending} {baht(r.pending)}
              </div>
            </div>
          ))}
          {daily && daily.rows.length > 0 && (
            <div className="flex items-center justify-between rounded-[12px] bg-[#FAFBFC] px-3.5 py-3 text-[13.5px] font-bold">
              <span className="text-ink-strong">{t.totalAll}</span>
              <span className="tabular-nums text-[#12A150]">{baht(daily.totals.ownerPayout)}</span>
            </div>
          )}
          {(!daily || daily.rows.length === 0) && <p className="text-ink-faint">{t.dailyNone}</p>}
        </div>
      </div>
    </div>
  );
}

function Kpi({ bg, color, label, value, note, icon }: { bg: string; color: string; label: string; value: string; note: string; icon: React.ReactNode }) {
  return (
    <div className="rounded-[18px] border border-card-border bg-white p-4 shadow-card sm:p-5">
      <div className="flex items-center gap-2.5">
        <span className="flex h-10 w-10 items-center justify-center rounded-[12px]" style={{ background: bg }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">{icon}</svg>
        </span>
        <span className="text-[13.5px] text-ink-muted">{label}</span>
      </div>
      <div className="mt-3.5 text-[28px] font-bold leading-none tracking-tight tabular-nums" style={{ color }}>{value}</div>
      <div className="mt-1.5 text-[12px] text-ink-faint">{note}</div>
    </div>
  );
}
