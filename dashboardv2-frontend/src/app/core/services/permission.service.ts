import { Injectable, computed, inject, signal } from '@angular/core';

import { hasAny, isSuperUser, readOnlyViewAllowed } from '../logic/permission.logic';
import type { AccessRight } from '../models/security.model';
import { AuthService } from './auth.service';

/**
 * Vistas disponibles en este SPA. Cada una declara qué permiso de LECTURA exige.
 * No existe ninguna vista de escritura: el producto es de consultas.
 */
export const READ_VIEWS = {
  overview: ['ReadTransactions', 'ReadPayPads'],
  sales: ['ReadTransactions'],
  analytics: ['ReadTransactions'],
  machines: ['ReadPayPads'],
  storages: ['ReadTonnagesAndLoads'],
  users: ['ReadUsers'],
  security: ['ReadRoles']
} as const satisfies Record<string, readonly AccessRight[]>;

export type ViewKey = keyof typeof READ_VIEWS;

@Injectable({ providedIn: 'root' })
export class PermissionService {
  private readonly auth = inject(AuthService);

  /** El backend autoriza por `role.Permissions`; se refresca tras `/Role/{id}`. */
  private readonly override = signal<AccessRight[] | null>(null);

  readonly rights = computed<AccessRight[]>(() => this.override() ?? this.auth.permissions());
  readonly isRoot = computed(() => isSuperUser(this.auth.user()));

  readonly can = computed(() => {
    const user = this.auth.user();
    const rights = this.rights();
    const map = {} as Record<ViewKey, boolean>;
    (Object.keys(READ_VIEWS) as ViewKey[]).forEach((key) => {
      map[key] = readOnlyViewAllowed(user, rights, [...READ_VIEWS[key]]);
    });
    return map;
  });

  has(required: readonly AccessRight[]): boolean {
    return hasAny(this.auth.user(), this.rights(), [...required]);
  }

  hasView(key: ViewKey): boolean {
    return this.can()[key];
  }

  /** Inyección de permisos desde la API (Response de `/Role/{id}` o `/Permission`). */
  sync(rights: AccessRight[]): void {
    this.override.set(rights.length > 0 ? rights : null);
  }

  reset(): void {
    this.override.set(null);
  }
}
