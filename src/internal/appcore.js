const { Menu, app, getCurrentWindow, ipcMain, dialog, shell } = require("@electron/remote");
const { existsSync, readFileSync, writeFileSync } = require('fs')
const { join, resolve } = require('path')
const { WControls } = require('./controls')
const { smcore } = require('./smcore')

WControls(getCurrentWindow)
const appcore = {
    clipmenu: {
        show: (obj, win) => Menu.buildFromTemplate(obj).popup(win)
    },
    ipc: {
        emit: (obj) => ipcMain.emit(obj)
    },
    appr: app,
    eshell: shell,
    egetW: getCurrentWindow,
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
        changeside: (btn, dest) => {
            let { changeSides } = require('../components/window/transitions')
            changeSides(btn, dest)
        },
        blockinput: (value) => {
            let { blockInputs } = require('../components/window/transitions')
            blockInputs(value)
        }
    },
    sc: smcore

}

module.exports = { appcore }

