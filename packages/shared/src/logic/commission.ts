import { COMMISSION_RATE } from '../constants/fees';

export function calcCommission(amount: number): number {
  return Math.round(amount * COMMISSION_RATE * 100) / 100;
}

export function calcOwnerPayout(amount: number): number {
  return Math.round((amount - calcCommission(amount)) * 100) / 100;
}
