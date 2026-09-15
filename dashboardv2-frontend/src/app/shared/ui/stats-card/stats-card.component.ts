import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import { compactMoney, formatPercent } from '../../../core/logic/format.logic';
import type { StatCard, StatFormat, StatTone } from '../../../core/models/dashboard.model';
import { IconComponent } from '../icon/icon.component';

const TONE_TEXT: Record<StatTone, string> = {
  neutral: 'text-slate-500 dark:text-slate-400',
  positive: 'text-accent-600 dark:text-accent-400',
  negative: 'text-rose-600 dark:text-rose-400',
  warning: 'text-amber-600 dark:text-amber-400'
};

/**
 * Tarjeta de KPI: valor formateado, variación vs. periodo anterior y sparkline opcional.
 * Presentación pura: no sabe de API ni de dominios.
 */
@Component({
  selector: 'ui-stats-card',
  standalone: true,
  imports: [IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <article class="card group relative overflow-hidden p-4 transition hover:shadow-lift sm:p-5">
      @if (loading()) {
        <div class="space-y-3">
          <div class="skeleton h-3 w-24"></div>
          <div class="skeleton h-8 w-32"></div>
          <div class="skeleton h-3 w-20"></div>
        </div>
      } @else {
        <div class="flex items-start justify-between gap-3">
          <p class="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">{{ label() }}</p>
          @if (icon()) {
            <span class="rounded-lg bg-slate-100 p-1.5 text-slate-500 transition group-hover:bg-brand-50 group-hover:text-brand-600 dark:bg-slate-800 dark:text-slate-400 dark:group-hover:bg-brand-500/10 dark:group-hover:text-brand-300">
              <ui-icon [name]="$any(icon())" [size]="15" />
            </span>
          }
        </div>

        <p class="tabular mt-2 text-2xl font-semibold tracking-tight text-slate-900 dark:text-white sm:text-[26px]" [title]="fullValue()">
          {{ display() }}
        </p>

        <div class="mt-1.5 flex items-end justify-between gap-3">
          <div class="flex items-center gap-1.5 text-xs">
            @if (delta() != null) {
              <span class="tabular inline-flex items-center gap-0.5 font-semibold" [class]="deltaTone()">
                <ui-icon [name]="delta()! >= 0 ? 'trend' : 'minus'" [size]="13" [strokeWidth]="2" />
                {{ (delta()! >= 0 ? '+' : '') + delta()!.toFixed(1) + '%' }}
              </span>
            }
            @if (hint()) {
              <span class="truncate text-slate-400 dark:text-slate-500">{{ hint() }}</span>
            }
          </div>

          @if (series() && series()!.length > 1) {
            <svg class="h-8 w-24 text-brand-500/80 dark:text-brand-400/80" viewBox="0 0 100 32" preserveAspectRatio="none" aria-hidden="true">
              <polyline
                [attr.points]="sparkline()"
                fill="none"
                stroke="currentColor"
                stroke-width="1.8"
                stroke-linejoin="round"
                stroke-linecap="round"
                vector-effect="non-scaling-stroke"
              />
            </svg>
          }
        </div>
      }
    </article>
  `
})
export class StatsCardComponent {
  readonly label = input.required<string>();
  readonly value = input<number | string>(0);
  readonly hint = input<string | null>(null);
  readonly delta = input<number | undefined>(undefined);
  readonly format = input<StatFormat>('number');
  readonly tone = input<StatTone>('neutral');
  readonly icon = input<string | null>(null);
  readonly currency = input('COP');
  readonly series = input<readonly number[] | undefined>(undefined);
  readonly loading = input(false);

  /** Atajo para pintar una tarjeta ya calculada en el servicio. */
  readonly card = input<StatCard | null>(null);

  protected readonly display = computed(() => {
    const source = this.card();
    const raw = source ? source.value : this.value();
    const format = source?.format ?? this.format();
    if (typeof raw === 'string') return raw;
    switch (format) {
      case 'money':
        return this.compact() ? compactMoney(raw) : new Intl.NumberFormat('es-CO', { style: 'currency', currency: this.currency(), maximumFractionDigits: 0 }).format(raw);
      case 'percent':
        return formatPercent(raw);
      case 'duration':
        return `${raw} min`;
      default:
        return new Intl.NumberFormat('es-CO').format(raw);
    }
  });

  protected readonly fullValue = computed(() => this.display());
  protected readonly deltaTone = computed(() => {
    const d = this.delta() ?? 0;
    return d >= 0 ? TONE_TEXT.positive : TONE_TEXT.negative;
  });

  /** `series` normalizada a un viewBox de 100x32. */
  protected readonly sparkline = computed(() => {
    const data = this.series() ?? [];
    if (data.length < 2) return '';
    const min = Math.min(...data);
    const max = Math.max(...data);
    const span = max - min || 1;
    return data
      .map((value, index) => {
        const x = (index / (data.length - 1)) * 100;
        const y = 30 - ((value - min) / span) * 26;
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(' ');
  });

  private compact(): boolean {
    const raw = this.card() ? Number(this.card()?.value) : Number(this.value());
    return Number.isFinite(raw) && Math.abs(raw) >= 1_000_000 && this.currency() === 'COP';
  }
}
