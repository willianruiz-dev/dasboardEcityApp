import { ChangeDetectionStrategy, Component, input } from '@angular/core';

import { IconComponent } from '../icon/icon.component';
import { SkeletonComponent } from '../skeleton/skeleton.component';

/** Contenedor canónico: título, descripción, acción a la derecha y estado de carga. */
@Component({
  selector: 'ui-panel',
  standalone: true,
  imports: [IconComponent, SkeletonComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="card flex flex-col">
      <header class="flex flex-wrap items-start justify-between gap-3 border-b border-surface-border px-4 py-3 dark:border-surface-border-dark sm:px-5">
        <div class="min-w-0">
          <h3 class="flex items-center gap-2 text-sm font-semibold text-slate-800 dark:text-slate-100">
            @if (icon()) {
              <ui-icon [name]="$any(icon())" [size]="16" class="text-brand-600 dark:text-brand-300" />
            }
            {{ title() }}
          </h3>
          @if (subtitle()) {
            <p class="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{{ subtitle() }}</p>
          }
        </div>
        <div class="flex items-center gap-1.5">
          <ng-content select="[panelActions]" />
        </div>
      </header>

      <div class="flex-1 px-4 py-4 sm:px-5">
        @if (loading()) {
          <ui-skeleton [height]="bodyHeight()" [lines]="3" />
        } @else {
          <ng-content />
        }
      </div>
    </section>
  `
})
export class PanelComponent {
  readonly title = input.required<string>();
  readonly subtitle = input<string | null>(null);
  readonly icon = input<string | null>(null);
  readonly loading = input(false);
  readonly bodyHeight = input(120);
}
