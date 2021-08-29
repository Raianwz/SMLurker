const { remote: { app, dialog } } = require('electron');
const fs = require('fs'), path = require('path');
const getEl = (el) => document.querySelector(el)
const AutoLaunch = require('auto-launch');
const childprocess = require('child_process');
const localPath = `${app.getPath('userData')}\\Config`, configPath = `${localPath}\\configs.json`;
const smlurkerAutoLaunch = new AutoLaunch({ name: 'SM Lurker' });
const sleep = require(path.resolve(__dirname, '../src/components/helpers/sleep'));
const CreateConfigs = require(path.resolve(__dirname, '../src/components/helpers/recreateConfigs'));
const loading = getEl('div[name="loading"]');
LoadConfigs()

function LoadConfigs() {
    if (fs.existsSync(configPath)) {
        let configs = JSON.parse(fs.readFileSync(configPath, { encoding: 'utf8' }));
        getEl('#swt_ini').checked = configs.ini;
        getEl('#swt_autologin').checked = configs.autologin;
    } else CreateConfigs(configPath);
    
    getEl('#swt_ini').addEventListener('click', () => changeIni())
    getEl('#swt_autologin').addEventListener('click', () => { changeConfigs() })
    getEl('[name="abrirLocal"]').addEventListener('click', () => childprocess.exec(`start ${localPath}`))
    getEl('[name="exportarLista"]').addEventListener('click', () => exportarLista())
}

function changeConfigs() {
    let swtIniciar = getEl('#swt_ini').checked, swtAutoLogin = getEl('#swt_autologin').checked;
    if (fs.existsSync(configPath)) {
        let configs = JSON.parse(fs.readFileSync(configPath, { encoding: 'utf8' }))
        configs.ini = swtIniciar
        configs.autologin = swtAutoLogin
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
