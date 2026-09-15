import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

import { IconComponent } from '../icon/icon.component';

/** Estado de error recuperable: siempre ofrece reintento, nunca deja la vista en blanco. */
@Component({
  selector: 'ui-error-state',
  standalone: true,
  imports: [IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex flex-col items-start gap-3 rounded-xl border border-rose-200 bg-rose-50/70 p-4 dark:border-rose-500/25 dark:bg-rose-500/5 sm:flex-row sm:items-center">
      <span class="rounded-lg bg-rose-100 p-2 text-rose-600 dark:bg-rose-500/15 dark:text-rose-300">
        <ui-icon name="alert" [size]="18" />
      </span>
      <div class="min-w-0 flex-1">
        <p class="text-sm font-semibold text-rose-800 dark:text-rose-200">{{ title() }}</p>
        <p class="mt-0.5 break-words text-xs text-rose-700/80 dark:text-rose-300/80">{{ message() }}</p>
        @if (hint()) {
          <p class="mt-1 text-[11px] text-rose-700/70 dark:text-rose-300/60">{{ hint() }}</p>
        }
      </div>
      @if (showRetry()) {
        <button type="button" class="btn bg-white text-rose-700 ring-1 ring-rose-200 hover:bg-rose-100 dark:bg-rose-500/10 dark:text-rose-200 dark:ring-rose-500/30" (click)="retry.emit()">
          <ui-icon name="refresh" [size]="14" />
          Reintentar
        </button>
      }
    </div>
  `
})
export class ErrorStateComponent {
  readonly title = input('La consulta falló');
  readonly message = input.required<string>();
  readonly hint = input<string | null>(null);
  readonly showRetry = input(true);
  readonly retry = output<void>();
}
