import { Pipe, PipeTransform } from '@angular/core';

export type DatePreset = 'short' | 'date' | 'time' | 'dayMonth' | 'full';

const OPTIONS: Record<DatePreset, Intl.DateTimeFormatOptions> = {
  short: { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' },
  date: { day: '2-digit', month: '2-digit', year: 'numeric' },
  time: { hour: '2-digit', minute: '2-digit' },
  dayMonth: { day: '2-digit', month: 'short' },
  full: { dateStyle: 'medium', timeStyle: 'short' }
};

/** Formato único para todo el dashboard (es-CO, zona Bogotá por defecto). */
@Pipe({ name: 'uiDate', standalone: true, pure: true })
export class UiDatePipe implements PipeTransform {
  transform(value: string | Date | null | undefined, preset: DatePreset = 'short', timeZone = 'America/Bogota'): string {
    if (!value) return '—';
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return '—';
    return new Intl.DateTimeFormat('es-CO', { ...OPTIONS[preset], timeZone }).format(date);
  }
}
