export type PaymentStatus = 'pending' | 'settled' | 'transferred';

export interface Payment {
  id: string;
  bookingId: string;
  amount: number;
  commission: number;
  ownerPayout: number;
  method: string;
  status: PaymentStatus;
  settledAt?: string;
}
