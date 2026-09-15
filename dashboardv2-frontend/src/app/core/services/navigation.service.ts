import { Injectable, computed, inject } from '@angular/core';

import { buildMenu, fallbackMenu, type MenuEntry } from '../logic/permission.logic';
import { AuthService } from './auth.service';
import { PermissionService, type ViewKey } from './permission.service';

/** Rutas que este SPA sabe montar. Cualquier otra cosa del `security.Route` del backend se ignora. */
export const KNOWN_PATHS = ['/dashboard', '/dashboard/sales', '/dashboard/analytics', '/dashboard/machines', '/dashboard/users', '/dashboard/security'] as const;

const PATH_TO_VIEW: Readonly<Record<string, ViewKey | undefined>> = {
  '/dashboard': 'overview',
  '/dashboard/sales': 'sales',
  '/dashboard/analytics': 'analytics',
  '/dashboard/machines': 'machines',
  '/dashboard/users': 'users',
  '/dashboard/security': 'security'
};

/**
 * Menú = `GET Route/GetLoggedRoutes` (lo que el rol tiene asignado en la BD)
 * ∩ permisos de lectura ∩ vistas implementadas en este SPA.
 *
 * Así, cuando un administrador cambie las rutas de un rol en el dashboard
 * administrativo, este frente se adapta sin recompilar.
 */
@Injectable({ providedIn: 'root' })
export class NavigationService {
  private readonly auth = inject(AuthService);
  private readonly permissions = inject(PermissionService);

  readonly menu = computed<MenuEntry[]>(() => {
    const allowed = (entry: MenuEntry): boolean => {
      const view = PATH_TO_VIEW[entry.path];
      return view ? this.permissions.can()[view] : entry.children.length > 0;
    };

    const filter = (entries: MenuEntry[]): MenuEntry[] =>
      entries
        .map((entry) => ({ ...entry, children: filter(entry.children) }))
        .filter((entry) => allowed(entry) || entry.children.length > 0);

    const fromBackend = buildMenu(this.auth.routes(), KNOWN_PATHS);
    const menu = filter(fromBackend);
    // Si el rol no tiene ninguna ruta asignada, se ofrece el set base (siempre filtrado por permisos).
    return menu.length > 0 ? menu : filter(fallbackMenu(KNOWN_PATHS));
  });

  /** Título de la ruta activa, para el título del documento y el breadcrumb. */
  readonly titles = computed(() => new Map(this.menu().map((entry) => [entry.path, entry.title])));

  titleFor(path: string): string {
    return this.titles().get(path) ?? 'Dashboard';
  }
}
