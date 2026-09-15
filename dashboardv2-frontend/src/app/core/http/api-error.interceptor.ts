import { HttpErrorResponse, type HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Observable, catchError, throwError } from 'rxjs';

import { ApiRequestError } from './api-error.model';
import { AuthService } from '../services/auth.service';
import { NotificationService } from '../services/notification.service';

/**
 * Manejo global de errores: 401 cierra la sesión y redirige, 403/5xx avisan,
 * 404 se propaga silencioso porque el backend lo usa como "sin resultados".
 */
export const apiErrorInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const notifications = inject(NotificationService);

  return next(req).pipe(
    catchError((err: unknown): Observable<never> => {
      if (err instanceof HttpErrorResponse) {
        const error = ApiRequestError.from(err, req.url);
        if (error.status === 401) {
          notifications.warn('Sesión expirada', 'Vuelve a autenticarte para continuar consultando.');
          auth.expire();
        } else if (error.status === 403) {
          notifications.error('Permiso insuficiente', error.message);
        } else if (error.status >= 500) {
          notifications.error('Error del servidor', error.message);
        } else if (!error.notFound) {
          notifications.error('No se pudo completar la consulta', error.message);
        }
        return throwError(() => error);
      }
      return throwError(() => err);
    })
  );
};
