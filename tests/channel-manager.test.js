const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

test('adding a channel through the manager clears the classic login warning', () => {
    const elements = new Map();
    const saved = [];
    const element = (selector) => {
        if (!elements.has(selector)) {
            const handlers = {};
            elements.set(selector, {
                value: '', innerText: '', textContent: '', hidden: false, handlers,
                classList: { add() {}, remove() {} },
                addEventListener: (event, handler) => { handlers[event] = handler; },
                focus() {},
            });
        }
        return elements.get(selector);
    };
    const api = {
        tw: { data: { loadNotify: async () => {} } },
        cr: {
            channels: { path: () => 'channels.json', read: () => JSON.parse(saved.at(-1)) },
            fs: { exist: () => saved.length > 0, write: (_path, value) => saved.push(value) },
            helpers: { sleep: () => new Promise(() => {}) },
        },
    };
    const source = fs.readFileSync(path.join(__dirname, '../src/components/twitch/channels.js'), 'utf8');
    const context = vm.createContext({
        api,
        document: {
            querySelector: element,
            getElementById: (id) => element(`#${id}`),
        },
        localStorage: { getItem: () => null, setItem() {} },
    });
    vm.runInContext(source, context);

    element('#classicLoginError').textContent = 'Nenhum canal adicionado';
    element('#txtCanal').value = 'raianwz';
    element('button[name="addCanal"]').handlers.click();

    assert.equal(saved.at(-1), '["#raianwz"]');
    assert.equal(element('#classicLoginError').hidden, true);
    assert.equal(element('#classicLoginError').textContent, '');
});

test('channel editing is disabled while connecting, while export and clear remain available', () => {
    const source = fs.readFileSync(path.join(__dirname, '../src/components/window/transitions.js'), 'utf8');
    const inputs = [{ disabled: false }, { disabled: false }, { disabled: false }];
    const buttons = Array.from({ length: 5 }, () => ({ disabled: false }));
    const groups = new Map([
        ['#username', [inputs[0]]],
        ['#pass', [inputs[1]]],
        ['#txtCanal', [inputs[2]]],
        ['.channelsManager button.add', [buttons[0]]],
        ['.channelsManager button.remove', [buttons[1]]],
        ['.channelsManager button[name="loadChannelsFromFile"]', [buttons[2]]],
    ]);
    const context = vm.createContext({
        require: () => ({ appcore: {} }),
        module: { exports: {} },
        document: { querySelectorAll: (selector) => groups.get(selector) ?? [] },
    });
    vm.runInContext(source, context);

    context.module.exports.blockInputs(true);
    assert.equal([...inputs, ...buttons.slice(0, 3)].every((item) => item.disabled), true);
    assert.equal(buttons.slice(3).every((item) => !item.disabled), true);
    context.module.exports.blockInputs(false);
    assert.equal([...inputs, ...buttons].every((item) => !item.disabled), true);
});
