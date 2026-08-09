import { COMMISSION_RATE, CHAMBER_RATE } from '../constants/fees';

const round2 = (n: number) => Math.round(n * 100) / 100;

// ค่าคอมคิดจาก "ฐานที่ส่งเข้ามา" (ใช้จริง = ค่าห้อง roomPrice เท่านั้น มัดจำไม่โดนหัก)
// เช่น ค่าห้อง 1000 → คอม 20% = 200
export function calcCommission(base: number): number {
  return round2(base * COMMISSION_RATE);
}

// ส่วนแบ่งหอการค้า = 10% ของ "ค่าคอม"
// เช่น ค่าห้อง 1000 → คอม 200 → หอการค้า 10% ของ 200 = 20
export function calcChamberShare(base: number): number {
  return round2(calcCommission(base) * CHAMBER_RATE);
}
// เเยกรักว่าง หอการค้าเเละหุ้นว่งยของ   roll = orisis lcaol 
// ส่วนแพลตฟอร์ม = ค่าคอมที่เหลือหลังหักส่วนหอการค้า (90% ของค่าคอม)

export function calcPlatformShare(base: number): number {
  return round2(calcCommission(base) - calcChamberShare(base));
}

// เจ้าของหอได้ = ยอดที่ผู้เช่าจ่าย (amount) หักคอม โดยคอมคิดจาก commissionBase (ค่าห้อง) เท่านั้น
// มัดจำจึงส่งคืนเต็ม: ownerPayout = (ค่าห้อง + มัดจำ) - คอม(ค่าห้อง) = ค่าห้อง×0.8 + มัดจำเต็ม
// commissionBase ไม่ใส่ = ใช้ amount เป็นฐาน (คงพฤติกรรมเดิม กันของเก่าพัง)
export function calcOwnerPayout(amount: number, commissionBase: number = amount): number {
  return round2(amount - calcCommission(commissionBase));
}
