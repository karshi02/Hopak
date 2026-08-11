import 'reflect-metadata';
import type { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ADMIN_ROLES_KEY } from '../decorators/admin-roles.decorator';
import { AdminRolesGuard } from './admin-roles.guard';
import { AdminsController } from '../../modules/admin/admins/admins.controller';
import { FinanceController } from '../../modules/admin/finance/finance.controller';

function contextFor(user: unknown, target: Function): ExecutionContext {
  return {
    getHandler: () => target,
    getClass: () => target,
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
  } as ExecutionContext;
}

describe('AdminRolesGuard', () => {
  const reflector = new Reflector();
  const guard = new AdminRolesGuard(reflector);

  it('allows a FINANCE admin to access finance routes', () => {
    expect(Reflect.getMetadata(ADMIN_ROLES_KEY, FinanceController)).toEqual(['SUPER_ADMIN', 'FINANCE']);
    expect(guard.canActivate(contextFor({ role: 'admin', adminRole: 'FINANCE' }, FinanceController))).toBe(true);
  });

  it('denies a SUPPORT admin from finance routes', () => {
    expect(guard.canActivate(contextFor({ role: 'admin', adminRole: 'SUPPORT' }, FinanceController))).toBe(false);
  });

  it('allows only SUPER_ADMIN to manage admin roles', () => {
    expect(Reflect.getMetadata(ADMIN_ROLES_KEY, AdminsController)).toEqual(['SUPER_ADMIN']);
    expect(guard.canActivate(contextFor({ role: 'admin', adminRole: 'SUPER_ADMIN' }, AdminsController))).toBe(true);
    expect(guard.canActivate(contextFor({ role: 'admin', adminRole: 'ADMIN' }, AdminsController))).toBe(false);
  });
});
