import Link from 'next/link';
import { AdminIcon } from './AdminIcon';
import { Sparkline } from './RevenueChart';

type IconKey = 'dash' | 'book' | 'home' | 'user' | 'money' | 'ad' | 'shield' | 'gear' | 'bed' | 'star';

interface KpiCardProps {
  icon: IconKey;
  iconBg: string;
  label: string;
  value: string;
  delta?: { label: string; positive: boolean };
  sparkline?: number[];
  /** ใส่แล้วการ์ดทั้งใบกดได้ → พาไปหน้าหมวดนั้น */
  href?: string;
}

export function KpiCard({ icon, iconBg, label, value, delta, sparkline, href }: KpiCardProps) {
  const body = (
    <>
      <div className="flex items-center justify-between">
        <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${iconBg}`}>
          <AdminIcon name={icon} size={19} />
        </span>
        {delta && (
          <span
            className={`rounded-pill px-2.5 py-1 text-xs font-bold ${
              delta.positive ? 'bg-success-tint text-success' : 'bg-danger-tint text-danger'
            }`}
          >
            {delta.positive ? '▲' : '▼'} {delta.label}
          </span>
        )}
      </div>
      <div className="mt-4 flex items-center gap-1 text-[13px] text-ink-muted">
        <span className="min-w-0 flex-1">{label}</span>
        {href && (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="shrink-0 text-ink-faint">
            <path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </div>
      <div className="mt-0.5 font-sans text-[27px] font-bold tracking-tight text-ink-strong">{value}</div>
      {sparkline && sparkline.length > 1 && (
        <div className="mt-2.5">
          <Sparkline points={sparkline} />
        </div>
      )}
    </>
  );

  const base = 'rounded-card-lg border border-card-border bg-white p-5 shadow-card';

  if (href) {
    return (
      <Link
        href={href}
        className={`${base} block transition hover:-translate-y-0.5 hover:border-tenant hover:shadow-[0_10px_24px_rgba(16,24,40,0.10)]`}
      >
        {body}
      </Link>
    );
  }

  return <div className={base}>{body}</div>;
}
