const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, '../src/components/configs/configs.js'), 'utf8');

function createConfigWindow() {
    const elements = new Map();
    const actions = [];
    let saved = { ini: false, autologin: false, inimin: false, appearance: 'modern' };
    const documentElement = { dataset: {} };
    const element = (selector) => {
        if (!elements.has(selector)) {
            elements.set(selector, {
                checked: false,
                value: '',
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
        __dirname: path.join(__dirname, '../src/components/configs'),
        document: { querySelector: element, documentElement },
        require(id) {
            if (id === '@electron/remote') return remote;
            if (id === 'electron') return { ipcRenderer: {
                invoke: async (channel, value) => {
                    assert.equal(channel, 'appearance:set');
                    saved = { ...saved, appearance: value };
                    return value;
                },
            } };
            if (id === 'fs') return fakeFs;
            if (id === 'path') return path;
            if (id === 'auto-launch') return class AutoLaunch {};
            if (id.endsWith('setupConfigs')) {
                require.resolve(id, { paths: [context.__dirname] });
                return { createConfigs() {} };
            }
            if (id.endsWith('channelFile')) {
                require.resolve(id, { paths: [context.__dirname] });
                return { getChannelsFilePath() {}, readChannelsFile() {} };
            }
            throw new Error(`Unexpected module: ${id}`);
        },
    };
    vm.runInNewContext(source, context);
    return { actions, element, documentElement, getSaved: () => saved };
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

test('visual selection saves the appearance and applies it in the settings window', async () => {
    const { element, documentElement, getSaved } = createConfigWindow();
    assert.equal(element('#appearanceSelect').value, 'modern');
    assert.equal(documentElement.dataset.appearance, 'modern');

    element('#appearanceSelect').value = 'classic';
    await element('#appearanceSelect').change();

    assert.equal(getSaved().appearance, 'classic');
    assert.equal(documentElement.dataset.appearance, 'classic');
});
