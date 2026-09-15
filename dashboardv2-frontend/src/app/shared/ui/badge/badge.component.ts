import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

export type BadgeTone = 'neutral' | 'positive' | 'negative' | 'warning' | 'info' | 'brand';

const TONES: Record<BadgeTone, string> = {
  neutral: 'bg-slate-100 text-slate-600 ring-slate-200 dark:bg-slate-700/40 dark:text-slate-300 dark:ring-slate-600/50',
  positive: 'bg-accent-50 text-accent-700 ring-accent-500/20 dark:bg-accent-700/15 dark:text-accent-400 dark:ring-accent-500/25',
  negative: 'bg-rose-50 text-rose-700 ring-rose-200 dark:bg-rose-500/10 dark:text-rose-300 dark:ring-rose-500/25',
  warning: 'bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-500/25',
  info: 'bg-sky-50 text-sky-700 ring-sky-200 dark:bg-sky-500/10 dark:text-sky-300 dark:ring-sky-500/25',
  brand: 'bg-brand-50 text-brand-700 ring-brand-200 dark:bg-brand-500/10 dark:text-brand-300 dark:ring-brand-500/25'
};

/** Chip de estado. `stateTone()` en `core/logic/format.logic` decide el color según el estado de la API. */
@Component({
  selector: 'ui-badge',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span
      class="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset whitespace-nowrap"
      [class]="toneClass()"
    >
      @if (dot()) {
        <span class="h-1.5 w-1.5 rounded-full bg-current opacity-70"></span>
      }
      {{ label() }}
    </span>
  `
})
export class BadgeComponent {
  readonly label = input.required<string>();
  readonly tone = input<BadgeTone>('neutral');
  readonly dot = input(false);

  protected readonly toneClass = computed(() => TONES[this.tone()] ?? TONES['neutral']);
}
