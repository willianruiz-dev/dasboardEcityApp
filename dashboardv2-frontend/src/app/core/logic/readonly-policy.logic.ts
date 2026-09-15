import { READ_ONLY_QUERY_POST } from '../config/api-paths';

/** Verbos que el SPA nunca debe enviar (mutaciones del backend). */
export const BLOCKED_METHODS: readonly string[] = ['PUT', 'PATCH', 'DELETE', 'TRACE', 'CONNECT'];

/**
 * Política de solo lectura, como función pura para poder probarla sin Angular.
 *
 * El API .NET modeló dos búsquedas con `POST` (rango de fechas y export Excel), por eso
 * no basta con "sólo GET": se compara la ruta contra `READ_ONLY_QUERY_POST`, que es la
 * lista corta y auditable de endpoints que **leen**.
 */
export function isReadOnlyAllowed(method: string, url: string): boolean {
  const verb = method.toUpperCase();
  if (verb === 'GET' || verb === 'HEAD' || verb === 'OPTIONS') return true;
  if (BLOCKED_METHODS.includes(verb)) return false;
  if (verb !== 'POST') return false;
  const path = normalizePath(url);
  return READ_ONLY_QUERY_POST.some((allowed) => path.endsWith(allowed.toLowerCase()));
}

/** Motivo legible para el log/toast cuando se bloquea una petición. */
export function readOnlyViolationMessage(method: string, url: string): string {
  return `Operación bloqueada por la política de solo lectura: ${method.toUpperCase()} ${normalizePath(url)}`;
}

function normalizePath(url: string): string {
  return url
    .replace(/^https?:\/\/[^/]+/i, '')
    .split('?')[0]!
    .replace(/^\/+/, '')
    .toLowerCase();
}
