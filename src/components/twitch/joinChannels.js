const fs = require('fs');
const { remote: {app} } = require('electron');
const sleep = require('../helpers/sleep');

module.exports = async client =>{
    let channelPath=`${app.getPath('userData')}\\Config\\channels.json`,
    channels,
    cnCount = document.getElementById('cnCount'),
    cnTotal = document.getElementById('cntotal');

    if(!fs.existsSync(channelPath)){
        throw 'Nenhum canal adicionado, por favor adicione um canal';
    }else if(JSON.parse(fs.readFileSync(channelPath, { encoding: 'utf8'})).length <= 0){
        throw 'Nenhum canal adicionado, por favor adicione um canal';
    }else {
        channels = JSON.parse(fs.readFileSync(channelPath, { encoding: 'utf8'}));
    }

    while(client.readyState() != 'OPEN') await sleep(100);

    for(let x =0; x < channels.length; x++){
        client.join(channels[x]).catch(err => {});
        cnCount.textContent = `Entrou em ${x+1} de ${channels.length} canais.`;
        await sleep(100);
    }
    cnCount.textContent = "";
    cnTotal.textContent = `🟣 Canais: ${channels.length}`;
};