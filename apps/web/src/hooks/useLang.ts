'use client';

import { useEffect, useState } from 'react';

export type Lang = 'th' | 'en';
const LANG_KEY = 'hopak_lang';

export function useLang() {
  const [lang, setLangState] = useState<Lang>('th');

  useEffect(() => {
    const saved = localStorage.getItem(LANG_KEY);
    if (saved === 'th' || saved === 'en') setLangState(saved);
  }, []);

  function setLang(next: Lang) {
    setLangState(next);
    localStorage.setItem(LANG_KEY, next);
  }

  return { lang, setLang };
}
