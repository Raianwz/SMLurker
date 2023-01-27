// Preload (Isolated World)
const { contextBridge, ipcRenderer } = require('electron')
const localPath = require('path')
const localFS = require('fs')
const localRemote = require('@electron/remote')

const localMenu = {
    thisMenu: () => localRemote.Menu.buildFromTemplate,
    buildFromTemplate: (obj) => localRemote.Menu.buildFromTemplate(obj),
    popup: (obj, win) => localRemote.Menu.buildFromTemplate(obj).popup(win),
}


const localIPCMain = {
    thisIPC: () => localRemote.ipcMain,
    emit: (obj) => localRemote.ipcMain.emit(obj),
}

const localDialog = {
    thisDialog: () => localRemote.dialog,
    showDialog: (obj) => localRemote.dialog.showSaveDialog(obj),
    showMessageBox: (obj) => localRemote.dialog.showMessageBoxSync(obj),
}

const controlWindows = {
    thisW: () => localRemote.getCurrentWindow(),
    close: () => localRemote.getCurrentWindow().close(),
    hide: () => localRemote.getCurrentWindow().hide(),
    minimize: () => localRemote.getCurrentWindow().minimize(),
    show: () => localRemote.getCurrentWindow().show(),
}

const api = {
    oi: 'Oiê',
    path: () => localPath,
    getRemote: () => localRemote,
    getIPCMain: localIPCMain,
    getWnd: () => controlWindows,
    getDialog: () => localDialog,
    getMenu: localMenu,
    getFs: () => localFS,
}


contextBridge.exposeInMainWorld('api', api);