import type { Dorm, Room } from './dorm';

export type BookingStatus = 'pending' | 'confirmed' | 'paid' | 'cancelled' | 'completed';

export interface Booking {
  id: string;
  tenantId: string;
  roomId: string;
  checkInDate: string;
  amount: number;
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
