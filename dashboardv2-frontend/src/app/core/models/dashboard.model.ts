import type { Transaction } from './transactions.model';

/** Fila de la grilla: transacción + contexto de máquina resuelto en el cliente. */
export interface TransactionRow extends Transaction {
  machineLabel: string;
  office: string | null;
  minuteOfDay: number | null;
}

export type StatTone = 'neutral' | 'positive' | 'negative' | 'warning';
export type StatFormat = 'number' | 'money' | 'percent' | 'text' | 'duration';

export interface StatCard {
  label: string;
  value: number | string;
  hint?: string;
  /** Variación % contra el periodo anterior (para la flecha). */
  delta?: number;
  tone?: StatTone;
  format?: StatFormat;
  /** Mini sparkline opcional. */
  series?: number[];
  /** Nombre del set de `IconComponent`. */
  icon?: string;
}

export interface Bucket {
  label: string;
  total: number;
  count: number;
}

export interface MachineMetric {
  id: number;
  label: string;
  office: string | null;
  transactions: number;
  billed: number;
  netIncome: number;
  cancelled: number;
  successRate: number;
  lastActivity: string | null;
  share: number;
}

export interface TrendPoint {
  label: string;
  iso: string;
  amount: number;
  count: number;
  byState: Record<string, number>;
}

/** Resultado de agregar en memoria la respuesta de la API (la API no expone agregados). */
export interface QuerySummary {
  transactions: Transaction[];
  totalBilled: number;
  totalNet: number;
  totalReturned: number;
  average: number;
  byState: Bucket[];
  byPaymentType: Bucket[];
  byProduct: Bucket[];
  byHour: Bucket[];
  trend: TrendPoint[];
  machines: MachineMetric[];
  peakHour: Bucket | null;
  bestMachine: MachineMetric | null;
  firstDate: string | null;
  lastDate: string | null;
}

export const EMPTY_SUMMARY: QuerySummary = {
  transactions: [],
  totalBilled: 0,
  totalNet: 0,
  totalReturned: 0,
  average: 0,
  byState: [],
  byPaymentType: [],
  byProduct: [],
  byHour: [],
  trend: [],
  machines: [],
  peakHour: null,
  bestMachine: null,
  firstDate: null,
  lastDate: null
};
