import { RSA_PUBLIC_KEY_PEM } from '../app/core/config/rsa-public-key';

/**
 * Build `demo`: optimizaciones de producción + dataset en memoria.
 * Sirve para previsualizar y para validar UX sin tocar `DASHBOARD_PRODUCCION`.
 */
export const environment = {
  production: true,
  dataProvider: 'mock' as 'mock' | 'http',
  api: {
    baseUrl: '',
    pathPrefix: 'api',
    dashboardKeyId: '1E4F66B8-8602-4F9F-9AAC-F1D329A4AB1D',
    rsaPublicKeyPem: RSA_PUBLIC_KEY_PEM,
    timeoutMs: 30_000
  },
  readOnly: true
};

export type AppEnvironment = typeof environment;
