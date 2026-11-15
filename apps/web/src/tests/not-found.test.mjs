import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { createServer } from 'node:net';
import { request } from 'node:http';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';

const testFile = new URL(import.meta.url);
const webSource = path.resolve(path.dirname(testFile.pathname), '..');
const repository = path.resolve(webSource, '..', '..', '..');
const notFoundPage = path.join(webSource, '404.html');
const stylesFile = path.join(webSource, 'styles.css');
const routerFile = path.join(webSource, 'router.php');
const infraReadme = path.join(repository, 'infra', 'README.md');

function read(file) {
  return readFileSync(file, 'utf8');
}

function reservePort() {
  return new Promise((resolve, reject) => {
    const server = createServer();
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      assert.ok(address && typeof address === 'object');
      const { port } = address;
      server.close((error) => error ? reject(error) : resolve(port));
    });
  });
}

async function waitForServer(url, process, stderr) {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    if (process.exitCode !== null) {
      throw new Error(`El servidor PHP terminó antes de iniciar. ${stderr()}`);
    }

    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch {
      // El puerto todavía no está listo.
    }

    await delay(100);
  }

  throw new Error(`El servidor PHP no respondió a tiempo. ${stderr()}`);
}

async function stopServer(process) {
  if (process.exitCode !== null) return;
  process.kill('SIGTERM');
  await Promise.race([
    new Promise((resolve) => process.once('exit', resolve)),
    delay(2_000).then(() => process.kill('SIGKILL')),
  ]);
}

function rawRequest(port, requestPath) {
  return new Promise((resolve, reject) => {
    const call = request({
      host: '127.0.0.1',
      port,
      method: 'GET',
      path: requestPath,
    }, (response) => {
      let body = '';
      response.setEncoding('utf8');
      response.on('data', (chunk) => { body += chunk; });
      response.on('end', () => resolve({
        body,
        headers: response.headers,
        status: response.statusCode,
      }));
    });
    call.once('error', reject);
    call.end();
  });
}

test('CA-01 custom-not-found-page: presenta identidad institucional y mensaje en español', () => {
  assert.ok(existsSync(notFoundPage), 'Debe existir apps/web/src/404.html');
  const html = read(notFoundPage);

  assert.match(html, /<link[^>]+href="\/styles\.css"/i);
  assert.match(html, /assets\/logo-120\.webp/i);
  assert.match(html, />\s*404\s*</i);
  assert.match(html, /Página no encontrada/i);
  assert.doesNotMatch(html, /(?:src|href)="https?:\/\//i);
});

test('CA-02 custom-not-found-page: ofrece inicio, noticias y eventos con destinos existentes', () => {
  const html = read(notFoundPage);
  const destinations = new Map([
    ['Volver al inicio', '/index.html'],
    ['Ver noticias', '/noticias.html'],
    ['Ver eventos', '/eventos.html'],
  ]);

  for (const [label, destination] of destinations) {
    const escapedDestination = destination.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    assert.match(html, new RegExp(`<a[^>]+href="${escapedDestination}"[^>]*>[^<]*(?:<[^>]+>[^<]*<\\/[^>]+>[^<]*)*${label}`, 'i'));
    assert.ok(existsSync(path.join(webSource, destination.slice(1))), `${destination} debe existir`);
  }
});

test('CA-03 custom-not-found-page: conserva semántica, español y foco visible', () => {
  const html = read(notFoundPage);
  const styles = read(stylesFile);

  assert.match(html, /<html[^>]+lang="es"/i);
  assert.match(html, /<title>[^<]*Página no encontrada[^<]*<\/title>/i);
  assert.equal((html.match(/<h1(?:\s|>)/gi) ?? []).length, 1);
  assert.match(html, /<main(?:\s|>)/i);
  assert.match(styles, /:focus-visible\s*\{[^}]*outline:/s);
  assert.match(styles, /\.not-found-actions/s);
});

test('CA-04 custom-not-found-page: el servidor PHP devuelve 404 real y conserva páginas válidas', { timeout: 15_000 }, async () => {
  assert.ok(existsSync(routerFile), 'Debe existir apps/web/src/router.php');
  const port = await reservePort();
  const baseUrl = `http://127.0.0.1:${port}`;
  let errors = '';
  const server = spawn('php', ['-S', `127.0.0.1:${port}`, '-t', webSource, routerFile], {
    cwd: repository,
    stdio: ['ignore', 'ignore', 'pipe'],
  });
  server.stderr.setEncoding('utf8');
  server.stderr.on('data', (chunk) => { errors += chunk; });

  try {
    await waitForServer(`${baseUrl}/index.html`, server, () => errors);

    const missing = await fetch(`${baseUrl}/ruta/inexistente?dato=no-reflejado`, { redirect: 'manual' });
    assert.equal(missing.status, 404);
    assert.match(missing.headers.get('content-type') ?? '', /^text\/html;\s*charset=UTF-8$/i);
    assert.equal(missing.headers.get('location'), null);
    const body = await missing.text();
    assert.match(body, /Página no encontrada/i);
    assert.doesNotMatch(body, /dato=no-reflejado/);

    for (const page of ['/index.html', '/noticias.html', '/eventos.html']) {
      const response = await fetch(`${baseUrl}${page}`);
      assert.equal(response.status, 200, `${page} debe conservar HTTP 200`);
    }

    const traversal = await rawRequest(port, '/%2e%2e/CONSTITUTION.md');
    assert.equal(traversal.status, 404);
    assert.doesNotMatch(traversal.body, /Constitución de ARCA-NB/);
  } finally {
    await stopServer(server);
  }
});

test('CA-05 custom-not-found-page: despliegue exige documento 404 sin elegir proveedor', () => {
  const infra = read(infraReadme);

  assert.match(infra, /Portal público: página no encontrada/i);
  assert.match(infra, /404\.html/);
  assert.match(infra, /estado HTTP `404`/i);
  assert.match(infra, /páginas válidas[^\n]+`200`/i);
  assert.match(infra, /hosting[^\n]+por definir/i);
});

test('CA-06 custom-not-found-page: todos los criterios tienen pruebas sin dependencias nuevas', () => {
  const source = read(testFile.pathname);

  for (let criterion = 1; criterion <= 5; criterion += 1) {
    assert.match(source, new RegExp(`test\\('CA-0${criterion} custom-not-found-page:`));
  }

  assert.doesNotMatch(source, /from ['"](?!node:)[^./]/);
  assert.equal(existsSync(path.join(webSource, 'package.json')), false);
});
