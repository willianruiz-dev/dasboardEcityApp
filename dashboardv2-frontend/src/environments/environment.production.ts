import { RSA_PUBLIC_KEY_PEM } from '../app/core/config/rsa-public-key';

/**
 * Entorno de PRODUCCIÓN: consume la API real del dashboard.
 * Configurado para https://apidashboardv2.e-city.co/ con tus credenciales.
 * - `baseUrl` apunta directo al API prod (con trailing slash se normaliza solo)
 * - `dashboardKeyId` = apiKeyId que te dieron
 * - `dataProvider: 'http'` = usa la API real, no el mock de pruebas
 */
export const environment = {
  production: true,
  dataProvider: 'http' as 'mock' | 'http',
  api: {
    baseUrl: 'https://apidashboardv2.e-city.co',
    pathPrefix: 'api',
    dashboardKeyId: '1E4F66B8-8602-4F9F-9AAC-F1D329A4AB1D',
    rsaPublicKeyPem: RSA_PUBLIC_KEY_PEM,
    timeoutMs: 45_000
  },
  readOnly: true
};

export type AppEnvironment = typeof environment;
