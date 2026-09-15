import { ChangeDetectionStrategy, Component, computed, inject, output, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';

import { IconComponent } from '../../../shared/ui/icon/icon.component';
import { BadgeComponent } from '../../../shared/ui/badge/badge.component';
import { AuthService } from '../../../core/services/auth.service';
import { AuthenticationService } from '../../../core/services/authentication.service';
import { ThemeService } from '../../../core/services/theme.service';
import { initials } from '../../../core/logic/format.logic';
import { NavigationService } from '../../../core/services/navigation.service';

/** Barra superior: menú móvil, título de sección, tema, usuario y salida. */
@Component({
  selector: 'app-topbar',
  standalone: true,
  imports: [IconComponent, BadgeComponent, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="sticky top-0 z-30 flex h-14 items-center gap-2 border-b border-surface-border bg-white/85 px-3 backdrop-blur dark:border-surface-border-dark dark:bg-slate-900/80 sm:px-4">
      <button type="button" class="btn-ghost px-2 py-1.5 lg:hidden" (click)="openMobile.emit()" aria-label="Abrir menú">
        <ui-icon name="menu" [size]="19" />
      </button>

      <div class="min-w-0">
        <h1 class="truncate text-sm font-semibold text-slate-800 dark:text-slate-100">{{ section() }}</h1>
        <p class="truncate text-[11px] text-slate-400">
          {{ auth.roleLabel() }} · {{ auth.user()?.client ?? 'sin cliente asociado' }}
        </p>
      </div>

      <div class="ml-auto flex items-center gap-1.5">
        @if (expiresIn() !== null) {
          <span
            class="tabular hidden items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-medium sm:inline-flex"
            [class]="expiring() ? 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300' : 'text-slate-400'"
          >
            <ui-icon name="clock" [size]="13" />
            sesión {{ expiresIn() }}
          </span>
        }

        <button
          type="button"
          class="btn-ghost px-2 py-1.5"
          (click)="theme.toggle()"
          [attr.aria-label]="theme.isDark() ? 'Activar modo claro' : 'Activar modo oscuro'"
        >
          <ui-icon [name]="theme.isDark() ? 'sun' : 'moon'" [size]="17" />
        </button>

        <div class="relative">
          <button
            type="button"
            class="flex items-center gap-2 rounded-lg py-1 pl-1 pr-2 transition hover:bg-slate-100 dark:hover:bg-slate-800"
            (click)="menuOpen.set(!menuOpen())"
            aria-haspopup="menu"
            [attr.aria-expanded]="menuOpen()"
          >
            <span class="grid h-7 w-7 place-items-center rounded-full bg-brand-600 text-[11px] font-bold text-white">
              {{ initialsOf() }}
            </span>
            <span class="hidden text-xs font-semibold text-slate-700 dark:text-slate-200 sm:block">
              {{ auth.user()?.name }} {{ auth.user()?.lastName }}
            </span>
            <ui-icon name="chevron" [size]="13" class="hidden rotate-90 text-slate-400 sm:block" />
          </button>

          @if (menuOpen()) {
            <div
              class="absolute right-0 top-11 z-40 w-60 animate-fade-up overflow-hidden rounded-xl border border-surface-border bg-white shadow-lift dark:border-surface-border-dark dark:bg-slate-900"
              role="menu"
            >
              <div class="border-b border-surface-border px-3 py-2.5 dark:border-surface-border-dark">
                <p class="truncate text-sm font-semibold text-slate-800 dark:text-slate-100">{{ auth.user()?.userName }}</p>
                <p class="truncate text-[11px] text-slate-400">{{ auth.user()?.email }}</p>
                <div class="mt-1.5 flex items-center gap-1.5">
                  <ui-badge [label]="auth.roleLabel()" tone="brand" />
                  @if (auth.isAuthenticated()) {
                    <ui-badge label="sesión activa" tone="positive" [dot]="true" />
                  }
                </div>
              </div>
              <button type="button" class="flex w-full items-center gap-2 px-3 py-2.5 text-left text-xs text-rose-600 transition hover:bg-rose-50 dark:hover:bg-rose-500/10" (click)="signOut()">
                <ui-icon name="logout" [size]="14" />
                Cerrar sesión
              </button>
            </div>
          }
        </div>
      </div>
    </header>
  `
})
export class DashboardTopbarComponent {
  protected readonly auth = inject(AuthService);
  protected readonly theme = inject(ThemeService);
  private readonly authentication = inject(AuthenticationService);
  private readonly router = inject(Router);
  private readonly navigation = inject(NavigationService);

  readonly openMobile = output<void>();
  protected readonly menuOpen = signal(false);

  protected readonly section = computed(() => {
    const url = this.router.url.split('?')[0] as string;
    return this.navigation.titleFor(url);
  });

  protected readonly expiring = computed(() => {
    const minutes = this.minutesLeft();
    return minutes !== null && minutes < 45;
  });

  protected readonly expiresIn = computed(() => {
    const minutes = this.minutesLeft();
    if (minutes === null) return null;
    if (minutes <= 0) return 'por expirar';
    return minutes >= 60 ? `${Math.floor(minutes / 60)} h ${minutes % 60} min` : `${minutes} min`;
  });

  protected initialsOf(): string {
    return initials(this.auth.user() ?? {});
  }

  private minutesLeft(): number | null {
    const expiresAt = this.auth.session()?.expiresAt ?? null;
    if (expiresAt === null) return null;
    return Math.max(0, Math.round((expiresAt - Date.now()) / 60_000));
  }

  protected async signOut(): Promise<void> {
    this.menuOpen.set(false);
    await this.authentication.logout();
    await this.router.navigate(['/login']);
  }
}
