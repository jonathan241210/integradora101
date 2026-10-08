import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { runInNewContext } from 'node:vm';

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

function themeTokens() {
  const css = readFileSync(path.join(webSource, 'styles.css'), 'utf8');
  const root = css.match(/:root\s*\{([^}]*)\}/s)?.[1];
  assert.ok(root, 'No se encontró el bloque central :root');
  return new Map([...root.matchAll(/--([\w-]+)\s*:\s*([^;]+);/g)].map((match) => [match[1], match[2].trim()]));
}

function luminance(hexColor) {
  const normalized = hexColor.replace('#', '');
  const expanded = normalized.length === 3 ? [...normalized].map((digit) => digit + digit).join('') : normalized;
  assert.match(expanded, /^[\da-f]{6}$/i, `Color hexadecimal inválido: ${hexColor}`);
  const channels = [0, 2, 4].map((offset) => parseInt(expanded.slice(offset, offset + 2), 16) / 255);
  const linear = channels.map((channel) => (channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4));
  return linear[0] * 0.2126 + linear[1] * 0.7152 + linear[2] * 0.0722;
}

function contrastRatio(first, second) {
  const values = [luminance(first), luminance(second)].sort((a, b) => b - a);
  return (values[0] + 0.05) / (values[1] + 0.05);
}

function mountMobileNavigation(initialWidth = 390) {
  const listeners = new Map();
  const attributes = new Map([['aria-expanded', 'false']]);
  const menuToggle = {
    hidden: true,
    addEventListener: (type, listener) => listeners.set(`toggle:${type}`, listener),
    setAttribute: (name, value) => attributes.set(name, value),
    getAttribute: (name) => attributes.get(name),
    focus: () => { document.activeElement = menuToggle; },
  };
  const navLink = {
    focus: () => { document.activeElement = navLink; },
    closest: (selector) => selector === 'a' ? navLink : null,
  };
  const mainNav = {
    hidden: false,
    addEventListener: (type, listener) => listeners.set(`nav:${type}`, listener),
    contains: (element) => element === navLink,
    querySelector: () => navLink,
  };
  const document = {
    activeElement: null,
    addEventListener: (type, listener) => listeners.set(`document:${type}`, listener),
    getElementById: (id) => id === 'menuToggle' ? menuToggle : mainNav,
  };
  const mediaQuery = {
    matches: initialWidth <= 820,
    addEventListener: (type, listener) => listeners.set(`media:${type}`, listener),
  };
  const window = { matchMedia: () => mediaQuery };
  const script = readFileSync(path.join(webSource, 'script.js'), 'utf8');
  const start = script.indexOf('const menuToggle =');
  const end = script.indexOf('const searchInput =');
  assert.ok(start >= 0 && end > start, 'No se encontró el controlador de navegación');
  runInNewContext(script.slice(start, end), { document, window });

  return {
    attributes,
    document,
    listeners,
    mainNav,
    mediaQuery,
    menuToggle,
    navLink,
  };
}

function mountMapSelection() {
  const listeners = new Map();
  const selectedClasses = [];
  const makeControl = (name) => {
    const attributes = new Map([['aria-pressed', 'false']]);
    const classes = new Set();
    selectedClasses.push(classes);
    return {
      dataset: { name },
      attributes,
      addEventListener: (type, listener) => listeners.set(`map:${listeners.size}`, listener),
      setAttribute: (attribute, value) => attributes.set(attribute, value),
      classList: {
        toggle: (className, enabled) => enabled ? classes.add(className) : classes.delete(className),
        contains: (className) => classes.has(className),
      },
    };
  };
  const controls = [
    makeControl('Felinos'),
    makeControl('Felinos'),
    makeControl('Entrada'),
    makeControl('Entrada'),
    makeControl('Baños'),
  ];
  const selection = { textContent: '' };
  const document = {
    querySelectorAll: () => controls,
    getElementById: () => selection,
  };
  const script = readFileSync(path.join(webSource, 'script.js'), 'utf8');
  const start = script.indexOf('const mapControls =');
  const end = script.indexOf("document.querySelectorAll('.foto')", start);
  assert.ok(start >= 0 && end > start, 'No se encontró el controlador de selección del mapa');
  runInNewContext(script.slice(start, end), { document });

  return { controls, listeners, selection, selectedClasses };
}

test('CA-01 brand-color-refresh centraliza la paleta y tipografía aprobadas', () => {
  const tokens = themeTokens();
  const expected = new Map([
    ['sidebar', '#661a2f'],
    ['primary', '#87293a'],
    ['sidebar-primary', '#87293a'],
    ['secondary', '#b79159'],
    ['footer', 'var(--secondary)'],
    ['footer-background', 'var(--footer)'],
    ['footer-foreground', 'var(--foreground-dark)'],
    ['accent', '#DEC9A3'],
    ['foreground', '#000000'],
    ['foreground-dark', '#000000'],
    ['foreground-light', '#ffffff'],
    ['font-size-base', '16px'],
    ['font-family-base', '"Lato", sans-serif'],
    ['font-weight-base', '400'],
  ]);
  for (const [name, value] of expected) {
    assert.equal(tokens.get(name), value, `Token incorrecto: --${name}`);
  }
  const css = readFileSync(path.join(webSource, 'styles.css'), 'utf8');
  assert.match(css, /body\s*\{[^}]*font:\s*var\(--font-weight-base\)\s*var\(--font-size-base\)\/1\.6\s*var\(--font-family-base\)/s);
});

test('CA-02 brand-color-refresh aplica tokens semánticos y elimina la paleta anterior', () => {
  const css = readFileSync(path.join(webSource, 'styles.css'), 'utf8');
  assert.match(css, /h1,\s*h2,\s*h3\s*\{[^}]*color:\s*var\(--primary\)/s);
  assert.match(css, /\.btn-primary\s*\{[^}]*background:\s*var\(--primary\)[^}]*color:\s*var\(--foreground-light\)/s);
  assert.match(css, /\.info-icon\s*\{[^}]*background:\s*var\(--accent\)/s);
  assert.match(css, /\.ticket-section\s*\{[^}]*background:\s*linear-gradient\(135deg,\s*var\(--sidebar\),\s*var\(--primary\)\)/s);
  assert.match(css, /\.footer\s*\{[^}]*background:\s*var\(--footer-background\)[^}]*color:\s*var\(--footer-foreground\)/s);
  assert.doesNotMatch(css, /--(?:green|green-dark|green-soft|orange)\s*:/);
});

test('CA-03 brand-color-refresh verifica contraste WCAG 2.1 AA', () => {
  const tokens = themeTokens();
  const pairs = [
    ['foreground-dark', 'surface', 4.5],
    ['foreground', 'surface-page', 4.5],
    ['foreground-dark', 'surface-subtle', 4.5],
    ['muted-foreground', 'surface', 4.5],
    ['muted-foreground', 'surface-page', 4.5],
    ['muted-foreground', 'surface-subtle', 4.5],
    ['foreground-dark', 'secondary', 4.5],
    ['foreground-dark', 'accent', 4.5],
    ['foreground-light', 'primary', 4.5],
    ['foreground-light', 'sidebar', 4.5],
    ['primary', 'surface-accent', 4.5],
    ['sidebar', 'accent', 4.5],
    ['primary', 'surface', 3],
    ['primary', 'surface-subtle', 3],
  ];
  for (const [foreground, background, minimum] of pairs) {
    const ratio = contrastRatio(tokens.get(foreground), tokens.get(background));
    assert.ok(ratio >= minimum, `--${foreground} sobre --${background}: ${ratio.toFixed(2)}:1 (mínimo ${minimum}:1)`);
  }
});

test('CA-04 brand-color-refresh conserva estructura, recursos y reglas responsivas', () => {
  const css = readFileSync(path.join(webSource, 'styles.css'), 'utf8');
  for (const breakpoint of ['1380px', '1200px', '820px', '560px', '360px']) {
    assert.ok(css.includes(`max-width: ${breakpoint}`), `Falta el breakpoint ${breakpoint}`);
  }
});

test('CA-05 brand-color-refresh verifica criterios sin dependencias nuevas', () => {
  const source = readFileSync(testFile, 'utf8');
  for (const criterion of ['CA-01 brand-color-refresh', 'CA-02 brand-color-refresh', 'CA-03 brand-color-refresh', 'CA-04 brand-color-refresh', 'CA-05 brand-color-refresh']) {
    assert.ok(source.includes(criterion), `Falta el test ${criterion}`);
  }
  const imports = [...source.matchAll(/from\s+['"]([^'"]+)['"]/g)].map((match) => match[1]);
  assert.ok(imports.every((specifier) => specifier.startsWith('node:')));
  assert.equal(existsSync(path.join(webSource, 'package.json')), false);
});

test('CA-01 conserva los 11 assets fuera de alcance y sus hashes de Git', () => {
  assert.equal(expectedHashes.size, 11);
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

test('CA-06 el traslado sigue estructural y conserva hashes de archivos no visuales', () => {
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
  assert.ok(imports.every((specifier) => ['node:test', 'node:assert/strict', 'node:fs', 'node:path', 'node:crypto', 'node:vm'].includes(specifier)));
  assert.equal(existsSync(path.join(webSource, 'package.json')), false);
});

test('CA-01 lion-hero-mobile-navigation recupera el degradado verde solo en el hero', () => {
  const html = readFileSync(path.join(webSource, 'index.html'), 'utf8');
  const css = readFileSync(path.join(webSource, 'styles.css'), 'utf8');
  assert.match(css, /\.hero\s*\{[^}]*linear-gradient\(90deg,\s*rgba\(10,\s*40,\s*18,\s*\.82\)\s*0%,\s*rgba\(10,\s*40,\s*18,\s*\.62\)\s*35%,\s*rgba\(10,\s*40,\s*18,\s*\.28\)\s*100%\),\s*url\(['"]assets\/lion\.jpg['"]\)/s);
  assert.match(html, /<section class="hero">/);
  assert.equal(themeTokens().get('primary'), '#87293a');
});

test('CA-02 lion-hero-mobile-navigation conserva el menú desplegado en escritorio', () => {
  const html = readFileSync(path.join(webSource, 'index.html'), 'utf8');
  const css = readFileSync(path.join(webSource, 'styles.css'), 'utf8');
  assert.match(html, /<button[^>]*id="menuToggle"[^>]*aria-controls="mainNav"[^>]*hidden>/);
  assert.match(html, /<nav class="main-nav" id="mainNav"/);
  assert.match(css, /@media \(min-width: 821px\)\s*\{\s*\.menu-toggle\s*\{\s*display:\s*none;/);
  assert.match(css, /\.main-nav\s*\{[^}]*display:\s*flex/s);
});

test('CA-03 lion-hero-mobile-navigation expone controles accesibles y teclado', () => {
  const html = readFileSync(path.join(webSource, 'index.html'), 'utf8');
  const script = readFileSync(path.join(webSource, 'script.js'), 'utf8');
  const css = readFileSync(path.join(webSource, 'styles.css'), 'utf8');
  assert.match(html, /aria-label="Abrir menú principal"[^>]*aria-controls="mainNav"[^>]*aria-expanded="false"/);
  assert.match(script, /window\.matchMedia\('\(max-width: 820px\)'\)/);
  assert.match(script, /event\.key !== 'Escape'/);
  assert.match(script, /menuToggle\.focus\(\)/);
  assert.match(script, /mainNav\.addEventListener\('click'/);
  assert.match(script, /mobileNavigation\.addEventListener\('change'/);
  assert.match(css, /\.menu-toggle\[aria-expanded="true"\]/);
  assert.match(css, /@media \(max-width: 820px\)/);
});

test('CA-03 lion-hero-mobile-navigation opera apertura, Escape, enlace y breakpoints', () => {
  const mobile = mountMobileNavigation();
  assert.equal(mobile.menuToggle.hidden, false);
  assert.equal(mobile.mainNav.hidden, true);
  assert.equal(mobile.menuToggle.getAttribute('aria-expanded'), 'false');

  mobile.listeners.get('toggle:click')();
  assert.equal(mobile.mainNav.hidden, false);
  assert.equal(mobile.menuToggle.getAttribute('aria-expanded'), 'true');
  assert.equal(mobile.menuToggle.getAttribute('aria-label'), 'Cerrar menú principal');

  mobile.listeners.get('document:keydown')({ key: 'Escape' });
  assert.equal(mobile.mainNav.hidden, true);
  assert.equal(mobile.menuToggle.getAttribute('aria-expanded'), 'false');
  assert.equal(mobile.document.activeElement, mobile.menuToggle);

  mobile.listeners.get('toggle:click')();
  mobile.listeners.get('nav:click')({ target: mobile.navLink });
  assert.equal(mobile.mainNav.hidden, true);

  mobile.mediaQuery.matches = false;
  mobile.listeners.get('media:change')();
  assert.equal(mobile.menuToggle.hidden, true);
  assert.equal(mobile.mainNav.hidden, false);
  assert.equal(mobile.document.activeElement, mobile.navLink);

  mobile.mediaQuery.matches = true;
  mobile.listeners.get('media:change')();
  assert.equal(mobile.menuToggle.hidden, false);
  assert.equal(mobile.mainNav.hidden, true);
  assert.equal(mobile.document.activeElement, mobile.menuToggle);
});

test('CA-04 lion-hero-mobile-navigation aplica controles fluidos en los anchos objetivo', () => {
  const css = readFileSync(path.join(webSource, 'styles.css'), 'utf8');
  assert.match(css, /html,\s*body\s*\{[^}]*overflow-x:\s*clip/s);
  assert.match(css, /@media \(max-width: 820px\)/);
  assert.match(css, /@media \(max-width: 560px\)/);
  assert.match(css, /\.top-actions\s*\{[^}]*flex:\s*1 0 100%[^}]*width:\s*100%/s);
  assert.match(css, /\.search input\s*\{[^}]*width:\s*100%[^}]*min-width:\s*0/s);
});

test('CA-05 lion-hero-mobile-navigation tiene pruebas CA-01..CA-05 sin paquetes nuevos', () => {
  const source = readFileSync(testFile, 'utf8');
  for (const criterion of [
    'CA-01 lion-hero-mobile-navigation',
    'CA-02 lion-hero-mobile-navigation',
    'CA-03 lion-hero-mobile-navigation',
    'CA-04 lion-hero-mobile-navigation',
    'CA-05 lion-hero-mobile-navigation',
  ]) {
    assert.ok(source.includes(criterion), `Falta el test ${criterion}`);
  }
  assert.ok([...source.matchAll(/from\s+['"]([^'"]+)['"]/g)].every((match) => match[1].startsWith('node:')));
  assert.equal(existsSync(path.join(webSource, 'package.json')), false);
});

test('CA-01 isometric-zoo-map dibuja una escena local con perspectiva y sin proveedor', () => {
  const html = readFileSync(path.join(webSource, 'index.html'), 'utf8');
  const mapSection = html.slice(html.indexOf('<section class="map-section"'), html.indexOf('</section>', html.indexOf('<section class="map-section"')));
  assert.match(mapSection, /<svg class="map-art" viewBox="0 0 900 560"/);
  assert.match(mapSection, /<linearGradient id="map-ground"/);
  assert.match(mapSection, /fill="url\(#map-grass\)"/);
  assert.match(mapSection, /stroke-dasharray="5 13"/);
  assert.doesNotMatch(mapSection, /https?:|maps\.google|mapbox|openstreetmap/i);
});

test('CA-02 isometric-zoo-map conserva zonas, servicios e iconos SVG accesibles', () => {
  const html = readFileSync(path.join(webSource, 'index.html'), 'utf8');
  const mapSection = html.slice(html.indexOf('<section class="map-section"'), html.indexOf('</section>', html.indexOf('<section class="map-section"')));
  const names = ['Felinos', 'Aviario', 'Reptilario', 'Primates', 'Granja', 'Lago', 'Entrada', 'Baños', 'Alimentos', 'Bebederos', 'Áreas de descanso', 'Enfermería', 'Tiendas'];
  const controls = [...mapSection.matchAll(/<button class="map-control[\s\S]*?<\/button>/g)].map((match) => match[0]);
  assert.ok(controls.length >= names.length);
  for (const name of names) {
    assert.ok(mapSection.includes(`data-name="${name}"`), `Falta ${name}`);
    const control = controls.find((candidate) => candidate.includes(`data-name="${name}"`));
    assert.ok(control, `Falta un control para ${name}`);
    assert.match(control, /aria-label="[^"]+"/);
    assert.match(control, /<svg class="map-icon"[^>]*aria-hidden="true"/);
    assert.match(control, /<span(?: class="map-marker-label")?>[^<]+<\/span>/);
    assert.match(control, /aria-pressed="false"/);
  }
});

test('CA-03 isometric-zoo-map advierte que la ilustración no sirve para orientarse con precisión', () => {
  const html = readFileSync(path.join(webSource, 'index.html'), 'utf8');
  const mapSection = html.slice(html.indexOf('<section class="map-section"'), html.indexOf('</section>', html.indexOf('<section class="map-section"')));
  assert.match(mapSection, /Ilustración aproximada, no está a escala y no sirve para orientarte con precisión/);
});

test('CA-04 isometric-zoo-map sincroniza selección, resaltado y anuncio entre controles', () => {
  const map = mountMapSelection();
  map.listeners.get('map:0')();
  assert.equal(map.selection.textContent, 'Seleccionaste: Felinos. Consulta al personal para encontrar esta zona.');
  assert.equal(map.controls[0].attributes.get('aria-pressed'), 'true');
  assert.equal(map.controls[1].attributes.get('aria-pressed'), 'true');
  assert.equal(map.controls[2].attributes.get('aria-pressed'), 'false');
  assert.equal(map.controls[0].classList.contains('active'), true);
  assert.equal(map.controls[2].classList.contains('active'), false);

  map.listeners.get('map:4')();
  assert.equal(map.selection.textContent, 'Seleccionaste: Baños. Consulta al personal para encontrar esta zona.');
  assert.equal(map.controls[0].attributes.get('aria-pressed'), 'false');
  assert.equal(map.controls[0].classList.contains('active'), false);
  assert.equal(map.controls[4].attributes.get('aria-pressed'), 'true');
  assert.equal(map.controls[4].classList.contains('active'), true);
});

test('CA-05 isometric-zoo-map adapta la ilustración y la leyenda a viewports estrechos', () => {
  const css = readFileSync(path.join(webSource, 'styles.css'), 'utf8');
  assert.match(css, /\.map\s*\{[^}]*aspect-ratio:\s*16\s*\/\s*10[^}]*overflow:\s*hidden/s);
  assert.match(css, /\.map-art\s*\{[^}]*position:\s*absolute[^}]*width:\s*100%[^}]*height:\s*100%/s);
  assert.match(css, /\.map-marker\s*\{[^}]*top:\s*var\(--marker-y\)[^}]*left:\s*var\(--marker-x\)/s);
  assert.match(css, /@media \(max-width: 820px\)\s*\{\s*\.map-layout\s*\{\s*grid-template-columns:\s*minmax\(0,\s*1fr\)/);
  assert.match(css, /@media \(max-width: 560px\)\s*\{[\s\S]*?\.map-marker-label\s*\{[^}]*clip:\s*rect\(0,\s*0,\s*0,\s*0\)/);
  assert.match(css, /\.map-control:focus-visible/);
  assert.match(css, /html,\s*body\s*\{[^}]*overflow-x:\s*clip/s);
});

test('CA-06 isometric-zoo-map conserva suite Node local sin nuevas dependencias', () => {
  const source = readFileSync(testFile, 'utf8');
  for (const criterion of [
    'CA-01 isometric-zoo-map',
    'CA-02 isometric-zoo-map',
    'CA-03 isometric-zoo-map',
    'CA-04 isometric-zoo-map',
    'CA-05 isometric-zoo-map',
    'CA-06 isometric-zoo-map',
  ]) {
    assert.ok(source.includes(criterion), `Falta el test ${criterion}`);
  }
  const imports = [...source.matchAll(/from\s+['"]([^'"]+)['"]/g)].map((match) => match[1]);
  assert.ok(imports.every((specifier) => ['node:test', 'node:assert/strict', 'node:fs', 'node:path', 'node:crypto', 'node:vm'].includes(specifier)));
  assert.equal(existsSync(path.join(webSource, 'package.json')), false);
});
