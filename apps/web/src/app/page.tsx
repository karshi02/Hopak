import Link from 'next/link';

export default function HomePage() {
  return (
    <main className="mx-auto max-w-5xl p-6">
      <h1 className="text-2xl font-bold">Hopak</h1>
      <p className="mt-2 text-gray-600">ค้นหาหอพักใกล้มหาวิทยาลัยของคุณ</p>
      <Link href="/search" className="mt-4 inline-block rounded bg-green-600 px-4 py-2 text-white">
        ค้นหาหอพัก
      </Link>
    </main>
  );
}
