import { ChangeDetectionStrategy, Component, computed, input, model, output, signal } from '@angular/core';

import { RANGE_PRESETS, fromInputDate, presetRange, toInputDate, type DateRange, type RangePresetKey } from '../../../core/logic/date-range.logic';
import { IconComponent } from '../icon/icon.component';

export interface RangeSelection {
  range: DateRange;
  preset: RangePresetKey;
}

/**
 * Selector de rango: presets + fechas explícitas. Emite `DateRange` en UTC, que es
 * lo que `Transaction/GetByDate` exige (`yyyy-MM-ddTHH:mm:ss.fffZ`).
 *
 * No dispara consultas por sí solo: la feature decide cuándo re-corrger
 * (ver `TransactionsQueryService.setRange`), para no castigar la API con un POST
 * por cada tecla.
 */
@Component({
  selector: 'ui-range-picker',
  standalone: true,
  imports: [IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex flex-wrap items-end gap-2">
      <div class="flex flex-wrap gap-1" role="group" aria-label="Rangos rápidos">
        @for (item of presets; track item.key) {
          <button
            type="button"
            class="rounded-lg px-2.5 py-1.5 text-xs font-medium transition"
            [class]="
              item.key === preset()
                ? 'bg-brand-600 text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
            "
            (click)="pickPreset(item.key)"
          >
            {{ item.label }}
          </button>
        }
      </div>

      <label class="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
        <span class="sr-only sm:not-sr-only">Desde</span>
        <input type="date" class="field w-[148px] py-1.5 text-xs" [value]="fromInput()" [max]="toInput()" (change)="onFrom($any($event.target).value)" />
      </label>

      <label class="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
        <span class="sr-only sm:not-sr-only">Hasta</span>
        <input type="date" class="field w-[148px] py-1.5 text-xs" [value]="toInput()" [min]="fromInput()" (change)="onTo($any($event.target).value)" />
      </label>

      <span class="tabular ml-auto hidden items-center gap-1 text-[11px] text-slate-400 sm:inline-flex">
        <ui-icon name="calendar" [size]="13" />
        {{ days() }} día(s) · límites en UTC
      </span>
    </div>
  `
})
export class RangePickerComponent {
  /** Preset inicial/externo: dos vías (`[(preset)]`). */
  readonly preset = model<RangePresetKey>('30d');
  /** Rango controlado desde fuera; si no se pasa, se deriva del preset. */
  readonly externalRange = input<DateRange | null>(null);
  readonly selectionChange = output<RangeSelection>();

  protected readonly presets = RANGE_PRESETS;
  private readonly manual = signal<DateRange | null>(null);

  protected readonly current = computed<DateRange>(() => this.manual() ?? this.externalRange() ?? presetRange(this.preset()));
  protected readonly fromInput = computed(() => toInputDate(this.current().from));
  protected readonly toInput = computed(() => toInputDate(this.current().to));
  protected readonly days = computed(() => Math.floor((this.current().to.getTime() - this.current().from.getTime()) / 86_400_000) + 1);

  protected pickPreset(key: RangePresetKey): void {
    this.manual.set(null);
    this.preset.set(key);
    this.emit(presetRange(key));
  }

  protected onFrom(value: string): void {
    const range = { from: fromInputDate(value), to: this.current().to };
    this.preset.set('custom');
    this.manual.set(range);
    this.emit(range);
  }

  protected onTo(value: string): void {
    const range = { from: this.current().from, to: fromInputDate(value, true) };
    this.preset.set('custom');
    this.manual.set(range);
    this.emit(range);
  }

  private emit(range: DateRange): void {
    this.selectionChange.emit({ range, preset: this.preset() });
  }
}
