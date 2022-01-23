let tmpTray;
Controls()

function Controls() {
    const { getCurrentWindow, ipcMain, app: { getVersion } } = require('@electron/remote')
    const { ExportTray } = require('../src/components/window/tray')
    const wButton = btn => document.querySelector(`svg[name=${btn}]`)

    wButton('closeWindow').addEventListener('click', () => getCurrentWindow().close())
    wButton('minWindow').addEventListener('click', () => getCurrentWindow().minimize())
    if (document.querySelector('h1').textContent != 'Configurações') {
        wButton('hideWindow').addEventListener('click', () => {
            getCurrentWindow().hide()
            ExportTray(env)
        })
        wButton('gearConfig').addEventListener('click', () => { ipcMain.emit('openConfigs') })
        document.querySelector('p.version').innerText += `V\t${getVersion()}\tbeta`;
        document.querySelector('#jc_Help').addEventListener('click', () => JCInfo())
        document.querySelector('#jc_Help').addEventListener('mouseenter', () => {
            document.querySelector('#jc_Help').classList.add('material-icons')
            setTimeout(document.querySelector('#jc_Help').classList.remove('material-icons-outlined'), 200)
        })
        document.querySelector('#jc_Help').addEventListener('mouseleave', () => {
            document.querySelector('#jc_Help').classList.add('material-icons-outlined')
            setTimeout(document.querySelector('#jc_Help').classList.remove('material-icons'), 200)
        })
        clipMenu()
    }
}


function clipMenu() {
    const { app, Menu, getCurrentWindow } = require('@electron/remote');
    const mainWindow = getCurrentWindow();
    const InputMenu = Menu.buildFromTemplate([{
        label: 'Desfazer',
        role: 'undo',
        accelerator: 'CmdOrCtrl+Z',
    }, {
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
    },
    ]);
    const ShortMenu = Menu.buildFromTemplate([{
        label: 'Recarregar',
        role: 'reload',
        accelerator: 'CmdOrCtrl+R'
    }, {
        type: 'separator'
    }, {
        label: 'Reiniciar',
        click: () => { app.relaunch(); app.quit() },
    }])

    document.querySelector('svg[name="menuConfig"]').addEventListener('click', () => {
        ShortMenu.popup(mainWindow);
    })
    window.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        let ele = e.target
        if (ele.type === "text" || ele.type === "textarea" || ele.type === "password") {
            InputMenu.popup(mainWindow);
        }
    })

}

window.addEventListener('beforeunload', () => {
    const { getCurrentWindow, app } = require('@electron/remote'), fs = require('fs');
    const configPath = `${app.getPath('userData')}\\Config\\configs.json`;
    let configs = JSON.parse(fs.readFileSync(configPath, { encoding: 'utf8' }));
    let win = getCurrentWindow()
    win.webContents.session.clearCache().then()
    win.webContents.session.clearStorageData().then()
})

function JCInfo() {
    const { dialog } = require('@electron/remote');
    let textao = `Conexão de canais lhe permite entrar/sair de canais sem você precisar deslogar.\nNenhum canal que você entrar ou sair será adicionado ou removido da Lista de Canais.\nConexão de Canais não salva os canais que você entrou e não afeta sua Lista de Canais.`;
    dialog.showMessageBoxSync({
        type: 'info',
        title: 'Conexão de Canais — SMLurker',
        message: textao,
    })
}