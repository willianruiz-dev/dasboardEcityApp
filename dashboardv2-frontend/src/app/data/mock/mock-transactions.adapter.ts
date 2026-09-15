import { Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';

import { MOCK_MACHINES, dataset } from './mock-dataset';
import { fake, fakeError } from './mock.util';
import { TransactionsPort } from '../../core/ports/transactions.port';
import type { ExcelExportRequest, MachineDateRangeQuery, Transaction, TransactionDetail, TransactionRating } from '../../core/models/transactions.model';

/**
 * Simula `TransactionController` sobre el dataset determinista.
 * Respeta las mismas reglas que el backend: 404 -> lista vacía y filtro
 * `[from, to]` comparado contra `dateCreated` en UTC.
 */
@Injectable({ providedIn: 'root' })
export class MockTransactionsAdapter extends TransactionsPort {
  byMachine(idPayPad: number): Observable<Transaction[]> {
    return fake(dataset().byMachine.get(idPayPad) ?? []);
  }

  byMachineAndDate(query: MachineDateRangeQuery): Observable<Transaction[]> {
    if (!query.from || !query.to) return fakeError('No se proporcionó rango de fecha');
    const from = Date.parse(query.from);
    const to = Date.parse(query.to);
    // `id = 0` no lo soporta el SP; en demo sí se puede, y así se ve el mismo contrato.
    const source = query.id > 0 ? (dataset().byMachine.get(query.id) ?? []) : dataset().transactions;
    const rows = source
      .filter((t) => {
        const when = t.dateCreated ? Date.parse(t.dateCreated) : NaN;
        return !Number.isNaN(when) && when >= from && when <= to;
      })
      .sort((a, b) => Date.parse(b.dateCreated ?? '0') - Date.parse(a.dateCreated ?? '0'));
    return fake(rows, 260);
  }

  all(): Observable<Transaction[]> {
    return fake(dataset().transactions, 320);
  }

  details(idTransaction: number): Observable<TransactionDetail[]> {
    return fake(dataset().details.get(idTransaction) ?? [], 120);
  }

  rating(idTransaction: number): Observable<TransactionRating | null> {
    return fake(dataset().ratings.get(idTransaction) ?? null, 120);
  }

  /**
   * En demo no se arma un .xlsx: se serializa el mismo set de columnas que
   * `ExcelBuilder.BuildTransactionReport` y se entrega como CSV.
   */
  exportExcel(request: ExcelExportRequest): Observable<Blob> {
    const rows = (dataset().byMachine.get(request.paypadId) ?? []).filter((t) => request.transactionIds.includes(t.id));
    const header = ['id', 'referencia', 'maquina', 'producto', 'estado', 'total', 'neto', 'devuelto', 'fecha'];
    const csv = [
      header.join(','),
      ...rows.map((t) =>
        [t.id, t.reference, t.payPad, t.product, t.stateTransaction, t.totalAmount, t.incomeAmount, t.returnAmount, t.dateCreated].join(',')
      )
    ].join('\n');
    return fake(new Blob([csv], { type: 'text/csv;charset=utf-8' }), 220);
  }

  /** El video real vive en `C:\dashboardv2_videos` y se sirve con `Authorization`: no hay demo para esto. */
  videoBlobUrl(idPayPad: number, idTransaction: number): Observable<string> {
    const machine = MOCK_MACHINES.find((m) => m.id === idPayPad);
    if (!machine) return fakeError('Máquina inexistente.');
    return fake('')
      .pipe(
        map(() => {
          throw new Error(`Modo demo: la evidencia #${idTransaction} de ${machine.username} no está disponible sin la API real.`);
        })
      )
      .pipe() as Observable<string>;
  }
}
