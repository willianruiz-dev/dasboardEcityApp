import { Observable, delay, of, throwError } from 'rxjs';

/** Latencia simulada para que los skeletons/estados de carga se vean como contra la API real. */
export function fake<T>(value: T, ms = 180): Observable<T> {
  return of(value).pipe(delay(ms));
}

/** Error simulado con el mismo shape que `ApiRequestError` de la capa HTTP. */
export function fakeError(message: string, ms = 200): Observable<never> {
  return throwError(() => new Error(message)).pipe(delay(ms)) as Observable<never>;
}
