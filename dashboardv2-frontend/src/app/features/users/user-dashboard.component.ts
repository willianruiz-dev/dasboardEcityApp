import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject } from '@angular/core';

import { Resource } from '../../core/http/resource';
import { formatMoney, initials } from '../../core/logic/format.logic';
import type { StatCard } from '../../core/models/dashboard.model';
import type { Role, User } from '../../core/models/security.model';
import type { Transaction } from '../../core/models/transactions.model';
import { SecurityPort } from '../../core/ports/security.port';
import { TransactionsPort } from '../../core/ports/transactions.port';
import { BadgeComponent } from '../../shared/ui/badge/badge.component';
import { ChartComponent } from '../../shared/ui/chart/chart.component';
import { DataTableComponent } from '../../shared/ui/data-table/data-table.component';
import type { TableColumn } from '../../shared/ui/data-table/table.model';
import { EmptyStateComponent } from '../../shared/ui/empty-state/empty-state.component';
import { ErrorStateComponent } from '../../shared/ui/error-state/error-state.component';
import { IconComponent } from '../../shared/ui/icon/icon.component';
import { PageHeaderComponent } from '../../shared/ui/page-header/page-header.component';
import { PanelComponent } from '../../shared/ui/panel/panel.component';
import { StatsCardComponent } from '../../shared/ui/stats-card/stats-card.component';
import { UiDatePipe } from '../../shared/pipes/datetime.pipe';
import { RelativeTimePipe } from '../../shared/pipes/relative-time.pipe';

export interface UserRow extends User {
  operations: number;
  handled: number;
  roleColor: string;
}

/**
 * Métricas de USUARIOS/OPERADORES: quién mueve qué. Fuente: `GET api/User` +
 * `GET api/Role` (catálogo) y `GET api/Transaction` para atribuir movimientos
 * por `userCreated`. Todo en memoria: ningún endpoint de agregación se invoca.
 */
@Component({
  selector: 'app-user-dashboard',
  standalone: true,
  imports: [BadgeComponent, ChartComponent, DataTableComponent, EmptyStateComponent, ErrorStateComponent, IconComponent, PageHeaderComponent, PanelComponent, StatsCardComponent, UiDatePipe, RelativeTimePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './user-dashboard.component.html'
})
export class UserDashboardComponent {
  private readonly security = inject(SecurityPort);
  private readonly transactions = inject(TransactionsPort);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly users = new Resource<User[]>(() => this.security.users(), [], this.destroyRef);
  protected readonly roles = new Resource<Role[]>(() => this.security.roles(), [], this.destroyRef);
  protected readonly trx = new Resource<Transaction[]>(() => this.transactions.all(), [], this.destroyRef);

  protected readonly money = formatMoney;

  private readonly activity = computed(() => {
    const map = new Map<string, { count: number; amount: number }>();
    this.trx.data().forEach((t) => {
      const key = (t.userCreated ?? '').trim();
      if (key.length === 0) return;
      const entry = map.get(key) ?? { count: 0, amount: 0 };
      entry.count += 1;
      entry.amount += t.totalAmount || 0;
      map.set(key, entry);
    });
    return map;
  });

  protected readonly rows = computed<UserRow[]>(() => {
    const activity = this.activity();
    const palette = ['#1f5ce0', '#10b981', '#f59e0b', '#8b5cf6', '#06b6d4', '#ef4444'];
    const max = Math.max(1, ...[...activity.values()].map((v) => v.count));
    return this.users.data().map((user) => {
      const entry = activity.get((user.userName ?? '').trim()) ?? { count: 0, amount: 0 };
      return {
        ...user,
        operations: entry.count,
        handled: entry.amount,
        roleColor: palette[(user.idRole - 1) % palette.length] as string
      };
    });
  });

  protected readonly kpis = computed<StatCard[]>(() => {
    const list = this.users.data();
    const active = list.filter((u) => u.status === 1).length;
    const withActivity = this.rows().filter((u) => u.operations > 0).length;
    return [
      { label: 'Operadores', value: list.length, format: 'number', icon: 'users', hint: `${active} con estado activo` },
      { label: 'Roles definidos', value: this.roles.data().length, format: 'number', icon: 'shield', hint: 'asignados en el backend' },
      { label: 'Con actividad', value: withActivity, format: 'number', icon: 'trend', hint: 'aparecen en userCreated' },
      { label: 'Atención requerida', value: list.filter((u) => u.status === 0).length, format: 'number', icon: 'alert', hint: 'usuarios deshabilitados' }
    ];
  });

  protected readonly roleLabels = computed(() => this.roles.data().map((role) => role.role ?? `Rol #${role.id}`));
  protected readonly roleSeries = computed(() => [
    { label: 'Permisos de lectura', data: this.roles.data().map((role) => role.permissions.filter((p) => p.name.startsWith('Read')).length) }
  ]);

  protected readonly topOperators = computed(() => {
    const max = Math.max(1, ...this.rows().map((u) => u.operations));
    return this.rows()
      .filter((user) => user.operations > 0)
      .sort((a, b) => b.operations - a.operations)
      .slice(0, 6)
      .map((user) => ({ user, share: Math.round((user.operations / max) * 100) }));
  });

  protected readonly columns = computed<readonly TableColumn<UserRow>[]>(() => [
    { key: 'userName', label: 'Usuario', sortable: true, width: 'w-[170px]' },
    { key: 'name', label: 'Nombre', sortable: true, hideBelow: 'sm' },
    { key: 'document', label: 'Documento', type: 'mono', hideBelow: 'lg' },
    { key: 'role', label: 'Rol', type: 'badge', sortable: true, toneFor: () => 'brand' },
    { key: 'client', label: 'Cliente', hideBelow: 'xl', truncate: true },
    { key: 'operations', label: 'Movim.', type: 'number', align: 'right', sortable: true },
    { key: 'handled', label: 'Monto', type: 'money', align: 'right', sortable: true, hideBelow: 'md' },
    { key: 'status', label: 'Estado', type: 'badge', sortable: true, toneFor: (value) => (Number(value) === 1 ? 'positive' : 'negative') },
    { key: 'dateCreated', label: 'Creado', type: 'datetime', sortable: true, hideBelow: 'lg' }
  ]);

  protected readonly searchKeys = ['userName', 'name', 'lastName', 'document', 'email', 'role'];

  protected initialsOf(user: User): string {
    return initials(user);
  }

  protected reload(): void {
    this.users.reload();
    this.roles.reload();
    this.trx.reload();
  }
}
