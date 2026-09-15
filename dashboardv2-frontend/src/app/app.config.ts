import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import { APP_INITIALIZER, ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { provideRouter, withComponentInputBinding, withNavigationErrorHandler, withViewTransitions } from '@angular/router';

import { routes } from './app.routes';
import { apiErrorInterceptor } from './core/http/api-error.interceptor';
import { authInterceptor } from './core/http/auth.interceptor';
import { readOnlyGuardInterceptor } from './core/http/readonly-guard.interceptor';
import { AuthenticationService } from './core/services/authentication.service';
import { DATA_PROVIDERS } from './data/data.providers';

/**
 * Composition root. Nada de `AppModule`: aquí se Cablean router, HTTP con sus
 * interceptores (en el orden que importa), la capa de datos y la reanudación de sesión.
 */
export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(
      routes,
      withComponentInputBinding(),
      withViewTransitions({ skipInitialTransition: true }),
      withNavigationErrorHandler((error) => console.error('[router]', error))
    ),
    provideHttpClient(withFetch(), withInterceptors([authInterceptor, readOnlyGuardInterceptor, apiErrorInterceptor])),
    ...DATA_PROVIDERS,
    // Rehidrata rol/menú si la sesión sigue en sessionStorage: un F5 no deja los guards a ciegas.
    {
      provide: APP_INITIALIZER,
      multi: true,
      deps: [AuthenticationService],
      useFactory: (service: AuthenticationService) => () => service.resume()
    }
  ]
};
