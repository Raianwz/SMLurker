const fs = require('fs');
module.exports = function CreateConfigs(configPath, ini, login, mentions, subgift, tray) {
    let configs = {};
    ini = ini ?? false
    login = login ?? false
    mentions = mentions ?? false
    subgift = subgift ?? false
    tray = tray ?? false

    configs.ini = ini
    configs.autologin = login
    configs.NotifyMe = mentions
    configs.NotifyGift = subgift
    configs.NotifyTray = tray

    configPath !== null ? fs.writeFileSync(configPath, JSON.stringify(configs)) : console.log('Caminho não encontrado')
};