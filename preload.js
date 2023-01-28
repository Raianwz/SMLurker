// Preload (Isolated World)
const { contextBridge } = require('electron')
const Eremote = require('@electron/remote')
const { WControls } = require('./src/internal/controls')

WControls(Eremote)



const api = {
    oi: 'Oiê',
    clipmenu:{
        show: (obj, win) => Eremote.Menu.buildFromTemplate(obj).popup(win),
    },
    ecr: Eremote,
    ipc: {
        emit: (obj) => Eremote.ipcMain.emit(obj),
    },
    wb: {
        close: () => Eremote.getCurrentWindow().close(),
        focus: () => Eremote.getCurrentWindow().focus(),
        hide: () => Eremote.getCurrentWindow().hide(),
        minimize: () => Eremote.getCurrentWindow().minimize(),
        show: () => Eremote.getCurrentWindow().show(),
    },

}


contextBridge.exposeInMainWorld('api', api);

/*

const localIPCMain = {
    thisIPC: () => Eremote.ipcMain,
    emit: (obj) => Eremote.ipcMain.emit(obj),
}

const localDialog = {
    thisDialog: () => Eremote.dialog,
    showDialog: (obj) => Eremote.dialog.showSaveDialog(obj),
    showMessageBox: (obj) => Eremote.dialog.showMessageBoxSync(obj),
}

const clientTmi = {
    create: options => { return tmiClient = pTmi.Client(options) },
    cliente: () => { return tmiClient },
    connect: () => tmiClient.connect(),//pTmi.Client(options).connect(),
    disconnect: () => tmiClient.disconnect(), //pTmi.Client(options).disconnect(),
}


const api = {
    oi: 'Oiê',
    path: () => localPath,
    getRemote: () => Eremote,
    getIPCMain: localIPCMain,
    getWnd: () => controlWindows,
    getDialog: () => localDialog,
    getMenu: localMenu,
    getFs: () => localFS,
    tmi: pTmi,
    ftmi: clientTmi,
    env: () => pEnv(Eremote.app),
    setupConfigs: pSetupConfigs,
    trayExport: () => pTray.ExportTray(),
}
*/