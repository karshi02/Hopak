export type Role = 'tenant' | 'owner' | 'admin';

export type AdminRole = 'super_admin' | 'admin' | 'finance' | 'support';

export interface User {
  id: string;
  role: Role;
  name: string;
  email?: string;
  phone?: string;
  avatarUrl?: string;
  googleId?: string;
}

export type OwnerRequestStatus = 'pending' | 'approved' | 'rejected';

export interface OwnerRequest {
  id: string;
  userId: string;
  status: OwnerRequestStatus;
  createdAt: string;
  decidedAt?: string | null;
  user?: { id: string; name: string; email?: string; phone?: string; createdAt: string };
}
