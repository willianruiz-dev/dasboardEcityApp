/**
 * Entorno de DESARROLLO - ahora apunta a PROD para que `npm start` también funcione con tus credenciales.
 * Si quieres volver al mock sin backend, cambia dataProvider a 'mock'.
 * Swagger ya te abre en https://apidashboardv2.e-city.co/swagger, así que este baseUrl directo debe funcionar.
 */
import { RSA_PUBLIC_KEY_PEM } from '../app/core/config/rsa-public-key';

export const environment = {
  production: false,
  dataProvider: 'http' as 'mock' | 'http',
  api: {
    /** Directo a prod (funciona si swagger te abre y tienes VPN). Para usar proxy local cambia a '' y usa npm run start:api:prod */
    baseUrl: 'https://apidashboardv2.e-city.co',
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
