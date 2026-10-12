const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { registerLocalDataIpc } = require('../src/components/ipc/localData');

test('local data IPC accepts only requests from the main window', () => {
    const handlers = new Map();
    const mainSender = {};
    registerLocalDataIpc({
        app: { isPackaged: true, getPath: () => path.join(__dirname, 'missing-user-data') },
        ipcMain: { handle: (channel, handler) => handlers.set(channel, handler) },
        fromMainWindow: (event) => {
            if (event.sender !== mainSender) throw new Error('Janela não autorizada.');
        },
    });

    assert.deepEqual(handlers.get('local:channels:list')({ sender: mainSender }), []);
    assert.throws(
        () => handlers.get('local:channels:replace')({ sender: {} }, ['valid']),
        /Janela não autorizada/,
    );
});
