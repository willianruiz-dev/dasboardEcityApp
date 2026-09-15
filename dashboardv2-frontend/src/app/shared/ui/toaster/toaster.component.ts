import { ChangeDetectionStrategy, Component, inject } from '@angular/core';

import { NotificationService, type Toast } from '../../../core/services/notification.service';
import { IconComponent } from '../icon/icon.component';

const STYLE: Record<Toast['kind'], string> = {
  info: 'border-sky-200 bg-white text-slate-700 dark:border-sky-500/25 dark:bg-slate-900 dark:text-slate-200',
  success: 'border-accent-500/30 bg-white text-slate-700 dark:border-accent-500/25 dark:bg-slate-900 dark:text-slate-200',
  warning: 'border-amber-200 bg-white text-slate-700 dark:border-amber-500/25 dark:bg-slate-900 dark:text-slate-200',
  error: 'border-rose-200 bg-white text-slate-700 dark:border-rose-500/25 dark:bg-slate-900 dark:text-slate-200'
};

const ICON: Record<Toast['kind'], string> = { info: 'info', success: 'check', warning: 'alert', error: 'alert' };
const ACCENT: Record<Toast['kind'], string> = {
  info: 'text-sky-500',
  success: 'text-accent-500',
  warning: 'text-amber-500',
  error: 'text-rose-500'
};

/** Montado una sola vez en `AppComponent`: feedback global de consultas y bloqueos. */
@Component({
  selector: 'app-toaster',
  standalone: true,
  imports: [IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (service.toasts().length > 0) {
      <div class="pointer-events-none fixed inset-x-0 bottom-0 z-50 flex flex-col items-center gap-2 p-4 sm:items-end" aria-live="polite">
        @for (toast of service.toasts(); track toast.id) {
          <div
            class="pointer-events-auto flex w-full max-w-md animate-fade-up items-start gap-2.5 rounded-xl border p-3 shadow-lift"
            [class]="style(toast)"
            role="status"
          >
            <ui-icon [name]="icon(toast)" [size]="16" [class]="accent(toast)" class="mt-0.5" />
            <div class="min-w-0 flex-1">
              <p class="text-sm font-semibold">{{ toast.title }}</p>
              @if (toast.detail) {
                <p class="mt-0.5 break-words text-xs text-slate-500 dark:text-slate-400">{{ toast.detail }}</p>
              }
            </div>
            <button type="button" class="rounded-md p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800" (click)="service.dismiss(toast.id)" aria-label="Cerrar aviso">
              <ui-icon name="close" [size]="14" />
            </button>
          </div>
        }
      </div>
    }
  `
})
export class ToasterComponent {
  protected readonly service = inject(NotificationService);
  protected readonly style = (toast: Toast): string => STYLE[toast.kind];
  protected readonly icon = (toast: Toast): string => ICON[toast.kind];
  protected readonly accent = (toast: Toast): string => ACCENT[toast.kind];
}
