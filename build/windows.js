const { spawnSync } = require('node:child_process');

const builderCli = require.resolve('electron-builder/cli.js');
const extraArgs = process.argv.slice(2);

for (const [target, metadata] of [
    ['portable', ['--config.extraMetadata.description=SMLurker Portable']],
    ['nsis', []],
]) {
    const result = spawnSync(process.execPath, [builderCli, '--win', target, '--ia32', ...metadata, ...extraArgs], {
        stdio: 'inherit',
    });
    if (result.error) throw result.error;
    if (result.status !== 0) process.exit(result.status ?? 1);
}
