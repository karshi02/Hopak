'use client';

import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api-client';
import { useLang } from '@/hooks/useLang';
import { Badge } from '@/components/dashboard/Badge';
import { downloadCsv } from '@/lib/csv';

interface SessionRow {
  id: string;
  userName: string;
  userEmail?: string | null;
  userPhone?: string | null;
  role: string;
  ip?: string | null;
  userAgent?: string | null;
  loginAt: string;
  lastSeenAt: string;
  active: boolean;
  revokedAt?: string | null;
}

const TEXT = {
  th: {
    exportCsv: 'Export CSV',
    csvHeader: 'ผู้ใช้,อีเมล,บทบาท,IP,บราวเซอร์/อุปกรณ์,เข้าเมื่อ,ใช้ล่าสุด,สถานะ',
    user: 'ผู้ใช้',
    role: 'บทบาท',
    ip: 'IP',
    browser: 'บราวเซอร์ / อุปกรณ์',
    loginAt: 'เข้าเมื่อ',
    lastSeen: 'ใช้ล่าสุด',
    status: 'สถานะ',
    active: 'ใช้งานอยู่',
    ended: 'สิ้นสุดแล้ว',
    none: 'ยังไม่มีประวัติการเข้าสู่ระบบ',
    onlyActive: 'เฉพาะที่ใช้งานอยู่',
    all: 'ทั้งหมด',
    allMonths: 'ทุกเดือน (ล่าสุด)',
    monthLabel: 'เดือน',
    dateLocale: 'th-TH',
    unknown: 'ไม่ทราบ',
  },
  en: {
    exportCsv: 'Export CSV',
    csvHeader: 'User,Email,Role,IP,Browser/Device,Logged in,Last active,Status',
    user: 'User',
    role: 'Role',
    ip: 'IP',
    browser: 'Browser / Device',
    loginAt: 'Logged in',
    lastSeen: 'Last active',
    status: 'Status',
    active: 'Active',
    ended: 'Ended',
    none: 'No login history yet',
    onlyActive: 'Active only',
    all: 'All',
    allMonths: 'All months (latest)',
    monthLabel: 'Month',
    dateLocale: 'en-US',
    unknown: 'Unknown',
  },
};

// แปลง user-agent เป็นชื่อบราวเซอร์ + ระบบปฏิบัติการแบบอ่านง่าย (ไม่ใช้ไลบรารีเสริม)
function parseUserAgent(ua?: string | null): string {
  if (!ua) return '—';
  let browser = '';
  if (/Edg\//.test(ua)) browser = 'Edge';
  else if (/OPR\/|Opera/.test(ua)) browser = 'Opera';
  else if (/Chrome\//.test(ua) && !/Chromium/.test(ua)) browser = 'Chrome';
  else if (/Firefox\//.test(ua)) browser = 'Firefox';
  else if (/Safari\//.test(ua) && /Version\//.test(ua)) browser = 'Safari';

  let os = '';
  if (/Windows NT 10/.test(ua)) os = 'Windows';
  else if (/Windows/.test(ua)) os = 'Windows';
  else if (/iPhone|iPad|iPod/.test(ua)) os = 'iOS';
  else if (/Android/.test(ua)) os = 'Android';
  else if (/Mac OS X/.test(ua)) os = 'macOS';
  else if (/Linux/.test(ua)) os = 'Linux';

  const parts = [browser, os].filter(Boolean);
  return parts.length ? parts.join(' · ') : ua.slice(0, 40);
}

function roleBadge(role: string): { label: string; variant: 'good' | 'warning' | 'critical' | 'neutral' } {
  const r = role.toUpperCase();
  if (r === 'ADMIN') return { label: 'Admin', variant: 'critical' };
  if (r === 'OWNER') return { label: 'Owner', variant: 'warning' };
  return { label: 'Tenant', variant: 'neutral' };
}

interface Period {
  year: number;
  month: number;
}

export default function AdminSessionsPage() {
  const { lang } = useLang();
  const t = TEXT[lang];
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [onlyActive, setOnlyActive] = useState(false);
  const [periods, setPeriods] = useState<Period[]>([]);
  const [period, setPeriod] = useState(''); // '' = ทุกเดือน · 'YYYY-M' = เดือนที่เลือก

  // โหลดรายชื่อเดือนที่มีประวัติ (ทำ dropdown ดูย้อนหลัง)
  useEffect(() => {
    apiClient
      .get<Period[]>('/admin/users/sessions/periods')
      .then(setPeriods)
      .catch(() => setPeriods([]));
  }, []);

  // โหลดประวัติตามเดือนที่เลือก (ว่าง = 200 รายการล่าสุดทั้งหมด)
  useEffect(() => {
    const q = period ? `?year=${period.split('-')[0]}&month=${period.split('-')[1]}` : '';
    apiClient
      .get<SessionRow[]>(`/admin/users/sessions${q}`)
      .then(setSessions)
      .catch(() => setSessions([]));
  }, [period]);

  const monthLabel = (p: Period) =>
    new Date(p.year, p.month - 1, 1).toLocaleDateString(t.dateLocale, { month: 'long', year: 'numeric' });

  const fmt = (v: string) =>
    new Date(v).toLocaleString(t.dateLocale, {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });

  const rows = onlyActive ? sessions.filter((s) => s.active) : sessions;

  function handleExport() {
    downloadCsv(
      period ? `sessions-${period}` : 'sessions',
      t.csvHeader.split(','),
      rows.map((r) => [
        r.userName,
        r.userEmail ?? r.userPhone ?? '',
        r.role,
        r.ip ?? '',
        r.userAgent ?? t.unknown,
        fmt(r.loginAt),
        fmt(r.lastSeenAt),
        r.active ? t.active : t.ended,
      ]),
    );
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-end gap-2">
        <label className="flex items-center gap-2 text-sm text-ink-subtitle">
          {t.monthLabel}
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="rounded-btn border border-card-border bg-white px-3 py-2 text-sm text-ink-strong"
          >
            <option value="">{t.allMonths}</option>
            {periods.map((p) => (
              <option key={`${p.year}-${p.month}`} value={`${p.year}-${p.month}`}>
                {monthLabel(p)}
              </option>
            ))}
          </select>
        </label>
        <button
          onClick={handleExport}
          className="rounded-btn border border-card-border bg-white px-4 py-2 text-sm font-semibold text-ink-body hover:bg-surface-canvas"
        >
          {t.exportCsv}
        </button>
        <button
          onClick={() => setOnlyActive((v) => !v)}
          className={`rounded-btn px-4 py-2 text-sm font-semibold ${
            onlyActive ? 'bg-tenant text-white' : 'border border-card-border text-ink-subtitle hover:bg-black/[0.02]'
          }`}
        >
          {onlyActive ? t.onlyActive : t.all}
        </button>
      </div>

      <div className="mt-4 overflow-x-auto rounded-card-lg border border-card-border bg-white px-2 shadow-card">
        <table className="w-full min-w-[860px] text-left text-sm">
          <thead>
            <tr className="border-b border-hairline text-xs text-ink-faint">
              <th className="p-3 font-normal">{t.user}</th>
              <th className="p-3 font-normal">{t.role}</th>
              <th className="p-3 font-normal">{t.ip}</th>
              <th className="p-3 font-normal">{t.browser}</th>
              <th className="p-3 font-normal">{t.loginAt}</th>
              <th className="p-3 font-normal">{t.lastSeen}</th>
              <th className="p-3 font-normal">{t.status}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((s) => {
              const badge = roleBadge(s.role);
              return (
                <tr key={s.id} className="border-b border-hairline last:border-0">
                  <td className="p-3">
                    <div className="font-medium text-ink-strong">{s.userName}</div>
                    <div className="text-xs text-ink-faint">{s.userEmail || s.userPhone || t.unknown}</div>
                  </td>
                  <td className="p-3">
                    <Badge label={badge.label} variant={badge.variant} />
                  </td>
                  <td className="p-3 font-sans tabular-nums text-ink-subtitle">{s.ip || '—'}</td>
                  <td className="p-3 text-ink-subtitle">{parseUserAgent(s.userAgent)}</td>
                  <td className="p-3 text-ink-subtitle">{fmt(s.loginAt)}</td>
                  <td className="p-3 text-ink-subtitle">{fmt(s.lastSeenAt)}</td>
                  <td className="p-3">
                    <Badge label={s.active ? t.active : t.ended} variant={s.active ? 'good' : 'neutral'} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {rows.length === 0 && <p className="p-4 text-ink-faint">{t.none}</p>}
      </div>
    </div>
  );
}
