import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { OverviewQueryService } from './services/overview-query.service';
import { formatMoney } from '../../core/logic/format.logic';
import { BadgeComponent } from '../../shared/ui/badge/badge.component';
import { ChartComponent } from '../../shared/ui/chart/chart.component';
import { EmptyStateComponent } from '../../shared/ui/empty-state/empty-state.component';
import { ErrorStateComponent } from '../../shared/ui/error-state/error-state.component';
import { IconComponent } from '../../shared/ui/icon/icon.component';
import { PageHeaderComponent } from '../../shared/ui/page-header/page-header.component';
import { PanelComponent } from '../../shared/ui/panel/panel.component';
import { StatsCardComponent } from '../../shared/ui/stats-card/stats-card.component';
import { UiDatePipe } from '../../shared/pipes/datetime.pipe';

/** Home del dashboard: KPIs del negocio + estado de salud de la red de máquinas. */
@Component({
  selector: 'app-operations-overview',
  standalone: true,
  imports: [BadgeComponent, ChartComponent, EmptyStateComponent, ErrorStateComponent, IconComponent, PageHeaderComponent, PanelComponent, RouterLink, StatsCardComponent, UiDatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './operations-overview.component.html',
  providers: [OverviewQueryService]
})
export class OperationsOverviewComponent {
  protected readonly overview = inject(OverviewQueryService);

  protected readonly riskFilter = signal<'all' | 'silent' | 'inactive'>('all');

  protected readonly trendLabels = computed(() => this.overview.trend30().map((point) => point.label));
  protected readonly trendSeries = computed(() => [
    { label: 'Facturado', data: this.overview.trend30().map((p) => p.amount), area: true },
    { label: 'Transacciones', data: this.overview.trend30().map((p) => p.count * 100) }
  ]);
  protected readonly stateLabels = computed(() => this.overview.summary().byState.map((b) => b.label));
  protected readonly stateSeries = computed(() => [{ label: 'Monto', data: this.overview.summary().byState.map((b) => b.total) }]);
  protected readonly paymentLabels = computed(() => this.overview.summary().byPaymentType.slice(0, 6).map((b) => b.label));
  protected readonly paymentSeries = computed(() => [{ label: 'Monto por medio de pago', data: this.overview.summary().byPaymentType.slice(0, 6).map((b) => b.total) }]);

  protected readonly rows = computed(() => {
    const filter = this.riskFilter();
    const list = this.overview.attention();
    return filter === 'all' ? list : list.filter((row) => row.risk === filter || (filter === 'silent' && row.risk === 'inactive'));
  });

  protected readonly money = formatMoney;

  protected tone(risk: string): 'positive' | 'warning' | 'negative' | 'neutral' {
    switch (risk) {
      case 'ok':
        return 'positive';
      case 'slow':
        return 'warning';
      case 'silent':
      case 'inactive':
        return 'negative';
      default:
        return 'neutral';
    }
  }

  protected label(risk: string): string {
    return { ok: 'operando', slow: 'lenta', silent: 'sin actividad', inactive: 'inactiva' }[risk] ?? risk;
  }
}
