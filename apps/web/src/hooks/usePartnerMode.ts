'use client';

import { useEffect, useState } from 'react';

// โหมดหอพักฝั่งเจ้าของ — รายเดือน กับ รายวัน แยกขาดจากกัน
// ห้องหนึ่งเป็นได้อย่างเดียว: allowDaily=false → รายเดือน, allowDaily=true → รายวัน
export type PartnerMode = 'monthly' | 'daily';

const KEY = 'hopak_partner_mode';

let current: PartnerMode = 'monthly';
let hydrated = false;
const listeners = new Set<(m: PartnerMode) => void>();

function hydrate() {
  if (hydrated) return;
  hydrated = true;
  const saved = localStorage.getItem(KEY);
  if (saved === 'monthly' || saved === 'daily') current = saved;
}

export function usePartnerMode() {
  const [mode, setModeState] = useState<PartnerMode>(current);

  useEffect(() => {
    hydrate();
    setModeState(current);
    listeners.add(setModeState);
    return () => {
      listeners.delete(setModeState);
    };
  }, []);

  function setMode(next: PartnerMode) {
    current = next;
    localStorage.setItem(KEY, next);
    listeners.forEach((l) => l(next));
  }

  return { mode, setMode, isDaily: mode === 'daily' };
}
