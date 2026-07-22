const SESSION_KEY = 'hopak_loader_shown';

export function isAuthPage(pathname: string): boolean {
  return pathname === '/register' || pathname.endsWith('/login');
}

export function hasShownLoaderThisSession(): boolean {
  if (typeof window === 'undefined') return true;
  return sessionStorage.getItem(SESSION_KEY) === '1';
}

export function markLoaderShown(): void {
  if (typeof window !== 'undefined') sessionStorage.setItem(SESSION_KEY, '1');
}

export function resetLoaderVisibility(): void {
  if (typeof window !== 'undefined') sessionStorage.removeItem(SESSION_KEY);
}
