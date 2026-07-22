'use client';

import { useEffect, useState } from 'react';

export type Lang = 'th' | 'en';
const LANG_KEY = 'hopak_lang';

let currentLang: Lang = 'th';
let hydrated = false;
const listeners = new Set<(lang: Lang) => void>();

function hydrate() {
  if (hydrated) return;
  hydrated = true;
  const saved = localStorage.getItem(LANG_KEY);
  if (saved === 'th' || saved === 'en') currentLang = saved;
}

export function useLang() {
  const [lang, setLangState] = useState<Lang>(currentLang);

  useEffect(() => {
    hydrate();
    setLangState(currentLang);
    listeners.add(setLangState);
    return () => {
      listeners.delete(setLangState);
    };
  }, []);

  function setLang(next: Lang) {
    currentLang = next;
    localStorage.setItem(LANG_KEY, next);
    listeners.forEach((listener) => listener(next));
  }

  return { lang, setLang };
}
