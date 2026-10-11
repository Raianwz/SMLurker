const fs = require('node:fs');
const path = require('node:path');

function assetPath(app, filename, { resourcesPath = process.resourcesPath, existsSync = fs.existsSync } = {}) {
    const bundledPath = path.join(app.getAppPath(), 'src', 'assets', filename);
    if (!app.isPackaged) return bundledPath;

    const externalPath = path.join(resourcesPath, 'assets', filename);
    if (existsSync(externalPath)) return externalPath;

    // Instalações antigas tinham todos os assets diretamente em resources/assets.
    const legacyPath = path.join(resourcesPath, 'assets', path.basename(filename));
    return existsSync(legacyPath) ? legacyPath : bundledPath;
}

module.exports = { assetPath };
