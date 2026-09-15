import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';

import { ApiPath, buildUrl } from '../../core/config/api-paths';
import { ApiClientService } from '../../core/http/api-client.service';
import { TransactionsPort } from '../../core/ports/transactions.port';
import type { ExcelExportRequest, MachineDateRangeQuery, Transaction, TransactionDetail, TransactionRating } from '../../core/models/transactions.model';

/** Adapter real: habla con `Api_DashboardV2/Controllers/TransactionController.cs`. */
@Injectable({ providedIn: 'root' })
export class HttpTransactionsAdapter extends TransactionsPort {
  private readonly api = inject(ApiClientService);
  private readonly http = inject(HttpClient);

  override byMachine(idPayPad: number): Observable<Transaction[]> {
    return this.api.get<Transaction[]>(ApiPath.transaction.byMachine(idPayPad), { emptyValue: [] });
  }

  override byMachineAndDate(query: MachineDateRangeQuery): Observable<Transaction[]> {
    // 0 = "todas las máquinas": el SP filtra por paypad sólo si id > 0.
    return this.api.postQuery<Transaction[]>(ApiPath.transaction.byMachineAndDate, query, { emptyValue: [] });
  }

  override all(): Observable<Transaction[]> {
    return this.api.get<Transaction[]>(ApiPath.transaction.all, { emptyValue: [] });
  }

  override details(idTransaction: number): Observable<TransactionDetail[]> {
    return this.api.get<TransactionDetail[]>(ApiPath.transaction.details(idTransaction), { emptyValue: [] });
  }

  override rating(idTransaction: number): Observable<TransactionRating | null> {
    return this.api.get<TransactionRating | null>(ApiPath.transaction.rating(idTransaction), { emptyValue: null });
  }

  override exportExcel(request: ExcelExportRequest): Observable<Blob> {
    return this.api.downloadBlob(ApiPath.transaction.excel, request, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  }

  /**
   * `GET api/Transaction/Video` exige `Authorization`, así que un `<a href>` no basta:
   * se descarga como blob y se entrega un objectURL al reproductor del drawer.
   */
  override videoBlobUrl(idPayPad: number, idTransaction: number): Observable<string> {
    const url = buildUrl(`${ApiPath.transaction.video}?idPaypad=${idPayPad}&idTransaction=${idTransaction}`);
    return this.http.get(url, { responseType: 'blob', observe: 'response' }).pipe(
      map((response) => {
        const blob = response.body;
        if (!blob || blob.size === 0) throw new Error('La evidencia en video ya fue rotada o no existe.');
        return URL.createObjectURL(blob);
      })
    );
  }
}
