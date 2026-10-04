const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, '../src/components/twitch/client.js'), 'utf8');

function createLoginFlow(joinError) {
    const calls = [];
    const elements = new Map();
    const element = (selector) => {
        if (!elements.has(selector)) {
            const classes = new Set();
            elements.set(selector, {
                value: '',
                textContent: '',
                classList: {
                    add: (...names) => names.forEach((name) => classes.add(name)),
                    remove: (...names) => names.forEach((name) => classes.delete(name)),
                    contains: (name) => classes.has(name),
                },
                blur() {},
            });
        }
        return elements.get(selector);
    };
    element('#username').value = 'raianwz';
    element('#pass').value = 'oauth:legacy-token';
    element('section#user_box').textContent = 'profile';

    const api = {
        tw: {
            tmi: {
                ini: () => ({}),
                cn: async () => { calls.push('connect'); },
                dc: async () => { calls.push('disconnect'); },
            },
            data: {
                loadUserData: async () => {},
                createProfile: async () => {},
                saveUserData: async () => { calls.push('save'); },
            },
            jcnc: async () => {
                calls.push('join');
                if (joinError) throw joinError;
            },
            jp: () => { calls.push('join-manager'); },
        },
        cr: {
            tr: {
                changeside: (side) => { calls.push(`side:${side}`); },
                blockinput: (blocked) => { calls.push(`block:${blocked}`); },
            },
        },
        console: { manager: () => { calls.push('console'); } },
        auth: { onWebLoginResult: () => {} },
    };
    const context = vm.createContext({ api, document: { getElementById: (id) => element(`#${id}`), querySelector: element } });
    vm.runInContext(source, context);
    return { context, element, calls };
}

test('legacy Entrar connects, joins and only then saves credentials', async () => {
    const { context, element, calls } = createLoginFlow();
    await context.entrarTwitch();
    assert.deepEqual(calls.slice(0, 3), ['block:true', 'connect', 'join']);
    assert.ok(calls.indexOf('save') > calls.indexOf('join'));
    assert.equal(element('#btnEntrar').value, 'Sair');
    assert.equal(element('#msgStatus').textContent, 'Entrou nos canais!');
});

test('failed channel join does not save credentials or show a connected state', async () => {
    const { context, element, calls } = createLoginFlow(new Error('Nenhum canal adicionado'));
    await context.entrarTwitch();
    assert.equal(calls.includes('save'), false);
    assert.equal(calls.includes('disconnect'), true);
    assert.equal(element('#btnEntrar').value, 'Entrar');
    assert.equal(element('#msgStatus').textContent, 'Nenhum canal adicionado');
});
