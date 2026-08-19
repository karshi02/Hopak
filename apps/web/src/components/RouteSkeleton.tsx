'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';

/**
 * โครงหน้าจำลองระหว่างสลับหน้า (skeleton)
 *
 * ใช้คู่กับ loading.tsx ของ Next — Next จะวาดตัวนี้ทับไว้ตั้งแต่กดลิงก์
 * จนกว่าหน้าปลายทางจะพร้อมจริง แล้วถอดออกให้เอง ไม่ต้องจับเวลาเอง
 *
 * หน่วง 140ms ก่อนโผล่: หน้าที่โหลดเร็วกว่านั้นจะไม่เห็นอะไรกะพริบเลย
 * (โชว์ทันทีแล้วหายใน 50ms รู้สึกเหมือนจอกระตุก แย่กว่าไม่โชว์)
 */
const REVEAL_DELAY_MS = 140;

function Bar({ className = '' }: { className?: string }) {
  return <div className={`rounded-[10px] bg-[#E7EBF1] ${className}`} style={{ animation: 'hopak-shimmer 1.4s ease-in-out infinite' }} />;
}

function DormCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-2xl border border-[#EAEDF2] bg-white">
      <Bar className="h-[150px] rounded-none" />
      <div className="flex flex-col gap-2.5 p-3.5">
        <Bar className="h-[15px] w-3/4" />
        <Bar className="h-[12px] w-1/2" />
        <div className="mt-1.5 flex items-center justify-between">
          <Bar className="h-[18px] w-[92px]" />
          <Bar className="h-[18px] w-[64px] rounded-pill" />
        </div>
      </div>
    </div>
  );
}

/** ฝั่งผู้เช่า/หน้าสาธารณะ — แถบหัว + การ์ดค้นหา + กริดการ์ดหอ */
function TenantSkeleton() {
  return (
    <div className="min-h-screen bg-[#F2F4F8]">
      <div className="h-[58px] bg-[#0E1220] sm:h-[62px]" />
      <div className="mx-auto max-w-[1240px] px-4 pt-6 sm:px-6">
        <div className="rounded-[18px] border border-[#EAEDF2] bg-white p-4 sm:p-6">
          <Bar className="h-[52px]" />
          <div className="mt-3.5 grid grid-cols-1 gap-3.5 sm:grid-cols-2">
            <Bar className="h-[52px]" />
            <Bar className="h-[52px]" />
          </div>
          <Bar className="mt-4 h-[56px]" />
        </div>

        <div className="mt-10 flex items-end justify-between gap-4">
          <div className="flex-1">
            <Bar className="h-[24px] w-[220px]" />
            <Bar className="mt-2 h-[13px] w-[140px]" />
          </div>
          <Bar className="h-[42px] w-[190px] rounded-xl" />
        </div>

        <div className="mt-5 grid grid-cols-1 gap-[18px] sm:grid-cols-2 lg:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <DormCardSkeleton key={i} />
          ))}
        </div>
      </div>
    </div>
  );
}

/** คอนโซล (เจ้าของหอ/แอดมิน) — sidebar + การ์ดตัวเลข + ตาราง */
function ConsoleSkeleton() {
  return (
    <div className="flex min-h-screen bg-[#F2F4F8]">
      <div className="hidden w-[248px] shrink-0 bg-[#0E1220] sm:block" />
      <div className="min-w-0 flex-1 p-4 sm:p-6">
        <Bar className="h-[26px] w-[210px]" />
        <Bar className="mt-2 h-[13px] w-[150px]" />

        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="rounded-[18px] border border-[#EAEDF2] bg-white p-4 sm:p-5">
              <div className="flex items-center gap-2.5">
                <Bar className="h-10 w-10 rounded-[12px]" />
                <Bar className="h-[13px] w-[86px]" />
              </div>
              <Bar className="mt-3.5 h-[28px] w-[120px]" />
              <Bar className="mt-2 h-[12px] w-[70px]" />
            </div>
          ))}
        </div>

        <div className="mt-6 rounded-[18px] border border-[#EAEDF2] bg-white p-4 sm:p-5">
          <Bar className="h-[18px] w-[160px]" />
          <div className="mt-4 flex flex-col gap-3">
            {[0, 1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-center gap-3">
                <Bar className="h-[38px] w-[38px] rounded-[10px]" />
                <Bar className="h-[13px] flex-1" />
                <Bar className="hidden h-[13px] w-[120px] sm:block" />
                <Bar className="h-[24px] w-[74px] rounded-pill" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/** หน้าเข้าสู่ระบบ/สมัคร — การ์ดฟอร์มกลางจอ */
function AuthSkeleton() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F2F4F8] px-4">
      <div className="w-full max-w-[440px] rounded-[20px] border border-[#EAEDF2] bg-white p-6 sm:p-8">
        <Bar className="h-[34px] w-[34px] rounded-[10px]" />
        <Bar className="mt-5 h-[28px] w-[220px]" />
        <Bar className="mt-2.5 h-[13px] w-[260px]" />
        <Bar className="mt-6 h-[52px]" />
        <div className="mt-4 flex flex-col gap-3.5">
          <Bar className="h-[52px]" />
          <Bar className="h-[52px]" />
          <Bar className="h-[52px]" />
        </div>
        <Bar className="mt-5 h-[52px] rounded-xl" />
      </div>
    </div>
  );
}

/** ผลค้นหา — แถบตัวกรองด้านซ้าย + กริดการ์ด */
function SearchSkeleton() {
  return (
    <div className="min-h-screen bg-[#F2F4F8]">
      <div className="h-[58px] bg-[#0E1220] sm:h-[62px]" />
      <div className="mx-auto max-w-[1240px] px-4 pt-5 sm:px-6">
        <Bar className="h-[46px]" />
        <div className="mt-5 flex gap-6">
          <div className="hidden w-[248px] shrink-0 flex-col gap-4 lg:flex">
            {[0, 1, 2].map((i) => (
              <div key={i} className="rounded-[16px] border border-[#EAEDF2] bg-white p-4">
                <Bar className="h-[14px] w-[110px]" />
                <div className="mt-3 flex flex-col gap-2.5">
                  {[0, 1, 2, 3].map((j) => (
                    <Bar key={j} className="h-[12px] w-full" />
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between">
              <Bar className="h-[18px] w-[170px]" />
              <Bar className="h-[38px] w-[150px] rounded-xl" />
            </div>
            <div className="mt-4 grid grid-cols-1 gap-[18px] sm:grid-cols-2 lg:grid-cols-3">
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <DormCardSkeleton key={i} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/** รายละเอียดหอ — แกลเลอรี + เนื้อหา + กล่องจอง */
function DetailSkeleton() {
  return (
    <div className="min-h-screen bg-[#F2F4F8]">
      <div className="h-[58px] bg-[#0E1220] sm:h-[62px]" />
      <div className="mx-auto max-w-[1240px] px-4 pt-5 sm:px-6">
        <div className="grid grid-cols-4 gap-2 sm:h-[340px]">
          <Bar className="col-span-4 h-[220px] sm:col-span-2 sm:h-full" />
          <div className="col-span-4 grid grid-cols-2 gap-2 sm:col-span-2">
            {[0, 1, 2, 3].map((i) => (
              <Bar key={i} className="h-[80px] sm:h-full" />
            ))}
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-6 lg:flex-row">
          <div className="min-w-0 flex-1">
            <Bar className="h-[28px] w-[280px]" />
            <Bar className="mt-2.5 h-[14px] w-[190px]" />
            <div className="mt-5 flex flex-wrap gap-2">
              {[0, 1, 2, 3, 4].map((i) => (
                <Bar key={i} className="h-[30px] w-[96px] rounded-pill" />
              ))}
            </div>
            <div className="mt-6 flex flex-col gap-2.5">
              {[0, 1, 2, 3].map((i) => (
                <Bar key={i} className={`h-[13px] ${i === 3 ? 'w-2/3' : 'w-full'}`} />
              ))}
            </div>
            <Bar className="mt-7 h-[220px] rounded-[16px]" />
          </div>
          <div className="w-full shrink-0 lg:w-[340px]">
            <div className="rounded-[18px] border border-[#EAEDF2] bg-white p-5">
              <Bar className="h-[26px] w-[140px]" />
              <Bar className="mt-2 h-[12px] w-[90px]" />
              <div className="mt-5 flex flex-col gap-3">
                <Bar className="h-[48px]" />
                <Bar className="h-[48px]" />
              </div>
              <Bar className="mt-5 h-[52px] rounded-xl" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/** รายการ (การจอง/บันทึกไว้/แจ้งเตือน/โปรไฟล์) — หัวข้อ + แถวรายการ */
function ListSkeleton() {
  return (
    <div className="min-h-screen bg-[#F2F4F8]">
      <div className="h-[58px] bg-[#0E1220] sm:h-[62px]" />
      <div className="mx-auto max-w-[900px] px-4 pt-7 sm:px-6">
        <Bar className="h-[26px] w-[190px]" />
        <Bar className="mt-2 h-[13px] w-[130px]" />
        <div className="mt-6 flex flex-col gap-3.5">
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="flex items-center gap-3.5 rounded-[16px] border border-[#EAEDF2] bg-white p-4">
              <Bar className="h-[68px] w-[92px] shrink-0" />
              <div className="min-w-0 flex-1">
                <Bar className="h-[15px] w-2/3" />
                <Bar className="mt-2 h-[12px] w-1/3" />
                <Bar className="mt-3 h-[12px] w-1/2" />
              </div>
              <Bar className="hidden h-[30px] w-[92px] rounded-pill sm:block" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/** หน้าขายของสำหรับเจ้าของหอ — hero + บล็อกเนื้อหา */
function LandingSkeleton() {
  return (
    <div className="min-h-screen bg-white">
      <div className="h-[62px] bg-[#0E1220]" />
      <div className="bg-[#F2F4F8] px-4 py-14">
        <div className="mx-auto max-w-[820px] text-center">
          <Bar className="mx-auto h-[34px] w-[70%]" />
          <Bar className="mx-auto mt-3 h-[34px] w-[50%]" />
          <Bar className="mx-auto mt-5 h-[14px] w-[60%]" />
          <Bar className="mx-auto mt-7 h-[52px] w-[220px] rounded-pill" />
        </div>
      </div>
      <div className="mx-auto max-w-[1080px] px-4 py-12">
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="rounded-[18px] border border-[#EAEDF2] p-5">
              <Bar className="h-[42px] w-[42px] rounded-[12px]" />
              <Bar className="mt-4 h-[16px] w-[70%]" />
              <Bar className="mt-2.5 h-[12px] w-full" />
              <Bar className="mt-2 h-[12px] w-[80%]" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

type Variant = 'tenant' | 'search' | 'detail' | 'list' | 'console' | 'auth' | 'landing';

/**
 * เดาโครงจาก path ของหน้าที่กำลังจะไป — ระหว่างเปลี่ยนหน้า usePathname() คืน path ปลายทางแล้ว
 * ถ้าเดาไม่ตรงหน้าไหน ใช้โครงรายการซึ่งเป็นทรงกลางๆ ไม่ขัดตากับหน้าส่วนใหญ่
 */
function variantFor(pathname: string): Variant {
  if (pathname.startsWith('/partner') || pathname.startsWith('/admin')) return 'console';
  if (
    pathname.startsWith('/login') ||
    pathname.startsWith('/register') ||
    pathname.startsWith('/partner-login') ||
    pathname.startsWith('/partner-register') ||
    pathname.startsWith('/forgot-password') ||
    pathname.startsWith('/reset-password') ||
    pathname.startsWith('/portal-9f3k') ||
    pathname.startsWith('/auth/')
  ) {
    return 'auth';
  }
  if (pathname === '/' || pathname === '/daily') return 'tenant';
  if (pathname.startsWith('/search')) return 'search';
  if (pathname.startsWith('/dorms/')) return 'detail';
  if (pathname.startsWith('/owners')) return 'landing';
  return 'list';
}

/**
 * โครงจำลองแบบวางในหน้า (ไม่ทับทั้งจอ) — ใช้ตอนหน้าเรนเดอร์เสร็จแล้วแต่ข้อมูลยังไม่มา
 * เดิมจุดพวกนี้เรียก PageLoader ซึ่งซ่อนตัวเองถ้าไม่ใช่การเข้าเว็บครั้งแรก = ผู้ใช้เห็นพื้นที่ว่างเปล่า
 */
export function ContentSkeleton({ rows = 4, variant = 'list' }: { rows?: number; variant?: 'list' | 'cards' | 'form' }) {
  if (variant === 'cards') {
    return (
      <div className="grid grid-cols-1 gap-[18px] sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: rows * 2 }).map((_, i) => (
          <DormCardSkeleton key={i} />
        ))}
      </div>
    );
  }
  if (variant === 'form') {
    return (
      <div className="rounded-[18px] border border-[#EAEDF2] bg-white p-5">
        <Bar className="h-[22px] w-[180px]" />
        <div className="mt-5 flex flex-col gap-3.5">
          {Array.from({ length: rows }).map((_, i) => (
            <Bar key={i} className="h-[52px]" />
          ))}
        </div>
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-3.5">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-3.5 rounded-[16px] border border-[#EAEDF2] bg-white p-4">
          <Bar className="h-[62px] w-[86px] shrink-0" />
          <div className="min-w-0 flex-1">
            <Bar className="h-[15px] w-2/3" />
            <Bar className="mt-2 h-[12px] w-1/3" />
            <Bar className="mt-3 h-[12px] w-1/2" />
          </div>
          <Bar className="hidden h-[30px] w-[92px] rounded-pill sm:block" />
        </div>
      ))}
    </div>
  );
}

export function RouteSkeleton({ variant }: { variant?: Variant }) {
  const pathname = usePathname();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const id = setTimeout(() => setVisible(true), REVEAL_DELAY_MS);
    return () => clearTimeout(id);
  }, []);

  if (!visible) return null;

  // variant ที่ส่งมาจาก loading.tsx เป็นแค่ค่าเริ่มต้นของกลุ่ม — path ปลายทางแม่นกว่า ใช้ตัวนั้นก่อน
  const resolved = variantFor(pathname) ?? variant;
  const view = {
    tenant: <TenantSkeleton />,
    search: <SearchSkeleton />,
    detail: <DetailSkeleton />,
    list: <ListSkeleton />,
    console: <ConsoleSkeleton />,
    auth: <AuthSkeleton />,
    landing: <LandingSkeleton />,
  }[resolved];

  return (
    <div className="fixed inset-0 z-40 overflow-hidden" style={{ animation: 'hopak-fade-in .18s ease-out' }}>
      {view}
    </div>
  );
}
