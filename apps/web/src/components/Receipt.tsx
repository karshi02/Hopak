'use client';

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
    <div className="flex flex-1 items-baseline gap-2 text-[12.5px] text-[#3A4150]">
      <span className="whitespace-nowrap text-[#5B616C]">{label}</span>
      <span className="min-h-[17px] flex-1 border-b border-dotted border-[#9AA6BC] px-1 pb-0.5 font-semibold text-[#14213D]">
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
  const router = useRouter();
  const room = booking.room;
  const dorm = room?.dorm;
  const code = booking.checkInToken;
  const isTenantCopy = !!code;

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
      `}</style>

      {/* toolbar (ไม่พิมพ์) */}
      <div className="rcpt-chrome sticky top-0 z-10 flex items-center gap-3 border-b border-card-border bg-white px-4 py-3 shadow-sm">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1.5 rounded-lg border border-card-border px-3.5 py-2 text-sm font-semibold text-ink-body hover:bg-surface-canvas"
        >
          ← กลับ
        </button>
        <div className="text-sm font-semibold text-ink-strong">
          {isTenantCopy ? 'ใบเสร็จ/ใบจอง (ฉบับผู้เช่า)' : 'ใบจอง (ฉบับเจ้าของหอ)'}
        </div>
        <button
          onClick={() => window.print()}
          className="ml-auto flex items-center gap-2 rounded-lg bg-tenant px-4 py-2 text-sm font-bold text-white hover:bg-tenant-dark"
        >
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none">
            <path d="M6 9V3h12v6M6 18H4v-6h16v6h-2M8 14h8v7H8z" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          พิมพ์ / บันทึก PDF
        </button>
      </div>

      <div className="rcpt-scroll flex justify-center px-4 py-7">
        <div className="rcpt-sheet flex w-full max-w-[794px] flex-col bg-white p-[46px_48px_40px] text-[13px] text-[#14213D] shadow-[0_12px_40px_rgba(16,24,40,.16)]">
          {/* HEADER */}
          <div className="flex items-center gap-[18px] pb-4">
            <div className="flex h-[70px] w-[70px] shrink-0 items-center justify-center rounded-[16px] bg-[linear-gradient(135deg,#2F6FE0,#1F3A6E)] shadow-[0_8px_18px_rgba(31,58,110,.35)]">
              <span className="font-sans text-[44px] font-extrabold leading-none text-white">H</span>
            </div>
            <div className="flex-1">
              <div className="text-[24px] font-bold tracking-tight text-[#14213D]">ใบจองห้องพัก</div>
              <div className="text-[11px] font-bold tracking-[2px] text-[#8A909F]">DORMITORY BOOKING FORM</div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="font-sans text-[26px] font-extrabold leading-none text-[#1F3A6E]">HOPRAK</span>
                <span className="font-sans text-[20px] font-extrabold leading-none text-[#E8862B]">.COM</span>
              </div>
              <div className="mt-0.5 text-[12px] font-semibold text-[#E8862B]">สะดวก รวดเร็ว จริงใจ</div>
            </div>
            <div className="self-start">
              <div className="inline-flex items-center gap-1.5 rounded-[10px] border border-[#BEE7D2] bg-[#E7F7EF] px-4 py-2">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                  <path d="M5 12l5 5L20 6" stroke="#12704A" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <span className="text-[10.5px] font-bold tracking-[.5px] text-[#12704A]">ชำระเงินแล้ว · PAID</span>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between border-y-2 border-[#1F3A6E] px-0.5 py-2 text-[13.5px] font-bold">
            <span>No. {booking.id.slice(0, 8).toUpperCase()}</span>
            <span>วันที่ : {fmtDate(booking.createdAt) || fmtDate(new Date().toISOString())}</span>
          </div>

          {/* ผู้จอง */}
          <div className="mt-4">
            <SecBar>ข้อมูลผู้จอง (Tenant Information)</SecBar>
            <div className="mt-2.5 flex gap-6">
              <Field label="ชื่อ-นามสกุล :" value={booking.contactName} />
              <Field label="เบอร์โทร :" value={booking.contactPhone} />
            </div>
            <div className="mt-2.5 flex gap-6">
              <Field label="บัตร ปชช. :" />
              <Field label="อีเมล :" />
            </div>
            <div className="mt-2.5 flex gap-6">
              <Field label="ที่อยู่ :" />
            </div>
            <div className="mt-2.5 flex gap-6">
              <Field label="ผู้ติดต่อฉุกเฉิน :" />
              <Field label="เบอร์โทร :" />
            </div>
          </div>

          {/* ห้องพัก */}
          <div className="mt-4">
            <SecBar>ข้อมูลห้องพัก (Room Details)</SecBar>
            <div className="mt-2.5 flex gap-6">
              <Field label="อาคาร / หอพัก :" value={dorm?.name} />
              <Field label="หมายเลขห้อง :" value={room?.name ?? undefined} />
            </div>
            <div className="mt-2.5 flex gap-6">
              <Field label="ประเภทห้อง :" value={room ? ROOM_TYPE[room.type] ?? room.type : undefined} />
              <Field label="ค่าเช่า/เดือน :" value={booking.roomPrice ? `฿${booking.roomPrice.toLocaleString()}` : undefined} />
            </div>
            <div className="mt-2.5 flex gap-6">
              <Field label="ระยะเวลาเช่า :" value={booking.leaseMonths ? `${booking.leaseMonths} เดือน` : undefined} />
              <Field label="ที่จอดรถ :" />
            </div>
          </div>

          {/* ชำระเงิน */}
          <div className="mt-4">
            <SecBar>การชำระเงิน (Payment)</SecBar>
            <div className="mt-2.5 flex gap-6">
              <Field label="เงินมัดจำ :" value={booking.deposit ? `฿${booking.deposit.toLocaleString()}` : undefined} />
              <Field label="วิธีชำระเงิน :" value="โอนผ่าน Hoprak (พร้อมสลิป)" />
            </div>
            <div className="mt-2.5 flex gap-6">
              <Field label="กำหนดวันเข้าพัก :" value={fmtDate(booking.checkInDate)} />
              <Field label="ค่าเช่าเดือนแรก :" value={booking.roomPrice ? `฿${booking.roomPrice.toLocaleString()}` : undefined} />
            </div>
            <div className="mt-3 flex items-center justify-between rounded-[9px] border border-[#D5E0F2] bg-[#F3F6FC] px-4 py-2.5">
              <span className="text-[14px] font-bold text-[#1F3A6E]">ยอดชำระทั้งหมด (ค่าห้อง + มัดจำ)</span>
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
                <div className="mt-1 font-mono text-[26px] font-extrabold tracking-[5px] text-[#14213D]">{code}</div>
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
          <div className="mt-auto flex gap-[60px] pt-8">
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
