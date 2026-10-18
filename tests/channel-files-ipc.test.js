const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, '../src/components/ipc/channelFiles.js'), 'utf8');

test('channel file IPC accepts only the main window and reads only selected list files', async () => {
    const handlers = new Map();
    const writes = [];
    let selectedFile = 'C:/lists/channels.json';
    const fileSystem = {
        statSync: () => ({ size: 100 }),
        readFileSync: () => '["#raianwz"]',
        writeFileSync: (...args) => writes.push(args),
    };
    const context = { module: { exports: {} }, require(id) {
        if (id === 'node:fs') return fileSystem;
        if (id === 'node:path') return path;
        if (id === '../helpers/localData') return { createLocalData: () => ({ channels: { list: () => ['#raianwz'] } }) };
        throw new Error(`Unexpected module: ${id}`);
    } };
    vm.runInNewContext(source, context);
    context.module.exports.registerChannelFilesIpc({
        app: {},
        ipcMain: { handle: (name, handler) => handlers.set(name, handler) },
        dialog: {
            showOpenDialog: async () => ({ canceled: false, filePaths: [selectedFile] }),
            showSaveDialog: async () => ({ canceled: false, filePath: 'C:/lists/export.json' }),
        },
        getMainWindow: () => ({}),
        fromMainWindow: (event) => { if (event.sender !== 'main') throw new Error('Janela não autorizada.'); },
    });

    await assert.rejects(handlers.get('channel-files:import')({ sender: 'other' }), /não autorizada/);
    assert.deepEqual(JSON.parse(JSON.stringify(await handlers.get('channel-files:import')({ sender: 'main' }))),
        { data: '["#raianwz"]', extension: '.json' });
    selectedFile = 'C:/lists/private.key';
    await assert.rejects(handlers.get('channel-files:import')({ sender: 'main' }), /Formato/);
    await assert.rejects(handlers.get('channel-files:export')({ sender: 'other' }, 'both'), /não autorizada/);
    await handlers.get('channel-files:export')({ sender: 'main' }, 'both');
    assert.equal(writes[0][0], 'C:/lists/export.json');
    assert.deepEqual(JSON.parse(writes[0][1]), ['#raianwz']);
});
