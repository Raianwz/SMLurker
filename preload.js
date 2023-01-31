// Preload (Isolated World)
const { contextBridge } = require('electron')
const Eremote = require('@electron/remote')
const pfs = require('fs')
const ppath = require('path')
const { WControls } = require('./src/internal/controls')
const { SCore } = require('./src/internal/smcore')
const path = require('path')

WControls(Eremote)

const api = {
    oi: 'Oiê',
    clipmenu: {
        show: (obj, win) => Eremote.Menu.buildFromTemplate(obj).popup(win),
    },
    elcr: Eremote,
    app: Eremote.app,
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
    tw: SCore,
    helpers: {
        sleep: async (ms) => { return new Promise(resolve => setTimeout(resolve, ms)) },
        env: () => Eremote.isPackaged ? 'PRODUCTION' : 'DEV',
    },
    fs: {
        exist: (path) => pfs.existsSync(path),
        read: (path, args) => pfs.readFileSync(path, args),
        rd: (path) => pfs.readFileSync(path, { encoding: 'utf8' }),
        write: (path, args) => pfs.writeFileSync(path, args),
    },
    path: {
        fjoin: (args) => path.join(__filename, args),
        fresolve: (args) => path.resolve(__filenamem, args),
        join: (args) => path.join(__dirname, args),
        resolve: (args) => path.resolve(__dirname, args),
    },
    dg: {
        showMB: (opts) => Eremote.dialog.showMessageBoxSync(opts),
    },
    tr: {
        changeside: (btn, dest) => {
            let { changeSides } = require('./src/components/window/transitions')
            changeSides(btn, dest)
        },
        blockinput: (value) => {
            let { blockInputs } = require('./src/components/window/transitions')
            blockInputs(value)
        }
    }

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