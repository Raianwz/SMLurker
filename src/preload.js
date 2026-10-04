// Preload (Isolated World)
const { contextBridge, ipcRenderer } = require('electron')
const { smcore } = require('./internal/smcore')
const { appcore } = require('./internal/appcore')

const api = {
    auth: {
        startWebLogin: () => ipcRenderer.invoke('web-login:start'),
        restoreWebLogin: () => ipcRenderer.invoke('web-login:restore'),
        invalidateWebLogin: () => ipcRenderer.invoke('web-login:invalid'),
        onWebLoginResult: (callback) => {
            const listener = (_event, result) => callback(result);
            ipcRenderer.on('web-login:result', listener);
            return () => ipcRenderer.removeListener('web-login:result', listener);
        },
    },
    tw: smcore,
    cr: appcore,
    console: {
        manager: () => {
            let { consoleMng } = require('./components/window/console')
            consoleMng()
        },
        panelListiner: () =>{
            let { consolePnListiner } = require('./components/window/panelConsole')
            consolePnListiner()
        },
        jcPanel: (txt) => {
            let { jcPanel } = require('./components/window/console')
            jcPanel(txt)
        },
        jcPanelReset: () =>{
            let { jcPNReset} = require('./components/window/console')
            jcPNReset()
        },
    },
    tray: {
        export: () => {
            let { ExportTray } = require('./components/helpers/tray')
            ExportTray()
        }
    }

}

contextBridge.exposeInMainWorld('api', api);
