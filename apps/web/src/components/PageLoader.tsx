'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { hasShownLoaderThisSession, isAuthPage, markLoaderShown } from '@/lib/loaderVisibility';

const WORD = 'Hopak.com';
const DOTS = ['•', '•', '•'];
const REVEAL_DELAY_MS = 2000;

export function PageLoader({ theme }: { theme?: 'tenant' | 'seller' }) {
  const pathname = usePathname();
  const resolvedTheme = theme ?? (pathname.startsWith('/partner') ? 'seller' : 'tenant');
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(false);

    const alwaysShow = isAuthPage(pathname);
    const isFirstEntry = !hasShownLoaderThisSession();
    if (!alwaysShow && isFirstEntry) markLoaderShown();

    if (!alwaysShow && !isFirstEntry) return;

    const timer = setTimeout(() => setVisible(true), REVEAL_DELAY_MS);
    return () => clearTimeout(timer);
  }, [pathname]);

  if (!visible) return null;

  if (resolvedTheme === 'seller') return <SellerLoader />;

  const letters = WORD.split('').map((char, i) => ({ char, delay: `${i * 0.08}s` }));
  const wordDelay = letters.length * 0.08;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden bg-[#1e6fd9]">
      <div className="flex flex-col items-center gap-5">
        <div className="relative h-24 w-16 sm:h-32 sm:w-20">
          <div
            className="absolute inset-0 flex select-none items-center justify-center font-sans text-8xl font-extrabold leading-none text-white opacity-[0.12] sm:text-9xl"
            style={{ animation: 'hopak-fade-pulse 2.2s ease-in-out infinite' }}
          >
            H
          </div>
          <div
            className="absolute inset-0 flex select-none items-center justify-center font-sans text-8xl font-extrabold leading-none text-white sm:text-9xl"
            style={{ animation: 'hopak-fill-up 2.4s cubic-bezier(0.65,0,0.35,1) infinite' }}
          >
            H
          </div>
        </div>

        <div className="flex font-sans text-xl font-bold tracking-wide text-white sm:text-2xl">
          {letters.map((l, i) => (
            <span
              key={i}
              className="inline-block whitespace-pre"
              style={{ animation: 'hopak-wave-jump 1.4s ease-in-out infinite', animationDelay: l.delay }}
            >
              {l.char}
            </span>
          ))}
          {DOTS.map((dot, i) => (
            <span
              key={i}
              className="inline-block whitespace-pre"
              style={{
                animation: 'hopak-wave-jump 1.4s ease-in-out infinite, hopak-dot-blink 1.4s ease-in-out infinite',
                animationDelay: `${wordDelay + i * 0.08}s`,
              }}
            >
              {dot}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

function SellerLoader() {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden"
      style={{ background: 'radial-gradient(120% 90% at 50% 20%, #2AB27C 0%, #178F5A 46%, #0F6B44 100%)' }}
    >
      <div className="pointer-events-none absolute -left-36 -top-40 h-[620px] w-[620px] rounded-full border border-white/[0.07]" />
      <div className="pointer-events-none absolute -bottom-36 -right-32 h-[460px] w-[460px] rounded-full border border-white/[0.06]" />

      <div className="relative flex flex-col items-center">
        <div
          className="relative flex h-[132px] w-[132px] items-center justify-center"
          style={{ animation: 'hopak-seller-badge 2.6s ease-in-out infinite' }}
        >
          <svg
            width="132"
            height="132"
            viewBox="0 0 132 132"
            fill="none"
            className="absolute inset-0"
            style={{ animation: 'hopak-seller-spin 1.5s linear infinite' }}
          >
            <circle cx="66" cy="66" r="60" stroke="rgba(255,255,255,0.18)" strokeWidth="4" />
            <path d="M66 6a60 60 0 0148 24" stroke="#ffffff" strokeWidth="4" strokeLinecap="round" />
          </svg>
          <div className="flex h-[92px] w-[92px] items-center justify-center rounded-[26px] bg-white/[0.14] shadow-[0_10px_30px_rgba(0,0,0,0.18)] backdrop-blur-[2px]">
            <span className="font-sans text-5xl font-bold text-white">H</span>
          </div>
        </div>

        <div className="mt-[30px] flex items-baseline gap-2.5">
          <span className="font-sans text-[34px] font-bold tracking-[-0.5px] text-white">Hopak</span>
          <span className="font-sans text-[34px] font-semibold tracking-[-0.5px] text-seller-muted">Seller</span>
        </div>
        <div className="mt-2 text-[15px] text-white/85">คอนโซลสำหรับเจ้าของหอพัก</div>

        <div className="mt-[34px] h-1.5 w-60 overflow-hidden rounded-full bg-white/[0.18]">
          <div className="h-full w-full rounded-full bg-white" style={{ animation: 'hopak-seller-bar 1.8s ease-in-out infinite' }} />
        </div>

        <div className="mt-5 flex items-center gap-2 text-sm text-white/85">
          <span>กำลังโหลด</span>
          <span className="inline-flex gap-1">
            {[0, 0.2, 0.4].map((delay) => (
              <span
                key={delay}
                className="h-1.5 w-1.5 rounded-full bg-white"
                style={{ animation: 'hopak-seller-dot 1.4s infinite', animationDelay: `${delay}s` }}
              />
            ))}
          </span>
        </div>
      </div>

      <div className="absolute bottom-7 left-0 right-0 text-center text-[12.5px] text-white/55">© 2026 Hopak.co.th</div>
    </div>
  );
}
