const APICore = window.api.getRemote();
Controls();

function Controls() {
    const { app: { getVersion }, shell: { openExternal } } = APICore;
    const el = (e) => document.querySelector(e);
    const env = api.env()
    //const { getCurrentWindow, ipcMain, app: { getVersion }, shell: { openExternal } } = require('@electron/remote'), path = require('path');
    const wButton = btn => el(`svg[name=${btn}]`)

    wButton('closeWindow').addEventListener('click', () => api.getWnd().close())
    wButton('minWindow').addEventListener('click', () => api.getWnd().minimize())
    if (el('h1').textContent != 'Configurações') {

        wButton('hideWindow').addEventListener('click', () => { api.getWnd().minimize(); api.trayExport(); })
        wButton('gearConfig').addEventListener('click', () => { api.getIPCMain.emit('openConfigs') })
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
    const mainWindow = api.getWnd().thisW();;
    const Popup = (obj, win) => api.getMenu.popup(obj, win)
    const InputMenu = [{
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
    ];

    const ShortMenu = [{
        label: 'Recarregar',
        role: 'reload',
        accelerator: 'CmdOrCtrl+R',
    }, {
        type: 'separator',
    }, {
        label: 'Reiniciar',
        click: () => { api.getRemote().app.relaunch(); api.getRemote().app.quit() },
    }]
    document.querySelector('svg[name="menuConfig"]').addEventListener('click', () => {
        Popup(ShortMenu, mainWindow);
    })
    window.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        let ele = e.target
        if (ele.type === "text" || ele.type === "textarea" || ele.type === "password") {
            Popup(InputMenu, mainWindow);
        }
    })

}

window.addEventListener('beforeunload', () => {
    let btn = document.querySelector('#btnEntrar')
    let win = api.getWnd()
    btn.onclick.name === 'sairTwitch' ? btn.onclick() : false;
    win.webContents.session.clearCache().then()
    win.webContents.session.clearStorageData().then()
})

function JCInfo() {
    //const { dialog } = require('@electron/remote');
    let textao = `Conexão de canais lhe permite entrar/sair de canais sem você precisar deslogar.\nNenhum canal que você entrar ou sair será adicionado ou removido da Lista de Canais.\nConexão de Canais não salva os canais que você entrou e não afeta sua Lista de Canais.`;
    dialog.showMessageBoxSync({
        type: 'info',
        title: 'Conexão de Canais — SMLurker',
        message: textao,
    })
}
