import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Hopak — จองหอพักออนไลน์',
  description: 'ค้นหา จอง และจัดการหอพักออนไลน์',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th">
      <body>{children}</body>
    </html>
  );
}
