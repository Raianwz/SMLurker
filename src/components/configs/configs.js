const { remote: { app }, shell } = require('electron');
const configPath = `${app.getPath('userData')}\\Config\\configs.json`;
const getEl = (el) => document.querySelector(el)
const fs = require('fs');
const AutoLaunch = require('auto-launch');
const smlurkerAutoLaunch = new AutoLaunch({ name: 'SM Lurker' });
LoadConfigs()

async function chanceConfigs() {
    let swtIniciar = getEl('#swt_ini').checked, swtAutoLogin = getEl('#swt_autologin').checked;
    let configs = {};
    if (fs.existsSync(configPath)) {
        let configs = JSON.parse(fs.readFileSync(configPath, { encoding: 'utf8' }))
        configs.ini = swtIniciar
        configs.autologin = swtAutoLogin
        fs.writeFileSync(configPath, JSON.stringify(configs));
        configs.ini === true ? smlurkerAutoLaunch.enable() : false
        if (configs.ini === false) {
            await smlurkerAutoLaunch.isEnabled() ? await smlurkerAutoLaunch.disable() : false
        }

    } else {
        configs.ini = swtIniciar
        configs.autologin = swtAutoLogin
        fs.writeFileSync(configPath, JSON.stringify(configs));
    }

}

function LoadConfigs() {
    if (fs.existsSync(configPath)) {
        const configs = require(configPath);
        getEl('#swt_ini').checked = configs.ini;
        getEl('#swt_autologin').checked = configs.autologin;
    }
    getEl('#swt_ini').addEventListener('click', () => chanceConfigs())
    getEl('#swt_autologin').addEventListener('click', () => chanceConfigs())
    getEl('[name="abrirLocal"]').addEventListener('click', () => abrirLocal())
    getEl('[name="exportarLista"]').addEventListener('click', () => exportarLista())
}

function abrirLocal() {
    const childprocess = require('child_process');
    const localPath = `${app.getPath('userData')}\\Config`
    childprocess.exec(`start ${localPath}`);
}
function exportarLista() {
    const { dialog } = require('electron').remote;
    let channelsFilePath = `${app.getPath('userData')}\\Config\\channels.json`;

    if (fs.existsSync(channelsFilePath)) {
        let channels = JSON.parse(fs.readFileSync(channelsFilePath, { encoding: 'utf8' }))
        channels.sort()
        channels = JSON.stringify(channels).replace(/[\"\[\]]/g, '');

        dialog.showSaveDialog({
            properties: ['dontAddToRecent'],
            filters: [{ name: 'txt', extensions: ['txt'] }],
            defaultPath: '*/minha_lista',
            title: 'Exportar Lista',
        }).then((result) => {
            fs.writeFileSync(result.filePath, channels, (err) => { });
        }).catch((err) => {
            console.log('Deu errinho ai em..')
        });
    }
}

