const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

test('preload exposes userprofile.get through the existing api bridge', async () => {
    const source = fs.readFileSync(path.join(__dirname, '../src/preload.js'), 'utf8');
    let exposed;
    let requestedUsername;
    let menu;
    const sent = [];
    const invocations = [];
    const context = {
        require(id) {
            if (id === 'electron') return {
                contextBridge: { exposeInMainWorld: (name, value) => { exposed = { name, value }; } },
                ipcRenderer: {
                    invoke: async (...args) => { invocations.push(args); return args; },
                    send: (...args) => sent.push(args),
                },
            };
            if (id === '@electron/remote') return {
                Menu: { buildFromTemplate: (template) => { menu = template; return { popup() {} }; } },
                getCurrentWindow: () => ({}),
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
    assert.equal(exposed.value.cr.fs, undefined);
    assert.equal(exposed.value.cr.appr.getPath, undefined);
    assert.equal(exposed.value.tw.tmi.client, undefined);
    assert.equal(typeof exposed.value.userprofile.get, 'function');
    assert.equal((await exposed.value.userprofile.get('raianwz')).login, 'raianwz');
    assert.equal(requestedUsername, 'raianwz');
    await exposed.value.channels.add(['#raianwz']);
    await exposed.value.preferences.updateNotifications({ NotifyMe: true, NotifyGift: false });
    exposed.value.desktop.showMenu('refresh');
    menu[0].click();
    menu[2].click();
    assert.deepEqual(sent, [['app-reload:request'], ['app-restart:request']]);
    assert.deepEqual(invocations, [
        ['local:channels:add', ['#raianwz']],
        ['local:preferences:update-notifications', { NotifyMe: true, NotifyGift: false }],
    ]);
});
