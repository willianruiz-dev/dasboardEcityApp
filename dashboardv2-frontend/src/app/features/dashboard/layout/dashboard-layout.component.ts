import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';

import { DashboardSidebarComponent } from './sidebar.component';
import { DashboardTopbarComponent } from './topbar.component';

/**
 * Layout de la aplicación: sidebar fijo en desktop, drawer en móvil, header pegajoso
 * y `<router-outlet>` para las features. Sin módulos: todo standalone.
 */
@Component({
  selector: 'app-dashboard-layout',
  standalone: true,
  imports: [RouterOutlet, DashboardSidebarComponent, DashboardTopbarComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex min-h-screen bg-surface-light dark:bg-surface-dark">
      <div
        class="fixed inset-y-0 left-0 z-40 w-[264px] max-w-[86vw] transition-transform duration-200 lg:static lg:translate-x-0"
        [class.-translate-x-full]="!mobileOpen()"
        [class.shadow-lift]="mobileOpen()"
      >
        <app-sidebar [collapsed]="collapsed()" [mobileOpen]="mobileOpen()" (closeMobile)="mobileOpen.set(false)" (toggleCollapsed)="collapsed.set(!collapsed())" />
      </div>

      @if (mobileOpen()) {
        <button type="button" class="fixed inset-0 z-30 bg-slate-900/40 lg:hidden" aria-label="Cerrar navegación" (click)="mobileOpen.set(false)"></button>
      }

      <div class="flex min-w-0 flex-1 flex-col">
        <app-topbar (openMobile)="mobileOpen.set(true)" />
        <main class="min-w-0 flex-1 px-3 py-4 sm:px-4 lg:px-6 lg:py-5">
          <div class="mx-auto w-full max-w-[1600px]">
            <router-outlet />
          </div>
        </main>
      </div>
    </div>
  `
})
export class DashboardLayoutComponent {
  protected readonly mobileOpen = signal(false);
  protected readonly collapsed = signal(
    typeof localStorage !== 'undefined' ? localStorage.getItem('ecity.dashboard.rail') === '1' : false
  );
}
