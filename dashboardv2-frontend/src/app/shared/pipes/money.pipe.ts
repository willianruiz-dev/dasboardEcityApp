import { Pipe, PipeTransform } from '@angular/core';

/** `{{ trx.totalAmount | money }}` → `$ 45.000`. Acepta ISO/localize para decimales. */
@Pipe({ name: 'money', standalone: true, pure: true })
export class MoneyPipe implements PipeTransform {
  transform(value: number | null | undefined, currency = 'COP', decimals = 0): string {
    if (value == null || Number.isNaN(value)) return '—';
    return new Intl.NumberFormat('es-CO', { style: 'currency', currency, minimumFractionDigits: decimals, maximumFractionDigits: decimals }).format(value);
  }
}
