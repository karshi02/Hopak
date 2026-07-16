import Link from 'next/link';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <aside className="w-56 shrink-0 bg-slate-900 p-4 text-white">
        <h2 className="mb-4 font-bold">Hopak Admin</h2>
        <nav className="flex flex-col gap-2">
          <Link href="/admin/dashboard">แดชบอร์ด</Link>
          <Link href="/admin/bookings">การจอง</Link>
          <Link href="/admin/approvals">อนุมัติหอพัก</Link>
          <Link href="/admin/users">ผู้ใช้</Link>
          <Link href="/admin/finance">การเงิน</Link>
          <Link href="/admin/campaigns">โฆษณา</Link>
          <Link href="/admin/admins">ผู้ดูแล</Link>
        </nav>
      </aside>
      <main className="flex-1 p-6">{children}</main>
    </div>
  );
}
