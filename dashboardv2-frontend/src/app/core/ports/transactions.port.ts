import { Observable } from 'rxjs';

import type { ExcelExportRequest, MachineDateRangeQuery, Transaction, TransactionDetail, TransactionRating } from '../models/transactions.model';

/**
 * PUERTO de la capa de dominio: lo que el dashboard necesita saber.
 * Deliberadamente NO tiene `create/update/delete`: es un contrato de consulta.
 * `data/http` y `data/mock` lo implementan; las features sólo hablan con esta interfaz.
 */
export abstract class TransactionsPort {
  /** `GET api/Transaction/{idPaypad}` — historial completo de una máquina. */
  abstract byMachine(idPayPad: number): Observable<Transaction[]>;

  /** `POST api/Transaction/GetByDate` — la consulta fuerte: máquina + rango de fechas. */
  abstract byMachineAndDate(query: MachineDateRangeQuery): Observable<Transaction[]>;

  /** `GET api/Transaction` — todas las máquinas (fresco para el panorama general). */
  abstract all(): Observable<Transaction[]>;

  /** `GET api/Transaction/{id}/Details` — billetes/monedas de una transacción. */
  abstract details(idTransaction: number): Observable<TransactionDetail[]>;

  /** `GET api/Transaction/{id}/Rating` */
  abstract rating(idTransaction: number): Observable<TransactionRating | null>;

  /** `POST api/Transaction/ExcelDoc` — exportación oficial del backend (no se arma en cliente). */
  abstract exportExcel(request: ExcelExportRequest): Observable<Blob>;

  /**
   * Evidencia en video (`GET api/Transaction/Video?idPaypad=&idTransaction=`).
   * Devuelve un objectURL porque el endpoint exige la cabecera `Authorization`.
   */
  abstract videoBlobUrl(idPayPad: number, idTransaction: number): Observable<string>;
}
