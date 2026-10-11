const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

function createChannelManager() {
    const elements = new Map();
    const saved = [];
    const createElement = () => {
        const handlers = {};
        const classes = new Set();
        return {
            value: '', innerText: '', textContent: '', hidden: false, disabled: false,
            children: [], handlers,
            classList: {
                add: (name) => classes.add(name),
                remove: (name) => classes.delete(name),
                toggle: (name, force) => force ? classes.add(name) : classes.delete(name),
                contains: (name) => classes.has(name),
            },
            addEventListener: (event, handler) => { handlers[event] = handler; },
            replaceChildren(...children) { this.children = children; },
            append(...children) { this.children.push(...children); },
            setAttribute(name, value) { this[name] = value; },
            showModal() { this.open = true; },
            close() { this.open = false; handlers.close?.(); },
            focus() {},
        };
    };
    const element = (selector) => {
        if (!elements.has(selector)) elements.set(selector, createElement());
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
            createElement,
        },
        localStorage: { getItem: () => null, setItem() {} },
    });
    vm.runInContext(source, context);

    return { element, saved };
}

test('adding a channel through the manager clears the classic login warning', () => {
    const { element, saved } = createChannelManager();

    element('#classicLoginError').textContent = 'Nenhum canal adicionado';
    element('#txtCanal').value = 'raianwz';
    element('button[name="addCanal"]').handlers.click();

    assert.equal(saved.at(-1), '["#raianwz"]');
    assert.equal(element('#classicLoginError').hidden, true);
    assert.equal(element('#classicLoginError').textContent, '');
});

test('Enter adds comma-separated channels without duplicating existing ones', () => {
    const { element, saved } = createChannelManager();
    const input = element('#txtCanal');
    let prevented = false;
    input.value = 'raianwz,patopapao,felps';
    input.handlers.keydown({ key: 'Enter', preventDefault() { prevented = true; } });

    assert.equal(prevented, true);
    assert.deepEqual(JSON.parse(saved.at(-1)), ['#raianwz', '#patopapao', '#felps']);

    input.value = 'felps,twitch,pokemon';
    input.handlers.keydown({ key: 'Enter', preventDefault() {} });
    assert.deepEqual(JSON.parse(saved.at(-1)), ['#raianwz', '#patopapao', '#felps', '#twitch', '#pokemon']);
    assert.match(element('#canalLog').innerText, /2 canais adicionados; 1 já estava na lista/);
});

test('comma is accepted in the channel field and Enter respects disabled controls', () => {
    const { element, saved } = createChannelManager();
    let prevented = false;
    element('#txtCanal').handlers.keypress({ charCode: 44, preventDefault() { prevented = true; } });
    assert.equal(prevented, false);

    element('#txtCanal').value = 'raianwz';
    element('button[name="addCanal"]').disabled = true;
    element('#txtCanal').handlers.keydown({ key: 'Enter', preventDefault() {} });
    assert.equal(saved.length, 0);
});

test('saved-channel view shows the count and filters channels by name', () => {
    const { element, saved } = createChannelManager();
    assert.equal(element('#toggleChannelList').textContent, 'Ver lista (0)');
    element('#txtCanal').value = 'raianwz,patopapao,felps';
    element('button[name="addCanal"]').handlers.click();
    assert.equal(element('#toggleChannelList').textContent, 'Ver lista (3)');

    element('#toggleChannelList').handlers.click();
    assert.equal(element('#toggleChannelList').textContent, 'Voltar');
    assert.equal(element('#channelListView').classList.contains('none'), false);
    assert.equal(element('#channelListItems').children.length, 3);

    element('#channelListSearch').value = 'pato';
    element('#channelListSearch').handlers.input();
    assert.equal(element('#channelListItems').children.length, 1);
    assert.equal(element('#channelListItems').children[0].children[0].textContent, '#patopapao');
    assert.equal(element('#channelListSummary').textContent, '1 de 3 canais');
    assert.equal(saved.length, 1);
});

test('removing a channel from the list requires confirmation', () => {
    const { element, saved } = createChannelManager();
    element('#txtCanal').value = 'raianwz,felps';
    element('button[name="addCanal"]').handlers.click();
    element('#toggleChannelList').handlers.click();

    const remove = element('#channelListItems').children[0].children[1];
    remove.handlers.click();
    assert.equal(element('#channelRemoveDialog').open, true);
    assert.equal(element('#channelRemoveName').textContent, '#felps');
    element('#channelRemoveCancel').handlers.click();
    assert.equal(saved.length, 1);

    remove.handlers.click();
    element('#channelRemoveConfirm').handlers.click();
    assert.deepEqual(JSON.parse(saved.at(-1)), ['#raianwz']);
    assert.equal(element('#channelListItems').children.length, 1);
    assert.equal(element('#channelListSummary').textContent, '1 canal salvo');
});

test('channel editing is disabled while connecting, while export and clear remain available', () => {
    const source = fs.readFileSync(path.join(__dirname, '../src/components/window/transitions.js'), 'utf8');
    const inputs = [{ disabled: false }, { disabled: false }, { disabled: false }];
    const buttons = Array.from({ length: 7 }, () => ({ disabled: false }));
    const groups = new Map([
        ['#username', [inputs[0]]],
        ['#pass', [inputs[1]]],
        ['#txtCanal', [inputs[2]]],
        ['.channelsManager button.add', [buttons[0]]],
        ['.channelsManager button.remove', [buttons[1]]],
        ['.channelsManager button.channel-list-remove', [buttons[2]]],
        ['.channelsManager #channelRemoveConfirm', [buttons[3]]],
        ['.channelsManager button[name="loadChannelsFromFile"]', [buttons[4]]],
    ]);
    const context = vm.createContext({
        require: () => ({ appcore: {} }),
        module: { exports: {} },
        document: { querySelectorAll: (selector) => groups.get(selector) ?? [] },
    });
    vm.runInContext(source, context);

    context.module.exports.blockInputs(true);
    assert.equal([...inputs, ...buttons.slice(0, 5)].every((item) => item.disabled), true);
    assert.equal(buttons.slice(5).every((item) => !item.disabled), true);
    context.module.exports.blockInputs(false);
    assert.equal([...inputs, ...buttons].every((item) => !item.disabled), true);
});
