/**
 * Prueba directa de login contra https://apidashboardv2.e-city.co
 * Uso: node test-login-prod.mjs root Root.123
 * Requiere Node 18+ (fetch nativo)
 */
import { readFile } from 'node:fs/promises';

const API = 'https://apidashboardv2.e-city.co';
const KEY_ID = '1E4F66B8-8602-4F9F-9AAC-F1D329A4AB1D';
const PUBLIC_PEM_PATH = './src/app/core/config/rsa-public-key.ts';

const user = process.argv[2] || 'root';
const plainPwd = process.argv[3] || 'Root.123';

async function getPem() {
  const ts = await readFile(PUBLIC_PEM_PATH, 'utf8');
  const m = ts.match(/-----BEGIN PUBLIC KEY-----[\s\S]+?-----END PUBLIC KEY-----/);
  if (!m) throw new Error('No se pudo extraer PEM de rsa-public-key.ts');
  return m[0];
}

function pemToDer(pem) {
  const b64 = pem.replace(/-----BEGIN [^-]+-----/g, '').replace(/-----END [^-]+-----/g, '').replace(/\s+/g, '');
  return Buffer.from(b64, 'base64');
}

async function encryptPassword(plain, pem) {
  const crypto = await import('node:crypto');
  // RSACryptoServiceProvider.Decrypt(data, true) == RSA-OAEP-SHA1
  const encrypted = crypto.publicEncrypt(
    { key: pem, padding: crypto.constants.RSA_PKCS1_OAEP_PADDING, oaepHash: 'sha1' },
    Buffer.from(plain, 'utf8')
  );
  return encrypted.toString('base64');
}

async function main() {
  console.log(`\n=== Test login prod ===`);
  console.log(`API: ${API}/api/Auth/Login`);
  console.log(`User: ${user}`);
  console.log(`Pwd plano: ${plainPwd}`);
  console.log(`DashboardKeyId: ${KEY_ID}\n`);

  const pem = await getPem();
  console.log('PEM extraída:', pem.slice(0, 60) + '...');
  const encrypted = await encryptPassword(plainPwd, pem);
  console.log('Pwd cifrada (primeros 60 chars):', encrypted.slice(0, 60) + '...\n');

  const url = `${API}/api/Auth/Login`;
  console.log(`POST ${url}`);
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'DashboardKeyId': KEY_ID
    },
    body: JSON.stringify({ userName: user, password: encrypted })
  });

  console.log(`\nStatus: ${res.status} ${res.statusText}`);
  const text = await res.text();
  console.log('Body:', text.slice(0, 2000));
  try {
    const json = JSON.parse(text);
    if (json.response) console.log('\nToken:', json.response.slice(0, 80) + '...');
    if (json.message) console.log('Message:', json.message);
  } catch {}

  if (res.status === 0) console.log('\nStatus 0 = No hay conexión (VPN? firewall?)');
  if (res.status === 400 && text.includes('incorrecto')) console.log('\n-> 400 incorrecto: 1) usuario/contraseña mal, 2) clave RSA no coincide con private.pem del servidor, 3) bloqueado por intentos');
  if (res.status === 200) console.log('\n✅ LOGIN OK - credenciales y RSA correctos');
}

main().catch(e => {
  console.error('Error:', e.message);
  console.error(e);
});
