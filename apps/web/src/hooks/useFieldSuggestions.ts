'use client';

import { useEffect, useState } from 'react';

const MAX_ITEMS = 8;
const STORAGE_PREFIX = 'hopak_suggest_';

function read(key: string): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + key);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function write(key: string, items: string[]) {
  try {
    localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(items));
  } catch {
    // localStorage ปิด/เต็ม — ข้ามไป ไม่กระทบการกรอกฟอร์ม
  }
}
//store field suggestions in localStorage (per field) to show as a dropdown for selection — not auto-fill the entire form
// เก็บค่าที่เคยกรอกไว้ในเครื่อง (ต่อ field) ไว้โชว์เป็น dropdown ให้เลือก — ไม่ใช่ auto-fill ทั้งฟอร์ม
// ผู้ใช้ต้องกดเลือกเองเท่านั้น ฟอร์มยังเริ่มว่างทุกครั้งเหมือนเดิม
export function useFieldSuggestions(key: string) {
  const [items, setItems] = useState<string[]>([]);

  useEffect(() => {
    setItems(read(key));
  }, [key]);

  function remember(value: string) {
    const trimmed = value.trim();
    if (!trimmed) return;
    const next = [trimmed, ...read(key).filter((v) => v !== trimmed)].slice(0, MAX_ITEMS);
    write(key, next);
    setItems(next);
  }

  return { items, remember };
}
//exit
