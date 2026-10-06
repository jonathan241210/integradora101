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

function values(value) {
    if (typeof value === 'string') return [value];
    if (Array.isArray(value)) return value.flatMap(values);
    return [];
}

function pathFields(toolInput) {
    return ['file_path', 'path', 'pattern'].flatMap((field) => values(toolInput?.[field]));
}

function forbiddenTemplate(value) {
    return /PLANTILLA_V4_Con colores/i.test(value);
}

function forbiddenWritablePath(value) {
    if (/(?:^|[\\/])(?:vendor|node_modules)(?:[\\/]|$)/i.test(value)) return true;
    const envPaths = value.match(/(?:^|[\\/])\.env(?:\.[^\\/\s"'<>|:]*)?(?=$|[\\/\s"'<>|:])/gi) || [];
    return envPaths.some((entry) => entry.trim().replace(/^[\\/]/, '').toLowerCase() !== '.env.example');
}

function patchPaths(patch) {
    const paths = [];
    const header = /^(?:\*\*\* (?:Update|Add|Delete) File:|(?:\+\+\+|---)\s+(?:[ab]\/)?)(.+?)\s*$/gm;
    for (const match of patch.matchAll(header)) paths.push(match[1].trim());
    return paths;
}

const payload = await readPayload();
if (!payload || typeof payload !== 'object') process.exit(0);

const toolInput = payload.tool_input || {};
const toolName = String(payload.tool_name || '');
const paths = pathFields(toolInput);
const patch = toolName === 'apply_patch'
    ? values(toolInput.patch ?? toolInput.patch_text ?? toolInput.input).join('\n')
    : '';

let reason = null;
if ([...paths, patch].some(forbiddenTemplate)) {
    reason = 'La ruta o el parche toca PLANTILLA_V4_Con colores/, que está protegida.';
} else if (
    ['edit', 'write', 'apply_patch'].includes(toolName) &&
    [...paths, ...patchPaths(patch)].some(forbiddenWritablePath)
) {
    reason = 'No se permite escribir .env* (salvo .env.example), vendor/ ni node_modules/.';
}

if (reason) {
    process.stdout.write(`${JSON.stringify({ decision: 'block', reason })}\n`);
    process.exitCode = 2;
}
