import { ChangeDetectionStrategy, Component, input } from '@angular/core';

import { IconComponent } from '../icon/icon.component';

/** Estado vacío con explicación del *por qué* (404 del API = sin resultados, no es un error). */
@Component({
  selector: 'ui-empty-state',
  standalone: true,
  imports: [IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex flex-col items-center gap-2 px-4 py-10 text-center">
      <span class="rounded-full bg-slate-100 p-3 text-slate-400 dark:bg-slate-800 dark:text-slate-500">
        <ui-icon [name]="icon()" [size]="20" />
      </span>
      <p class="text-sm font-semibold text-slate-700 dark:text-slate-200">{{ title() }}</p>
      @if (hint()) {
        <p class="max-w-md text-xs leading-relaxed text-slate-500 dark:text-slate-400">{{ hint() }}</p>
      }
      <div class="mt-1">
        <ng-content />
      </div>
    </div>
  `
})
export class EmptyStateComponent {
  readonly title = input('Sin resultados');
  readonly hint = input<string | null>(null);
  readonly icon = input('database');
}
