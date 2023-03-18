// Preload (Isolated World)
const { contextBridge } = require('electron')
const { smcore } = require('./src/internal/smcore')
const { appcore } = require('./src/internal/appcore')

const api = {
    tw: smcore,
    cr: appcore,
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