'use client';

import { useId, useState } from 'react';

export type ChartKind = 'bar' | 'line' | 'area' | 'stacked';

interface MonthPoint {
  month: number;
  gross: number;
  commission: number;
  ownerPayout: number;
  bookings: number;
}

// สีตามความหมายเดิมของระบบ: ม่วง = ยอดรับ/แพลตฟอร์ม, เขียว = ยอดเจ้าของหอ, แดง = ค่าคอม
// คู่ ม่วง/เขียว ผ่าน validator (ΔE 27.1 deutan, 33.5 normal) แยกออกจากกันแม้ตาบอดสี
const PURPLE = '#6D5AE0';
const GREEN = '#12A150';
const RED = '#C0392B';
const GRID = '#EEF1F4';
const AXIS_TEXT = '#8A909B';

const KINDS: { value: ChartKind; th: string; en: string }[] = [
  { value: 'bar', th: 'แท่ง', en: 'Bar' },
  { value: 'line', th: 'เส้น', en: 'Line' },
  { value: 'area', th: 'พื้นที่', en: 'Area' },
  { value: 'stacked', th: 'แยกส่วน', en: 'Stacked' },
];

const baht = (n: number) => `฿${Math.round(n).toLocaleString()}`;

export function YearlyRevenueChart({
  months,
  monthLabels,
  lang,
  labels,
  defaultMonth,
}: {
  months: MonthPoint[];
  monthLabels: string[];
  lang: 'th' | 'en';
  labels: { gross: string; payout: string; commission: string };
  /** เดือนที่โชว์ตัวเลขตอนยังไม่ชี้กราฟ (1-12) — ค่าเริ่มต้น = เดือนปัจจุบัน */
  defaultMonth?: number;
}) {
  const [kind, setKind] = useState<ChartKind>('bar');
  const [hover, setHover] = useState<number | null>(null);
  const gid = useId();

  // พื้นที่วาด — viewBox คงที่ ปรับตัวตามความกว้างจริงด้วย CSS
  const W = 720;
  const H = 240;
  const PAD_L = 8;
  const PAD_R = 8;
  const PAD_T = 14;
  const PAD_B = 26;
  const plotW = W - PAD_L - PAD_R;
  const plotH = H - PAD_T - PAD_B;

  // แกนเดียวเสมอ — ทุกชุดข้อมูลเป็นเงินบาทหน่วยเดียวกัน
  const maxValue = Math.max(1, ...months.map((m) => m.gross));
  const y = (v: number) => PAD_T + plotH - (v / maxValue) * plotH;
  const slot = plotW / months.length;
  const cx = (i: number) => PAD_L + slot * i + slot / 2;

  const showTwoSeries = kind === 'line' || kind === 'stacked';

  const linePath = (pick: (m: MonthPoint) => number) =>
    months.map((m, i) => `${i === 0 ? 'M' : 'L'} ${cx(i).toFixed(1)} ${y(pick(m)).toFixed(1)}`).join(' ');

  const areaPath = (pick: (m: MonthPoint) => number) =>
    `${linePath(pick)} L ${cx(months.length - 1).toFixed(1)} ${PAD_T + plotH} L ${cx(0).toFixed(1)} ${PAD_T + plotH} Z`;

  const active = hover != null ? months[hover] : null;

  // ตัวเลขของเดือน — ชี้กราฟอยู่ใช้เดือนนั้น ไม่ได้ชี้ใช้เดือนที่กำหนด (ปกติ = เดือนปัจจุบัน)
  const fallbackIndex = Math.max(
    0,
    months.findIndex((m) => m.month === (defaultMonth ?? new Date().getMonth() + 1)),
  );
  const shown = active ?? months[fallbackIndex] ?? months[months.length - 1];

  return (
    <div>
      {/* ตัวเลือกรูปแบบกราฟ — วางแถวเดียวเหนือกราฟ */}
      <div className="flex flex-wrap items-center gap-1 rounded-pill border border-card-border bg-surface-canvas p-1">
        {KINDS.map((k) => {
          const on = kind === k.value;
          return (
            <button
              key={k.value}
              type="button"
              onClick={() => setKind(k.value)}
              aria-pressed={on}
              className={`rounded-pill px-3 py-1.5 text-[12.5px] font-semibold transition ${
                on ? 'bg-admin text-white shadow-[0_3px_10px_rgba(109,90,224,0.3)]' : 'text-ink-muted hover:bg-white'
              }`}
            >
              {lang === 'th' ? k.th : k.en}
            </button>
          );
        })}
      </div>

      {/* ตัวเลขของเดือนที่กำลังดู — เลื่อนเมาส์บนกราฟแล้วเปลี่ยนตามเดือนนั้น */}
      {shown && (
        <div className="mt-3 flex flex-wrap items-end gap-x-6 gap-y-2 rounded-[13px] border border-card-border bg-surface-canvas px-4 py-3">
          <div>
            <div className="text-[11.5px] font-semibold uppercase tracking-wide text-ink-faint">
              {monthLabels[shown.month - 1]}
              {active ? '' : lang === 'th' ? ' (เดือนนี้)' : ' (this month)'}
            </div>
            <div className="mt-0.5 font-sans text-[24px] font-bold leading-none tabular-nums" style={{ color: PURPLE }}>
              {baht(shown.gross)}
            </div>
            <div className="mt-1 text-[11.5px] text-ink-muted">{labels.gross}</div>
          </div>

          <div className="flex flex-wrap gap-x-6 gap-y-2">
            <div>
              <div className="font-sans text-[16px] font-bold tabular-nums" style={{ color: RED }}>
                {baht(shown.commission)}
              </div>
              <div className="text-[11.5px] text-ink-muted">{labels.commission}</div>
            </div>
            <div>
              <div className="font-sans text-[16px] font-bold tabular-nums" style={{ color: GREEN }}>
                {baht(shown.ownerPayout)}
              </div>
              <div className="text-[11.5px] text-ink-muted">{labels.payout}</div>
            </div>
            {shown.bookings > 0 && (
              <div>
                <div className="font-sans text-[16px] font-bold tabular-nums text-ink-strong">{shown.bookings}</div>
                <div className="text-[11.5px] text-ink-muted">{lang === 'th' ? 'การจอง' : 'bookings'}</div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* legend — มีเมื่อมี 2 ชุดขึ้นไป (ชุดเดียวไม่ต้องมี หัวข้อการ์ดบอกอยู่แล้ว) */}
      {showTwoSeries && (
        <div className="mt-3 flex flex-wrap items-center gap-4 text-[12px] text-ink-body">
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm" style={{ background: kind === 'stacked' ? RED : PURPLE }} />
            {kind === 'stacked' ? labels.commission : labels.gross}
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm" style={{ background: GREEN }} />
            {labels.payout}
          </span>
        </div>
      )}

      <div className="relative mt-3">
        <svg viewBox={`0 0 ${W} ${H}`} className="h-[240px] w-full" role="img">
          <defs>
            <linearGradient id={`${gid}-area`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor={PURPLE} stopOpacity="0.28" />
              <stop offset="1" stopColor={PURPLE} stopOpacity="0.02" />
            </linearGradient>
          </defs>

          {/* เส้นกริดแนวนอน 4 เส้น — จางกว่าเส้นข้อมูลเสมอ */}
          {[0, 0.25, 0.5, 0.75, 1].map((f) => (
            <line
              key={f}
              x1={PAD_L}
              x2={W - PAD_R}
              y1={PAD_T + plotH * f}
              y2={PAD_T + plotH * f}
              stroke={GRID}
              strokeWidth="1"
            />
          ))}

          {kind === 'bar' &&
            months.map((m, i) => {
              const barW = Math.min(26, slot * 0.5);
              const h = Math.max(m.gross > 0 ? 3 : 0, PAD_T + plotH - y(m.gross));
              return (
                <rect
                  key={m.month}
                  x={cx(i) - barW / 2}
                  y={PAD_T + plotH - h}
                  width={barW}
                  height={h}
                  rx="4"
                  fill={PURPLE}
                  opacity={hover == null || hover === i ? 1 : 0.42}
                />
              );
            })}

          {kind === 'stacked' &&
            months.map((m, i) => {
              const barW = Math.min(26, slot * 0.5);
              const payoutH = Math.max(m.ownerPayout > 0 ? 3 : 0, PAD_T + plotH - y(m.ownerPayout));
              const commH = Math.max(0, PAD_T + plotH - y(m.gross) - payoutH - 2); // เว้น 2px ระหว่างส่วน
              const dim = hover == null || hover === i ? 1 : 0.42;
              return (
                <g key={m.month} opacity={dim}>
                  <rect x={cx(i) - barW / 2} y={PAD_T + plotH - payoutH} width={barW} height={payoutH} rx="4" fill={GREEN} />
                  {commH > 0 && (
                    <rect
                      x={cx(i) - barW / 2}
                      y={PAD_T + plotH - payoutH - 2 - commH}
                      width={barW}
                      height={commH}
                      rx="4"
                      fill={RED}
                    />
                  )}
                </g>
              );
            })}

          {kind === 'area' && (
            <>
              <path d={areaPath((m) => m.gross)} fill={`url(#${gid}-area)`} />
              <path d={linePath((m) => m.gross)} fill="none" stroke={PURPLE} strokeWidth="2" strokeLinejoin="round" />
            </>
          )}

          {kind === 'line' && (
            <>
              <path d={linePath((m) => m.gross)} fill="none" stroke={PURPLE} strokeWidth="2" strokeLinejoin="round" />
              <path d={linePath((m) => m.ownerPayout)} fill="none" stroke={GREEN} strokeWidth="2" strokeLinejoin="round" />
            </>
          )}

          {/* จุดบนเส้น — โผล่เฉพาะเดือนที่ชี้อยู่ (ไม่ยัดตัวเลขทุกจุด) */}
          {(kind === 'line' || kind === 'area') && hover != null && (
            <>
              <line x1={cx(hover)} x2={cx(hover)} y1={PAD_T} y2={PAD_T + plotH} stroke={GRID} strokeWidth="1.5" />
              <circle cx={cx(hover)} cy={y(months[hover].gross)} r="5" fill={PURPLE} stroke="#fff" strokeWidth="2" />
              {kind === 'line' && (
                <circle cx={cx(hover)} cy={y(months[hover].ownerPayout)} r="5" fill={GREEN} stroke="#fff" strokeWidth="2" />
              )}
            </>
          )}

          {/* ชื่อเดือน */}
          {months.map((m, i) => (
            <text key={m.month} x={cx(i)} y={H - 8} textAnchor="middle" fontSize="10" fill={AXIS_TEXT}>
              {monthLabels[m.month - 1]}
            </text>
          ))}

          {/* พื้นที่รับ hover — กว้างกว่าตัวมาร์คเพื่อให้ชี้ง่าย */}
          {months.map((m, i) => (
            <rect
              key={`hit-${m.month}`}
              x={PAD_L + slot * i}
              y={PAD_T}
              width={slot}
              height={plotH}
              fill="transparent"
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover(null)}
            />
          ))}
        </svg>

        {/* tooltip */}
        {active && (
          <div
            className="pointer-events-none absolute top-2 z-10 min-w-[170px] rounded-[11px] border border-card-border bg-white p-2.5 shadow-[0_10px_24px_rgba(16,24,40,0.14)]"
            style={{
              left: `${((cx(hover!) - PAD_L) / plotW) * 100}%`,
              transform: `translateX(${hover! > months.length / 2 ? '-105%' : '5%'})`,
            }}
          >
            <div className="text-[12.5px] font-bold text-ink-strong">{monthLabels[active.month - 1]}</div>
            <dl className="mt-1.5 space-y-1 text-[11.5px]">
              <div className="flex items-center justify-between gap-3">
                <dt className="flex items-center gap-1.5 text-ink-muted">
                  <span className="h-2 w-2 rounded-sm" style={{ background: PURPLE }} />
                  {labels.gross}
                </dt>
                <dd className="font-sans font-semibold tabular-nums text-ink-strong">{baht(active.gross)}</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="flex items-center gap-1.5 text-ink-muted">
                  <span className="h-2 w-2 rounded-sm" style={{ background: RED }} />
                  {labels.commission}
                </dt>
                <dd className="font-sans tabular-nums text-ink-body">{baht(active.commission)}</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="flex items-center gap-1.5 text-ink-muted">
                  <span className="h-2 w-2 rounded-sm" style={{ background: GREEN }} />
                  {labels.payout}
                </dt>
                <dd className="font-sans tabular-nums text-ink-body">{baht(active.ownerPayout)}</dd>
              </div>
            </dl>
          </div>
        )}
      </div>
    </div>
  );
}
