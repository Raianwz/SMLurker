const { WMenubar } = require('../components/window/menubar')
module.exports.WControls = windowButtonsControls;

function windowButtonsControls(app) {
    const win = app()
    win.webContents.on('dom-ready', () => {
        let wbt = ""
        if (app().getTitle() == 'SM Lurker') {
            wbt = `let el = (e) => document.querySelector(e)
            let wButton = (btn) => el(\`button[name=\${btn}]\`)
            el('p.version').innerText += \`V\t\${api.cr.appr.getVersion()}\tbeta\`;
            el('p.version').addEventListener('click', () => api.cr.eshell.openExternal(\`https://github.com/Raianwz/SMLurker/releases/tag/v\${api.cr.appr.getVersion()}\`))
        
            el('#console_open').addEventListener('click', () => api.cr.ipc.emit('openConsole') )
            wButton('closeWindow').addEventListener('click', () => api.cr.wb.close());
            wButton('hideWindow').addEventListener('click', () => {api.cr.wb.hide(); api.tray.export()});
            wButton('minWindow').addEventListener('click', () => api.cr.wb.minimize());
            el('#gearConfig').addEventListener('click', () => api.cr.ipc.emit('openConfigs') )
            el('#refresh').addEventListener('click', () => api.desktop.showMenu('refresh'));`;
        }

        let clipeMenu = `window.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            let ele = e.target
            if (ele.type === "text" || ele.type === "textarea" || ele.type === "password") {
                api.desktop.showMenu('input');

            }
        })`;
        win.webContents.executeJavaScript(`${wbt}\n${clipeMenu}`);
    })
}

