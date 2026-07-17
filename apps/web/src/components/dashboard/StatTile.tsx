interface StatTileProps {
  label: string;
  value: string;
  hint?: string;
  trend?: { direction: 'up' | 'down'; label: string };
  accent?: 'tenant' | 'seller' | 'admin';
}

const ACCENT_BG: Record<string, string> = {
  tenant: 'bg-tenant text-white',
  seller: 'bg-seller text-white',
  admin: 'bg-admin text-white',
};

export function StatTile({ label, value, hint, trend, accent }: StatTileProps) {
  const filled = accent ? ACCENT_BG[accent] : 'bg-white dark:bg-[#1a1a19] text-ink-strong dark:text-white';

  return (
    <div className={`rounded-card border border-card-border p-4 dark:border-white/10 ${filled}`}>
      <p className={`text-sm ${accent ? 'text-white/85' : 'text-ink-faint'}`}>{label}</p>
      <p className={`mt-1.5 font-sans text-2xl font-bold tabular-nums ${accent ? 'text-white' : ''}`}>{value}</p>
      {trend && (
        <p
          className={`mt-1 text-xs font-semibold ${
            accent ? 'text-white/90' : trend.direction === 'up' ? 'text-success' : 'text-danger'
          }`}
        >
          {trend.direction === 'up' ? '▲' : '▼'} {trend.label}
        </p>
      )}
      {hint && <p className={`mt-1 text-xs ${accent ? 'text-white/80' : 'text-ink-faint'}`}>{hint}</p>}
    </div>
  );
}
