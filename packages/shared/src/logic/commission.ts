import { COMMISSION_RATE, CHAMBER_RATE } from '../constants/fees';

const round2 = (n: number) => Math.round(n * 100) / 100;

// ค่าคอมคิดจาก "ยอดรวม" (ค่าห้อง + มัดจำ) — เจ้าของหอได้ 80% ของยอดรวม
export function calcCommission(amount: number): number {
  return round2(amount * COMMISSION_RATE);
}

// ส่วนแบ่งหอการค้า = 10% ของ "ค่าคอม" (ไม่ใช่ 10% ของยอดเต็มแบบเดิม)
// เช่น ยอดรวม 100 → คอม 20% = 20 → หอการค้า 10% ของ 20 = 2
export function calcChamberShare(amount: number): number {
  return round2(calcCommission(amount) * CHAMBER_RATE);
}

// ส่วนแพลตฟอร์ม = ค่าคอมที่เหลือหลังหักส่วนหอการค้า (90% ของค่าคอม)
export function calcPlatformShare(amount: number): number {
  return round2(calcCommission(amount) - calcChamberShare(amount));
}

// เจ้าของหอได้ = ยอดรวมหลังหักคอม (80% ของยอดรวม)
export function calcOwnerPayout(amount: number): number {
  return round2(amount - calcCommission(amount));
}
