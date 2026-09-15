import { inject } from '@angular/core';
import { Router, type CanActivateFn, type UrlTree } from '@angular/router';

import { READ_VIEWS, PermissionService, type ViewKey } from '../services/permission.service';
import { NotificationService } from '../services/notification.service';
import type { AccessRight } from '../models/security.model';

/** Ruta física de cada vista; sirve para redirigir cuando el rol no puede ver la solicitada. */
export const VIEW_PATHS: Record<ViewKey, string> = {
  overview: '/dashboard',
  sales: '/dashboard/sales',
  analytics: '/dashboard/analytics',
  machines: '/dashboard/machines',
  storages: '/dashboard/machines',
  users: '/dashboard/users',
  security: '/dashboard/security'
};

/**
 * `permissionGuard(['ReadTransactions'])` — compara con `security.Role.permissions`.
 * Si el rol no puede leer la vista, redirige a la primera vista que sí puede.
 */
export function permissionGuard(required: readonly AccessRight[], view?: ViewKey): CanActivateFn {
  return (): boolean | UrlTree => {
    const permissions = inject(PermissionService);
    const router = inject(Router);

    if (permissions.has(required)) return true;

    inject(NotificationService).warn('Vista restringida', `Tu rol no tiene ${required.join(' / ')}: se abre una consulta disponible.`);
    return router.createUrlTree(firstAllowedPath(permissions, view));
  };
}

/** Variante que toma los permisos de la matriz `READ_VIEWS` (evita literales en las rutas). */
export function permissionViewGuard(view: ViewKey): CanActivateFn {
  return permissionGuard([...(READ_VIEWS[view] ?? [])], view);
}

/** Primera vista legible para el rol: destino del "inicio" y de las redirecciones por permiso. */
export function firstAllowedPath(permissions: PermissionService, exclude?: ViewKey): string[] {
  const order: ViewKey[] = ['sales', 'overview', 'analytics', 'machines', 'users', 'security'];
  const map = permissions.can();
  const hit = order.find((key) => key !== exclude && map[key]);
  return [hit ? VIEW_PATHS[hit] : '/dashboard'];
}

/** `/dashboard` (raíz) aterriza en lo primero que el rol puede consultar. */
export const dashboardEntryGuard: CanActivateFn = (): boolean | UrlTree => {
  const permissions = inject(PermissionService);
  const router = inject(Router);
  return permissions.can().overview ? true : router.createUrlTree(firstAllowedPath(permissions, 'overview'));
};
