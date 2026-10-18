const fs = require('node:fs');
const path = require('node:path');
const { createLocalData } = require('../helpers/localData');

function registerChannelFilesIpc({ app, ipcMain, dialog, getMainWindow, fromMainWindow }) {
    const localData = createLocalData(app);
    ipcMain.handle('channel-files:import', async (event) => {
        fromMainWindow(event);
        const result = await dialog.showOpenDialog(getMainWindow(), {
            properties: ['openFile'],
            filters: [{ name: 'Listas de canais', extensions: ['txt', 'json'] }],
        });
        if (result.canceled || !result.filePaths?.[0]) return null;
        const filename = result.filePaths[0];
        const extension = path.extname(filename).toLowerCase();
        if (!['.txt', '.json'].includes(extension)) throw new Error('Formato de lista inválido.');
        if (fs.statSync(filename).size > 1024 * 1024) throw new Error('A lista excede 1 MB.');
        return { data: fs.readFileSync(filename, 'utf8'), extension };
    });
    ipcMain.handle('channel-files:export', async (event, format = 'both') => {
        fromMainWindow(event);
        if (!['both', 'txt'].includes(format)) throw new Error('Formato de exportação inválido.');
        const channels = localData.channels.list();
        if (!channels.length) return { empty: true };
        channels.sort();
        const date = new Date().toLocaleDateString('pt-BR').replaceAll('/', '.');
        const filters = format === 'both'
            ? [{ name: 'Lista em texto', extensions: ['txt'] }, { name: 'Lista em JSON', extensions: ['json'] }]
            : [{ name: 'Lista em texto', extensions: ['txt'] }];
        const result = await dialog.showSaveDialog(getMainWindow(), {
            properties: ['dontAddToRecent'], filters,
            defaultPath: `minha_lista.${date}.${format === 'txt' ? 'txt' : 'json'}`,
            title: 'Exportar Lista',
        });
        if (result.canceled || !result.filePath) return { canceled: true };
        const extension = path.extname(result.filePath).toLowerCase();
        if (!['.txt', '.json'].includes(extension) || (format === 'txt' && extension !== '.txt')) {
            throw new Error('Formato de exportação inválido.');
        }
        fs.writeFileSync(result.filePath, extension === '.json'
            ? JSON.stringify(channels, null, 2) : channels.join(','));
        return { exported: true };
    });
}

module.exports = { registerChannelFilesIpc };
