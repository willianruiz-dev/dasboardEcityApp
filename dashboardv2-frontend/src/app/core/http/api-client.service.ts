import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, map, of, throwError } from 'rxjs';

import { buildUrl } from '../config/api-paths';
import type { ApiEnvelope } from '../models/api.model';
import { ApiRequestError } from './api-error.model';

export interface QueryOptions {
  params?: Record<string, string | number | boolean>;
  /** Valor devuelto cuando la API responde 404 ("no se encontró resultado"). */
  emptyValue?: unknown;
}

/**
 * Fachada sobre `HttpClient` que conoce el contrato de Api_DashboardV2:
 *  - arma la URL con `baseUrl` + prefijo `api`
 *  - desenvuelve el envelope `{ statusCode, message, response }`
 *  - traduce 404 a "sin resultados" (el backend lo usa como vacío, no como falla)
 *  - normaliza el resto de errores a `ApiRequestError`
 */
@Injectable({ providedIn: 'root' })
export class ApiClientService {
  private readonly http = inject(HttpClient);

  get<T>(path: string, options: QueryOptions = {}): Observable<T> {
    return this.request<T>('GET', path, undefined, options);
  }

  /**
   * POST semánticamente de lectura (`Transaction/GetByDate`, `Transaction/ExcelDoc`).
   * La ruta debe estar en `READ_ONLY_QUERY_POST`; lo fiscaliza `readOnlyGuardInterceptor`.
   */
  postQuery<T>(path: string, body: unknown, options: QueryOptions = {}): Observable<T> {
    return this.request<T>('POST', path, body, options);
  }

  /** Descarga binaria: `POST Transaction/ExcelDoc` responde un .xlsx. */
  downloadBlob(path: string, body: unknown, accept: string): Observable<Blob> {
    return this.http
      .post(buildUrl(path), body, { responseType: 'blob', headers: { Accept: accept } })
      .pipe(
        catchError((err: unknown) =>
          throwError(() => (err instanceof ApiRequestError ? err : new ApiRequestError('No fue posible descargar el archivo.', 0, path)))
        )
      );
  }

  /** URL absoluta para recursos descargables por <a href> (video de la transacción). */
  absoluteUrl(path: string, params?: Record<string, string | number>): string {
    const query = Object.entries(params ?? {})
      .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`)
      .join('&');
    return `${buildUrl(path)}${query.length > 0 ? `?${query}` : ''}`;
  }

  private request<T>(method: 'GET' | 'POST', path: string, body: unknown, options: QueryOptions): Observable<T> {
    const url = buildUrl(path);
    const config = { params: this.toParams(options.params) };

    const call$ =
      method === 'GET' ? this.http.get<ApiEnvelope<T>>(url, config) : this.http.post<ApiEnvelope<T>>(url, body ?? {}, config);

    return call$.pipe(
      map((envelope) => this.unfold<T>(envelope, options.emptyValue as T)),
      catchError((err: unknown) => {
        const error = err instanceof ApiRequestError ? err : ApiRequestError.from(err as never, path);
        return error.notFound ? of(options.emptyValue as T) : throwError(() => error);
      })
    );
  }

  private unfold<T>(envelope: ApiEnvelope<T> | T, emptyValue: T | undefined): T {
    const maybeEnvelope = envelope as ApiEnvelope<T>;
    if (maybeEnvelope && typeof maybeEnvelope === 'object' && 'response' in maybeEnvelope) {
      const unwrapped = maybeEnvelope.response;
      return unwrapped == null && emptyValue !== undefined ? emptyValue : unwrapped;
    }
    return envelope as T;
  }

  private toParams(params: QueryOptions['params']): HttpParams {
    let httpParams = new HttpParams();
    Object.entries(params ?? {}).forEach(([key, value]) => {
      httpParams = httpParams.set(key, String(value));
    });
    return httpParams;
  }
}
