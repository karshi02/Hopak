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
