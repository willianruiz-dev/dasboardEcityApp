import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { Title } from '@angular/platform-browser';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { filter } from 'rxjs';

import { ToasterComponent } from './shared/ui/toaster/toaster.component';
import { NavigationService } from './core/services/navigation.service';

/** Shell de la aplicación: outlet raíz + notificaciones globales. */
@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, ToasterComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <router-outlet />
    <app-toaster />
  `
})
export class AppComponent {
  private readonly router = inject(Router);
  private readonly title = inject(Title);
  private readonly navigation = inject(NavigationService);

  /** URL actual, para titular la pestaña según la sección del rol. */
  private readonly url = signal(this.router.url);

  constructor() {
    this.router.events
      .pipe(
        filter((event): event is NavigationEnd => event instanceof NavigationEnd),
        takeUntilDestroyed(inject(DestroyRef))
      )
      .subscribe((event) => {
        this.url.set(event.urlAfterRedirects);
        this.applyTitle();
      });

    this.applyTitle();
  }

  private applyTitle(): void {
    const path = this.url().split('?')[0] as string;
    this.title.setTitle(path === '/login' ? 'Iniciar sesión · eCity Consultas' : `${this.navigation.titleFor(path)} · eCity Consultas`);
  }
}
