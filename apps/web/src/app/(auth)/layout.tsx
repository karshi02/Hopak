'use client';

import { usePathname } from 'next/navigation';
import { Navbar } from '@/components/Navbar';

// หน้าที่ออกแบบเป็นเต็มจอสองแผง (มีแบรนด์พาเนลของตัวเอง) ไม่ต้องมี navbar หลักซ้อนด้านบน
const FULL_SCREEN = ['/login', '/register', '/partner-register', '/partner-login'];

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const fullScreen = FULL_SCREEN.some((p) => pathname?.startsWith(p));

  return <div className="min-h-screen">{!fullScreen && <Navbar />}{children}</div>;
}
