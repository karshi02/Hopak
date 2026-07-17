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

export function bookingStatusBadge(status: string): { label: string; variant: BadgeVariant } {
  switch (status.toLowerCase()) {
    case 'pending':
      return { label: 'รอยืนยัน', variant: 'warning' };
    case 'confirmed':
      return { label: 'ยืนยันแล้ว', variant: 'good' };
    case 'paid':
      return { label: 'ชำระเงินแล้ว', variant: 'good' };
    case 'completed':
      return { label: 'เสร็จสิ้น', variant: 'neutral' };
    case 'cancelled':
      return { label: 'ยกเลิก', variant: 'critical' };
    default:
      return { label: status, variant: 'neutral' };
  }
}

export function dormStatusBadge(status: string): { label: string; variant: BadgeVariant } {
  switch (status.toLowerCase()) {
    case 'pending_approval':
      return { label: 'รออนุมัติ', variant: 'warning' };
    case 'approved':
      return { label: 'อนุมัติแล้ว', variant: 'good' };
    case 'rejected':
      return { label: 'ไม่รับ', variant: 'critical' };
    case 'suspended':
      return { label: 'ระงับ', variant: 'critical' };
    default:
      return { label: status, variant: 'neutral' };
  }
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

export function roomStatusBadge(status: string): { label: string; variant: BadgeVariant } {
  return status.toUpperCase() === 'AVAILABLE'
    ? { label: 'ว่าง', variant: 'good' }
    : { label: 'ไม่ว่าง', variant: 'neutral' };
}
