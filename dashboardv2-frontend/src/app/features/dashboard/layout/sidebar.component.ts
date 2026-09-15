import { ChangeDetectionStrategy, Component, inject, input, output } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

import { IconComponent } from '../../../shared/ui/icon/icon.component';
import { NavigationService } from '../../../core/services/navigation.service';
import { AppConfigService } from '../../../core/config/app-config.service';

/**
 * Navegación construida con las rutas que el BACKEND asigna al rol
 * (`GET Route/GetLoggedRoutes`) filtradas por permisos de lectura.
 */
@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './sidebar.component.html'
})
export class DashboardSidebarComponent {
  protected readonly navigation = inject(NavigationService);
  protected readonly config = inject(AppConfigService);

  /** En desktop controla el ancho compacto; en móvil es el drawer. */
  readonly collapsed = input(false);
  readonly mobileOpen = input(false);
  readonly closeMobile = output<void>();
  readonly toggleCollapsed = output<void>();

  protected readonly rootPath = '/dashboard';
}
