const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, '../src/components/configs/configs.js'), 'utf8');

function createConfigWindow() {
    const elements = new Map();
    const actions = [];
    let saved = { ini: false, autologin: false, inimin: false };
    const element = (selector) => {
        if (!elements.has(selector)) {
            elements.set(selector, {
                checked: false,
                addEventListener(event, handler) { this[event] = handler; },
                classList: { add() {}, remove() {} },
            });
        }
        return elements.get(selector);
    };
    const remote = {
        app: { getPath: () => 'C:\\Test' },
        dialog: {},
        shell: {
            openPath: (target) => actions.push(['openPath', target]),
            openExternal: (target) => actions.push(['openExternal', target]),
        },
        getCurrentWindow: () => ({
            minimize: () => actions.push(['minimize']),
            close: () => actions.push(['close']),
        }),
    };
    const fakeFs = {
        existsSync: () => true,
        readFileSync: () => JSON.stringify(saved),
        writeFileSync: (target, data) => { saved = JSON.parse(data); },
    };
    const context = {
        __dirname: path.join(__dirname, '../src/app'),
        document: { querySelector: element },
        require(id) {
            if (id === '@electron/remote') return remote;
            if (id === 'fs') return fakeFs;
            if (id === 'path') return path;
            if (id === 'auto-launch') return class AutoLaunch {};
            if (id.endsWith('setupConfigs')) return { createConfigs() {} };
            if (id.endsWith('channelFile')) return { getChannelsFilePath() {}, readChannelsFile() {} };
            throw new Error(`Unexpected module: ${id}`);
        },
    };
    vm.runInNewContext(source, context);
    return { actions, element, getSaved: () => saved };
}

test('configuration window keeps switches and file/window actions connected', () => {
    const { actions, element, getSaved } = createConfigWindow();

    element('#swt_autologin').checked = true;
    element('#swt_autologin').click();
    element('#swt_inimin').checked = true;
    element('#swt_inimin').click();
    assert.equal(getSaved().autologin, true);
    assert.equal(getSaved().inimin, true);

    element('[name="abrirLocal"]').click();
    element('[name=githubChange]').click();
    element('button[name=minWindow]').click();
    element('button[name=closeWindow]').click();

    assert.deepEqual(actions, [
        ['openPath', 'C:\\Test\\Config'],
        ['openExternal', 'https://github.com/Raianwz/SMLurker/releases/latest'],
        ['minimize'],
        ['close'],
    ]);
});
