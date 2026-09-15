import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';

import { IconComponent } from '../icon/icon.component';
import { BadgeComponent } from '../badge/badge.component';
import { AppConfigService } from '../../../core/config/app-config.service';
import { RelativeTimePipe } from '../../pipes/relative-time.pipe';

/** Cabecera de página: título, contexto de datos (demo/producción), frescura y acciones. */
@Component({
  selector: 'app-page-header',
  standalone: true,
  imports: [IconComponent, BadgeComponent, RouterLink, RelativeTimePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="flex flex-wrap items-end justify-between gap-3">
      <div class="min-w-0">
        <div class="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
          <a routerLink="/dashboard" class="inline-flex items-center gap-1 hover:text-brand-600 dark:hover:text-brand-300">
            <ui-icon name="dashboard" [size]="13" />
            Dashboard
          </a>
          <ui-icon name="chevron" [size]="12" class="text-slate-300 dark:text-slate-600" />
          <span class="font-medium text-slate-600 dark:text-slate-300">{{ title() }}</span>
        </div>

        <div class="mt-1 flex flex-wrap items-center gap-2">
          <h1 class="text-xl font-semibold tracking-tight text-slate-900 dark:text-white sm:text-2xl">{{ title() }}</h1>
          @if (modeLabel().length > 0) {
            <ui-badge [label]="modeLabel()" [tone]="isDemo() ? 'warning' : 'positive'" [dot]="true" />
          }
        </div>

        @if (subtitle()) {
          <p class="mt-1 max-w-2xl text-sm text-slate-500 dark:text-slate-400">{{ subtitle() }}</p>
        }
      </div>

      <div class="flex flex-col items-end gap-2">
        <div class="flex items-center gap-2">
          <ng-content select="[headerActions]" />
        </div>
        @if (fetchedAt()) {
          <p class="tabular text-[11px] text-slate-400 dark:text-slate-500">
            actualizado {{ fetchedAt() | relative }}
          </p>
        }
      </div>
    </header>
  `
})
export class PageHeaderComponent {
  readonly title = input.required<string>();
  readonly subtitle = input<string | null>(null);
  readonly fetchedAt = input<number | null>(null);

  private readonly config = inject(AppConfigService);

  protected readonly isDemo = computed(() => this.config.dataProvider() === 'mock');
  protected readonly modeLabel = computed(() => (this.config.dataProvider() === 'mock' ? 'datos de demo' : this.config.isProduction ? 'producción' : 'pruebas'));
}
