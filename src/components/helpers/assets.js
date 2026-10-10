const fs = require('node:fs');
const path = require('node:path');

function assetPath(app, filename, { resourcesPath = process.resourcesPath, existsSync = fs.existsSync } = {}) {
    const bundledPath = path.join(app.getAppPath(), 'src', 'assets', filename);
    if (!app.isPackaged) return bundledPath;

    const externalPath = path.join(resourcesPath, 'assets', filename);
    return existsSync(externalPath) ? externalPath : bundledPath;
}

module.exports = { assetPath };
