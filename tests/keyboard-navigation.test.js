const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const html = fs.readFileSync(path.join(__dirname, '../src/app/index.html'), 'utf8');
const source = fs.readFileSync(path.join(__dirname, '../src/components/window/menubar.js'), 'utf8');

test('sidebar controls are labeled and keyboard focusable', () => {
    for (const id of ['gearConfig', 'login_box', 'user_box', 'channels_box', 'console_open', 'app_exit', 'refresh']) {
        assert.match(html, new RegExp(`<section id="${id}"[^>]*role="button"[^>]*tabindex="0"[^>]*aria-label=`));
    }
    assert.match(html, /id="conection_box"[^>]*tabindex="-1"[^>]*aria-disabled="true"/);
});

test('Enter and Space activate sidebar items, but disabled items stay inactive', () => {
    const items = new Map();
    const handlers = new Map();
    const activated = [];
    for (const id of ['login_box', 'channels_box', 'user_box', 'conection_box', 'gearConfig']) {
        const item = {
            id,
            disabled: id === 'conection_box',
            addEventListener(name, listener) { handlers.set(`${id}:${name}`, listener); },
            hasAttribute(name) { return name === 'disabled' && this.disabled; },
            click() { activated.push(id); },
        };
        items.set(id, item);
    }
    const document = {
        querySelector: (selector) => items.get(selector.replace(/^section#/, '').replace(/^#/, '')),
        querySelectorAll: () => [...items.values()],
    };
    let domReady;
    const win = {
        getTitle: () => 'SM Lurker',
        webContents: {
            on: (_name, listener) => { domReady = listener; },
            executeJavaScript: (code) => vm.runInNewContext(code, { document }),
        },
    };
    const module = { exports: {} };
    vm.runInNewContext(source, { module });
    module.exports.WMenubar(() => win);
    domReady();

    let prevented = false;
    handlers.get('gearConfig:keydown')({ key: 'Enter', preventDefault() { prevented = true; } });
    handlers.get('gearConfig:keydown')({ key: ' ', preventDefault() {} });
    handlers.get('conection_box:keydown')({ key: 'Enter', preventDefault() {} });
    assert.equal(prevented, true);
    assert.deepEqual(activated, ['gearConfig', 'gearConfig']);
});
