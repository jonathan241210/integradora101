import { spawnSync } from 'node:child_process';

async function readPayload() {
    let input = '';
    for await (const chunk of process.stdin) input += chunk;
    if (!input.trim()) return null;
    try {
        return JSON.parse(input);
    } catch {
        return null;
    }
}

function changedPaths(status) {
    return status.split(/\r?\n/).filter(Boolean).map((line) => {
        const value = line.slice(3).trim();
        const pathValue = value.includes(' -> ') ? value.split(' -> ').at(-1) : value;
        return pathValue.replace(/^"|"$/g, '').replace(/\\/g, '/');
    });
}

function isSource(pathValue) {
    return /^apps\/[^/]+\/src\//i.test(pathValue) && !pathValue.endsWith('/.gitkeep');
}

function isTest(pathValue) {
    return /\/tests\//i.test(`/${pathValue}`) ||
        /(?:\.test\.|\.spec\.)[^/]*$/i.test(pathValue) ||
        /Test\.php$/i.test(pathValue);
}

const payload = await readPayload();
if (!payload || typeof payload !== 'object' || payload.stop_hook_active === true) process.exit(0);

const root = process.env.DEVIN_PROJECT_DIR || process.cwd();
let result;
try {
    result = spawnSync('git', ['status', '--porcelain', '-uall'], {
        cwd: root,
        encoding: 'utf8',
        timeout: 10000,
    });
} catch {
    process.exit(0);
}
if (result.error || result.status !== 0) process.exit(0);

const paths = changedPaths(result.stdout || '');
const sourceChanged = paths.some(isSource) && paths.some((file) => isSource(file) && !isTest(file));
const testChanged = paths.some(isTest);
if (sourceChanged && !testChanged) {
    process.stdout.write(`${JSON.stringify({
        decision: 'block',
        reason: 'Constitución IV: hay cambios de código en apps/*/src sin ningún archivo de test modificado.',
    })}\n`);
    process.exitCode = 2;
}
