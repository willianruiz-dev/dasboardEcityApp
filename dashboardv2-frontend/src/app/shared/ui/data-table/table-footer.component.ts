import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';

import { pageWindow } from '../../../core/logic/table.logic';
import { IconComponent } from '../icon/icon.component';

/** Pie de la grilla: rango visible, ventana de páginas y tamaño de página. */
@Component({
  selector: 'app-table-footer',
  standalone: true,
  imports: [IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex flex-wrap items-center justify-between gap-2 border-t border-surface-border px-3 py-2.5 text-xs dark:border-surface-border-dark">
      <p class="tabular text-slate-500 dark:text-slate-400">
        {{ from() }}–{{ to() }} de {{ totalRows() }}
        @if (filterNote()) {
          <span class="text-slate-400">· {{ filterNote() }}</span>
        }
      </p>

      <div class="flex items-center gap-1">
        <button type="button" class="btn-ghost px-2 py-1" [disabled]="page() <= 1" (click)="go(page() - 1)" aria-label="Página anterior">
          <ui-icon name="chevron" [size]="14" class="rotate-180" />
        </button>
        @for (entry of window(); track $index) {
          @if (entry === '…') {
            <span class="px-1 text-slate-400">…</span>
          } @else {
            <button
              type="button"
              class="tabular min-w-[26px] rounded-md px-2 py-1 font-medium transition"
              [class]="entry === page() ? 'bg-brand-600 text-white' : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'"
              (click)="go($any(entry))"
            >
              {{ entry }}
            </button>
          }
        }
        <button type="button" class="btn-ghost px-2 py-1" [disabled]="page() >= totalPages()" (click)="go(page() + 1)" aria-label="Página siguiente">
          <ui-icon name="chevron" [size]="14" />
        </button>
      </div>
    </div>
  `
})
export class TableFooterComponent {
  readonly from = input(0);
  readonly to = input(0);
  readonly totalRows = input(0);
  readonly page = input(1);
  readonly totalPages = input(1);
  readonly filterNote = input<string | null>(null);

  readonly pageChange = output<number>();

  protected readonly window = computed(() => pageWindow(this.page(), this.totalPages()));

  protected go(page: number): void {
    this.pageChange.emit(Math.min(Math.max(1, page), Math.max(1, this.totalPages())));
  }
}
