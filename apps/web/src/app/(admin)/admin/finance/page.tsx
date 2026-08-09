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
interface Period {
  year: number;
  month: number;
}

const MONTH_TH = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];
const MONTH_EN = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const AVATAR_BG = ['#2F6FE0', '#E0902F', '#6D5AE0', '#12A150', '#159AAF'];
const METHOD_COLOR = ['#2F6FE0', '#12A150', '#6D5AE0', '#E0902F'];

const TEXT = {
  th: {
    title: 'การเงิน & รวมบิล',
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
  const now = new Date();
  const [sel, setSel] = useState<Period>({ year: now.getFullYear(), month: now.getMonth() + 1 });
  const [fin, setFin] = useState<FinanceSummary | null>(null);
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [periods, setPeriods] = useState<Period[]>([]);
  const [tab, setTab] = useState<Tab>('all');
  const [busy, setBusy] = useState<string | null>(null);

  function loadPeriod() {
    const qs = `?year=${sel.year}&month=${sel.month}`;
    apiClient.get<FinanceSummary>(`/admin/finance/summary${qs}`).then(setFin).catch(() => setFin(null));
    apiClient.get<PaymentRow[]>(`/admin/finance/payments${qs}`).then(setPayments).catch(() => setPayments([]));
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
      { dormId: string; owner: string; dorm: string; gross: number; commission: number; payout: number; transferred: boolean }
    >();
    for (const p of payments) {
      const g =
        map.get(p.dormId) ?? { dormId: p.dormId, owner: p.ownerName, dorm: p.dormName, gross: 0, commission: 0, payout: 0, transferred: true };
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

  async function transfer(dormId: string, name: string, amount: number) {
    if (!window.confirm(t.transferConfirm(name, baht(amount)))) return;
    setBusy(dormId);
    try {
      await apiClient.post(`/admin/finance/payouts/dorm/${dormId}/transfer-xendit`, {});
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
  const gridCols = 'grid-cols-[1.7fr_1fr_1fr_1fr_110px_84px]';

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
        <div className="rounded-[18px] border border-card-border bg-white p-6 shadow-card">
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

        <div className="rounded-[18px] border border-card-border bg-white p-6 shadow-card">
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
      <div className="mt-[18px] rounded-[18px] border border-card-border bg-white p-6 shadow-card">
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <div className="text-[18px] font-bold text-ink-strong">{t.tableTitle(monthLabel)}</div>
          <div className="ml-auto flex gap-2 print:hidden">
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

        <div className="overflow-hidden rounded-[14px] border border-[#EEF1F4]">
          <div className="overflow-x-auto">
            <div className="min-w-[760px]">
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
                  <div className="text-right">
                    {r.transferred ? (
                      <span className="text-[13px] font-bold text-ink-faint">{t.actView}</span>
                    ) : (
                      <button onClick={() => transfer(r.dormId, r.dorm, r.payout)} disabled={busy === r.dormId} className="text-[13px] font-bold text-tenant disabled:opacity-50">
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
      </div>
    </div>
  );
}

function Kpi({ bg, color, label, value, note, icon }: { bg: string; color: string; label: string; value: string; note: string; icon: React.ReactNode }) {
  return (
    <div className="rounded-[18px] border border-card-border bg-white p-5 shadow-card">
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
