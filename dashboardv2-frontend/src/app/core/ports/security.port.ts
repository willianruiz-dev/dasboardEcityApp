import { Observable } from 'rxjs';

import type { LoginRequest, Permission, Role, RouteNode, User } from '../models/security.model';

/** Autenticación y catálogo de seguridad (roles/permisos/rutas). Sólo lectura + login. */
export abstract class SecurityPort {
  /** Resuelve el JWT emitido por `AuthBL.Login`. */
  abstract login(request: LoginRequest): Observable<string>;
  abstract logout(): Observable<boolean>;
  abstract loggedUser(): Observable<User | null>;
  abstract roleById(id: number): Observable<Role | null>;
  abstract roles(): Observable<Role[]>;
  abstract permissions(): Observable<Permission[]>;
  /** Menú asignado al rol (`GET api/Route/GetLoggedRoutes`). */
  abstract loggedRoutes(): Observable<RouteNode[]>;
  abstract users(): Observable<User[]>;
  abstract usersByRole(idRole: number): Observable<User[]>;
}
