const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { assetPath } = require('../src/components/helpers/assets');

const appPath = path.join('test', 'app.asar');
const resourcesPath = path.join('test', 'resources');
const bundled = (filename) => path.join(appPath, 'src', 'assets', filename);
const external = (filename) => path.join(resourcesPath, 'assets', filename);

test('development reads assets from the app directory', () => {
    const app = { isPackaged: false, getAppPath: () => appPath };
    assert.equal(assetPath(app, 'notifications/gift.png', { resourcesPath, existsSync: () => true }), bundled('notifications/gift.png'));
});

test('packaged app prefers an existing external asset', () => {
    const app = { isPackaged: true, getAppPath: () => appPath };
    assert.equal(assetPath(app, 'tray/ppL.ico', { resourcesPath, existsSync: () => true }), external('tray/ppL.ico'));
});

test('packaged app falls back to its bundled copy when the external asset is missing', () => {
    const app = { isPackaged: true, getAppPath: () => appPath };
    assert.equal(assetPath(app, 'notifications/metion.png', { resourcesPath, existsSync: () => false }), bundled('notifications/metion.png'));
});

test('packaged app accepts a legacy flat external asset when the new path is absent', () => {
    const app = { isPackaged: true, getAppPath: () => appPath };
    const oldPath = external('gift.png');
    assert.equal(assetPath(app, 'notifications/gift.png', {
        resourcesPath,
        existsSync: (candidate) => candidate === oldPath,
    }), oldPath);
});
