import type { Routes } from '@angular/router';

import { authGuard } from '../../core/guards/auth.guard';
import { dashboardEntryGuard, permissionGuard, permissionViewGuard } from '../../core/guards/permission.guard';

/**
 * Rutas del área autenticada. Cada vista declara su permiso de LECTURA: si el rol
 * no lo tiene, el guard redirige a la primera vista disponible (nunca se muestra
 * una pantalla vacía con datos de otros clientes).
 */
export const DASHBOARD_ROUTES: Routes = [
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () => import('./layout/dashboard-layout.component').then((m) => m.DashboardLayoutComponent),
    children: [
      {
        path: '',
        pathMatch: 'full',
        canActivate: [dashboardEntryGuard, permissionViewGuard('overview')],
        loadComponent: () => import('../overview/operations-overview.component').then((m) => m.OperationsOverviewComponent),
        title: 'Panorama operativo · eCity Consultas'
      },
      {
        path: 'sales',
        canActivate: [permissionGuard(['ReadTransactions'], 'sales')],
        loadComponent: () => import('../sales/sales-dashboard.component').then((m) => m.SalesDashboardComponent),
        title: 'Transacciones por máquina · eCity Consultas'
      },
      {
        path: 'analytics',
        canActivate: [permissionViewGuard('analytics')],
        loadComponent: () => import('../analytics/analytics-dashboard.component').then((m) => m.AnalyticsDashboardComponent),
        title: 'Analítica · eCity Consultas'
      },
      {
        path: 'machines',
        canActivate: [permissionViewGuard('machines')],
        loadComponent: () => import('../machines/machines-board.component').then((m) => m.MachinesBoardComponent),
        title: 'Máquinas · eCity Consultas'
      },
      {
        path: 'users',
        canActivate: [permissionViewGuard('users')],
        loadComponent: () => import('../users/user-dashboard.component').then((m) => m.UserDashboardComponent),
        title: 'Operadores · eCity Consultas'
      },
      {
        path: 'security',
        canActivate: [permissionViewGuard('security')],
        loadComponent: () => import('../security/access-matrix.component').then((m) => m.AccessMatrixComponent),
        title: 'Roles y permisos · eCity Consultas'
      },
      {
        path: '**',
        loadComponent: () => import('../not-found/page-not-found.component').then((m) => m.PageNotFoundComponent)
      }
    ]
  }
];
