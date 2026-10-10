import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../../../../', import.meta.url));
const read = (rel) => readFileSync(join(root, rel), 'utf8');

const normativeFiles = [
    'CONSTITUTION.md',
    'README.md',
    'AGENTS.md',
    'apps/api/AGENTS.md',
    'docs/02-arquitectura.md',
    'docs/06-convenciones.md',
    'infra/README.md',
    'docs/database/README.md',
];

test('CA-01 MySQL 8.0.x es la familia normativa y 8.4 no aparece como permitida', () => {
    for (const rel of normativeFiles) {
        const text = read(rel);
        assert.ok(text.includes('MySQL 8.0.x'), `${rel} debe mencionar MySQL 8.0.x`);
        assert.ok(!/MySQL 8(?!\.0)/.test(text), `${rel} no debe usar "MySQL 8" sin ".0"`);
        assert.ok(!text.includes('8.4'), `${rel} no debe mencionar 8.4`);
    }
    for (const rel of ['docs/database/README.md', 'README.md']) {
        assert.match(read(rel), /revisi[oó]n m[ií]nima[^.\n]*pendiente/i, `${rel} debe indicar revisión mínima pendiente`);
    }
});

test('CA-02 Toda necesidad de esquema exige una DBR y el solicitante no crea SQL', () => {
    const agents = read('AGENTS.md');
    assert.ok(agents.includes('DBR'));
    assert.ok(agents.includes('docs/database/requests/'));
    assert.ok(agents.includes('SQL ejecutable'));
    assert.match(read('docs/database/README.md'), /no\W{0,4}crea migraciones ni ejecuta SQL/i);
    assert.ok(read('docs/database/requests/README.md').includes('DBR-NNN-slug.md'));
});

test('CA-03 La plantilla DBR exige todos los campos obligatorios', () => {
    const tpl = read('docs/database/templates/change-request.md');
    for (const field of [
        'Feature/spec origen',
        'Problema y justificación',
        'Contrato solicitado',
        'Elementos afectados',
        'SQL de referencia (MySQL 8.0)',
        'no ejecutar directamente',
        'nulabilidad',
        'Datos existentes',
        'Privacidad, auditoría y retención',
        'rendimiento',
        'reversión',
        'Compatibilidad MySQL 8.0',
        'Pruebas y evidencia',
        'Orden de despliegue',
        'Responsable de BD',
        'Responsable backend',
        'Aplicación por ambiente',
    ]) {
        assert.ok(tpl.includes(field), `la plantilla DBR debe incluir "${field}"`);
    }
});

test('CA-04 El responsable de BD es el único que crea migraciones; nunca SQL manual', () => {
    const db = read('docs/database/README.md');
    assert.ok(db.includes('migración Laravel'));
    assert.match(db, /nunca SQL manual/i);
    const apiAgents = read('apps/api/AGENTS.md');
    assert.ok(apiAgents.includes('responsable de BD'));
    assert.match(apiAgents, /SQL manual/);
    const constitution = read('CONSTITUTION.md');
    assert.ok(constitution.includes('responsable de BD'));
    assert.ok(constitution.includes('DBR'));
});

test('CA-05 Backend solo implementa cuando la DBR está Lista para backend', () => {
    const db = read('docs/database/README.md');
    assert.ok(db.includes('Verificada por BD en desarrollo/pruebas'));
    assert.ok(db.includes('Lista para backend'));
    for (const rel of [
        'docs/database/requests/README.md',
        'apps/api/AGENTS.md',
        'docs/02-arquitectura.md',
        'docs/05-flujo-sdd.md',
        'docs/templates/tasks.md',
    ]) {
        assert.ok(read(rel).includes('Lista para backend'), `${rel} debe mencionar Lista para backend`);
    }
    for (const rel of ['docs/templates/spec.md', 'docs/templates/plan.md']) {
        assert.ok(read(rel).includes('DBR-NNN-slug.md'), `${rel} debe mencionar DBR-NNN-slug.md`);
    }
});

test('CA-06 La aplicación se registra por ambiente, sin estado global ambiguo', () => {
    const db = read('docs/database/README.md');
    assert.ok(db.includes('Aplicada en staging'));
    assert.ok(db.includes('Aplicada en producción'));
    assert.match(db, /no existe un estado global ambiguo/i);
    const tpl = read('docs/database/templates/change-request.md');
    assert.ok(tpl.includes('| desarrollo/pruebas'));
    assert.ok(tpl.includes('| staging'));
    assert.ok(tpl.includes('| producción'));
    const adrIndex = read('docs/adr/README.md');
    assert.ok(adrIndex.includes('0010-mysql-8-0-database-change-governance.md'));
    assert.match(adrIndex, /0010[^\n]*Aceptado/);
    assert.ok(read('docs/adr/0010-mysql-8-0-database-change-governance.md').includes('Estado: Aceptado'));
    assert.ok(read('AGENTS.md').includes('por ambiente'));
});

test('CA-07 Funciones y procedimientos son excepcionales; reglas principales en Actions', () => {
    const conv = read('docs/06-convenciones.md');
    assert.match(conv, /funciones y procedimientos/i);
    assert.ok(conv.includes('Actions'));
    assert.match(conv, /vistas y triggers/i);
    assert.match(read('docs/database/README.md'), /vistas y triggers no están autorizados/i);
    assert.ok(read('apps/api/AGENTS.md').includes('DB::statement()'));
});

test('CA-08 La conexión sin alterar esquema no requiere DBR pero sí SDD y .env', () => {
    for (const rel of ['AGENTS.md', 'apps/api/AGENTS.md', 'docs/database/README.md']) {
        const text = read(rel);
        assert.match(text, /no requiere DBR/i, `${rel} debe eximir la conexión de DBR`);
        assert.ok(text.includes('.env'), `${rel} debe mencionar .env`);
    }
    assert.ok(read('apps/api/AGENTS.md').includes('charset/collation'));
});

test('CA-09 El esquema existente no se borra ni adopta como baseline automáticamente', () => {
    for (const rel of ['apps/api/AGENTS.md', 'infra/README.md', 'docs/database/README.md']) {
        const text = read(rel);
        assert.ok(text.includes('baseline'), `${rel} debe mencionar baseline`);
        assert.match(text, /no se borra, recrea ni adopta/i, `${rel} debe proteger el esquema existente`);
    }
});

test('CA-10 Las referencias entre documentos son consistentes', () => {
    assert.ok(read('README.md').includes('docs/database/README.md'));
    assert.ok(read('docs/README.md').includes('database/README.md'));
    const arch = read('docs/02-arquitectura.md');
    assert.ok(arch.includes('database/README.md'));
    assert.ok(arch.includes('0010-mysql-8-0-database-change-governance.md'));
    assert.ok(read('docs/05-flujo-sdd.md').includes('docs/database/requests/'));
    assert.ok(read('infra/README.md').includes('docs/database/README.md'));
    for (const rel of [
        'CONSTITUTION.md',
        'AGENTS.md',
        'apps/api/AGENTS.md',
        'README.md',
        'docs/02-arquitectura.md',
        'docs/06-convenciones.md',
        'infra/README.md',
    ]) {
        assert.ok(read(rel).includes('responsable de BD'), `${rel} debe mencionar al responsable de BD`);
    }
});
