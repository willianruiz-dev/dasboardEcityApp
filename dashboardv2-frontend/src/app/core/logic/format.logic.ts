import type { MachineStatus } from '../models/machines.model';

/** Etiquetas de estado usadas por badges y filtros. */
export const TRANSACTION_STATES = ['Completada', 'Pendiente', 'Anulada', 'Rechazada'] as const;

export type Tone = 'neutral' | 'positive' | 'negative' | 'warning' | 'info';

export function stateTone(state: string | null): Tone {
  const s = (state ?? '').toLowerCase();
  if (s.includes('complet') || s.includes('exitos') || s.includes('ok')) return 'positive';
  if (s.includes('pendi') || s.includes('proceso')) return 'warning';
  if (s.includes('anul') || s.includes('rechaz') || s.includes('fallid')) return 'negative';
  return 'neutral';
}

export function machineStatusOf(status: number): MachineStatus {
  if (status === 1) return 'active';
  if (status === 0) return 'inactive';
  return 'unknown';
}

export function machineStatusLabel(status: MachineStatus): string {
  return status === 'active' ? 'Activa' : status === 'inactive' ? 'Inactiva' : 'Sin datos';
}

/** COP sin decimales; otras monedas con 2. Se apoya en Intl, no en librerías externas. */
export function formatMoney(value: number, currency = 'COP'): string {
  const decimals = currency === 'COP' ? 0 : 2;
  try {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency,
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    }).format(value);
  } catch {
    return `$ ${value.toFixed(decimals)}`;
  }
}

/** `1.2 M`, `845 K` para tarjetas de KPI donde el espacio manda. */
export function compactMoney(value: number): string {
  return new Intl.NumberFormat('es-CO', { notation: 'compact', maximumFractionDigits: 1 }).format(value);
}

export function formatPercent(value: number, digits = 1): string {
  return `${value.toFixed(digits)}%`;
}

export function maskDocument(document: string | null): string {
  if (!document) return '—';
  const digits = document.replace(/\D/g, '');
  if (digits.length <= 4) return digits;
  return `${digits.slice(0, 2)}.***.${digits.slice(-3)}`;
}

export function initials(user: { name?: string | null; lastName?: string | null; userName?: string | null }): string {
  const first = (user.name ?? user.userName ?? '?').trim();
  const last = (user.lastName ?? '').trim();
  return `${first.charAt(0)}${last.charAt(0) || first.charAt(1) || ''}`.toUpperCase();
}
