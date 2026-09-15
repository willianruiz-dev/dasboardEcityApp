import type { Routes } from '@angular/router';

import { guestGuard } from './core/guards/auth.guard';

/**
 * Routing con lazy loading por feature. Cada rama del `dashboard` carga su bundle
 * al navegarse; `/login` se precarga en el chunk principal porque es la puerta.
 */
export const routes: Routes = [
  {
    path: 'login',
    canActivate: [guestGuard],
    loadComponent: () => import('./features/auth/login/login.component').then((m) => m.LoginComponent),
    title: 'Iniciar sesión · eCity Consultas'
  },
  {
    path: 'dashboard',
    loadChildren: () => import('./features/dashboard/dashboard.routes').then((m) => m.DASHBOARD_ROUTES)
  },
  { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
  {
    path: '**',
    loadComponent: () => import('./features/not-found/page-not-found.component').then((m) => m.PageNotFoundComponent),
    title: 'Página no encontrada'
  }
];
