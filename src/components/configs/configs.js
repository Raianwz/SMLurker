const { remote: { app, dialog } } = require('electron');
const fs = require('fs'), path = require('path');
const getEl = (el) => document.querySelector(el)
const AutoLaunch = require('auto-launch');
const childprocess = require('child_process');
const localPath = `${app.getPath('userData')}\\Config`
const smlurkerAutoLaunch = new AutoLaunch({ name: 'SM Lurker' });
const configPath = `${localPath}\\configs.json`;
const CreateConfigs = require(path.resolve(__dirname, '../src/components/configs/helper'));
LoadConfigs()

function LoadConfigs() {
    if (fs.existsSync(configPath)) {
        let configs = JSON.parse(fs.readFileSync(configPath, { encoding: 'utf8' }));
        getEl('#swt_ini').checked = configs.ini;
        getEl('#swt_autologin').checked = configs.autologin;
    }
    else { CreateConfigs(configPath) }

    getEl('#swt_ini').addEventListener('click', () => chanceConfigs())
    getEl('#swt_autologin').addEventListener('click', () => chanceConfigs())
    getEl('[name="abrirLocal"]').addEventListener('click', () => childprocess.exec(`start ${localPath}`))
    getEl('[name="exportarLista"]').addEventListener('click', () => exportarLista())
}

async function chanceConfigs() {
    let swtIniciar = getEl('#swt_ini').checked, swtAutoLogin = getEl('#swt_autologin').checked;

    if (fs.existsSync(configPath)) {
        let configs = JSON.parse(fs.readFileSync(configPath, { encoding: 'utf8' }))
        configs.ini = swtIniciar
        configs.autologin = swtAutoLogin
        fs.writeFileSync(configPath, JSON.stringify(configs));
    } else {
        configs.ini === true ? smlurkerAutoLaunch.enable() : false
        if (configs.ini === false) {
            await smlurkerAutoLaunch.isEnabled() ? await smlurkerAutoLaunch.disable() : false
        }
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
