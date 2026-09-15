import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

import { IconComponent } from '../../shared/ui/icon/icon.component';

/** 404 del router: también cubre rutas del backend que este SPA aún no implementa. */
@Component({
  selector: 'app-page-not-found',
  standalone: true,
  imports: [IconComponent, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <main class="grid min-h-screen place-items-center px-4">
      <div class="max-w-md text-center">
        <span class="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-slate-100 text-slate-400 dark:bg-slate-800">
          <ui-icon name="search" [size]="24" />
        </span>
        <p class="tabular mt-5 text-5xl font-semibold tracking-tight text-slate-900 dark:text-white">404</p>
        <h1 class="mt-2 text-lg font-semibold text-slate-800 dark:text-slate-100">Esa consulta no vive aquí</h1>
        <p class="mt-1.5 text-sm leading-relaxed text-slate-500 dark:text-slate-400">
          La ruta no existe o pertenece a una pantalla de administración. Este dashboard sólo expone vistas de
          lectura sobre el API de consultas.
        </p>
        <a routerLink="/dashboard" class="btn-primary mt-6">
          <ui-icon name="dashboard" [size]="15" />
          Volver al panorama
        </a>
      </div>
    </main>
  `
})
export class PageNotFoundComponent {}
