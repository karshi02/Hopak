'use client';

import Link from 'next/link';
import { useRef, useState } from 'react';

type Step = 1 | 2 | 3 | 4;

type Place = {
  name: string;
  area: string;
  lat: number;
  lng: number;
};

type Pin = { x: number; y: number; lat: number; lng: number };

const PLACES: Place[] = [
  { name: 'ม.มหาสารคาม (เขตขามเรียง)', area: 'ต.ขามเรียง อ.กันทรวิชัย', lat: 16.2468, lng: 103.2512 },
  { name: 'ตลาดสดเทศบาลเมือง', area: 'ถ.นครสวรรค์ ต.ตลาด อ.เมือง', lat: 16.1812, lng: 103.3005 },
  { name: 'โรงพยาบาลมหาสารคาม', area: 'ถ.ผดุงวิถี ต.ตลาด อ.เมือง', lat: 16.1774, lng: 103.2941 },
  { name: 'เสริมไทย คอมเพล็กซ์', area: 'ถ.นครสวรรค์ ต.ตลาด อ.เมือง', lat: 16.1893, lng: 103.2998 },
];

const STEP_LABELS = ['บัญชี', 'ข้อมูลหอ', 'ส่งใบสมัคร', 'รออนุมัติ'];
const MOBILE_STEP_LABELS = ['สร้างบัญชี', 'ยืนยันและข้อมูลหอ', 'ส่งใบสมัคร', 'รออนุมัติ'];

function Mark({ size = 22, dark = false }: { size?: number; dark?: boolean }) {
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-[11px] bg-[linear-gradient(140deg,#16B497,#0E7A6C)] font-sans font-extrabold text-white shadow-[0_7px_18px_rgba(8,94,80,.2)] ${dark ? 'bg-white/15' : ''}`}
      style={{ width: size, height: size, fontSize: size * 0.56 }}
      aria-hidden="true"
    >
      H
    </span>
  );
}

function Icon({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      {children}
    </svg>
  );
}

function ArrowIcon() {
  return <Icon className="h-4 w-4"><path d="M5 12h14" /><path d="m13 6 6 6-6 6" /></Icon>;
}

function PinIcon({ className = 'h-5 w-5' }: { className?: string }) {
  return <Icon className={className}><path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z" /><circle cx="12" cy="10" r="2.5" /></Icon>;
}

function ShieldIcon() {
  return <Icon className="h-4 w-4"><path d="M12 3 4.5 6v5.6c0 4.4 3 7.5 7.5 9.4 4.5-1.9 7.5-5 7.5-9.4V6L12 3Z" /><path d="m8.7 12 2.1 2.1 4.6-4.8" /></Icon>;
}

function GoogleMark() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
      <path fill="#4285F4" d="M21.6 12.23c0-.71-.06-1.23-.2-1.78H12v3.35h5.52c-.11.83-.72 2.08-2.08 2.92l-.02.11 3.02 2.34.21.02c1.94-1.79 3.05-4.42 3.05-7.96Z" />
      <path fill="#34A853" d="M12 22c2.7 0 4.97-.89 6.63-2.42l-3.16-2.47c-.84.59-1.97 1-3.47 1a6 6 0 0 1-5.65-4.15l-.1.01-3.14 2.43-.04.1A10 10 0 0 0 12 22Z" />
      <path fill="#FBBC05" d="M6.35 13.97A6.1 6.1 0 0 1 6.03 12c0-.68.12-1.34.31-1.97v-.12L3.17 7.45l-.1.05A10 10 0 0 0 2 12c0 1.62.39 3.15 1.07 4.5l3.28-2.53Z" />
      <path fill="#EA4335" d="M12 5.97c1.9 0 3.18.82 3.91 1.5l2.85-2.78C16.96 3.02 14.7 2 12 2a10 10 0 0 0-8.93 5.5l3.28 2.53A6 6 0 0 1 12 5.97Z" />
    </svg>
  );
}

function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[13px] font-semibold text-[#33413B]">{label}</span>
      {children}
      {hint && <span className="mt-1.5 block text-xs text-[#7A857F]">{hint}</span>}
    </label>
  );
}

function DesktopStepper({ step }: { step: Step }) {
  return (
    <div className="mt-8 hidden min-[821px]:block">
      <div className="flex items-start">
        {STEP_LABELS.map((label, index) => {
          const number = index + 1;
          const active = step >= number;
          return (
            <div key={label} className="flex flex-1 items-start last:flex-none">
              <div className="flex flex-col items-center">
                <span className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold ${active ? 'bg-[#0E9F8E] text-white shadow-[0_5px_12px_rgba(14,159,142,.25)]' : 'border border-[#E0E5E3] bg-white text-[#A6AFAA]'}`}>
                  {step > number ? '✓' : number}
                </span>
                <span className={`mt-2 whitespace-nowrap text-[12px] font-medium ${active ? 'text-[#167E70]' : 'text-[#A6AFAA]'}`}>{label}</span>
              </div>
              {number < 4 && <span className={`mt-[15px] h-[2px] flex-1 ${step > number ? 'bg-[#0E9F8E]' : 'bg-[#E8ECEA]'}`} />}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function BrandPanel() {
  const benefits = [
    ['เข้าถึงผู้เช่าหลายพันคน', <path key="users" d="M16 20v-1.5a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4V20M9.5 10.5A3.5 3.5 0 1 0 9.5 3a3.5 3.5 0 0 0 0 7.5ZM18 9a3 3 0 0 1 3 3v1M16.5 3.4a3 3 0 0 1 0 5.8" />],
    ['รับเงินปลอดภัย ตรวจยอดอัตโนมัติ', <><path key="shield" d="M12 3 5 6v5.5c0 4.2 2.8 7.2 7 9.2 4.2-2 7-5 7-9.2V6l-7-3Z" /><path key="check" d="m8.7 12 2.1 2.1 4.6-4.8" /></>],
    ['จัดการห้องและการจองในที่เดียว', <><rect key="rect" x="4" y="4" width="16" height="16" rx="3" /><path key="line1" d="M8 9h8M8 13h5" /></>],
  ];
  return (
    <aside className="relative hidden min-h-screen w-[40%] max-w-[620px] flex-col overflow-hidden bg-[linear-gradient(160deg,#0E7A6C_0%,#0B5F55_60%,#08463F_100%)] px-[54px] py-14 text-white min-[821px]:flex">
      <div className="pointer-events-none absolute -right-24 -top-24 h-[390px] w-[390px] rounded-full bg-[radial-gradient(circle,rgba(74,217,182,.26),transparent_67%)]" />
      <div className="pointer-events-none absolute -bottom-32 -left-24 h-[380px] w-[380px] rounded-full bg-[radial-gradient(circle,rgba(69,220,187,.18),transparent_70%)]" />
      {/* กดโลโก้ = กลับหน้าแรก */}
      <Link href="/" aria-label="Hoprak" className="relative flex items-center gap-3 transition hover:opacity-80"><Mark size={44} dark /><span className="font-sans text-[19px] font-bold tracking-[-.3px]">Hoprak Seller</span></Link>

      <div className="relative mt-auto pb-12">
        <p className="max-w-[400px] text-[40px] font-bold leading-[1.2] tracking-[-1.2px]">ปล่อยห้องว่างให้เต็ม<br />เริ่มได้ใน 1 นาที</p>
        <p className="mt-4 max-w-[380px] text-[16px] leading-7 text-white/75">เปิดหอพักของคุณกับ Hoprak แล้วจัดการการจองทุกอย่างได้ในที่เดียว</p>
        <div className="mt-10 space-y-4">
          {benefits.map(([label, paths]) => (
            <div key={label as string} className="flex items-center gap-3.5 text-[15px] font-medium text-white/92">
              <span className="flex h-11 w-11 items-center justify-center rounded-[13px] bg-white/[.13] text-[#D6FFF3]"><Icon className="h-5 w-5">{paths as React.ReactNode}</Icon></span>
              {label as string}
            </div>
          ))}
        </div>
      </div>

      <div className="relative flex items-center gap-3 text-sm text-white/80">
        <div className="flex -space-x-2"><span className="h-9 w-9 rounded-full border-2 border-[#0B5F55] bg-[#F0B28E]" /><span className="h-9 w-9 rounded-full border-2 border-[#0B5F55] bg-[#B7D9CC]" /><span className="h-9 w-9 rounded-full border-2 border-[#0B5F55] bg-[#C8B6E8]" /></div>
        <span>เจ้าของหอกว่า <b className="font-sans text-white">300+</b> รายเข้าร่วมแล้ว</span>
      </div>
    </aside>
  );
}

export default function PartnerRegisterPage() {
  const [step, setStep] = useState<Step>(1);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [dorm, setDorm] = useState('');
  const [addr, setAddr] = useState('');
  const [query, setQuery] = useState('');
  const [otp, setOtp] = useState(['', '', '', '']);
  const [showMap, setShowMap] = useState(false);
  const [pin, setPin] = useState<Pin | null>(null);
  const otpRefs = useRef<Array<HTMLInputElement | null>>([]);

  const next = () => setStep((current) => Math.min(4, current + 1) as Step);
  const back = () => setStep((current) => Math.max(1, current - 1) as Step);
  const restart = () => {
    setStep(1); setName(''); setEmail(''); setDorm(''); setAddr(''); setQuery(''); setOtp(['', '', '', '']); setPin(null); setShowMap(false);
  };
  const goGmail = () => { setName('Kali Test'); setEmail('kali.test@gmail.com'); setStep(2); };

  const dropPin = (event: React.MouseEvent<HTMLDivElement>) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    const x = Math.max(3, Math.min(97, ((event.clientX - bounds.left) / bounds.width) * 100));
    const y = Math.max(4, Math.min(96, ((event.clientY - bounds.top) / bounds.height) * 100));
    setPin({ x, y, lat: 16.18 + (50 - y) * 0.0014, lng: 103.3 + (x - 50) * 0.0017 });
  };
  const pick = (place: Place) => {
    setPin({ x: 50 + (place.lng - 103.3) / 0.0017, y: 50 - (place.lat - 16.18) / 0.0014, lat: place.lat, lng: place.lng });
    setAddr(`${place.name} · ${place.area}`); setQuery(place.name); setShowMap(true);
  };
  const setOtpDigit = (index: number, value: string) => {
    const digit = value.replace(/\D/g, '').slice(-1);
    setOtp((current) => current.map((item, itemIndex) => itemIndex === index ? digit : item));
    if (digit && index < 3) otpRefs.current[index + 1]?.focus();
  };
  const results = query.trim() ? PLACES.filter((place) => `${place.name} ${place.area}`.toLowerCase().includes(query.trim().toLowerCase())).slice(0, 4) : [];
  const coordinate = pin ? `${pin.lat.toFixed(5)}, ${pin.lng.toFixed(5)}` : null;

  return (
    <main className="min-h-screen bg-white text-[#152019] min-[821px]:flex">
      <BrandPanel />
      <section className="flex min-h-screen min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex h-[66px] items-center border-b border-[#EEF2F0] bg-white/95 px-5 backdrop-blur min-[821px]:hidden">
          <button onClick={back} aria-label="ย้อนกลับ" className={`mr-3 flex h-9 w-9 items-center justify-center rounded-full text-[#33413B] ${step === 2 ? '' : 'invisible'}`}><Icon className="h-5 w-5"><path d="m14 6-6 6 6 6" /></Icon></button>
          <Link href="/" aria-label="Hoprak" className="flex items-center gap-2 transition hover:opacity-80"><Mark size={31} /><span className="font-sans text-[15px] font-bold">Hoprak Seller</span></Link>
          <span className="ml-auto font-sans text-sm font-bold text-[#0E9F8E]">{step}/4</span>
        </header>

        <div className="min-[821px]:mx-auto min-[821px]:w-full min-[821px]:max-w-[560px] min-[821px]:pt-14">
          <div className="hidden items-center justify-between min-[821px]:flex">
            <span className="text-sm font-semibold text-[#5B655F]">ขั้นตอนที่ {step} จาก 4</span>
            <Link href="/partner-login" className="inline-flex items-center gap-2 rounded-full bg-[#0E9F8E] px-5 py-2.5 text-sm font-bold text-white shadow-[0_10px_22px_rgba(14,159,142,.28)] transition hover:bg-[#0B7A6C]">
              <Icon className="h-4 w-4"><path d="M14 8l4 4-4 4" /><path d="M18 12H7" /><path d="M10 5H5a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h5" /></Icon>เข้าสู่ระบบ
            </Link>
          </div>
          <DesktopStepper step={step} />
        </div>

        <div className="px-5 pt-4 min-[821px]:mx-auto min-[821px]:w-full min-[821px]:max-w-[560px] min-[821px]:px-0 min-[821px]:pt-11">
          <div className="min-[821px]:hidden">
            <div className="flex gap-1.5">{[1, 2, 3, 4].map((number) => <span key={number} className={`h-1.5 flex-1 rounded-full ${step >= number ? 'bg-[#0E9F8E]' : 'bg-[#E6EBE8]'}`} />)}</div>
            <p className="mt-2.5 text-[12.5px] font-semibold text-[#5B655F]">ขั้นที่ {step} · {MOBILE_STEP_LABELS[step - 1]}</p>
          </div>

          {step === 1 && (
            <div className="flex min-h-[calc(100vh-130px)] flex-col py-6 min-[821px]:min-h-0 min-[821px]:py-0">
              <div><p className="text-[26px] font-bold leading-tight tracking-[-.45px] min-[821px]:text-[32px]">สร้างบัญชีเจ้าของหอ</p><p className="mt-2 text-[15px] leading-6 text-[#5B655F]"></p></div>
              <button onClick={goGmail} className="mt-7 flex h-[54px] w-full items-center justify-center gap-3 rounded-[14px] border-2 border-[#0E9F8E] bg-white text-[15px] font-bold text-[#17695F] shadow-[0_10px_22px_rgba(14,159,142,.16)] transition hover:bg-[#F2FAF8]"><GoogleMark />สมัครด้วย Gmail</button>
              {/* <p className="mt-3 flex items-center justify-center gap-1.5 text-center text-[12px] text-[#7A857F]"><span className="text-[#0E9F8E]"><ShieldIcon /></span>เชื่อมต่อ Google อย่างปลอดภัย · เราไม่เห็นรหัสผ่าน</p> */}
              <div className="my-7 flex items-center gap-3 text-xs text-[#9AA5A0]"><span className="h-px flex-1 bg-[#E7ECEA]" />หรือใช้อีเมล<span className="h-px flex-1 bg-[#E7ECEA]" /></div>
              <div className="space-y-4">
                <Field label="ชื่อ-นามสกุล"><input value={name} onChange={(event) => setName(event.target.value)} placeholder="เช่น พิมพ์ชนก ใจดี" className="h-[52px] w-full rounded-[13px] border border-[#E7ECEA] bg-[#F6F8F7] px-4 text-[15px] outline-none transition placeholder:text-[#A6AFAA] focus:border-[#0E9F8E] focus:bg-white focus:ring-4 focus:ring-[#0E9F8E]/10" /></Field>
                <Field label="อีเมล" hint="เราจะส่งรหัส OTP ไปยืนยัน"><input value={email} type="email" onChange={(event) => setEmail(event.target.value)} placeholder="your@email.com" className="h-[52px] w-full rounded-[13px] border border-[#E7ECEA] bg-[#F6F8F7] px-4 font-sans text-[15px] outline-none transition placeholder:text-[#A6AFAA] focus:border-[#0E9F8E] focus:bg-white focus:ring-4 focus:ring-[#0E9F8E]/10" /></Field>
              </div>
              <div className="flex-1" />
              <button onClick={next} className="mt-8 flex h-[54px] w-full items-center justify-center gap-2 rounded-[14px] bg-[#0E9F8E] text-[15px] font-bold text-white shadow-[0_12px_26px_rgba(14,159,142,.3)] transition hover:bg-[#0B7A6C]">ส่งรหัสยืนยัน <ArrowIcon /></button>
              <p className="mt-5 text-center text-sm text-[#5B655F] min-[821px]:hidden">มีบัญชีแล้ว? <Link href="/partner-login" className="font-bold text-[#0E9F8E]">เข้าสู่ระบบ</Link></p>
            </div>
          )}

          {step === 2 && (
            <div className="py-6 min-[821px]:py-0">
              <h1 className="text-[25px] font-bold tracking-[-.45px] min-[821px]:text-[32px]">ยืนยันอีเมลและข้อมูลหอ</h1>
              <p className="mt-2 text-[15px] text-[#5B655F]">ส่งรหัส OTP ไปที่ <b className="font-sans text-[#33413B]">{email || 'your@email.com'}</b></p>
              <div className="mt-5 flex gap-2.5 min-[821px]:max-w-[280px]">{otp.map((value, index) => <input key={index} ref={(element) => { otpRefs.current[index] = element; }} value={value} onChange={(event) => setOtpDigit(index, event.target.value)} onKeyDown={(event) => { if (event.key === 'Backspace' && !value && index > 0) otpRefs.current[index - 1]?.focus(); }} inputMode="numeric" maxLength={1} aria-label={`OTP หลักที่ ${index + 1}`} className={`h-[52px] min-w-0 flex-1 rounded-[13px] border text-center font-sans text-[24px] font-bold outline-none transition ${value ? 'border-[#0E9F8E] bg-[#F2FAF8] text-[#0B7A6C]' : 'border-[#E1E8E5] bg-white focus:border-[#0E9F8E] focus:ring-4 focus:ring-[#0E9F8E]/10'}`} />)}</div>
              <button className="mt-3 text-[12.5px] font-semibold text-[#0E9F8E]">ส่งรหัสอีกครั้งใน 0:52</button>
              <div className="my-7 h-px bg-[#E7ECEA]" />
              <h2 className="text-[19px] font-bold">ข้อมูลหอพักของคุณ</h2><p className="mt-1 text-[14px] text-[#5B655F]">กรอกเท่าที่มีตอนนี้ รายละเอียดอื่นเพิ่มทีหลังได้</p>
              <button onClick={() => setShowMap((visible) => !visible)} className="mt-5 flex w-full items-center gap-3 rounded-[14px] border border-[#D5EDE7] bg-[#F2FAF8] px-4 py-3.5 text-left transition hover:bg-[#E8F7F3]"><span className="text-[#0E9F8E]"><PinIcon /></span><span className="min-w-0 flex-1"><span className="block text-[14px] font-bold text-[#226C62]">{coordinate ? `✓ ปักหมุดแล้ว · ${coordinate}` : 'ปักหมุดที่อยู่บนแผนที่'}</span><span className="mt-0.5 block text-xs text-[#61857E]">ช่วยให้ผู้เช่าหาหอของคุณเจอได้ง่ายขึ้น</span></span><span className="text-[13px] font-bold text-[#0E9F8E]">{showMap ? 'ซ่อน' : 'ปักหมุด →'}</span></button>
              {showMap && <div className="mt-3">
                <div className="relative"><span className="pointer-events-none absolute left-3.5 top-[15px] z-10 text-[#78928B]"><Icon className="h-5 w-5"><circle cx="11" cy="11" r="6.5" /><path d="m16 16 4 4" /></Icon></span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="ค้นหาสถานที่ / ชื่อหอ / ถนน" className="h-[50px] w-full rounded-[13px] border border-[#DDE8E3] bg-white pl-11 pr-4 text-[14px] outline-none focus:border-[#0E9F8E] focus:ring-4 focus:ring-[#0E9F8E]/10" />
                  {results.length > 0 && <div className="absolute z-20 mt-1.5 w-full overflow-hidden rounded-[13px] border border-[#DFEAE5] bg-white p-1.5 shadow-[0_12px_28px_rgba(16,40,30,.14)]">{results.map((place) => <button key={place.name} onClick={() => pick(place)} className="flex w-full items-start gap-2.5 rounded-[10px] px-3 py-2.5 text-left hover:bg-[#F2FAF8]"><span className="mt-0.5 text-[#0E9F8E]"><PinIcon className="h-4 w-4" /></span><span><span className="block text-[13px] font-semibold text-[#263B34]">{place.name}</span><span className="mt-0.5 block text-xs text-[#7A857F]">{place.area}</span></span></button>)}</div>}
                </div>
                <div onClick={dropPin} className="relative mt-3 h-[180px] cursor-crosshair overflow-hidden rounded-[16px] border border-[#D7E5DD] bg-[#E8F1EC]" style={{ backgroundImage: 'linear-gradient(#DDEAE2 1px,transparent 1px),linear-gradient(90deg,#DDEAE2 1px,transparent 1px),linear-gradient(35deg,transparent 46%,#C7DBCF 47%,#C7DBCF 51%,transparent 52%)', backgroundSize: '22px 22px,22px 22px,100% 100%' }}>
                  <span className="absolute left-[10%] top-[27%] h-14 w-28 rounded-lg border border-white/60 bg-white/35" /><span className="absolute bottom-[16%] right-[12%] h-12 w-24 rounded-lg border border-white/60 bg-white/30" />
                  <span className="absolute left-1/2 top-3 -translate-x-1/2 rounded-full bg-white/85 px-3 py-1 text-[11px] font-semibold text-[#5B746B] shadow-sm">แตะบนแผนที่เพื่อปักหมุด</span>
                  {pin && <span className="absolute -translate-x-1/2 -translate-y-full text-[#E34D4D] drop-shadow-[0_3px_2px_rgba(0,0,0,.2)]" style={{ left: `${pin.x}%`, top: `${pin.y}%` }}><svg viewBox="0 0 24 30" className="h-9 w-9" fill="currentColor"><path d="M12 0C5.9 0 1 4.9 1 11c0 8.2 11 19 11 19s11-10.8 11-19C23 4.9 18.1 0 12 0Z" /><circle cx="12" cy="11" r="4" fill="white" /></svg></span>}
                </div>
              </div>}
              <div className="mt-5"><Field label="ที่อยู่ / รายละเอียดเพิ่มเติม"><input value={addr} onChange={(event) => setAddr(event.target.value)} placeholder="บ้านเลขที่ ถนน ตำบล อำเภอ" className="h-[52px] w-full rounded-[13px] border border-[#E7ECEA] bg-[#F6F8F7] px-4 text-[14px] outline-none transition placeholder:text-[#A6AFAA] focus:border-[#0E9F8E] focus:bg-white focus:ring-4 focus:ring-[#0E9F8E]/10" /></Field></div>
              <div className="my-6 h-px bg-[#E7ECEA]" />
              <div className="space-y-4"><Field label="ชื่อหอพัก"><input value={dorm} onChange={(event) => setDorm(event.target.value)} placeholder="เช่น หอพักบ้านอุ่นใจ" className="h-[52px] w-full rounded-[13px] border border-[#E7ECEA] bg-[#F6F8F7] px-4 text-[15px] outline-none transition placeholder:text-[#A6AFAA] focus:border-[#0E9F8E] focus:bg-white focus:ring-4 focus:ring-[#0E9F8E]/10" /></Field><div className="grid gap-4 min-[821px]:grid-cols-2"><Field label="จังหวัด"><select className="h-[52px] w-full appearance-none rounded-[13px] border border-[#E7ECEA] bg-[#F6F8F7] px-4 text-[14px] outline-none focus:border-[#0E9F8E]"><option>มหาสารคาม</option></select></Field><Field label="จำนวนห้อง"><input inputMode="numeric" placeholder="เช่น 24" className="h-[52px] w-full rounded-[13px] border border-[#E7ECEA] bg-[#F6F8F7] px-4 text-[14px] outline-none placeholder:text-[#A6AFAA] focus:border-[#0E9F8E]" /></Field></div></div>
              <p className="mt-3 text-xs text-[#7A857F]">กรอกรายละเอียดเพิ่มทีหลังได้</p>
              <div className="mt-7 flex gap-3"><button onClick={back} className="hidden h-[54px] rounded-[14px] border border-[#DDE5E1] px-6 text-[15px] font-bold text-[#52615B] hover:bg-[#F6F8F7] min-[821px]:block">ย้อนกลับ</button><button onClick={next} className="flex h-[54px] flex-1 items-center justify-center gap-2 rounded-[14px] bg-[#0E9F8E] text-[15px] font-bold text-white shadow-[0_12px_26px_rgba(14,159,142,.3)] transition hover:bg-[#0B7A6C]">ยืนยันและสร้างหอ <ArrowIcon /></button></div>
            </div>
          )}

          {step === 3 && <div className="flex min-h-[calc(100vh-150px)] flex-col items-center justify-center py-12 text-center min-[821px]:min-h-[540px]"><span className="flex h-[84px] w-[84px] items-center justify-center rounded-full bg-[#E4F6F1] text-[#12B58C]"><Icon className="h-10 w-10"><path d="m5 12 4.5 4.5L19 7" /></Icon></span><h1 className="mt-7 text-[27px] font-bold tracking-[-.5px] min-[821px]:text-[32px]">ส่งใบสมัครเรียบร้อย!</h1><p className="mt-3 max-w-[390px] text-[15px] leading-7 text-[#5B655F]">เราได้รับใบสมัครหอ <b className="font-semibold text-[#263B34]">{dorm || 'ของคุณ'}</b> แล้ว ขั้นต่อไปทีมงานจะตรวจสอบข้อมูลและแจ้งผลทางอีเมล</p><button onClick={next} className="mt-9 flex h-[54px] w-full max-w-[360px] items-center justify-center gap-2 rounded-[14px] bg-[#0E9F8E] text-[15px] font-bold text-white shadow-[0_12px_26px_rgba(14,159,142,.3)] hover:bg-[#0B7A6C]">ดูสถานะคำขอ <ArrowIcon /></button></div>}

          {step === 4 && <div className="py-10 text-center min-[821px]:py-8"><span className="mx-auto flex h-[78px] w-[78px] items-center justify-center rounded-full bg-[#FFF4E0] text-[#E0902F]"><Icon className="h-9 w-9"><circle cx="12" cy="12" r="8" /><path d="M12 7v5l3.5 2" /></Icon></span><h1 className="mt-6 text-[27px] font-bold tracking-[-.5px] min-[821px]:text-[32px]">รอแอดมินอนุมัติ</h1><p className="mt-2 text-[15px] leading-6 text-[#5B655F]">ปกติใช้เวลา 1–2 วันทำการ<br />เราจะแจ้งผลทางอีเมล</p>
            <div className="mt-7 rounded-[16px] border border-[#DCEEE9] bg-[#F6FBFA] p-5 text-left"><div className="relative space-y-6"><span className="absolute bottom-6 left-[9px] top-5 w-[2px] bg-[#CDE5DF]" /><div className="relative flex gap-3"><span className="z-10 flex h-5 w-5 items-center justify-center rounded-full bg-[#12B58C] text-[11px] font-bold text-white">✓</span><div><p className="text-[14px] font-bold text-[#286057]">ส่งใบสมัครแล้ว</p><p className="mt-0.5 text-xs text-[#7A857F]">วันนี้ 10:24 น.</p></div></div><div className="relative flex gap-3"><span className="z-10 mt-1 h-5 w-5 rounded-full border-[5px] border-[#E0902F] bg-[#FFF4E0]" /><div><p className="text-[14px] font-bold text-[#5A4A31]">แอดมินกำลังตรวจสอบ <span className="ml-1 rounded-full bg-[#FFF4E0] px-2 py-0.5 text-[11px] font-semibold text-[#B4791A]">กำลังรอ</span></p><p className="mt-0.5 text-xs text-[#7A857F]">เราจะใช้เวลาไม่นาน</p></div></div><div className="relative flex gap-3 opacity-55"><span className="z-10 h-5 w-5 rounded-full border-2 border-[#96A49E] bg-[#F6FBFA]" /><div><p className="text-[14px] font-bold text-[#60716A]">อนุมัติ และเริ่มใช้งาน</p><p className="mt-0.5 text-xs text-[#7A857F]">เปิดหอให้ผู้เช่าจองได้</p></div></div></div></div>
            <div className="mt-4 flex gap-3 rounded-[14px] border border-[#F5DFC0] bg-[#FFF7ED] p-4 text-left"><span className="shrink-0 text-[#C77B14]"><Icon className="h-5 w-5"><rect x="5" y="10" width="14" height="10" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3" /></Icon></span><p className="text-[13px] leading-5 text-[#72532A]">เข้าดูแดชบอร์ดได้เลย แต่<b>ยังลงประกาศหอพักไม่ได้</b>จนกว่าจะอนุมัติ</p></div>
            <button onClick={restart} className="mt-6 flex h-[54px] w-full items-center justify-center gap-2 rounded-[14px] bg-[#0E9F8E] text-[15px] font-bold text-white shadow-[0_12px_26px_rgba(14,159,142,.3)] hover:bg-[#0B7A6C]">เข้าสู่แดชบอร์ด <ArrowIcon /></button><Link href="/" className="mt-3 flex h-[52px] w-full items-center justify-center gap-2 rounded-[14px] border border-[#DDE5E1] bg-white text-[14px] font-bold text-[#52615B] hover:bg-[#F6F8F7]"><Icon className="h-4 w-4"><path d="m3 11 9-7 9 7" /><path d="M5 10v9h14v-9M9 19v-5h6v5" /></Icon>กลับไปหน้าหอพัก</Link><p className="mt-4 hidden text-[12px] text-[#7A857F] min-[821px]:block">โพสต์หอพักจะปลดล็อกอัตโนมัติเมื่อได้รับอนุมัติ</p>
          </div>}
        </div>
      </section>
    </main>
  );
}
