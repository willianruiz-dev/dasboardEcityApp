import { environment } from '../../../environments/environment';

/**
 * Mapa de rutas del backend. Un único lugar donde cambiar la forma en que el
 * SPA llama a `Api_DashboardV2`.
 *
 * Por qué existe este archivo:
 *  - `BaseController` declara `[Route("api/[controller]")]` y `AuthController`
 *    añade además `[Route("[controller]")]`, así que login vive en dos rutas.
 *    Se usa la variante `api/...` por consistencia; si tu IIS publica la otra,
 *    basta con cambiar `pathPrefix`.
 *  - `Transaction` usa rutas relativas confusas (`{idPaypad}`, `Paypad/{idTrx}`,
 *    `{idTrx}/Details`) y conviene tenerlas escritas una sola vez.
 */
export const ApiPath = {
  auth: {
    login: 'Auth/Login',
    loginPayPad: 'Auth/LoginPayPad',
    logout: 'Auth/Logout',
    verifyPwd: 'Auth/VerifyPwd'
  },
  user: {
    logged: 'User/Logged',
    all: 'User',
    byRole: (idRole: number): string => `User/Role/${idRole}`,
    byStatus: (status: number): string => `User/Status/${status}`,
    byId: (id: number): string => `User/${id}`
  },
  role: {
    all: 'Role',
    byId: (id: number): string => `Role/${id}`
  },
  permission: {
    all: 'Permission'
  },
  route: {
    all: 'Route',
    logged: 'Route/GetLoggedRoutes'
  },
  payPad: {
    all: 'PayPad',
    byId: (id: number): string => `PayPad/${id}`,
    byStatus: (status: number): string => `PayPad/Status/${status}`,
    storage: (idPayPad: number): string => `PayPad/GetStorage/${idPayPad}`,
    configuration: (idPayPad: number): string => `PayPad/GetConfiguration/${idPayPad}`
  },
  /** Endpoint de CONSOLIDACIÓN: `GetByDate` devuelve la misma lista filtrada por rango. */
  transaction: {
    all: 'Transaction',
    byMachine: (idPayPad: number): string => `Transaction/${idPayPad}`,
    byMachineAndDate: 'Transaction/GetByDate',
    details: (idTransaction: number): string => `Transaction/${idTransaction}/Details`,
    rating: (idTransaction: number): string => `Transaction/${idTransaction}/Rating`,
    excel: 'Transaction/ExcelDoc',
    video: 'Transaction/Video'
  },
  tonnage: {
    byMachine: (idPayPad: number): string => `Tonnage/GetByPaypad/${idPayPad}`
  },
  load: {
    byMachine: (idPayPad: number): string => `Load/GetByPaypad/${idPayPad}`
  },
  client: {
    all: 'Client'
  },
  office: {
    all: 'Office',
    byClient: (idClient: number): string => `Office/Client/${idClient}`
  },
  alerts: {
    subscriptions: 'Alerts/Subscription',
    byMachine: (idPayPad: number): string => `Alerts/Subscription/GetByPayPad/${idPayPad}`
  },
  masters: {
    currency: 'Masters/Currency',
    currencyDenomination: 'Masters/CurrencyDenomination',
    typeDocument: 'Masters/TypeDocument',
    region: 'Masters/Region'
  }
} as const;

/**
 * POST admitidos a pesar de no ser `GET`: son consultas que el backend modeló
 * con cuerpo (rango de fechas / selección de ids). Ninguno escribe datos.
 */
export const READ_ONLY_QUERY_POST: readonly string[] = [
  ApiPath.auth.login,
  ApiPath.auth.verifyPwd,
  ApiPath.transaction.byMachineAndDate,
  ApiPath.transaction.excel
];

/** Base de la API con prefijo, p.ej. `https://host/api/PayPad`. */
export function buildUrl(path: string, baseUrl: string = environment.api.baseUrl, prefix: string = environment.api.pathPrefix): string {
  const origin = baseUrl.replace(/\/+$/, '');
  const cleanPrefix = prefix.replace(/^\/+|\/+$/g, '');
  const cleanPath = path.replace(/^\/+/, '');
  // Si prefix es '' (caso Auth/Login sin api), no dupliques la barra: https://host/Auth/Login no https://host//Auth/Login
  const url = cleanPrefix ? `${origin}/${cleanPrefix}/${cleanPath}` : `${origin}/${cleanPath}`;
  return url.startsWith('//') ? url.slice(1) : url;
}
