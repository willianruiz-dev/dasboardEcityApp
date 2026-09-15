/**
 * Prueba flujo completo post-login contra apidashboardv2.e-city.co
 * Uso: node test-full-flow.mjs root Root.123
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
  return m[0];
}

async function encrypt(plain, pem) {
  const crypto = await import('node:crypto');
  return crypto.publicEncrypt({ key: pem, padding: crypto.constants.RSA_PKCS1_OAEP_PADDING, oaepHash: 'sha1' }, Buffer.from(plain)).toString('base64');
}

async function call(path, token = null, method = 'GET', body = null) {
  const url = `${API}${path.startsWith('/') ? '' : '/'}${path}`;
  const headers = { 'DashboardKeyId': KEY_ID, 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(url, { method, headers, body: body ? JSON.stringify(body) : undefined });
  const text = await res.text();
  let json = null;
  try { json = JSON.parse(text); } catch {}
  return { url, status: res.status, text: text.slice(0, 2000), json };
}

async function main() {
  const pem = await getPem();
  const enc = await encrypt(plainPwd, pem);
  console.log(`\n1) POST /Auth/Login (cifrado) user=${user}`);
  let r = await call('/Auth/Login', null, 'POST', { userName: user, password: enc });
  console.log(`   -> ${r.status} ${r.text.slice(0, 500)}`);
  if (r.status !== 200) {
    console.log(`   -> También probando /api/Auth/Login`);
    r = await call('/api/Auth/Login', null, 'POST', { userName: user, password: enc });
    console.log(`   -> ${r.status} ${r.text.slice(0, 500)}`);
  }
  if (r.status !== 200 || !r.json?.response) {
    console.log('❌ Login falló, no hay token');
    return;
  }
  const token = r.json.response;
  console.log(`\n✅ Token OK: ${token.slice(0, 60)}...`);

  const endpoints = [
    '/api/User/Logged',
    '/api/Role/1',
    '/api/Route/Logged',
    '/api/Route', // todas las rutas
    '/api/Permission',
    '/api/Transaction',
    '/api/PayPad',
  ];
  for (const ep of endpoints) {
    const res = await call(ep, token);
    console.log(`\nGET ${ep} -> ${res.status}`);
    console.log(`   Body: ${res.text.slice(0, 800)}`);
    if (res.json) console.log(`   message: ${res.json.message} | response type: ${typeof res.json.response} ${Array.isArray(res.json.response) ? 'array len ' + res.json.response.length : ''}`);
  }
}

main().catch(e => console.error(e));
