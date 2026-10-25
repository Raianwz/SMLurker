const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, '../src/components/window/transitions.js'), 'utf8');

function createScreen(reducedMotion = false) {
    const elements = new Map();
    const pending = [];
    const element = (selector) => {
        if (!elements.has(selector)) {
            const classes = new Set();
            elements.set(selector, {
                classList: {
                    add: (name) => classes.add(name),
                    remove: (name) => classes.delete(name),
                    contains: (name) => classes.has(name),
                },
            });
        }
        return elements.get(selector);
    };
    element('.loginBox').classList.add('actived');
    element('.UserWrapper').classList.add('none');
    element('#login_box').classList.add('selected');
    const document = {
        querySelector: (selector) => selector === '.menu-bar > section.selected'
            ? ['#login_box', '#user_box', '#channels_box'].map(element)
                .find((item) => item.classList.contains('selected'))
            : element(selector),
        startViewTransition: (update) => { pending.push(update); },
    };
    const module = { exports: {} };
    vm.runInNewContext(source, {
        module, document,
        window: { matchMedia: () => ({ matches: reducedMotion }) },
        require: () => ({ appcore: { sc: { data: { loadNotify() {} } } } }),
    });
    return { changeSides: module.exports.changeSides, element, pending };
}

test('login and profile animate in both directions and keep the selected icon in sync', () => {
    const screen = createScreen();
    screen.changeSides(1);
    assert.equal(screen.pending.length, 1);
    screen.pending.shift()();
    assert.equal(screen.element('.loginBox').classList.contains('none'), true);
    assert.equal(screen.element('.UserWrapper').classList.contains('none'), false);
    assert.equal(screen.element('#user_box').classList.contains('selected'), true);

    screen.changeSides(0);
    assert.equal(screen.pending.length, 1);
    screen.pending.shift()();
    assert.equal(screen.element('.loginBox').classList.contains('none'), false);
    assert.equal(screen.element('.UserWrapper').classList.contains('none'), true);
    assert.equal(screen.element('#login_box').classList.contains('selected'), true);
});

test('a superseded screen transition cannot show the wrong page', () => {
    const screen = createScreen();
    screen.changeSides(1);
    screen.changeSides(0);
    screen.pending.shift()();
    assert.equal(screen.element('.loginBox').classList.contains('none'), false);
    assert.equal(screen.element('#login_box').classList.contains('selected'), true);
});

test('reduced motion switches screens immediately', () => {
    const screen = createScreen(true);
    screen.changeSides(1);
    assert.equal(screen.pending.length, 0);
    assert.equal(screen.element('.UserWrapper').classList.contains('none'), false);
});
