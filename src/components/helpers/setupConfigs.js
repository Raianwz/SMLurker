const fs = require('fs');
const { app } = require('electron');

module.exports.initConfigs = readConfigs;
module.exports.createConfigs = CreateConfigs;

function readConfigs() {
    const configPath = `${app.getPath('userData')}\\Config\\configs.json`;
    if (fs.existsSync(configPath)) {
        let configs = JSON.parse(fs.readFileSync(configPath, { encoding: 'utf8' }));
        configs.NotifyTray = false
        fs.writeFileSync(configPath, JSON.stringify(configs));
    }
    else CreateConfigs(configPath);
}

function CreateConfigs(configPath, ini, login, inimin, mentions, subgift, tray) {
    let configs = {};
    ini = ini ?? false
    login = login ?? false
    inimin = inimin ?? false
    mentions = mentions ?? false
    subgift = subgift ?? false
    tray = tray ?? false
    configs.ini = ini
    configs.autologin = login
    configs.inimin = inimin
    configs.NotifyMe = mentions
    configs.NotifyGift = subgift
    configs.NotifyTray = tray
    configPath !== null ? fs.writeFileSync(configPath, JSON.stringify(configs)) : console.log('Caminho não encontrado');
};