const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const generatedClientId = path.join(__dirname, '../src/components/twitch/directClientId.json');
let generated = false;
const productionEnv = path.join(__dirname, '../.env.production');
const localClientId = fs.existsSync(productionEnv)
    ? fs.readFileSync(productionEnv, 'utf8').match(/^CLIENT_ID\s*=\s*([^\s#]+)\s*$/m)?.[1]
    : '';
const clientId = process.env.SMELECTRON_CLIENT_ID || localClientId;
if (clientId && /^[a-z0-9]{10,100}$/i.test(clientId)) {
    fs.writeFileSync(generatedClientId, JSON.stringify({ clientId }));
    generated = true;
}

const extraArgs = process.argv.slice(2);

try {
const builderCli = require.resolve('electron-builder/cli.js');
for (const [target, metadata] of [
    ['portable', ['--config.extraMetadata.description=SMLurker Portable']],
    ['nsis', []],
]) {
    const result = spawnSync(process.execPath, [builderCli, '--win', target, '--ia32', ...metadata, ...extraArgs], {
        stdio: 'inherit',
    });
    if (result.error) throw result.error;
    if (result.status !== 0) { process.exitCode = result.status ?? 1; break; }
}
} finally {
    if (generated) fs.unlinkSync(generatedClientId);
}
