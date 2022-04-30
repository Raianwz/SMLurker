const { app, dialog, shell: { openExternal } } = require('@electron/remote');
const fs = require('fs'), path = require('path');
const getEl = (el) => document.querySelector(el)
const AutoLaunch = require('auto-launch'), childprocess = require('child_process');
const localPath = `${app.getPath('userData')}\\Config`, configPath = `${localPath}\\configs.json`;
const smlurkerAutoLaunch = new AutoLaunch({ name: 'SM Lurker' });
const sleep = require(path.resolve(__dirname, '../src/components/helpers/sleep'));
const { createConfigs } = require(path.resolve(__dirname, '../src/components/helpers/setupConfigs'));
const loading = getEl('div[name="loading"]');
let checkIniMin = false;
LoadConfigs()

function LoadConfigs() {
    const changePath = (e, path) => e.children[0].setAttribute("d", `${path}`)
    if (fs.existsSync(configPath)) {
        let configs = JSON.parse(fs.readFileSync(configPath, { encoding: 'utf8' }));
        getEl('#swt_ini').checked = configs.ini;
        getEl('#swt_autologin').checked = configs.autologin;
        getEl('#swt_inimin').checked = configs.inimin;
    } else createConfigs(configPath);
    let abrirLocal = getEl('[name="abrirLocal"]'), exLista = getEl('[name="exportarLista"]'), GBChange = getEl('[name=githubChange]');

    getEl('#swt_ini').addEventListener('click', () => changeIni())
    getEl('#swt_autologin').addEventListener('click', () => { changeConfigs() })
    getEl('#swt_inimin').addEventListener('click', () => { changeConfigs() })
    abrirLocal.addEventListener('click', () => childprocess.exec(`start ${localPath}`))
    exLista.addEventListener('click', () => exportarLista())
    GBChange.addEventListener('click', ()=> openExternal("https://github.com/Raianwz/SMLurker/releases/latest"))

    abrirLocal.addEventListener('mouseenter', () => { changePath(abrirLocal, `M10 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z`) })
    abrirLocal.addEventListener('mouseleave', () => { changePath(abrirLocal, `M9.17 6l2 2H20v10H4V6h5.17M10 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z`) })

    exLista.addEventListener('mouseenter', () => { changePath(exLista, `M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z`) })
    exLista.addEventListener('mouseleave', () => { changePath(exLista, `M8 16h8v2H8zm0-4h8v2H8zm6-10H6c-1.1 0-2 .9-2 2v16c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm4 18H6V4h7v5h5v11z`) })
}


function changeConfigs() {
    let swtIniciar = getEl('#swt_ini').checked, swtAutoLogin = getEl('#swt_autologin').checked, swtIniMin = getEl('#swt_inimin').checked;
    if (fs.existsSync(configPath)) {
        let configs = JSON.parse(fs.readFileSync(configPath, { encoding: 'utf8' }))
        if (swtIniMin && swtAutoLogin == false) {
            if(!checkIniMin){ infoIniMin(); checkIniMin = true}
            getEl('#swt_inimin').checked = false;
            return
        }
        configs.ini = swtIniciar
        configs.autologin = swtAutoLogin
        configs.inimin = swtIniMin

        fs.writeFileSync(configPath, JSON.stringify(configs));
    }
}

async function changeIni() {
    changeConfigs()
    if (fs.existsSync(configPath)) {
        let configs = JSON.parse(fs.readFileSync(configPath, { encoding: 'utf8' }))
        const ppHop = async (value) => {
            loading.classList.add('loading');
            await sleep(200);
            value === 1 ? value = smlurkerAutoLaunch.enable() : value = smlurkerAutoLaunch.disable()
            await value.then(loading.classList.remove('loading'))
        }
        if (configs.ini === true) ppHop(1)
        if (configs.ini === false) ppHop(0)
    }
}

async function exportarLista() {
    let channelsFilePath = `${app.getPath('userData')}\\Config\\channels.json`;
    if (fs.existsSync(channelsFilePath)) {
        let channels = JSON.parse(fs.readFileSync(channelsFilePath, { encoding: 'utf8' }))
        channels.sort()
        channels = JSON.stringify(channels).replace(/[\"\[\]]/g, '');

        const listaDialog = dialog.showSaveDialog({
            properties: ['dontAddToRecent'],
            filters: [{ name: 'txt', extensions: ['txt'] }],
            defaultPath: '*/minha_lista',
            title: 'Exportar Lista',
        })
        const listaTxt = await listaDialog

        if (!listaTxt.canceled) fs.writeFileSync(listaTxt.filePath, channels);

    } else {
        dialog.showMessageBoxSync({
            type: 'warning',
            title: 'Configurações — SM Lurker ',
            message: 'Você não tem nenhum canal adicionado para exportar como lista.',
        })
    }
}

function infoIniMin() {
    const { dialog } = require('@electron/remote');
    let textao = `Por favor habilite Login Autómatico antes Iniciar Minimizado!`;
    dialog.showMessageBoxSync({
        type: 'info',
        title: 'Configurações — SMLurker',
        message: textao,
    })
}