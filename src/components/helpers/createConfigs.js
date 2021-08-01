const fs = require('fs');
module.exports = function CreateConfigs(configPath,mentions,subgift) {
    let configs = {};
    mentions = mentions ?? false
    subgift = subgift ?? false
    
    configs.ini = false
    configs.autologin = false
    configs.NotifyMe = mentions
    configs.NotifyGift = subgift
    fs.writeFileSync(configPath, JSON.stringify(configs));
}