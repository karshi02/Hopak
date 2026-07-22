import type { Lang } from '@/hooks/useLang';

type BadgeVariant = 'good' | 'warning' | 'critical' | 'info' | 'purple' | 'neutral';

const VARIANT_CLASS: Record<BadgeVariant, string> = {
  good: 'bg-[#E9F7EF] text-[#12813F]',
  warning: 'bg-[#FEF6E7] text-[#B4791A]',
  critical: 'bg-[#FDECEC] text-[#C0392B]',
  info: 'bg-[#EAF1FD] text-tenant',
  purple: 'bg-[#F3ECFB] text-admin',
  neutral: 'bg-[#F1F3F6] text-ink-subtitle',
};

export function Badge({ label, variant = 'neutral' }: { label: string; variant?: BadgeVariant }) {
  return (
    <span className={`inline-block rounded-full px-2.5 py-1 text-xs font-semibold ${VARIANT_CLASS[variant]}`}>
      {label}
    </span>
  );
}

export function bookingStatusBadge(status: string, lang: Lang = 'th'): { label: string; variant: BadgeVariant } {
  const labels: Record<string, Record<string, string>> = {
    pending: { th: 'รอยืนยัน', en: 'Pending' },
    confirmed: { th: 'ยืนยันแล้ว', en: 'Confirmed' },
    paid: { th: 'ชำระเงินแล้ว', en: 'Paid' },
    completed: { th: 'เสร็จสิ้น', en: 'Completed' },
    cancelled: { th: 'ยกเลิก', en: 'Cancelled' },
  };
  const variants: Record<string, BadgeVariant> = {
    pending: 'warning',
    confirmed: 'good',
    paid: 'good',
    completed: 'neutral',
    cancelled: 'critical',
  };
  const key = status.toLowerCase();
  return { label: labels[key]?.[lang] ?? status, variant: variants[key] ?? 'neutral' };
}

export function dormStatusBadge(status: string, lang: Lang = 'th'): { label: string; variant: BadgeVariant } {
  const labels: Record<string, Record<string, string>> = {
    pending_approval: { th: 'รออนุมัติ', en: 'Pending approval' },
    approved: { th: 'อนุมัติแล้ว', en: 'Approved' },
    rejected: { th: 'ไม่รับ', en: 'Rejected' },
    suspended: { th: 'ระงับ', en: 'Suspended' },
  };
  const variants: Record<string, BadgeVariant> = {
    pending_approval: 'warning',
    approved: 'good',
    rejected: 'critical',
    suspended: 'critical',
  };
  const key = status.toLowerCase();
  return { label: labels[key]?.[lang] ?? status, variant: variants[key] ?? 'neutral' };
}

export function adminRoleBadge(role: string): { label: string; variant: BadgeVariant } {
  switch (role.toLowerCase()) {
    case 'super_admin':
      return { label: 'Super Admin', variant: 'purple' };
    case 'admin':
      return { label: 'Admin', variant: 'info' };
    case 'finance':
      return { label: 'Finance', variant: 'good' };
    case 'support':
      return { label: 'Support', variant: 'warning' };
    default:
      return { label: role, variant: 'neutral' };
  }
}

export function roomStatusBadge(status: string, lang: Lang = 'th'): { label: string; variant: BadgeVariant } {
  return status.toUpperCase() === 'AVAILABLE'
    ? { label: lang === 'th' ? 'ว่าง' : 'Available', variant: 'good' }
    : { label: lang === 'th' ? 'ไม่ว่าง' : 'Occupied', variant: 'neutral' };
}
