import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, input, output, signal } from '@angular/core';

import { Resource } from '../../../core/http/resource';
import type { Transaction, TransactionDetail, TransactionRating } from '../../../core/models/transactions.model';
import { TransactionsPort } from '../../../core/ports/transactions.port';
import { formatMoney } from '../../../core/logic/format.logic';
import { BadgeComponent } from '../../../shared/ui/badge/badge.component';
import { EmptyStateComponent } from '../../../shared/ui/empty-state/empty-state.component';
import { ErrorStateComponent } from '../../../shared/ui/error-state/error-state.component';
import { IconComponent } from '../../../shared/ui/icon/icon.component';
import { SkeletonComponent } from '../../../shared/ui/skeleton/skeleton.component';
import { UiDatePipe } from '../../../shared/pipes/datetime.pipe';
import { MoneyPipe } from '../../../shared/pipes/money.pipe';

/**
 * Panel lateral con el detalle de UNA transacción: `Transaction/{id}/Details` +
 * `Transaction/{id}/Rating` + evidencia en video. Se carga al abrir, nunca antes.
 */
@Component({
  selector: 'app-transaction-detail',
  standalone: true,
  imports: [BadgeComponent, EmptyStateComponent, ErrorStateComponent, IconComponent, SkeletonComponent, UiDatePipe, MoneyPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './transaction-detail-drawer.component.html'
})
export class TransactionDetailDrawerComponent {
  readonly transaction = input.required<Transaction>();
  readonly close = output<void>();

  private readonly port = inject(TransactionsPort);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly formatMoney = formatMoney;
  protected readonly videoUrl = signal<string | null>(null);
  protected readonly videoLoading = signal(false);
  protected readonly videoError = signal<string | null>(null);

  protected readonly details = new Resource<TransactionDetail[]>(
    () => this.port.details(this.transaction().id),
    [],
    this.destroyRef,
    (data) => data.length === 0
  );

  protected readonly rating = new Resource<TransactionRating | null>(() => this.port.rating(this.transaction().id), null, this.destroyRef, (data) => data == null);

  protected readonly headline = computed(() => {
    const t = this.transaction();
    return [
      { label: 'Total', value: formatMoney(t.totalAmount) },
      { label: 'Real', value: formatMoney(t.realAmount) },
      { label: 'Ingresó', value: formatMoney(t.incomeAmount) },
      { label: 'Devolvió', value: formatMoney(t.returnAmount) }
    ];
  });

  protected readonly detailTotal = computed(() => this.details.data().reduce((acc, line) => acc + line.currencyDenomination * line.quantity, 0));
  protected readonly stars = computed(() => Array.from({ length: 5 }, (_, i) => i + 1));

  protected readonly metadata = computed(() => {
    const t = this.transaction();
    return [
      { key: 'Referencia', value: t.reference ?? '—' },
      { key: 'Documento', value: t.document ?? '—' },
      { key: 'Producto', value: t.product ?? '—' },
      { key: 'Medio de pago', value: t.typePayment ?? '—' },
      { key: 'Estado', value: t.stateTransaction ?? '—' },
      { key: 'Creada por', value: t.userCreated ?? '—' },
      { key: 'Actualizada', value: t.dateUpdated ? new Date(t.dateUpdated).toISOString().slice(0, 16).replace('T', ' ') : '—' },
      { key: 'Descripción', value: t.description ?? '—' }
    ];
  });

  protected loadVideo(): void {
    this.videoLoading.set(true);
    this.port.videoBlobUrl(this.transaction().idPayPad, this.transaction().id).subscribe({
      next: (url) => {
        this.videoUrl.set(url.length > 0 ? url : null);
        this.videoLoading.set(false);
        if (url.length === 0) this.videoError.set('No disponible en modo demo');
      },
      error: (err: unknown) => {
        this.videoLoading.set(false);
        this.videoError.set(err instanceof Error ? err.message : 'Video no disponible');
      }
    });
  }
}

