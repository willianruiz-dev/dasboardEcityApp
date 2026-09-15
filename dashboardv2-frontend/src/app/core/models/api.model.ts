/**
 * Envelope devuelto por `BaseController.GetResponseAsync`:
 * `{ statusCode, message, response }`, y el HTTP status coincide con `statusCode`.
 */
export interface ApiEnvelope<T> {
  statusCode: number;
  message: string;
  response: T;
}

/** Estado genérico de una consulta, usado por las señales de los componentes. */
export type RequestStatus = 'idle' | 'loading' | 'success' | 'error';

export interface QueryState<T> {
  status: RequestStatus;
  data: T;
  error: string | null;
  /** true cuando la API respondió 404 == "No se encontró resultado" (no es un error duro). */
  empty: boolean;
  fetchedAt: number | null;
}

export function newQueryState<T>(data: T): QueryState<T> {
  return { status: 'idle', data, error: null, empty: false, fetchedAt: null };
}
