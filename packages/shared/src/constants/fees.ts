// ค่าคอมมิชชัน "รายเดือน" = 20% ของค่าห้องเท่านั้น (มัดจำไม่โดนหัก คืนเจ้าของหอเต็ม)
export const COMMISSION_RATE = 0.2;
// ค่าคอมมิชชัน "รายวัน" = 10% ของยอดที่ผู้เข้าพักจ่าย (รายวันไม่เก็บมัดจำอยู่แล้ว)
// ผู้เข้าพักจ่ายเท่าราคาห้อง ไม่มีค่าธรรมเนียมบวกเพิ่ม — 10% หักจากยอดที่โอนให้เจ้าของหอ
export const DAILY_COMMISSION_RATE = 0.1;

export type RentalKind = 'MONTHLY' | 'DAILY';

export function commissionRateFor(rentalType?: RentalKind | string | null): number {
  return String(rentalType).toUpperCase() === 'DAILY' ? DAILY_COMMISSION_RATE : COMMISSION_RATE;
}
// ส่วนแบ่งหอการค้ามหาสารคาม = 10% ของ "ค่าคอม" ที่เหลือ 90% ของคอมเป็นรายได้แพลตฟอร์ม
export const CHAMBER_RATE = 0.1;
export const CANCEL_WINDOW_HOURS = 24;
