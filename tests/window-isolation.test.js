const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

test('settings code starts in the isolated preload after its DOM is available', () => {
    const source = fs.readFileSync(path.join(__dirname, '../src/preloadConfigs.js'), 'utf8');
    let ready;
    let loaded = 0;
    vm.runInNewContext(source, {
        window: { addEventListener: (name, callback) => { if (name === 'DOMContentLoaded') ready = callback; } },
        require: (id) => {
            assert.equal(id, './components/configs/configs');
            loaded++;
        },
    });
    assert.equal(loaded, 0);
    ready();
    assert.equal(loaded, 1);
});

test('all application windows keep Node.js out of page scripts', () => {
    for (const filename of [
        '../main.js',
        '../src/components/ipc/configWindow.js',
        '../src/components/ipc/eventPanel.js',
    ]) {
        const source = fs.readFileSync(path.join(__dirname, filename), 'utf8');
        assert.match(source, /nodeIntegration:\s*false/, filename);
        assert.match(source, /sandbox:\s*false/, filename);
    }
    const settingsHtml = fs.readFileSync(path.join(__dirname, '../src/app/configs.html'), 'utf8');
    assert.doesNotMatch(settingsHtml, /configs\/configs\.js/);
});
