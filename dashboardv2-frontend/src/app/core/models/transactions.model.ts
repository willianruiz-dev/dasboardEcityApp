/** Estado según `masters.StateTransaction` (el backend manda el nombre, no el id). */
export type TransactionStateName = 'Completada' | 'Pendiente' | 'Anulada' | 'Rechazada' | (string & {});

/** `Dashboard.Domain.DTOs.TransactionDto`. */
export interface Transaction {
  id: number;
  document: string | null;
  reference: string | null;
  product: string | null;
  totalAmount: number;
  realAmount: number;
  incomeAmount: number;
  returnAmount: number;
  description: string | null;
  idStateTransaction: number;
  stateTransaction: TransactionStateName | null;
  idTypeTransaction: number;
  typeTransaction: string | null;
  idTypePayment: number;
  typePayment: string | null;
  idPayPad: number;
  payPad: string | null;
  dateCreated: string | null;
  dateUpdated: string | null;
  userCreated: string | null;
}

/** Detalle de billetes/monedas (`TransactionDetailDto`). */
export interface TransactionDetail {
  id: number;
  idTransaction: number;
  idCurrencyDenomination: number;
  currencyDenomination: number;
  idTypeOperation: number;
  typeOperation: string | null;
  quantity: number;
  dateCreated: string | null;
}

export interface TransactionRating {
  id: number;
  idTransaction: number;
  rating: number;
  dateCreated: string;
}

/**
 * Cuerpo de `POST Transaction/GetByDate`.
 * El backend hace `DateTime.ParseExact(x, "yyyy-MM-ddTHH:mm:ss.fffZ")`:
 * cualquier otro formato => 400 "No se proporcionó rango de fecha".
 */
export interface MachineDateRangeQuery {
  id: number;
  from: string;
  to: string;
}

/** Cuerpo de `POST Transaction/ExcelDoc` (export de lectura, `PostExcelDoc` pide `ReadTransactions`). */
export interface ExcelExportRequest {
  paypadId: number;
  transactionIds: number[];
  fileName: string;
}
