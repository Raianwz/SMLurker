const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, '../src/components/window/console.js'), 'utf8');

test('SubGift notifies only the exact recipient from the tmi.js event', async () => {
    const listeners = new Map();
    const notifications = [];
    const messages = [];
    const elements = {
        '#username': { value: 'raianwz' },
        '#volBar': { addEventListener() {}, click() {}, style: {} },
        'span.sgSom': { addEventListener() {} },
        'button[name=jc_clean]': { addEventListener() {} },
        '#jcConsole': { value: '' },
    };
    class Notification {
        constructor(options) { notifications.push(options); }
        addListener() {}
        show() {}
    }
    const appcore = {
        appr: { getPath: () => 'userData' },
        fs: {
            exist: (filename) => filename.endsWith('configs.json'),
            rd: () => JSON.stringify({ NotifyGift: true }),
        },
        sc: { tmi: { on: (event, listener) => listeners.set(event, listener) } },
        eshell: { openExternal() {} },
    };
    const context = {
        module: { exports: {} },
        document: { baseURI: 'file:///app/index.html', querySelector: (selector) => elements[selector] },
        localStorage: {
            getItem: (key) => key === 'showGifts' ? 'true' : null,
            setItem() {},
        },
        Audio: class { play() {} },
        URL,
        console: { log() {} },
        require(id) {
            if (id === '@electron/remote') return { Notification, app: {} };
            if (id === 'electron') return { ipcRenderer: { send: (...args) => messages.push(args) } };
            if (id === '../../internal/appcore') return { appcore };
            if (id === '../helpers/assets') return { assetPath: () => 'gift.png' };
            throw new Error(`Unexpected module: ${id}`);
        },
    };
    vm.runInNewContext(source, context);
    await context.module.exports.consoleMng();
    const subgift = listeners.get('subgift');
    subgift('#channel', 'sender', 3, 'otheruser', {}, { 'msg-param-recipient-user-name': 'otheruser' });
    assert.equal(notifications.length, 0);
    subgift('#channel', 'sender', 3, 'RaianWZ', {}, { 'msg-param-recipient-user-name': 'raianwz' });
    assert.equal(notifications.length, 1);
    assert.match(notifications[0].body, /RaianWZ/);
    assert.match(messages.at(-1)[1], /@RaianWZ/);
});
