import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';

const testFile = new URL(import.meta.url);
const webSource = path.resolve(path.dirname(testFile.pathname.replace(/^\/(?:[A-Za-z]:)/, (drive) => drive.slice(1))), '..');
const repository = path.resolve(webSource, '..', '..', '..');

const expectedHashes = new Map([
  ['assets/TransformandoTulancingo-2024-300x261.png', 'ab2ddf9869f7d780276936b66aac2b29ee7b8fdab7ed141f7decf42a7c00c8b3'],
  ['assets/dog.jpg', 'b385db5566f52302cd319f4b6d72c5669a0ed2e0c32c0dce81b9d8bb09edc4c5'],
  ['assets/fox.jpg', '6a376ff6dbebfe2f13ad72e74615137d6631f78860e45263f126a3dd43fbcd2f'],
  ['assets/giraffe.jpg', 'f4d6d123b63774cd3e25fe4e0263c51d550a0a2523f94be7cbd4f8cdf01bda8b'],
  ['assets/greenery.jpg', '485c73aead8f152d258b6f7372ff2015cad46fed0a8a212d629e1ed0d876a55d'],
  ['assets/lion.jpg', 'e4e0935b6e6c64dcc1b8999f8920770e3da15c9f5bf22d021a012e75367414eb'],
  ['assets/macaw.jpg', '7b436a17df4be07c6cd93b794bc31784b9e98bd82afb241346b7011876075087'],
  ['assets/model-viewer.min.js', '774edda21e1be2a0934e460ca5943af1fe3f88da130a9f98bd6a9d611576cacf'],
  ['assets/nyilonelycompany-nature-51.glb', 'dcf01e6dc9aea219a5dfd8d4654c4a2def141b533cc26f1c8e5c86da38d82fed'],
  ['assets/savanna.jpg', '14eb1c03bb6d98e4b4e587f5048eaab2c191a89e38abfb2f7d7ae2e27842f47e'],
  ['assets/turtle.jpg', 'c65d5b67d09b63a361ea3156546073e09c00abd0e7c86081deec39e9d38a7db8'],
  ['index.html', 'c2bea6aa75efaf57fdff9f10e4c25d2280df28db6e7d7d2d828f288750a23f43'],
  ['script.js', '0f30aba9c01b3f147780f239ac06f6dbf43ddc0666d95ce4d6d0a3affd2dda39'],
  ['styles.css', '8fa1810c554033bf650cdeb1dfeeb284749b31c2bf84141f1a5b68bb47fb6bdd'],
]);

function gitContentHash(relativePath) {
  let content = readFileSync(path.join(webSource, relativePath));
  if (/\.(?:html|css|js)$/.test(relativePath)) {
    content = Buffer.from(content.toString('utf8').replace(/\r\n/g, '\n'));
  }
  return createHash('sha256').update(content).digest('hex');
}

function localReferences(content, pattern) {
  return [...content.matchAll(pattern)]
    .map((match) => match[1].trim().replace(/^['"]|['"]$/g, ''))
    .filter((reference) => reference && !/^(?:https?:|\/\/|#|data:)/i.test(reference));
}

function walk(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = path.join(directory, entry.name);
    return entry.isDirectory() ? walk(entryPath) : [entryPath];
  });
}

test('CA-01 conserva los 14 archivos y sus hashes de Git', () => {
  assert.equal(expectedHashes.size, 14);
  for (const [relativePath, expectedHash] of expectedHashes) {
    assert.ok(existsSync(path.join(webSource, relativePath)), `Falta ${relativePath}`);
    assert.equal(gitContentHash(relativePath), expectedHash, `Hash distinto: ${relativePath}`);
  }
});

test('CA-02 index.php contiene exactamente la redirección esperada', () => {
  const content = readFileSync(path.join(webSource, 'index.php'), 'utf8').replace(/\r\n/g, '\n');
  assert.equal(content, "<?php\nheader('Location: ./index.html', true, 302);\nexit;\n");
});

test('CA-03 los orígenes portal-web e index.php raíz están ausentes', () => {
  assert.equal(existsSync(path.join(repository, 'portal-web')), false);
  assert.equal(existsSync(path.join(repository, 'index.php')), false);
});

test('CA-04 los artefactos Docker raíz están ausentes', () => {
  for (const name of ['Dockerfile', 'docker-compose.yml', '.dockerignore']) {
    assert.equal(existsSync(path.join(repository, name)), false, `${name} todavía existe`);
  }
});

test('CA-05 las referencias locales HTML y CSS resuelven', () => {
  const html = readFileSync(path.join(webSource, 'index.html'), 'utf8');
  const css = readFileSync(path.join(webSource, 'styles.css'), 'utf8');
  const references = [
    ...localReferences(html, /(?:src|href)\s*=\s*["']([^"']+)["']/gi),
    ...localReferences(css, /url\(\s*([^)]*?)\s*\)/gi),
  ];
  assert.ok(references.length > 0);
  for (const reference of references) {
    const pathname = reference.split(/[?#]/, 1)[0];
    assert.ok(existsSync(path.resolve(webSource, pathname)), `Referencia rota: ${reference}`);
  }
});

test('CA-06 el traslado sigue estructural y conserva hashes de HEAD', () => {
  const files = walk(webSource);
  const forbiddenFiles = files.filter((file) => /\.(?:ts|tsx|jsx)$/.test(file) || path.basename(file) === 'package.json' || /^vite\.config\./.test(path.basename(file)));
  const forbiddenDirectories = files.filter((file) => file.split(path.sep).some((part) => ['node_modules', 'dist', 'build'].includes(part)));
  assert.deepEqual(forbiddenFiles, []);
  assert.deepEqual(forbiddenDirectories, []);
  for (const [relativePath, expectedHash] of expectedHashes) {
    assert.equal(gitContentHash(relativePath), expectedHash, `Hash distinto: ${relativePath}`);
  }
});

test('CA-07 la prueba persistente usa solo builtins y no requiere manifiesto', () => {
  assert.ok(existsSync(testFile));
  const source = readFileSync(testFile, 'utf8');
  const imports = [...source.matchAll(/from\s+['"]([^'"]+)['"]/g)].map((match) => match[1]);
  assert.ok(imports.length > 0);
  assert.ok(imports.every((specifier) => ['node:test', 'node:assert/strict', 'node:fs', 'node:path', 'node:crypto'].includes(specifier)));
  assert.equal(existsSync(path.join(webSource, 'package.json')), false);
});
