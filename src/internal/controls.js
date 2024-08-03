module.exports.WControls = windowButtonsControls;

function windowButtonsControls(app) {
    const win = app()
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
            click: () => { api.cr.appr.relaunch(); api.cr.appr.quit() },
        }]
        el('p.version').innerText += \`V\t\${api.cr.appr.getVersion()}\tbeta\`;
        el('p.version').addEventListener('click', () => api.cr.eshell.openExternal(\`https://github.com/Raianwz/SMLurker/releases/tag/v\${api.cr.appr.getVersion()}\`))
    
        wButton('closeWindow').addEventListener('click', () => api.cr.wb.close());
        wButton('gearConfig').addEventListener('click', () => api.cr.ipc.emit('openConfigs') )
        wButton('hideWindow').addEventListener('click', () => {api.cr.wb.hide(); api.tray.export()});
        wButton('minWindow').addEventListener('click', () => api.cr.wb.minimize());
        wButton('menuConfig').addEventListener('click', () => api.cr.clipmenu.show(ShortMenu));`;
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
                api.cr.clipmenu.show(InputMenu);

            }
        })`;
        win.webContents.executeJavaScript(`${wbt}\n${clipeMenu}`);
    })
}

