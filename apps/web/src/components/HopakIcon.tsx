'use client';

import { useId } from 'react';

// โลโก้ Hopak — ตัว H บนพื้น gradient (วาดด้วยสี่เหลี่ยม ไม่ใช้ <text> เพื่อให้เรนเดอร์เหมือนกันทุกที่)
// tone: tenant = น้ำเงิน (ฝั่งผู้เช่า), seller = เขียว (ฝั่งเจ้าของหอ)
// gradient id ต้องไม่ซ้ำเมื่อมีหลายอันในหน้าเดียว → ใช้ useId()
const TONES = {
  tenant: ['#2F6FE0', '#1E4FB0'],
  seller: ['#12A150', '#0C7A3C'],
} as const;

export function HopakIcon({
  size = 32,
  className = '',
  tone = 'tenant',
}: {
  size?: number;
  className?: string;
  tone?: keyof typeof TONES;
}) {
  const gid = useId();
  const [from, to] = TONES[tone];
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      className={`shrink-0 ${className}`}
      role="img"
      aria-label="Hopak"
    >
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={from} />
          <stop offset="1" stopColor={to} />
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx="8" fill={`url(#${gid})`} />
      <g fill="#ffffff">
        <rect x="9" y="8" width="4.6" height="16" rx="1.2" />
        <rect x="18.4" y="8" width="4.6" height="16" rx="1.2" />
        <rect x="9" y="13.7" width="14" height="4.6" rx="1.2" />
      </g>
    </svg>
  );
}
