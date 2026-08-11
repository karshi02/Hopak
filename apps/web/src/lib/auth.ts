import { resetLoaderVisibility } from './loaderVisibility';

const TOKEN_KEY = 'hopak_token';
// จำเฉพาะอีเมล/เบอร์ที่ใช้ login ล่าสุด — ไม่เคยเก็บรหัสผ่าน (ผู้ใช้กรอกรหัสเองทุกครั้ง)
const LAST_LOGIN_KEY = 'hopak_last_login';

export function rememberLogin(identifier: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(LAST_LOGIN_KEY, identifier);
}

export function getRememberedLogin(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(LAST_LOGIN_KEY);
}

export function forgetLogin(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(LAST_LOGIN_KEY);
}

export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
  const secure = window.location.protocol === 'https:' ? '; Secure' : '';
  document.cookie = `${TOKEN_KEY}=${token}; path=/; max-age=604800; SameSite=Lax${secure}`;
  resetLoaderVisibility();
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
  const secure = window.location.protocol === 'https:' ? '; Secure' : '';
  document.cookie = `${TOKEN_KEY}=; path=/; max-age=0${secure}`;
  resetLoaderVisibility();
}
