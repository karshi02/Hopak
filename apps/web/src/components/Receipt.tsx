'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Booking, Dorm, Room } from '@hopak/shared';

type BookingFull = Booking & { room?: Room & { dorm?: Dorm } };

const ROOM_TYPE: Record<string, string> = { AIR: 'ห้องแอร์ (Air)', FAN: 'ห้องพัดลม (Fan)' };

function fmtDate(d?: string | null) {
  if (!d) return '';
  try {
    return new Date(d).toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' });
  } catch {
    return '';
  }
}

function Field({ label, value }: { label: string; value?: string }) {
  return (
    <div className="rcpt-field flex min-w-0 flex-1 items-baseline gap-2 text-[12px] text-[#3A4150] sm:text-[12.5px]">
      <span className="whitespace-nowrap text-[#5B616C]">{label}</span>
      <span className="min-h-[17px] min-w-0 flex-1 truncate border-b border-dotted border-[#9AA6BC] px-1 pb-0.5 font-semibold text-[#14213D]">
        {value ?? ' '}
      </span>
    </div>
  );
}

function SecBar({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-[5px] bg-[#1F3A6E] px-3.5 py-1.5 text-[13px] font-bold tracking-[.2px] text-white">
      {children}
    </div>
  );
}

// ใบจอง/ใบเสร็จ A4 พิมพ์ได้ — โชว์ "รหัสยืนยันการเข้าพัก" เฉพาะฉบับผู้เช่า (booking.checkInToken มีค่า)
// ฉบับเจ้าของหอ API strip token ออก → ไม่มีส่วนรหัส (ผู้เช่าเอาฉบับตัวเองมายื่นให้กรอกยืนยัน)
export function Receipt({ booking }: { booking: BookingFull }) {
  const sheetRef = useRef<HTMLDivElement>(null);
  const [saving, setSaving] = useState<'png' | 'pdf' | null>(null);

  /**
   * เรนเดอร์ใบจองเป็น canvas ใช้ร่วมกันทั้งดาวน์โหลดรูปและ PDF
   * ระหว่างแคปเจอร์จะสวมคลาส rcpt-export เพื่อบังคับเลย์เอาต์กระดาษ A4 (กว้าง 794px)
   * ไม่งั้นบนมือถือจะได้ไฟล์หน้าตาแบบจอแคบ — ตัวใหญ่ ฟิลด์เรียงลง ยาวหลายหน้า
   */
  async function renderCanvas() {
    const { default: html2canvas } = await import('html2canvas');
    const el = sheetRef.current!;
    el.classList.add('rcpt-export');
    try {
      return await html2canvas(el, {
        backgroundColor: '#ffffff',
        scale: 2, // คมพอสำหรับพิมพ์จริง
        useCORS: true,
        windowWidth: 1280, // ให้ media query ในสำเนาถูกประเมินเป็นจอใหญ่
        width: 794,
      });
    } finally {
      el.classList.remove('rcpt-export');
    }
  }

  const fileBase = `ใบจอง-${booking.id.slice(0, 8).toUpperCase()}`;

  /**
   * ดาวน์โหลดใบจองเป็นรูป PNG — บนมือถือ window.print() ใช้ไม่ได้ทุกเบราว์เซอร์
   * (iOS Safari ไม่มี "Save as PDF" ตรงๆ) เลยเรนเดอร์ใบจองเป็นรูปแล้วบันทึกลงเครื่องแทน
   * โหลด html2canvas แบบ dynamic เพื่อไม่ถ่วง bundle หน้าอื่น
   */
  async function downloadImage() {
    if (!sheetRef.current) return;
    setSaving('png');
    try {
      const canvas = await renderCanvas();
      const a = document.createElement('a');
      a.href = canvas.toDataURL('image/png');
      a.download = `${fileBase}.png`;
      a.click();
    } catch {
      // เรนเดอร์รูปไม่ได้ (เบราว์เซอร์เก่า) → ถอยไปใช้หน้าต่างพิมพ์ของระบบ
      window.print();
    } finally {
      setSaving(null);
    }
  }

  /**
   * ดาวน์โหลดเป็นไฟล์ PDF ขนาด A4 — วางรูปใบจองให้พอดีความกว้างหน้ากระดาษ
   * ถ้าใบจองยาวเกิน 1 หน้า จะตัดขึ้นหน้าใหม่ให้อัตโนมัติ
   */
  async function downloadPdf() {
    if (!sheetRef.current) return;
    setSaving('pdf');
    try {
      const [{ jsPDF }, canvas] = await Promise.all([import('jspdf'), renderCanvas()]);
      const pdf = new jsPDF({ unit: 'mm', format: 'a4' });
      const pageW = pdf.internal.pageSize.getWidth();
      const pageH = pdf.internal.pageSize.getHeight();
      const img = canvas.toDataURL('image/png');
      const fullH = (canvas.height * pageW) / canvas.width;

      // ยาวเกินหน้าเดียวไม่มาก (<= 12%) ให้ย่อลงพอดี 1 หน้า อ่านง่ายกว่าโดนตัดครึ่ง
      if (fullH <= pageH * 1.12) {
        const scale = Math.min(1, pageH / fullH);
        const w = pageW * scale;
        const h = fullH * scale;
        pdf.addImage(img, 'PNG', (pageW - w) / 2, 0, w, h);
      } else {
        let rest = fullH;
        let offset = 0;
        pdf.addImage(img, 'PNG', 0, 0, pageW, fullH);
        rest -= pageH;
        while (rest > 0) {
          offset -= pageH;
          pdf.addPage();
          pdf.addImage(img, 'PNG', 0, offset, pageW, fullH);
          rest -= pageH;
        }
      }
      pdf.save(`${fileBase}.pdf`);
    } catch {
      window.print();
    } finally {
      setSaving(null);
    }
  }

  const router = useRouter();
  const room = booking.room;
  const dorm = room?.dorm;
  const code = booking.checkInToken;
  const isTenantCopy = !!code;
  const isDaily = booking.rentalType === 'DAILY';
  const nights = booking.nights ?? 0;
  // roomPrice รายวัน = ราคา/คืน × จำนวนคืน (snapshot) — ถอดกลับเป็นราคา/คืนเพื่อแสดง
  const perNight = isDaily && nights > 0 ? Math.round(booking.roomPrice / nights) : booking.roomPrice;

  return (
    <div className="fixed inset-0 z-[100] overflow-auto bg-[#E9ECF3]">
      <style>{`
        /* บังคับพิมพ์สีพื้นหลัง (logo gradient, แถบสีน้ำเงิน, badge, กล่องยอดรวม) ไม่ให้จางตอนพิมพ์ */
        .rcpt-sheet, .rcpt-sheet * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
        @media print {
          @page { size: A4; margin: 0; }
          body { background:#fff; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .rcpt-chrome { display:none !important; }
          .rcpt-scroll { position:static !important; overflow:visible !important; background:#fff !important; padding:0 !important; }
          .rcpt-sheet { box-shadow:none !important; width:100% !important; min-height:100vh !important; margin:0 !important; padding:14mm 15mm !important; }
        }

        /* โหมดส่งออกไฟล์ (PDF/รูป) — ล็อกเป็นหน้ากระดาษ A4 ไม่ว่าจะเปิดจากจอไหน */
        .rcpt-export {
          width: 794px !important;
          max-width: 794px !important;
          padding: 40px 44px 34px !important;
          font-size: 13px !important;
          box-shadow: none !important;
        }
        /* แถวฟิลด์คู่กลับเป็น 2 คอลัมน์เหมือนกระดาษจริง */
        .rcpt-export .rcpt-row { flex-direction: row !important; gap: 24px !important; }
        .rcpt-export .rcpt-field { font-size: 12.5px !important; }
        /* หัวใบจอง: โลโก้/ตัวอักษรกลับเป็นขนาดเต็ม และป้าย PAID กลับไปมุมขวา */
        .rcpt-export .rcpt-head { flex-wrap: nowrap !important; gap: 18px !important; padding-bottom: 16px !important; }
        /* html2canvas วางตัวอักษรใน flex+leading-none เพี้ยน — บังคับเป็นบล็อกจัดกลางด้วย line-height ตรงๆ */
        .rcpt-export .rcpt-logo { width: 70px !important; height: 70px !important; border-radius: 16px !important; display: block !important; }
        .rcpt-export .rcpt-logo { display: flex !important; align-items: center !important; justify-content: center !important; }
        .rcpt-export .rcpt-title { font-size: 24px !important; }
        .rcpt-export .rcpt-sub { font-size: 11px !important; letter-spacing: 2px !important; }
        .rcpt-export .rcpt-brand { font-size: 26px !important; }
        .rcpt-export .rcpt-brand-dot { font-size: 20px !important; }
        .rcpt-export .rcpt-slogan { font-size: 12px !important; }
        /* ป้าย PAID: inline-flex + gap ทำให้ html2canvas ไม่วาดลูกใน — บังคับเป็น flex ปกติ */
        .rcpt-export .rcpt-paid { width: auto !important; align-self: flex-start !important; }
        .rcpt-export .rcpt-paid > div { display: flex !important; align-items: center !important; }
        .rcpt-export .rcpt-paid span { line-height: 1.4 !important; }
        .rcpt-export .rcpt-nobar { font-size: 13.5px !important; }
        .rcpt-export .rcpt-code { font-size: 26px !important; letter-spacing: 5px !important; }
        .rcpt-export .rcpt-signs { flex-direction: row !important; gap: 60px !important; padding-top: 32px !important; }
      `}</style>

      {/* toolbar (ไม่พิมพ์) */}
      <div className="rcpt-chrome sticky top-0 z-10 flex items-center gap-2 border-b border-card-border bg-white px-3 py-2.5 shadow-sm sm:gap-3 sm:px-4 sm:py-3">
        <button
          onClick={() => router.back()}
          aria-label="กลับ"
          className="flex shrink-0 items-center gap-1.5 rounded-lg border border-card-border px-2.5 py-2 text-sm font-semibold text-ink-body hover:bg-surface-canvas sm:px-3.5"
        >
          ←<span className="hidden sm:inline"> กลับ</span>
        </button>
        <div className="min-w-0 flex-1 truncate text-[13px] font-semibold text-ink-strong sm:text-sm">
          {isTenantCopy ? 'ใบเสร็จ/ใบจอง (ฉบับผู้เช่า)' : 'ใบจอง (ฉบับเจ้าของหอ)'}
        </div>
        {/* ดาวน์โหลด PDF — ใช้ได้ทุกเครื่องรวมมือถือ ไม่ต้องพึ่งหน้าต่างพิมพ์ของระบบ */}
        <button
          onClick={downloadPdf}
          disabled={saving !== null}
          aria-label="ดาวน์โหลด PDF"
          className="flex shrink-0 items-center gap-1.5 rounded-lg bg-tenant px-3 py-2 text-[13px] font-bold text-white hover:bg-tenant-dark disabled:opacity-60 sm:gap-2 sm:px-4 sm:text-sm"
        >
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none">
            <path
              d="M12 4v11M7.5 11.5L12 16l4.5-4.5M5 19h14"
              stroke="#fff"
              strokeWidth="1.9"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          {saving === 'pdf' ? '...' : 'PDF'}
        </button>

        {/* ดาวน์โหลดเป็นรูป — บันทึกลงคลังภาพมือถือได้เลย ส่งต่อในแชทง่าย */}
        <button
          onClick={downloadImage}
          disabled={saving !== null}
          aria-label="ดาวน์โหลดรูปภาพ"
          className="flex shrink-0 items-center gap-1.5 rounded-lg border border-card-border px-3 py-2 text-[13px] font-bold text-ink-body hover:bg-surface-canvas disabled:opacity-60 sm:gap-2 sm:px-4 sm:text-sm"
        >
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none">
            <rect x="3" y="4" width="18" height="16" rx="2.5" stroke="currentColor" strokeWidth="1.8" />
            <circle cx="9" cy="10" r="1.8" stroke="currentColor" strokeWidth="1.8" />
            <path d="M4 17l5-4 4 3 3-2 4 3" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
          </svg>
          {saving === 'png' ? '...' : 'รูป'}
        </button>

        {/* พิมพ์ — จอใหญ่เท่านั้น */}
        <button
          onClick={() => window.print()}
          aria-label="พิมพ์"
          className="hidden shrink-0 items-center gap-2 rounded-lg border border-card-border px-3 py-2 text-sm font-bold text-ink-body hover:bg-surface-canvas lg:flex"
        >
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none">
            <path
              d="M6 9V3h12v6M6 18H4v-6h16v6h-2M8 14h8v7H8z"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          พิมพ์
        </button>
      </div>

      <div className="rcpt-scroll flex justify-center px-2.5 py-4 sm:px-4 sm:py-7">
        <div
          ref={sheetRef}
          className="rcpt-sheet flex w-full max-w-[794px] flex-col bg-white p-[20px_18px_24px] text-[12.5px] text-[#14213D] shadow-[0_12px_40px_rgba(16,24,40,.16)] sm:p-[46px_48px_40px] sm:text-[13px]">
          {/* HEADER */}
          <div className="rcpt-head flex flex-wrap items-center gap-3 pb-3 sm:gap-[18px] sm:pb-4">
            <div className="rcpt-logo flex h-[50px] w-[50px] shrink-0 items-center justify-center rounded-[13px] bg-[linear-gradient(135deg,#2F6FE0,#1F3A6E)] shadow-[0_8px_18px_rgba(31,58,110,.35)] sm:h-[70px] sm:w-[70px] sm:rounded-[16px]">
              {/* วาดตัว H เป็น SVG ไม่ใช่ตัวอักษร — html2canvas วัด baseline ของฟอนต์เพี้ยน ทำให้ตัว H เบี้ยวในไฟล์ที่โหลด */}
              <svg viewBox="0 0 32 32" className="h-[58%] w-[58%]" fill="#fff" aria-hidden>
                <rect x="6" y="3" width="6.4" height="26" rx="1.6" />
                <rect x="19.6" y="3" width="6.4" height="26" rx="1.6" />
                <rect x="6" y="12.8" width="20" height="6.4" rx="1.6" />
              </svg>
            </div>
            <div className="min-w-0 flex-1">
              <div className="rcpt-title text-[18px] font-bold tracking-tight text-[#14213D] sm:text-[24px]">ใบจองห้องพัก</div>
              <div className="rcpt-sub text-[9.5px] font-bold tracking-[1.5px] text-[#8A909F] sm:text-[11px] sm:tracking-[2px]">
                DORMITORY BOOKING FORM
              </div>
              <div className="mt-1.5 flex items-baseline gap-1.5 sm:mt-2 sm:gap-2">
                <span className="rcpt-brand font-sans text-[19px] font-extrabold leading-none text-[#1F3A6E] sm:text-[26px]">HOPRAK</span>
                <span className="rcpt-brand-dot font-sans text-[15px] font-extrabold leading-none text-[#E8862B] sm:text-[20px]">.COM</span>
              </div>
              <div className="rcpt-slogan mt-0.5 text-[11px] font-semibold text-[#E8862B] sm:text-[12px]">สะดวก รวดเร็ว จริงใจ</div>
            </div>
            {/* ป้าย PAID — มือถือเต็มแถวใต้หัว (เดิมล้นขอบขวา) */}
            <div className="rcpt-paid w-full sm:w-auto sm:self-start">
              <div className="inline-flex items-center gap-1.5 rounded-[10px] border border-[#BEE7D2] bg-[#E7F7EF] px-3 py-1.5 sm:px-4 sm:py-2">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                  <path d="M5 12l5 5L20 6" stroke="#12704A" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <span className="whitespace-nowrap text-[10.5px] font-bold tracking-[.5px] text-[#12704A]">
                  ชำระเงินแล้ว · PAID
                </span>
              </div>
            </div>
          </div>

          <div className="rcpt-nobar flex flex-wrap items-center justify-between gap-x-3 gap-y-1 border-y-2 border-[#1F3A6E] px-0.5 py-2 text-[12px] font-bold sm:text-[13.5px]">
            <span>No. {booking.id.slice(0, 8).toUpperCase()}</span>
            <span>วันที่ : {fmtDate(booking.createdAt) || fmtDate(new Date().toISOString())}</span>
          </div>

          {/* ผู้จอง */}
          <div className="mt-4">
            <SecBar>ข้อมูลผู้จอง (Tenant Information)</SecBar>
            <div className="rcpt-row mt-2.5 flex flex-col gap-2.5 sm:flex-row sm:gap-6">
              <Field label="ชื่อ-นามสกุล :" value={booking.contactName} />
              <Field label="เบอร์โทร :" value={booking.contactPhone} />
            </div>
            <div className="rcpt-row mt-2.5 flex flex-col gap-2.5 sm:flex-row sm:gap-6">
              <Field label="บัตร ปชช. :" />
              <Field label="อีเมล :" />
            </div>
            <div className="rcpt-row mt-2.5 flex flex-col gap-2.5 sm:flex-row sm:gap-6">
              <Field label="ที่อยู่ :" />
            </div>
            <div className="rcpt-row mt-2.5 flex flex-col gap-2.5 sm:flex-row sm:gap-6">
              <Field label="ผู้ติดต่อฉุกเฉิน :" />
              <Field label="เบอร์โทร :" />
            </div>
          </div>

          {/* ห้องพัก */}
          <div className="mt-4">
            <SecBar>ข้อมูลห้องพัก (Room Details)</SecBar>
            <div className="rcpt-row mt-2.5 flex flex-col gap-2.5 sm:flex-row sm:gap-6">
              <Field label="อาคาร / หอพัก :" value={dorm?.name} />
              <Field label="หมายเลขห้อง :" value={room?.name ?? undefined} />
            </div>
            <div className="rcpt-row mt-2.5 flex flex-col gap-2.5 sm:flex-row sm:gap-6">
              <Field label="ประเภทห้อง :" value={room ? ROOM_TYPE[room.type] ?? room.type : undefined} />
              <Field
                label={isDaily ? 'ค่าห้อง/คืน :' : 'ค่าเช่า/เดือน :'}
                value={perNight ? `฿${perNight.toLocaleString()}` : undefined}
              />
            </div>
            <div className="rcpt-row mt-2.5 flex flex-col gap-2.5 sm:flex-row sm:gap-6">
              <Field
                label={isDaily ? 'จำนวนคืน :' : 'ระยะเวลาเช่า :'}
                value={isDaily ? (nights ? `${nights} คืน` : undefined) : booking.leaseMonths ? `${booking.leaseMonths} เดือน` : undefined}
              />
              <Field label="ที่จอดรถ :" />
            </div>
          </div>

          {/* ชำระเงิน */}
          <div className="mt-4">
            <SecBar>การชำระเงิน (Payment)</SecBar>
            <div className="rcpt-row mt-2.5 flex flex-col gap-2.5 sm:flex-row sm:gap-6">
              <Field label="เงินมัดจำ :" value={booking.deposit ? `฿${booking.deposit.toLocaleString()}` : undefined} />
              <Field label="วิธีชำระเงิน :" value="โอนผ่าน Hoprak (พร้อมสลิป)" />
            </div>
            <div className="rcpt-row mt-2.5 flex flex-col gap-2.5 sm:flex-row sm:gap-6">
              <Field label="กำหนดวันเข้าพัก :" value={fmtDate(booking.checkInDate)} />
              {isDaily ? (
                <Field label="วันคืนห้อง :" value={fmtDate(booking.checkOutDate)} />
              ) : (
                <Field label="ค่าเช่าเดือนแรก :" value={booking.roomPrice ? `฿${booking.roomPrice.toLocaleString()}` : undefined} />
              )}
            </div>
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-[9px] border border-[#D5E0F2] bg-[#F3F6FC] px-3 py-2.5 sm:px-4">
              <span className="text-[13px] font-bold text-[#1F3A6E] sm:text-[14px]">
                {isDaily ? 'ยอดชำระทั้งหมด (ค่าห้องรายวัน)' : 'ยอดชำระทั้งหมด (ค่าห้อง + มัดจำ)'}
              </span>
              <span className="font-sans text-[22px] font-extrabold text-[#12A150]">฿{booking.amount.toLocaleString()}</span>
            </div>
          </div>

          {/* รหัสยืนยัน — เฉพาะฉบับผู้เช่า */}
          {isTenantCopy && (
            <div className="mt-4 flex items-center gap-4 rounded-[12px] border-[1.5px] border-dashed border-[#E8862B] bg-[#FFF7EE] px-[18px] py-3.5">
              <div className="flex-1">
                <div className="text-[12px] font-bold tracking-[.3px] text-[#B5661A]">
                  รหัสยืนยันการเข้าพัก · แสดงให้เจ้าของหอกรอกในระบบ
                </div>
                <div className="rcpt-code mt-1 break-all font-mono text-[20px] font-extrabold tracking-[3px] text-[#14213D] sm:text-[26px] sm:tracking-[5px]">
                  {code}
                </div>
                <div className="mt-0.5 text-[10.5px] text-[#9A7B4E]">
                  รหัสใช้ได้ครั้งเดียว
                  {booking.checkInTokenExpiresAt ? ` · หมดอายุ ${fmtDate(booking.checkInTokenExpiresAt)}` : ''}
                </div>
              </div>
            </div>
          )}

          {/* เงื่อนไข */}
          <div className="mt-4">
            <SecBar>เงื่อนไขและข้อตกลง (Terms &amp; Conditions)</SecBar>
            <div className="mt-1.5 pl-0.5 text-[11px] leading-[1.85] text-[#3A4150]">
              1. กรณีเข้าพักตามกำหนด เงินมัดจำการจองจะถูกเปลี่ยนเป็นเงินประกันความเสียหาย หรือหักรวมกับค่าใช้จ่ายในวันทำสัญญาเช่า<br />
              2. กรณียกเลิกการจอง / ไม่เข้าพักตามกำหนด หอพักขอสงวนสิทธิ์ริบเงินมัดจำทั้งหมด และปล่อยห้องให้ผู้อื่นทันที<br />
              3. การย้ายเข้าต้องชำระเงินประกันและค่าเช่าล่วงหน้าให้ครบถ้วนก่อนเข้าพัก<br />
              4. ผู้เช่าต้องแสดงรหัสยืนยันการเข้าพักให้เจ้าของหอกรอกในระบบภายในวันเข้าพัก
            </div>
          </div>

          {/* ลายเซ็น */}
          <div className="rcpt-signs mt-auto flex flex-col gap-7 pt-6 sm:flex-row sm:gap-[60px] sm:pt-8">
            <div className="flex-1 text-center">
              <div className="border-t border-dotted border-[#9AA6BC] pt-2 text-[12px] text-[#3A4150]">ลงชื่อ ผู้จอง (Tenant)</div>
            </div>
            <div className="flex-1 text-center">
              <div className="border-t border-dotted border-[#9AA6BC] pt-2 text-[12px] text-[#3A4150]">
                ลงชื่อ ผู้รับจอง / เจ้าของหอ (Dormitory Staff)
              </div>
            </div>
          </div>
          <div className="mt-4 text-center text-[10px] text-[#9AA0AB]">
            เอกสารนี้ออกโดยระบบ HOPRAK.COM · เก็บไว้เป็นหลักฐานการจองและการชำระเงิน
          </div>
        </div>
      </div>
    </div>
  );
}
