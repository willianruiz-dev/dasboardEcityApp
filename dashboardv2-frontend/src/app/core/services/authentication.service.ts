import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { rightsOf } from '../logic/permission.logic';
import type { LoginRequest, RouteNode } from '../models/security.model';
import { SecurityPort } from '../ports/security.port';
import { PermissionService } from './permission.service';
import { RsaCryptoService } from './rsa-crypto.service';
import { AuthService } from './auth.service';
import { AppConfigService } from '../config/app-config.service';

export interface LoginOutcome {
  ok: boolean;
  message: string;
}

/**
 * CASO DE USO de autenticación. Orquesta el flujo real del backend:
 *
 *  1. `POST Auth/Login` con la contraseña cifrada RSA-OAEP → JWT (string).
 *  2. `GET User/Logged` → usuario + `idRole` (el JWT sólo trae `Document`/`UserName`).
 *  3. `GET Role/{idRole}` → permisos que usan los guards (`ReadTransactions`, …).
 *  4. `GET Route/GetLoggedRoutes` → menú asignado al rol.
 *
 * Un paso 2–4 que falle no tumba el login: se degrada a sesión sin menú y el
 * `PermissionService` usa el fallback del SPA (nunca se autoriza en el cliente).
 */
@Injectable({ providedIn: 'root' })
export class AuthenticationService {
  private readonly security = inject(SecurityPort);
  private readonly auth = inject(AuthService);
  private readonly permissions = inject(PermissionService);
  private readonly crypto = inject(RsaCryptoService);
  private readonly config = inject(AppConfigService);

  async login(userName: string, password: string): Promise<LoginOutcome> {
    const isMock = this.config.dataProvider() === 'mock';
    // En mock no se cifra; en prod se exige CIFRADO RSA-OAEP-SHA1 (lo que espera Encryption.DecryptRSA en apidashboardv2.e-city.co).
    // Si el navegador está en http:// (no seguro) crypto.subtle no existe -> NO hay fallback a plain porque tu servidor SÍ exige cifrado (probado: Auth/Login con cifrado da 200, con plain no).
    let encrypted: string | null = null;
    if (!isMock) {
      try {
        encrypted = await this.crypto.encryptPassword(password);
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        console.error('[auth] Web Crypto fallo', msg);
        return { ok: false, message: msg };
      }
    }

    const tryLogin = async (pwdToSend: string, label: string) => {
      const request: LoginRequest = { userName: userName.trim(), password: pwdToSend };
      console.info(`[auth] intentando login ${label} -> POST ${this.config.baseUrl}/${this.config.pathPrefix}/Auth/Login`);
      const token = await firstValueFrom(this.security.login(request));
      if (!token) throw new Error('El API no devolvió token. Revisa las credenciales.');
      return token;
    };

    try {
      const token = isMock
        ? await tryLogin(password, 'mock/plain')
        : await tryLogin(encrypted!, 'RSA-OAEP-SHA1').catch(async (err: unknown) => {
              const msg = err instanceof Error ? err.message : String(err);
              const status = (err as { status?: number })?.status;
              if (status === 0) throw err;
              // Si el servidor rechazó el cifrado (no debería pasar en apidashboardv2, que sí exige cifrado), prueba plain como último recurso
              if (status === 400 || msg.includes('incorrecto') || msg.includes('desencript') || msg.includes('token')) {
                console.warn('[auth] login cifrado falló, reintentando en texto plano', msg);
                return tryLogin(password, 'plain-fallback');
              }
              throw err;
            });
      if (!token) return { ok: false, message: 'El API no devolvió token. Revisa las credenciales.' };

      const user = await firstValueFrom(this.security.loggedUser()).catch(() => null);
      const role = user ? await firstValueFrom(this.security.roleById(user.idRole)).catch(() => null) : null;
      const routes = await firstValueFrom(this.security.loggedRoutes()).catch(() => [] as RouteNode[]);

      if (!user) {
        this.auth.close();
        return { ok: false, message: 'Token válido pero el API no devolvió el usuario (`User/Logged`).' };
      }

      this.auth.open(token, user, role ?? null, routes ?? []);
      this.permissions.sync(role ? rightsOf(role) : []);
      return { ok: true, message: `Hola, ${user.name ?? user.userName}` };
    } catch (error) {
      this.auth.close();
      const message = error instanceof Error ? error.message : 'Credenciales inválidas.';
      return { ok: false, message };
    }
  }

  /** Cierra en el servidor (`Auth/Logout` revoca `security.Session`) y limpia el estado local. */
  async logout(): Promise<void> {
    try {
      await firstValueFrom(this.security.logout());
    } catch {
      // Si el token ya expiró, el logout del backend devuelve error: igual limpiamos.
    }
    this.auth.close();
    this.permissions.reset();
  }

  /**
   * `APP_INITIALIZER`: si hay sesión en `sessionStorage`, se revalidan rol y menú.
   * Así un F5 no deja el sidebar vacío ni los guards a ciegas.
   */
  async resume(): Promise<void> {
    const session = this.auth.session();
    if (!session || !this.auth.isAuthenticated()) return;

    const role = await firstValueFrom(this.security.roleById(session.user.idRole)).catch(() => null);
    const routes = await firstValueFrom(this.security.loggedRoutes()).catch(() => session.routes);

    this.auth.attachSecurity(role ?? session.role, routes ?? session.routes ?? []);
    if (role) this.permissions.sync(rightsOf(role));
  }
}
