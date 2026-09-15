import type { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { throwError } from 'rxjs';

import { isReadOnlyAllowed, readOnlyViolationMessage } from '../logic/readonly-policy.logic';
import { AppConfigService } from '../config/app-config.service';
import { NotificationService } from '../services/notification.service';
import { ReadOnlyViolationError } from './api-error.model';

/**
 * LA BARRERA DE SOLO LECTURA.
 *
 * Requisito del negocio: este dashboard **no puede modificar producción**.
 * `PermissionMiddleware` autoriza por acción, pero un `ReadTransactions` también
 * podría golpear `POST Transaction/Paypad` si fabrica la petición a mano. Aquí se
 * garantiza que desde el SPA jamás sale una mutación:
 *
 *  - `GET / HEAD / OPTIONS` → permitidos.
 *  - `POST` → sólo las rutas de `READ_ONLY_QUERY_POST` (consultas que el backend
 *             modeló con cuerpo: rango de fechas, export Excel) y `Auth/Login`.
 *  - `PUT / PATCH / DELETE` → bloqueados en el cliente; la petición no se envía.
 *
 * No reemplaza la autorización del servidor: es defensa en profundidad y, sobre todo,
 * una prueba auditable de que el frente es inocuo.
 */
export const readOnlyGuardInterceptor: HttpInterceptorFn = (req, next) => {
  const config = inject(AppConfigService);
  if (!config.readOnly || isReadOnlyAllowed(req.method, req.url)) return next(req);

  const error = new ReadOnlyViolationError(req.method, req.url);
  console.error('[read-only] petición bloqueada:', readOnlyViolationMessage(req.method, req.url));
  inject(NotificationService).error(
    'Escritura bloqueada',
    `${req.method} ${shorten(req.url)} · este dashboard sólo realiza consultas de lectura.`
  );
  return throwError(() => error);
};

function shorten(url: string): string {
  const path = url.replace(/^https?:\/\/[^/]+/i, '').split('?')[0] as string;
  return path.length > 42 ? `…${path.slice(-40)}` : path;
}
