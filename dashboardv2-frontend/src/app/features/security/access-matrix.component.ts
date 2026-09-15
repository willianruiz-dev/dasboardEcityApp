import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';

import { Resource } from '../../core/http/resource';
import type { Permission, Role, User } from '../../core/models/security.model';
import { SecurityPort } from '../../core/ports/security.port';
import { AuthService } from '../../core/services/auth.service';
import { PermissionService, READ_VIEWS } from '../../core/services/permission.service';
import { BadgeComponent } from '../../shared/ui/badge/badge.component';
import { EmptyStateComponent } from '../../shared/ui/empty-state/empty-state.component';
import { ErrorStateComponent } from '../../shared/ui/error-state/error-state.component';
import { IconComponent } from '../../shared/ui/icon/icon.component';
import { PageHeaderComponent } from '../../shared/ui/page-header/page-header.component';
import { PanelComponent } from '../../shared/ui/panel/panel.component';

type PermissionKind = 'Read' | 'Write' | 'Del';

export interface MatrixRow {
  permission: string;
  group: string;
  kind: PermissionKind;
  roles: Array<{ role: Role; granted: boolean }>;
}

/**
 * Matriz ROL × PERMISO: el API no tiene un endpoint de "quién puede ver qué",
 * así que se cruza `GET api/Role` (cada rol trae `permissions[]` y `routes[]`)
 * con `GET api/Permission`.
 *
 * Solo lectura: asignar permisos a roles se hace en el dashboard administrativo
 * (`RoleController.Post/Put`), nunca desde acá.
 */
@Component({
  selector: 'app-access-matrix',
  standalone: true,
  imports: [BadgeComponent, EmptyStateComponent, ErrorStateComponent, IconComponent, PageHeaderComponent, PanelComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './access-matrix.component.html'
})
export class AccessMatrixComponent {
  private readonly security = inject(SecurityPort);
  protected readonly permissions = inject(PermissionService);
  protected readonly auth = inject(AuthService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly rolesRes = new Resource<Role[]>(() => this.security.roles(), [], this.destroyRef);
  protected readonly permissionsRes = new Resource<Permission[]>(() => this.security.permissions(), [], this.destroyRef);
  protected readonly usersRes = new Resource<User[]>(() => this.security.users(), [], this.destroyRef);

  protected readonly kindFilter = signal<PermissionKind | null>('Read');
  protected readonly kinds: ReadonlyArray<{ key: PermissionKind; label: string }> = [
    { key: 'Read', label: 'Lectura' },
    { key: 'Write', label: 'Escritura' },
    { key: 'Del', label: 'Borrado' }
  ];

  protected readonly roleCount = computed(() => this.rolesRes.data().length);

  protected readonly permissionCount = computed(
    () => new Set(this.rolesRes.data().flatMap((role) => (role.permissions ?? []).map((p) => p.name))).size || this.permissionsRes.data().length
  );

  protected readonly matrix = computed<MatrixRow[]>(() => {
    const roles = this.rolesRes.data();
    const names = new Set<string>();
    roles.forEach((role) => (role.permissions ?? []).forEach((permission) => names.add(permission.name)));
    this.permissionsRes.data().forEach((permission) => names.add(permission.name));

    const filter = this.kindFilter();
    return [...names]
      .map<MatrixRow>((name) => {
        const kind: PermissionKind = name.startsWith('Read') ? 'Read' : name.startsWith('Write') ? 'Write' : 'Del';
        return {
          permission: name,
          group: name.replace(/^(Read|Write|Del)/, '') || 'general',
          kind,
          roles: roles.map((role) => ({ role, granted: (role.permissions ?? []).some((p) => p.name === name) }))
        };
      })
      .filter((row) => (filter === null ? true : row.kind === filter))
      .sort((a, b) => a.permission.localeCompare(b.permission));
  });

  /** Vistas del SPA y si MI rol puede verlas (espejo de los guards). */
  protected readonly myAccess = computed(() => {
    const can = this.permissions.can();
    const labels: Record<string, string> = {
      overview: 'Panorama operativo',
      sales: 'Consulta por máquina',
      analytics: 'Analítica',
      machines: 'Máquinas y contenido',
      storages: 'Arqueos y cargues',
      users: 'Operadores',
      security: 'Matriz de acceso'
    };
    return (Object.keys(READ_VIEWS) as Array<keyof typeof READ_VIEWS>).map((view) => ({
      view,
      label: labels[view] ?? view,
      required: [...READ_VIEWS[view]],
      allowed: can[view]
    }));
  });

  protected readonly myRoutes = computed(() => this.auth.routes());

  protected readonly distribution = computed(() => {
    const users = this.usersRes.data();
    return this.rolesRes.data()
      .map((role) => ({ role, count: users.filter((user) => user.idRole === role.id).length }))
      .sort((a, b) => b.count - a.count);
  });

  /** Roles que NO pueden leer transacciones: candidatos a revisión de acceso. */
  protected readonly readonlyGaps = computed(() =>
    this.rolesRes.data().filter((role) => !(role.permissions ?? []).some((p) => p.name === 'ReadTransactions'))
  );

  protected toggleKind(kind: PermissionKind): void {
    this.kindFilter.set(this.kindFilter() === kind ? null : kind);
  }

  protected reload(): void {
    this.rolesRes.reload();
    this.permissionsRes.reload();
    this.usersRes.reload();
  }
}
