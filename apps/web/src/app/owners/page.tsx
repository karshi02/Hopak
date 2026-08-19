'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useFees, toPct } from '@/hooks/useFees';
import { useLang } from '@/hooks/useLang';
import { LangSwitch } from '@/components/LangSwitch';

/**
 * หน้า "เรียนรู้เพิ่มเติม" สำหรับเจ้าของหอ — หน้าขายของ ไม่ต้องล็อกอิน
 * ปุ่ม CTA ทุกตัวพาไปหน้าสมัครเปิดหอพักจริง (/partner-register)
 *
 * ตัวเลขค่าคอมดึงจาก /settings/fees (ค่าที่แอดมินตั้งไว้ ระบบใช้คิดเงินจริงด้วยค่าเดียวกัน)
 * ไม่ฮาร์ดโค้ด % ไว้ในข้อความ — วันไหนแอดมินเปลี่ยนเรต หน้านี้ต้องเปลี่ยนตามเอง
 *
 * สองภาษาเหมือนหน้าอื่น (useLang เก็บค่าไว้ให้ทั้งเว็บ) สลับได้ในลิ้นชักเมนูบนมือถือ
 * และที่หัวเว็บบนจอใหญ่
 */

// ตัวเลขที่โชว์ต้องมาจากค่าที่แอดมินตั้งจริง (useFees ยิง /settings/fees) ไม่ใช่ค่าคงที่ในโค้ด

/** ระยะเวลาสไลด์ลิ้นชัก — ชุดเดียวกับลิ้นชักฝั่งผู้เช่า (MobileHomeChrome) */
const DRAWER_MS = 300;
const DRAWER_EASE = 'cubic-bezier(.32,.72,0,1)';

/** รูปประกอบของแต่ละขั้นตอน/ฟีเจอร์ แยกจากข้อความเพราะไม่ขึ้นกับภาษา */
const STEP_ART = [
  { bg: '#EAF1FF', color: '#2F6FE0', d: 'M3 21h18M5 21V7l7-4 7 4v14M9 21v-6h6v6' },
  { bg: '#E7F7EF', color: '#178F5A', d: 'M8 2v3M16 2v3M4 8h16M5 5h14v15H5z' },
  { bg: '#F3ECFF', color: '#7C4DE0', d: 'M12 3v18M8 7h5a3 3 0 010 6H9a3 3 0 000 6h6' },
];

const FEATURE_ART = [
  { bg: '#EAF1FF', color: '#2F6FE0', d: 'M4 6h16M4 12h16M4 18h10' },
  { bg: '#E7F7EF', color: '#178F5A', d: 'M18 8a6 6 0 10-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 01-3.4 0' },
  {
    bg: '#FFF3E0',
    color: '#E0902F',
    d: 'M12 3l2.9 6.2 6.8.7-5.1 4.6 1.5 6.7L12 17.8 5.9 20.2l1.5-6.7L2.3 9.9l6.8-.7L12 3z',
  },
  { bg: '#F3ECFF', color: '#7C4DE0', d: 'M4 20V10M10 20V4M16 20v-7M22 20H2' },
];

const MENU_HREFS = ['#pricing', '#steps', '#faq', '/partner-register', '/partner-login'];

const buildText = (COMMISSION_PCT: number) => ({
  th: {
    forOwners: 'สำหรับเจ้าของหอ',
    navPricing: 'ค่าบริการ',
    navFaq: 'คำถามที่พบบ่อย',
    navLogin: 'เข้าสู่ระบบ',
    navList: 'ลงประกาศฟรี',
    menu: 'เมนู',
    close: 'ปิดเมนู',
    register: 'สมัครสมาชิก',
    language: 'ภาษา:',
    menuLabels: ['ค่าบริการ', 'วิธีใช้งาน', 'คำถามที่พบบ่อย', 'ลงประกาศหอพัก', 'เข้าสู่ระบบเจ้าของหอ'],

    heroBadge: 'เปิดรับเจ้าของหอแล้ววันนี้',
    heroTitle1: 'ปล่อยห้องให้เต็ม',
    heroTitle2: 'ได้เร็วกว่าเดิม กับ Hoprak',
    heroSub:
      'ลงประกาศหอพักฟรี เข้าถึงนักศึกษาหลายพันคนที่กำลังหาที่พักใกล้มหาวิทยาลัย จัดการห้อง รับการจอง และรับเงินผ่านระบบที่ปลอดภัย',
    heroCta: 'เริ่มลงประกาศฟรี',
    heroCtaAlt: 'ดูวิธีใช้งาน',
    heroStats: [
      { value: '2,400+', label: 'นักศึกษาที่ค้นหาต่อเดือน' },
      { value: '฿0', label: 'ค่าลงประกาศ' },
      { value: '< 1 วัน', label: 'เริ่มรับจองได้' },
    ],

    demoBadge: 'ตัวอย่างแดชบอร์ดเจ้าของหอ',
    demoTitle: 'แดชบอร์ดหอพัก',
    demoSample: 'ตัวอย่าง',
    demoCards: ['ห้องเต็ม', 'จองเดือนนี้', 'คำขอใหม่'],

    stepsKicker: 'ง่ายใน 3 ขั้นตอน',
    stepsTitle: 'เริ่มปล่อยห้องได้ภายในวันเดียว',
    steps: [
      { title: 'ลงข้อมูลหอพัก', desc: 'กรอกรายละเอียดห้อง ราคา ค่าน้ำค่าไฟ และอัปโหลดรูป ใช้เวลาไม่กี่นาที' },
      { title: 'รับการจองออนไลน์', desc: 'นักศึกษาค้นหาและจองห้องได้ทันที คุณยืนยันการจองผ่านแอปได้เลย' },
      { title: 'รับเงินปลอดภัย', desc: `เงินโอนเข้าบัญชีหลังหักค่าบริการ ${COMMISSION_PCT}% พร้อมสรุปยอดชัดเจน` },
    ],

    features: [
      { title: 'จัดการห้องง่าย', desc: 'อัปเดตห้องว่าง ราคา และสถานะได้ตลอดเวลา' },
      { title: 'แจ้งเตือนทันที', desc: 'มีคนจองหรือชำระเงิน ระบบเด้งแจ้งให้รู้ทันที' },
      { title: 'รีวิวสร้างความเชื่อมั่น', desc: 'สะสมรีวิวจริงจากผู้เช่า ดึงดูดคนจองมากขึ้น' },
      { title: 'สรุปรายได้', desc: 'ดูยอดจอง ยอดโอน และสถิติหอพักแบบเรียลไทม์' },
    ],

    pricingTitle: 'ลงประกาศฟรี จ่ายเฉพาะเมื่อจองสำเร็จ',
    pricingBefore: 'ไม่มีค่าแรกเข้า ไม่มีค่ารายเดือน Hoprak หักค่าบริการเพียง ',
    pricingAfter: ' จากยอดที่จองสำเร็จผ่านระบบ แล้วโอนส่วนที่เหลือเข้าบัญชีคุณ',
    pricingPoints: ['ไม่มีค่าแรกเข้า', 'ไม่มีค่ารายเดือน'],
    pricingPerBooking: 'ค่าบริการต่อการจอง',
    pricingOnlyWhen: 'เฉพาะเมื่อจองสำเร็จ',
    pricingCta: 'เริ่มลงประกาศ',

    faqTitle: 'คำถามที่พบบ่อย',
    faqs: [
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
    ],

    ctaTitle: 'พร้อมปล่อยห้องให้เต็มแล้วหรือยัง?',
    ctaSub: 'ใช้เวลาไม่ถึง 10 นาที ลงประกาศหอแรกของคุณฟรี',
    ctaButton: 'ลงประกาศหอพักฟรี',
    ctaPoints: ['ไม่มีสัญญาผูกมัด', 'หยุดประกาศได้ตลอดเวลา', 'ทีมงานช่วยตั้งค่าให้ฟรี'],
    fab: 'วิธีสมัคร & ใช้งาน',
  },

  en: {
    forOwners: 'For dorm owners',
    navPricing: 'Pricing',
    navFaq: 'FAQ',
    navLogin: 'Log in',
    navList: 'List for free',
    menu: 'Menu',
    close: 'Close menu',
    register: 'Sign up',
    language: 'Language:',
    menuLabels: ['Pricing', 'How it works', 'FAQ', 'List your dorm', 'Owner log in'],

    heroBadge: 'Now onboarding dorm owners',
    heroTitle1: 'Fill your rooms',
    heroTitle2: 'faster, with Hoprak',
    heroSub:
      'List your dorm for free and reach thousands of students looking for a place near campus. Manage rooms, take bookings and get paid through a secure system.',
    heroCta: 'Start listing free',
    heroCtaAlt: 'See how it works',
    heroStats: [
      { value: '2,400+', label: 'student searches a month' },
      { value: '฿0', label: 'to list' },
      { value: '< 1 day', label: 'to start taking bookings' },
    ],

    demoBadge: 'Sample owner dashboard',
    demoTitle: 'Dorm dashboard',
    demoSample: 'Sample',
    demoCards: ['Rooms filled', 'Bookings this month', 'New requests'],

    stepsKicker: 'Three simple steps',
    stepsTitle: 'Start renting out rooms the same day',
    steps: [
      { title: 'Add your dorm', desc: 'Enter room details, prices, water and electricity rates, and upload photos. A few minutes.' },
      { title: 'Take bookings online', desc: 'Students find and book instantly, and you confirm right in the app.' },
      { title: 'Get paid safely', desc: `Money reaches your account after the ${COMMISSION_PCT}% service fee, with a clear statement.` },
    ],

    features: [
      { title: 'Easy room management', desc: 'Update vacancies, prices and status any time.' },
      { title: 'Instant alerts', desc: 'A booking or a payment pings you the moment it happens.' },
      { title: 'Reviews build trust', desc: 'Collect real tenant reviews and attract more bookings.' },
      { title: 'Revenue at a glance', desc: 'Bookings, payouts and dorm stats in real time.' },
    ],

    pricingTitle: 'Free to list, pay only on a completed booking',
    pricingBefore: 'No setup fee, no monthly fee. Hoprak takes just ',
    pricingAfter: ' of what is booked through the system, and transfers the rest to your account.',
    pricingPoints: ['No setup fee', 'No monthly fee'],
    pricingPerBooking: 'Service fee per booking',
    pricingOnlyWhen: 'only on a completed booking',
    pricingCta: 'Start listing',

    faqTitle: 'Frequently asked questions',
    faqs: [
      {
        q: 'Does listing cost anything?',
        a: `Listing is completely free. Hoprak takes a ${COMMISSION_PCT}% fee only when a booking completes through the system.`,
      },
      {
        q: 'When does booking money reach my account?',
        a: 'Payments made through the system are totalled straight away. Once our team checks them, the money goes to the account you linked — you can follow the transfer status in the console at any time.',
      },
      {
        q: 'Do I have to wait for admin approval?',
        a: 'Yes. Once your details are complete, our team reviews them within 1–2 business days and then opens you up for bookings.',
      },
      { q: 'Am I locked into a contract?', a: 'No. You can pause or delete your listing whenever you like, with no penalty.' },
    ],

    ctaTitle: 'Ready to fill your rooms?',
    ctaSub: 'It takes under 10 minutes to list your first dorm, free.',
    ctaButton: 'List your dorm free',
    ctaPoints: ['No lock-in contract', 'Pause your listing any time', 'Free setup help from our team'],
    fab: 'How to join & use',
  },
});

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
  const { lang, setLang } = useLang();
  // อัตราจริงจากเซิร์ฟเวอร์ — ข้อความโฆษณาทุกจุดในหน้านี้อ้างเลขเดียวกับที่ระบบหักจริง
  const fees = useFees();
  const commissionPct = toPct(fees.commissionRate);
  const t = buildText(commissionPct)[lang];
  const [menuOpen, setMenuOpen] = useState(false);

  // ลิ้นชักต้องอยู่ใน DOM ต่ออีกแป๊บตอนปิด ไม่งั้นถอดทิ้งทันทีจนไม่เห็นจังหวะสไลด์ออก
  const [render, setRender] = useState(false);
  const [shown, setShown] = useState(false);
  useEffect(() => {
    if (menuOpen) {
      setRender(true);
      const id = requestAnimationFrame(() => setShown(true));
      return () => cancelAnimationFrame(id);
    }
    setShown(false);
    const id = setTimeout(() => setRender(false), DRAWER_MS);
    return () => clearTimeout(id);
  }, [menuOpen]);

  const menuItems = t.menuLabels.map((label, i) => ({ label, href: MENU_HREFS[i] }));
  const bar = 'absolute h-[2px] w-[17px] rounded-sm bg-white transition-transform duration-[300ms] motion-reduce:transition-none';
  const ease = { transitionTimingFunction: DRAWER_EASE };

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
            {t.forOwners}
          </span>
        </Link>

        <div className="ml-auto hidden items-center gap-6 sm:flex">
          <a href="#pricing" className="text-[14.5px] font-semibold text-[#C6CEDD] hover:text-white">
            {t.navPricing}
          </a>
          <a href="#faq" className="text-[14.5px] font-semibold text-[#C6CEDD] hover:text-white">
            {t.navFaq}
          </a>
          <LangSwitch lang={lang} onChange={setLang} />
          <Link href="/partner-login" className="text-[14.5px] font-semibold text-[#C6CEDD] hover:text-white">
            {t.navLogin}
          </Link>
          <Link
            href="/partner-register"
            className="flex h-[42px] items-center rounded-[11px] bg-tenant px-[22px] text-sm font-bold text-white"
          >
            {t.navList}
          </Link>
        </div>

        {/* มือถือ: ทุกอย่างไปอยู่ในลิ้นชัก */}
        <button
          type="button"
          onClick={() => setMenuOpen((v) => !v)}
          aria-label={t.menu}
          aria-expanded={menuOpen}
          className="relative ml-auto flex h-9 w-9 items-center justify-center rounded-[10px] bg-white/15 transition-transform active:scale-95 sm:hidden"
        >
          <span className={bar} style={{ ...ease, transform: menuOpen ? 'rotate(45deg)' : 'translateY(-6px)' }} />
          <span
            className={`${bar} transition-opacity`}
            style={{ ...ease, opacity: menuOpen ? 0 : 1, transitionDuration: '300ms' }}
          />
          <span className={bar} style={{ ...ease, transform: menuOpen ? 'rotate(-45deg)' : 'translateY(6px)' }} />
        </button>
      </div>

      {render && (
        <>
          <div
            onClick={() => setMenuOpen(false)}
            style={{ transitionDuration: `${DRAWER_MS}ms` }}
            className={`fixed inset-0 z-[80] bg-[rgba(11,13,18,0.5)] transition-opacity ease-out motion-reduce:transition-none sm:hidden ${
              shown ? 'opacity-100' : 'opacity-0'
            }`}
          />
          <div
            style={{ transitionDuration: `${DRAWER_MS}ms`, transitionTimingFunction: DRAWER_EASE }}
            className={`fixed bottom-0 right-0 top-0 z-[81] flex w-[286px] max-w-[86vw] flex-col bg-white shadow-[-8px_0_40px_rgba(8,12,24,0.35)] transition-transform will-change-transform motion-reduce:transition-none sm:hidden ${
              shown ? 'translate-x-0' : 'translate-x-full'
            }`}
          >
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
                  aria-label={t.close}
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
                  {t.navLogin}
                </Link>
                <Link
                  href="/partner-register"
                  onClick={() => setMenuOpen(false)}
                  className="flex h-[42px] flex-1 items-center justify-center rounded-[11px] border border-white/40 text-[13.5px] font-semibold text-white"
                >
                  {t.register}
                </Link>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-2">
              {menuItems.map((m, i) => (
                <Link
                  key={m.label}
                  href={m.href}
                  onClick={() => setMenuOpen(false)}
                  /* ไล่ทีละอันเท่ากันทั้งขาเข้าและขาออก — ขาออกไล่ย้อนจากอันล่างขึ้นบน */
                  style={{
                    transitionDuration: '440ms',
                    transitionDelay: `${90 + (shown ? i : menuItems.length - 1 - i) * 40}ms`,
                  }}
                  className={`flex h-12 items-center justify-between rounded-[11px] px-3.5 text-[14.5px] font-semibold text-[#2A2F3A] transition-[opacity,transform] ease-out motion-reduce:transition-none active:bg-surface-canvas ${
                    shown ? 'translate-x-0 opacity-100' : 'translate-x-3 opacity-0'
                  }`}
                >
                  {m.label}
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <path d="M9 6l6 6-6 6" stroke="#C9D0DC" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </Link>
              ))}

              <div className="mx-3.5 my-2 h-px bg-[#EEF1F6]" />
              <div className="flex items-center gap-2.5 px-3.5 py-3">
                <span className="text-[13px] font-semibold text-ink-faint">{t.language}</span>
                <LangSwitch lang={lang} onChange={setLang} />
              </div>
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
              {t.heroBadge}
            </div>
            <h1 className="mt-4 text-[32px] font-extrabold leading-[1.15] tracking-[-1px] text-white sm:text-[46px] sm:tracking-[-1.4px]">
              {t.heroTitle1}
              <br />
              {t.heroTitle2}
            </h1>
            <p className="mt-4 max-w-[520px] text-[15px] leading-relaxed text-[#C6D3EA] sm:text-[16.5px]">{t.heroSub}</p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/partner-register"
                className="flex h-[52px] items-center justify-center gap-2.5 rounded-[13px] bg-tenant px-8 text-base font-bold text-white shadow-[0_14px_30px_rgba(47,111,224,0.45)]"
              >
                {t.heroCta}
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
                {t.heroCtaAlt}
              </a>
            </div>
            <div className="mt-8 flex gap-8 overflow-x-auto sm:overflow-visible">
              {t.heroStats.map((s) => (
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
              {t.demoBadge}
            </div>

            <div className="mt-4 rounded-[17px] bg-white/[0.97] p-4 shadow-[0_12px_30px_rgba(8,12,24,0.22)]">
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-[7px] bg-[#12A150] font-sans text-sm font-extrabold text-white">
                    H
                  </span>
                  <span className="text-[13px] font-extrabold">{t.demoTitle}</span>
                </div>
                <span className="rounded-pill bg-[#E7F7EF] px-2.5 py-0.5 text-[11px] font-bold text-[#12704A]">
                  {t.demoSample}
                </span>
              </div>
              <div className="flex gap-2.5">
                {[
                  { value: '18', suffix: '/20', bg: '#F5F9FF', border: '#E4ECFA', color: '#1E4FB0' },
                  { value: '12', suffix: '', bg: '#F0FAF4', border: '#D4EEDF', color: '#12704A' },
                  { value: '3', suffix: '', bg: '#FFF8EF', border: '#F5E4C6', color: '#C77B14' },
                ].map((c, i) => (
                  <div
                    key={t.demoCards[i]}
                    className="flex-1 rounded-xl border p-2.5"
                    style={{ background: c.bg, borderColor: c.border }}
                  >
                    <div className="text-[11px] leading-tight text-ink-faint">{t.demoCards[i]}</div>
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
          <div className="text-[13px] font-bold uppercase tracking-[1px] text-tenant">{t.stepsKicker}</div>
          <div className="mt-2 text-[24px] font-extrabold tracking-[-0.6px] sm:text-[30px]">{t.stepsTitle}</div>
        </div>
        <div className="grid gap-4 sm:gap-[22px] lg:grid-cols-3">
          {t.steps.map((s, i) => (
            <div
              key={s.title}
              className="relative rounded-[20px] border border-card-border bg-white p-6 shadow-[0_2px_8px_rgba(16,24,40,0.05)] sm:p-7"
            >
              <div className="absolute right-6 top-5 font-sans text-[44px] font-extrabold text-[#EEF2F8]">{i + 1}</div>
              <div
                className="mb-4 flex h-[54px] w-[54px] items-center justify-center rounded-[15px]"
                style={{ background: STEP_ART[i].bg }}
              >
                <Icon d={STEP_ART[i].d} color={STEP_ART[i].color} size={26} />
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
          {t.features.map((f, i) => (
            <div
              key={f.title}
              className="rounded-[18px] border border-card-border bg-white p-4 shadow-[0_2px_8px_rgba(16,24,40,0.05)] sm:p-5"
            >
              <div
                className="mb-3.5 flex h-[46px] w-[46px] items-center justify-center rounded-[13px]"
                style={{ background: FEATURE_ART[i].bg }}
              >
                <Icon d={FEATURE_ART[i].d} color={FEATURE_ART[i].color} size={22} />
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
            <div className="text-[22px] font-extrabold tracking-[-0.5px] sm:text-[28px]">{t.pricingTitle}</div>
            <p className="mt-3 max-w-[560px] text-[15px] leading-relaxed text-[#5B616C]">
              {t.pricingBefore}
              <b className="text-[#1E4FB0]">{commissionPct}%</b>
              {t.pricingAfter}
            </p>
            <div className="mt-5 flex flex-wrap gap-6">
              {t.pricingPoints.map((p) => (
                <div key={p} className="flex items-center gap-2.5">
                  <CheckDot />
                  <span className="text-sm font-semibold text-[#2A303C]">{p}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="w-full shrink-0 rounded-[20px] bg-white p-6 text-center shadow-[0_16px_40px_rgba(30,79,176,0.16)] sm:w-[250px]">
            <div className="text-[13px] text-ink-faint">{t.pricingPerBooking}</div>
            <div className="font-sans text-[52px] font-extrabold leading-[1.1] tracking-[-2px] text-tenant">
              {commissionPct}%
            </div>
            <div className="mb-4 text-[13px] text-ink-faint">{t.pricingOnlyWhen}</div>
            <Link
              href="/partner-register"
              className="flex h-12 items-center justify-center rounded-xl bg-tenant text-[15px] font-bold text-white shadow-[0_10px_22px_rgba(47,111,224,0.35)]"
            >
              {t.pricingCta}
            </Link>
          </div>
        </div>
      </div>

      {/* ===== FAQ ===== */}
      <div id="faq" className="scroll-mt-20 px-4 pb-5 pt-8 sm:px-10 sm:pt-11">
        <div className="mb-5 text-[22px] font-extrabold tracking-[-0.5px] sm:text-[26px]">{t.faqTitle}</div>
        <div className="flex flex-col gap-3">
          {t.faqs.map((f) => (
            <div
              key={f.q}
              className="rounded-[15px] border border-card-border bg-white p-4 shadow-[0_1px_3px_rgba(16,24,40,0.04)] sm:px-6 sm:py-5"
            >
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
            <div className="text-[24px] font-extrabold tracking-[-0.6px] text-white sm:text-[30px]">{t.ctaTitle}</div>
            <div className="mt-2.5 text-[15px] text-[#DCE7FA]">{t.ctaSub}</div>
            <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link
                href="/partner-register"
                className="flex h-[54px] w-full items-center justify-center gap-2.5 rounded-[13px] bg-white px-9 text-[16.5px] font-extrabold text-[#1E4FB0] shadow-[0_16px_34px_rgba(8,12,24,0.3)] sm:w-auto"
              >
                {t.ctaButton}
                <svg width="19" height="19" viewBox="0 0 24 24" fill="none">
                  <path d="M5 12h14M13 6l6 6-6 6" stroke="#1E4FB0" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </Link>
            </div>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-2.5 border-t border-white/[0.16] pt-5">
              {t.ctaPoints.map((p) => (
                <div key={p} className="flex items-center gap-2 text-[13.5px] font-semibold text-[#DCE7FA]">
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="9" stroke="#8FF0C4" strokeWidth="1.8" />
                    <path d="M8 12l3 3 5-6" stroke="#8FF0C4" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  {p}
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
        {t.fab}
      </Link>
    </main>
  );
}
