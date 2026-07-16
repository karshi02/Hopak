import { CANCEL_WINDOW_HOURS } from '../constants/fees';

export function getCancelDeadline(createdAt: Date): Date {
  return new Date(createdAt.getTime() + CANCEL_WINDOW_HOURS * 60 * 60 * 1000);
}

export function canCancel(createdAt: Date, now: Date = new Date()): boolean {
  return now.getTime() <= getCancelDeadline(createdAt).getTime();
}
