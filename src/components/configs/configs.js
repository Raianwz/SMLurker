const { remote: {app}} = require('electron');
const fs = require('fs');
const shell = require('electron').shell;
LoadConfigs()

function chanceConfigs(){
    const fs = require('fs');
    var AutoLaunch = require('auto-launch');
    let configPath = `${app.getPath('userData')}\\Config\\configs.json`
    let swtIniciar = document.getElementById('swt_ini').checked;
    let swtAutoLogin = document.getElementById('swt_autologin').checked
    let configs = {};
    let smlurkerAutoLaunch = new AutoLaunch({
        name:'SM Lurker'
    });

    configs.ini = swtIniciar
    configs.autologin = swtAutoLogin
    fs.writeFileSync(configPath, JSON.stringify(configs));

    if (fs.existsSync(configPath)){
        let config = JSON.parse(fs.readFileSync(configPath, { encoding: 'utf8'}))

        if(config.ini === true){
            smlurkerAutoLaunch.enable();
        }else{
            smlurkerAutoLaunch.disable();
        } 
    }
}

function LoadConfigs(){
    let configPath = `${app.getPath('userData')}\\Config\\configs.json`;
    if (fs.existsSync(configPath)) {
        let configs = require(configPath);
        document.getElementById('swt_ini').checked=configs.ini;
        document.getElementById('swt_autologin').checked =configs.autologin;
    }
}
function abrirLocal() {
    const { remote: {app}} = require('electron');
    const childprocess = require('child_process');
    const localPath = `${app.getPath('userData')}\\Config`
    childprocess.exec(`start ${localPath}`);
}
function exportarLista(){
    const {dialog} = require('electron').remote;
    const childprocess = require('child_process');
    let channelsFilePath = `${app.getPath('userData')}\\Config\\channels.json`;

    if(fs.existsSync(channelsFilePath)){
        let channelsFilePath = `${app.getPath('userData')}\\Config\\channels.json`;
        let channels = JSON.parse(fs.readFileSync(channelsFilePath, { encoding: 'utf8'}))
        channels.sort()
        channels = JSON.stringify(channels).replace(/[\"\[\]]/g,'');
        
        dialog.showSaveDialog({
            properties: ['dontAddToRecent'],
            filters: [{name: 'txt', extensions: ['txt']}],
            defaultPath: '*/minha_lista',
            title:'Exportar Lista',
        }).then((result)=>{
            fs.writeFileSync(result.filePath, channels, (err) =>{});
        }).catch((err) => {
            console.log('Deu errinho ai em..')
        });
    }
}

