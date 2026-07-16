import Link from 'next/link';

export default function PartnerLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <aside className="w-56 shrink-0 bg-green-700 p-4 text-white">
        <h2 className="mb-4 font-bold">Hopak Partner</h2>
        <nav className="flex flex-col gap-2">
          <Link href="/partner/dashboard">แดชบอร์ด</Link>
          <Link href="/partner/dorms/new">เพิ่มหอพัก</Link>
          <Link href="/partner/rooms">จัดการห้อง</Link>
          <Link href="/partner/requests">คำขอจอง</Link>
          <Link href="/partner/slips">ใบจอง</Link>
          <Link href="/partner/settings">ตั้งค่า</Link>
        </nav>
      </aside>
      <main className="flex-1 p-6">{children}</main>
    </div>
  );
}
