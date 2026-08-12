'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { apiClient } from '@/lib/api-client';
import { getToken } from '@/lib/auth';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useLang } from '@/hooks/useLang';
import type { Booking, Dorm, Room } from '@hopak/shared';
import { PageLoader } from '@/components/PageLoader';
import { DailyCalendar } from '@/components/booking/DailyCalendar';

type RoomDetail = Room & { dorm: Dorm };

const TEXT = {
  th: {
    title: 'ยืนยันการจอง',
    subtitle: 'กรอกข้อมูลติดต่อเพื่อส่งคำขอจองไปยังเจ้าของหอ',
    stepPrefix: 'ขั้นที่',
    steps: ['กรอกข้อมูล', 'ชำระเงิน', 'แจ้งเจ้าของหอ', 'รับใบเสร็จ'],
    tenantInfo: 'ข้อมูลผู้เช่า',
    nameLabel: 'ชื่อ-นามสกุล',
    namePlaceholder: 'ชื่อ-นามสกุลผู้เช่า',
    phoneLabel: 'เบอร์โทรศัพท์',
    phonePlaceholder: '0812345678',
    phoneHint: 'แก้ไขเบอร์ได้ถ้าต้องการใช้เบอร์อื่นสำหรับการจองนี้',
    checkInLabel: 'วันเข้าอยู่ที่ต้องการ',
    otherDate: 'เลือกวันอื่น',
    leaseLabel: 'ระยะเวลาเช่า',
    leaseUnit: (n: number) => `${n} เดือน`,
    noteLabel: 'หมายเหตุถึงเจ้าของหอ (ถ้ามี)',
    notePlaceholder: 'เช่น ต้องการเข้าดูห้องก่อน, สอบถามเรื่องสัตว์เลี้ยง...',
    summaryTitle: 'สรุปค่าใช้จ่าย',
    firstMonth: 'ค่าเช่าเดือนแรก',
    rentMonths: (n: number) => `ค่าเช่า ${n} เดือน`,
    recommended: 'แนะนำ',
    deposit: 'ค่ามัดจำ',
    depositNote: 'ชำระผ่าน Hoprak พร้อมค่าเช่า (ปลอดภัย ไม่ต้องโอนตรงเจ้าของหอ)',
    bookingFee: 'ค่าจองผ่าน Hoprak',
    free: 'ฟรี',
    payNow: 'ยอดชำระผ่าน Hoprak',
    payNowNote: 'ค่าเช่าตามจำนวนเดือน + ค่ามัดจำ',
    submit: 'ส่งคำขอจอง',
    submitting: 'กำลังส่งคำขอ...',
    ctaHint: 'กดเพื่อส่งคำขอไปยังเจ้าของหอ',
    reassure: [
      'หากหอพักยืนยัน จะไปขั้นตอนโอนเงินต่อ · หากไม่ยืนยัน คำขอจะสิ้นสุดทันที',
      'โอนเงินเสร็จแนบสลิปในระบบ แล้วรอแอดมินตรวจสอบ',
      'แอดมินยืนยันแล้วจะออกใบเสร็จ ให้นำไปยืนยันกับหอพัก',
    ],
    secure: 'ข้อมูลของคุณถูกเข้ารหัสและปลอดภัย',
    roomAir: 'ห้องแอร์',
    roomFan: 'ห้องพัดลม',
    noReview: 'ยังไม่มีรีวิว',
    error: 'ส่งคำขอจองไม่สำเร็จ',
    roomError: 'ไม่พบห้องพักนี้ หรือห้องนี้ยังไม่เปิดให้จอง',
    fillRequired: 'กรุณากรอกชื่อ เบอร์โทร และเลือกวันเข้าอยู่',
    rentalMode: 'รูปแบบการเช่า',
    monthly: 'รายเดือน',
    daily: 'รายวัน',
    checkOutLabel: 'วันคืนห้อง',
    nightsUnit: (n: number) => `${n} คืน`,
    guestsLabel: 'จำนวนผู้เข้าพัก',
    guestsUnit: (n: number) => `${n} คน`,
    perNight: 'ค่าห้อง/คืน',
    totalNights: 'จำนวนคืน',
    unavailableTitle: 'ช่วงวันที่ไม่ว่าง (ถูกจองแล้ว)',
    overlapError: 'ช่วงวันที่เลือกถูกจองแล้ว กรุณาเลือกวันอื่น',
    pickCheckout: 'กรุณาเลือกวันคืนห้อง (ต้องหลังวันเข้าพักอย่างน้อย 1 คืน)',
    dateLocale: 'th-TH',
  },
  en: {
    title: 'Confirm booking',
    subtitle: 'Fill in your contact info to send a booking request to the dorm owner',
    stepPrefix: 'Step',
    steps: ['Fill info', 'Payment', 'Notify owner', 'Get receipt'],
    tenantInfo: 'Tenant info',
    nameLabel: 'Full name',
    namePlaceholder: 'Tenant full name',
    phoneLabel: 'Phone number',
    phonePlaceholder: '0812345678',
    phoneHint: 'You can edit the number if you want to use a different one for this booking',
    checkInLabel: 'Preferred move-in date',
    otherDate: 'Pick another date',
    leaseLabel: 'Lease term',
    leaseUnit: (n: number) => `${n} month${n > 1 ? 's' : ''}`,
    noteLabel: 'Note to the owner (optional)',
    notePlaceholder: 'e.g. I would like to view the room first, question about pets...',
    summaryTitle: 'Cost summary',
    firstMonth: 'First month rent',
    rentMonths: (n: number) => `Rent × ${n} month${n > 1 ? 's' : ''}`,
    recommended: 'Recommended',
    deposit: 'Deposit',
    depositNote: 'Paid via Hoprak with the rent (safe — no direct transfer to the owner)',
    bookingFee: 'Hoprak booking fee',
    free: 'Free',
    payNow: 'Payable through Hoprak',
    payNowNote: 'Rent for the selected months + deposit',
    submit: 'Send booking request',
    submitting: 'Sending request...',
    ctaHint: 'Tap to send the request to the dorm owner',
    reassure: [
      'If the dorm confirms, you move on to payment · if not, the request ends immediately',
      'After transferring, attach the slip in the system and wait for admin review',
      'Once the admin confirms, a receipt is issued for you to show the dorm',
    ],
    secure: 'Your information is encrypted and secure',
    roomAir: 'Air-conditioned room',
    roomFan: 'Fan room',
    noReview: 'No reviews yet',
    error: 'Failed to submit booking request',
    roomError: 'Room not found, or it is not open for booking',
    fillRequired: 'Please fill in your name, phone and pick a move-in date',
    rentalMode: 'Rental type',
    monthly: 'Monthly',
    daily: 'Daily',
    checkOutLabel: 'Check-out date',
    nightsUnit: (n: number) => `${n} night${n > 1 ? 's' : ''}`,
    guestsLabel: 'Guests',
    guestsUnit: (n: number) => `${n} guest${n > 1 ? 's' : ''}`,
    perNight: 'Room / night',
    totalNights: 'Nights',
    unavailableTitle: 'Unavailable dates (already booked)',
    overlapError: 'The selected dates are already booked, please pick other dates',
    pickCheckout: 'Please pick a check-out date (at least 1 night after check-in)',
    dateLocale: 'en-US',
  },
};

const fieldBase = 'flex h-[50px] items-center gap-3 rounded-xl border-[1.5px] bg-white px-4 transition-colors';
const fieldIdle = 'border-card-border';
const fieldActive = 'border-tenant shadow-[0_0_0_3px_rgba(47,111,224,0.1)]';
const inputBase =
  'w-full bg-transparent text-[15px] font-medium text-ink outline-none placeholder:font-normal placeholder:text-ink-faint';

/** วันที่แนะนำ 3 ตัว: วันที่ 1 และ 15 ของเดือนถัดไป และวันที่ 1 ของเดือนถัดไปอีกเดือน */
function suggestedDates(): Date[] {
  const now = new Date();
  const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  return [
    nextMonth,
    new Date(nextMonth.getFullYear(), nextMonth.getMonth(), 15),
    new Date(nextMonth.getFullYear(), nextMonth.getMonth() + 1, 1),
  ];
}

const toISODate = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

function Stepper({ t, current }: { t: (typeof TEXT)['th']; current: number }) {
  return (
    <div className="mb-6 flex items-center overflow-x-auto rounded-card-lg border border-card-border bg-white px-5 py-4 shadow-card">
      {t.steps.map((label, i) => {
        const num = i + 1;
        const active = num === current;
        const done = num < current;
        return (
          <div key={label} className="flex flex-1 items-center last:flex-none">
            <div className="flex items-center gap-2.5">
              <span
                className={`flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-pill border-2 text-sm font-bold ${
                  done
                    ? 'border-success bg-success text-white'
                    : active
                      ? 'border-tenant bg-tenant text-white'
                      : 'border-card-border bg-white text-ink-faint'
                }`}
              >
                {done ? '✓' : num}
              </span>
              <div>
                <div className="text-[10.5px] font-semibold text-ink-faint">
                  {t.stepPrefix} {num}
                </div>
                <div
                  className={`whitespace-nowrap text-[13px] font-bold ${
                    done || active ? 'text-ink-strong' : 'text-ink-faint'
                  }`}
                >
                  {label}
                </div>
              </div>
            </div>
            {num < t.steps.length && (
              <span
                className={`mx-3.5 h-0.5 min-w-[14px] flex-1 rounded-sm ${done ? 'bg-success' : 'bg-card-border'}`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

function NewBookingForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const roomId = searchParams.get('roomId') ?? '';
  const { lang } = useLang();
  const t = TEXT[lang];

  const { user } = useCurrentUser();
  const [room, setRoom] = useState<RoomDetail | null>(null);
  const [roomError, setRoomError] = useState(false);
  const [contactName, setContactName] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [checkInDate, setCheckInDate] = useState('');
  const [checkOutDate, setCheckOutDate] = useState('');
  const [leaseMonths, setLeaseMonths] = useState(1);
  const [guests, setGuests] = useState(1);
  const [bookedRanges, setBookedRanges] = useState<{ from: string; to: string }[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const dateOptions = useMemo(suggestedDates, []);
  // รูปแบบการเช่ายึดจาก "ห้อง" อย่างเดียว — ห้องรายวันจองรายวันเท่านั้น ห้องรายเดือนจองรายเดือนเท่านั้น
  // (ผู้เช่าเลือกเองไม่ได้ เพราะสองโหมดแยกขาดจากกันแล้ว)
  const isDaily = Boolean(room?.allowDaily);

  // จำนวนคืน = checkOut − checkIn (ปัดเป็นวัน) ใช้เฉพาะโหมดรายวัน
  const nights = useMemo(() => {
    if (!isDaily || !checkInDate || !checkOutDate) return 0;
    const ms = new Date(checkOutDate).getTime() - new Date(checkInDate).getTime();
    return Math.max(0, Math.round(ms / 86400000));
  }, [isDaily, checkInDate, checkOutDate]);

  // ช่วง [in, out) ที่เลือกทับกับช่วงที่ถูกจองแล้วหรือไม่ (out เป็นวันออก ไม่นับคืน)
  const overlapsBooked = (inISO: string, outISO: string) => {
    const a = new Date(inISO).getTime();
    const b = new Date(outISO).getTime();
    return bookedRanges.some((r) => {
      const x = new Date(r.from).getTime();
      const y = new Date(r.to).getTime();
      return a < y && b > x;
    });
  };

  useEffect(() => {
    if (!getToken()) router.replace('/login');
  }, [router]);

  useEffect(() => {
    if (!roomId) {
      setRoomError(true);
      return;
    }
    apiClient
      .get<RoomDetail>(`/rooms/${roomId}`)
      .then(setRoom)
      .catch(() => setRoomError(true));
    // ช่วงวันที่ถูกจองแล้ว (รายวัน) — ใช้กันเลือกวันที่เต็ม
    apiClient
      .get<{ from: string; to: string }[]>(`/bookings/availability/${roomId}`)
      .then(setBookedRanges)
      .catch(() => setBookedRanges([]));
  }, [roomId]);

  useEffect(() => {
    if (!user) return;
    setContactName((prev) => prev || user.name);
    setContactPhone((prev) => prev || (user.phone || '').replace(/\D/g, ''));
  }, [user]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!contactName.trim() || !contactPhone.trim() || !checkInDate) {
      setError(t.fillRequired);
      return;
    }
    if (isDaily) {
      if (!checkOutDate || nights < 1) {
        setError(t.pickCheckout);
        return;
      }
      if (overlapsBooked(checkInDate, checkOutDate)) {
        setError(t.overlapError);
        return;
      }
    }
    setSubmitting(true);
    try {
      const payload = isDaily
        ? { roomId, contactName, contactPhone, checkInDate, checkOutDate, guests, rentalType: 'DAILY' as const }
        : { roomId, contactName, contactPhone, checkInDate, leaseMonths, rentalType: 'MONTHLY' as const };
      const booking = await apiClient.post<Booking>('/bookings', payload);
      router.push(`/bookings/${booking.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : t.error);
      setSubmitting(false);
    }
  }

  if (roomError) {
    return (
      <main className="mx-auto max-w-md p-10 text-center">
        <p className="text-sm text-danger">{t.roomError}</p>
      </main>
    );
  }
  if (!room) return <PageLoader />;

  // API คืน enum เป็นตัวใหญ่ (AIR/FAN) แต่ type ใน shared เป็นตัวเล็ก — เทียบแบบ toUpperCase ตามที่หน้าอื่นทำ
  const roomLabel = room.name || (room.type.toUpperCase() === 'AIR' ? t.roomAir : t.roomFan);
  // มัดจำระดับห้องก่อน ถ้าไม่ได้ตั้ง (0) ตกไปใช้ระดับหอ — ตรงกับที่ backend เก็บ snapshot ตอนจอง
  const roomDeposit = room.deposit ?? 0;
  // รายวันไม่เก็บมัดจำ (ตามนโยบาย) — รายเดือนใช้มัดจำระดับห้อง/หอ
  const deposit = isDaily ? 0 : roomDeposit > 0 ? roomDeposit : room.dorm.deposit ?? 0;
  const pricePerDay = room.pricePerDay ?? 0;
  // ยอดจ่ายรวม: รายเดือน = ค่าเช่า/เดือน × จำนวนเดือน + มัดจำ · รายวัน = ค่าห้อง/คืน × จำนวนคืน
  const rentTotal = room.pricePerMonth * leaseMonths;
  const payTotal = isDaily ? pricePerDay * nights : rentTotal + deposit;
  const cover = room.images?.[0] ?? room.dorm.images?.[0] ?? null;
  const locale = t.dateLocale;

  return (
    <main className="mx-auto max-w-[1120px] px-4 pb-16 pt-7 sm:px-6">
      {/* back + title */}
      <div className="mb-5 flex items-center gap-3">
        <button
          type="button"
          onClick={() => router.back()}
          className="flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-xl border border-card-border bg-white text-ink-body hover:bg-surface-canvas"
          aria-label="back"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path d="M15 6l-6 6 6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <div>
          <h1 className="text-[25px] font-bold tracking-tight text-ink-strong">{t.title}</h1>
          <p className="mt-0.5 text-[13.5px] text-ink-muted">{t.subtitle}</p>
        </div>
      </div>

      <Stepper t={t} current={1} />

      <form onSubmit={handleSubmit} className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[1fr_400px]">
        {/* ---- LEFT: form ---- */}
        <div className="rounded-[20px] border border-card-border bg-white p-7 shadow-card">
          <h2 className="text-[17px] font-bold text-ink-strong">{t.tenantInfo}</h2>

          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-[13px] font-semibold text-ink-body">{t.nameLabel}</label>
              <div className={`${fieldBase} ${contactName ? fieldActive : fieldIdle}`}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="shrink-0">
                  <circle cx="12" cy="8" r="4" stroke={contactName ? '#2F6FE0' : '#9AA0AB'} strokeWidth="1.8" />
                  <path
                    d="M4 21v-1a6 6 0 016-6h4a6 6 0 016 6v1"
                    stroke={contactName ? '#2F6FE0' : '#9AA0AB'}
                    strokeWidth="1.8"
                    strokeLinecap="round"
                  />
                </svg>
                <input
                  type="text"
                  placeholder={t.namePlaceholder}
                  value={contactName}
                  onChange={(e) => setContactName(e.target.value)}
                  className={inputBase}
                  required
                />
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-[13px] font-semibold text-ink-body">{t.phoneLabel}</label>
              <div className={`${fieldBase} ${contactPhone ? fieldActive : fieldIdle}`}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="shrink-0">
                  <path
                    d="M5 4h4l2 5-3 2a12 12 0 005 5l2-3 5 2v4a2 2 0 01-2 2A16 16 0 013 6a2 2 0 012-2z"
                    stroke={contactPhone ? '#2F6FE0' : '#9AA0AB'}
                    strokeWidth="1.8"
                    strokeLinejoin="round"
                  />
                </svg>
                <input
                  type="tel"
                  inputMode="numeric"
                  maxLength={10}
                  placeholder={t.phonePlaceholder}
                  value={contactPhone}
                  onChange={(e) => setContactPhone(e.target.value.replace(/\D/g, ''))}
                  className={`${inputBase} font-sans`}
                  required
                />
              </div>
              <p className="mt-1.5 text-[11.5px] text-ink-faint">{t.phoneHint}</p>
            </div>
          </div>

          {/* ป้ายบอกรูปแบบการเช่าของห้องนี้ (ยึดจากห้อง เลือกเองไม่ได้) */}
          <div className="mt-5">
            <label className="mb-1.5 block text-[13px] font-semibold text-ink-body">{t.rentalMode}</label>
            <span
              className="inline-flex items-center gap-2 rounded-pill px-3.5 py-1.5 text-[13px] font-bold text-white"
              style={{ background: isDaily ? '#12A150' : '#2F6FE0' }}
            >
              {isDaily ? t.daily : t.monthly}
            </span>
          </div>

          {/* รายวัน: ปฏิทินเลือกช่วงวัน — วันที่เต็มถูกปิดไปเลย ไม่ต้องเดา */}
          {isDaily && (
            <div className="mt-5">
              <label className="mb-1.5 block text-[13px] font-semibold text-ink-body">{t.checkInLabel}</label>
              <DailyCalendar
                lang={lang}
                checkIn={checkInDate}
                checkOut={checkOutDate}
                bookedRanges={bookedRanges}
                pricePerDay={room.pricePerDay ?? 0}
                onChange={(nextIn, nextOut) => {
                  setCheckInDate(nextIn);
                  setCheckOutDate(nextOut);
                }}
              />
            </div>
          )}

          {/* รายเดือน: วันเข้าอยู่ — กรอกเอง/เลือกจากปฏิทิน (native date) */}
          {!isDaily && (
            <div className="mt-5">
              <label className="mb-1.5 block text-[13px] font-semibold text-ink-body">{t.checkInLabel}</label>
              <div className={`${fieldBase} ${checkInDate ? fieldActive : fieldIdle}`}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="shrink-0">
                  <rect x="3" y="5" width="18" height="16" rx="2" stroke="#9AA0AB" strokeWidth="1.8" />
                  <path d="M3 10h18M8 3v4M16 3v4" stroke="#9AA0AB" strokeWidth="1.8" strokeLinecap="round" />
                </svg>
                <input
                  type="date"
                  value={checkInDate}
                  min={toISODate(new Date())}
                  onChange={(e) => setCheckInDate(e.target.value)}
                  className={`${inputBase} font-sans`}
                  required
                />
              </div>
            </div>
          )}

          {/* จำนวนผู้เข้าพัก (เฉพาะรายวัน) — เจ้าของหอเอาไปเตรียมห้อง */}
          {isDaily && (
            <div className="mt-5">
              <label className="mb-1.5 block text-[13px] font-semibold text-ink-body">{t.guestsLabel}</label>
              <div className="flex gap-2.5">
                {[1, 2, 3].map((n) => {
                  const active = guests === n;
                  return (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setGuests(n)}
                      className={`flex-1 rounded-xl border-[1.5px] py-2.5 text-sm font-semibold ${
                        active ? 'border-tenant bg-tenant-tint text-tenant' : 'border-card-border bg-white text-ink-body'
                      }`}
                    >
                      {t.guestsUnit(n)}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* ระยะเวลาเช่า (รายเดือน) — รายวันใช้ปฏิทินด้านบนแทน */}
          {!isDaily && (
            <div className="mt-5">
              <label className="mb-1.5 block text-[13px] font-semibold text-ink-body">{t.leaseLabel}</label>
              <div className="flex gap-2.5">
                {[1, 3, 6].map((m) => {
                  const active = leaseMonths === m;
                  return (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setLeaseMonths(m)}
                      className={`relative flex-1 rounded-xl border-[1.5px] py-2.5 text-sm font-semibold ${
                        active ? 'border-tenant bg-tenant-tint text-tenant' : 'border-card-border bg-white text-ink-body'
                      }`}
                    >
                      {/* ป้ายแนะนำบนตัวเลือก 3 เดือน */}
                      {m === 3 && (
                        <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-tenant px-2 py-0.5 text-[10px] font-bold text-white shadow-sm">
                          {t.recommended}
                        </span>
                      )}
                      {t.leaseUnit(m)}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {error && <p className="mt-4 text-sm text-danger">{error}</p>}
        </div>

        {/* ---- RIGHT: summary ---- */}
        <div className="lg:sticky lg:top-6">
          <div className="overflow-hidden rounded-[20px] border border-card-border bg-white shadow-card-hover">
            <div className="flex gap-3.5 p-[18px]">
              {cover ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={cover}
                  alt={room.dorm.name}
                  className="h-[74px] w-[88px] shrink-0 rounded-xl object-cover"
                />
              ) : (
                <div className="h-[74px] w-[88px] shrink-0 rounded-xl bg-gradient-to-br from-[#3E5C8A] to-tenant-dark" />
              )}
              <div className="min-w-0 flex-1">
                <div className="mb-1 flex items-center gap-1.5">
                  {room.dorm.avgRating ? (
                    <>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="#E0902F">
                        <path d="M12 2l2.9 6.2 6.8.7-5.1 4.6 1.5 6.7L12 17.8 5.9 20.2l1.5-6.7L2.3 8.9l6.8-.7L12 2z" />
                      </svg>
                      <span className="font-sans text-[12.5px] font-bold text-ink-strong">
                        {room.dorm.avgRating.toFixed(1)}
                      </span>
                      <span className="font-sans text-[11.5px] text-ink-faint">({room.dorm.reviewCount ?? 0})</span>
                    </>
                  ) : (
                    <span className="text-[11.5px] text-ink-faint">{t.noReview}</span>
                  )}
                </div>
                <div className="truncate text-[15px] font-bold tracking-tight text-ink-strong">{room.dorm.name}</div>
                <div className="mt-0.5 truncate text-xs text-ink-muted">
                  {roomLabel}
                  {room.dorm.address ? ` · ${room.dorm.address}` : ` · ${room.dorm.province}`}
                </div>
              </div>
            </div>

            <div className="px-[18px] pb-[18px]">
              <div className="mb-3.5 h-px bg-hairline" />
              <div className="mb-3 text-sm font-bold text-ink-strong">{t.summaryTitle}</div>

              {isDaily ? (
                <>
                  <div className="mb-2.5 flex items-center justify-between">
                    <span className="text-[13.5px] text-ink-subtitle">{t.perNight}</span>
                    <span className="font-sans text-sm font-semibold tabular-nums text-ink-strong">
                      ฿{pricePerDay.toLocaleString()}
                    </span>
                  </div>
                  <div className="mb-2.5 flex items-center justify-between">
                    <span className="text-[13.5px] text-ink-subtitle">{t.totalNights}</span>
                    <span className="text-sm font-semibold text-ink-strong">{t.nightsUnit(nights)}</span>
                  </div>
                  <div className="mb-2.5 flex items-center justify-between">
                    <span className="text-[13.5px] text-ink-subtitle">{t.bookingFee}</span>
                    <span className="text-sm font-semibold text-success">{t.free}</span>
                  </div>
                </>
              ) : (
                <>
                  <div className="mb-2.5 flex items-start justify-between gap-3">
                    <span className="text-[13.5px] text-ink-subtitle">
                      {t.rentMonths(leaseMonths)}
                      <span className="block text-[11px] text-ink-faint">
                        ฿{room.pricePerMonth.toLocaleString()}/{lang === 'th' ? 'เดือน' : 'mo'} × {leaseMonths}
                      </span>
                    </span>
                    <span className="font-sans text-sm font-semibold tabular-nums text-ink-strong">
                      ฿{rentTotal.toLocaleString()}
                    </span>
                  </div>

                  {deposit > 0 && (
                    <div className="mb-2.5 flex items-start justify-between gap-3">
                      <span className="text-[13.5px] text-ink-subtitle">
                        {t.deposit}
                        <span className="block text-[11px] text-ink-faint">{t.depositNote}</span>
                      </span>
                      <span className="font-sans text-sm font-semibold tabular-nums text-ink-strong">
                        ฿{deposit.toLocaleString()}
                      </span>
                    </div>
                  )}

                  <div className="mb-2.5 flex items-center justify-between">
                    <span className="text-[13.5px] text-ink-subtitle">{t.bookingFee}</span>
                    <span className="text-sm font-semibold text-success">{t.free}</span>
                  </div>

                  <div className="mb-2.5 flex items-center justify-between">
                    <span className="text-[13.5px] text-ink-subtitle">{t.leaseLabel}</span>
                    <span className="text-sm font-semibold text-ink-strong">{t.leaseUnit(leaseMonths)}</span>
                  </div>
                </>
              )}

              <div className="my-3.5 h-px bg-hairline" />

              <div className="flex items-baseline justify-between">
                <span className="text-[15px] font-bold text-ink-strong">{t.payNow}</span>
                <span className="font-sans text-2xl font-bold tabular-nums text-tenant">
                  ฿{payTotal.toLocaleString()}
                </span>
              </div>
              <p className="mt-1 text-right text-[11.5px] text-ink-faint">{t.payNowNote}</p>

              <button
                type="submit"
                disabled={submitting}
                className="mt-4 flex h-[52px] w-full items-center justify-center gap-2.5 rounded-[13px] bg-gradient-to-br from-tenant to-[#5B9DFF] text-base font-bold text-white shadow-btn-tenant hover:brightness-105 disabled:opacity-60"
              >
                {!submitting && (
                  <svg width="19" height="19" viewBox="0 0 24 24" fill="none">
                    <path d="M4 12l16-8-6 16-3-6-7-2z" stroke="#fff" strokeWidth="1.8" strokeLinejoin="round" />
                  </svg>
                )}
                {submitting ? t.submitting : t.submit}
              </button>
              <p className="mt-2 text-center text-[11.5px] text-ink-faint">{t.ctaHint}</p>
            </div>
          </div>

          {/* reassurance */}
          <div className="mt-3.5 rounded-card-lg border border-card-border bg-white px-[18px] py-4">
            {t.reassure.map((text, i) => (
              <div key={text} className={`flex items-center gap-3 ${i < t.reassure.length - 1 ? 'mb-3' : ''}`}>
                <span
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-[9px] ${
                    ['bg-tenant-tint', 'bg-warning-tint', 'bg-success-tint'][i]
                  }`}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <path
                      d={
                        [
                          'M9 11l3 3 8-8M20 12v6a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h9',
                          'M4 12l16-8-6 16-3-6-7-2z',
                          'M8 3h8l4 4v14H4V3h4zM9 12h6M9 16h6',
                        ][i]
                      }
                      stroke={['#2F6FE0', '#C77C1E', '#12A150'][i]}
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </span>
                <span className="text-[12.5px] leading-snug text-ink-subtitle">{text}</span>
              </div>
            ))}
          </div>

          <div className="mt-3.5 flex items-center justify-center gap-2 text-xs text-ink-faint">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <rect x="4" y="10" width="16" height="10" rx="2" stroke="#9AA0AB" strokeWidth="1.7" />
              <path d="M8 10V7a4 4 0 018 0v3" stroke="#9AA0AB" strokeWidth="1.7" />
            </svg>
            {t.secure}
          </div>
        </div>
      </form>
    </main>
  );
}

export default function NewBookingPage() {
  return (
    <Suspense fallback={<PageLoader />}>
      <NewBookingForm />
    </Suspense>
  );
}
