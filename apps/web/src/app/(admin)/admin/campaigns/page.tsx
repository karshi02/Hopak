'use client';

import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api-client';
import { useLang } from '@/hooks/useLang';
import { Badge } from '@/components/dashboard/Badge';
import { StatTile } from '@/components/dashboard/StatTile';

interface Campaign {
  id: string;
  dormId: string;
  kind: 'BOOST' | 'BANNER' | 'FEATURED';
  startAt: string;
  endAt: string;
  price: number;
  dorm: { name: string };
}

const TEXT = {
  th: {
    title: 'โฆษณา & แคมเปญ',
    create: '+ สร้างแคมเปญ',
    active: 'กำลังแสดง',
    total: 'แคมเปญทั้งหมด',
    totalBudget: 'งบรวมทั้งหมด',
    dormId: 'Dorm ID',
    price: 'ราคา',
    save: 'บันทึก',
    createError: 'เพิ่มแคมเปญไม่สำเร็จ',
    dorm: 'หอพัก',
    type: 'ประเภท',
    budget: 'งบ',
    duration: 'ระยะเวลา',
    status: 'สถานะ',
    none: 'ยังไม่มีแคมเปญ',
    kindLabel: { BOOST: 'Boost', BANNER: 'แบนเนอร์', FEATURED: 'Featured' } as Record<Campaign['kind'], string>,
    statusEnded: 'จบแล้ว',
    statusUpcoming: 'รอเริ่ม',
    statusLive: 'กำลังแสดง',
    dateLocale: 'th-TH',
  },
  en: {
    title: 'Ads & Campaigns',
    create: '+ Create campaign',
    active: 'Live',
    total: 'Total campaigns',
    totalBudget: 'Total budget',
    dormId: 'Dorm ID',
    price: 'Price',
    save: 'Save',
    createError: 'Failed to add campaign',
    dorm: 'Dorm',
    type: 'Type',
    budget: 'Budget',
    duration: 'Duration',
    status: 'Status',
    none: 'No campaigns yet',
    kindLabel: { BOOST: 'Boost', BANNER: 'Banner', FEATURED: 'Featured' } as Record<Campaign['kind'], string>,
    statusEnded: 'Ended',
    statusUpcoming: 'Upcoming',
    statusLive: 'Live',
    dateLocale: 'en-US',
  },
};

const KIND_VARIANT: Record<Campaign['kind'], 'info' | 'warning' | 'purple'> = {
  BOOST: 'info',
  BANNER: 'warning',
  FEATURED: 'purple',
};

export default function AdminCampaignsPage() {
  const { lang } = useLang();
  const t = TEXT[lang];
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ dormId: '', kind: 'BOOST' as Campaign['kind'], startAt: '', endAt: '', price: 0 });
  const [error, setError] = useState<string | null>(null);

  function campaignStatus(c: Campaign): { label: string; variant: 'good' | 'warning' | 'neutral' } {
    const now = new Date();
    if (new Date(c.endAt) < now) return { label: t.statusEnded, variant: 'neutral' };
    if (new Date(c.startAt) > now) return { label: t.statusUpcoming, variant: 'warning' };
    return { label: t.statusLive, variant: 'good' };
  }

  function reload() {
    apiClient.get<Campaign[]>('/admin/campaigns').then(setCampaigns).catch(() => setCampaigns([]));
  }

  useEffect(reload, []);

  const totalBudget = campaigns.reduce((sum, c) => sum + c.price, 0);
  const now = new Date();
  const activeCount = campaigns.filter((c) => new Date(c.startAt) <= now && new Date(c.endAt) >= now).length;

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await apiClient.post('/admin/campaigns', form);
      setShowForm(false);
      setForm({ dormId: '', kind: 'BOOST', startAt: '', endAt: '', price: 0 });
      reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : t.createError);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-ink-strong dark:text-white">{t.title}</h1>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="rounded-btn bg-admin px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
        >
          {t.create}
        </button>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatTile label={t.active} value={`${activeCount}`} />
        <StatTile label={t.total} value={`${campaigns.length}`} />
        <StatTile label={t.totalBudget} value={`฿${totalBudget.toLocaleString()}`} />
      </div>

      {showForm && (
        <form
          onSubmit={handleCreate}
          className="mt-4 flex flex-col gap-3 rounded-lg border border-card-border p-4 dark:border-white/10"
        >
          <input
            placeholder={t.dormId}
            value={form.dormId}
            onChange={(e) => setForm({ ...form, dormId: e.target.value })}
            className="rounded-lg border border-card-border px-3 py-2 dark:border-white/10 dark:bg-[#1a1a19]"
            required
          />
          <select
            value={form.kind}
            onChange={(e) => setForm({ ...form, kind: e.target.value as Campaign['kind'] })}
            className="rounded-lg border border-card-border px-3 py-2 dark:border-white/10 dark:bg-[#1a1a19]"
          >
            <option value="BOOST">{t.kindLabel.BOOST}</option>
            <option value="BANNER">{t.kindLabel.BANNER}</option>
            <option value="FEATURED">{t.kindLabel.FEATURED}</option>
          </select>
          <div className="flex gap-2">
            <input
              type="date"
              value={form.startAt}
              onChange={(e) => setForm({ ...form, startAt: e.target.value })}
              className="w-1/2 rounded-lg border border-card-border px-3 py-2 dark:border-white/10 dark:bg-[#1a1a19]"
              required
            />
            <input
              type="date"
              value={form.endAt}
              onChange={(e) => setForm({ ...form, endAt: e.target.value })}
              className="w-1/2 rounded-lg border border-card-border px-3 py-2 dark:border-white/10 dark:bg-[#1a1a19]"
              required
            />
          </div>
          <input
            type="number"
            placeholder={t.price}
            value={form.price}
            onChange={(e) => setForm({ ...form, price: Number(e.target.value) })}
            className="rounded-lg border border-card-border px-3 py-2 dark:border-white/10 dark:bg-[#1a1a19]"
          />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button type="submit" className="rounded-lg bg-tenant py-2 text-sm font-medium text-white hover:bg-tenant-dark">
            {t.save}
          </button>
        </form>
      )}

      <div className="mt-4 overflow-x-auto rounded-card border border-card-border dark:border-white/10">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-card-border text-xs text-ink-faint dark:border-white/10">
              <th className="p-3 font-normal">{t.dorm}</th>
              <th className="p-3 font-normal">{t.type}</th>
              <th className="p-3 font-normal">{t.budget}</th>
              <th className="p-3 font-normal">{t.duration}</th>
              <th className="p-3 font-normal">{t.status}</th>
            </tr>
          </thead>
          <tbody>
            {campaigns.map((c) => {
              const status = campaignStatus(c);
              return (
                <tr key={c.id} className="border-t border-card-border dark:border-white/10">
                  <td className="p-3 font-medium text-ink-strong dark:text-white">{c.dorm.name}</td>
                  <td className="p-3">
                    <Badge label={t.kindLabel[c.kind]} variant={KIND_VARIANT[c.kind]} />
                  </td>
                  <td className="p-3 font-sans tabular-nums">฿{c.price.toLocaleString()}</td>
                  <td className="p-3 text-ink-subtitle">
                    {new Date(c.startAt).toLocaleDateString(t.dateLocale)} – {new Date(c.endAt).toLocaleDateString(t.dateLocale)}
                  </td>
                  <td className="p-3">
                    <Badge label={status.label} variant={status.variant} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {campaigns.length === 0 && <p className="p-4 text-ink-faint">{t.none}</p>}
      </div>
    </div>
  );
}
