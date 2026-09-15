/**
 * Prueba de humo ejecutable en Node (sin Angular, sin DOM, sin karma):
 *
 *   npm run smoke
 *
 * Cubre lo que más duele si está mal y lo que NO se puede verificar "a ojo":
 *  1. El formato de fecha que exige `DateTime.ParseExact` en `Transaction/GetByDate`.
 *  2. La política de solo lectura (que ningún `PUT/PATCH/DELETE` o `POST` de escritura
 *     pueda salir del SPA) y que su allowlist apunte a rutas que existen.
 *  3. El contrato de login: RSA-OAEP **SHA-1** cifrado con la clave pública del repo y
 *     descifrado con la privada, igual que hace `Encryption.DecryptRSA` (.NET).
 *     Si alguien rota el par de claves, el chequeo de deriva lo detecta.
 *  4. El motor de la grilla (orden, búsqueda sin acentos, paginación).
 */
import assert from 'node:assert/strict';
import { createPrivateKey, constants, privateDecrypt } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { presetRange, previousRange, rangeInDays, toApiDate } from '../src/app/core/logic/date-range.logic.ts';
import { deltaPercent, isSettled, summarize } from '../src/app/core/logic/aggregate.logic.ts';
import { paginate, pageWindow, searchRows, sortRows } from '../src/app/core/logic/table.logic.ts';
import { isReadOnlyAllowed, BLOCKED_METHODS } from '../src/app/core/logic/readonly-policy.logic.ts';
import { ApiPath, READ_ONLY_QUERY_POST } from '../src/app/core/config/api-paths.ts';
import { RSA_PUBLIC_KEY_PEM } from '../src/app/core/config/rsa-public-key.ts';

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(here, '..', '..');

let passed = 0;
const test = async (name, fn) => {
  try {
    await fn();
    passed += 1;
    console.log(`  ok  ${name}`);
  } catch (error) {
    console.error(`FAIL  ${name}\n     ${error.message}`);
    process.exitCode = 1;
  }
};

const API_DATE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;

console.log('1) contrato de fechas · Transaction/GetByDate');
await test('toApiDate respeta "yyyy-MM-ddTHH:mm:ss.fffZ" (DateTime.ParseExact)', () => {
  const value = toApiDate(new Date(Date.UTC(2026, 0, 5, 9, 7, 3, 42)));
  assert.equal(value, '2026-01-05T09:07:03.042Z');
  assert.match(value, API_DATE);
  assert.ok(!Number.isNaN(Date.parse(value)), 'debe ser parseable también por JS');
});

await test('los presets cubren días completos en UTC (inclusive)', () => {
  const { from, to } = presetRange('7d', new Date(Date.UTC(2026, 8, 14, 15, 30)));
  assert.equal(rangeInDays({ from, to }), 7);
  assert.equal(from.getUTCHours(), 0);
  assert.equal(to.getUTCHours(), 23);
  assert.equal(to.getUTCMinutes(), 59);
});

await test('previousRange retrocede exactamente la misma ventana', () => {
  const range = presetRange('30d');
  const previous = previousRange(range);
  assert.equal(rangeInDays(previous), rangeInDays(range));
  assert.ok(previous.to < range.from);
});

console.log('2) política de solo lectura');
await test('GET/HEAD/OPTIONS siempre permitidos', () => {
  for (const verb of ['GET', 'head', 'OPTIONS']) {
    assert.equal(isReadOnlyAllowed(verb, 'https://api.local/api/Transaction/12'), true, verb);
  }
});

await test('los POST de búsqueda están permitidos', () => {
  for (const path of READ_ONLY_QUERY_POST) {
    assert.equal(isReadOnlyAllowed('POST', `https://api.local/api/${path}`), true, path);
    assert.equal(isReadOnlyAllowed('POST', `/api/${path}`), true, `same-origin ${path}`);
  }
});

await test('ninguna mutación del TransactionController pasa', () => {
  const writes = [
    ['POST', '/api/Transaction/Paypad'],
    ['PUT', '/api/Transaction/Paypad'],
    ['POST', '/api/Transaction/Paypad/UploadVideo'],
    ['POST', '/api/Transaction/Rating'],
    ['PUT', '/api/PayPad'],
    ['DELETE', '/api/PayPad/7'],
    ['POST', '/api/User'],
    ['PUT', '/api/Role'],
    ['DELETE', '/api/Alerts/Subscription/3']
  ];
  for (const [verb, path] of writes) {
    assert.equal(isReadOnlyAllowed(verb, path), false, `${verb} ${path} NO debería permitirse`);
  }
  for (const verb of BLOCKED_METHODS) assert.equal(isReadOnlyAllowed(verb, '/api/Transaction/1'), false, verb);
});

await test('el allowlist sólo cita rutas que existen en ApiPath', () => {
  const flattened = new Set(
    Object.values(ApiPath)
      .flatMap((group) => Object.values(group))
      .filter((value) => typeof value === 'string')
  );
  for (const allowed of READ_ONLY_QUERY_POST) {
    assert.ok(flattened.has(allowed), `READ_ONLY_QUERY_POST apunta a "${allowed}", inexistente en ApiPath`);
  }
});

console.log('3) contrato de login · RSA-OAEP SHA-1');
await test('la clave pública del SPA es la misma del repo (sin deriva de claves)', () => {
  const onDisk = normalizePem(readPem(join(repoRoot, 'dashboardv2-backend/Resource/rsa_keys/public.pem')));
  assert.equal(normalizePem(RSA_PUBLIC_KEY_PEM), onDisk, 'public.pem cambió: actualiza core/config/rsa-public-key.ts');
});

await test('cifrar en el navegador y descifrar como .NET devuelve la contraseña', async () => {
  const secret = 'P@ssw0rd·eCity/2026';
  const key = await crypto.subtle.importKey('spki', pemToDer(RSA_PUBLIC_KEY_PEM), { name: 'RSA-OAEP', hash: 'SHA-1' }, false, ['encrypt']);
  const cipher = await crypto.subtle.encrypt({ name: 'RSA-OAEP' }, key, new TextEncoder().encode(secret));
  const b64 = Buffer.from(cipher).toString('base64');

  // Espejo de Encryption.DecryptRSA: RSACryptoServiceProvider.Decrypt(bytes, true) == OAEP-SHA1
  const privateKey = createPrivateKey({ key: readPem(join(repoRoot, 'dashboardv2-backend/Resource/rsa_keys/private.pem')), format: 'pem' });
  const plain = privateDecrypt({ key: privateKey, padding: constants.RSA_PKCS1_OAEP_PADDING, oaepHash: 'sha1' }, Buffer.from(b64, 'base64'));

  assert.equal(plain.toString('utf8'), secret);
});

await test('OAEP-SHA256 NO interoperaría (por eso el hash debe ser SHA-1)', async () => {
  const key = await crypto.subtle.importKey('spki', pemToDer(RSA_PUBLIC_KEY_PEM), { name: 'RSA-OAEP', hash: 'SHA-256' }, false, ['encrypt']);
  const cipher = await crypto.subtle.encrypt({ name: 'RSA-OAEP' }, key, new TextEncoder().encode('no-op'));
  const privateKey = createPrivateKey({ key: readPem(join(repoRoot, 'dashboardv2-backend/Resource/rsa_keys/private.pem')), format: 'pem' });
  assert.throws(
    () => privateDecrypt({ key: privateKey, padding: constants.RSA_PKCS1_OAEP_PADDING, oaepHash: 'sha1' }, Buffer.from(cipher)),
    /bad oaep|decrypt|oaep/i,
    'si esto no falla, el comentario del código está mal'
  );
});

console.log('4) agregación y grilla');
const trx = (id, paypad, amount, state, hour, product = 'Recarga celular', payment = 'Efectivo') => ({
  id,
  idPayPad: paypad,
  payPad: `PAYP-${paypad}`,
  totalAmount: amount,
  realAmount: amount,
  incomeAmount: state === 'Completada' ? amount : 0,
  returnAmount: state === 'Completada' ? 0 : amount,
  stateTransaction: state,
  typeTransaction: 'Autoventa',
  typePayment: payment,
  product,
  dateCreated: `2026-09-0${1 + (hour % 9)}T${String(hour).padStart(2, '0')}:15:00.000Z`,
  document: null,
  reference: `R${id}`,
  description: null,
  idStateTransaction: 1,
  idTypeTransaction: 1,
  idTypePayment: 1,
  dateUpdated: null,
  userCreated: 'lruiz'
});

await test('los montos anulados no suman caja pero sí se cuentan', () => {
  const summary = summarize([trx(1, 1, 20_000, 'Completada', 12), trx(2, 1, 50_000, 'Anulada', 13)]);
  assert.equal(summary.totalBilled, 20_000);
  assert.equal(summary.totalReturned, 50_000);
  assert.equal(summary.transactions.length, 2);
  assert.equal(isSettled(trx(9, 1, 1, 'Rechazada', 8)), false);
});

await test('agrega por estado, medio de pago, hora y máquina', () => {
  const summary = summarize(
    [trx(1, 1, 10_000, 'Completada', 9, 'Recarga', 'Nequi'), trx(2, 1, 30_000, 'Completada', 9, 'Retiro', 'Efectivo'), trx(3, 2, 5_000, 'Pendiente', 20)],
    new Map([
      [1, { label: 'PAYP-A', office: 'Centro' }],
      [2, { label: 'PAYP-B', office: 'Norte' }]
    ])
  );
  assert.equal(summary.machines[0].label, 'PAYP-A');
  assert.equal(summary.machines[0].billed, 40_000);
  assert.equal(summary.byHour.reduce((acc, b) => acc + b.count, 0), 3);
  assert.equal(summary.byPaymentType.length, 2, 'el mix de medios sólo agrega lo liquidado');
  assert.equal(Math.round(summary.bestMachine.share), 89);
  assert.equal(deltaPercent(150, 100), 50);
  assert.equal(deltaPercent(1, 0), undefined);
});

const rows = [
  { id: 3, machineLabel: 'PAYP-C', totalAmount: 500 },
  { id: 1, machineLabel: 'PAYP-A', totalAmount: 100 },
  { id: 2, machineLabel: 'PAYP-B', totalAmount: 200 }
];

await test('la grilla ordena, busca sin acentos y nunca paga páginas vacías', () => {
  assert.deepEqual(sortRows(rows, { key: 'totalAmount', direction: 'desc' }).map((r) => r.id), [3, 2, 1]);
  assert.equal(searchRows([{ id: 1, product: 'PÉAJE' }], 'peaje', ['product']).length, 1);
  const page = paginate(rows, { page: 99, size: 2 });
  assert.equal(page.page, 2);
  assert.equal(page.rows.length, 1);
  assert.deepEqual(pageWindow(1, 1), [1]);
  assert.equal(pageWindow(5, 10).includes('…'), true);
});

/**
 * Lee un .pem del repo tolerando su codificación real: `Resource/rsa_keys/*.pem` están en
 * **UTF-16LE sin BOM**, que es lo que rompe los parsers ingenuos (y lo que obliga a este helper).
 */
function readPem(path) {
  const buffer = readFileSync(path);
  const stripped = buffer[0] === 0xff && buffer[1] === 0xfe ? buffer.subarray(2) : buffer;
  const candidates = [buffer.toString('utf8'), stripped.toString('utf16le')];
  for (const text of candidates) {
    const clean = text.replace(/\r/g, '').replace(/\0/g, '').trim();
    if (clean.includes('BEGIN ') && clean.includes('END ')) return clean + '\n';
  }
  throw new Error(`PEM ilegible o inesperado: ${path}`);
}

function pemToDer(pem) {
  const body = pem.replace(/-----BEGIN [^-]+-----/g, '').replace(/-----END [^-]+-----/g, '').replace(/\s+/g, '');
  return Uint8Array.from(Buffer.from(body, 'base64')).buffer;
}

function normalizePem(pem) {
  return pem.replace(/\uFEFF/g, '').replace(/\s+/g, '').trim();
}

console.log(`\n${passed} comprobaciones de contrato y lógica pasan.`);
