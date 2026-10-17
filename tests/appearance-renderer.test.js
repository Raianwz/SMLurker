const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, '../src/components/helpers/appearanceRenderer.js'), 'utf8');

test('appearance renderer applies saved mode and live changes', async () => {
    const document = { documentElement: { dataset: {} } };
    let onChanged;
    vm.runInNewContext(source, {
        document,
        api: { appearance: {
            get: async () => 'classic',
            onChanged: (callback) => { onChanged = callback; },
        } },
    });
    await new Promise(setImmediate);
    assert.equal(document.documentElement.dataset.appearance, 'classic');

    onChanged('modern');
    assert.equal(document.documentElement.dataset.appearance, 'modern');
    onChanged('unexpected');
    assert.equal(document.documentElement.dataset.appearance, 'modern');
});
