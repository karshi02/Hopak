'use client';

import { useState } from 'react';
import Link from 'next/link';
import { COMMISSION_RATE } from '@hopak/shared';

/**
 * หน้า "เรียนรู้เพิ่มเติม" สำหรับเจ้าของหอ — หน้าขายของ ไม่ต้องล็อกอิน
 * ปุ่ม CTA ทุกตัวพาไปหน้าสมัครเปิดหอพักจริง (/partner-register)
 *
 * ตัวเลขค่าคอมดึงจาก COMMISSION_RATE ตัวเดียวกับที่ระบบใช้คิดเงินจริง
 * ไม่ฮาร์ดโค้ด 20% ไว้ในข้อความ — วันไหนเปลี่ยนเรตแล้วลืมแก้หน้านี้ = โฆษณาผิดจากของจริง
 */

const COMMISSION_PCT = Math.round(COMMISSION_RATE * 100);

const HERO_STATS = [
  { value: '2,400+', label: 'นักศึกษาที่ค้นหาต่อเดือน' },
  { value: '฿0', label: 'ค่าลงประกาศ' },
  { value: '< 1 วัน', label: 'เริ่มรับจองได้' },
];

const STEPS = [
  {
    n: '1',
    title: 'ลงข้อมูลหอพัก',
    desc: 'กรอกรายละเอียดห้อง ราคา ค่าน้ำค่าไฟ และอัปโหลดรูป ใช้เวลาไม่กี่นาที',
    bg: '#EAF1FF',
    color: '#2F6FE0',
    d: 'M3 21h18M5 21V7l7-4 7 4v14M9 21v-6h6v6',
  },
  {
    n: '2',
    title: 'รับการจองออนไลน์',
    desc: 'นักศึกษาค้นหาและจองห้องได้ทันที คุณยืนยันการจองผ่านแอปได้เลย',
    bg: '#E7F7EF',
    color: '#178F5A',
    d: 'M8 2v3M16 2v3M4 8h16M5 5h14v15H5z',
  },
  {
    n: '3',
    title: 'รับเงินปลอดภัย',
    desc: `เงินโอนเข้าบัญชีหลังหักค่าบริการ ${COMMISSION_PCT}% พร้อมสรุปยอดชัดเจน`,
    bg: '#F3ECFF',
    color: '#7C4DE0',
    d: 'M12 3v18M8 7h5a3 3 0 010 6H9a3 3 0 000 6h6',
  },
];

const FEATURES = [
  { title: 'จัดการห้องง่าย', desc: 'อัปเดตห้องว่าง ราคา และสถานะได้ตลอดเวลา', bg: '#EAF1FF', color: '#2F6FE0', d: 'M4 6h16M4 12h16M4 18h10' },
  { title: 'แจ้งเตือนทันที', desc: 'มีคนจองหรือชำระเงิน ระบบเด้งแจ้งให้รู้ทันที', bg: '#E7F7EF', color: '#178F5A', d: 'M18 8a6 6 0 10-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 01-3.4 0' },
  {
    title: 'รีวิวสร้างความเชื่อมั่น',
    desc: 'สะสมรีวิวจริงจากผู้เช่า ดึงดูดคนจองมากขึ้น',
    bg: '#FFF3E0',
    color: '#E0902F',
    d: 'M12 3l2.9 6.2 6.8.7-5.1 4.6 1.5 6.7L12 17.8 5.9 20.2l1.5-6.7L2.3 9.9l6.8-.7L12 3z',
  },
  { title: 'สรุปรายได้', desc: 'ดูยอดจอง ยอดโอน และสถิติหอพักแบบเรียลไทม์', bg: '#F3ECFF', color: '#7C4DE0', d: 'M4 20V10M10 20V4M16 20v-7M22 20H2' },
];

const FAQS = [
  {
    q: 'ลงประกาศมีค่าใช้จ่ายไหม?',
    a: `ลงประกาศฟรีทั้งหมด Hoprak หักค่าบริการ ${COMMISSION_PCT}% เฉพาะเมื่อมีการจองสำเร็จผ่านระบบ`,
  },
  {
    q: 'เงินจากการจองเข้าบัญชีเมื่อไหร่?',
    a: 'เงินที่ผู้เช่าชำระเข้าระบบจะถูกสรุปยอดให้ทันที ทีมงานตรวจสอบแล้วโอนเข้าบัญชีที่คุณผูกไว้ ดูสถานะการโอนได้ในคอนโซลตลอดเวลา',
  },
  {
    q: 'ต้องรอแอดมินอนุมัติก่อนใช่ไหม?',
    a: 'ใช่ หลังกรอกข้อมูลครบ ทีมงานจะตรวจสอบภายใน 1–2 วันทำการ แล้วเปิดให้เริ่มรับจอง',
  },
  { q: 'มีสัญญาผูกมัดไหม?', a: 'ไม่มี คุณสามารถหยุดหรือลบประกาศได้ทุกเมื่อ ไม่มีค่าปรับ' },
];

const MENU = [
  { label: 'ค่าบริการ', href: '#pricing' },
  { label: 'วิธีใช้งาน', href: '#steps' },
  { label: 'คำถามที่พบบ่อย', href: '#faq' },
  { label: 'ลงประกาศหอพัก', href: '/partner-register' },
  { label: 'เข้าสู่ระบบเจ้าของหอ', href: '/partner-login' },
];

function Icon({ d, color, size = 24 }: { d: string; color: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d={d} stroke={color} strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CheckDot() {
  return (
    <svg width="19" height="19" viewBox="0 0 24 24" fill="none" className="shrink-0">
      <circle cx="12" cy="12" r="9" fill="#1FB56E" />
      <path d="M8 12l3 3 5-6" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function OwnerLandingPage() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <main className="min-h-screen bg-[#F2F4F8] text-[#161A22]">
      {/* ===== NAVBAR ===== */}
      <div className="sticky top-0 z-30 flex h-[62px] items-center gap-5 bg-[#0E1220] px-4 sm:h-[72px] sm:px-10">
        <Link href="/" className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-[11px] bg-[#12A150] font-sans text-xl font-extrabold text-white sm:h-[38px] sm:w-[38px]">
            H
          </span>
          <span className="text-[18px] font-bold tracking-tight text-white sm:text-[20px]">Hoprak</span>
          <span className="hidden rounded-pill bg-[rgba(47,111,224,0.16)] px-2.5 py-1 text-[12.5px] font-bold text-[#6BA0F5] sm:inline">
            สำหรับเจ้าของหอ
          </span>
        </Link>

        <div className="ml-auto hidden items-center gap-6 sm:flex">
          <a href="#pricing" className="text-[14.5px] font-semibold text-[#C6CEDD] hover:text-white">
            ค่าบริการ
          </a>
          <a href="#faq" className="text-[14.5px] font-semibold text-[#C6CEDD] hover:text-white">
            คำถามที่พบบ่อย
          </a>
          <Link href="/partner-login" className="text-[14.5px] font-semibold text-[#C6CEDD] hover:text-white">
            เข้าสู่ระบบ
          </Link>
          <Link
            href="/partner-register"
            className="flex h-[42px] items-center rounded-[11px] bg-tenant px-[22px] text-sm font-bold text-white"
          >
            ลงประกาศฟรี
          </Link>
        </div>

        {/* มือถือ: ทุกอย่างไปอยู่ในลิ้นชัก */}
        <button
          type="button"
          onClick={() => setMenuOpen(true)}
          aria-label="เมนู"
          className="ml-auto flex h-9 w-9 flex-col items-center justify-center gap-[4px] rounded-[10px] bg-white/15 sm:hidden"
        >
          <span className="h-[2px] w-[17px] rounded-sm bg-white" />
          <span className="h-[2px] w-[17px] rounded-sm bg-white" />
          <span className="h-[2px] w-[17px] rounded-sm bg-white" />
        </button>
      </div>

      {menuOpen && (
        <>
          <div onClick={() => setMenuOpen(false)} className="fixed inset-0 z-[80] bg-[rgba(11,13,18,0.5)] sm:hidden" />
          <div className="fixed bottom-0 right-0 top-0 z-[81] flex w-[286px] max-w-[86vw] flex-col bg-white shadow-[-8px_0_40px_rgba(8,12,24,0.35)] sm:hidden">
            <div className="bg-[linear-gradient(150deg,#0E1220,#16233F)] px-5 pb-5 pt-[max(env(safe-area-inset-top),18px)]">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <span className="flex h-[30px] w-[30px] items-center justify-center rounded-lg bg-[#12A150] font-sans text-lg font-extrabold text-white">
                    H
                  </span>
                  <span className="text-[16px] font-bold text-white">HoprakSeller</span>
                </div>
                <button
                  type="button"
                  onClick={() => setMenuOpen(false)}
                  aria-label="ปิดเมนู"
                  className="flex h-[30px] w-[30px] items-center justify-center rounded-full bg-white/[0.16]"
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                    <path d="M6 6l12 12M18 6L6 18" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                </button>
              </div>
              <div className="mt-4 flex gap-2.5">
                <Link
                  href="/partner-login"
                  onClick={() => setMenuOpen(false)}
                  className="flex h-[42px] flex-1 items-center justify-center rounded-[11px] bg-white text-[13.5px] font-bold text-[#1E4FB0]"
                >
                  เข้าสู่ระบบ
                </Link>
                <Link
                  href="/partner-register"
                  onClick={() => setMenuOpen(false)}
                  className="flex h-[42px] flex-1 items-center justify-center rounded-[11px] border border-white/40 text-[13.5px] font-semibold text-white"
                >
                  สมัครสมาชิก
                </Link>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-2">
              {MENU.map((m) => (
                <Link
                  key={m.label}
                  href={m.href}
                  onClick={() => setMenuOpen(false)}
                  className="flex h-12 items-center justify-between rounded-[11px] px-3.5 text-[14.5px] font-semibold text-[#2A2F3A] active:bg-surface-canvas"
                >
                  {m.label}
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <path d="M9 6l6 6-6 6" stroke="#C9D0DC" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </Link>
              ))}
            </div>
          </div>
        </>
      )}

      {/* ===== HERO ===== */}
      <div className="relative overflow-hidden bg-[linear-gradient(120deg,#0E1220_0%,#16233F_55%,#1E4FB0_130%)] px-4 pb-12 pt-10 sm:px-10 sm:pb-[60px] sm:pt-14">
        <div className="pointer-events-none absolute -right-10 -top-16 h-[420px] w-[420px] rounded-full bg-[radial-gradient(circle,rgba(47,111,224,0.4),transparent_66%)] blur-[30px]" />
        <div className="relative grid items-center gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:gap-12">
          <div>
            <div className="inline-flex items-center gap-2 rounded-pill border border-[rgba(31,181,110,0.4)] bg-[rgba(31,181,110,0.18)] px-4 py-1.5 text-[13px] font-bold text-[#8FF0C4]">
              <span className="h-2 w-2 rounded-full bg-[#1FB56E]" />
              เปิดรับเจ้าของหอแล้ววันนี้
            </div>
            <h1 className="mt-4 text-[32px] font-extrabold leading-[1.15] tracking-[-1px] text-white sm:text-[46px] sm:tracking-[-1.4px]">
              ปล่อยห้องให้เต็ม
              <br />
              ได้เร็วกว่าเดิม กับ Hoprak
            </h1>
            <p className="mt-4 max-w-[520px] text-[15px] leading-relaxed text-[#C6D3EA] sm:text-[16.5px]">
              ลงประกาศหอพักฟรี เข้าถึงนักศึกษาหลายพันคนที่กำลังหาที่พักใกล้มหาวิทยาลัย จัดการห้อง รับการจอง
              และรับเงินผ่านระบบที่ปลอดภัย
            </p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/partner-register"
                className="flex h-[52px] items-center justify-center gap-2.5 rounded-[13px] bg-tenant px-8 text-base font-bold text-white shadow-[0_14px_30px_rgba(47,111,224,0.45)]"
              >
                เริ่มลงประกาศฟรี
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <path d="M5 12h14M13 6l6 6-6 6" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </Link>
              <a
                href="#steps"
                className="flex h-[52px] items-center justify-center gap-2.5 rounded-[13px] border border-white/30 px-[26px] text-base font-semibold text-white"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="9" stroke="#fff" strokeWidth="1.8" />
                  <path d="M10 8.5l6 3.5-6 3.5v-7z" fill="#fff" />
                </svg>
                ดูวิธีใช้งาน
              </a>
            </div>
            <div className="mt-8 flex gap-8 overflow-x-auto sm:overflow-visible">
              {HERO_STATS.map((s) => (
                <div key={s.label} className="shrink-0">
                  <div className="font-sans text-[22px] font-extrabold text-white sm:text-[26px]">{s.value}</div>
                  <div className="mt-0.5 text-[12.5px] text-[#9FB2D4]">{s.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* การ์ดแดชบอร์ดจำลอง — ตัวเลขเป็นตัวอย่างประกอบภาพ ไม่ได้ผูกกับข้อมูลจริง */}
          <div className="relative rounded-[22px] bg-[linear-gradient(135deg,#1E4FB0,#12224E)] p-4 shadow-[0_30px_70px_rgba(8,12,24,0.5)] sm:p-5">
            <div className="flex items-center gap-2 rounded-pill bg-white/95 px-3 py-1.5 text-[12.5px] font-bold text-[#12704A] shadow-[0_8px_20px_rgba(8,12,24,0.2)] sm:w-fit">
              <span className="relative flex h-[9px] w-[9px]">
                <span className="absolute -inset-1 rounded-full bg-[rgba(31,181,110,0.35)]" />
                <span className="absolute inset-0 rounded-full bg-[#1FB56E]" />
              </span>
              ตัวอย่างแดชบอร์ดเจ้าของหอ
            </div>

            <div className="mt-4 rounded-[17px] bg-white/[0.97] p-4 shadow-[0_12px_30px_rgba(8,12,24,0.22)]">
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-[7px] bg-[#12A150] font-sans text-sm font-extrabold text-white">
                    H
                  </span>
                  <span className="text-[13px] font-extrabold">แดชบอร์ดหอพัก</span>
                </div>
                <span className="rounded-pill bg-[#E7F7EF] px-2.5 py-0.5 text-[11px] font-bold text-[#12704A]">ตัวอย่าง</span>
              </div>
              <div className="flex gap-2.5">
                {[
                  { label: 'ห้องเต็ม', value: '18', suffix: '/20', bg: '#F5F9FF', border: '#E4ECFA', color: '#1E4FB0' },
                  { label: 'จองเดือนนี้', value: '12', suffix: '', bg: '#F0FAF4', border: '#D4EEDF', color: '#12704A' },
                  { label: 'คำขอใหม่', value: '3', suffix: '', bg: '#FFF8EF', border: '#F5E4C6', color: '#C77B14' },
                ].map((c) => (
                  <div key={c.label} className="flex-1 rounded-xl border p-2.5" style={{ background: c.bg, borderColor: c.border }}>
                    <div className="text-[11px] text-ink-faint">{c.label}</div>
                    <div className="font-sans text-[19px] font-extrabold" style={{ color: c.color }}>
                      {c.value}
                      {c.suffix && <span className="text-xs text-ink-faint">{c.suffix}</span>}
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-3 flex h-11 items-end gap-1.5">
                {[40, 55, 35, 70, 52, 85, 100].map((h, i) => (
                  <div
                    key={i}
                    className="flex-1 rounded"
                    style={{ height: `${h}%`, background: h >= 85 ? '#2F6FE0' : h >= 70 ? '#BFD3F5' : '#DCE7FA' }}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ===== 3 STEPS ===== */}
      <div id="steps" className="scroll-mt-20 px-4 pb-5 pt-12 sm:px-10 sm:pt-14">
        <div className="mb-8 text-center sm:mb-10">
          <div className="text-[13px] font-bold uppercase tracking-[1px] text-tenant">ง่ายใน 3 ขั้นตอน</div>
          <div className="mt-2 text-[24px] font-extrabold tracking-[-0.6px] sm:text-[30px]">เริ่มปล่อยห้องได้ภายในวันเดียว</div>
        </div>
        <div className="grid gap-4 sm:gap-[22px] lg:grid-cols-3">
          {STEPS.map((s) => (
            <div
              key={s.n}
              className="relative rounded-[20px] border border-card-border bg-white p-6 shadow-[0_2px_8px_rgba(16,24,40,0.05)] sm:p-7"
            >
              <div className="absolute right-6 top-5 font-sans text-[44px] font-extrabold text-[#EEF2F8]">{s.n}</div>
              <div className="mb-4 flex h-[54px] w-[54px] items-center justify-center rounded-[15px]" style={{ background: s.bg }}>
                <Icon d={s.d} color={s.color} size={26} />
              </div>
              <div className="text-[18px] font-extrabold">{s.title}</div>
              <div className="mt-2 text-sm leading-relaxed text-[#5B616C]">{s.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ===== FEATURES ===== */}
      <div className="px-4 pb-5 pt-8 sm:px-10 sm:pt-11">
        <div className="grid grid-cols-2 gap-3 sm:gap-[18px] lg:grid-cols-4">
          {FEATURES.map((f) => (
            <div key={f.title} className="rounded-[18px] border border-card-border bg-white p-4 shadow-[0_2px_8px_rgba(16,24,40,0.05)] sm:p-5">
              <div className="mb-3.5 flex h-[46px] w-[46px] items-center justify-center rounded-[13px]" style={{ background: f.bg }}>
                <Icon d={f.d} color={f.color} size={22} />
              </div>
              <div className="text-[15.5px] font-bold">{f.title}</div>
              <div className="mt-1.5 text-[13px] leading-relaxed text-ink-faint">{f.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ===== PRICING ===== */}
      <div id="pricing" className="scroll-mt-20 px-4 pb-5 pt-8 sm:px-10 sm:pt-11">
        <div className="flex flex-col items-center gap-8 rounded-[24px] border border-[#D5E4FF] bg-[linear-gradient(135deg,#F5F9FF,#EAF1FF)] p-6 sm:p-10 lg:flex-row lg:justify-between">
          <div className="flex-1">
            <div className="text-[22px] font-extrabold tracking-[-0.5px] sm:text-[28px]">
              ลงประกาศฟรี จ่ายเฉพาะเมื่อจองสำเร็จ
            </div>
            <p className="mt-3 max-w-[560px] text-[15px] leading-relaxed text-[#5B616C]">
              ไม่มีค่าแรกเข้า ไม่มีค่ารายเดือน Hoprak หักค่าบริการเพียง{' '}
              <b className="text-[#1E4FB0]">{COMMISSION_PCT}%</b> จากยอดที่จองสำเร็จผ่านระบบ แล้วโอนส่วนที่เหลือเข้าบัญชีคุณ
            </p>
            <div className="mt-5 flex flex-wrap gap-6">
              {['ไม่มีค่าแรกเข้า', 'ไม่มีค่ารายเดือน'].map((p) => (
                <div key={p} className="flex items-center gap-2.5">
                  <CheckDot />
                  <span className="text-sm font-semibold text-[#2A303C]">{p}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="w-full shrink-0 rounded-[20px] bg-white p-6 text-center shadow-[0_16px_40px_rgba(30,79,176,0.16)] sm:w-[250px]">
            <div className="text-[13px] text-ink-faint">ค่าบริการต่อการจอง</div>
            <div className="font-sans text-[52px] font-extrabold leading-[1.1] tracking-[-2px] text-tenant">
              {COMMISSION_PCT}%
            </div>
            <div className="mb-4 text-[13px] text-ink-faint">เฉพาะเมื่อจองสำเร็จ</div>
            <Link
              href="/partner-register"
              className="flex h-12 items-center justify-center rounded-xl bg-tenant text-[15px] font-bold text-white shadow-[0_10px_22px_rgba(47,111,224,0.35)]"
            >
              เริ่มลงประกาศ
            </Link>
          </div>
        </div>
      </div>

      {/* ===== FAQ ===== */}
      <div id="faq" className="scroll-mt-20 px-4 pb-5 pt-8 sm:px-10 sm:pt-11">
        <div className="mb-5 text-[22px] font-extrabold tracking-[-0.5px] sm:text-[26px]">คำถามที่พบบ่อย</div>
        <div className="flex flex-col gap-3">
          {FAQS.map((f) => (
            <div key={f.q} className="rounded-[15px] border border-card-border bg-white p-4 shadow-[0_1px_3px_rgba(16,24,40,0.04)] sm:px-6 sm:py-5">
              <div className="text-[15.5px] font-bold">{f.q}</div>
              <div className="mt-1.5 text-[13.5px] leading-relaxed text-ink-faint">{f.a}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ===== CTA ===== */}
      <div className="px-4 pb-14 pt-7 sm:px-10 sm:pb-16">
        <div className="relative overflow-hidden rounded-[24px] bg-[linear-gradient(120deg,#1E4FB0,#2F6FE0)] p-7 text-center sm:p-11">
          <div className="pointer-events-none absolute -top-12 left-1/2 h-[300px] w-[400px] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(255,255,255,0.22),transparent_66%)] blur-[24px]" />
          <div className="relative">
            <div className="text-[24px] font-extrabold tracking-[-0.6px] text-white sm:text-[30px]">
              พร้อมปล่อยห้องให้เต็มแล้วหรือยัง?
            </div>
            <div className="mt-2.5 text-[15px] text-[#DCE7FA]">ใช้เวลาไม่ถึง 10 นาที ลงประกาศหอแรกของคุณฟรี</div>
            <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link
                href="/partner-register"
                className="flex h-[54px] w-full items-center justify-center gap-2.5 rounded-[13px] bg-white px-9 text-[16.5px] font-extrabold text-[#1E4FB0] shadow-[0_16px_34px_rgba(8,12,24,0.3)] sm:w-auto"
              >
                ลงประกาศหอพักฟรี
                <svg width="19" height="19" viewBox="0 0 24 24" fill="none">
                  <path d="M5 12h14M13 6l6 6-6 6" stroke="#1E4FB0" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </Link>
            </div>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-2.5 border-t border-white/[0.16] pt-5">
              {['ไม่มีสัญญาผูกมัด', 'หยุดประกาศได้ตลอดเวลา', 'ทีมงานช่วยตั้งค่าให้ฟรี'].map((t) => (
                <div key={t} className="flex items-center gap-2 text-[13.5px] font-semibold text-[#DCE7FA]">
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="9" stroke="#8FF0C4" strokeWidth="1.8" />
                    <path d="M8 12l3 3 5-6" stroke="#8FF0C4" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  {t}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ปุ่มลอยมุมขวาล่าง — มือถือเท่านั้น */}
      <Link
        href="/partner-register"
        className="fixed bottom-5 right-4 z-40 flex items-center gap-2 rounded-pill bg-tenant py-2.5 pl-2.5 pr-4 text-[12.5px] font-bold text-white shadow-[0_12px_28px_rgba(47,111,224,0.45)] sm:hidden"
      >
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/20 text-[15px] font-extrabold">?</span>
        วิธีสมัคร &amp; ใช้งาน
      </Link>
    </main>
  );
}
