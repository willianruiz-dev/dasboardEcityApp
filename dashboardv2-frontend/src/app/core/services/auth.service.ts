import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';

import { AuthSession, type LoginRequest, type Role, type RouteNode, type User } from '../models/security.model';
import { rightsOf } from '../logic/permission.logic';

export const STORAGE_KEY = 'ecity.dashboard.session';

/**
 * Estado de sesión (token JWT + usuario + rol) y su persistencia.
 *
 * Se guarda en `sessionStorage` (no `localStorage`): en un dashboard de producción
 * con datos financieros, cerrar la pestaña invalida el token en el cliente.
 * El JWT del backend expira en 1 día y `AuthBL` lo valida contra `security.Session`,
 * así que el logout real siempre se intenta en el servidor.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly router = inject(Router);

  private readonly _session = signal<AuthSession | null>(this.hydrate());

  readonly session = this._session.asReadonly();
  readonly isAuthenticated = computed(() => {
    const session = this._session();
    if (!session) return false;
    return session.expiresAt == null || session.expiresAt > Date.now();
  });
  readonly user = computed(() => this._session()?.user ?? null);
  readonly role = computed(() => this._session()?.role ?? null);
  readonly permissions = computed(() => this._session()?.permissions ?? []);
  readonly routes = computed(() => this._session()?.routes ?? []);
  readonly roleLabel = computed(() => this._session()?.user.role ?? this._session()?.role?.role ?? '—');

  get token(): string | null {
    const session = this._session();
    if (!session) return null;
    if (session.expiresAt != null && session.expiresAt <= Date.now()) return null;
    return session.token;
  }

  /** Persiste una sesión recién autenticada. */
  open(token: string, user: User, role: Role | null, routes: RouteNode[]): void {
    const session: AuthSession = {
      token,
      expiresAt: expiryFromJwt(token),
      user,
      role,
      permissions: rightsOf(role),
      routes
    };
    this._session.set(session);
    this.persist(session);
  }

  /** Actualiza menú/rol tras cargar `Route/GetLoggedRoutes`. */
  attachSecurity(role: Role | null, routes: RouteNode[]): void {
    const current = this._session();
    if (!current) return;
    const next: AuthSession = {
      ...current,
      role,
      routes,
      permissions: rightsOf(role ?? current.role)
    };
    this._session.set(next);
    this.persist(next);
  }

  close(): void {
    this._session.set(null);
    sessionStorage.removeItem(STORAGE_KEY);
  }

  /** 401 desde el interceptor: tira la sesión y manda al login conservando el destino. */
  expire(): void {
    this.close();
    const currentUrl = this.router.url;
    if (!currentUrl.startsWith('/login')) {
      void this.router.navigate(['/login'], { queryParams: { next: currentUrl } });
    }
  }

  loginRequest(credentials: LoginRequest): void {
    // Punto de extensión para auditoría (hoy se loguea en el backend, no aquí).
    void credentials;
  }

  private persist(session: AuthSession): void {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    } catch {
      // Modo privado / cuota llena: la sesión vive igual en memoria.
    }
  }

  private hydrate(): AuthSession | null {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as AuthSession;
      if (!parsed?.token || !parsed?.user) return null;
      const expired = parsed.expiresAt != null && parsed.expiresAt <= Date.now();
      return expired ? null : parsed;
    } catch {
      return null;
    }
  }
}

/** Lee `exp` del JWT (base64url) sin validarlo: la validación real es del servidor. */
export function expiryFromJwt(token: string): number | null {
  const payload = token.split('.')[1];
  if (!payload) return null;
  try {
    const json = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/'))) as { exp?: number };
    return typeof json.exp === 'number' ? json.exp * 1000 : null;
  } catch {
    return null;
  }
}
