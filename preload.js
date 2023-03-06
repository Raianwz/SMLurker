// Preload (Isolated World)
const { contextBridge } = require('electron')
const Eremote = require('@electron/remote')
const pfs = require('fs')
const { WControls } = require('./src/internal/controls')
const { SCore } = require('./src/internal/smcore')
const path = require('path')

WControls(Eremote)

const api = {
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
        env: () => {
            let elcr = require('@electron/remote');
            if (elcr.app.isPackaged) {
                return 'PRODUCTION';
            } else {
                return 'DEV';
            }
        }
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
        showODS: (opts) => Eremote.dialog.showOpenDialogSync(opts),
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
    },
    console: {
        manager: () => {
            let { consoleMng } = require('./src/components/window/console')
            consoleMng()
        },
        panel: (txt) => {
            let { panel } = require('./src/components/window/console')
            panel(txt)
        },
        reset: () => {
            let { barReset } = require('./src/components/window/console')
            barReset()
        }
    },
    tray: {
        export: () => {
            let { ExportTray } = require('./src/components/helpers/tray')
            ExportTray()
        }
    }

}


contextBridge.exposeInMainWorld('api', api);

module.exports.API = api;