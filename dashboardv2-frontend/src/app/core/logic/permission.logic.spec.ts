import { hasAll, hasAny, isSuperUser, readOnlyViewAllowed } from './permission.logic';
import type { AccessRight, Role, User } from '../models/security.model';

const role = (names: AccessRight[]): Role => ({
  id: 1,
  role: 'Analista',
  permissions: names.map((name, index) => ({ id: index + 1, name, description: null })),
  routes: [],
  dateCreated: null,
  userCreated: null
});

const user = (userName: string, permissions: AccessRight[]): User =>
  ({ id: 1, userName, role: role(permissions).role, idRole: 1 } as unknown as User);

describe('permission.logic', () => {
  it('reconoce a root como super usuario (igual que el middleware)', () => {
    expect(isSuperUser(user('root', []))).toBeTrue();
    expect(isSuperUser(user('ROOT', []))).toBeTrue();
    expect(isSuperUser(user('lruiz', []))).toBeFalse();
  });

  it('exige TODOS los permisos en hasAll y sólo uno en hasAny', () => {
    const rights = ['ReadTransactions'] as AccessRight[];
    const analyst = user('sdiaz', rights);
    expect(hasAll(analyst, rights, ['ReadTransactions', 'ReadPayPads'])).toBeFalse();
    expect(hasAny(analyst, rights, ['ReadTransactions', 'ReadPayPads'])).toBeTrue();
  });

  it('root accede aunque su rol no traiga permisos', () => {
    expect(hasAll(user('root', []), [], ['ReadUsers'])).toBeTrue();
  });

  it('una vista de solo lectura se habilita sólo con el permiso Read', () => {
    expect(readOnlyViewAllowed(user('nvargas', ['ReadTransactions']), ['ReadTransactions'], ['ReadTransactions'])).toBeTrue();
    expect(readOnlyViewAllowed(user('aestrada', ['WritePayPads']), ['WritePayPads'], ['ReadPayPads'])).toBeFalse();
  });
});
