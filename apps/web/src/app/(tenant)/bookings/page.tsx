'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useBookings } from '@/hooks/useBookings';
import { normalizeStatus } from '@/lib/normalize';
import { useLang } from '@/hooks/useLang';
import { PageLoader } from '@/components/PageLoader';
import { getToken } from '@/lib/auth';
import type { Booking } from '@hopak/shared';

const TEXT = {
  th: {
    title: 'การจองของฉัน',
    subtitle: 'ติดตามสถานะการจอง ชำระเงิน และรหัสเข้าพักทั้งหมดของคุณ',
    search: 'ค้นหาการจอง...',
    statTotal: 'การจองทั้งหมด',
    statWaiting: 'รอดำเนินการ',
    statStaying: 'กำลังเข้าพัก',
    statOutstanding: 'ยอดค้างชำระ',
    tabs: { all: 'ทั้งหมด', pay: 'รอชำระเงิน', stay: 'กำลังเข้าพัก', done: 'เสร็จสิ้น', cancel: 'ยกเลิก' } as Record<string, string>,
    st: {
      wait: 'รอเจ้าของหอยืนยัน', pay: 'รอชำระเงิน', verify: 'รอแอดมินตรวจสลิป',
      stay: 'ชำระเงินสำเร็จ · พร้อมเข้าพัก', done: 'เสร็จสิ้น', cancel: 'ยกเลิกแล้ว',
    },
    note: {
      wait: (d: string) => `ส่งคำขอเมื่อ ${d}`,
      pay: 'จองสำเร็จ · สแกน QR พร้อมเพย์เพื่อยืนยัน',
      verify: 'แนบสลิปแล้ว · รอแอดมินตรวจสอบ',
      stay: 'มีใบเสร็จและรหัสเข้าพักแล้ว',
      done: (d: string) => `เข้าพักเมื่อ ${d}`,
      cancel: 'คำขอสิ้นสุดแล้ว',
    },
    cta: { view: 'ดูสถานะ', pay: 'ชำระเงิน', receipt: 'ดูใบเสร็จ + รหัส', detail: 'ดูรายละเอียด', rebook: 'จองใหม่' },
    detailBtn: 'ดูรายละเอียด',
    checkin: 'วันเข้าอยู่',
    bookedAt: 'วันที่จอง',
    amount: 'ยอดชำระ',
    ref: 'รหัสการจอง',
    none: 'ยังไม่มีการจอง',
    noneHint: 'เริ่มค้นหาหอพักที่ถูกใจแล้วจองได้เลย',
    findDorm: 'ค้นหาหอพัก',
    roomAir: 'ห้องแอร์', roomFan: 'ห้องพัดลม',
    dateLocale: 'th-TH',
  },
  en: {
    title: 'My Bookings',
    subtitle: 'Track all your booking statuses, payments, and check-in codes',
    search: 'Search bookings...',
    statTotal: 'Total bookings',
    statWaiting: 'In progress',
    statStaying: 'Staying',
    statOutstanding: 'Outstanding',
    tabs: { all: 'All', pay: 'To pay', stay: 'Staying', done: 'Completed', cancel: 'Cancelled' } as Record<string, string>,
    st: {
      wait: 'Awaiting owner confirmation', pay: 'Awaiting payment', verify: 'Awaiting admin review',
      stay: 'Paid · ready to check in', done: 'Completed', cancel: 'Cancelled',
    },
    note: {
      wait: (d: string) => `Requested on ${d}`,
      pay: 'Booked · scan the PromptPay QR to confirm',
      verify: 'Slip attached · awaiting admin review',
      stay: 'Receipt and check-in code ready',
      done: (d: string) => `Checked in on ${d}`,
      cancel: 'This request has ended',
    },
    cta: { view: 'View status', pay: 'Pay now', receipt: 'Receipt + code', detail: 'View details', rebook: 'Book again' },
    detailBtn: 'View details',
    checkin: 'Move-in date',
    bookedAt: 'Booked on',
    amount: 'Amount',
    ref: 'Booking ref',
    none: 'No bookings yet',
    noneHint: 'Find a dorm you like and book it',
    findDorm: 'Find a dorm',
    roomAir: 'Air-con room', roomFan: 'Fan room',
    dateLocale: 'en-US',
  },
};

type Tone = 'amber' | 'blue' | 'green' | 'gray';
const TONE: Record<Tone, { bar: string; border: string; dot: string; fg: string; cta: string; shadow: string }> = {
  amber: { bar: 'bg-[#FFF8EC]', border: 'border-[#F5E4C3]', dot: 'bg-[#E0902F]', fg: 'text-[#C77B14]', cta: 'from-[#E0902F] to-[#F5B84E]', shadow: 'shadow-[0_6px_14px_rgba(224,144,47,0.3)]' },
  blue: { bar: 'bg-[#EAF1FF]', border: 'border-[#D5E4FF]', dot: 'bg-tenant', fg: 'text-[#1E4FB0]', cta: 'from-tenant to-[#5B9DFF]', shadow: 'shadow-[0_6px_14px_rgba(47,111,224,0.32)]' },
  green: { bar: 'bg-[#E7F7EF]', border: 'border-[#CBEEDD]', dot: 'bg-[#1FB56E]', fg: 'text-[#12704A]', cta: 'from-[#12A150] to-[#1FB56E]', shadow: 'shadow-[0_6px_14px_rgba(31,181,110,0.3)]' },
  gray: { bar: 'bg-[#F5F7FB]', border: 'border-[#EAEDF2]', dot: 'bg-[#9AA0AB]', fg: 'text-[#5B616C]', cta: 'from-tenant to-[#5B9DFF]', shadow: 'shadow-[0_6px_14px_rgba(47,111,224,0.28)]' },
};

export default function BookingsPage() {
  const router = useRouter();
  const { lang } = useLang();
  const t = TEXT[lang];
  const { bookings, loading } = useBookings();
  const [tab, setTab] = useState('all');
  const [q, setQ] = useState('');

  useEffect(() => {
    if (!getToken()) router.replace('/login');
  }, [router]);

  const fmtDate = (v: string | Date) =>
    new Date(v).toLocaleDateString(t.dateLocale, { day: 'numeric', month: 'short', year: 'numeric' });

  // แปลง booking จริง → props การ์ด (สถานะ/สี/ปุ่ม) ตามสถานะ + มี payment หรือยัง
  function view(b: Booking) {
    const s = normalizeStatus(b.status);
    if (s === 'pending')
      return { tab: 'pay', tone: 'blue' as Tone, label: t.st.pay, note: t.note.pay, cta: t.cta.pay, href: `/bookings/${b.id}/pay` };
    if (s === 'paid')
      return { tab: 'stay', tone: 'green' as Tone, label: t.st.stay, note: t.note.stay, cta: t.cta.receipt, href: `/bookings/${b.id}` };
    if (s === 'completed')
      return { tab: 'done', tone: 'gray' as Tone, label: t.st.done, note: t.note.done(b.checkedInAt ? fmtDate(b.checkedInAt) : fmtDate(b.checkInDate)), cta: t.cta.detail, href: `/bookings/${b.id}` };
    return { tab: 'cancel', tone: 'gray' as Tone, label: t.st.cancel, note: t.note.cancel, cta: t.cta.rebook, href: `/search` };
  }

  const rows = useMemo(() => bookings.map((b) => ({ b, v: view(b) })), [bookings, lang]); // eslint-disable-line react-hooks/exhaustive-deps

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: rows.length, wait: 0, pay: 0, stay: 0, done: 0, cancel: 0 };
    rows.forEach(({ v }) => { c[v.tab] = (c[v.tab] ?? 0) + 1; });
    return c;
  }, [rows]);

  const outstanding = useMemo(
    () => rows.filter(({ b, v }) => v.tab === 'pay' && !b.payment).reduce((sum, { b }) => sum + b.amount, 0),
    [rows],
  );

  const filtered = rows.filter(({ b, v }) => {
    if (tab !== 'all' && v.tab !== tab) return false;
    if (q.trim()) {
      const hay = `${b.room?.dorm?.name ?? ''} ${b.room?.name ?? ''} ${b.id}`.toLowerCase();
      if (!hay.includes(q.trim().toLowerCase())) return false;
    }
    return true;
  });

  // โชว์ 5 แท็บหลักเสมอ (แม้นับ 0) ตามดีไซน์ + เพิ่ม "ยกเลิก" เฉพาะเมื่อมีจริง
  const TAB_KEYS = ['all', 'wait', 'pay', 'stay', 'done', ...(counts.cancel > 0 ? ['cancel'] : [])];

  const stats = [
    { value: String(counts.all), label: t.statTotal, bg: 'bg-tenant-tint', fg: 'text-ink-strong', icon: 'M4 7h16M4 12h16M4 17h10', stroke: '#2F6FE0' },
    { value: String(counts.wait + counts.pay), label: t.statWaiting, bg: 'bg-[#FFF3E0]', fg: 'text-[#C77B14]', icon: 'M12 7v5l3 3M12 21a9 9 0 100-18 9 9 0 000 18z', stroke: '#E0902F' },
    { value: String(counts.stay), label: t.statStaying, bg: 'bg-[#E7F7EF]', fg: 'text-[#12704A]', icon: 'M3 10l9-6 9 6M5 9v10h14V9M10 19v-6h4v6', stroke: '#12A150' },
    { value: `฿${outstanding.toLocaleString()}`, label: t.statOutstanding, bg: 'bg-[#FDEEEE]', fg: 'text-[#C23B3B]', icon: 'M12 1v22M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6', stroke: '#D34B4B' },
  ];

  return (
    <main className="min-h-[calc(100vh-65px)] bg-[#F2F4F8]">
      <div className="mx-auto max-w-[1180px] px-4 py-8 sm:px-6">
        {/* header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-[26px] font-bold tracking-tight text-ink-strong sm:text-3xl">{t.title}</h1>
            <p className="mt-1.5 text-sm text-[#8A909F]">{t.subtitle}</p>
          </div>
          <div className="flex h-[46px] items-center gap-2.5 rounded-xl border border-[#E4E7EC] bg-white px-4 sm:w-[280px]">
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" className="shrink-0">
              <circle cx="11" cy="11" r="7" stroke="#8A909F" strokeWidth="1.9" />
              <path d="M20 20l-3.2-3.2" stroke="#8A909F" strokeWidth="1.9" strokeLinecap="round" />
            </svg>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={t.search}
              className="w-full bg-transparent text-sm text-ink outline-none placeholder:text-[#9AA0AB]"
            />
          </div>
        </div>

        {loading ? (
          <div className="mt-10"><PageLoader /></div>
        ) : (
          <>
            {/* stat strip */}
            <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
              {stats.map((s) => (
                <div key={s.label} className="flex items-center gap-3.5 rounded-2xl border border-[#EAEDF2] bg-white px-5 py-4 shadow-[0_2px_8px_rgba(16,24,40,0.05)]">
                  <div className={`flex h-[46px] w-[46px] shrink-0 items-center justify-center rounded-[13px] ${s.bg}`}>
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                      <path d={s.icon} stroke={s.stroke} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                  <div>
                    <div className={`text-2xl font-bold tracking-tight ${s.fg}`}>{s.value}</div>
                    <div className="mt-0.5 text-[12.5px] text-[#8A909F]">{s.label}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* filter tabs */}
            <div className="mt-6 flex flex-wrap items-center gap-2.5">
              {TAB_KEYS.map((k) => {
                const active = tab === k;
                return (
                  <button
                    key={k}
                    onClick={() => setTab(k)}
                    className={`flex h-10 items-center gap-2 rounded-full border-[1.5px] px-4 text-sm font-semibold ${
                      active ? 'border-tenant bg-tenant text-white' : 'border-[#E4E7EC] bg-white text-[#3A4050]'
                    }`}
                  >
                    {t.tabs[k]}
                    <span className={`flex h-5 min-w-[20px] items-center justify-center rounded-full px-1.5 text-[11.5px] font-bold ${active ? 'bg-white/25 text-white' : 'bg-[#EEF1F6] text-[#8A909F]'}`}>
                      {counts[k]}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* cards */}
            {filtered.length === 0 ? (
              <div className="mt-8 flex flex-col items-center rounded-2xl border border-[#EAEDF2] bg-white py-16 text-center">
                <div className="text-lg font-bold text-ink-strong">{t.none}</div>
                <p className="mt-1.5 text-sm text-[#8A909F]">{t.noneHint}</p>
                <button onClick={() => router.push('/search')} className="mt-5 rounded-xl bg-tenant px-5 py-2.5 text-sm font-bold text-white hover:bg-tenant-dark">
                  {t.findDorm}
                </button>
              </div>
            ) : (
              <div className="mt-5 flex flex-col gap-4">
                {filtered.map(({ b, v }) => {
                  const tone = TONE[v.tone];
                  const room = b.room;
                  const roomLabel = room?.name || (room?.type?.toUpperCase() === 'AIR' ? t.roomAir : t.roomFan);
                  const area = room?.dorm?.address || room?.dorm?.province || '';
                  const cover = room?.images?.[0] ?? room?.dorm?.images?.[0] ?? null;
                  const rating = room?.dorm?.avgRating;
                  return (
                    <div key={b.id} className="overflow-hidden rounded-[20px] border border-[#EAEDF2] bg-white shadow-[0_2px_10px_rgba(16,24,40,0.06)]">
                      {/* status bar */}
                      <div className={`flex flex-wrap items-center gap-2 border-b px-5 py-3 ${tone.bar} ${tone.border}`}>
                        <span className={`h-2.5 w-2.5 rounded-full ${tone.dot}`} />
                        <span className={`text-[13.5px] font-bold ${tone.fg}`}>{v.label}</span>
                        <span className="text-[12.5px] text-[#9AA0AB]">· {v.note}</span>
                        <span className="ml-auto text-[12.5px] text-[#9AA0AB]">{t.ref} #{b.id.slice(-8).toUpperCase()}</span>
                      </div>

                      <div className="flex flex-col gap-5 p-5 sm:flex-row">
                        {/* image */}
                        <div className="relative h-[130px] w-full shrink-0 overflow-hidden rounded-2xl bg-gradient-to-br from-[#3E5C8A] to-[#1E4FB0] sm:w-[172px]">
                          {cover && (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={cover} alt="" className="h-full w-full object-cover" />
                          )}
                          {rating ? (
                            <div className="absolute bottom-2 left-2 flex h-6 items-center gap-1.5 rounded-lg bg-black/70 px-2.5 backdrop-blur">
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="#FFC53D"><path d="M12 2l2.9 6.2 6.8.7-5.1 4.6 1.5 6.7L12 17.8 5.9 20.2l1.5-6.7L2.3 8.9l6.8-.7L12 2z" /></svg>
                              <span className="text-[11.5px] font-bold text-white">{rating.toFixed(1)}</span>
                            </div>
                          ) : null}
                        </div>

                        {/* info */}
                        <div className="min-w-0 flex-1">
                          <div className="text-[18px] font-bold tracking-tight text-ink-strong">{room?.dorm?.name ?? '—'}</div>
                          <div className="mt-1 flex items-center gap-1.5 text-[13px] text-[#8A909F]">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                              <path d="M12 21s7-6.3 7-11a7 7 0 10-14 0c0 4.7 7 11 7 11z" stroke="#8A909F" strokeWidth="1.7" />
                              <circle cx="12" cy="10" r="2.4" stroke="#8A909F" strokeWidth="1.7" />
                            </svg>
                            <span className="truncate">{roomLabel}{area ? ` · ${area}` : ''}</span>
                          </div>
                          <div className="mt-4 flex flex-wrap gap-x-8 gap-y-2">
                            <div>
                              <div className="text-[11.5px] text-[#9AA0AB]">{t.checkin}</div>
                              <div className="text-[14.5px] font-bold text-ink-strong">{fmtDate(b.checkInDate)}</div>
                            </div>
                            <div>
                              <div className="text-[11.5px] text-[#9AA0AB]">{t.bookedAt}</div>
                              <div className="text-[14.5px] font-bold text-ink-strong">{fmtDate(b.createdAt)}</div>
                            </div>
                            <div>
                              <div className="text-[11.5px] text-[#9AA0AB]">{t.amount}</div>
                              <div className="text-[14.5px] font-bold text-tenant">฿{b.amount.toLocaleString()}</div>
                            </div>
                          </div>
                        </div>

                        {/* actions */}
                        <div className="flex shrink-0 flex-col justify-center gap-2.5 border-t border-[#F0F2F6] pt-4 sm:w-[186px] sm:border-l sm:border-t-0 sm:pl-5 sm:pt-0">
                          <button
                            onClick={() => router.push(v.href)}
                            className={`flex h-11 items-center justify-center rounded-[11px] bg-gradient-to-br text-sm font-bold text-white ${tone.cta} ${tone.shadow}`}
                          >
                            {v.cta}
                          </button>
                          <button
                            onClick={() => router.push(`/bookings/${b.id}`)}
                            className="flex h-[42px] items-center justify-center gap-1.5 rounded-[11px] border border-[#E4E7EC] text-[13.5px] font-semibold text-[#3A4050] hover:bg-black/[0.02]"
                          >
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                              <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" stroke="#3A4050" strokeWidth="1.8" />
                              <circle cx="12" cy="12" r="3" stroke="#3A4050" strokeWidth="1.8" />
                            </svg>
                            {t.detailBtn}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
}
