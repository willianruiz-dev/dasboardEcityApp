import { Injectable, computed, inject, signal } from '@angular/core';

import { environment, type AppEnvironment } from '../../../environments/environment';

/** Sobreescribible en tiempo de ejecución desde `index.html` (deploy IIS sin rebuild). */
interface RuntimeConfig {
  api?: Partial<AppEnvironment['api']>;
  dataProvider?: 'mock' | 'http';
  readOnly?: boolean;
}

declare global {
  interface Window {
    __DASHBOARD_CONFIG__?: RuntimeConfig;
  }
}

/**
 * Punto único de configuración. Mezcla `environment` con `window.__DASHBOARD_CONFIG__`
 * para poder cambiar `baseUrl` (producción/pruebas) sin recompilar.
 */
@Injectable({ providedIn: 'root' })
export class AppConfigService {
  private readonly runtime = typeof window !== 'undefined' ? window.__DASHBOARD_CONFIG__ ?? {} : {};

  private readonly _provider = signal<'mock' | 'http'>(this.runtime.dataProvider ?? environment.dataProvider);

  readonly dataProvider = computed(() => this._provider());

  readonly baseUrl = this.runtime.api?.baseUrl ?? environment.api.baseUrl;
  readonly pathPrefix = this.runtime.api?.pathPrefix ?? environment.api.pathPrefix;
  readonly dashboardKeyId = this.runtime.api?.dashboardKeyId ?? environment.api.dashboardKeyId;
  readonly rsaPublicKeyPem = this.runtime.api?.rsaPublicKeyPem ?? environment.api.rsaPublicKeyPem;
  readonly timeoutMs = this.runtime.api?.timeoutMs ?? environment.api.timeoutMs;
  readonly readOnly = this.runtime.readOnly ?? environment.readOnly;
  readonly isProduction = environment.production;

  /** Nombre de la cabecera anti-uso que valida `ExceptionMiddleware`. */
  readonly keyHeader = 'DashboardKeyId';

  /** Permite forzar modo demo desde la consola/JS en un despliegue ya compilado. */
  setProvider(provider: 'mock' | 'http'): void {
    this._provider.set(provider);
  }
}

/** Cabeceras comunes: `DashboardKeyId` es obligatorio o la API responde 403. */
@Injectable({ providedIn: 'root' })
export class ApiHeadersService {
  private readonly config = inject(AppConfigService);

  /** Cabeceras estáticas de identificación del cliente. */
  get static(): Readonly<Record<string, string>> {
    return { [this.config.keyHeader]: this.config.dashboardKeyId };
  }
}
