import type { Dorm, Room } from './dorm';

export type BookingStatus = 'pending' | 'paid' | 'cancelled' | 'completed';

export interface Booking {
  id: string;
  tenantId: string;
  roomId: string;
  checkInDate: string;
  checkOutDate?: string | null; // วันคืนห้อง (เฉพาะรายวัน)
  amount: number; // ยอดที่ผู้เช่าจ่ายรวม = roomPrice + deposit
  roomPrice: number; // ค่าเช่าห้อง (snapshot ตอนจอง) — ฐานคิดค่าคอม
  deposit: number; // ค่ามัดจำ (snapshot ตอนจอง) — ส่งเจ้าของเต็ม ไม่โดนหักคอม
  rentalType?: 'MONTHLY' | 'DAILY'; // รูปแบบการเช่า
  leaseMonths?: number; // ระยะเวลาเช่า (เดือน) 1/3/6 (เฉพาะรายเดือน)
  nights?: number | null; // จำนวนคืน (เฉพาะรายวัน)
  guests?: number | null; // จำนวนผู้เข้าพัก (เฉพาะรายวัน)
  status: BookingStatus;
  contactName: string;
  contactPhone: string;
  note?: string;
  createdAt: string;
  cancelDeadline: string;
  // โทเค็นยืนยันการเข้าพัก — API ส่งมาให้เฉพาะผู้เช่าเจ้าของการจองเท่านั้น
  checkInToken?: string | null;
  checkInTokenExpiresAt?: string | null;
  checkedInAt?: string | null;
  // มีค่าเมื่อผู้เช่าจ่าย QR แล้ว (SETTLED = เงินเข้าบัญชีกลางรอโอนเจ้าของหอ, TRANSFERRED = โอนแล้ว)
  payment?: { status: string } | null;
  room?: Room & { dorm?: Dorm };
}

export interface CheckInResult {
  bookingId: string;
  tenantName: string;
  tenantPhone: string;
  dormName: string;
  roomName?: string | null;
  roomType: string;
  checkInDate: string;
  amount: number;
  checkedInAt: string;
}
