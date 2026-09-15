import { Injectable } from '@angular/core';
import { Observable, delay, map, of, throwError } from 'rxjs';

import {
  MOCK_CLIENTS,
  MOCK_DEMO_ACCOUNTS,
  MOCK_MACHINES,
  MOCK_OFFICES,
  MOCK_PERMISSIONS,
  MOCK_ROLES,
  MOCK_ROUTES,
  MOCK_USERS,
  dataset
} from './mock-dataset';
import { MachinesPort } from '../../core/ports/machines.port';
import { SecurityPort } from '../../core/ports/security.port';
import type { Client, Load, Machine, MachineStorageLine, Office, Subscription, Tonnage } from '../../core/models/machines.model';
import type { LoginRequest, Permission, Role, RouteNode, User } from '../../core/models/security.model';
import { fake } from './mock.util';

/** Simula `PayPadController` + `TonnageController` + `LoadController` + `ClientController`. */
@Injectable({ providedIn: 'root' })
export class MockMachinesAdapter extends MachinesPort {
  all(): Observable<Machine[]> {
    return fake(MOCK_MACHINES);
  }

  byStatus(status: number): Observable<Machine[]> {
    return fake(MOCK_MACHINES.filter((m) => m.status === status));
  }

  storage(idPayPad: number): Observable<MachineStorageLine[]> {
    return fake(dataset().storage.get(idPayPad) ?? [], 200);
  }

  tonnages(idPayPad: number): Observable<Tonnage[]> {
    return fake((dataset().tonnages.get(idPayPad) ?? []) as Tonnage[], 190);
  }

  loads(idPayPad: number): Observable<Load[]> {
    return fake((dataset().loads.get(idPayPad) ?? []) as Load[], 190);
  }

  subscriptions(idPayPad: number): Observable<Subscription[]> {
    return fake(dataset().subs.get(idPayPad) ?? [], 140);
  }

  offices(): Observable<Office[]> {
    return fake(MOCK_OFFICES, 90);
  }

  clients(): Observable<Client[]> {
    return fake(MOCK_CLIENTS, 90);
  }
}

/**
 * Simula `AuthController` + seguridad. `login` valida contra `MOCK_DEMO_ACCOUNTS`
 * y devuelve un JWT `alg:none` con `exp`, para que expiración/guardas/menú por rol
 * funcionen igual que contra producción.
 */
@Injectable({ providedIn: 'root' })
export class MockSecurityAdapter extends SecurityPort {
  private sessionUser: User | null = null;

  login(request: LoginRequest): Observable<string> {
    const userName = request.userName.trim().toLowerCase();
    const account = MOCK_DEMO_ACCOUNTS[userName];
    if (!account) return throwError(() => new Error('Usuario y/o contraseña incorrecto (modo demo).'));

    const user = MOCK_USERS.find((u) => u.userName?.toLowerCase() === userName);
    if (!user) return throwError(() => new Error('El usuario del demo no está en el catálogo.'));
    this.sessionUser = user;
    return of(fakeJwt(user.idRole)).pipe(delay(280));
  }

  logout(): Observable<boolean> {
    this.sessionUser = null;
    return fake(true, 80);
  }

  loggedUser(): Observable<User | null> {
    return fake(this.sessionUser ?? MOCK_USERS[0] ?? null, 110);
  }

  roleById(id: number): Observable<Role | null> {
    return fake(MOCK_ROLES.find((r) => r.id === id) ?? null, 90);
  }

  roles(): Observable<Role[]> {
    return fake(MOCK_ROLES, 120);
  }

  permissions(): Observable<Permission[]> {
    return fake(MOCK_PERMISSIONS, 70);
  }

  /** El menú del demo depende del rol con el que se entró, como en producción. */
  loggedRoutes(): Observable<RouteNode[]> {
    const role = MOCK_ROLES.find((r) => r.id === (this.sessionUser ?? MOCK_USERS[0])?.idRole);
    return fake(role?.routes ?? MOCK_ROUTES, 130);
  }

  users(): Observable<User[]> {
    return fake(MOCK_USERS, 150);
  }

  usersByRole(idRole: number): Observable<User[]> {
    return fake(MOCK_USERS.filter((u) => u.idRole === idRole), 150);
  }
}

/** JWT con las mismas claims que `TokenBL.BuildJwtSecurityToken` (`Document`, `UserName`). */
function fakeJwt(idRole: number): string {
  const header = base64Url(JSON.stringify({ alg: 'none', typ: 'JWT' }));
  const payload = base64Url(
    JSON.stringify({
      Document: MOCK_USERS.find((u) => u.idRole === idRole)?.document ?? '1000000',
      UserName: MOCK_USERS.find((u) => u.idRole === idRole)?.userName ?? 'demo',
      exp: Math.floor(Date.now() / 1000) + 8 * 3600
    })
  );
  // `alg: none` => firma vacía; sólo se usa para hidratar el estado del cliente.
  return `${header}.${payload}.`;
}

function base64Url(value: string): string {
  return btoa(unescape(encodeURIComponent(value)))
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}
