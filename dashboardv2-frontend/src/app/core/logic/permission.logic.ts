import type { AccessRight, RouteNode, Role, User } from '../models/security.model';

/** `root` en el backend salta todos los checks (`userLogged.UserName == "root"`). */
export const ROOT_USER = 'root';

export function rightsOf(role: Role | null | undefined): AccessRight[] {
  return (role?.permissions ?? []).map((p) => p.name).filter(Boolean);
}

export function isSuperUser(user: User | null | undefined): boolean {
  return user?.userName?.toLowerCase() === ROOT_USER;
}

/** ¿El rol tiene TODOS los permisos indicados? (los `root` pasan siempre) */
export function hasAll(user: User | null | undefined, rights: AccessRight[], required: AccessRight[]): boolean {
  if (required.length === 0) return true;
  if (isSuperUser(user)) return true;
  return required.every((r) => rights.includes(r));
}

/** ¿El rol tiene AL MENOS UNO de los permisos? */
export function hasAny(user: User | null | undefined, rights: AccessRight[], required: AccessRight[]): boolean {
  if (required.length === 0) return true;
  if (isSuperUser(user)) return true;
  return required.some((r) => rights.includes(r));
}

/**
 * Un dashboard de SOLO CONSULTA sólo puede montar vistas cuyos permisos sean de lectura.
 * Si un rol trae p.ej. `WritePayPads` pero no `ReadPayPads`, la vista no se ofrece.
 */
export function readOnlyViewAllowed(user: User | null | undefined, rights: AccessRight[], read: AccessRight[]): boolean {
  return hasAny(user, rights, read);
}

export interface MenuEntry {
  id: number;
  title: string;
  path: string;
  icon: string;
  children: MenuEntry[];
  /** false cuando la ruta del backend no tiene vista en este SPA. */
  implemented: boolean;
}

const ICONS: Record<string, string> = {
  home: 'dashboard',
  dashboard: 'dashboard',
  transaccion: 'receipt',
  maquina: 'machine',
  paypad: 'machine',
  analisis: 'chart',
  reporte: 'download',
  usuario: 'users',
  rol: 'shield',
  seguridad: 'shield'
};

function iconFor(title: string | null, route: string | null, icon: string | null): string {
  if (icon && icon.trim().length > 0) return icon.trim();
  const haystack = `${title ?? ''} ${route ?? ''}`.toLowerCase();
  const hit = Object.keys(ICONS).find((k) => haystack.includes(k));
  return hit ? (ICONS[hit] as string) : 'circle';
}

/**
 * Convierte el árbol `security.Route` (GetLoggedRoutes) en un menú plano/hiérquico.
 * Se respetan `idFather` y se descartan rutas sin vista implementada.
 */
export function buildMenu(routes: RouteNode[], knownPaths: readonly string[]): MenuEntry[] {
  const toEntry = (node: RouteNode): MenuEntry => {
    const raw = (node.route ?? '').replace(/^\/+/, '').replace(/\/+$/, '');
    const path = raw === '' ? '' : `/${raw}`;
    return {
      id: node.id,
      title: node.title ?? path,
      path,
      icon: iconFor(node.title, node.route, node.icon),
      children: [],
      implemented: knownPaths.includes(path)
    };
  };

  const entries = routes.map(toEntry);
  const byId = new Map(entries.map((e) => [e.id, e]));
  const roots: MenuEntry[] = [];

  entries.forEach((entry, index) => {
    const fatherId = routes[index]?.idFather ?? null;
    const parent = fatherId != null ? byId.get(fatherId) : undefined;
    if (parent && parent !== entry) parent.children.push(entry);
    else roots.push(entry);
  });

  const prune = (list: MenuEntry[]): MenuEntry[] =>
    list
      .map((e) => ({ ...e, children: prune(e.children) }))
      .filter((e) => (e.implemented && e.path !== '') || e.children.length > 0);

  const pruned = prune(roots);
  return pruned.length > 0 ? pruned : fallbackMenu(knownPaths);
}

/** Menú mínimo garantizado: si `Route/GetLoggedRoutes` falla o no tiene rutas, la UI no queda vacía. */
export function fallbackMenu(knownPaths: readonly string[]): MenuEntry[] {
  const all: MenuEntry[] = [
    { id: -1, title: 'Consulta por máquina', path: '/sales', icon: 'receipt', children: [], implemented: true },
    { id: -2, title: 'Panorama operativo', path: '/overview', icon: 'dashboard', children: [], implemented: true },
    { id: -3, title: 'Analítica', path: '/analytics', icon: 'chart', children: [], implemented: true },
    { id: -4, title: 'Máquinas', path: '/machines', icon: 'machine', children: [], implemented: true },
    { id: -5, title: 'Operadores', path: '/users', icon: 'users', children: [], implemented: true },
    { id: -6, title: 'Roles y permisos', path: '/security', icon: 'shield', children: [], implemented: true }
  ];
  return all.filter((e) => knownPaths.includes(e.path));
}
