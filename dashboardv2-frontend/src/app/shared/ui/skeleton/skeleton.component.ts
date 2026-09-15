import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/** Bloque de carga. Se usa en las tarjetas, la grilla y los gráficos (no hay spinners sueltos). */
@Component({
  selector: 'ui-skeleton',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div [class]="shape()" [style.height.px]="height()" [style.width]="width()" aria-hidden="true"></div>
    @if (lines() > 0) {
      <div class="mt-3 space-y-2">
        @for (line of filler(); track $index) {
          <div class="skeleton h-3" [style.width.%]="45 + (($index * 17) % 50)"></div>
        }
      </div>
    }
  `
})
export class SkeletonComponent {
  readonly height = input(16);
  readonly width = input<string | null>(null);
  readonly lines = input(0);
  readonly shape = input('skeleton');

  protected filler(): number[] {
    return Array.from({ length: this.lines() }, (_, i) => i);
  }
}
