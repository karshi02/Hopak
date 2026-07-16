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
}
