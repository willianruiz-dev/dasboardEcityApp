import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { ApiPath } from '../../core/config/api-paths';
import { ApiClientService } from '../../core/http/api-client.service';
import { SecurityPort } from '../../core/ports/security.port';
import type { LoginRequest, Permission, Role, RouteNode, User } from '../../core/models/security.model';

/** Adapter real: `AuthController`, `UserController`, `RoleController`, `PermissionController`, `RouteController`. */
@Injectable({ providedIn: 'root' })
export class HttpSecurityAdapter extends SecurityPort {
  private readonly api = inject(ApiClientService);

  override login(request: LoginRequest): Observable<string> {
    return this.api.postQuery<string>(ApiPath.auth.login, request, { emptyValue: '' });
  }

  /** `Auth/Logout` es GET: revoca la sesión en `security.Session`. */
  override logout(): Observable<boolean> {
    return this.api.get<boolean>(ApiPath.auth.logout, { emptyValue: false });
  }

  override loggedUser(): Observable<User | null> {
    return this.api.get<User | null>(ApiPath.user.logged, { emptyValue: null });
  }

  override roleById(id: number): Observable<Role | null> {
    return this.api.get<Role | null>(ApiPath.role.byId(id), { emptyValue: null });
  }

  override roles(): Observable<Role[]> {
    return this.api.get<Role[]>(ApiPath.role.all, { emptyValue: [] });
  }

  override permissions(): Observable<Permission[]> {
    return this.api.get<Permission[]>(ApiPath.permission.all, { emptyValue: [] });
  }

  override loggedRoutes(): Observable<RouteNode[]> {
    return this.api.get<RouteNode[]>(ApiPath.route.logged, { emptyValue: [] });
  }

  override users(): Observable<User[]> {
    return this.api.get<User[]>(ApiPath.user.all, { emptyValue: [] });
  }

  override usersByRole(idRole: number): Observable<User[]> {
    return this.api.get<User[]>(ApiPath.user.byRole(idRole), { emptyValue: [] });
  }
}
