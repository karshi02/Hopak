const MONTH_TH = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
const MONTH_EN = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

interface RevenueChartProps {
  months: number[]; // 12 ค่า, index 0 = มกราคม
  lang: 'th' | 'en';
}

// กราฟพื้นที่รายได้รายเดือน — วาดเองด้วย SVG (ไม่พึ่ง chart library ให้ตรงกับ pattern ของ SplitBar ที่มีอยู่แล้ว)
export function RevenueChart({ months, lang }: RevenueChartProps) {
  const labels = lang === 'th' ? MONTH_TH : MONTH_EN;
  const w = 760;
  const h = 200;
  const pt = 12;
  const pb = 24;
  const pl = 4;
  const pr = 4;
  const iw = w - pl - pr;
  const ih = h - pt - pb;
  const max = Math.max(1, ...months);

  const nx = (i: number) => pl + (i / (months.length - 1)) * iw;
  const ny = (v: number) => pt + ih - (v / max) * ih;

  const line = months.map((v, i) => `${i ? 'L' : 'M'}${nx(i).toFixed(1)} ${ny(v).toFixed(1)}`).join(' ');
  const area = `${line} L${nx(months.length - 1).toFixed(1)} ${pt + ih} L${nx(0).toFixed(1)} ${pt + ih} Z`;

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full" preserveAspectRatio="none" style={{ height: h }}>
      <defs>
        <linearGradient id="revenueArea" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#2F6FE0" stopOpacity="0.22" />
          <stop offset="1" stopColor="#2F6FE0" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill="url(#revenueArea)" />
      <path d={line} stroke="#2F6FE0" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      {months.map((_, i) => (
        <text key={i} x={nx(i)} y={h - 4} fontSize="10" fill="#B6BCC7" textAnchor="middle">
          {labels[i]}
        </text>
      ))}
    </svg>
  );
}

export function Sparkline({ points, color = '#2F6FE0' }: { points: number[]; color?: string }) {
  if (points.length < 2) return null;
  const w = 140;
  const h = 32;
  const max = Math.max(...points);
  const min = Math.min(...points);
  const nx = (i: number) => (i / (points.length - 1)) * w;
  const ny = (v: number) => h - 2 - ((v - min) / (max - min || 1)) * (h - 6);
  const line = points.map((v, i) => `${i ? 'L' : 'M'}${nx(i).toFixed(1)} ${ny(v).toFixed(1)}`).join(' ');
  const area = `${line} L${w} ${h} L0 ${h} Z`;
  const id = `sp-${color.replace('#', '')}`;

  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} fill="none" preserveAspectRatio="none" style={{ width: '100%' }}>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={color} stopOpacity="0.22" />
          <stop offset="1" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${id})`} />
      <path d={line} stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// วงแหวนสัดส่วน 2 ค่า (เช่น เข้าพักแล้ว vs ว่าง) — เปอร์เซ็นต์กลางวงคำนวณจาก value/total จริง ไม่ fix
export function Donut({ value, total, label, color = '#12A150' }: { value: number; total: number; label: string; color?: string }) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  const cx = 62;
  const cy = 62;
  const r = 46;
  const sw = 17;
  const C = 2 * Math.PI * r;
  const len = (C * pct) / 100;

  return (
    <svg width={124} height={124} viewBox="0 0 124 124">
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#E4E7EC" strokeWidth={sw} />
      <circle
        cx={cx}
        cy={cy}
        r={r}
        fill="none"
        stroke={color}
        strokeWidth={sw}
        strokeDasharray={`${len.toFixed(1)} ${(C - len).toFixed(1)}`}
        strokeLinecap="round"
        transform={`rotate(-90 ${cx} ${cy})`}
      />
      <text x={cx} y={cy - 2} textAnchor="middle" fontSize="24" fontWeight="700" fill="#161A22">
        {pct}%
      </text>
      <text x={cx} y={cy + 16} textAnchor="middle" fontSize="11" fill="#8A909F">
        {label}
      </text>
    </svg>
  );
}
