const { app } = require('electron');
const fs = require('fs');
const CreateConfigs = require('./recreateConfigs')

module.exports = function Configs() {
    const configPath = `${app.getPath('userData')}\\Config\\configs.json`;
    if (fs.existsSync(configPath)) {
        let configs = JSON.parse(fs.readFileSync(configPath, { encoding: 'utf8' }));
        configs.NotifyTray = false
        fs.writeFileSync(configPath, JSON.stringify(configs));
    }
    else CreateConfigs(configPath);
}
