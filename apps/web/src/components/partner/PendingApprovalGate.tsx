'use client';

import Link from 'next/link';
import type { Dorm } from '@hopak/shared';

/**
 * หน้าจอแทนเนื้อหาของหน้าที่ยังใช้ไม่ได้ ระหว่างรอแอดมินอนุมัติหอ
 * (เจ้าของหอเข้าคอนโซลได้ แต่ยังจัดการห้อง/การจอง/การเงินไม่ได้)
 */
export function PendingApprovalGate({
  lang,
  rejected,
  suspended,
}: {
  lang: 'th' | 'en';
  rejected: Dorm[];
  suspended: Dorm[];
}) {
  const isRejected = rejected.length > 0;
  const isSuspended = suspended.length > 0;

  const t =
    lang === 'th'
      ? {
          pendingTitle: 'รอแอดมินอนุมัติหอพัก',
          pendingBody: 'ใบสมัครของคุณอยู่ระหว่างตรวจสอบ ปกติใช้เวลา 1–2 วันทำการ เมนูนี้จะปลดล็อกอัตโนมัติเมื่อได้รับอนุมัติ',
          rejectedTitle: 'หอพักไม่ผ่านการตรวจสอบ',
          rejectedBody: 'แก้ไขข้อมูลตามเหตุผลด้านล่างแล้วส่งอนุมัติใหม่ได้จากหน้าแดชบอร์ด',
          suspendedTitle: 'หอพักถูกระงับ',
          suspendedBody: 'ติดต่อแอดมินเพื่อขอเปิดใช้งานหอพักอีกครั้ง',
          reason: 'เหตุผล',
          toDashboard: 'ไปหน้าแดชบอร์ด',
          steps: ['ส่งใบสมัครแล้ว', 'แอดมินกำลังตรวจสอบ', 'อนุมัติ และเริ่มใช้งาน'],
        }
      : {
          pendingTitle: 'Waiting for admin approval',
          pendingBody: 'Your application is under review (usually 1–2 business days). This menu unlocks automatically once approved.',
          rejectedTitle: 'Dorm was not approved',
          rejectedBody: 'Fix the issues below and resubmit from the dashboard.',
          suspendedTitle: 'Dorm suspended',
          suspendedBody: 'Please contact an admin to reactivate this dorm.',
          reason: 'Reason',
          toDashboard: 'Go to dashboard',
          steps: ['Application sent', 'Admin reviewing', 'Approved — start using'],
        };

  const tone = isRejected || isSuspended
    ? { bg: '#FDECEC', fg: '#C0392B', ring: '#F3C9C4' }
    : { bg: '#FFF4E0', fg: '#B4791A', ring: '#F5DFC0' };

  const title = isRejected ? t.rejectedTitle : isSuspended ? t.suspendedTitle : t.pendingTitle;
  const body = isRejected ? t.rejectedBody : isSuspended ? t.suspendedBody : t.pendingBody;

  return (
    <div className="mx-auto max-w-[540px] py-8 text-center">
      <span
        className="mx-auto flex h-[74px] w-[74px] items-center justify-center rounded-pill"
        style={{ background: tone.bg, color: tone.fg }}
      >
        <svg width="34" height="34" viewBox="0 0 24 24" fill="none">
          <rect x="5" y="10" width="14" height="10" rx="2" stroke="currentColor" strokeWidth="1.8" />
          <path d="M8 10V7a4 4 0 018 0v3" stroke="currentColor" strokeWidth="1.8" />
        </svg>
      </span>

      <h2 className="mt-5 text-[22px] font-bold text-ink-strong">{title}</h2>
      <p className="mx-auto mt-2 max-w-[420px] text-[14.5px] leading-relaxed text-ink-muted">{body}</p>

      {isRejected && rejected[0]?.rejectionReason && (
        <p className="mt-4 whitespace-pre-line rounded-[12px] border border-danger/30 bg-danger/5 px-4 py-3 text-left text-[13.5px] text-ink-body">
          <b className="font-semibold">{t.reason}:</b> {rejected[0].rejectionReason}
        </p>
      )}

      {!isRejected && !isSuspended && (
        <div className="mt-6 rounded-[16px] border border-card-border bg-white p-5 text-left shadow-card">
          <div className="relative space-y-5">
            <span className="absolute bottom-5 left-[9px] top-4 w-[2px] bg-card-border" />
            {t.steps.map((label, i) => (
              <div key={label} className={`relative flex gap-3 ${i === 2 ? 'opacity-55' : ''}`}>
                <span
                  className="z-10 flex h-5 w-5 shrink-0 items-center justify-center rounded-pill text-[11px] font-bold text-white"
                  style={{
                    background: i === 0 ? '#12B58C' : i === 1 ? '#fff' : '#fff',
                    border: i === 1 ? '5px solid #E0902F' : i === 2 ? '2px solid #96A49E' : 'none',
                  }}
                >
                  {i === 0 ? '✓' : ''}
                </span>
                <span className="text-[14px] font-semibold text-ink-body">{label}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <Link
        href="/partner/dashboard"
        className="mt-6 inline-flex h-[46px] items-center justify-center rounded-[12px] bg-seller px-5 text-[14.5px] font-bold text-white"
      >
        {t.toDashboard}
      </Link>
    </div>
  );
}
