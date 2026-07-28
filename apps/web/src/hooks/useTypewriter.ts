'use client';

import { useEffect, useState } from 'react';

// พิมพ์ทีละตัว → หยุดโชว์ → ลบทีละตัว → วนไปวลีถัดไปตลอด (ใช้แทน placeholder นิ่งๆ)
export function useTypewriter(phrases: string[]) {
  const [text, setText] = useState('');

  useEffect(() => {
    let phraseIndex = 0;
    let charIndex = 0;
    let deleting = false;
    let timer: ReturnType<typeof setTimeout>;

    function tick() {
      const phrase = phrases[phraseIndex];
      if (!deleting) {
        charIndex += 1;
        setText(phrase.slice(0, charIndex));
        if (charIndex === phrase.length) {
          deleting = true;
          timer = setTimeout(tick, 1400);
          return;
        }
        timer = setTimeout(tick, 75);
      } else {
        charIndex -= 1;
        setText(phrase.slice(0, charIndex));
        if (charIndex === 0) {
          deleting = false;
          phraseIndex = (phraseIndex + 1) % phrases.length;
          timer = setTimeout(tick, 400);
          return;
        }
        timer = setTimeout(tick, 35);
      }
    }

    timer = setTimeout(tick, 400);
    return () => clearTimeout(timer);
  }, [phrases]);

  return text;
}
