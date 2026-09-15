/**
 * Servidor estático mínimo para previsualizar el build de producción.
 * Evita depender de `ng serve` (y de sus validaciones de Host) al desplegar
 * en IIS/Nginx: el mismo `dist/` se sirve tal cual.
 */
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';

const port = Number(process.argv[2] ?? 4200);
const root = normalize(new URL('../dist/dashboardv2-frontend/browser/', import.meta.url).pathname);

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2'
};

const server = createServer(async (req, res) => {
  const url = new URL(req.url ?? '/', 'http://localhost');
  let path = join(root, decodeURIComponent(url.pathname));

  const exists = await stat(path).catch(() => null);
  if (!exists || exists.isDirectory()) path = join(root, 'index.html');

  const body = await readFile(path).catch(() => Buffer.from('not found'));
  res.writeHead(200, {
    'Content-Type': MIME[extname(path)] ?? 'application/octet-stream',
    'Cache-Control': 'no-cache'
  });
  res.end(body);
});

server.listen(port, '0.0.0.0', () => console.log(`preview: http://0.0.0.0:${port}`));
