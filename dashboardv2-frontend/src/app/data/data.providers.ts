import { ENVIRONMENT_INITIALIZER, Injector, inject, type Provider } from '@angular/core';

import { AppConfigService } from '../core/config/app-config.service';
import { MachinesPort } from '../core/ports/machines.port';
import { SecurityPort } from '../core/ports/security.port';
import { TransactionsPort } from '../core/ports/transactions.port';
import { HttpMachinesAdapter } from './http/http-machines.adapter';
import { HttpSecurityAdapter } from './http/http-security.adapter';
import { HttpTransactionsAdapter } from './http/http-transactions.adapter';
import { MockMachinesAdapter, MockSecurityAdapter } from './mock/mock-catalog.adapter';
import { MockTransactionsAdapter } from './mock/mock-transactions.adapter';

/**
 * Composition root de la capa de datos.
 *
 * Las features dependen de los PUERTOS (`TransactionsPort`, `MachinesPort`,
 * `SecurityPort`); aquí se decide el ADAPTADOR. Cambiar entre el dataset de demo
 * y la API de producción no toca ni un componente: es la frontera que hace que la
 * arquitectura limpia pague su costo donde corresponde.
 */
export const DATA_PROVIDERS: Provider[] = [
  { provide: TransactionsPort, useFactory: () => pick(HttpTransactionsAdapter, MockTransactionsAdapter), deps: [] },
  { provide: MachinesPort, useFactory: () => pick(HttpMachinesAdapter, MockMachinesAdapter), deps: [] },
  { provide: SecurityPort, useFactory: () => pick(HttpSecurityAdapter, MockSecurityAdapter), deps: [] },
  {
    provide: ENVIRONMENT_INITIALIZER,
    multi: true,
    useFactory: () => () => {
      const config = inject(AppConfigService);
      const target = config.dataProvider() === 'mock' ? 'DATOS DE DEMO (sin backend)' : `API ${config.baseUrl || 'mismo origen'}/${config.pathPrefix}`;
      console.info(`[dashboard] proveedor de datos: ${target} · solo lectura: ${config.readOnly ? 'SÍ' : 'NO'}`);
    },
    deps: []
  }
];

/** Elige el adaptador según el entorno (y `window.__DASHBOARD_CONFIG__`). */
function pick<A, B>(httpAdapter: A, mockAdapter: B): A | B {
  const injector = inject(Injector);
  const mode = injector.get(AppConfigService).dataProvider();
  return injector.get((mode === 'mock' ? mockAdapter : httpAdapter) as never) as A | B;
}
