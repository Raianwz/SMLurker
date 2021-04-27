let dialogOpen = false;

function loadChannelsFromFile(){
    const { remote: {app}} = require('electron');
    const {dialog} = require('electron').remote;
    const fs = require('fs');
    const channelFilePath = `${app.getPath('userData')}\\Config\\channels.json`;
    if(!dialogOpen){
        dialogOpen = true;

        let file = dialog.showOpenDialogSync({
            properties: ['openFile'],
            filters: [{name: 'txt', extensions: ['txt']}],
        });

        if(!file){
            dialogOpen = false;
            return;
        }
        
        let data = fs.readFileSync(file[0], { encoding: 'utf8'});
        let channels = data.replace(/ /g, '').split(',');
        let loadStatus = document.getElementById('canalLog');

        channels = fixChannels(channels);
        fs.writeFileSync(channelFilePath, JSON.stringify(channels));
        loadStatus.innerHTML = 'Arquivo adicionado!';
        dialog = false;
    }
}

let newChannelInput = document.getElementById('txtCanal');
newChannelInput.onchange = () => newChannelInput.classList.remove('warn');

function addCanal(){
    const { remote: { app }} = require('electron');
    const fs = require('fs');
    let channels = newChannelInput.value.toLowerCase();
   
    let log = document.getElementById('canalLog');
    let channelsFilePath = `${app.getPath('userData')}\\Config\\channels.json`;

    if(!channels || !channels.replace(/ /g, '')){
        newChannelInput.classList.add('warn');
        log.innerHTML = 'Por favor digite algo';
        return;
    }
    channels = fixChannels(channels.replace(/ /g, '').split(','));
    
    if(fs.existsSync(channelsFilePath)){
        let oldChannels = fs.readFileSync(channelsFilePath);
        oldChannels = JSON.parse(oldChannels);
        channels.forEach(channel =>{oldChannels.push(channel)});

        fs.writeFileSync(channelsFilePath, JSON.stringify(oldChannels));
        log.innerHTML = `Adicionado com Sucesso!`;
    }else{
        fs.writeFileSync(channelsFilePath, JSON.stringify(channels));
        log.innerHTML = `Adicionado com Sucesso!`;
    }
}
function removerCanal(){
    const { remote: { app }} = require('electron');
    const fs = require('fs');
    let channels = newChannelInput.value.toLowerCase();

    let log = document.getElementById('canalLog');
    let channelsFilePath = `${app.getPath('userData')}\\Config\\channels.json`;

    if(!channels || !channels.replace(/ /g, '')){
        newChannelInput.classList.add('warn');
        log.innerHTML = 'Por favor digite algo';
        return;
    }

    channels = fixChannels(channels.replace(/ /g, '').split(','));

    if(fs.existsSync(channelsFilePath)){
        let currentChannels = fs.readFileSync(channelsFilePath),
        onList = false;

        currentChannels = JSON.parse(currentChannels);

        for(let x in channels){
            if(currentChannels.includes(channels[x])) onList = true;
        }

        if(onList){
            for(let x in channels){
                currentChannels = currentChannels.filter(
                    channel => channel !== channels[x]
                );
            }
            fs.writeFileSync(channelsFilePath, JSON.stringify(currentChannels));
            log.innerHTML = "Removido com Sucesso!";
            
        }else{
            newChannelInput.classList.add('warn');
            log.innerHTML = 'Canal não encontrado!';
            return;
        }
    }else{
        newChannelInput.classList.add('warn');
        log.innerHTML = 'Você não tem nenhum canal para remover!';
        return;
    }
}

function fixChannels(channels){
    for(let x in channels){
        if(channels[x] == '') channels.splice(x, 1);
    }
    for(let x in channels){
        if(!channels[x].startsWith('#')) channels[x] = `#${channels[x]}`;
    }
    return channels;
}