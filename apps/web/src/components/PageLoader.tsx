'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { hasShownLoaderThisSession, isAuthPage, markLoaderShown } from '@/lib/loaderVisibility';

const WORD = 'Hopak.com';
const DOTS = ['•', '•', '•'];
const REVEAL_DELAY_MS = 2000;

export function PageLoader() {
  const pathname = usePathname();
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
