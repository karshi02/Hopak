export type Role = 'tenant' | 'owner' | 'admin';

export type AdminRole = 'super_admin' | 'admin' | 'finance' | 'support';

export interface User {
  id: string;
  role: Role;
  name: string;
  email?: string;
  phone?: string;
  avatarUrl?: string;
  address?: string;
  googleId?: string;
  suspended?: boolean;
  createdAt?: string;
  bookingCount?: number;
  reviewCount?: number;
  emailVerified?: boolean;
  bankName?: string | null;
  bankAccountName?: string | null;
  bankAccountNumber?: string | null;
  promptpayId?: string | null;
}

export type OwnerRequestStatus = 'pending' | 'approved' | 'rejected';

export interface OwnerRequest {
  id: string;
  userId: string;
  status: OwnerRequestStatus;
  phone?: string | null;
  dormName?: string | null;
  province?: string | null;
  address?: string | null;
  note?: string | null;
  documents?: string[];
  createdAt: string;
  decidedAt?: string | null;
  user?: { id: string; name: string; email?: string; phone?: string; createdAt: string };
}
