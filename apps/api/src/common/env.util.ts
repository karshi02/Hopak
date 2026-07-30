// บังคับ env สำคัญต้องตั้งค่าจริงเสมอ — ห้าม fallback เป็นค่า default ที่เดาได้ (เช่น 'dev-secret')
// ถ้าไม่ตั้ง → โยน error ตั้งแต่ตอนโหลดโมดูล = แอปไม่ยอมบูต (fail-closed) แทนที่จะรันด้วยกุญแจที่ปลอมได้
export function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value || !value.trim()) {
    throw new Error(
      `[SECURITY] ไม่พบ env "${name}" — ปฏิเสธการเริ่มระบบด้วยค่า default ที่ไม่ปลอดภัย ` +
        `กรุณาตั้งค่าใน apps/api/.env (dev) หรือ apps/api/.env.production (prod)`,
    );
  }
  return value;
}
