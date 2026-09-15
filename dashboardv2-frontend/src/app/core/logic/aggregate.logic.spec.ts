import { deltaPercent, isSettled, summarize } from './aggregate.logic';
import type { Transaction } from '../models/transactions.model';

const trx = (partial: Partial<Transaction>): Transaction => ({
  id: 1,
  document: null,
  reference: 'R1',
  product: 'Recarga celular',
  totalAmount: 10_000,
  realAmount: 10_000,
  incomeAmount: 10_000,
  returnAmount: 0,
  description: null,
  idStateTransaction: 1,
  stateTransaction: 'Completada',
  idTypeTransaction: 1,
  typeTransaction: 'Autoventa',
  idTypePayment: 1,
  typePayment: 'Efectivo',
  idPayPad: 1,
  payPad: 'PAYP-A',
  dateCreated: '2026-09-10T12:00:00.000Z',
  dateUpdated: null,
  userCreated: 'lruiz',
  ...partial
});

describe('aggregate.logic', () => {
  it('no cuenta dinero de transacciones anuladas o rechazadas', () => {
    const summary = summarize([trx({ id: 1 }), trx({ id: 2, totalAmount: 50_000, stateTransaction: 'Anulada', incomeAmount: 0, returnAmount: 50_000 })]);
    expect(summary.totalBilled).toBe(10_000);
    expect(summary.totalReturned).toBe(50_000);
    expect(summary.transactions.length).toBe(2);
  });

  it('isSettled entiende los estados en español y en inglés', () => {
    expect(isSettled(trx({ stateTransaction: 'Completada' }))).toBeTrue();
    expect(isSettled(trx({ stateTransaction: 'Rechazada' }))).toBeFalse();
    expect(isSettled(trx({ stateTransaction: 'Cancelled' }))).toBeFalse();
  });

  it('ranking de máquinas con share acumulado al 100%', () => {
    const summary = summarize([trx({ id: 1 }), trx({ id: 2, idPayPad: 2, payPad: 'PAYP-B', totalAmount: 30_000, incomeAmount: 30_000 })]);
    expect(summary.machines.length).toBe(2);
    expect(summary.machines[0].billed).toBe(30_000);
    expect(Math.round(summary.machines.reduce((acc, m) => acc + m.share, 0))).toBe(100);
  });

  it('deltaPercent no divide por cero', () => {
    expect(deltaPercent(150, 100)).toBe(50);
    expect(deltaPercent(1, 0)).toBeUndefined();
  });
});
