import { SetMetadata } from '@nestjs/common';

export const ADMIN_ROLES_KEY = 'adminRoles';

export type AdminRole = 'SUPER_ADMIN' | 'ADMIN' | 'FINANCE' | 'SUPPORT';

export const AdminRoles = (...roles: AdminRole[]) => SetMetadata(ADMIN_ROLES_KEY, roles);
