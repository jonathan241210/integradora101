import { existsSync } from 'node:fs';
import path from 'node:path';
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

function getFilePath(payload) {
    const filePath = payload?.tool_input?.file_path ?? payload?.tool_input?.path;
    return typeof filePath === 'string' ? filePath : '';
}

function run(command, args, options) {
    try {
        spawnSync(command, args, { ...options, stdio: 'ignore', timeout: 30000 });
    } catch {
        // El formato automático es auxiliar: nunca debe fallar la herramienta.
    }
}

const payload = await readPayload();
if (!payload) process.exit(0);

const root = process.env.DEVIN_PROJECT_DIR || process.cwd();
const inputPath = getFilePath(payload);
if (!inputPath) process.exit(0);

const absolutePath = path.isAbsolute(inputPath)
    ? path.normalize(inputPath)
    : path.resolve(root, inputPath);
const normalized = path.relative(root, absolutePath).replace(/\\/g, '/');
const extension = path.extname(normalized).toLowerCase();

if (extension === '.php' && /^apps\/api\/src\//.test(normalized)) {
    const apiSource = path.join(root, 'apps', 'api', 'src');
    const pint = path.join(apiSource, 'vendor', 'bin', 'pint');
    if (existsSync(pint)) run('php', [pint, absolutePath], { cwd: apiSource });
    process.exit(0);
}

const jsExtensions = new Set(['.ts', '.tsx', '.js', '.jsx', '.css', '.json']);
const appMatch = normalized.match(/^apps\/([^/]+)\/src\//);
const packageMatch = normalized.match(/^packages\/([^/]+)\//);
if (!jsExtensions.has(extension) || (!appMatch && !packageMatch)) process.exit(0);

const workspace = appMatch
    ? path.join(root, 'apps', appMatch[1], 'src')
    : path.join(root, 'packages', packageMatch[1]);
const binary = path.join(workspace, 'node_modules', '.bin', 'prettier');
const windowsBinary = `${binary}.cmd`;
const executable = process.platform === 'win32' && existsSync(windowsBinary)
    ? windowsBinary
    : binary;
if (!existsSync(executable)) process.exit(0);

run(executable, ['--write', absolutePath], {
    cwd: workspace,
    shell: process.platform === 'win32',
});
process.exit(0);
