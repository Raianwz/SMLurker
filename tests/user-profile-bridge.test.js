const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

test('preload exposes userprofile.get through the existing api bridge', async () => {
    const source = fs.readFileSync(path.join(__dirname, '../src/preload.js'), 'utf8');
    let exposed;
    let requestedUsername;
    const context = {
        require(id) {
            if (id === 'electron') return {
                contextBridge: { exposeInMainWorld: (name, value) => { exposed = { name, value }; } },
                ipcRenderer: {},
            };
            if (id === './internal/smcore') return { smcore: {} };
            if (id === './internal/appcore') return { appcore: {} };
            if (id === './components/smdata/coredata') return {
                getUserProfile: async (username) => {
                    requestedUsername = username;
                    return { login: username };
                },
            };
            throw new Error(`Unexpected module: ${id}`);
        },
    };
    vm.runInNewContext(source, context);
    assert.equal(exposed.name, 'api');
    assert.equal(typeof exposed.value.userprofile.get, 'function');
    assert.equal((await exposed.value.userprofile.get('raianwz')).login, 'raianwz');
    assert.equal(requestedUsername, 'raianwz');
});
