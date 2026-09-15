import type { HttpErrorResponse } from '@angular/common/http';

/** Error canónico de la capa de datos: lo que entiende la UI. */
export class ApiRequestError extends Error {
  readonly status: number;
  readonly path: string;
  /** true => la API respondió 404 "No se encontró resultado": es un vacío, no una falla. */
  readonly notFound: boolean;
  readonly code: number | null;

  constructor(message: string, status = 0, path = '', notFound = false, code: number | null = null) {
    super(message);
    this.name = 'ApiRequestError';
    this.status = status;
    this.path = path;
    this.notFound = notFound;
    this.code = code;
  }

  static from(response: HttpErrorResponse, fallbackPath = ''): ApiRequestError {
    const path = response.url?.split('/api/')?.[1] ?? fallbackPath;
    const raw: { message?: string; statusCode?: number } | null =
      typeof response.error === 'string' ? { message: response.error } : ((response.error ?? null) as { message?: string; statusCode?: number } | null);
    const message = raw?.message;

    if (response.status === 0)
      return new ApiRequestError(
        `No hay conexión con el API del dashboard (${fallbackPath || path || response.url || 'sin URL'}). ` +
          `Revisa: 1) VPN activa, 2) https://apidashboardv2.e-city.co/swagger abre en tu navegador, 3) si pruebas en localhost usa proxy (npm run start:api:prod).`,
        0,
        path
      );
    if (response.status === 401) return new ApiRequestError(message ?? 'Sesión expirada. Vuelve a iniciar sesión.', 401, path);
    if (response.status === 403) return new ApiRequestError(message ?? 'Tu rol no tiene permisos para este recurso.', 403, path);
    if (response.status === 404) return new ApiRequestError('Sin resultados para la consulta.', 404, path, true, numberOrNull(raw?.statusCode));
    return new ApiRequestError(message ?? `El servidor respondió ${response.status}.`, response.status, path, false, numberOrNull(raw?.statusCode));
  }

  /** Código numérico que la API incrusta en el mensaje (`"3: No se encontró resultado"` -> 3). */
  static embeddedCode(message: string): number | null {
    const match = /^(\d+):/.exec(message.trim());
    return match ? Number(match[1]) : null;
  }
}

/** Bloqueo local: el dashboard es de solo lectura y el intento de escritura no se envió. */
export class ReadOnlyViolationError extends Error {
  readonly method: string;
  readonly target: string;

  constructor(method: string, target: string) {
    super(`Operación bloqueada por la política de solo lectura: ${method} ${target}`);
    this.name = 'ReadOnlyViolationError';
    this.method = method;
    this.target = target;
  }
}

function numberOrNull(value: unknown): number | null {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}
