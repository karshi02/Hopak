// ค่าตั้งต้นค่าคอมมิชชัน "รายเดือน" = 12% ของค่าห้องเท่านั้น (มัดจำไม่โดนหัก คืนเจ้าของหอเต็ม)
// แอดมินปรับค่าจริงได้ที่หน้าแอดมิน ค่านี้ใช้เฉพาะตอน SiteSettings ยังไม่เคยตั้ง
export const COMMISSION_RATE = 0.12;
// ค่าคอมมิชชัน "รายวัน" = 10% ของยอดที่ผู้เข้าพักจ่าย (รายวันไม่เก็บมัดจำอยู่แล้ว)
// ผู้เข้าพักจ่ายเท่าราคาห้อง ไม่มีค่าธรรมเนียมบวกเพิ่ม — 10% หักจากยอดที่โอนให้เจ้าของหอ
export const DAILY_COMMISSION_RATE = 0.1;

export type RentalKind = 'MONTHLY' | 'DAILY';

// อัตราจริงมาจาก SiteSettings ที่แอดมินตั้งได้ ค่าคงที่ด้านบนเป็นแค่ค่าตั้งต้นตอน DB ยังว่าง
// rates ที่ส่งเข้ามาต้องอยู่ในช่วง 0-1 (0.12 = 12%) ค่านอกช่วงถือว่าไม่มี ใช้ default แทน
export function isValidRate(rate: unknown): rate is number {
  return typeof rate === 'number' && Number.isFinite(rate) && rate >= 0 && rate <= 1;
}

export function commissionRateFor(
  rentalType?: RentalKind | string | null,
  rates?: { monthly?: number | null; daily?: number | null },
): number {
  const daily = String(rentalType).toUpperCase() === 'DAILY';
  const override = daily ? rates?.daily : rates?.monthly;
  if (isValidRate(override)) return override;
  return daily ? DAILY_COMMISSION_RATE : COMMISSION_RATE;
}
// ส่วนแบ่งหอการค้ามหาสารคาม = 10% ของ "ค่าคอม" ที่เหลือ 90% ของคอมเป็นรายได้แพลตฟอร์ม
export const CHAMBER_RATE = 0.1;
export const CANCEL_WINDOW_HOURS = 24;
