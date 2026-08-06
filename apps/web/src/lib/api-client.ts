import { getToken, clearToken } from './auth';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

function handleSessionExpired() {
  clearToken();
  if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
    window.location.href = '/login?error=session_expired';
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  if (!res.ok) {
    // token ที่ส่งไปโดนปฏิเสธ (หมดอายุ/ไม่ถูกต้อง) — ต่างจาก 401 ตอน login ผิดรหัส
    // ซึ่งไม่มี token ส่งไปตั้งแต่แรก จึงไม่เข้าเงื่อนไขนี้
    if (res.status === 401 && token) handleSessionExpired();
    const body = await res.json().catch(() => ({}));
    const err = new Error(body.message ?? `Request failed: ${res.status}`);
    // แนบ HTTP status ไว้ให้ผู้เรียกแยกเคสได้ (เช่น 409 = ห้องถูกจองอยู่)
    (err as Error & { status?: number }).status = res.status;
    throw err;
  }
  return res.json();
}

const MIN_LOAD_MS = 1000; 

function withMinDelay<T>(promise: Promise<T>): Promise<T> {
  const delay = new Promise((resolve) => setTimeout(resolve, MIN_LOAD_MS));
  return Promise.all([promise, delay]).then(([data]) => data);
}

export const apiClient = {
  get: <T>(path: string) => withMinDelay(request<T>(path)),
  post: <T>(path: string, data?: unknown) =>
    request<T>(path, { method: 'POST', body: data ? JSON.stringify(data) : undefined }),
  patch: <T>(path: string, data?: unknown) =>
    request<T>(path, { method: 'PATCH', body: data ? JSON.stringify(data) : undefined }),
  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
};
