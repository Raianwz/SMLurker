
Controls()

function Controls() {
    const el = (e) => document.querySelector(e);
    const { getCurrentWindow, ipcMain, app: { getVersion }, shell: { openExternal } } = require('@electron/remote')
    const { ExportTray } = require('../src/components/window/tray')
    const wButton = btn => el(`svg[name=${btn}]`)

    wButton('closeWindow').addEventListener('click', () => getCurrentWindow().close())
    wButton('minWindow').addEventListener('click', () => getCurrentWindow().minimize())
    if (el('h1').textContent != 'Configurações') {
        wButton('hideWindow').addEventListener('click', () => { getCurrentWindow().hide(); ExportTray(env) })
        wButton('gearConfig').addEventListener('click', () => { ipcMain.emit('openConfigs') })
        el('p.version').innerText += `V\t${getVersion()}\tbeta`;
        el('p.version').addEventListener('click', () => openExternal(`https://github.com/Raianwz/SMLurker/releases/tag/v${getVersion()}`))
        el('#jc_Help').addEventListener('click', () => JCInfo())
        el('#jc_Help').addEventListener('mouseenter', () => {
            el('#jc_Help').classList.add('material-icons'); el('#jc_Help').classList.remove('material-icons-outlined')
        })
        el('#jc_Help').addEventListener('mouseleave', () => {
            el('#jc_Help').classList.add('material-icons-outlined'); el('#jc_Help').classList.remove('material-icons');
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
        accelerator: 'CmdOrCtrl+R',
    }, {
        type: 'separator',
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
    const { getCurrentWindow } = require('@electron/remote')
    let btn = document.querySelector('#btnEntrar')
    let win = getCurrentWindow()
    btn.onclick.name === 'sairTwitch' ? btn.onclick() : false;
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
