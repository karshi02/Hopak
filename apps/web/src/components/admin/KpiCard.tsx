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
}

export function KpiCard({ icon, iconBg, label, value, delta, sparkline }: KpiCardProps) {
  return (
    <div className="rounded-card-lg border border-card-border bg-white p-5 shadow-card">
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
      <div className="mt-4 text-[13px] text-ink-muted">{label}</div>
      <div className="mt-0.5 font-sans text-[27px] font-bold tracking-tight text-ink-strong">{value}</div>
      {sparkline && sparkline.length > 1 && (
        <div className="mt-2.5">
          <Sparkline points={sparkline} />
        </div>
      )}
    </div>
  );
}
