import { DestroyRef, ElementRef, ChangeDetectionStrategy, Component, computed, effect, inject, input, signal, viewChild } from '@angular/core';
import type { Chart as ChartType, ChartConfiguration } from 'chart.js';

import { ThemeService } from '../../../core/services/theme.service';

export type ChartKind = 'line' | 'bar' | 'stackedBar' | 'doughnut';

export interface ChartSeries {
  label: string;
  data: readonly number[];
  /** Color base; si no se pasa, se toma de la paleta. */
  color?: string;
  /** Para `stackedBar`: id del stack. */
  stack?: string;
  /** Relleno bajo la línea. */
  area?: boolean;
}

const PALETTE = ['#1f5ce0', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#64748b', '#22c55e', '#eab308'];

/**
 * Componente base de gráficos.
 * `chart.js` se importa con `import()` dinámico: sólo se descarga cuando el bloque
 * `@defer` entra en viewport, no en el bundle inicial del login.
 */
@Component({
  selector: 'ui-chart',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="relative w-full" [style.height.px]="height()">
      @if (hasData()) {
        <canvas #canvas class="h-full w-full" role="img" [attr.aria-label]="title() ?? 'Gráfico'"></canvas>
      } @else {
        <div class="flex h-full flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-surface-border text-xs text-slate-400 dark:border-surface-border-dark">
          <span class="font-medium">Sin datos para graficar</span>
          @if (emptyHint()) {
            <span class="text-[11px]">{{ emptyHint() }}</span>
          }
        </div>
      }
    </div>
  `
})
export class ChartComponent {
  readonly kind = input<ChartKind>('line');
  readonly labels = input<readonly string[]>([]);
  readonly series = input<readonly ChartSeries[]>([]);
  readonly height = input(240);
  readonly title = input<string | null>(null);
  readonly emptyHint = input<string | null>(null);
  readonly loading = input(false);
  /** Muestra los valores en COP con separadores de miles en el eje Y. */
  readonly moneyAxis = input(false);
  readonly legend = input(true);

  private readonly canvas = viewChild<ElementRef<HTMLCanvasElement>>('canvas');
  private readonly theme = inject(ThemeService);
  private readonly destroyRef = inject(DestroyRef);
  private chart: ChartType | null = null;
  private disposed = false;

  protected readonly hasData = computed(() => this.labels().length > 0 && this.series().some((s) => s.data.some((v) => v !== 0)));

  constructor() {
    effect(() => {
      if (this.loading()) return;
      // El <canvas> sólo existe cuando hay datos: se observa para pintar al aparecer.
      void this.canvas();
      void this.labels();
      void this.series();
      void this.kind();
      void this.theme.theme();
      void this.hasData();
      queueMicrotask(() => void this.render());
    });
    this.destroyRef.onDestroy(() => {
      this.disposed = true;
      this.chart?.destroy();
      this.chart = null;
    });
  }

  private async render(): Promise<void> {
    const element = this.canvas()?.nativeElement;
    if (!element || this.disposed) return;
    if (!this.hasData()) {
      this.chart?.destroy();
      this.chart = null;
      return;
    }

    const { Chart } = await import('chart.js/auto');
    if (this.disposed) return;

    const kind = this.kind();
    const isStacked = kind === 'stackedBar';
    const grid = this.theme.isDark() ? 'rgba(148,163,184,0.16)' : 'rgba(100,116,139,0.14)';
    const text = this.theme.isDark() ? '#cbd5e1' : '#475569';

    const datasets = this.series().map((serie, index) => {
      const color = serie.color ?? (PALETTE[index % PALETTE.length] as string);
      const base = {
        label: serie.label,
        data: [...serie.data],
        borderColor: color,
        backgroundColor: kind === 'doughnut' ? PALETTE : withAlpha(color, kind === 'line' ? 0.12 : 0.7),
        borderWidth: kind === 'line' ? 2 : 0,
        borderRadius: kind === 'line' ? 0 : 5,
        stack: serie.stack ?? (isStacked ? 'total' : undefined),
        tension: 0.32,
        pointRadius: 0,
        pointHoverRadius: 4,
        fill: kind === 'line' ? (serie.area ?? true) : undefined
      };
      return base;
    });

    const config = {
      type: kind === 'doughnut' ? 'doughnut' : kind === 'line' ? 'line' : 'bar',
      data: { labels: [...this.labels()], datasets },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 320 },
        interaction: { mode: 'index', intersect: false },
        cutout: kind === 'doughnut' ? '68%' : undefined,
        plugins: {
          legend: {
            display: this.legend() && (kind === 'doughnut' || this.series().length > 1),
            position: 'bottom',
            labels: { color: text, boxWidth: 8, boxHeight: 8, usePointStyle: true, padding: 14 }
          },
          tooltip: {
            backgroundColor: this.theme.isDark() ? 'rgba(15,23,42,0.95)' : 'rgba(255,255,255,0.98)',
            titleColor: this.theme.isDark() ? '#e2e8f0' : '#0f172a',
            bodyColor: this.theme.isDark() ? '#cbd5e1' : '#334155',
            borderColor: grid,
            borderWidth: 1,
            padding: 10,
            displayColors: true,
            callbacks: {
              label: (ctx: { dataset: { label?: string }; parsed: { y: number } }) => {
                const value = ctx.parsed.y;
                const formatted = this.moneyAxis()
                  ? new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(value)
                  : new Intl.NumberFormat('es-CO').format(value);
                return ` ${ctx.dataset.label ?? ''}: ${formatted}`;
              }
            }
          }
        },
        scales:
          kind === 'doughnut'
            ? undefined
            : {
                x: {
                  stacked: isStacked,
                  grid: { display: false },
                  border: { display: false },
                  ticks: { color: text, maxRotation: 0, autoSkipPadding: 16, font: { size: 11 } }
                },
                y: {
                  stacked: isStacked,
                  beginAtZero: true,
                  grid: { color: grid },
                  border: { display: false },
                  ticks: {
                    color: text,
                    font: { size: 11 },
                    callback: (value: number | string) => {
                      const numeric = Number(value);
                      if (this.moneyAxis()) return Intl.NumberFormat('es-CO', { notation: 'compact' }).format(numeric);
                      return Number.isInteger(numeric) ? String(numeric) : '';
                    }
                  }
                }
              }
      }
    } as unknown as ChartConfiguration;

    this.chart?.destroy();
    this.chart = new Chart(element, config) as unknown as ChartType;
  }
}

function withAlpha(hex: string, alpha: number): string {
  const value = hex.replace('#', '');
  const full = value.length === 3 ? value.split('').map((c) => c + c).join('') : value;
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
