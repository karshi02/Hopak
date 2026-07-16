import { BadRequestException } from '@nestjs/common';
import { BookingStatus } from '@hopak/shared';

const ALLOWED_TRANSITIONS: Record<BookingStatus, BookingStatus[]> = {
  pending: ['confirmed', 'cancelled'],
  confirmed: ['paid', 'cancelled'],
  paid: ['completed'],
  cancelled: [],
  completed: [],
};

export function assertTransition(from: BookingStatus, to: BookingStatus): void {
  if (!ALLOWED_TRANSITIONS[from].includes(to)) {
    throw new BadRequestException(`Cannot transition booking from ${from} to ${to}`);
  }
}
