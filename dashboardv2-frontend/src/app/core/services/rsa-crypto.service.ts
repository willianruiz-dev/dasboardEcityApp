import { Injectable, inject } from '@angular/core';

import { AppConfigService } from '../config/app-config.service';

/**
 * Cifra la contraseña antes de enviarla a `Auth/Login`.
 *
 * Contrato del backend (`Encryption.DecryptRSA`):
 *   `privateKey.Decrypt(Convert.FromBase64String(pwd), true)`
 * El `true` es **RSAES-OAEP con SHA-1**, por eso se usa `{ name: 'RSA-OAEP', hash: 'SHA-1' }`.
 * Con SHA-256 el login siempre devolvería "Usuario y/o contraseña incorrecto".
 */
@Injectable({ providedIn: 'root' })
export class RsaCryptoService {
  private readonly config = inject(AppConfigService);
  private key: CryptoKey | null = null;

  get available(): boolean {
    return typeof crypto !== 'undefined' && !!crypto.subtle;
  }

  /** @returns password en base64 lista para el campo `password` de `LoginDto`. */
  async encryptPassword(plain: string): Promise<string> {
    if (!this.available) {
      throw new Error(
        'Este navegador no expone Web Crypto (contexto no seguro). Abre el dashboard por HTTPS o por localhost; ' +
          'la API exige la contraseña cifrada con RSA-OAEP.'
      );
    }
    const key = await this.publicKey();
    const cipher = await crypto.subtle.encrypt({ name: 'RSA-OAEP' }, key, new TextEncoder().encode(plain));
    return toBase64(cipher);
  }

  private async publicKey(): Promise<CryptoKey> {
    if (this.key) return this.key;
    const der = pemToDer(this.config.rsaPublicKeyPem);
    this.key = await crypto.subtle.importKey('spki', der, { name: 'RSA-OAEP', hash: 'SHA-1' }, false, ['encrypt']);
    return this.key;
  }
}

/** Quita armadura PEM y devuelve los bytes DER. */
function pemToDer(pem: string): ArrayBuffer {
  const body = pem
    .replace(/-----BEGIN [^-]+-----/g, '')
    .replace(/-----END [^-]+-----/g, '')
    .replace(/\s+/g, '');
  if (body.length === 0) throw new Error('No hay clave pública RSA configurada.');
  const binary = atob(body);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

function toBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let chunk = '';
  const step = 0x8000;
  for (let i = 0; i < bytes.length; i += step) {
    chunk += String.fromCharCode(...bytes.subarray(i, i + step));
  }
  return btoa(chunk);
}
