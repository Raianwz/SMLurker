const fs = require('fs');
const { remote: {app} } = require('electron');
const path = require('path');
const sleep = require(path.resolve(__dirname,'./sleep'));

module.exports = async client =>{
    let channelPath=`${app.getPath('userData')}\\channels.json`,
    channels,
    cnCount = document.getElementById('cnCount');

    if(!fs.existsSync(channelPath)){
        throw 'Nenhum canal adicionado, por favor adicione um canal';
    }else {
        channels = require(channelPath);
    }

    while(client.readyState() != 'OPEN') await sleep(100);

    for(let x =0; x < channels.length; x++){
        client.join(channels[x]).catch(err => {});
        cnCount.innerHTML = `Entrou em ${x+1} de ${channels.length} canais.`
        await sleep(100);
    }
};