// Preload (Isolated World)
const { contextBridge } = require('electron')
const { smcore } = require('./internal/smcore')
const { appcore } = require('./internal/appcore')

const api = {
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