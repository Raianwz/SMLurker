const { Menu, app, getCurrentWindow, ipcMain, dialog, shell } = require("@electron/remote");
const { ipcRenderer } = require("electron");
const { existsSync, readFileSync, writeFileSync } = require('fs')
const { join, resolve } = require('path')
const { WControls } = require('./controls')
const { WMenubar } = require('../components/window/menubar')
const { smcore } = require('./smcore');


WControls(getCurrentWindow)
WMenubar(getCurrentWindow)
const appcore = {
    clipmenu: {
        show: (obj, win) => Menu.buildFromTemplate(obj).popup(win)
    },
    ipc: {
        emit: (obj) => ipcMain.emit(obj),
        send: (event, data) => { ipcRenderer.send(event, data) },
    },
    appr: app,
    eshell: shell,
    wgetTitle: () => getCurrentWindow().getTitle(),
    wgetDev: () => { getCurrentWindow().webContents.openDevTools() },
    wb: {
        close: () => getCurrentWindow().close(),
        focus: () => getCurrentWindow().focus(),
        hide: () => getCurrentWindow().hide(),
        minimize: () => getCurrentWindow().minimize(),
        show: () => getCurrentWindow().show(),
    },
    helpers: {
        sleep: async (ms) => { return new Promise(resolve => setTimeout(resolve, ms)) },
        env: () => {
            let elcr = require('@electron/remote');
            if (elcr.app.isPackaged) {
                return 'PRODUCTION';
            } else {
                return 'DEV';
            }
        },
    },
    fs: {
        exist: (path) => existsSync(path),
        read: (path, args) => readFileSync(path, args),
        rd: (path) => readFileSync(path, { encoding: 'utf8' }),
        write: (path, args) => writeFileSync(path, args),
    },
    path: {
        fjoin: (args) => join(__filename, args),
        fresolve: (args) => resolve(__filename, args),
        join: (args) => join(__dirname, args),
        resolve: (args) => resolve(__dirname, args),
    },
    dg: {
        showMB: (opts) => dialog.showMessageBoxSync(opts),
        showODS: (opts) => dialog.showOpenDialogSync(opts),
        showSD: (opts) => dialog.showSaveDialog(opts),
    },
    tr: {
        changeside: (dest) => {
            let { changeSides } = require('../components/window/transitions')
            changeSides(dest)
        },
        blockinput: (value) => {
            let { blockInputs } = require('../components/window/transitions')
            blockInputs(value)
        }
    },
    sc: smcore

}

module.exports = { appcore }

