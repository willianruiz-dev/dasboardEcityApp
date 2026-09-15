import { RSA_PUBLIC_KEY_PEM } from '../app/core/config/rsa-public-key';

/**
 * Entorno de PRODUCCIÓN: consume la API real del dashboard.
 * `baseUrl` vacío => se asume que el SPA y la API comparten origen (IIS) o que
 * un reverse proxy expone `/api` y `/Auth`.
 */
export const environment = {
  production: true,
  dataProvider: 'http' as 'mock' | 'http',
  api: {
    baseUrl: '',
    pathPrefix: 'api',
    dashboardKeyId: '1E4F66B8-8602-4F9F-9AAC-F1D329A4AB1D',
    rsaPublicKeyPem: RSA_PUBLIC_KEY_PEM,
    timeoutMs: 45_000
  },
  readOnly: true
};

export type AppEnvironment = typeof environment;
