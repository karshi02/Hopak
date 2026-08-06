import { BadRequestException } from '@nestjs/common';
import { BookingStatus } from '@hopak/shared';

// จ่าย QR แล้วสถานะขึ้นเอง — ไม่มีด่านเจ้าของหอ (confirmed) คั่นกลางอีกต่อไป
// pending (จองแล้ว) → paid (จ่าย QR สำเร็จ) → completed (เช็คอินด้วยโทเค็น)
const ALLOWED_TRANSITIONS: Record<BookingStatus, BookingStatus[]> = {
  pending: ['paid', 'cancelled'],
  paid: ['completed'],
  cancelled: [],
  completed: [],
};

export function assertTransition(from: BookingStatus, to: BookingStatus): void {
  if (!ALLOWED_TRANSITIONS[from].includes(to)) {
    throw new BadRequestException(`Cannot transition booking from ${from} to ${to}`);
  }
}
//add local comment