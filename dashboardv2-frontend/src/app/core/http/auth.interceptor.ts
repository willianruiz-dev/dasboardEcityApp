import { type HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';

import { AppConfigService } from '../config/app-config.service';
import { AuthService } from '../services/auth.service';

/**
 * Cabeceras obligatorias de cada petición:
 *  - `DashboardKeyId`: la exige `ExceptionMiddleware` (si falta o no coincide → 403).
 *  - `Authorization: Bearer`: JWT de `Auth/Login`. No se adjunta en el propio login
 *    para que un token vencido no ensucie la respuesta.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const config = inject(AppConfigService);
  const auth = inject(AuthService);

  const isLogin = /\/auth\/(login|verifypwd)/i.test(req.url);
  const token = auth.token;

  const headers: Record<string, string> = { [config.keyHeader]: config.dashboardKeyId };
  if (token && !isLogin) headers['Authorization'] = `Bearer ${token}`;

  return next(req.clone({ setHeaders: headers }));
};
