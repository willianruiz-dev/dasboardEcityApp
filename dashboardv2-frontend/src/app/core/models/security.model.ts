/**
 * DTOs de seguridad (`Dashboard.Domain.DTOs.Security`).
 * Nombres en camelCase: `AddControllers()` usa System.Text.Json con
 * `JsonNamingPolicy.CamelCase`, así que `IdPayPad` llega como `idPayPad`.
 */

/** Permisos reales que compara `PermissionMiddleware` (`role.Permissions.name`). */
export type AccessRight =
  | 'ReadTransactions'
  | 'ReadPayPads'
  | 'WritePayPads'
  | 'DelPayPads'
  | 'ReadTonnagesAndLoads'
  | 'WriteTonnagesAndLoads'
  | 'ReadUsers'
  | 'WriteUsers'
  | 'DelUsers'
  | 'ReadRoles'
  | 'WriteRoles'
  | 'DelRoles'
  | 'ReadRoutes'
  | 'WriteRoutes'
  | 'ReadClients'
  | 'WriteClients'
  | 'ReadOffices'
  | 'WriteOffices'
  | 'ReadMasters'
  | 'WriteMasters'
  | 'ReadSubs'
  | 'WriteSubs'
  | 'DelSubs'
  | (string & {});

export interface Permission {
  id: number;
  name: AccessRight;
  description: string | null;
}

export interface RouteNode {
  id: number;
  idFather: number | null;
  title: string | null;
  route: string | null;
  icon: string | null;
}

export interface Role {
  id: number;
  role: string | null;
  routes: RouteNode[];
  permissions: Permission[];
  dateCreated: string | null;
  userCreated: string | null;
}

export interface User {
  id: number;
  document: string | null;
  idTypeDocument: number;
  typeDocument: string | null;
  userName: string | null;
  name: string | null;
  lastName: string | null;
  phone: string | null;
  email: string | null;
  idRole: number;
  role: string | null;
  status: number;
  idClient: number | null;
  client: string | null;
  img: string | null;
  dateCreated: string | null;
  userCreated: string | null;
}

export interface LoginRequest {
  userName: string;
  /** Contraseña ya cifrada (RSA-OAEP SHA-1 + base64). Nunca viaja en claro. */
  password: string;
}

/** Sesión derivada de: JWT + `/User/Logged` + `/Role/{id}`. */
export interface AuthSession {
  token: string;
  expiresAt: number | null;
  user: User;
  role: Role | null;
  permissions: AccessRight[];
  routes: RouteNode[];
}
