/**
 * Entorno de DESARROLLO.
 * `dataProvider: 'mock'` permite levantar el dashboard sin backend ni VPN,
 * usando el mismo contrato (envelope + DTOs camelCase) que expone Api_DashboardV2.
 */
import { RSA_PUBLIC_KEY_PEM } from '../app/core/config/rsa-public-key';

export const environment = {
  production: false,
  dataProvider: 'mock' as 'mock' | 'http',
  api: {
    /** Origen de la API. Vacío = mismo origen ( detrás de IIS/Nginx ). */
    baseUrl: 'http://localhost:5013',
    /** Prefijo de enrutado de los controladores ([controller] heredado de BaseController). */
    pathPrefix: 'api',
    /** Header estático que valida ExceptionMiddleware (App:ExternalSaltKey). */
    dashboardKeyId: '1E4F66B8-8602-4F9F-9AAC-F1D329A4AB1D',
    rsaPublicKeyPem: RSA_PUBLIC_KEY_PEM,
    timeoutMs: 25_000
  },
  /** Salvaguarda de seguridad: el dashboard NO envía mutaciones. */
  readOnly: true
};

export type AppEnvironment = typeof environment;
