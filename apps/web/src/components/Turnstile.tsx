'use client';

import { useEffect, useRef, useState } from 'react';

declare global {
  interface Window {
    turnstile?: {
      render: (
        el: HTMLElement,
        opts: {
          sitekey: string;
          callback: (token: string) => void;
          'expired-callback'?: () => void;
          'error-callback'?: () => void;
          theme?: 'light' | 'dark' | 'auto';
          language?: string;
        },
      ) => string;
      remove: (id: string) => void;
      reset: (id?: string) => void;
    };
  }
}

const SCRIPT_SRC = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
const SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

/** โหลดสคริปต์ครั้งเดียวต่อหนึ่งหน้า ต่อให้มีวิดเจ็ตหลายตัว */
let scriptPromise: Promise<void> | null = null;
function loadScript(): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve();
  if (window.turnstile) return Promise.resolve();
  if (!scriptPromise) {
    scriptPromise = new Promise<void>((resolve, reject) => {
      const el = document.createElement('script');
      el.src = SCRIPT_SRC;
      el.async = true;
      el.defer = true;
      el.onload = () => resolve();
      el.onerror = () => {
        scriptPromise = null; // ให้ลองใหม่ได้ถ้าเน็ตหลุดชั่วคราว
        reject(new Error('โหลด Turnstile ไม่สำเร็จ'));
      };
      document.head.appendChild(el);
    });
  }
  return scriptPromise;
}

/**
 * Cloudflare Turnstile — กล่อง "ยืนยันว่าคุณไม่ใช่มนุษย์หรือไม่" ใช้ตอนสมัครสมาชิก
 *
 * onToken คืน token ให้ฟอร์มส่งไปกับ request (ฝั่ง API ตรวจกับ Cloudflare อีกที
 * ผ่านฝั่งหน้าเว็บอย่างเดียวไม่นับ — ยิง API ตรงข้ามหน้าเว็บได้)
 *
 * ไม่ตั้ง NEXT_PUBLIC_TURNSTILE_SITE_KEY = ไม่แสดงอะไรเลย ฟอร์มยังใช้งานได้ตามปกติ
 * (ฝั่ง API ก็ข้ามการตรวจถ้าไม่มี TURNSTILE_SECRET_KEY — สองฝั่งต้องตั้งคู่กันเสมอ)
 */
export function Turnstile({
  onToken,
  lang,
  align = 'left',
}: {
  onToken: (token: string) => void;
  lang?: 'th' | 'en';
  align?: 'left' | 'right';
}) {
  const boxRef = useRef<HTMLDivElement>(null);
  const widgetId = useRef<string | null>(null);
  const onTokenRef = useRef(onToken);
  onTokenRef.current = onToken;
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!SITE_KEY) return;
    let cancelled = false;

    loadScript()
      .then(() => {
        if (cancelled || !boxRef.current || !window.turnstile) return;
        // React 18 dev รัน effect สองรอบ — กันวาดซ้ำจนได้กล่องสองใบ
        if (widgetId.current) return;
        widgetId.current = window.turnstile.render(boxRef.current, {
          sitekey: SITE_KEY,
          language: lang === 'en' ? 'en' : 'th',
          // บังคับธีมสว่างให้เข้ากับฟอร์ม — ค่าเริ่มต้น auto จะกลายเป็นกล่องดำบนเครื่องที่ตั้ง dark mode
          theme: 'light',
          callback: (token) => onTokenRef.current(token),
          // token มีอายุ ~5 นาที หมดอายุแล้วต้องล้างของเดิมทิ้ง ไม่งั้นฟอร์มส่ง token ตายไปให้ API
          'expired-callback': () => onTokenRef.current(''),
          'error-callback': () => {
            onTokenRef.current('');
            setFailed(true);
          },
        });
      })
      .catch(() => setFailed(true));

    return () => {
      cancelled = true;
      if (widgetId.current && window.turnstile) {
        window.turnstile.remove(widgetId.current);
        widgetId.current = null;
      }
    };
  }, [lang]);

  if (!SITE_KEY) return null;

  return (
    <div className={`mt-1 flex ${align === 'right' ? 'justify-end' : 'justify-start'}`}>
      <div>
        <div ref={boxRef} />
        {failed && (
          <p className="mt-1.5 text-[12.5px] font-semibold text-[#C0392B]">
            {lang === 'en'
              ? 'Could not load the bot check. Refresh the page and try again.'
              : 'โหลดตัวยืนยันตัวตนไม่สำเร็จ ลองรีเฟรชหน้าแล้วทำใหม่'}
          </p>
        )}
      </div>
    </div>
  );
}

/** ฟอร์มควรใช้ตัวนี้ตัดสินว่าต้องบังคับ token ไหม (ไม่ตั้งคีย์ = ไม่บังคับ) */
export const turnstileEnabled = !!SITE_KEY;
