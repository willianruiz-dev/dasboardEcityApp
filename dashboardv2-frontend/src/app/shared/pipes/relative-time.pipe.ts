import { Pipe, PipeTransform } from '@angular/core';

const UNITS: Array<[Intl.RelativeTimeFormatUnit, number]> = [
  ['year', 31_536_000_000],
  ['month', 2_592_000_000],
  ['day', 86_400_000],
  ['hour', 3_600_000],
  ['minute', 60_000]
];

/** "hace 3 h" / "en 2 días" — usado por el chip de frescura de cada consulta. */
@Pipe({ name: 'relative', standalone: true, pure: true })
export class RelativeTimePipe implements PipeTransform {
  transform(value: string | number | Date | null | undefined): string {
    if (value == null) return 'nunca';
    const time = value instanceof Date ? value.getTime() : typeof value === 'number' ? value : Date.parse(value);
    if (Number.isNaN(time)) return '—';
    const diff = time - Date.now();
    const formatter = new Intl.RelativeTimeFormat('es-CO', { numeric: 'auto' });
    for (const [unit, ms] of UNITS) {
      if (Math.abs(diff) >= ms) return formatter.format(Math.round(diff / ms), unit);
    }
    return 'hace un momento';
  }
}
