import { COMMISSION_RATE, CHAMBER_RATE } from '../constants/fees';

export function calcCommission(amount: number): number {
  return Math.round(amount * COMMISSION_RATE * 100) / 100;
}

export function calcOwnerPayout(amount: number): number {
  return Math.round((amount - calcCommission(amount)) * 100) / 100;
}

// ส่วนแบ่งหอการค้ามหาสารคาม (10% ของยอดจอง)
export function calcChamberShare(amount: number): number {
  return Math.round(amount * CHAMBER_RATE * 100) / 100;
}

// ส่วนที่เหลือของค่าคอมเป็นรายได้แพลตฟอร์ม (คอมรวม - ส่วนหอการค้า)
export function calcPlatformShare(amount: number): number {
  return Math.round((calcCommission(amount) - calcChamberShare(amount)) * 100) / 100;
}
