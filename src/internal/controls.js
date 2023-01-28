module.exports.WControls = windowButtonsContols;

function windowButtonsContols(app) {
    const win = app.getCurrentWindow()
    win.webContents.on('dom-ready', () => {
        let wbt = `let el = (e) => document.querySelector(e)
        let wButton = (btn) => el(\`svg[name=\${btn}]\`)
        let ShortMenu = [{
            label: 'Recarregar',
            role: 'reload',
            accelerator: 'CmdOrCtrl+R',
        }, {
            type: 'separator',
        }, {
            label: 'Reiniciar',
            click: () => { api.app.relaunch(); api.app.quit() },
        }]
        el('p.version').innerText += \`V\t\${api.app.getVersion()}\tbeta\`;
        el('p.version').addEventListener('click', () => api.elcr.shell.openExternal(\`https://github.com/Raianwz/SMLurker/releases/tag/v\${api.app.getVersion()}\`))
    
        wButton('closeWindow').addEventListener('click', () => api.wb.close());
        wButton('gearConfig').addEventListener('click', () => api.ipc.emit('openConfigs') )
        wButton('hideWindow').addEventListener('click', () => api.wb.hide());
        wButton('minWindow').addEventListener('click', () => api.wb.minimize());
        wButton('menuConfig').addEventListener('click', () => api.clipmenu.show(ShortMenu));`;
        let clipeMenu = `const InputMenu = [{label: 'Desfazer', role: 'undo',accelerator: 'CmdOrCtrl+Z',},
        {
            label: 'Refazer',
            role: 'redo',
            accelerator: 'CmdOrCtrl+Y',
        }, {
            type: 'separator',
        }, {
            label: 'Recortar',
            role: 'cut',
            accelerator: 'CmdOrCtrl+X',
        }, {
            label: 'Copiar',
            role: 'copy',
            accelerator: 'CmdOrCtrl+C',
        }, {
            label: 'Colar',
            role: 'paste',
            accelerator: 'CmdOrCtrl+V',
        }, {
            type: 'separator',
        }, {
            label: 'Selecionar Tudo',
            role: 'selectall',
            accelerator: "CmdOrCtrl+A",
        },];
        window.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            let ele = e.target
            if (ele.type === "text" || ele.type === "textarea" || ele.type === "password") {
                api.clipmenu.show(InputMenu);
            }
        })`;
        win.webContents.executeJavaScript(`${wbt}\n${clipeMenu}`);
    })
}

